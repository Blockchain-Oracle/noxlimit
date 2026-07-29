import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { ETHEREUM_SEPOLIA_CHAIN_ID, canonicalMarketQuestion } from "@noxlimit/protocol";

import {
  CatalogValidationError,
  catalogManifestSchema,
  createSepoliaBootstrapManifest,
  deriveMarketId,
  deriveQuestionId,
  hashCatalogManifest,
  immutableMarketRecordSchema,
  liquidityProvenanceOf,
  type CatalogManifest,
  type CatalogManifestPayload,
  type ImmutableMarketRecord,
  validateCatalogChain,
  validateCatalogManifest,
} from "../src/index.js";

function address(digit: string): `0x${string}` {
  return `0x${digit.repeat(40)}`;
}

function hash(digit: string): `0x${string}` {
  return `0x${digit.repeat(64)}`;
}

function marketRecord(options: { suffix: string; strikePriceWad: string }): ImmutableMarketRecord {
  const identity = {
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    asset: "BTC/USD" as const,
    horizon: "1h" as const,
    oracle: { source: "CHAINLINK" as const, proxy: address("1"), assetId: hash("a") },
    strikePriceWad: options.strikePriceWad,
    tradingClosesAt: "1893459420",
    resolvesAt: "1893459600",
    collateral: address("2"),
    resolverPolicy: {
      policyVersion: "chainlink-first-observation-v1",
      maximumObservationDelaySeconds: "300",
      comparison: ">=" as const,
    },
  };
  const seedTransactionHash = hash(options.suffix);
  return {
    schemaVersion: 1,
    marketId: deriveMarketId(identity),
    questionId: deriveQuestionId(identity),
    conditionId: hash(options.suffix === "b" ? "c" : "d"),
    version: "1",
    identity,
    question: canonicalMarketQuestion({
      asset: identity.asset,
      strikePriceWad: BigInt(identity.strikePriceWad),
      resolvesAtSeconds: BigInt(identity.resolvesAt),
    }),
    collateral: {
      address: address("2"),
      name: "NoxLimit Test USDC",
      symbol: "NLTUSDC",
      decimals: 6,
    },
    oracle: {
      source: "CHAINLINK",
      settlementAdapter: address(options.suffix === "b" ? "3" : "4"),
      proxy: address("1"),
      assetId: hash("a"),
      feedDescription: "BTC / USD",
      feedDecimals: 8,
    },
    contracts: {
      conditionalTokens: address("5"),
      resolver: address(options.suffix === "b" ? "6" : "7"),
      fpmm: address(options.suffix === "b" ? "8" : "9"),
      orderBook: address(options.suffix === "b" ? "a" : "b"),
    },
    positions: { yesPositionId: options.suffix === "b" ? "1" : "3", noPositionId: "2" },
    times: { startsAt: "1893456000", tradingClosesAt: "1893459420", resolvesAt: "1893459600" },
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
      lowLiquidityDepthAtoms: "50000000",
    },
    deployment: {
      deploymentBlock: "800",
      transactions: {
        resolver: hash("1"),
        prepareCondition: hash("2"),
        fpmm: hash("3"),
        seedLiquidity: seedTransactionHash,
        orderBook: hash("4"),
      },
    },
    provenance: {
      conditionalTokensCommit: "1".repeat(40),
      fpmmCommit: "2".repeat(40),
      noxContractsVersion: "0.2.4",
      sourceManifestRef: "source-manifest:gnosis-nox-pins",
    },
    verification: {
      status: "VERIFIED",
      verifiedAt: "2029-12-31T00:00:00.000Z",
      verifiedAtBlock: "950",
      verifiedBy: address("c"),
      evidenceRef: "evidence:sepolia-bundle-verification",
      runtimeCodeHashes: {
        collateral: hash("4"),
        settlementAdapter: hash("5"),
        conditionalTokens: hash("6"),
        resolver: hash("7"),
        fpmm: hash("8"),
        orderBook: hash("9"),
      },
    },
  };
}

