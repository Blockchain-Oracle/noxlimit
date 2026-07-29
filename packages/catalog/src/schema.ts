import {
  basisPointsSchema,
  bytes32Schema,
  canonicalMarketQuestion,
  catalogActivationSchema,
  decimalStringSchema,
  ethereumSepoliaChainIdSchema,
  isoDateTimeSchema,
  marketAssetSchema,
  marketHorizonSchema,
  MARKET_HORIZON_SECONDS,
  marketRuntimePolicySchema,
  nonZeroAddressSchema,
  nonZeroBytes32Schema,
} from "@noxlimit/protocol";
import { z } from "zod";

export const CATALOG_SCHEMA_VERSION = 1 as const;

const positiveDecimalStringSchema = decimalStringSchema.refine(
  (value) => BigInt(value) > 0n,
  "Expected a positive decimal integer",
);

export const chainlinkOracleIdentitySchema = z.strictObject({
  source: z.literal("CHAINLINK"),
  proxy: nonZeroAddressSchema,
  assetId: nonZeroBytes32Schema,
});

export const pythOracleIdentitySchema = z.strictObject({
  source: z.literal("PYTH"),
  priceId: nonZeroBytes32Schema,
  assetId: nonZeroBytes32Schema,
});

export const oracleIdentitySchema = z.discriminatedUnion("source", [
  chainlinkOracleIdentitySchema,
  pythOracleIdentitySchema,
]);

export const resolverPolicySchema = z.strictObject({
  policyVersion: z.string().trim().min(1).max(64),
  maximumObservationDelaySeconds: positiveDecimalStringSchema,
  comparison: z.literal(">="),
});

export const stableMarketIdentitySchema = z.strictObject({
  chainId: ethereumSepoliaChainIdSchema,
  asset: marketAssetSchema,
  horizon: marketHorizonSchema,
  oracle: oracleIdentitySchema,
  strikePriceWad: positiveDecimalStringSchema,
  tradingClosesAt: positiveDecimalStringSchema,
  resolvesAt: positiveDecimalStringSchema,
  collateral: nonZeroAddressSchema,
  resolverPolicy: resolverPolicySchema,
});

