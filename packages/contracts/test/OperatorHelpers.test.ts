import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { zeroAddress, type Address, type Hex } from "viem";

import {
  OperatorConfigurationError,
  HORIZON_SECONDS,
  OFFICIAL_SEPOLIA_CHAINLINK_FEEDS,
  PINNED_CONDITIONAL_TOKENS,
  PINNED_FPMM_FACTORY,
  assertLiquidityClosePreconditions,
  assertOutputReady,
  assertResolverIdentity,
  buildCatalogCandidate,
  buildCatalogCutoverCandidate,
  canonicalMarketQuestion,
  collateralMintShortfall,
  canonicalJson,
  deriveIdentityId,
  deploymentJournalPath,
  deploymentPlanId,
  loadCatalogAuthority,
  loadCatalogHistory,
  operatorPlan,
  parseBundleConfig,
  stableIdentityOf,
} from "../scripts/operator/lib.js";

function env(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NOXLIMIT_ASSET: "BTC/USD",
    NOXLIMIT_HORIZON: "1h",
    NOXLIMIT_QUESTION: "Will BTC/USD be at or above $65,000 at 2031-01-01T01:00:00Z?",
    NOXLIMIT_MARKET_VERSION: "1",
    NOXLIMIT_CONDITIONAL_TOKENS: PINNED_CONDITIONAL_TOKENS.address,
    NOXLIMIT_FPMM_FACTORY: PINNED_FPMM_FACTORY.address,
    NOXLIMIT_CHAINLINK_PROXY: OFFICIAL_SEPOLIA_CHAINLINK_FEEDS["BTC/USD"].proxy,
    NOXLIMIT_WORKER: "0x4444444444444444444444444444444444444444",
    NOXLIMIT_COLLATERAL_ADDRESS: "0x5555555555555555555555555555555555555555",
    NOXLIMIT_FUNDING_TREASURY_ADDRESS: "0x6666666666666666666666666666666666666666",
    NOXLIMIT_STRIKE_PRICE_WAD: "65000000000000000000000",
    NOXLIMIT_STARTS_AT: "1924992000",
    NOXLIMIT_TRADING_CLOSES_AT: "1924995420",
    NOXLIMIT_RESOLVES_AT: "1924995600",
    NOXLIMIT_MAXIMUM_OBSERVATION_DELAY_SECONDS: "300",
    NOXLIMIT_FPMM_FEE_BPS: "200",
    NOXLIMIT_POOL_SEED_ATOMS: "50000000",
    NOXLIMIT_EVALUATION_TIMEOUT_SECONDS: "120",
    NOXLIMIT_PUBLICATION_TIMEOUT_SECONDS: "180",
    NOXLIMIT_MINIMUM_EVALUATION_INTERVAL_SECONDS: "60",
    NOXLIMIT_MAXIMUM_EVALUATIONS: "8",
    NOXLIMIT_ORACLE_MAX_AGE_SECONDS: "3600",
    NOXLIMIT_POOL_QUOTE_MAX_AGE_SECONDS: "60",
    NOXLIMIT_INDEXER_MAX_LAG_BLOCKS: "6",
    NOXLIMIT_EVALUATOR_HEARTBEAT_MAX_AGE_SECONDS: "60",
    NOXLIMIT_LOW_LIQUIDITY_DEPTH_ATOMS: "50000000",
    NOXLIMIT_FUNDING_NATIVE_TARGET_WEI: "20000000000000000",
    NOXLIMIT_FUNDING_COLLATERAL_TARGET_ATOMS: "25000000",
    NOXLIMIT_FUNDING_NATIVE_PER_CLAIM_WEI: "20000000000000000",
    NOXLIMIT_FUNDING_COLLATERAL_PER_CLAIM_ATOMS: "25000000",
    NOXLIMIT_FUNDING_NATIVE_LIFETIME_WEI: "40000000000000000",
    NOXLIMIT_FUNDING_COLLATERAL_LIFETIME_ATOMS: "100000000",
    NOXLIMIT_FUNDING_COOLDOWN_SECONDS: "3600",
    NOXLIMIT_FUNDING_INITIAL_NATIVE_WEI: "100000000000000000",
    NOXLIMIT_FUNDING_INITIAL_COLLATERAL_ATOMS: "250000000",
    NOXLIMIT_CTF_COMMIT: PINNED_CONDITIONAL_TOKENS.sourceCommit,
    NOXLIMIT_FPMM_COMMIT: PINNED_FPMM_FACTORY.sourceCommit,
    NOXLIMIT_NOX_CONTRACTS_VERSION: "0.2.4",
    NOXLIMIT_SOURCE_MANIFEST_REF: ".thoughts/sources/source-manifest.md",
    NOXLIMIT_EVIDENCE_REF: "evidence:sepolia-market-bundle",
    NOXLIMIT_CATALOG_HISTORY_PATHS_JSON: JSON.stringify([
      fileURLToPath(new URL("../../catalog/sepolia/markets.json", import.meta.url)),
    ]),
    NOXLIMIT_CATALOG_OUTPUT_PATH: resolve("tmp/catalog-candidate.json"),
    NOXLIMIT_EVIDENCE_OUTPUT_PATH: resolve("tmp/deployment-evidence.json"),
    NOXLIMIT_CONFIRMATIONS: "2",
    ...overrides,
  };
}

