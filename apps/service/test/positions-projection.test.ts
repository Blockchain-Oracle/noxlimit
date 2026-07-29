import {
  noxLimitOrderBookAbi,
  priceBinaryResolverAbi,
  type HealthView,
} from "@noxlimit/protocol";
import { describe, expect, it } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiItem,
  zeroHash,
  type Hex,
  type PublicClient,
} from "viem";

import type { ReplayLog } from "../src/chain/replay-engine.js";
import { OrderBookProjector } from "../src/projections/orderbook-projector.js";
import { ProjectionStore } from "../src/projections/store.js";
import { makeCatalogManifest, makeMarketRecord, testAddress, testHash } from "./fixtures.js";

describe("position projection", () => {
  it("aggregates fills, uses actual ERC-1155 balance, excludes transfers, and requires redemption evidence", async () => {
    const record = makeMarketRecord({ startsAt: "100", tradingClosesAt: "200", resolvesAt: "3700" });
    const manifest = makeCatalogManifest(record);
    const owner = testAddress("4");
    let currentShares = 4_000_000n;
    const client = {
      getBlock: async () => ({ number: 100n, timestamp: 400n }),
      readContract: async (input: { functionName: string }) => {
        if (input.functionName === "statusOf") return 5;
        if (input.functionName === "evaluationCountOf") return 1;
        if (input.functionName === "maximumEvaluations") return 8;
        if (input.functionName === "remainingEvaluations") return 7;
        if (input.functionName === "lastEvaluationAtOf") return 150n;
        if (input.functionName === "minimumEvaluationInterval") return 60n;
        if (input.functionName === "authorizedMinOutOf") return 0n;
        if (input.functionName === "resolved") return true;
        if (input.functionName === "resolvedYes") return true;
        if (input.functionName === "balanceOf") return currentShares;
        throw new Error(`unexpected read ${input.functionName}`);
      },
    } as unknown as PublicClient;
    const store = new ProjectionStore(manifest.catalogRevision, health(manifest.catalogRevision));
    const projector = new OrderBookProjector({ client, store, manifest });

    const logs = [
      ...filledOrderLogs(record.contracts.orderBook, owner, 1n, 1_000_000n, 2_000_000n, 0),
      ...filledOrderLogs(record.contracts.orderBook, owner, 2n, 1_000_000n, 3_000_000n, 10),
    ];
    for (const log of logs) await projector.apply(log);
    await projector.complete(100n);
    const aggregated = await store.listPositions(owner);
    expect(aggregated).toHaveLength(1);
    expect(aggregated[0]).toMatchObject({
      owner,
      side: "YES",
      shares: "4.000000",
      collateralSpent: "2.000000",
      realizedAveragePrice: "0.4",
      maximumRedemption: "4.000000",
      state: "REDEEMABLE",
    });

    currentShares = 0n;
    await projector.complete(100n);
    expect(await store.listPositions(owner)).toEqual([]);

    await projector.apply(redemptionLog(
      record.contracts.conditionalTokens,
      record.collateral.address,
      record.conditionId,
      owner,
      30,
    ));
    await projector.complete(100n);
    expect(await store.listPositions(owner)).toEqual([
      expect.objectContaining({ shares: "0.000000", state: "REDEEMED" }),
    ]);
    expect(await store.listActivity({ owner })).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "POSITION_REDEEMED", actor: owner })]),
    );
  });

  it("projects a resolver transaction as market resolution activity without requiring an order", async () => {
    const record = makeMarketRecord();
    const manifest = makeCatalogManifest(record);
    const store = new ProjectionStore(manifest.catalogRevision, health(manifest.catalogRevision));
    const projector = new OrderBookProjector({
      client: { getBlock: async () => ({ number: 100n, timestamp: 400n }) } as unknown as PublicClient,
      store,
      manifest,
    });
    const resolution = log(record.contracts.resolver, testHash("8"), 7, {
      topics: encodeEventTopics({
        abi: priceBinaryResolverAbi,
        eventName: "MarketResolved",
        args: { questionId: record.questionId, yesWon: true },
      }),
      data: encodeAbiParameters(
        [
          { type: "int256" },
          { type: "uint64" },
          { type: "uint80" },
          { type: "uint80" },
        ],
        [65_001n * 10n ** 18n, 300n, 12n, 11n],
      ),
    });
    await projector.apply(resolution);
    expect(await store.listActivity({ marketId: record.marketId })).toEqual([
      expect.objectContaining({
        kind: "MARKET_RESOLVED",
        marketId: record.marketId,
        side: "YES",
        transactionHash: testHash("8"),
        logIndex: 7,
      }),
    ]);
  });
});

