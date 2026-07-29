import { z } from "zod";

import {
  addressSchema,
  basisPointsSchema,
  bytes32Schema,
  decimalAmountSchema,
  decimalStringSchema,
  ethereumSepoliaChainIdSchema,
  isoDateTimeSchema,
} from "./scalars.js";

export const marketAssetSchema = z.enum(["BTC/USD", "ETH/USD", "SOL/USD"]);
export const marketHorizonSchema = z.enum(["1h", "4h", "24h"]);
export const MARKET_HORIZON_SECONDS = {
  "1h": 3_600n,
  "4h": 14_400n,
  "24h": 86_400n,
} as const;
export const marketSideSchema = z.enum(["YES", "NO"]);
export const oracleSourceSchema = z.enum(["Chainlink", "Pyth"]);
export const marketVerificationSchema = z.enum([
  "VERIFIED",
  "VERIFICATION_PENDING",
  "VERIFICATION_FAILED",
]);
export const catalogActivationSchema = z.enum(["ACTIVE", "SUCCESSOR", "RETIRED"]);
export const marketLifecycleSchema = z.enum([
  "UPCOMING",
  "ORDERING_OPEN",
  "ORDERING_CLOSED",
  "AWAITING_RESOLUTION",
  "RESOLVED_YES",
  "RESOLVED_NO",
]);
export const marketTradeabilityReasonSchema = z.enum([
  "UNVERIFIED",
  "NOT_ACTIVE",
  "ORDERING_CLOSED",
  "INDEXER_UNSAFE",
  "ORACLE_STALE",
  "NO_LIQUIDITY",
  "EVALUATOR_UNAVAILABLE",
]);
export const marketTradeabilitySchema = z.union([
  z.literal("TRADEABLE"),
  marketTradeabilityReasonSchema,
]);
export const marketBadgeSchema = z.enum(["NEW", "CLOSING_SOON", "LOW_LIQUIDITY", "STALE"]);
export const marketStreamSortSchema = z.enum([
  "CLOSING_SOON",
  "RECENTLY_OPENED",
  "LIQUIDITY",
]);
export const marketListLifecycleFilterSchema = z.enum(["LIVE", "RESOLVING", "RESOLVED"]);

function formatQuestionStrike(strikePriceWad: bigint): string {
  if (strikePriceWad <= 0n) throw new RangeError("strikePriceWad must be positive");
  const scale = 10n ** 18n;
  const whole = strikePriceWad / scale;
  const fraction = strikePriceWad % scale;
  const groupedWhole = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fraction === 0n) return groupedWhole;
  return `${groupedWhole}.${fraction.toString().padStart(18, "0").replace(/0+$/, "")}`;
}

export function canonicalMarketQuestion(input: {
  readonly asset: MarketAsset;
  readonly strikePriceWad: bigint;
  readonly resolvesAtSeconds: bigint;
}): string {
  const milliseconds = input.resolvesAtSeconds * 1_000n;
  if (milliseconds < 0n || milliseconds > 8_640_000_000_000_000n) {
    throw new RangeError("resolvesAtSeconds cannot be represented as an exact UTC question");
  }
  const resolution = new Date(Number(milliseconds)).toISOString().replace(".000Z", "Z");
  return `Will ${input.asset} be at or above $${formatQuestionStrike(input.strikePriceWad)} at ${resolution}?`;
}

export const marketRuntimePolicySchema = z.strictObject({
  oracleMaxAgeSeconds: z.number().int().positive(),
  poolQuoteMaxAgeSeconds: z.number().int().positive(),
  indexerMaxLagBlocks: z.number().int().nonnegative(),
  evaluatorHeartbeatMaxAgeSeconds: z.number().int().positive(),
  lowLiquidityDepthAtoms: decimalStringSchema,
});

export const marketContractRefsSchema = z.strictObject({
  resolver: addressSchema,
  conditionId: bytes32Schema,
  fpmm: addressSchema,
  orderBook: addressSchema,
  version: z.string().trim().min(1).max(64),
});

export const marketOracleViewSchema = z.strictObject({
  source: oracleSourceSchema,
  priceUsd: decimalAmountSchema,
  observedAt: isoDateTimeSchema,
  stale: z.boolean(),
});

export const liquidityProvenanceSchema = z.strictObject({
  kind: z.literal("BUILDER_SEEDED"),
  seedTransactionHash: bytes32Schema,
});