function address(digit: string): Address {
  return `0x${digit.repeat(40)}` as Address;
}

function hash(digit: string): Hex {
  return `0x${digit.repeat(64)}` as Hex;
}

function recordFor(
  config: ReturnType<typeof parseBundleConfig>,
  suffix: string,
): Record<string, unknown> {
  const collateral = config.existingCollateral as Address;
  const identity = stableIdentityOf(config, collateral);
  const seedTransactionHash = hash(suffix);
  return {
    schemaVersion: 1,
    marketId: deriveIdentityId("market", identity),
    questionId: deriveIdentityId("question", identity),
    conditionId: hash(suffix === "a" ? "b" : "c"),
    version: config.version,
    identity,
    question: config.question,
    collateral: {
      address: collateral,
      name: "NoxLimit Test USDC",
      symbol: "NLTUSDC",
      decimals: 6,
    },
    oracle: {
      source: "CHAINLINK",
      settlementAdapter: address(suffix === "a" ? "6" : "7"),
      proxy: config.chainlinkProxy,
      assetId: identity.oracle.assetId,
      feedDescription: "BTC / USD",
      feedDecimals: 8,
    },
    contracts: {
      conditionalTokens: config.conditionalTokens,
      resolver: address(suffix === "a" ? "8" : "9"),
      fpmm: address(suffix === "a" ? "a" : "b"),
      orderBook: address(suffix === "a" ? "c" : "d"),
    },
    positions: { yesPositionId: suffix === "a" ? "1" : "3", noPositionId: "2" },
    times: {
      startsAt: config.startsAt.toString(),
      tradingClosesAt: config.tradingClosesAt.toString(),
      resolvesAt: config.resolvesAt.toString(),
    },
    pool: {
      feeBps: config.feeBps,
      builderSeededLiquidity: true,
      seedTransactionHash,
      seededAtBlock: "900",
      completeSetsSeededAtoms: config.seedAtoms.toString(),
    },
    monitoringPolicy: {
      evaluationTimeoutSeconds: config.evaluationTimeoutSeconds.toString(),
      publicationTimeoutSeconds: config.publicationTimeoutSeconds.toString(),
      minimumEvaluationIntervalSeconds: config.minimumEvaluationIntervalSeconds.toString(),
      maximumEvaluations: config.maximumEvaluations,
    },
    runtimePolicy: {
      oracleMaxAgeSeconds: config.runtimePolicy.oracleMaxAgeSeconds,
      poolQuoteMaxAgeSeconds: config.runtimePolicy.poolQuoteMaxAgeSeconds,
      indexerMaxLagBlocks: config.runtimePolicy.indexerMaxLagBlocks,
      evaluatorHeartbeatMaxAgeSeconds: config.runtimePolicy.evaluatorHeartbeatMaxAgeSeconds,
      lowLiquidityDepthAtoms: config.runtimePolicy.lowLiquidityDepthAtoms.toString(),
    },
    deployment: {
      deploymentBlock: "800",
      transactions: {
        resolver: hash("1"),
        prepareCondition: hash("2"),
        fpmm: hash("3"),
        seedLiquidity: seedTransactionHash,
        orderBook: hash("4"),
        settlementAdapter: hash("5"),
      },
    },
    provenance: config.provenance,
    verification: {
      status: "VERIFIED",
      verifiedAt: "2030-12-31T00:00:00.000Z",
      verifiedAtBlock: "950",
      verifiedBy: address("e"),
      evidenceRef: config.evidenceRef,
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

describe("operator configuration and manifest helpers", () => {
  it("parses a complete nonzero plan without retaining secrets or authorizing writes", () => {
    const privateKey = `0x${"9".repeat(64)}`;
    const config = parseBundleConfig(
      env({ SEPOLIA_OPERATOR_PRIVATE_KEY: privateKey }),
      1_900_000_000n,
    );
    const serialized = JSON.stringify(operatorPlan(config));
    assert.equal(config.asset, "BTC/USD");
    assert.equal(config.feeBps, 200);
    assert.equal(serialized.includes(privateKey), false);
    assert.match(serialized, /PLAN_ONLY/);
    assert.match(serialized, /defaultCommandWrites/);

    const reuse = parseBundleConfig(
      env(),
      1_900_000_000n,
    );
    assert.match(
      JSON.stringify(operatorPlan(reuse)),
      /verify issuer ownership, mint only the collateral shortfall, and top up the shared/,
    );

    const fresh = parseBundleConfig(
      env({
        NOXLIMIT_COLLATERAL_ADDRESS: undefined,
        NOXLIMIT_FUNDING_TREASURY_ADDRESS: undefined,
      }),
      1_900_000_000n,
    );
    assert.match(JSON.stringify(operatorPlan(fresh)), /deploy NoxLimit Test USDC/);
  });

  it("rejects missing, zero, gated-SOL, unsafe-time, and underfunded configurations", () => {
    assert.throws(
      () => parseBundleConfig(env({ NOXLIMIT_WORKER: undefined }), 1_900_000_000n),
      OperatorConfigurationError,
    );
    assert.throws(
      () => parseBundleConfig(env({ NOXLIMIT_WORKER: zeroAddress }), 1_900_000_000n),
      OperatorConfigurationError,
    );
    assert.throws(
      () => parseBundleConfig(env({ NOXLIMIT_ASSET: "SOL/USD" }), 1_900_000_000n),
      /Pyth path/,
    );
    assert.throws(
      () =>
        parseBundleConfig(
          env({
            NOXLIMIT_STARTS_AT: "1899996400",
            NOXLIMIT_TRADING_CLOSES_AT: "1899999999",
            NOXLIMIT_RESOLVES_AT: "1900000000",
            NOXLIMIT_QUESTION:
              "Will BTC/USD be at or above $65,000 at 2030-03-17T17:46:40Z?",
          }),
          1_900_000_000n,
        ),
      /future|market times/,
    );
    assert.throws(
      () =>
        parseBundleConfig(
          env({ NOXLIMIT_FUNDING_NATIVE_LIFETIME_WEI: "1" }),
          1_900_000_000n,
        ),
      /lifetime cap/,
    );
    assert.throws(
      () =>
        parseBundleConfig(
          env({ NOXLIMIT_FUNDING_COLLATERAL_PER_CLAIM_ATOMS: "10000000" }),
          1_900_000_000n,
        ),
      /one explicit request/,
    );
    assert.throws(
      () =>
        parseBundleConfig(
          env({
            NOXLIMIT_COLLATERAL_ADDRESS: undefined,
            NOXLIMIT_FUNDING_TREASURY_ADDRESS: "0x6666666666666666666666666666666666666666",
          }),
          1_900_000_000n,
        ),
      /existing collateral/,
    );
    assert.throws(
      () =>
        parseBundleConfig(
          env({ NOXLIMIT_FUNDING_TREASURY_ADDRESS: undefined }),
          1_900_000_000n,
        ),
      /verified pair/,
    );
  });

  it("binds the horizon and displayed question to the resolver configuration", () => {
    assert.equal(HORIZON_SECONDS["1h"], 3_600n);
    assert.equal(
      canonicalMarketQuestion("BTC/USD", 65_000n * 10n ** 18n, 1_924_995_600n),
      "Will BTC/USD be at or above $65,000 at 2031-01-01T01:00:00Z?",
    );
    assert.equal(
      canonicalMarketQuestion("ETH/USD", 2_500_125n * 10n ** 15n, 1_924_995_600n),
      "Will ETH/USD be at or above $2,500.125 at 2031-01-01T01:00:00Z?",
    );
    assert.throws(
      () =>
        parseBundleConfig(
          env({ NOXLIMIT_RESOLVES_AT: "1924999200" }),
          1_900_000_000n,
        ),
      /declared 1h horizon/,
    );
    assert.throws(
      () =>
        parseBundleConfig(
          env({ NOXLIMIT_QUESTION: "Will BTC go up?" }),
          1_900_000_000n,
        ),
      /canonical question/,
    );
  });

  it("mints only the shared collateral shortfall and requires the active issuer", () => {
    const operator = address("a");
    assert.equal(
      collateralMintShortfall({
        operator,
        issuer: operator,
        operatorBalance: 20n,
        requiredAtoms: 50n,
      }),
      30n,
    );
    assert.equal(
      collateralMintShortfall({
        operator,
        issuer: operator,
        operatorBalance: 50n,
        requiredAtoms: 50n,
      }),
      0n,
    );
    assert.throws(
      () =>
        collateralMintShortfall({
          operator,
          issuer: address("b"),
          operatorBalance: 0n,
          requiredAtoms: 50n,
        }),
      /issuer.*active operator/,
    );
  });

  it("binds each asset to its official Sepolia feed and exact substrate provenance", () => {
    assert.throws(
      () =>
        parseBundleConfig(
          env({ NOXLIMIT_CHAINLINK_PROXY: OFFICIAL_SEPOLIA_CHAINLINK_FEEDS["ETH/USD"].proxy }),
          1_900_000_000n,
        ),
      /official Ethereum Sepolia BTC\/USD proxy/,
    );
    assert.throws(
      () =>
        parseBundleConfig(env({ NOXLIMIT_CTF_COMMIT: "1".repeat(40) }), 1_900_000_000n),
      /audited source pin/,
    );
    assert.throws(
      () =>
        parseBundleConfig(
          env({ NOXLIMIT_CONDITIONAL_TOKENS: address("1") }),
          1_900_000_000n,
        ),
      /pinned Sepolia deployment/,
    );
    const eth = parseBundleConfig(
      env({
        NOXLIMIT_ASSET: "ETH/USD",
        NOXLIMIT_CHAINLINK_PROXY: OFFICIAL_SEPOLIA_CHAINLINK_FEEDS["ETH/USD"].proxy,
        NOXLIMIT_STRIKE_PRICE_WAD: "2500000000000000000000",
        NOXLIMIT_QUESTION: "Will ETH/USD be at or above $2,500 at 2031-01-01T01:00:00Z?",
      }),
      1_900_000_000n,
    );
    assert.equal(eth.chainlinkProxy, OFFICIAL_SEPOLIA_CHAINLINK_FEEDS["ETH/USD"].proxy);
  });

  it("uses sorted canonical JSON and deterministic identity domains", () => {
    assert.equal(canonicalJson({ z: 1, a: ["x", true] }), '{"a":["x",true],"z":1}');
    const config = parseBundleConfig(env(), 1_900_000_000n);
    const identity = stableIdentityOf(config, config.existingCollateral as Address);
    assert.match(deriveIdentityId("market", identity), /^0x[0-9a-f]{64}$/);
    assert.notEqual(deriveIdentityId("market", identity), deriveIdentityId("question", identity));
    assert.equal(
      deriveIdentityId("market", identity),
      deriveIdentityId("market", stableIdentityOf(config, config.existingCollateral as Address)),
    );
    const operator = address("f");
    assert.equal(deploymentPlanId(config, operator), deploymentPlanId(config, operator));
    assert.notEqual(
      deploymentPlanId(config, operator),
      deploymentPlanId(
        parseBundleConfig(
          env({
            NOXLIMIT_MARKET_VERSION: "2",
          }),
          1_900_000_000n,
        ),
        operator,
      ),
    );
    assert.equal(
      deploymentJournalPath("/tmp/noxlimit-evidence.json"),
      "/tmp/noxlimit-evidence.json.journal.json",
    );
  });

  it("builds an authority-validated first ACTIVE revision and then a SUCCESSOR", async () => {
    const authority = await loadCatalogAuthority();
    const config = parseBundleConfig(env(), 1_900_000_000n);
    const bootstrap = await loadCatalogHistory(config.catalogHistoryPaths, authority);
    const first = buildCatalogCandidate(
      bootstrap,
      recordFor(config, "a"),
      "2030-12-31T12:00:00.000Z",
      1_000n,
      authority,
    );
    assert.equal(first.revision, "1");
    assert.equal(first.routing.at(-1)?.activation, "ACTIVE");

    const successorConfig = parseBundleConfig(
      env({
        NOXLIMIT_STRIKE_PRICE_WAD: "66000000000000000000000",
        NOXLIMIT_STARTS_AT: "1924995300",
        NOXLIMIT_TRADING_CLOSES_AT: "1924998720",
        NOXLIMIT_RESOLVES_AT: "1924998900",
        NOXLIMIT_QUESTION: "Will BTC/USD be at or above $66,000 at 2031-01-01T01:55:00Z?",
      }),
      1_900_000_000n,
    );
    const successor = buildCatalogCandidate(
      [...bootstrap, first],
      recordFor(successorConfig, "d"),
      "2030-12-31T13:00:00.000Z",
      1_100n,
      authority,
    );
    assert.equal(successor.revision, "2");
    assert.equal(successor.routing.at(-1)?.activation, "SUCCESSOR");
    assert.equal(authority.validateCatalogChain([...bootstrap, first, successor]).length, 3);

    const effectiveAt = new Date(Number(1_924_995_600n) * 1_000).toISOString();
    const predecessorMarketId = first.routing.at(-1)?.marketId as Hex;
    const successorMarketId = successor.routing.at(-1)?.marketId as Hex;
    const cutover = buildCatalogCutoverCandidate(
      [...bootstrap, first, successor],
      predecessorMarketId,
      successorMarketId,
      effectiveAt,
      1_200n,
      authority,
    );
    const predecessorRoute = cutover.routing.find(
      (route) => route.marketId === predecessorMarketId,
    );
    const successorRoute = cutover.routing.find((route) => route.marketId === successorMarketId);
    assert.equal(predecessorRoute?.activation, "RETIRED");
    assert.equal(successorRoute?.activation, "ACTIVE");
    assert.equal(successorRoute?.opensAt, effectiveAt);
    assert.equal(successorRoute?.opensAtBlock, "1200");
    assert.equal(
      authority.validateCatalogChain([...bootstrap, first, successor, cutover]).length,
      4,
    );
    assert.throws(
      () =>
        buildCatalogCutoverCandidate(
          [...bootstrap, first, successor],
          predecessorMarketId,
          successorMarketId,
          new Date(Number(1_924_995_419n) * 1_000).toISOString(),
          1_199n,
          authority,
        ),
      /still ordering-open/,
    );
  });

  it("fails liquidity close unless the signer owns positive LP after the onchain close", () => {
    const lpOwner = address("a");
    assert.doesNotThrow(() =>
      assertLiquidityClosePreconditions({
        operator: lpOwner,
        lpOwner,
        lpShares: 1n,
        latestTimestamp: 100n,
        tradingClosesAt: 100n,
      }),
    );
    assert.throws(
      () =>
        assertLiquidityClosePreconditions({
          operator: address("b"),
          lpOwner,
          lpShares: 1n,
          latestTimestamp: 100n,
          tradingClosesAt: 100n,
        }),
      /not the declared LP owner/,
    );
    assert.throws(
      () =>
        assertLiquidityClosePreconditions({
          operator: lpOwner,
          lpOwner,
          lpShares: 1n,
          latestTimestamp: 99n,
          tradingClosesAt: 100n,
        }),
      /before NoxLimit trading close/,
    );
    assert.throws(
      () =>
        assertLiquidityClosePreconditions({
          operator: lpOwner,
          lpOwner,
          lpShares: 0n,
          latestTimestamp: 100n,
          tradingClosesAt: 100n,
        }),
      /no FPMM LP shares/,
    );
  });

  it("binds every resolver field before an objective-resolution write", () => {
    const expected = {
      conditionalTokens: PINNED_CONDITIONAL_TOKENS.address,
      settlementAdapter: address("a"),
      questionId: hash("1"),
      conditionId: hash("2"),
      assetId: hash("3"),
      strikePriceWad: 65_000n * 10n ** 18n,
      tradingClosesAt: 100n,
      resolvesAt: 200n,
      maximumObservationDelay: 300n,
    } as const;
    assert.doesNotThrow(() => assertResolverIdentity(expected, expected));
    assert.throws(
      () => assertResolverIdentity({ ...expected, conditionId: hash("4") }, expected),
      /condition identity mismatch/,
    );
    assert.throws(
      () => assertResolverIdentity({ ...expected, resolvesAt: 201n }, expected),
      /resolution time identity mismatch/,
    );
  });

  it("preflights output parents and never treats access errors as absent files", async () => {
    const root = await mkdtemp(join(tmpdir(), "noxlimit-operator-"));
    try {
      const ready = join(root, "ready.json");
      await assertOutputReady(ready);
      await writeFile(ready, "{}\n", "utf8");
      await assert.rejects(assertOutputReady(ready), /refusing to overwrite/);

      const missingParent = join(root, "missing", "output.json");
      await assert.rejects(assertOutputReady(missingParent), /output parent is not accessible/);

      const ordinaryFile = join(root, "not-a-directory");
      await writeFile(ordinaryFile, "x", "utf8");
      await assert.rejects(
        assertOutputReady(join(ordinaryFile, "output.json")),
        /cannot inspect output path.*ENOTDIR/,
      );

      const directoryOutput = join(root, "directory-output");
      await mkdir(directoryOutput);
      await assert.rejects(assertOutputReady(directoryOutput), /refusing to overwrite/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
