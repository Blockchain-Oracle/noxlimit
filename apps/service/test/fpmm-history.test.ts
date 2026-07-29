import { describe, expect, it, vi } from "vitest";
import { healthViewSchema } from "@noxlimit/protocol";
import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiParameters,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

import { LiveMarketReader } from "../src/chain/market-reader.js";
import {
  ReplayEngine,
  type ReplayLog,
  type ReplayLogSource,
} from "../src/chain/replay-engine.js";
import {
  FpmmHistoryProjector,
  calcBuyAmount,
  calcSellAmount,
  fpmmHistoryAbi,
} from "../src/projections/fpmm-history-projector.js";
import { ProjectionStore } from "../src/projections/store.js";
import {
  makeCatalogManifest,
  makeMarketRecord,
  testAddress,
  testHash,
} from "./fixtures.js";

const INITIAL_RESERVES = [50_000_000n, 50_000_000n] as const;
const FEE_WAD = 20_000_000_000_000_000n;
const INVESTMENT = 10_000_000n;
const FEE = 200_000n;

describe("FPMM outcome-price projection", () => {
  it("emits only real funding/trade points and paginates a pinned safe-block snapshot", async () => {
    const record = makeMarketRecord();
    const client = blockClient();
    const projector = new FpmmHistoryProjector(client, makeCatalogManifest(record));
    const funding = fundingLog(record.contracts.fpmm, 100n, testHash("1"), testHash("a"));
    const bought = calcBuyAmount(INITIAL_RESERVES, INVESTMENT, 0, FEE_WAD);
    const buy = buyLog(record.contracts.fpmm, 101n, testHash("2"), testHash("b"), 0, bought);

    await projector.apply(funding);
    await projector.apply(buy);
    await projector.complete(106n);

    const full = projector.history({
      marketId: record.marketId,
      mode: "OUTCOME_PRICES",
      range: "ALL",
      sampling: "TERMINAL_240_MAX",
      limit: 240,
    });
    expect(full).toMatchObject({
      mode: "OUTCOME_PRICES",
      source: "FPMM_RECONSTRUCTED",
      fromBlock: "100",
      toSafeBlock: "106",
      limitedHistory: false,
    });
    expect(full?.points).toHaveLength(2);
    expect(full?.points.map((point) => point.sourceRef)).toEqual([
      sourceRef(funding),
      sourceRef(buy),
    ]);
    expect(full?.points.every((point) => point.secondaryValue !== undefined)).toBe(true);
    expect(Number(full?.points[1]?.primaryValue)).toBeGreaterThan(
      Number(full?.points[1]?.secondaryValue),
    );

    const latest = projector.history({
      marketId: record.marketId,
      mode: "OUTCOME_PRICES",
      range: "ALL",
      sampling: "TERMINAL_240_MAX",
      limit: 1,
    });
    expect(latest?.points.map((point) => point.sourceRef)).toEqual([sourceRef(buy)]);
    expect(latest?.nextCursor).toBeDefined();
    const earlier = projector.history({
      marketId: record.marketId,
      mode: "OUTCOME_PRICES",
      range: "ALL",
      sampling: "TERMINAL_240_MAX",
      limit: 1,
      cursor: latest?.nextCursor,
    });
    expect(earlier?.points.map((point) => point.sourceRef)).toEqual([sourceRef(funding)]);
    expect(earlier?.nextCursor).toBeUndefined();
  });

  it("returns an honest sparse state and rejects a trade inconsistent with reconstructed reserves", async () => {
    const record = makeMarketRecord();
    const projector = new FpmmHistoryProjector(blockClient(), makeCatalogManifest(record));
    await projector.complete(106n);
    expect(projector.history({
      marketId: record.marketId,
      mode: "OUTCOME_PRICES",
      limit: 240,
    })).toMatchObject({ points: [], limitedHistory: true });

    await projector.apply(fundingLog(record.contracts.fpmm, 100n, testHash("1"), testHash("a")));
    const invalid = buyLog(
      record.contracts.fpmm,
      101n,
      testHash("2"),
      testHash("b"),
      0,
      calcBuyAmount(INITIAL_RESERVES, INVESTMENT, 0, FEE_WAD) + 1n,
    );
    await expect(projector.apply(invalid)).rejects.toThrow(
      "buy amount does not match reconstructed reserves",
    );
  });

  it("reconstructs completed sells and funding removal without reading mutable latest reserves", async () => {
    const record = makeMarketRecord();
    const projector = new FpmmHistoryProjector(blockClient(), makeCatalogManifest(record));
    const bought = calcBuyAmount(INITIAL_RESERVES, INVESTMENT, 0, FEE_WAD);
    const afterBuy: [bigint, bigint] = [
      INITIAL_RESERVES[0] + INVESTMENT - FEE - bought,
      INITIAL_RESERVES[1] + INVESTMENT - FEE,
    ];
    const returnAmount = 1_000_000n;
    const sold = calcSellAmount(afterBuy, returnAmount, 0, FEE_WAD);
    await projector.apply(fundingLog(record.contracts.fpmm, 100n, testHash("1"), testHash("a")));
    await projector.apply(buyLog(record.contracts.fpmm, 101n, testHash("2"), testHash("b"), 0, bought));
    await projector.apply(sellLog(
      record.contracts.fpmm,
      102n,
      testHash("3"),
      testHash("c"),
      0,
      returnAmount,
      sold,
    ));
    await projector.apply(fundingRemovedLog(
      record.contracts.fpmm,
      103n,
      testHash("4"),
      testHash("d"),
    ));
    await projector.complete(106n);
    const history = projector.history({
      marketId: record.marketId,
      mode: "OUTCOME_PRICES",
      range: "ALL",
      limit: 240,
    });
    expect(history?.points).toHaveLength(4);
    expect(history?.points.at(-1)?.sourceRef).toContain(testHash("4"));
  });

  it("deduplicates overlap and replaces orphaned history after a safe-block reorg", async () => {
    const record = makeMarketRecord();
    let safeHash = testHash("c");
    const projector = new FpmmHistoryProjector(
      blockClient(() => safeHash),
      makeCatalogManifest(record),
    );
    let logs: ReplayLog[] = [
      fundingLog(record.contracts.fpmm, 100n, testHash("1"), testHash("a")),
      buyLog(
        record.contracts.fpmm,
        101n,
        testHash("2"),
        testHash("b"),
        0,
        calcBuyAmount(INITIAL_RESERVES, INVESTMENT, 0, FEE_WAD),
      ),
    ];
    const source: ReplayLogSource = {
      getSnapshot: async () => ({ headBlock: 112n, safeBlock: 106n }),
      getBlockHash: async () => safeHash,
      getLogs: async ({ address, fromBlock, toBlock }) => logs.filter(
        (log) => log.address.toLowerCase() === address.toLowerCase() &&
          log.blockNumber >= fromBlock &&
          log.blockNumber <= toBlock,
      ),
    };
    const replay = new ReplayEngine(source, projector, { overlap: 12n, chunkSize: 50n });
    await replay.rebuild([{ address: record.contracts.fpmm, deploymentBlock: 100n }]);
    expect((await replay.poll()).appliedLogs).toBe(0);
    const before = projector.history({ marketId: record.marketId, mode: "OUTCOME_PRICES", limit: 240 });
    const beforeCursor = projector.history({
      marketId: record.marketId,
      mode: "OUTCOME_PRICES",
      range: "ALL",
      limit: 1,
    })?.nextCursor;
    expect(Number(before?.points.at(-1)?.primaryValue)).toBeGreaterThan(
      Number(before?.points.at(-1)?.secondaryValue),
    );

    safeHash = testHash("d");
    logs = [
      fundingLog(record.contracts.fpmm, 100n, testHash("3"), testHash("c")),
      buyLog(
        record.contracts.fpmm,
        101n,
        testHash("4"),
        testHash("d"),
        1,
        calcBuyAmount(INITIAL_RESERVES, INVESTMENT, 1, FEE_WAD),
      ),
    ];
    const result = await replay.poll();
    expect(result).toMatchObject({ rebuilt: true, appliedLogs: 2 });
    const after = projector.history({ marketId: record.marketId, mode: "OUTCOME_PRICES", limit: 240 });
    expect(Number(after?.points.at(-1)?.secondaryValue)).toBeGreaterThan(
      Number(after?.points.at(-1)?.primaryValue),
    );
    expect(after?.points.some((point) => point.sourceRef === sourceRef(buyLog(
      record.contracts.fpmm,
      101n,
      testHash("2"),
      testHash("b"),
      0,
      calcBuyAmount(INITIAL_RESERVES, INVESTMENT, 0, FEE_WAD),
    )))).toBe(false);
    expect(() => projector.history({
      marketId: record.marketId,
      mode: "OUTCOME_PRICES",
      range: "ALL",
      limit: 1,
      cursor: beforeCursor,
    })).toThrow("no longer on the canonical projection");
  });

  it("uses real outcome history for the market card and retains the oracle fallback when sparse", async () => {
    const record = makeMarketRecord({ startsAt: "100", tradingClosesAt: "400", resolvesAt: "3700" });
    const manifest = makeCatalogManifest(record);
    const client = hydratedClient();
    const projector = new FpmmHistoryProjector(client, manifest);
    const reader = new LiveMarketReader(client, manifest, () => true, projector);

    await projector.complete(150n);
    const sparse = await reader.hydrateAll({ headBlock: 156n, safeBlock: 150n });
    expect(sparse[0]?.card.preview).toMatchObject({ mode: "UNDERLYING", limitedHistory: true });

    await projector.apply(fundingLog(record.contracts.fpmm, 120n, testHash("1"), testHash("a")));
    await projector.apply(buyLog(
      record.contracts.fpmm,
      130n,
      testHash("2"),
      testHash("b"),
      0,
      calcBuyAmount(INITIAL_RESERVES, INVESTMENT, 0, FEE_WAD),
    ));
    await projector.complete(150n);
    const hydrated = await reader.hydrateAll({ headBlock: 156n, safeBlock: 150n });
    expect(hydrated[0]?.card.preview).toMatchObject({
      mode: "OUTCOME_PRICES",
      source: "FPMM_RECONSTRUCTED",
      asOfBlock: "150",
      limitedHistory: false,
    });
    expect(hydrated[0]?.card.preview.points).toHaveLength(2);
    await expect(reader.history({
      marketId: record.marketId,
      mode: "OUTCOME_PRICES",
      range: "ALL",
      limit: 240,
    })).resolves.toMatchObject({ mode: "OUTCOME_PRICES", points: expect.any(Array) });
  });

  it("uses the coherent replay boundary: {156,150} is safe and {157,150} is unsafe", async () => {
    const record = makeMarketRecord({ startsAt: "100", tradingClosesAt: "400", resolvesAt: "3700" });
    const manifest = makeCatalogManifest(record);

    const reader = new LiveMarketReader(hydratedClient(), manifest, () => true);
    const lagging = await reader.hydrateAll({ headBlock: 157n, safeBlock: 150n });
    expect(lagging[0]?.market.tradeabilityReasons).toContain("INDEXER_UNSAFE");
    expect(lagging[0]?.market.pool.stale).toBe(false);

    const fresh = await reader.hydrateAll({ headBlock: 156n, safeBlock: 150n });
    expect(fresh[0]?.market.tradeabilityReasons).not.toContain("INDEXER_UNSAFE");
    expect(fresh[0]?.market.pool.stale).toBe(false);
    expect(fresh[0]?.market.tradeability).toBe("TRADEABLE");

    const quoteTime = Date.parse(fresh[0]!.market.pool.quotedAt);
    const store = new ProjectionStore(
      manifest.catalogRevision,
      healthViewSchema.parse({
        status: "READY",
        chainId: 11_155_111,
        catalogRevision: manifest.catalogRevision,
        headBlock: "156",
        safeBlock: "150",
        indexerLagBlocks: "6",
        evaluator: { status: "READY" },
        funding: { status: "UNAVAILABLE" },
        asOf: "2030-01-01T00:00:00.000Z",
      }),
      () => new Date(quoteTime + 61_000),
    );
    store.replaceMarkets(manifest.catalogRevision, fresh);
    const agedMarket = await store.getMarket(record.marketId);
    const agedPage = await store.listMarkets({ sort: "CLOSING_SOON", limit: 20 });
    expect(agedMarket?.pool.stale).toBe(true);
    expect(agedMarket?.tradeabilityReasons).toContain("INDEXER_UNSAFE");
    expect(agedPage.items[0]?.poolStale).toBe(true);
    expect(agedPage.items[0]?.badges).toContain("STALE");
  });
});

