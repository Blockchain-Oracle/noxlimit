import { describe, expect, it } from "vitest";
import type { Address, Hex, PublicClient } from "viem";

import { boundedBlockRanges, replayFromWithOverlap } from "../src/chain/block-ranges.js";
import { LogDeduplicator } from "../src/chain/log-identity.js";
import {
  ReplayEngine,
  type ReplayLog,
  type ReplayLogSource,
  type ReplayProjector,
} from "../src/chain/replay-engine.js";
import { replayTargetsForManifest } from "../src/chain/replay-targets.js";
import { ViemReplayLogSource } from "../src/chain/viem-log-source.js";
import { redactSensitive } from "../src/observability/redaction.js";
import { SerializedWriter } from "../src/tx/serialized-writer.js";
import { decideWorkerAction } from "../src/worker/decision.js";
import { makeCatalogManifest, makeMarketRecord } from "./fixtures.js";
import {
  WorkerRuntime,
  type CandidateGateway,
  type WorkerChainActions,
  type WorkerOrder,
  type WorkerOrderRepository,
} from "../src/worker/runtime.js";

const address = "0x0000000000000000000000000000000000000001" as Address;
const blockHash = `0x${"11".repeat(32)}` as Hex;
const transactionHash = `0x${"22".repeat(32)}` as Hex;