function revision(
  payload: Omit<CatalogManifestPayload, "catalogRevision">,
): CatalogManifest {
  return catalogManifestSchema.parse({ ...payload, catalogRevision: hashCatalogManifest(payload) });
}

describe("Sepolia catalog bootstrap", () => {
  it("ships an empty, valid, self-hashed manifest with no product sample values", async () => {
    const raw = await readFile(new URL("../../sepolia/markets.json", import.meta.url), "utf8");
    const fromDisk: unknown = JSON.parse(raw);
    const parsed = validateCatalogManifest(fromDisk);
    assert.deepEqual(parsed, createSepoliaBootstrapManifest());
    assert.equal(parsed.chainId, ETHEREUM_SEPOLIA_CHAIN_ID);
    assert.deepEqual(parsed.markets, []);
    assert.deepEqual(parsed.routing, []);
  });

  it("rejects tampered revision content", () => {
    const manifest = createSepoliaBootstrapManifest();
    assert.throws(
      () => validateCatalogManifest({ ...manifest, effectiveBlock: "1" }),
      CatalogValidationError,
    );
  });

  it("requires a non-empty, contiguous hash chain", () => {
    assert.throws(() => validateCatalogChain([]), CatalogValidationError);
    assert.deepEqual(validateCatalogChain([createSepoliaBootstrapManifest()]).length, 1);
  });

  it("accepts one real ACTIVE route per asset/horizon and preserves seed provenance", () => {
    const bootstrap = createSepoliaBootstrapManifest();
    const market = marketRecord({ suffix: "b", strikePriceWad: "65000000000000000000000" });
    const next = revision({
      schemaVersion: 1,
      chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
      revision: "1",
      previousRevisionHash: bootstrap.catalogRevision,
      effectiveAt: "2029-12-31T12:00:00.000Z",
      effectiveBlock: "1000",
      markets: [market],
      routing: [
        {
          marketId: market.marketId,
          activation: "ACTIVE",
          opensAt: "2029-12-31T12:00:00.000Z",
          opensAtBlock: "1000",
        },
      ],
    });
    assert.equal(validateCatalogChain([bootstrap, next]).length, 2);
    assert.deepEqual(liquidityProvenanceOf(market), {
      kind: "BUILDER_SEEDED",
      seedTransactionHash: market.pool.seedTransactionHash,
    });
  });

  it("rejects a horizon or displayed question that contradicts the resolver-bound record", () => {
    const market = marketRecord({ suffix: "b", strikePriceWad: "65000000000000000000000" });
    assert.equal(immutableMarketRecordSchema.safeParse(market).success, true);
    assert.equal(
      immutableMarketRecordSchema.safeParse({
        ...market,
        times: { ...market.times, resolvesAt: "1893460200" },
        identity: { ...market.identity, resolvesAt: "1893460200" },
      }).success,
      false,
    );
    assert.equal(
      immutableMarketRecordSchema.safeParse({ ...market, question: "Will BTC go up?" }).success,
      false,
    );
  });

  it("rejects two ACTIVE markets for one asset/horizon", () => {
    const first = marketRecord({ suffix: "b", strikePriceWad: "65000000000000000000000" });
    const second = marketRecord({ suffix: "e", strikePriceWad: "66000000000000000000000" });
    const payload: CatalogManifestPayload = {
      schemaVersion: 1,
      chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
      revision: "1",
      previousRevisionHash: createSepoliaBootstrapManifest().catalogRevision,
      effectiveAt: "2029-12-31T12:00:00.000Z",
      effectiveBlock: "1000",
      markets: [first, second],
      routing: [first, second].map((market) => ({
        marketId: market.marketId,
        activation: "ACTIVE" as const,
        opensAt: "2029-12-31T12:00:00.000Z",
        opensAtBlock: "1000",
      })),
    };
    assert.throws(
      () => validateCatalogManifest({ ...payload, catalogRevision: hashCatalogManifest(payload) }),
      CatalogValidationError,
    );
  });
});