function blockClient(blockHash: () => Hex = () => testHash("e")): PublicClient {
  return {
    getBlock: vi.fn(async ({ blockNumber }: { blockNumber?: bigint }) => ({
      number: blockNumber ?? 0n,
      timestamp: blockNumber ?? 0n,
      hash: blockHash(),
    })),
  } as unknown as PublicClient;
}

function hydratedClient(): PublicClient {
  return {
    getBlock: vi.fn(async ({ blockNumber }: { blockNumber?: bigint }) => ({
      number: blockNumber ?? 0n,
      timestamp: blockNumber ?? 0n,
      hash: testHash("e"),
    })),
    readContract: vi.fn(async (input: { functionName: string; args?: readonly unknown[] }) => {
      if (input.functionName === "latestRoundData") {
        return [1n, 65_000_00000000n, 0n, 145n, 1n] as const;
      }
      if (input.functionName === "calcBuyAmount") {
        return (input.args?.[1] as bigint) === 0n ? 1_900_000n : 2_100_000n;
      }
      if (input.functionName === "balanceOf") return 50_000_000n;
      if (input.functionName === "resolved" || input.functionName === "resolvedYes") return false;
      throw new Error(`unexpected read: ${input.functionName}`);
    }),
  } as unknown as PublicClient;
}