describe("service foundations", () => {
  it("replays OrderBook, FPMM, resolver, and Conditional Tokens contracts for every market", () => {
    const record = makeMarketRecord();
    const targets = replayTargetsForManifest(makeCatalogManifest(record));
    expect(new Set(targets.map((target) => target.address.toLowerCase()))).toEqual(new Set([
      record.contracts.orderBook,
      record.contracts.fpmm,
      record.contracts.resolver,
      record.contracts.conditionalTokens,
    ].map((address) => address.toLowerCase())));
    expect(targets.every(
      (target) => target.deploymentBlock === BigInt(record.deployment.deploymentBlock),
    )).toBe(true);
  });

  it("builds inclusive bounded replay ranges and overlap boundaries", () => {
    expect(boundedBlockRanges(10n, 25n, 6n)).toEqual([
      { fromBlock: 10n, toBlock: 15n },
      { fromBlock: 16n, toBlock: 21n },
      { fromBlock: 22n, toBlock: 25n },
    ]);
    expect(replayFromWithOverlap(100n, 80n, 12n)).toBe(88n);
    expect(replayFromWithOverlap(85n, 80n, 12n)).toBe(80n);
  });

  it("captures one coherent Viem head/safe snapshot from one head read", async () => {
    let headReads = 0;
    const client = {
      getBlockNumber: async () => {
        headReads += 1;
        return 156n;
      },
    } as unknown as PublicClient;

    await expect(new ViemReplayLogSource(client).getSnapshot()).resolves.toEqual({
      headBlock: 156n,
      safeBlock: 150n,
    });
    expect(headReads).toBe(1);
  });

  it("deduplicates only the complete durable log identity", () => {
    const dedupe = new LogDeduplicator();
    expect(dedupe.add({ blockHash, transactionHash, logIndex: 1 })).toBe(true);
    expect(dedupe.add({ blockHash, transactionHash, logIndex: 1 })).toBe(false);
    expect(dedupe.add({ blockHash, transactionHash, logIndex: 2 })).toBe(true);
  });

  it("serializes account writes even when an earlier write rejects", async () => {
    const writer = new SerializedWriter();
    const order: number[] = [];
    const first = writer.enqueue(async () => {
      order.push(1);
      throw new Error("reverted");
    });
    const second = writer.enqueue(async () => {
      order.push(2);
      return "mined";
    });
    await expect(first).rejects.toThrow("reverted");
    await expect(second).resolves.toBe("mined");
    expect(order).toEqual([1, 2]);
    expect(writer.pending).toBe(0);
  });

  it("keeps zero evaluation result-neutral and publishes only nonzero", async () => {
    const candidate = `0x${"33".repeat(32)}` as Hex;
    let decryptValue = 0n;
    const order: WorkerOrder = {
      key: "11155111:book:1",
      chainId: 11_155_111,
      orderBook: address,
      orderId: 1n,
      state: "EVALUATING",
      now: 10n,
      expiresAt: 100n,
      tradingClosesAt: 100n,
      phaseDeadline: 50n,
      remainingEvaluations: 2,
      nextEvaluationAt: 0n,
      nonce: 1,
      candidate,
    };
    const repository: WorkerOrderRepository = {
      listActionable: async () => [order],
      get: async () => order,
    };
    const submitted: string[] = [];
    const chain = chainActions(submitted);
    const gateway: CandidateGateway = {
      decrypt: async () => decryptValue,
      publicDecrypt: async () => ({ value: decryptValue, proof: "0x12" }),
    };
    const runtime = new WorkerRuntime(repository, chain, gateway);
    expect(await runtime.tick()).toEqual([
      { orderKey: order.key, action: "PRIVATE_DECRYPT", outcome: "INELIGIBLE" },
    ]);
    expect(submitted).toEqual([]);

    decryptValue = 42n;
    const result = await runtime.tick();
    expect(result[0]?.outcome).toBe("MINED");
    expect(submitted).toEqual(["requestPublication"]);
  });

  it("replays every target, overlaps without duplicates, and rebuilds after a reorg", async () => {
    let safeHead = 12n;
    let safeHash = blockHash;
    const logs: ReplayLog[] = [makeLog(10n, 0), makeLog(11n, 0)];
    const source: ReplayLogSource = {
      getSnapshot: async () => ({ headBlock: safeHead + 6n, safeBlock: safeHead }),
      getBlockHash: async () => safeHash,
      getLogs: async ({ fromBlock, toBlock }) =>
        logs.filter((log) => log.blockNumber >= fromBlock && log.blockNumber <= toBlock),
    };
    const applied: ReplayLog[] = [];
    let resets = 0;
    const projector: ReplayProjector = {
      reset: () => {
        resets += 1;
        applied.length = 0;
      },
      apply: (log) => applied.push(log),
      complete: () => undefined,
    };
    const replay = new ReplayEngine(source, projector, { chunkSize: 2n, overlap: 3n });
    const first = await replay.rebuild([{ address, deploymentBlock: 10n }]);
    expect(first.appliedLogs).toBe(2);
    expect(first.snapshot).toEqual({ headBlock: 18n, safeBlock: 12n });
    expect(resets).toBe(1);

    safeHead = 13n;
    logs.push(makeLog(13n, 0));
    const incremental = await replay.poll();
    expect(incremental.appliedLogs).toBe(1);
    expect(incremental.snapshot).toEqual({ headBlock: 19n, safeBlock: 13n });
    expect(applied).toHaveLength(3);

    safeHash = `0x${"44".repeat(32)}` as Hex;
    const rebuilt = await replay.poll();
    expect(rebuilt.rebuilt).toBe(true);
    expect(rebuilt.snapshot).toEqual({ headBlock: 19n, safeBlock: 13n });
    expect(resets).toBe(2);
  });

  it("preserves one coherent source snapshot in the replay result", async () => {
    const snapshot = { headBlock: 156n, safeBlock: 150n } as const;
    let snapshotReads = 0;
    const completed: bigint[] = [];
    const source: ReplayLogSource = {
      getSnapshot: async () => {
        snapshotReads += 1;
        return snapshot;
      },
      getBlockHash: async () => blockHash,
      getLogs: async () => [],
    };
    const replay = new ReplayEngine(source, {
      reset: () => undefined,
      apply: () => undefined,
      complete: (safeBlock) => completed.push(safeBlock),
    });

    const result = await replay.rebuild([{ address, deploymentBlock: 150n }]);

    expect(snapshotReads).toBe(1);
    expect(result.snapshot).toBe(snapshot);
    expect(completed).toEqual([150n]);
  });

  it("replays independent targets from their own deployment blocks", async () => {
    const secondAddress = "0x0000000000000000000000000000000000000002" as Address;
    const firstLog = makeLog(10n, 0);
    const secondLog = {
      ...makeLog(12n, 1),
      address: secondAddress,
      transactionHash: `0x${"77".repeat(32)}` as Hex,
    };
    const source: ReplayLogSource = {
      getSnapshot: async () => ({ headBlock: 18n, safeBlock: 12n }),
      getBlockHash: async () => blockHash,
      getLogs: async ({ address: target, fromBlock, toBlock }) => [firstLog, secondLog].filter(
        (log) => log.address === target && log.blockNumber >= fromBlock && log.blockNumber <= toBlock,
      ),
    };
    const applied: ReplayLog[] = [];
    const replay = new ReplayEngine(source, {
      reset: () => applied.splice(0),
      apply: (log) => applied.push(log),
      complete: () => undefined,
    });
    const result = await replay.rebuild([
      { address, deploymentBlock: 10n },
      { address: secondAddress, deploymentBlock: 12n },
    ]);
    expect(result.appliedLogs).toBe(2);
    expect(applied.map((log) => log.address)).toEqual([address, secondAddress]);
  });

  it("isolates a failing order, retries after restart, and still advances later orders", async () => {
    const failingCandidate = `0x${"66".repeat(32)}` as Hex;
    const first = workerOrder("first", "EVALUATING", { candidate: failingCandidate });
    const second = workerOrder("second", "RESTING_PRIVATE");
    const orders = new Map([[first.key, first], [second.key, second]]);
    const repository: WorkerOrderRepository = {
      listActionable: async () => [...orders.values()],
      get: async (key) => orders.get(key),
    };
    const submitted: string[] = [];
    let gatewayAvailable = false;
    const gateway: CandidateGateway = {
      decrypt: async () => {
        if (!gatewayAvailable) throw new Error("gateway timeout with private material");
        return 42n;
      },
      publicDecrypt: async () => ({ value: 42n, proof: "0x12" }),
    };
    const firstRuntime = new WorkerRuntime(repository, chainActions(submitted), gateway);
    expect(await firstRuntime.tick()).toEqual([
      { orderKey: first.key, action: "PRIVATE_DECRYPT", outcome: "RETRYABLE_ERROR" },
      expect.objectContaining({ orderKey: second.key, action: "REQUEST_EVALUATION", outcome: "MINED" }),
    ]);
    expect(submitted).toEqual(["requestEvaluation"]);

    gatewayAvailable = true;
    const restartedRuntime = new WorkerRuntime(repository, chainActions(submitted), gateway);
    const retried = await restartedRuntime.tick();
    expect(retried[0]).toMatchObject({
      orderKey: first.key,
      action: "PRIVATE_DECRYPT",
      outcome: "MINED",
    });
    expect(submitted).toContain("requestPublication");
  });

  it("recovers expired evaluation/publication phases and closed resting orders", async () => {
    const orders = [
      workerOrder("evaluation", "EVALUATING", { now: 50n, phaseDeadline: 50n }),
      workerOrder("publication", "PUBLICATION_PENDING", {
        now: 50n,
        phaseDeadline: 50n,
        candidate: `0x${"88".repeat(32)}` as Hex,
      }),
      workerOrder("closed", "RESTING_PRIVATE", { now: 100n, expiresAt: 100n }),
    ];
    const repository: WorkerOrderRepository = {
      listActionable: async () => orders,
      get: async (key) => orders.find((order) => order.key === key),
    };
    const submitted: string[] = [];
    const runtime = new WorkerRuntime(repository, chainActions(submitted), {
      decrypt: async () => 0n,
      publicDecrypt: async () => ({ value: 0n, proof: "0x12" }),
    });
    const result = await runtime.tick();
    expect(result.map((item) => item.action)).toEqual([
      "RECOVER_EVALUATION",
      "RECOVER_PUBLICATION",
      "EXPIRE_ORDER",
    ]);
    expect(submitted).toEqual(["expireEvaluation", "expirePublication", "expireOrder"]);
  });

  it("redacts private-limit material recursively", () => {
    expect(
      redactSensitive({
        order: { maxPrice: "0.44", amount: "25" },
        decryption_proof: "0xsecret",
        public: true,
      }),
    ).toEqual({
      order: { maxPrice: "[REDACTED]", amount: "25" },
      decryption_proof: "[REDACTED]",
      public: true,
    });
  });

  it("keeps order expiry, evaluation recovery, and publication recovery distinct", () => {
    const base = {
      now: 10n,
      expiresAt: 100n,
      tradingClosesAt: 120n,
      phaseDeadline: 20n,
      remainingEvaluations: 2,
      nextEvaluationAt: 0n,
    } as const;
    expect(decideWorkerAction({ ...base, state: "RESTING_PRIVATE" })).toBe("REQUEST_EVALUATION");
    expect(decideWorkerAction({ ...base, now: 100n, state: "RESTING_PRIVATE" })).toBe(
      "EXPIRE_ORDER",
    );
    expect(decideWorkerAction({ ...base, now: 20n, state: "EVALUATING" })).toBe(
      "RECOVER_EVALUATION",
    );
    expect(decideWorkerAction({ ...base, now: 20n, state: "PUBLICATION_PENDING" })).toBe(
      "RECOVER_PUBLICATION",
    );
  });
});