const immutableMarketRecordShape = {
  schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
  marketId: nonZeroBytes32Schema,
  questionId: nonZeroBytes32Schema,
  conditionId: nonZeroBytes32Schema,
  version: z.string().trim().min(1).max(64),
  identity: stableMarketIdentitySchema,
  question: z.string().trim().min(1).max(512),
  collateral: z.strictObject({
    address: nonZeroAddressSchema,
    name: z.literal("NoxLimit Test USDC"),
    symbol: z.literal("NLTUSDC"),
    decimals: z.literal(6),
  }),
  oracle: z.discriminatedUnion("source", [
    z.strictObject({
      source: z.literal("CHAINLINK"),
      settlementAdapter: nonZeroAddressSchema,
      proxy: nonZeroAddressSchema,
      assetId: nonZeroBytes32Schema,
      feedDescription: z.string().trim().min(1).max(128),
      feedDecimals: z.number().int().min(0).max(36),
    }),
    z.strictObject({
      source: z.literal("PYTH"),
      settlementAdapter: nonZeroAddressSchema,
      priceId: nonZeroBytes32Schema,
      assetId: nonZeroBytes32Schema,
      exponent: z.number().int().min(-255).max(255),
    }),
  ]),
  contracts: z.strictObject({
    conditionalTokens: nonZeroAddressSchema,
    resolver: nonZeroAddressSchema,
    fpmm: nonZeroAddressSchema,
    orderBook: nonZeroAddressSchema,
  }),
  positions: z.strictObject({
    yesPositionId: positiveDecimalStringSchema,
    noPositionId: positiveDecimalStringSchema,
  }),
  times: z.strictObject({
    startsAt: positiveDecimalStringSchema,
    tradingClosesAt: positiveDecimalStringSchema,
    resolvesAt: positiveDecimalStringSchema,
  }),
  pool: z.strictObject({
    feeBps: basisPointsSchema,
    builderSeededLiquidity: z.literal(true),
    seedTransactionHash: nonZeroBytes32Schema,
    seededAtBlock: positiveDecimalStringSchema,
    completeSetsSeededAtoms: positiveDecimalStringSchema,
  }),
  monitoringPolicy: z.strictObject({
    evaluationTimeoutSeconds: positiveDecimalStringSchema,
    publicationTimeoutSeconds: positiveDecimalStringSchema,
    minimumEvaluationIntervalSeconds: positiveDecimalStringSchema,
    maximumEvaluations: z.number().int().min(1).max(255),
  }),
  runtimePolicy: marketRuntimePolicySchema,
  deployment: z.strictObject({
    deploymentBlock: positiveDecimalStringSchema,
    transactions: z.strictObject({
      resolver: nonZeroBytes32Schema,
      prepareCondition: nonZeroBytes32Schema,
      fpmm: nonZeroBytes32Schema,
      seedLiquidity: nonZeroBytes32Schema,
      orderBook: nonZeroBytes32Schema,
      collateral: nonZeroBytes32Schema.optional(),
      settlementAdapter: nonZeroBytes32Schema.optional(),
    }),
  }),
  provenance: z.strictObject({
    conditionalTokensCommit: z.string().regex(/^[0-9a-f]{40}$/i),
    fpmmCommit: z.string().regex(/^[0-9a-f]{40}$/i),
    noxContractsVersion: z.string().trim().min(1).max(64),
    sourceManifestRef: z.string().trim().min(1).max(512),
  }),
  verification: z.strictObject({
    status: z.literal("VERIFIED"),
    verifiedAt: isoDateTimeSchema,
    verifiedAtBlock: positiveDecimalStringSchema,
    verifiedBy: nonZeroAddressSchema,
    evidenceRef: z.string().trim().min(1).max(512),
    runtimeCodeHashes: z.strictObject({
      collateral: nonZeroBytes32Schema,
      settlementAdapter: nonZeroBytes32Schema,
      conditionalTokens: nonZeroBytes32Schema,
      resolver: nonZeroBytes32Schema,
      fpmm: nonZeroBytes32Schema,
      orderBook: nonZeroBytes32Schema,
    }),
  }),
} as const;

