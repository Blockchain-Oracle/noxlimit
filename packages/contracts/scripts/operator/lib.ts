import { constants as fsConstants } from "node:fs";
import { access, open, readFile, rm, stat } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  getAddress,
  isAddress,
  keccak256,
  toBytes,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";

export const ETHEREUM_SEPOLIA_CHAIN_ID = 11_155_111;
export const COLLATERAL_NAME = "NoxLimit Test USDC";
export const COLLATERAL_SYMBOL = "NLTUSDC";
export const COLLATERAL_DECIMALS = 6;

export const PINNED_CONDITIONAL_TOKENS = {
  address: getAddress("0x5f3198E99F74A9AaA82386e275395D57401C953D"),
  runtimeCodeHash:
    "0x3fabb10bb08ca7d52b1806ff2802b039fcfa203300c72752b78774d91ca5239d" as Hex,
  sourceCommit: "eeefca66eb46c800a9aaab88db2064a99026fde5",
} as const;

export const PINNED_FPMM_FACTORY = {
  address: getAddress("0xC3ab21B6339b4AAbA14915FC34794DbB12a8901C"),
  runtimeCodeHash:
    "0x3a936a16b5fc3c8cdc1b0e155a325696016f8feadfc63002ed22bf0382618213" as Hex,
  sourceCommit: "6814c0247c745680bb13298d4f0dd7f5b574d0db",
} as const;

const CHAINLINK_PROXY_RUNTIME_CODE_HASH =
  "0x9190afba2a699a9627d64ed68c7cc60e4005a8830b33183c4413b4e1a93b9ccd" as Hex;

// Sepolia BTC/USD and ETH/USD observations are commonly a little more than one hour apart.
// Four hours preserves a bounded outage policy while leaving enough room for ordinary cadence
// jitter and missed testnet reports. First-observation adjacency still prevents round cherry-pick.
export const MINIMUM_SEPOLIA_OBSERVATION_DELAY_SECONDS = 14_400n;

export const OFFICIAL_SEPOLIA_CHAINLINK_FEEDS = {
  "BTC/USD": {
    proxy: getAddress("0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43"),
    description: "BTC / USD",
    decimals: 8,
    runtimeCodeHash: CHAINLINK_PROXY_RUNTIME_CODE_HASH,
  },
  "ETH/USD": {
    proxy: getAddress("0x694AA1769357215DE4FAC081bf1f309aDC325306"),
    description: "ETH / USD",
    decimals: 8,
    runtimeCodeHash: CHAINLINK_PROXY_RUNTIME_CODE_HASH,
  },
} as const satisfies Record<SupportedAsset, {
  readonly proxy: Address;
  readonly description: string;
  readonly decimals: number;
  readonly runtimeCodeHash: Hex;
}>;

const UINT64_MAX = (1n << 64n) - 1n;
const COMMIT_SHA = /^[0-9a-f]{40}$/i;

export type SupportedAsset = "BTC/USD" | "ETH/USD";
export type MarketHorizon = "1h" | "4h" | "24h";

export const HORIZON_SECONDS = {
  "1h": 3_600n,
  "4h": 14_400n,
  "24h": 86_400n,
} as const satisfies Record<MarketHorizon, bigint>;

export interface StableMarketIdentity {
  readonly chainId: typeof ETHEREUM_SEPOLIA_CHAIN_ID;
  readonly asset: SupportedAsset;
  readonly horizon: MarketHorizon;
  readonly oracle: {
    readonly source: "CHAINLINK";
    readonly proxy: Address;
    readonly assetId: Hex;
  };
  readonly strikePriceWad: string;
  readonly tradingClosesAt: string;
  readonly resolvesAt: string;
  readonly collateral: Address;
  readonly resolverPolicy: {
    readonly policyVersion: string;
    readonly maximumObservationDelaySeconds: string;
    readonly comparison: ">=";
  };
}

export interface BundleConfig {
  readonly asset: SupportedAsset;
  readonly horizon: MarketHorizon;
  readonly question: string;
  readonly version: string;
  readonly conditionalTokens: Address;
  readonly fpmmFactory: Address;
  readonly chainlinkProxy: Address;
  readonly worker: Address;
  readonly existingCollateral?: Address;
  readonly existingFundingTreasury?: Address;
  readonly strikePriceWad: bigint;
  readonly startsAt: bigint;
  readonly tradingClosesAt: bigint;
  readonly resolvesAt: bigint;
  readonly maximumObservationDelaySeconds: bigint;
  readonly feeBps: number;
  readonly seedAtoms: bigint;
  readonly evaluationTimeoutSeconds: bigint;
  readonly publicationTimeoutSeconds: bigint;
  readonly minimumEvaluationIntervalSeconds: bigint;
  readonly maximumEvaluations: number;
  readonly runtimePolicy: {
    readonly oracleMaxAgeSeconds: number;
    readonly poolQuoteMaxAgeSeconds: number;
    readonly indexerMaxLagBlocks: number;
    readonly evaluatorHeartbeatMaxAgeSeconds: number;
    readonly lowLiquidityDepthAtoms: bigint;
  };
  readonly funding: {
    readonly nativeTargetWei: bigint;
    readonly collateralTargetAtoms: bigint;
    readonly nativePerClaimCapWei: bigint;
    readonly collateralPerClaimCapAtoms: bigint;
    readonly nativeLifetimeCapWei: bigint;
    readonly collateralLifetimeCapAtoms: bigint;
    readonly cooldownSeconds: bigint;
    readonly initialNativeWei: bigint;
    readonly initialCollateralAtoms: bigint;
  };
  readonly provenance: {
    readonly conditionalTokensCommit: string;
    readonly fpmmCommit: string;
    readonly noxContractsVersion: string;
    readonly sourceManifestRef: string;
  };
  readonly evidenceRef: string;
  readonly catalogHistoryPaths: readonly string[];
  readonly catalogOutputPath: string;
  readonly evidenceOutputPath: string;
  readonly confirmations: number;
}

export class OperatorConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperatorConfigurationError";
  }
}

function formatStrikeUsd(strikePriceWad: bigint): string {
  const wad = 10n ** 18n;
  const whole = strikePriceWad / wad;
  const fraction = strikePriceWad % wad;
  const groupedWhole = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fraction === 0n) return groupedWhole;
  const trimmedFraction = fraction.toString().padStart(18, "0").replace(/0+$/, "");
  return `${groupedWhole}.${trimmedFraction}`;
}

export function canonicalMarketQuestion(
  asset: SupportedAsset,
  strikePriceWad: bigint,
  resolvesAt: bigint,
): string {
  const resolvesAtMilliseconds = resolvesAt * 1_000n;
  if (resolvesAtMilliseconds > 8_640_000_000_000_000n) {
    throw new OperatorConfigurationError(
      "NOXLIMIT_RESOLVES_AT cannot be represented as an exact UTC market question",
    );
  }
  const resolution = new Date(Number(resolvesAtMilliseconds))
    .toISOString()
    .replace(".000Z", "Z");
  return `Will ${asset} be at or above $${formatStrikeUsd(strikePriceWad)} at ${resolution}?`;
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new OperatorConfigurationError(`${key} is required`);
  return value;
}

function boundedText(env: NodeJS.ProcessEnv, key: string, maximum: number): string {
  const value = required(env, key);
  if (value.length > maximum) {
    throw new OperatorConfigurationError(`${key} must be at most ${maximum} characters`);
  }
  return value;
}