function fundingLog(
  fpmm: Address,
  blockNumber: bigint,
  transactionHash: Hex,
  blockHash: Hex,
): ReplayLog {
  return {
    address: fpmm,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex: 0,
    topics: encodeEventTopics({
      abi: fpmmHistoryAbi,
      eventName: "FPMMFundingAdded",
      args: { funder: testAddress("7") },
    }),
    data: encodeAbiParameters(
      parseAbiParameters("uint256[] amountsAdded,uint256 sharesMinted"),
      [[...INITIAL_RESERVES], 50_000_000n],
    ),
  };
}

function buyLog(
  fpmm: Address,
  blockNumber: bigint,
  transactionHash: Hex,
  blockHash: Hex,
  outcomeIndex: 0 | 1,
  outcomeTokensBought: bigint,
): ReplayLog {
  return {
    address: fpmm,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex: 1,
    topics: encodeEventTopics({
      abi: fpmmHistoryAbi,
      eventName: "FPMMBuy",
      args: { buyer: testAddress("7"), outcomeIndex: BigInt(outcomeIndex) },
    }),
    data: encodeAbiParameters(
      parseAbiParameters("uint256 investmentAmount,uint256 feeAmount,uint256 outcomeTokensBought"),
      [INVESTMENT, FEE, outcomeTokensBought],
    ),
  };
}