export const immutableMarketRecordSchema = z
  .strictObject(immutableMarketRecordShape)
  .superRefine((value, context) => {
    if (value.identity.collateral.toLowerCase() !== value.collateral.address.toLowerCase()) {
      context.addIssue({
        code: "custom",
        message: "identity collateral must match the immutable collateral address",
        path: ["identity", "collateral"],
      });
    }
    if (value.identity.tradingClosesAt !== value.times.tradingClosesAt) {
      context.addIssue({
        code: "custom",
        message: "identity and market trading close must match",
        path: ["identity", "tradingClosesAt"],
      });
    }
    if (value.identity.resolvesAt !== value.times.resolvesAt) {
      context.addIssue({
        code: "custom",
        message: "identity and market resolution time must match",
        path: ["identity", "resolvesAt"],
      });
    }
    if (value.identity.oracle.source !== value.oracle.source) {
      context.addIssue({
        code: "custom",
        message: "identity and runtime oracle sources must match",
        path: ["identity", "oracle", "source"],
      });
    }
    if (value.identity.oracle.assetId.toLowerCase() !== value.oracle.assetId.toLowerCase()) {
      context.addIssue({
        code: "custom",
        message: "identity and runtime oracle asset IDs must match",
        path: ["identity", "oracle", "assetId"],
      });
    }
    if (
      value.identity.oracle.source === "CHAINLINK" &&
      value.oracle.source === "CHAINLINK" &&
      value.identity.oracle.proxy.toLowerCase() !== value.oracle.proxy.toLowerCase()
    ) {
      context.addIssue({
        code: "custom",
        message: "identity and runtime Chainlink proxies must match",
        path: ["identity", "oracle", "proxy"],
      });
    }
    if (
      value.identity.oracle.source === "PYTH" &&
      value.oracle.source === "PYTH" &&
      value.identity.oracle.priceId.toLowerCase() !== value.oracle.priceId.toLowerCase()
    ) {
      context.addIssue({
        code: "custom",
        message: "identity and runtime Pyth price IDs must match",
        path: ["identity", "oracle", "priceId"],
      });
    }
    if (value.identity.asset === "SOL/USD" && value.identity.oracle.source !== "PYTH") {
      context.addIssue({
        code: "custom",
        message: "SOL/USD is catalogable only after the Pyth path is verified",
        path: ["identity", "oracle", "source"],
      });
    }
    if (value.identity.asset !== "SOL/USD" && value.identity.oracle.source !== "CHAINLINK") {
      context.addIssue({
        code: "custom",
        message: "BTC/USD and ETH/USD v1 records must use Chainlink",
        path: ["identity", "oracle", "source"],
      });
    }
    if (
      BigInt(value.times.startsAt) >= BigInt(value.times.tradingClosesAt) ||
      BigInt(value.times.tradingClosesAt) >= BigInt(value.times.resolvesAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "market times must satisfy startsAt < tradingClosesAt < resolvesAt",
        path: ["times"],
      });
    }
    const horizonSeconds = MARKET_HORIZON_SECONDS[value.identity.horizon];
    if (BigInt(value.times.resolvesAt) - BigInt(value.times.startsAt) !== horizonSeconds) {
      context.addIssue({
        code: "custom",
        message: `market window must equal the declared ${value.identity.horizon} horizon`,
        path: ["identity", "horizon"],
      });
    }
    const expectedQuestion = canonicalMarketQuestion({
      asset: value.identity.asset,
      strikePriceWad: BigInt(value.identity.strikePriceWad),
      resolvesAtSeconds: BigInt(value.identity.resolvesAt),
    });
    if (value.question !== expectedQuestion) {
      context.addIssue({
        code: "custom",
        message: "market question must exactly match its resolver-bound identity",
        path: ["question"],
      });
    }
    if (value.deployment.transactions.seedLiquidity !== value.pool.seedTransactionHash) {
      context.addIssue({
        code: "custom",
        message: "pool seed transaction must match deployment evidence",
        path: ["pool", "seedTransactionHash"],
      });
    }
  });

export const catalogRouteSchema = z.strictObject({
  marketId: nonZeroBytes32Schema,
  activation: catalogActivationSchema,
  opensAt: isoDateTimeSchema.optional(),
  opensAtBlock: decimalStringSchema.optional(),
});

const catalogManifestPayloadShape = {
  schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
  chainId: ethereumSepoliaChainIdSchema,
  revision: decimalStringSchema,
  previousRevisionHash: bytes32Schema.nullable(),
  effectiveAt: isoDateTimeSchema,
  effectiveBlock: decimalStringSchema,
  markets: z.array(immutableMarketRecordSchema),
  routing: z.array(catalogRouteSchema),
} as const;

export const catalogManifestPayloadSchema = z.strictObject(catalogManifestPayloadShape);
export const catalogManifestSchema = z.strictObject({
  ...catalogManifestPayloadShape,
  catalogRevision: nonZeroBytes32Schema,
});

export type OracleIdentity = z.infer<typeof oracleIdentitySchema>;
export type ResolverPolicy = z.infer<typeof resolverPolicySchema>;
export type StableMarketIdentity = z.infer<typeof stableMarketIdentitySchema>;
export type ImmutableMarketRecord = z.infer<typeof immutableMarketRecordSchema>;
export type CatalogRoute = z.infer<typeof catalogRouteSchema>;
export type CatalogManifestPayload = z.infer<typeof catalogManifestPayloadSchema>;
export type CatalogManifest = z.infer<typeof catalogManifestSchema>;
