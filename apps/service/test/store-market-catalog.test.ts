import { createSepoliaBootstrapManifest, type ImmutableMarketRecord } from "@noxlimit/catalog";
import {
  healthViewSchema,
  marketStreamCardViewSchema,
  type MarketStreamCardView,
} from "@noxlimit/protocol";
import { describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";

import {
  CatalogChainVerificationError,
  verifyCatalogOnchain,
} from "../src/catalog/onchain-verifier.js";
import { LiveMarketReader } from "../src/chain/market-reader.js";
import { ProjectionStore } from "../src/projections/store.js";
import {
  RUNTIME_BYTECODE,
  makeCatalogManifest,
  makeMarketRecord,
  testAddress,
  testHash,
} from "./fixtures.js";

describe("market stream snapshots", () => {
  it("freezes ordering while live values update and rejects stale snapshot identities", async () => {
    const revision = testHash("f");
    const store = new ProjectionStore(revision, healthViewSchema.parse({
      status: "READY",
      chainId: 11_155_111,
      catalogRevision: revision,
      headBlock: "100",
      safeBlock: "94",
      indexerLagBlocks: "6",
      evaluator: { status: "READY" },
      funding: { status: "UNAVAILABLE" },
      asOf: "2030-01-01T00:00:00.000Z",
    }));
    const firstId = testHash("1");
    const secondId = testHash("2");
    store.replaceCatalog(revision, [
      card(firstId, "2030-01-01T01:00:00.000Z", "100", "2030-01-01T00:00:00.000Z"),
      card(secondId, "2030-01-01T02:00:00.000Z", "200", "2030-01-01T00:00:00.000Z"),
    ]);
    const firstPage = await store.listMarkets({ sort: "CLOSING_SOON", limit: 1 });
    expect(firstPage.items.map((item) => item.marketId)).toEqual([firstId]);
    expect(firstPage.nextCursor).toBeDefined();

    store.replaceCatalog(revision, [
      card(firstId, "2030-01-01T03:00:00.000Z", "500", "2030-01-01T00:00:05.000Z"),
      card(secondId, "2030-01-01T00:30:00.000Z", "50", "2030-01-01T00:00:05.000Z"),
    ]);
    const continuation = await store.listMarkets({
      sort: "CLOSING_SOON",
      limit: 1,
      snapshot: firstPage.snapshot,
      cursor: firstPage.nextCursor,
    });
    expect(continuation.items.map((item) => item.marketId)).toEqual([secondId]);
    expect(continuation.items[0]?.completeSetDepthAtoms).toBe("50");

    const refreshed = await store.listMarkets({ sort: "CLOSING_SOON", limit: 1 });
    expect(refreshed.items.map((item) => item.marketId)).toEqual([secondId]);
    await expect(store.listMarkets({
      sort: "CLOSING_SOON",
      limit: 1,
      snapshot: "missing",
      cursor: "missing",
    })).rejects.toThrow("unknown or expired snapshot");
  });
});

describe("direct market reads", () => {
  it("quotes fractional Test USDC at one pinned latest block with one-sided price impact", async () => {
    const record = makeMarketRecord({ startsAt: "100", tradingClosesAt: "200", resolvesAt: "3700" });
    const calls: Array<{ functionName: string; blockNumber?: bigint; args?: readonly unknown[] }> = [];
    let timestamp = 150n;
    const client = {
      getBlock: vi.fn(async () => ({ number: 50n, timestamp })),
      readContract: vi.fn(async (input: { functionName: string; blockNumber?: bigint; args?: readonly unknown[] }) => {
        calls.push(input);
        const amount = input.args?.[0] as bigint;
        return amount === 1_500_000n ? 2_500_000n : 2_000_000n;
      }),
    } as unknown as PublicClient;
    const reader = new LiveMarketReader(client, makeCatalogManifest(record), () => true);
    const quote = await reader.quote(record.marketId, "YES", "1.500000");
    expect(quote).toMatchObject({
      amountIn: "1.500000",
      sharesOut: "2.500000",
      averagePrice: "0.6",
      priceImpactBps: 2_000,
      quotedAtBlock: "50",
      stale: false,
    });
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => call.blockNumber === 50n)).toBe(true);

    timestamp = 99n;
    await expect(reader.quote(record.marketId, "YES", "1")).resolves.toBeUndefined();
    timestamp = 200n;
    await expect(reader.quote(record.marketId, "YES", "1")).resolves.toBeUndefined();
    await expect(reader.quote(record.marketId, "YES", "0")).rejects.toThrow("positive");
  });

  it("returns only real bounded Chainlink rounds with an opaque continuation cursor", async () => {
    const record = makeMarketRecord({ startsAt: "100", tradingClosesAt: "400", resolvesAt: "3700" });
    const phase = 1n << 64n;
    const rounds = new Map<bigint, readonly [bigint, bigint, bigint, bigint, bigint]>([
      [phase + 5n, [phase + 5n, 65_005_00000000n, 0n, 199n, 0n]],
      [phase + 4n, [phase + 4n, 65_004_00000000n, 0n, 180n, 0n]],
      [phase + 3n, [phase + 3n, 65_003_00000000n, 0n, 160n, 0n]],
      [phase + 2n, [phase + 2n, 65_002_00000000n, 0n, 140n, 0n]],
      [phase + 1n, [phase + 1n, 65_001_00000000n, 0n, 120n, 0n]],
    ]);
    const client = {
      getBlockNumber: vi.fn(async () => 106n),
      getBlock: vi.fn(async () => ({ number: 100n, timestamp: 200n })),
      readContract: vi.fn(async (input: { functionName: string; args?: readonly unknown[] }) => {
        if (input.functionName === "latestRoundData") return rounds.get(phase + 5n);
        if (input.functionName === "getRoundData") return rounds.get(input.args?.[0] as bigint);
        throw new Error("unexpected read");
      }),
    } as unknown as PublicClient;
    const reader = new LiveMarketReader(client, makeCatalogManifest(record), () => true);
    const first = await reader.history({
      marketId: record.marketId,
      mode: "UNDERLYING",
      range: "1h",
      sampling: "TERMINAL_240_MAX",
      limit: 3,
    });
    expect(first?.points.map((point) => point.primaryValue)).toEqual([
      "65003",
      "65004",
      "65005",
    ]);
    expect(first?.toSafeBlock).toBe("100");
    expect(first?.nextCursor).toBeDefined();
    expect(first?.limitedHistory).toBe(true);
    const second = await reader.history({
      marketId: record.marketId,
      mode: "UNDERLYING",
      range: "1h",
      sampling: "TERMINAL_240_MAX",
      limit: 3,
      cursor: first?.nextCursor,
    });
    expect(second?.points.map((point) => point.primaryValue)).toEqual(["65001", "65002"]);
    expect(second?.nextCursor).toBeUndefined();
    expect(second?.limitedHistory).toBe(false);
    await expect(reader.history({
      marketId: record.marketId,
      mode: "OUTCOME_PRICES",
      limit: 3,
    })).resolves.toBeUndefined();
  });

  it("walks the terminal round of each adjacent Chainlink proxy phase", async () => {
    const record = makeMarketRecord({ startsAt: "100", tradingClosesAt: "400", resolvesAt: "3700" });
    const firstPhase = 1n << 64n;
    const secondPhase = 2n << 64n;
    const priorAggregator = testAddress("7");
    const rounds = new Map<bigint, readonly [bigint, bigint, bigint, bigint, bigint]>([
      [firstPhase + 1n, [firstPhase + 1n, 64_901_00000000n, 0n, 100n, firstPhase + 1n]],
      [firstPhase + 2n, [firstPhase + 2n, 64_902_00000000n, 0n, 110n, firstPhase + 2n]],
      [firstPhase + 3n, [firstPhase + 3n, 64_903_00000000n, 0n, 120n, firstPhase + 3n]],
      [secondPhase + 1n, [secondPhase + 1n, 65_001_00000000n, 0n, 130n, secondPhase + 1n]],
      [secondPhase + 2n, [secondPhase + 2n, 65_002_00000000n, 0n, 140n, secondPhase + 2n]],
    ]);
    const client = {
      getBlockNumber: vi.fn(async () => 106n),
      getBlock: vi.fn(async () => ({ number: 100n, timestamp: 200n })),
      readContract: vi.fn(async (input: { address: string; functionName: string; args?: readonly unknown[] }) => {
        if (input.address === priorAggregator && input.functionName === "latestRoundData") {
          return [3n, 64_903_00000000n, 0n, 120n, 0n] as const;
        }
        if (input.functionName === "latestRoundData") return rounds.get(secondPhase + 2n);
        if (input.functionName === "phaseAggregators") return priorAggregator;
        if (input.functionName === "getRoundData") return rounds.get(input.args?.[0] as bigint);
        throw new Error("unexpected read");
      }),
    } as unknown as PublicClient;
    const history = await new LiveMarketReader(
      client,
      makeCatalogManifest(record),
      () => true,
    ).history({
      marketId: record.marketId,
      mode: "UNDERLYING",
      range: "ALL",
      sampling: "TERMINAL_240_MAX",
      limit: 240,
    });

    expect(history?.points.map((point) => point.primaryValue)).toEqual([
      "64901",
      "64902",
      "64903",
      "65001",
      "65002",
    ]);
    expect(history?.limitedHistory).toBe(false);
    expect(history?.nextCursor).toBeUndefined();
    expect(client.readContract).toHaveBeenCalledWith(expect.objectContaining({
      address: priorAggregator,
      functionName: "latestRoundData",
      blockNumber: 100n,
    }));
  });

  it.each(["RETIRED", "SUCCESSOR"] as const)(
    "keeps underlying oracle history available for %s market URLs",
    async (activation) => {
      const record = makeMarketRecord({ startsAt: "100", tradingClosesAt: "400", resolvesAt: "3700" });
      const phase = 1n << 64n;
      const rounds = new Map<bigint, readonly [bigint, bigint, bigint, bigint, bigint]>([
        [phase + 1n, [phase + 1n, 65_001_00000000n, 0n, 120n, phase + 1n]],
        [phase + 2n, [phase + 2n, 65_002_00000000n, 0n, 140n, phase + 2n]],
      ]);
      const manifest = makeCatalogManifest(record);
      const routed = {
        ...manifest,
        routing: [{
          marketId: record.marketId,
          activation,
          ...(activation === "RETIRED"
            ? { opensAt: manifest.routing[0]!.opensAt, opensAtBlock: manifest.routing[0]!.opensAtBlock }
            : {}),
        }],
      };
      const client = {
        getBlockNumber: vi.fn(async () => 106n),
        getBlock: vi.fn(async () => ({ number: 100n, timestamp: 200n })),
        readContract: vi.fn(async (input: { functionName: string; args?: readonly unknown[] }) => {
          if (input.functionName === "latestRoundData") return rounds.get(phase + 2n);
          if (input.functionName === "getRoundData") return rounds.get(input.args?.[0] as bigint);
          throw new Error("unexpected read");
        }),
      } as unknown as PublicClient;
      const history = await new LiveMarketReader(client, routed, () => true).history({
        marketId: record.marketId,
        mode: "UNDERLYING",
        range: "ALL",
        limit: 240,
      });
      expect(history?.points).toHaveLength(2);
      expect(history?.limitedHistory).toBe(false);
    },
  );

  it("caps Chainlink round reads and returns a continuation until the source is exhausted", async () => {
    const record = makeMarketRecord({ startsAt: "100", tradingClosesAt: "400", resolvesAt: "3700" });
    const phase = 1n << 64n;
    let roundReads = 0;
    const client = {
      getBlockNumber: vi.fn(async () => 1_006n),
      getBlock: vi.fn(async () => ({ number: 1_000n, timestamp: 1_000n })),
      readContract: vi.fn(async (input: { functionName: string; args?: readonly unknown[] }) => {
        if (input.functionName === "latestRoundData") {
          return [phase + 300n, 65_300_00000000n, 0n, 300n, phase + 300n] as const;
        }
        if (input.functionName === "getRoundData") {
          roundReads += 1;
          const id = input.args?.[0] as bigint;
          const local = id & ((1n << 64n) - 1n);
          return [id, (65_000n + local) * 100_000_000n, 0n, local, id] as const;
        }
        throw new Error("unexpected read");
      }),
    } as unknown as PublicClient;
    const reader = new LiveMarketReader(client, makeCatalogManifest(record), () => true);
    const first = await reader.history({
      marketId: record.marketId,
      mode: "UNDERLYING",
      range: "ALL",
      limit: 240,
    });
    expect(first?.points).toHaveLength(240);
    expect(first?.limitedHistory).toBe(true);
    expect(first?.nextCursor).toBeDefined();
    expect(roundReads).toBe(240);

    const second = await reader.history({
      marketId: record.marketId,
      mode: "UNDERLYING",
      range: "ALL",
      limit: 240,
      cursor: first?.nextCursor,
    });
    expect(second?.points).toHaveLength(60);
    expect(second?.limitedHistory).toBe(false);
    expect(second?.nextCursor).toBeUndefined();
    expect(roundReads).toBe(300);
  });
});