function positiveBigInt(env: NodeJS.ProcessEnv, key: string): bigint {
  const value = required(env, key);
  if (!/^[0-9]+$/.test(value)) {
    throw new OperatorConfigurationError(`${key} must be an unsigned decimal integer`);
  }
  const parsed = BigInt(value);
  if (parsed === 0n) throw new OperatorConfigurationError(`${key} must be greater than zero`);
  return parsed;
}

function boundedInteger(
  env: NodeJS.ProcessEnv,
  key: string,
  minimum: number,
  maximum: number,
): number {
  const value = required(env, key);
  if (!/^[0-9]+$/.test(value)) {
    throw new OperatorConfigurationError(`${key} must be an unsigned decimal integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new OperatorConfigurationError(`${key} must be between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function address(env: NodeJS.ProcessEnv, key: string): Address {
  const value = required(env, key);
  if (!isAddress(value, { strict: true })) {
    throw new OperatorConfigurationError(`${key} must be a checksummed or lowercase EVM address`);
  }
  const parsed = getAddress(value);
  if (parsed === zeroAddress) throw new OperatorConfigurationError(`${key} cannot be the zero address`);
  return parsed;
}

function optionalAddress(env: NodeJS.ProcessEnv, key: string): Address | undefined {
  if (!env[key]?.trim()) return undefined;
  return address(env, key);
}

export function explicitPath(env: NodeJS.ProcessEnv, key: string): string {
  const value = required(env, key);
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
}

export function historyPaths(env: NodeJS.ProcessEnv): readonly string[] {
  const raw = required(env, "NOXLIMIT_CATALOG_HISTORY_PATHS_JSON");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new OperatorConfigurationError(
      "NOXLIMIT_CATALOG_HISTORY_PATHS_JSON must be a JSON array of manifest paths",
    );
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new OperatorConfigurationError(
      "NOXLIMIT_CATALOG_HISTORY_PATHS_JSON must contain at least one non-empty path",
    );
  }
  return parsed.map((item) => {
    const value = (item as string).trim();
    return isAbsolute(value) ? value : resolve(process.cwd(), value);
  });
}

export function parseBundleConfig(
  env: NodeJS.ProcessEnv,
  nowSeconds = BigInt(Math.floor(Date.now() / 1_000)),
): BundleConfig {
  const assetValue = required(env, "NOXLIMIT_ASSET");
  if (assetValue !== "BTC/USD" && assetValue !== "ETH/USD") {
    throw new OperatorConfigurationError(
      "NOXLIMIT_ASSET must be BTC/USD or ETH/USD; SOL/USD remains gated on the verified Pyth path",
    );
  }
  const horizonValue = required(env, "NOXLIMIT_HORIZON");
  if (horizonValue !== "1h" && horizonValue !== "4h" && horizonValue !== "24h") {
    throw new OperatorConfigurationError("NOXLIMIT_HORIZON must be 1h, 4h, or 24h");
  }

  const startsAt = positiveBigInt(env, "NOXLIMIT_STARTS_AT");
  const tradingClosesAt = positiveBigInt(env, "NOXLIMIT_TRADING_CLOSES_AT");
  const resolvesAt = positiveBigInt(env, "NOXLIMIT_RESOLVES_AT");
  const strikePriceWad = positiveBigInt(env, "NOXLIMIT_STRIKE_PRICE_WAD");
  if (!(startsAt < tradingClosesAt && tradingClosesAt < resolvesAt)) {
    throw new OperatorConfigurationError(
      "market times must satisfy startsAt < tradingClosesAt < resolvesAt",
    );
  }
  if (tradingClosesAt <= nowSeconds) {
    throw new OperatorConfigurationError("NOXLIMIT_TRADING_CLOSES_AT must still be in the future");
  }
  if (resolvesAt > UINT64_MAX) {
    throw new OperatorConfigurationError("NOXLIMIT_RESOLVES_AT exceeds uint64");
  }
  if (resolvesAt - startsAt !== HORIZON_SECONDS[horizonValue]) {
    throw new OperatorConfigurationError(
      `market window must equal the declared ${horizonValue} horizon (${HORIZON_SECONDS[horizonValue]} seconds)`,
    );
  }
  const question = boundedText(env, "NOXLIMIT_QUESTION", 512);
  const expectedQuestion = canonicalMarketQuestion(assetValue, strikePriceWad, resolvesAt);
  if (question !== expectedQuestion) {
    throw new OperatorConfigurationError(
      `NOXLIMIT_QUESTION must exactly match the resolver-bound canonical question: ${expectedQuestion}`,
    );
  }

  const nativeTargetWei = positiveBigInt(env, "NOXLIMIT_FUNDING_NATIVE_TARGET_WEI");
  const collateralTargetAtoms = positiveBigInt(env, "NOXLIMIT_FUNDING_COLLATERAL_TARGET_ATOMS");
  const nativePerClaimCapWei = positiveBigInt(env, "NOXLIMIT_FUNDING_NATIVE_PER_CLAIM_WEI");
  const collateralPerClaimCapAtoms = positiveBigInt(
    env,
    "NOXLIMIT_FUNDING_COLLATERAL_PER_CLAIM_ATOMS",
  );
  const nativeLifetimeCapWei = positiveBigInt(env, "NOXLIMIT_FUNDING_NATIVE_LIFETIME_WEI");
  const collateralLifetimeCapAtoms = positiveBigInt(
    env,
    "NOXLIMIT_FUNDING_COLLATERAL_LIFETIME_ATOMS",
  );
  const initialNativeWei = positiveBigInt(env, "NOXLIMIT_FUNDING_INITIAL_NATIVE_WEI");
  const initialCollateralAtoms = positiveBigInt(
    env,
    "NOXLIMIT_FUNDING_INITIAL_COLLATERAL_ATOMS",
  );
  if (nativeLifetimeCapWei < nativePerClaimCapWei) {
    throw new OperatorConfigurationError("native lifetime cap cannot be below its per-claim cap");
  }
  if (collateralLifetimeCapAtoms < collateralPerClaimCapAtoms) {
    throw new OperatorConfigurationError("collateral lifetime cap cannot be below its per-claim cap");
  }
  if (nativePerClaimCapWei < nativeTargetWei) {
    throw new OperatorConfigurationError(
      "native per-claim cap must reach the fresh-wallet target in one explicit request",
    );
  }
  if (collateralPerClaimCapAtoms < collateralTargetAtoms) {
    throw new OperatorConfigurationError(
      "collateral per-claim cap must reach the fresh-wallet target in one explicit request",
    );
  }
  if (initialNativeWei < nativePerClaimCapWei) {
    throw new OperatorConfigurationError("initial native treasury funding must cover one per-claim cap");
  }
  if (initialCollateralAtoms < collateralPerClaimCapAtoms) {
    throw new OperatorConfigurationError(
      "initial collateral treasury funding must cover one per-claim cap",
    );
  }

  const conditionalTokensCommit = required(env, "NOXLIMIT_CTF_COMMIT");
  const fpmmCommit = required(env, "NOXLIMIT_FPMM_COMMIT");
  if (!COMMIT_SHA.test(conditionalTokensCommit)) {
    throw new OperatorConfigurationError("NOXLIMIT_CTF_COMMIT must be an exact 40-hex commit SHA");
  }
  if (!COMMIT_SHA.test(fpmmCommit)) {
    throw new OperatorConfigurationError("NOXLIMIT_FPMM_COMMIT must be an exact 40-hex commit SHA");
  }

  const conditionalTokens = address(env, "NOXLIMIT_CONDITIONAL_TOKENS");
  const fpmmFactory = address(env, "NOXLIMIT_FPMM_FACTORY");
  const chainlinkProxy = address(env, "NOXLIMIT_CHAINLINK_PROXY");
  const officialFeed = OFFICIAL_SEPOLIA_CHAINLINK_FEEDS[assetValue];
  if (conditionalTokens !== PINNED_CONDITIONAL_TOKENS.address) {
    throw new OperatorConfigurationError(
      `NOXLIMIT_CONDITIONAL_TOKENS must use the pinned Sepolia deployment ${PINNED_CONDITIONAL_TOKENS.address}`,
    );
  }
  if (fpmmFactory !== PINNED_FPMM_FACTORY.address) {
    throw new OperatorConfigurationError(
      `NOXLIMIT_FPMM_FACTORY must use the pinned Sepolia deployment ${PINNED_FPMM_FACTORY.address}`,
    );
  }
  if (chainlinkProxy !== officialFeed.proxy) {
    throw new OperatorConfigurationError(
      `NOXLIMIT_CHAINLINK_PROXY must be the official Ethereum Sepolia ${assetValue} proxy ${officialFeed.proxy}`,
    );
  }
  if (conditionalTokensCommit.toLowerCase() !== PINNED_CONDITIONAL_TOKENS.sourceCommit) {
    throw new OperatorConfigurationError(
      `NOXLIMIT_CTF_COMMIT must equal the audited source pin ${PINNED_CONDITIONAL_TOKENS.sourceCommit}`,
    );
  }
  if (fpmmCommit.toLowerCase() !== PINNED_FPMM_FACTORY.sourceCommit) {
    throw new OperatorConfigurationError(
      `NOXLIMIT_FPMM_COMMIT must equal the audited source pin ${PINNED_FPMM_FACTORY.sourceCommit}`,
    );
  }

  const config: BundleConfig = {
    asset: assetValue,
    horizon: horizonValue,
    question,
    version: boundedText(env, "NOXLIMIT_MARKET_VERSION", 64),
    conditionalTokens,
    fpmmFactory,
    chainlinkProxy,
    worker: address(env, "NOXLIMIT_WORKER"),
    existingCollateral: optionalAddress(env, "NOXLIMIT_COLLATERAL_ADDRESS"),
    existingFundingTreasury: optionalAddress(env, "NOXLIMIT_FUNDING_TREASURY_ADDRESS"),
    strikePriceWad,
    startsAt,
    tradingClosesAt,
    resolvesAt,
    maximumObservationDelaySeconds: positiveBigInt(
      env,
      "NOXLIMIT_MAXIMUM_OBSERVATION_DELAY_SECONDS",
    ),
    feeBps: boundedInteger(env, "NOXLIMIT_FPMM_FEE_BPS", 1, 9_999),
    seedAtoms: positiveBigInt(env, "NOXLIMIT_POOL_SEED_ATOMS"),
    evaluationTimeoutSeconds: positiveBigInt(env, "NOXLIMIT_EVALUATION_TIMEOUT_SECONDS"),
    publicationTimeoutSeconds: positiveBigInt(env, "NOXLIMIT_PUBLICATION_TIMEOUT_SECONDS"),
    minimumEvaluationIntervalSeconds: positiveBigInt(
      env,
      "NOXLIMIT_MINIMUM_EVALUATION_INTERVAL_SECONDS",
    ),
    maximumEvaluations: boundedInteger(env, "NOXLIMIT_MAXIMUM_EVALUATIONS", 1, 255),
    runtimePolicy: {
      oracleMaxAgeSeconds: boundedInteger(env, "NOXLIMIT_ORACLE_MAX_AGE_SECONDS", 1, 86_400),
      poolQuoteMaxAgeSeconds: boundedInteger(
        env,
        "NOXLIMIT_POOL_QUOTE_MAX_AGE_SECONDS",
        1,
        3_600,
      ),
      indexerMaxLagBlocks: boundedInteger(env, "NOXLIMIT_INDEXER_MAX_LAG_BLOCKS", 1, 1_000),
      evaluatorHeartbeatMaxAgeSeconds: boundedInteger(
        env,
        "NOXLIMIT_EVALUATOR_HEARTBEAT_MAX_AGE_SECONDS",
        1,
        3_600,
      ),
      lowLiquidityDepthAtoms: positiveBigInt(env, "NOXLIMIT_LOW_LIQUIDITY_DEPTH_ATOMS"),
    },
    funding: {
      nativeTargetWei,
      collateralTargetAtoms,
      nativePerClaimCapWei,
      collateralPerClaimCapAtoms,
      nativeLifetimeCapWei,
      collateralLifetimeCapAtoms,
      cooldownSeconds: positiveBigInt(env, "NOXLIMIT_FUNDING_COOLDOWN_SECONDS"),
      initialNativeWei,
      initialCollateralAtoms,
    },
    provenance: {
      conditionalTokensCommit: conditionalTokensCommit.toLowerCase(),
      fpmmCommit: fpmmCommit.toLowerCase(),
      noxContractsVersion: boundedText(env, "NOXLIMIT_NOX_CONTRACTS_VERSION", 64),
      sourceManifestRef: boundedText(env, "NOXLIMIT_SOURCE_MANIFEST_REF", 512),
    },
    evidenceRef: boundedText(env, "NOXLIMIT_EVIDENCE_REF", 512),
    catalogHistoryPaths: historyPaths(env),
    catalogOutputPath: explicitPath(env, "NOXLIMIT_CATALOG_OUTPUT_PATH"),
    evidenceOutputPath: explicitPath(env, "NOXLIMIT_EVIDENCE_OUTPUT_PATH"),
    confirmations: boundedInteger(env, "NOXLIMIT_CONFIRMATIONS", 1, 100),
  };

  if (config.maximumObservationDelaySeconds > UINT64_MAX) {
    throw new OperatorConfigurationError("maximum observation delay exceeds uint64");
  }
  if (
    config.maximumObservationDelaySeconds < MINIMUM_SEPOLIA_OBSERVATION_DELAY_SECONDS
  ) {
    throw new OperatorConfigurationError(
      `maximum observation delay must be at least ${MINIMUM_SEPOLIA_OBSERVATION_DELAY_SECONDS} seconds for the official Sepolia feeds`,
    );
  }
  for (const [name, value] of [
    ["evaluation timeout", config.evaluationTimeoutSeconds],
    ["publication timeout", config.publicationTimeoutSeconds],
    ["minimum evaluation interval", config.minimumEvaluationIntervalSeconds],
    ["funding cooldown", config.funding.cooldownSeconds],
  ] as const) {
    if (value > UINT64_MAX) throw new OperatorConfigurationError(`${name} exceeds uint64`);
  }
  if (config.strikePriceWad > (1n << 255n) - 1n) {
    throw new OperatorConfigurationError("strike price exceeds positive int256");
  }
  if ((config.existingFundingTreasury === undefined) !== (config.existingCollateral === undefined)) {
    throw new OperatorConfigurationError(
      "existing collateral and its shared funding treasury must be reused as one verified pair",
    );
  }
  return config;
}

export function assetIdOf(asset: SupportedAsset): Hex {
  return keccak256(toBytes(asset));
}

export function officialChainlinkFeed(asset: SupportedAsset) {
  return OFFICIAL_SEPOLIA_CHAINLINK_FEEDS[asset];
}

export function collateralMintShortfall(input: {
  readonly operator: Address;
  readonly issuer: Address;
  readonly operatorBalance: bigint;
  readonly requiredAtoms: bigint;
}): bigint {
  if (getAddress(input.issuer) !== getAddress(input.operator)) {
    throw new OperatorConfigurationError(
      `shared NoxLimit Test USDC issuer ${input.issuer} is not the active operator ${input.operator}`,
    );
  }
  return input.operatorBalance < input.requiredAtoms
    ? input.requiredAtoms - input.operatorBalance
    : 0n;
}

export interface LiquidityClosePreconditions {
  readonly operator: Address;
  readonly lpOwner: Address;
  readonly latestTimestamp: bigint;
  readonly tradingClosesAt: bigint;
}

export function assertLiquidityClosePreconditions(
  input: LiquidityClosePreconditions,
): void {
  if (getAddress(input.operator) !== getAddress(input.lpOwner)) {
    throw new OperatorConfigurationError(
      `active signer ${input.operator} is not the declared LP owner ${input.lpOwner}`,
    );
  }
  if (input.latestTimestamp < input.tradingClosesAt) {
    throw new OperatorConfigurationError(
      `builder liquidity cannot close before NoxLimit trading close ${input.tradingClosesAt}`,
    );
  }
}

export interface LiquidityCloseState {
  readonly lpShares: bigint;
  readonly yesBalance: bigint;
  readonly noBalance: bigint;
  readonly payoutDenominator: bigint;
}

export interface LiquidityClosePlan {
  readonly removeFunding: boolean;
  readonly redeemPositions: boolean;
  readonly unresolvedPositionsRemain: boolean;
  readonly alreadyClosed: boolean;
}

/**
 * Plans one restart-safe liquidity-close step from current onchain balances.
 *
 * Removing FPMM funding and redeeming resolved outcome positions are deliberately independent:
 * the first pass commonly happens before resolution, while a later pass must still redeem after
 * the LP token balance has reached zero. A fully empty resolved state is accepted so a process
 * that stopped after its final receipt can publish honest state evidence without another write.
 */
export function planLiquidityClose(input: LiquidityCloseState): LiquidityClosePlan {
  const hasOutcomePositions = input.yesBalance > 0n || input.noBalance > 0n;
  if (input.lpShares > 0n) {
    return {
      removeFunding: true,
      redeemPositions: false,
      unresolvedPositionsRemain: false,
      alreadyClosed: false,
    };
  }
  if (hasOutcomePositions) {
    return {
      removeFunding: false,
      redeemPositions: input.payoutDenominator > 0n,
      unresolvedPositionsRemain: input.payoutDenominator === 0n,
      alreadyClosed: false,
    };
  }
  if (input.payoutDenominator > 0n) {
    return {
      removeFunding: false,
      redeemPositions: false,
      unresolvedPositionsRemain: false,
      alreadyClosed: true,
    };
  }
  throw new OperatorConfigurationError(
    "declared LP owner has no FPMM LP shares or outcome positions to close",
  );
}

export function rethrowSanitizedOperatorFailure(error: unknown, message: string): never {
  if (error instanceof OperatorConfigurationError) throw error;
  throw new OperatorConfigurationError(message);
}

export interface ResolverIdentity {
  readonly conditionalTokens: Address;
  readonly settlementAdapter: Address;
  readonly questionId: Hex;
  readonly conditionId: Hex;
  readonly assetId: Hex;
  readonly strikePriceWad: bigint;
  readonly tradingClosesAt: bigint;
  readonly resolvesAt: bigint;
  readonly maximumObservationDelay: bigint;
}

export function assertResolverIdentity(
  actual: ResolverIdentity,
  expected: ResolverIdentity,
): void {
  for (const [label, actualAddress, expectedAddress] of [
    ["Conditional Tokens", actual.conditionalTokens, expected.conditionalTokens],
    ["settlement adapter", actual.settlementAdapter, expected.settlementAdapter],
  ] as const) {
    if (getAddress(actualAddress) !== getAddress(expectedAddress)) {
      throw new OperatorConfigurationError(
        `resolver ${label} identity mismatch: ${actualAddress} != ${expectedAddress}`,
      );
    }
  }
  for (const [label, actualHex, expectedHex] of [
    ["question", actual.questionId, expected.questionId],
    ["condition", actual.conditionId, expected.conditionId],
    ["asset", actual.assetId, expected.assetId],
  ] as const) {
    if (actualHex.toLowerCase() !== expectedHex.toLowerCase()) {
      throw new OperatorConfigurationError(
        `resolver ${label} identity mismatch: ${actualHex} != ${expectedHex}`,
      );
    }
  }
  for (const [label, actualValue, expectedValue] of [
    ["strike", actual.strikePriceWad, expected.strikePriceWad],
    ["trading close", actual.tradingClosesAt, expected.tradingClosesAt],
    ["resolution time", actual.resolvesAt, expected.resolvesAt],
    [
      "maximum observation delay",
      actual.maximumObservationDelay,
      expected.maximumObservationDelay,
    ],
  ] as const) {
    if (actualValue !== expectedValue) {
      throw new OperatorConfigurationError(
        `resolver ${label} identity mismatch: ${actualValue} != ${expectedValue}`,
      );
    }
  }
}

function serializeCanonical(value: unknown, path: string): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item, index) => serializeCanonical(item, `${path}[${index}]`)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => {
        const item = record[key];
        if (item === undefined) throw new TypeError(`${path}.${key} is undefined`);
        return `${JSON.stringify(key)}:${serializeCanonical(item, `${path}.${key}`)}`;
      })
      .join(",")}}`;
  }
  throw new TypeError(`${path} contains unsupported ${typeof value}`);
}

export function canonicalJson(value: unknown): string {
  return serializeCanonical(value, "$");
}

export function deploymentPlanId(config: BundleConfig, operator: Address): Hex {
  return keccak256(
    toBytes(
      canonicalJson({
        domain: "noxlimit:sepolia-bundle-deployment-plan:v1",
        chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
        operator: getAddress(operator),
        market: {
          asset: config.asset,
          horizon: config.horizon,
          question: config.question,
          version: config.version,
          strikePriceWad: config.strikePriceWad.toString(),
          startsAt: config.startsAt.toString(),
          tradingClosesAt: config.tradingClosesAt.toString(),
          resolvesAt: config.resolvesAt.toString(),
          maximumObservationDelaySeconds: config.maximumObservationDelaySeconds.toString(),
        },
        contracts: {
          conditionalTokens: config.conditionalTokens,
          fpmmFactory: config.fpmmFactory,
          chainlinkProxy: config.chainlinkProxy,
          worker: config.worker,
          existingCollateral: config.existingCollateral ?? null,
          existingFundingTreasury: config.existingFundingTreasury ?? null,
        },
        poolAndMonitoring: {
          feeBps: config.feeBps,
          seedAtoms: config.seedAtoms.toString(),
          evaluationTimeoutSeconds: config.evaluationTimeoutSeconds.toString(),
          publicationTimeoutSeconds: config.publicationTimeoutSeconds.toString(),
          minimumEvaluationIntervalSeconds: config.minimumEvaluationIntervalSeconds.toString(),
          maximumEvaluations: config.maximumEvaluations,
        },
        runtimePolicy: {
          ...config.runtimePolicy,
          lowLiquidityDepthAtoms: config.runtimePolicy.lowLiquidityDepthAtoms.toString(),
        },
        funding: {
          nativeTargetWei: config.funding.nativeTargetWei.toString(),
          collateralTargetAtoms: config.funding.collateralTargetAtoms.toString(),
          nativePerClaimCapWei: config.funding.nativePerClaimCapWei.toString(),
          collateralPerClaimCapAtoms: config.funding.collateralPerClaimCapAtoms.toString(),
          nativeLifetimeCapWei: config.funding.nativeLifetimeCapWei.toString(),
          collateralLifetimeCapAtoms: config.funding.collateralLifetimeCapAtoms.toString(),
          cooldownSeconds: config.funding.cooldownSeconds.toString(),
          initialNativeWei: config.funding.initialNativeWei.toString(),
          initialCollateralAtoms: config.funding.initialCollateralAtoms.toString(),
        },
        provenance: config.provenance,
        evidenceRef: config.evidenceRef,
        catalogHistoryPaths: config.catalogHistoryPaths,
        outputs: {
          catalog: config.catalogOutputPath,
          evidence: config.evidenceOutputPath,
        },
        confirmations: config.confirmations,
      }),
    ),
  );
}

export function deploymentJournalPath(evidenceOutputPath: string): string {
  return `${evidenceOutputPath}.journal.json`;
}

export function stableIdentityOf(config: BundleConfig, collateral: Address): StableMarketIdentity {
  return {
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    asset: config.asset,
    horizon: config.horizon,
    oracle: {
      source: "CHAINLINK",
      proxy: config.chainlinkProxy,
      assetId: assetIdOf(config.asset),
    },
    strikePriceWad: config.strikePriceWad.toString(),
    tradingClosesAt: config.tradingClosesAt.toString(),
    resolvesAt: config.resolvesAt.toString(),
    collateral,
    resolverPolicy: {
      policyVersion: "chainlink-first-observation-v1",
      maximumObservationDelaySeconds: config.maximumObservationDelaySeconds.toString(),
      comparison: ">=",
    },
  };
}

export function deriveIdentityId(
  domain: "market" | "question",
  identity: StableMarketIdentity,
): Hex {
  return keccak256(
    toBytes(
      canonicalJson({
        domain: `noxlimit:${domain}:v1`,
        identity,
      }),
    ),
  );
}

export function operatorPlan(config: BundleConfig): Record<string, unknown> {
  return {
    mode: "PLAN_ONLY",
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    market: {
      asset: config.asset,
      horizon: config.horizon,
      question: config.question,
      startsAt: config.startsAt.toString(),
      tradingClosesAt: config.tradingClosesAt.toString(),
      resolvesAt: config.resolvesAt.toString(),
      strikePriceWad: config.strikePriceWad.toString(),
    },
    existingContracts: {
      conditionalTokens: config.conditionalTokens,
      fpmmFactory: config.fpmmFactory,
      chainlinkProxy: config.chainlinkProxy,
      collateral: config.existingCollateral ?? "DEPLOY_NEW_NLUSDC",
      fundingTreasury: config.existingFundingTreasury ?? "DEPLOY_AND_FUND_SHARED_TREASURY",
      worker: config.worker,
    },
    writes: [
      ...(config.existingCollateral === undefined ? ["deploy NoxLimit Test USDC"] : []),
      "create or resume a plan-bound deployment journal before the first transaction",
      "deploy Chainlink settlement adapter",
      "deploy resolver before preparing its condition",
      "prepare binary Conditional Tokens condition",
      "create and seed unchanged FPMM",
      "deploy market-bound NoxLimitOrderBook",
      config.existingFundingTreasury
        ? "verify issuer ownership, mint only the collateral shortfall, and top up the shared TestnetFundingTreasury to the explicit minimums"
        : "deploy and explicitly fund the shared TestnetFundingTreasury",
      "verify code, immutable bindings, positions, and seeded liquidity",
      "write catalog revision candidate and separate evidence to new explicit paths",
    ],
    outputs: {
      catalog: config.catalogOutputPath,
      evidence: config.evidenceOutputPath,
      journal: deploymentJournalPath(config.evidenceOutputPath),
    },
    catalogHistory: config.catalogHistoryPaths,
    safety: {
      defaultCommandWrites: false,
      deployRequiresNetwork: "sepoliaOperator",
      deployRequiresConfirmation: "NOXLIMIT_OPERATOR_CONFIRM=DEPLOY_SEPOLIA_BUNDLE",
      outputFilesMustNotExist: true,
      interruptedWritesResumeFromJournal: true,
      unresolvedIntentRequiresExplicitAdoptOrRetry: true,
      secretsIncluded: false,
    },
  };
}

export interface CatalogAuthority {
  readonly hashCatalogManifest: (input: unknown) => Hex;
  readonly validateCatalogManifest: (input: unknown) => CatalogManifestLike;
  readonly validateCatalogChain: (inputs: readonly unknown[]) => readonly CatalogManifestLike[];
}

export interface CatalogManifestLike {
  readonly schemaVersion: 1;
  readonly chainId: typeof ETHEREUM_SEPOLIA_CHAIN_ID;
  readonly revision: string;
  readonly previousRevisionHash: Hex | null;
  readonly effectiveAt: string;
  readonly effectiveBlock: string;
  readonly markets: readonly Record<string, unknown>[];
  readonly routing: readonly CatalogRouteLike[];
  readonly catalogRevision: Hex;
}

export interface CatalogRouteLike {
  readonly marketId: Hex;
  readonly activation: "ACTIVE" | "SUCCESSOR" | "RETIRED";
  readonly opensAt?: string;
  readonly opensAtBlock?: string;
}

export interface CatalogCutoverPair {
  readonly predecessorMarketId: Hex;
  readonly successorMarketId: Hex;
}

async function workspaceRoot(): Promise<string> {
  let current = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    try {
      await access(resolve(current, "pnpm-workspace.yaml"));
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) {
        throw new OperatorConfigurationError("could not locate the NoxLimit workspace root");
      }
      current = parent;
    }
  }
}

export async function loadCatalogAuthority(): Promise<CatalogAuthority> {
  const root = await workspaceRoot();
  const modulePath = resolve(root, "packages/catalog/dist/src/index.js");
  try {
    await access(modulePath);
  } catch {
    throw new OperatorConfigurationError(
      "catalog authority is not built; run `pnpm --filter @noxlimit/catalog build` first",
    );
  }
  const loaded: unknown = await import(pathToFileURL(modulePath).href);
  const candidate = loaded as Partial<CatalogAuthority>;
  if (
    typeof candidate.hashCatalogManifest !== "function" ||
    typeof candidate.validateCatalogManifest !== "function" ||
    typeof candidate.validateCatalogChain !== "function"
  ) {
    throw new OperatorConfigurationError("built catalog package does not expose the required authority");
  }
  return candidate as CatalogAuthority;
}

export async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

export async function loadCatalogHistory(
  paths: readonly string[],
  authority: CatalogAuthority,
): Promise<readonly CatalogManifestLike[]> {
  const inputs = await Promise.all(paths.map(readJson));
  return authority.validateCatalogChain(inputs);
}

function recordIdentity(record: Record<string, unknown>): { asset: string; horizon: string } {
  const identity = record.identity;
  if (!identity || typeof identity !== "object") {
    throw new OperatorConfigurationError("catalog record lacks a stable identity");
  }
  const value = identity as Record<string, unknown>;
  if (typeof value.asset !== "string" || typeof value.horizon !== "string") {
    throw new OperatorConfigurationError("catalog record has an invalid stable identity");
  }
  return { asset: value.asset, horizon: value.horizon };
}

export function buildCatalogCandidate(
  history: readonly CatalogManifestLike[],
  marketRecord: Record<string, unknown>,
  effectiveAt: string,
  effectiveBlock: bigint,
  authority: CatalogAuthority,
): CatalogManifestLike {
  const previous = history.at(-1);
  if (!previous) throw new OperatorConfigurationError("catalog history cannot be empty");
  if (previous.chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) {
    throw new OperatorConfigurationError("catalog history is not Ethereum Sepolia");
  }
  const marketId = marketRecord.marketId;
  if (typeof marketId !== "string" || !/^0x[0-9a-f]{64}$/i.test(marketId)) {
    throw new OperatorConfigurationError("market record has no valid marketId");
  }
  if (
    previous.markets.some(
      (record) => typeof record.marketId === "string" && record.marketId.toLowerCase() === marketId.toLowerCase(),
    )
  ) {
    throw new OperatorConfigurationError("catalog already contains this deterministic marketId");
  }

  const identity = recordIdentity(marketRecord);
  assertFutureSepoliaResolverPolicy(marketRecord, `${identity.asset}:${identity.horizon}`);
  const routeByMarket = new Map(
    previous.routing.map((route) => [route.marketId.toLowerCase(), route] as const),
  );
  const hasActiveAxis = previous.markets.some((record) => {
    const candidateIdentity = recordIdentity(record);
    const candidateMarketId = record.marketId;
    return (
      candidateIdentity.asset === identity.asset &&
      candidateIdentity.horizon === identity.horizon &&
      typeof candidateMarketId === "string" &&
      routeByMarket.get(candidateMarketId.toLowerCase())?.activation === "ACTIVE"
    );
  });
  const route: CatalogRouteLike = hasActiveAxis
    ? { marketId: marketId as Hex, activation: "SUCCESSOR" }
    : {
        marketId: marketId as Hex,
        activation: "ACTIVE",
        opensAt: effectiveAt,
        opensAtBlock: effectiveBlock.toString(),
      };
  const payload = {
    schemaVersion: 1 as const,
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    revision: (BigInt(previous.revision) + 1n).toString(),
    previousRevisionHash: previous.catalogRevision,
    effectiveAt,
    effectiveBlock: effectiveBlock.toString(),
    markets: [...previous.markets, marketRecord],
    routing: [...previous.routing, route],
  };
  const candidate = authority.validateCatalogManifest({
    ...payload,
    catalogRevision: authority.hashCatalogManifest(payload),
  });
  authority.validateCatalogChain([...history, candidate]);
  return candidate;
}

function marketById(
  manifest: CatalogManifestLike,
  marketId: Hex,
): Record<string, unknown> {
  const record = manifest.markets.find(
    (candidate) =>
      typeof candidate.marketId === "string" &&
      candidate.marketId.toLowerCase() === marketId.toLowerCase(),
  );
  if (!record) throw new OperatorConfigurationError(`catalog has no market ${marketId}`);
  return record;
}

function routeById(manifest: CatalogManifestLike, marketId: Hex): CatalogRouteLike {
  const route = manifest.routing.find(
    (candidate) => candidate.marketId.toLowerCase() === marketId.toLowerCase(),
  );
  if (!route) throw new OperatorConfigurationError(`catalog has no route for ${marketId}`);
  return route;
}

function recordObject(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = record[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new OperatorConfigurationError(`catalog market ${String(record.marketId)} lacks ${key}`);
  }
  return value as Record<string, unknown>;
}

function positiveRecordBigInt(
  record: Record<string, unknown>,
  key: string,
  label: string,
): bigint {
  const value = record[key];
  if (typeof value !== "string" || !/^[0-9]+$/.test(value) || BigInt(value) === 0n) {
    throw new OperatorConfigurationError(`${label} must be a positive decimal integer`);
  }
  return BigInt(value);
}

function assertFutureSepoliaResolverPolicy(
  record: Record<string, unknown>,
  label: string,
): void {
  const identity = recordObject(record, "identity");
  const resolverPolicy = recordObject(identity, "resolverPolicy");
  const delay = positiveRecordBigInt(
    resolverPolicy,
    "maximumObservationDelaySeconds",
    `${label} maximum observation delay`,
  );
  if (delay < MINIMUM_SEPOLIA_OBSERVATION_DELAY_SECONDS) {
    throw new OperatorConfigurationError(
      `${label}: successor maximum observation delay must be at least ${MINIMUM_SEPOLIA_OBSERVATION_DELAY_SECONDS} seconds`,
    );
  }
}

export function buildCatalogCutoverCandidate(
  history: readonly CatalogManifestLike[],
  predecessorMarketId: Hex,
  successorMarketId: Hex,
  effectiveAt: string,
  effectiveBlock: bigint,
  authority: CatalogAuthority,
): CatalogManifestLike {
  const previous = history.at(-1);
  if (!previous) throw new OperatorConfigurationError("catalog history cannot be empty");
  if (predecessorMarketId.toLowerCase() === successorMarketId.toLowerCase()) {
    throw new OperatorConfigurationError("predecessor and successor must be different markets");
  }
  const effectiveMilliseconds = Date.parse(effectiveAt);
  if (!Number.isFinite(effectiveMilliseconds)) {
    throw new OperatorConfigurationError("cutover effectiveAt must be a valid ISO timestamp");
  }
  const effectiveSeconds = BigInt(Math.floor(effectiveMilliseconds / 1_000));
  const predecessor = marketById(previous, predecessorMarketId);
  const successor = marketById(previous, successorMarketId);
  const predecessorRoute = routeById(previous, predecessorMarketId);
  const successorRoute = routeById(previous, successorMarketId);
  if (predecessorRoute.activation !== "ACTIVE") {
    throw new OperatorConfigurationError("cutover predecessor is not the current ACTIVE market");
  }
  if (successorRoute.activation !== "SUCCESSOR") {
    throw new OperatorConfigurationError("cutover replacement was not staged as SUCCESSOR");
  }
  const predecessorAxis = recordIdentity(predecessor);
  const successorAxis = recordIdentity(successor);
  if (
    predecessorAxis.asset !== successorAxis.asset ||
    predecessorAxis.horizon !== successorAxis.horizon
  ) {
    throw new OperatorConfigurationError("predecessor and successor must share one asset/horizon axis");
  }
  assertFutureSepoliaResolverPolicy(
    successor,
    `${successorAxis.asset}:${successorAxis.horizon}`,
  );
  const predecessorTimes = recordObject(predecessor, "times");
  const successorTimes = recordObject(successor, "times");
  if (
    positiveRecordBigInt(predecessorTimes, "tradingClosesAt", "predecessor trading close") >
    effectiveSeconds
  ) {
    throw new OperatorConfigurationError("predecessor is still ordering-open at cutover");
  }
  const successorStartsAt = positiveRecordBigInt(successorTimes, "startsAt", "successor startsAt");
  const successorTradingClose = positiveRecordBigInt(
    successorTimes,
    "tradingClosesAt",
    "successor trading close",
  );
  if (successorStartsAt > effectiveSeconds || successorTradingClose <= effectiveSeconds) {
    throw new OperatorConfigurationError("successor is not inside its ordering window at cutover");
  }
  const successorPool = recordObject(successor, "pool");
  if (successorPool.builderSeededLiquidity !== true) {
    throw new OperatorConfigurationError("successor lacks builder-seeded liquidity provenance");
  }
  positiveRecordBigInt(
    successorPool,
    "completeSetsSeededAtoms",
    "successor seeded complete sets",
  );
  if (
    positiveRecordBigInt(successorPool, "seededAtBlock", "successor seeded block") > effectiveBlock
  ) {
    throw new OperatorConfigurationError("successor cutover predates its seed evidence");
  }
  const verification = recordObject(successor, "verification");
  if (verification.status !== "VERIFIED") {
    throw new OperatorConfigurationError("successor immutable verification is not VERIFIED");
  }

  const routing = previous.routing.map((route): CatalogRouteLike => {
    if (route.marketId.toLowerCase() === predecessorMarketId.toLowerCase()) {
      if (!route.opensAt || !route.opensAtBlock) {
        throw new OperatorConfigurationError("ACTIVE predecessor lacks its first activation identity");
      }
      return { ...route, activation: "RETIRED" };
    }
    if (route.marketId.toLowerCase() === successorMarketId.toLowerCase()) {
      return {
        marketId: route.marketId,
        activation: "ACTIVE",
        opensAt: effectiveAt,
        opensAtBlock: effectiveBlock.toString(),
      };
    }
    return route;
  });
  const payload = {
    schemaVersion: 1 as const,
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    revision: (BigInt(previous.revision) + 1n).toString(),
    previousRevisionHash: previous.catalogRevision,
    effectiveAt,
    effectiveBlock: effectiveBlock.toString(),
    markets: previous.markets,
    routing,
  };
  const candidate = authority.validateCatalogManifest({
    ...payload,
    catalogRevision: authority.hashCatalogManifest(payload),
  });
  authority.validateCatalogChain([...history, candidate]);
  return candidate;
}

/**
 * Build one hash-linked catalog revision that cuts over every supplied axis at the same block.
 *
 * This is deliberately separate from the single-axis helper above. The single-axis workflow is
 * still useful when only one axis closes, while this helper fails closed when another ACTIVE axis
 * has also reached its close at the shared effective time.
 */
export function buildCatalogMultiCutoverCandidate(
  history: readonly CatalogManifestLike[],
  pairs: readonly CatalogCutoverPair[],
  effectiveAt: string,
  effectiveBlock: bigint,
  authority: CatalogAuthority,
): CatalogManifestLike {
  const previous = history.at(-1);
  if (!previous) throw new OperatorConfigurationError("catalog history cannot be empty");
  if (previous.chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) {
    throw new OperatorConfigurationError("catalog history is not Ethereum Sepolia");
  }
  if (pairs.length === 0) {
    throw new OperatorConfigurationError("multi-axis cutover requires at least one pair");
  }
  if (effectiveBlock <= 0n) {
    throw new OperatorConfigurationError("cutover effectiveBlock must be positive");
  }
  const effectiveMilliseconds = Date.parse(effectiveAt);
  if (!Number.isFinite(effectiveMilliseconds)) {
    throw new OperatorConfigurationError("cutover effectiveAt must be a valid ISO timestamp");
  }
  const effectiveSeconds = BigInt(Math.floor(effectiveMilliseconds / 1_000));

  const predecessorIds = new Set<string>();
  const successorIds = new Set<string>();
  const allIds = new Set<string>();
  const axes = new Set<string>();
  const normalizedPairs: Array<{
    readonly predecessorId: string;
    readonly successorId: string;
  }> = [];

  for (const pair of pairs) {
    const predecessorId = pair.predecessorMarketId.toLowerCase();
    const successorId = pair.successorMarketId.toLowerCase();
    if (
      !/^0x[0-9a-f]{64}$/.test(predecessorId) ||
      !/^0x[0-9a-f]{64}$/.test(successorId)
    ) {
      throw new OperatorConfigurationError("cutover pair market IDs must be bytes32 values");
    }
    if (predecessorId === successorId) {
      throw new OperatorConfigurationError("predecessor and successor must be different markets");
    }
    if (
      predecessorIds.has(predecessorId) ||
      successorIds.has(successorId) ||
      allIds.has(predecessorId) ||
      allIds.has(successorId)
    ) {
      throw new OperatorConfigurationError("multi-axis cutover market IDs must be globally unique");
    }
    predecessorIds.add(predecessorId);
    successorIds.add(successorId);
    allIds.add(predecessorId);
    allIds.add(successorId);

    const predecessor = marketById(previous, pair.predecessorMarketId);
    const successor = marketById(previous, pair.successorMarketId);
    const predecessorRoute = routeById(previous, pair.predecessorMarketId);
    const successorRoute = routeById(previous, pair.successorMarketId);
    if (predecessorRoute.activation !== "ACTIVE") {
      throw new OperatorConfigurationError(
        `${pair.predecessorMarketId}: cutover predecessor is not the current ACTIVE market`,
      );
    }
    if (successorRoute.activation !== "SUCCESSOR") {
      throw new OperatorConfigurationError(
        `${pair.successorMarketId}: cutover replacement was not staged as SUCCESSOR`,
      );
    }

    const predecessorAxis = recordIdentity(predecessor);
    const successorAxis = recordIdentity(successor);
    if (
      predecessorAxis.asset !== successorAxis.asset ||
      predecessorAxis.horizon !== successorAxis.horizon
    ) {
      throw new OperatorConfigurationError(
        `${pair.predecessorMarketId}: predecessor and successor must share one asset/horizon axis`,
      );
    }
    const axis = `${predecessorAxis.asset}:${predecessorAxis.horizon}`;
    if (axes.has(axis)) {
      throw new OperatorConfigurationError(`multi-axis cutover contains duplicate axis ${axis}`);
    }
    axes.add(axis);
    assertFutureSepoliaResolverPolicy(successor, axis);

    const predecessorTimes = recordObject(predecessor, "times");
    const predecessorClose = positiveRecordBigInt(
      predecessorTimes,
      "tradingClosesAt",
      `${axis} predecessor trading close`,
    );
    if (predecessorClose > effectiveSeconds) {
      throw new OperatorConfigurationError(`${axis}: predecessor is still ordering-open at cutover`);
    }

    const successorTimes = recordObject(successor, "times");
    const successorStartsAt = positiveRecordBigInt(
      successorTimes,
      "startsAt",
      `${axis} successor startsAt`,
    );
    const successorTradingClose = positiveRecordBigInt(
      successorTimes,
      "tradingClosesAt",
      `${axis} successor trading close`,
    );
    if (successorStartsAt > effectiveSeconds) {
      throw new OperatorConfigurationError(`${axis}: successor has not started at cutover`);
    }
    if (successorTradingClose <= effectiveSeconds) {
      throw new OperatorConfigurationError(`${axis}: successor is already closed at cutover`);
    }

    const successorPool = recordObject(successor, "pool");
    if (successorPool.builderSeededLiquidity !== true) {
      throw new OperatorConfigurationError(`${axis}: successor lacks builder-seeded liquidity provenance`);
    }
    positiveRecordBigInt(
      successorPool,
      "completeSetsSeededAtoms",
      `${axis} successor seeded complete sets`,
    );
    if (
      positiveRecordBigInt(
        successorPool,
        "seededAtBlock",
        `${axis} successor seeded block`,
      ) > effectiveBlock
    ) {
      throw new OperatorConfigurationError(`${axis}: successor cutover predates its seed evidence`);
    }
    const verification = recordObject(successor, "verification");
    if (verification.status !== "VERIFIED") {
      throw new OperatorConfigurationError(`${axis}: successor immutable verification is not VERIFIED`);
    }
    if (
      positiveRecordBigInt(
        verification,
        "verifiedAtBlock",
        `${axis} successor verification block`,
      ) > effectiveBlock
    ) {
      throw new OperatorConfigurationError(`${axis}: successor cutover predates immutable verification`);
    }

    normalizedPairs.push({
      predecessorId,
      successorId,
    });
  }

  const previousRoutes = new Map(
    previous.routing.map((route) => [route.marketId.toLowerCase(), route] as const),
  );
  for (const record of previous.markets) {
    const marketId = record.marketId;
    if (typeof marketId !== "string") {
      throw new OperatorConfigurationError("catalog market lacks a valid marketId");
    }
    if (previousRoutes.get(marketId.toLowerCase())?.activation !== "ACTIVE") continue;
    const close = positiveRecordBigInt(
      recordObject(record, "times"),
      "tradingClosesAt",
      `${marketId} ACTIVE trading close`,
    );
    if (close <= effectiveSeconds && !predecessorIds.has(marketId.toLowerCase())) {
      throw new OperatorConfigurationError(
        `${marketId}: every ACTIVE route closed at cutover must be replaced atomically`,
      );
    }
  }

  const pairByPredecessor = new Map(
    normalizedPairs.map((pair) => [pair.predecessorId, pair] as const),
  );
  const pairBySuccessor = new Map(
    normalizedPairs.map((pair) => [pair.successorId, pair] as const),
  );
  const routing = previous.routing.map((route): CatalogRouteLike => {
    const routeId = route.marketId.toLowerCase();
    if (pairByPredecessor.has(routeId)) {
      if (!route.opensAt || !route.opensAtBlock) {
        throw new OperatorConfigurationError(
          `${route.marketId}: ACTIVE predecessor lacks its first activation identity`,
        );
      }
      return { ...route, activation: "RETIRED" };
    }
    if (pairBySuccessor.has(routeId)) {
      return {
        marketId: route.marketId,
        activation: "ACTIVE",
        opensAt: effectiveAt,
        opensAtBlock: effectiveBlock.toString(),
      };
    }
    return route;
  });
  const payload = {
    schemaVersion: 1 as const,
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    revision: (BigInt(previous.revision) + 1n).toString(),
    previousRevisionHash: previous.catalogRevision,
    effectiveAt,
    effectiveBlock: effectiveBlock.toString(),
    markets: previous.markets,
    routing,
  };
  const candidate = authority.validateCatalogManifest({
    ...payload,
    catalogRevision: authority.hashCatalogManifest(payload),
  });
  authority.validateCatalogChain([...history, candidate]);
  return candidate;
}

function fileSystemError(error: unknown): NodeJS.ErrnoException | undefined {
  return error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException) : undefined;
}

export async function assertOutputAbsent(path: string): Promise<void> {
  try {
    await stat(path);
  } catch (error) {
    const fileError = fileSystemError(error);
    if (fileError?.code === "ENOENT") return;
    const reason = fileError?.code ? ` (${fileError.code})` : "";
    throw new OperatorConfigurationError(`cannot inspect output path ${path}${reason}`);
  }
  throw new OperatorConfigurationError(`refusing to overwrite existing output: ${path}`);
}

export async function assertOutputReady(path: string): Promise<void> {
  await assertOutputAbsent(path);
  const parent = dirname(path);
  let parentStats;
  try {
    parentStats = await stat(parent);
    await access(parent, fsConstants.W_OK | fsConstants.X_OK);
  } catch (error) {
    const fileError = fileSystemError(error);
    const reason = fileError?.code ? ` (${fileError.code})` : "";
    throw new OperatorConfigurationError(`output parent is not accessible: ${parent}${reason}`);
  }
  if (!parentStats.isDirectory()) {
    throw new OperatorConfigurationError(`output parent is not a directory: ${parent}`);
  }
}

export async function readJsonIfExists(path: string): Promise<unknown | undefined> {
  try {
    return await readJson(path);
  } catch (error) {
    const fileError = fileSystemError(error);
    if (fileError?.code === "ENOENT") return undefined;
    const reason = fileError?.code ? ` (${fileError.code})` : "";
    throw new OperatorConfigurationError(`cannot read existing evidence ${path}${reason}`);
  }
}

export async function writeJsonExclusive(path: string, value: unknown): Promise<void> {
  let handle;
  try {
    handle = await open(path, "wx");
  } catch (error) {
    const fileError = fileSystemError(error);
    const reason = fileError?.code ? ` (${fileError.code})` : "";
    throw new OperatorConfigurationError(`cannot create exclusive output ${path}${reason}`);
  }
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  } finally {
    await handle.close();
  }
}

/**
 * Serialize a bounded operator action across processes without putting credentials in the lock.
 * The caller chooses a revision-scoped path shared by every process competing for the same
 * authority. A stale lock is never removed automatically because doing so could create two
 * simultaneous writers; the error names the exact path for deliberate operator recovery.
 */
export async function withExclusiveOperatorLock<T>(
  path: string,
  operation: () => Promise<T>,
): Promise<T> {
  let handle;
  try {
    handle = await open(path, "wx", 0o600);
  } catch (error) {
    const fileError = fileSystemError(error);
    const reason = fileError?.code ? ` (${fileError.code})` : "";
    if (fileError?.code === "EEXIST") {
      throw new OperatorConfigurationError(
        `operator action is locked by another process at ${path}; verify no matching operator is active before removing that exact stale lock`,
      );
    }
    throw new OperatorConfigurationError(`cannot acquire operator lock ${path}${reason}`);
  }
  try {
    await handle.writeFile(
      `${JSON.stringify({ schemaVersion: 1, pid: process.pid, createdAt: new Date().toISOString() })}\n`,
      "utf8",
    );
    await handle.sync();
    return await operation();
  } finally {
    await handle.close();
    try {
      await rm(path);
    } catch (error) {
      const fileError = fileSystemError(error);
      const reason = fileError?.code ? ` (${fileError.code})` : "";
      throw new OperatorConfigurationError(`cannot release operator lock ${path}${reason}`);
    }
  }
}

export function requireExplicitWrite(
  env: NodeJS.ProcessEnv,
  expected:
    | "DEPLOY_SEPOLIA_BUNDLE"
    | "RESOLVE_SEPOLIA_MARKET"
    | "CLOSE_SEPOLIA_LIQUIDITY"
    | "ACTIVATE_SEPOLIA_SUCCESSOR"
    | "ACTIVATE_SEPOLIA_SUCCESSORS",
): void {
  if (env.NOXLIMIT_OPERATOR_CONFIRM !== expected) {
    throw new OperatorConfigurationError(
      `write refused: set NOXLIMIT_OPERATOR_CONFIRM=${expected} for this explicit operator action`,
    );
  }
}