function sellLog(
  fpmm: Address,
  blockNumber: bigint,
  transactionHash: Hex,
  blockHash: Hex,
  outcomeIndex: 0 | 1,
  returnAmount: bigint,
  outcomeTokensSold: bigint,
): ReplayLog {
  const feeAmount = (returnAmount * FEE_WAD) / ((10n ** 18n) - FEE_WAD);
  return {
    address: fpmm,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex: 2,
    topics: encodeEventTopics({
      abi: fpmmHistoryAbi,
      eventName: "FPMMSell",
      args: { seller: testAddress("7"), outcomeIndex: BigInt(outcomeIndex) },
    }),
    data: encodeAbiParameters(
      parseAbiParameters("uint256 returnAmount,uint256 feeAmount,uint256 outcomeTokensSold"),
      [returnAmount, feeAmount, outcomeTokensSold],
    ),
  };
}

function fundingRemovedLog(
  fpmm: Address,
  blockNumber: bigint,
  transactionHash: Hex,
  blockHash: Hex,
): ReplayLog {
  return {
    address: fpmm,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex: 3,
    topics: encodeEventTopics({
      abi: fpmmHistoryAbi,
      eventName: "FPMMFundingRemoved",
      args: { funder: testAddress("7") },
    }),
    data: encodeAbiParameters(
      parseAbiParameters(
        "uint256[] amountsRemoved,uint256 collateralRemovedFromFeePool,uint256 sharesBurnt",
      ),
      [[1_000_000n, 1_000_000n], 10_000n, 1_000_000n],
    ),
  };
}

function sourceRef(log: ReplayLog): string {
  return `fpmm:${log.address}:${log.blockHash}:${log.transactionHash}:${log.logIndex}`;
}