describe("catalog onchain verification", () => {
  it("accepts the empty bootstrap without probing fabricated contracts", async () => {
    const getCode = vi.fn();
    await expect(verifyCatalogOnchain(
      createSepoliaBootstrapManifest(),
      { getChainId: async () => 11_155_111, getCode } as unknown as PublicClient,
    )).resolves.toBeUndefined();
    expect(getCode).not.toHaveBeenCalled();
  });

  it("verifies fee, resolver, adapter, and orderbook bindings and rejects fee drift", async () => {
    const record = makeMarketRecord();
    let fee = 20_000_000_000_000_000n;
    const client = matchingCatalogClient(record, () => fee);
    await expect(verifyCatalogOnchain(makeCatalogManifest(record), client)).resolves.toBeUndefined();
    fee = 10_000_000_000_000_000n;
    await expect(verifyCatalogOnchain(makeCatalogManifest(record), client)).rejects.toMatchObject({
      issues: expect.arrayContaining([expect.stringContaining("FPMM fee mismatch")]),
    });
  });

  it("rejects an RPC connected to the wrong chain before verification", async () => {
    await expect(verifyCatalogOnchain(
      createSepoliaBootstrapManifest(),
      { getChainId: async () => 1 } as unknown as PublicClient,
    )).rejects.toBeInstanceOf(CatalogChainVerificationError);
  });
});

