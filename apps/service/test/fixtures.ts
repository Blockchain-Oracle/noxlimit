import {
  catalogManifestSchema,
  deriveMarketId,
  deriveQuestionId,
  hashCatalogManifest,
  type CatalogManifest,
  type CatalogManifestPayload,
  type ImmutableMarketRecord,
} from "@noxlimit/catalog";
import { canonicalMarketQuestion, MARKET_HORIZON_SECONDS } from "@noxlimit/protocol";
import { keccak256, type Address, type Hex } from "viem";

export const RUNTIME_BYTECODE = "0x6001" as Hex;
export const RUNTIME_CODE_HASH = keccak256(RUNTIME_BYTECODE);

export function testAddress(digit: string): Address {
  return `0x${digit.repeat(40)}` as Address;
}

export function testHash(digit: string): Hex {
  return `0x${digit.repeat(64)}` as Hex;
}

export function makeMarketRecord(
  overrides: Partial<{
    startsAt: string;
    tradingClosesAt: string;
    resolvesAt: string;
    horizon: "1h" | "4h" | "24h";
    lowLiquidityDepthAtoms: string;
  }> = {},
): ImmutableMarketRecord {
  const startsAt = overrides.startsAt ?? "1893456000";
  const horizon = overrides.horizon ?? "1h";
  const tradingClosesAt = overrides.tradingClosesAt ?? "1893459000";
  const resolvesAt = overrides.resolvesAt ??
    (BigInt(startsAt) + MARKET_HORIZON_SECONDS[horizon]).toString();
  const identity = {
    chainId: 11_155_111 as const,
    asset: "BTC/USD" as const,
    horizon,
    oracle: {
      source: "CHAINLINK" as const,
      proxy: testAddress("1"),
      assetId: testHash("a"),
    },
    strikePriceWad: "65000000000000000000000",
    tradingClosesAt,
    resolvesAt,
    collateral: testAddress("2"),
    resolverPolicy: {
      policyVersion: "chainlink-first-observation-v1",
      maximumObservationDelaySeconds: "300",
      comparison: ">=" as const,
    },
  };
  const marketId = deriveMarketId(identity);
  const questionId = deriveQuestionId(identity);
  const seedTransactionHash = testHash("b");
  return {
    schemaVersion: 1,
    marketId,
    questionId,
    conditionId: testHash("c"),
    version: "1",
    identity,
    question: canonicalMarketQuestion({
      asset: identity.asset,
      strikePriceWad: BigInt(identity.strikePriceWad),
      resolvesAtSeconds: BigInt(identity.resolvesAt),
    }),
    collateral: {
      address: testAddress("2"),
      name: "NoxLimit Test USDC",
      symbol: "NLTUSDC",
      decimals: 6,
    },
    oracle: {
      source: "CHAINLINK",
      settlementAdapter: testAddress("3"),
      proxy: testAddress("1"),
      assetId: testHash("a"),
      feedDescription: "BTC / USD",
      feedDecimals: 8,
    },
    contracts: {
      conditionalTokens: testAddress("5"),
      resolver: testAddress("6"),
      fpmm: testAddress("8"),
      orderBook: testAddress("9"),
    },
    positions: { yesPositionId: "1", noPositionId: "2" },
    times: { startsAt, tradingClosesAt, resolvesAt },
    pool: {
      feeBps: 200,
      builderSeededLiquidity: true,
      seedTransactionHash,
      seededAtBlock: "900",
      completeSetsSeededAtoms: "50000000",
    },
    monitoringPolicy: {
      evaluationTimeoutSeconds: "120",
      publicationTimeoutSeconds: "180",
      minimumEvaluationIntervalSeconds: "60",
      maximumEvaluations: 8,
    },
    runtimePolicy: {
      oracleMaxAgeSeconds: 3_600,
      poolQuoteMaxAgeSeconds: 60,
      indexerMaxLagBlocks: 6,
      evaluatorHeartbeatMaxAgeSeconds: 60,
      lowLiquidityDepthAtoms: overrides.lowLiquidityDepthAtoms ?? "50000000",
    },
    deployment: {
      deploymentBlock: "800",
      transactions: {
        resolver: testHash("1"),
        prepareCondition: testHash("2"),
        fpmm: testHash("3"),
        seedLiquidity: seedTransactionHash,
        orderBook: testHash("4"),
      },
    },
    provenance: {
      conditionalTokensCommit: "1".repeat(40),
      fpmmCommit: "2".repeat(40),
      noxContractsVersion: "0.2.4",
      sourceManifestRef: "source-manifest:test-pins",
    },
    verification: {
      status: "VERIFIED",
      verifiedAt: "2029-12-31T00:00:00.000Z",
      verifiedAtBlock: "950",
      verifiedBy: testAddress("d"),
      evidenceRef: "evidence:test-bundle-verification",
      runtimeCodeHashes: {
        collateral: RUNTIME_CODE_HASH,
        settlementAdapter: RUNTIME_CODE_HASH,
        conditionalTokens: RUNTIME_CODE_HASH,
        resolver: RUNTIME_CODE_HASH,
        fpmm: RUNTIME_CODE_HASH,
        orderBook: RUNTIME_CODE_HASH,
      },
    },
  };
}

export function makeCatalogManifest(record = makeMarketRecord()): CatalogManifest {
  const payload: CatalogManifestPayload = {
    schemaVersion: 1,
    chainId: 11_155_111,
    revision: "1",
    previousRevisionHash: testHash("f"),
    effectiveAt: "2029-12-31T00:00:00.000Z",
    effectiveBlock: "1000",
    markets: [record],
    routing: [{
      marketId: record.marketId,
      activation: "ACTIVE",
      opensAt: new Date(Number(record.times.startsAt) * 1_000).toISOString(),
      opensAtBlock: "1000",
    }],
  };
  return catalogManifestSchema.parse({
    ...payload,
    catalogRevision: hashCatalogManifest(payload),
  });
}