function filledOrderLogs(
  orderBook: `0x${string}`,
  owner: `0x${string}`,
  orderId: bigint,
  amountIn: bigint,
  outcomeTokens: bigint,
  startLogIndex: number,
): ReplayLog[] {
  const transactionHash = orderId === 1n ? testHash("1") : testHash("2");
  const candidate = orderId === 1n ? testHash("3") : testHash("4");
  return [
    log(orderBook, transactionHash, startLogIndex, {
      topics: encodeEventTopics({
        abi: noxLimitOrderBookAbi,
        eventName: "OrderCreated",
        args: { orderId, owner, recipient: owner },
      }),
      data: encodeAbiParameters(
        [
          { type: "uint8" },
          { type: "uint256" },
          { type: "uint64" },
          { type: "bytes32" },
        ],
        [0, amountIn, 190n, testHash("5")],
      ),
    }),
    log(orderBook, transactionHash, startLogIndex + 1, {
      topics: encodeEventTopics({
        abi: noxLimitOrderBookAbi,
        eventName: "PublicationRequested",
        args: { orderId, nonce: 1 },
      }),
      data: encodeAbiParameters([{ type: "bytes32" }], [candidate]),
    }),
    log(orderBook, transactionHash, startLogIndex + 2, {
      topics: encodeEventTopics({
        abi: noxLimitOrderBookAbi,
        eventName: "Filled",
        args: { orderId, nonce: 1 },
      }),
      data: encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }],
        [outcomeTokens, outcomeTokens],
      ),
    }),
  ];
}

const payoutRedemptionEvent = parseAbiItem(
  "event PayoutRedemption(address indexed redeemer, address indexed collateralToken, bytes32 indexed parentCollectionId, bytes32 conditionId, uint256[] indexSets, uint256 payout)",
);

function redemptionLog(
  conditionalTokens: `0x${string}`,
  collateral: `0x${string}`,
  conditionId: Hex,
  owner: `0x${string}`,
  logIndex: number,
): ReplayLog {
  return log(conditionalTokens, testHash("9"), logIndex, {
    topics: encodeEventTopics({
      abi: [payoutRedemptionEvent],
      eventName: "PayoutRedemption",
      args: { redeemer: owner, collateralToken: collateral, parentCollectionId: zeroHash },
    }),
    data: encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256[]" }, { type: "uint256" }],
      [conditionId, [1n, 2n], 4_000_000n],
    ),
  });
}

function log(
  address: `0x${string}`,
  transactionHash: Hex,
  logIndex: number,
  payload: { topics: readonly Hex[]; data: Hex },
): ReplayLog {
  return {
    address,
    blockHash: testHash("a"),
    transactionHash,
    blockNumber: 100n,
    logIndex,
    ...payload,
  };
}

function health(catalogRevision: Hex): HealthView {
  return {
    status: "READY",
    chainId: 11_155_111,
    catalogRevision,
    headBlock: "100",
    safeBlock: "100",
    indexerLagBlocks: "0",
    evaluator: { status: "READY" },
    funding: { status: "UNAVAILABLE" },
    asOf: "2030-01-01T00:00:00.000Z",
  };
}