function card(
  marketId: `0x${string}`,
  tradingClosesAt: string,
  depth: string,
  asOf: string,
): MarketStreamCardView {
  return marketStreamCardViewSchema.parse({
    marketId,
    chainId: 11_155_111,
    asset: "BTC/USD",
    horizon: "1h",
    question: "Will BTC/USD be at or above the strike?",
    strikeUsd: "65000",
    opensAt: "2030-01-01T00:00:00.000Z",
    opensAtBlock: "90",
    tradingClosesAt,
    resolvesAt: "2030-01-02T00:00:00.000Z",
    verification: "VERIFIED",
    catalogActivation: "ACTIVE",
    lifecycle: "ORDERING_OPEN",
    tradeability: "TRADEABLE",
    tradeabilityReasons: [],
    badges: [],
    indexerSafeBlock: "94",
    asOf,
    oraclePriceUsd: "65000",
    oracleObservedAt: asOf,
    yesAveragePrice: "0.5",
    noAveragePrice: "0.5",
    referenceAmount: "1.000000",
    completeSetDepth: depth,
    completeSetDepthAtoms: depth,
    liquidityProvenance: { kind: "BUILDER_SEEDED", seedTransactionHash: testHash("e") },
    oracleStale: false,
    poolQuotedAt: asOf,
    poolQuotedAtBlock: "94",
    poolStale: false,
    preview: {
      mode: "UNDERLYING",
      source: "Chainlink",
      feedRef: "test-feed",
      asOf,
      stale: false,
      points: [],
      limitedHistory: true,
    },
    positionInFilteredStream: 1,
    filteredStreamCount: 2,
  });
}