function makeLog(blockNumber: bigint, logIndex: number): ReplayLog {
  return {
    address,
    blockHash,
    transactionHash: `${transactionHash.slice(0, -2)}${blockNumber.toString(16).padStart(2, "0")}` as Hex,
    blockNumber,
    logIndex,
    data: "0x",
    topics: [],
  };
}

function chainActions(submitted: string[]): WorkerChainActions {
  const hash = `0x${"55".repeat(32)}` as Hex;
  const record = async (name: string) => {
    submitted.push(name);
    return hash;
  };
  return {
    requestEvaluation: async () => record("requestEvaluation"),
    requestPublication: async () => record("requestPublication"),
    finalize: async () => record("finalize"),
    expireEvaluation: async () => record("expireEvaluation"),
    expirePublication: async () => record("expirePublication"),
    expireOrder: async () => record("expireOrder"),
    waitForSuccess: async () => undefined,
  };
}

function workerOrder(
  key: string,
  state: WorkerOrder["state"],
  overrides: Partial<WorkerOrder> = {},
): WorkerOrder {
  return {
    key,
    chainId: 11_155_111,
    orderBook: address,
    orderId: BigInt(key.length),
    state,
    now: 10n,
    expiresAt: 100n,
    tradingClosesAt: 100n,
    phaseDeadline: 50n,
    remainingEvaluations: 2,
    nextEvaluationAt: 0n,
    nonce: 1,
    ...overrides,
  };
}