export const marketPoolViewSchema = z.strictObject({
  referenceAmount: z.literal("1.000000"),
  yesAveragePrice: decimalAmountSchema,
  noAveragePrice: decimalAmountSchema,
  completeSetDepth: decimalAmountSchema,
  completeSetDepthAtoms: decimalStringSchema,
  feeBps: basisPointsSchema,
  liquidityProvenance: liquidityProvenanceSchema,
  quotedAt: isoDateTimeSchema,
  quotedAtBlock: decimalStringSchema,
  stale: z.boolean(),
});

const marketCommonShape = {
  marketId: bytes32Schema,
  chainId: ethereumSepoliaChainIdSchema,
  asset: marketAssetSchema,
  horizon: marketHorizonSchema,
  question: z.string().trim().min(1).max(512),
  strikeUsd: decimalAmountSchema,
  opensAt: isoDateTimeSchema,
  opensAtBlock: decimalStringSchema,
  tradingClosesAt: isoDateTimeSchema,
  resolvesAt: isoDateTimeSchema,
  verification: marketVerificationSchema,
  catalogActivation: catalogActivationSchema,
  lifecycle: marketLifecycleSchema,
  tradeability: marketTradeabilitySchema,
  tradeabilityReasons: z.array(marketTradeabilityReasonSchema),
  badges: z.array(marketBadgeSchema),
  indexerSafeBlock: decimalStringSchema,
  asOf: isoDateTimeSchema,
} as const;

export const marketViewSchema = z
  .strictObject({
    ...marketCommonShape,
    comparison: z.literal(">="),
    oracle: marketOracleViewSchema,
    pool: marketPoolViewSchema,
    runtimePolicy: marketRuntimePolicySchema,
    contracts: marketContractRefsSchema,
  })
  .superRefine((value, context) => {
    const primary = value.tradeabilityReasons[0] ?? "TRADEABLE";
    if (value.tradeability !== primary) {
      context.addIssue({
        code: "custom",
        message: "tradeability must equal the first ordered reason, or TRADEABLE when empty",
        path: ["tradeability"],
      });
    }
  });

const underlyingPreviewSchema = z.strictObject({
  mode: z.literal("UNDERLYING"),
  source: oracleSourceSchema,
  feedRef: z.string().trim().min(1).max(256),
  asOf: isoDateTimeSchema,
  stale: z.boolean(),
  points: z.array(
    z.strictObject({ observedAt: isoDateTimeSchema, priceUsd: decimalAmountSchema }),
  ).max(24),
  limitedHistory: z.boolean(),
});

const outcomePricePreviewSchema = z.strictObject({
  mode: z.literal("OUTCOME_PRICES"),
  source: z.literal("FPMM_RECONSTRUCTED"),
  asOf: isoDateTimeSchema,
  asOfBlock: decimalStringSchema,
  stale: z.boolean(),
  points: z.array(
    z.strictObject({
      observedAt: isoDateTimeSchema,
      yesAveragePrice: decimalAmountSchema,
      noAveragePrice: decimalAmountSchema,
    }),
  ).max(24),
  limitedHistory: z.boolean(),
});

export const marketStreamCardViewSchema = z
  .strictObject({
    ...marketCommonShape,
    oraclePriceUsd: decimalAmountSchema,
    oracleObservedAt: isoDateTimeSchema,
    yesAveragePrice: decimalAmountSchema,
    noAveragePrice: decimalAmountSchema,
    referenceAmount: z.literal("1.000000"),
    completeSetDepth: decimalAmountSchema,
    completeSetDepthAtoms: decimalStringSchema,
    liquidityProvenance: liquidityProvenanceSchema,
    oracleStale: z.boolean(),
    poolQuotedAt: isoDateTimeSchema,
    poolQuotedAtBlock: decimalStringSchema,
    poolStale: z.boolean(),
    preview: z.discriminatedUnion("mode", [underlyingPreviewSchema, outcomePricePreviewSchema]),
    positionInFilteredStream: z.number().int().positive(),
    filteredStreamCount: z.number().int().positive(),
  })
  .superRefine((value, context) => {
    const primary = value.tradeabilityReasons[0] ?? "TRADEABLE";
    if (value.tradeability !== primary) {
      context.addIssue({
        code: "custom",
        message: "tradeability must equal the first ordered reason, or TRADEABLE when empty",
        path: ["tradeability"],
      });
    }
    if (value.positionInFilteredStream > value.filteredStreamCount) {
      context.addIssue({
        code: "custom",
        message: "stream position cannot exceed the filtered stream count",
        path: ["positionInFilteredStream"],
      });
    }
  });