function matchingCatalogClient(
  record: ImmutableMarketRecord,
  fee: () => bigint,
): PublicClient {
  return {
    getChainId: async () => 11_155_111,
    getCode: async () => RUNTIME_BYTECODE,
    readContract: async (input: { address: string; functionName: string }) => {
      const { address, functionName } = input;
      if (functionName === "name") return record.collateral.name;
      if (functionName === "symbol") return record.collateral.symbol;
      if (functionName === "decimals") return record.collateral.decimals;
      if (functionName === "fee") return fee();
      if (functionName === "collateralToken") return record.collateral.address;
      if (functionName === "conditionIds") return record.conditionId;
      if (functionName === "getOutcomeSlotCount") return 2n;
      if (functionName === "fpmm") return record.contracts.fpmm;
      if (functionName === "conditionalTokens") return record.contracts.conditionalTokens;
      if (functionName === "collateral") return record.collateral.address;
      if (functionName === "conditionId") return record.conditionId;
      if (functionName === "tradingClosesAt") return BigInt(record.times.tradingClosesAt);
      if (functionName === "yesPositionId") return BigInt(record.positions.yesPositionId);
      if (functionName === "noPositionId") return BigInt(record.positions.noPositionId);
      if (functionName === "evaluationTimeout") return BigInt(record.monitoringPolicy.evaluationTimeoutSeconds);
      if (functionName === "publicationTimeout") return BigInt(record.monitoringPolicy.publicationTimeoutSeconds);
      if (functionName === "minimumEvaluationInterval") return BigInt(record.monitoringPolicy.minimumEvaluationIntervalSeconds);
      if (functionName === "maximumEvaluations") return record.monitoringPolicy.maximumEvaluations;
      if (functionName === "settlementAdapter") return record.oracle.settlementAdapter;
      if (functionName === "questionId") return record.questionId;
      if (functionName === "assetId") return record.oracle.assetId;
      if (functionName === "strikePriceWad") return BigInt(record.identity.strikePriceWad);
      if (functionName === "resolvesAt") return BigInt(record.times.resolvesAt);
      if (functionName === "maximumObservationDelay") return BigInt(record.identity.resolverPolicy.maximumObservationDelaySeconds);
      if (functionName === "feed") return record.oracle.source === "CHAINLINK" ? record.oracle.proxy : undefined;
      if (functionName === "feedDecimals") return record.oracle.source === "CHAINLINK" ? record.oracle.feedDecimals : undefined;
      throw new Error(`unexpected ${address}:${functionName}`);
    },
  } as unknown as PublicClient;
}