export const marketHistoryPointSchema = z.strictObject({
  observedAt: isoDateTimeSchema,
  primaryValue: decimalAmountSchema,
  secondaryValue: decimalAmountSchema.optional(),
  sourceRef: z.string().trim().min(1).max(256),
});

export const marketHistoryViewSchema = z.strictObject({
  marketId: bytes32Schema,
  mode: z.enum(["UNDERLYING", "OUTCOME_PRICES"]),
  source: z.enum(["Chainlink", "Pyth", "FPMM_RECONSTRUCTED"]),
  range: z.enum(["1h", "4h", "24h", "ALL"]),
  sampling: z.enum(["CARD_24_MAX", "TERMINAL_240_MAX"]),
  asOf: isoDateTimeSchema,
  fromBlock: decimalStringSchema.optional(),
  toSafeBlock: decimalStringSchema,
  stale: z.boolean(),
  limitedHistory: z.boolean(),
  points: z.array(marketHistoryPointSchema).max(240),
  nextCursor: z.string().min(1).optional(),
});

export const quoteLadderRowSchema = z.strictObject({
  marketId: bytes32Schema,
  side: marketSideSchema,
  amountIn: decimalAmountSchema,
  sharesOut: decimalAmountSchema,
  averagePrice: decimalAmountSchema,
  priceImpactBps: basisPointsSchema,
  quotedAtBlock: decimalStringSchema,
});

export const quoteViewSchema = z.strictObject({
  marketId: bytes32Schema,
  side: marketSideSchema,
  amountIn: decimalAmountSchema,
  sharesOut: decimalAmountSchema,
  averagePrice: decimalAmountSchema,
  priceImpactBps: basisPointsSchema,
  quotedAt: isoDateTimeSchema,
  quotedAtBlock: decimalStringSchema,
  stale: z.boolean(),
});

export const marketListQuerySchema = z.strictObject({
  asset: marketAssetSchema.optional(),
  horizon: marketHorizonSchema.optional(),
  lifecycle: marketListLifecycleFilterSchema.optional(),
  sort: marketStreamSortSchema.default("CLOSING_SOON"),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
  snapshot: z.string().min(1).optional(),
});

export const marketListPageSchema = z.strictObject({
  catalogRevision: bytes32Schema,
  snapshot: z.string().min(1),
  items: z.array(marketStreamCardViewSchema),
  nextCursor: z.string().min(1).optional(),
});

export const marketStreamStateSchema = z.strictObject({
  focusedMarketId: bytes32Schema,
  selectedMarketId: bytes32Schema.optional(),
  orderedMarketIds: z.array(bytes32Schema),
  sort: marketStreamSortSchema,
  orderingSnapshotAt: isoDateTimeSchema,
  rankingRefreshAvailable: z.boolean(),
});

export type MarketAsset = z.infer<typeof marketAssetSchema>;
export type MarketHorizon = z.infer<typeof marketHorizonSchema>;
export type MarketSide = z.infer<typeof marketSideSchema>;
export type OracleSource = z.infer<typeof oracleSourceSchema>;
export type MarketVerification = z.infer<typeof marketVerificationSchema>;
export type CatalogActivation = z.infer<typeof catalogActivationSchema>;
export type MarketLifecycle = z.infer<typeof marketLifecycleSchema>;
export type MarketTradeability = z.infer<typeof marketTradeabilitySchema>;
export type MarketTradeabilityReason = z.infer<typeof marketTradeabilityReasonSchema>;
export type MarketBadge = z.infer<typeof marketBadgeSchema>;
export type MarketRuntimePolicy = z.infer<typeof marketRuntimePolicySchema>;
export type LiquidityProvenance = z.infer<typeof liquidityProvenanceSchema>;
export type MarketView = z.infer<typeof marketViewSchema>;
export type MarketStreamCardView = z.infer<typeof marketStreamCardViewSchema>;
export type MarketHistoryView = z.infer<typeof marketHistoryViewSchema>;
export type QuoteLadderRow = z.infer<typeof quoteLadderRowSchema>;
export type QuoteView = z.infer<typeof quoteViewSchema>;
export type MarketListQuery = z.infer<typeof marketListQuerySchema>;
export type MarketListPage = z.infer<typeof marketListPageSchema>;
export type MarketStreamState = z.infer<typeof marketStreamStateSchema>;
