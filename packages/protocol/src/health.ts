import { z } from "zod";

import {
  bytes32Schema,
  decimalStringSchema,
  ethereumSepoliaChainIdSchema,
  isoDateTimeSchema,
} from "./scalars.js";

export const serviceHealthStatusSchema = z.enum(["READY", "DEGRADED", "STARTING"]);
export const componentHealthStatusSchema = z.enum(["READY", "DEGRADED", "UNAVAILABLE"]);

export const healthComponentSchema = z.strictObject({
  status: componentHealthStatusSchema,
  lastSuccessfulAt: isoDateTimeSchema.optional(),
  detail: z.string().trim().min(1).max(256).optional(),
});

export const healthViewSchema = z.strictObject({
  status: serviceHealthStatusSchema,
  chainId: ethereumSepoliaChainIdSchema,
  catalogRevision: bytes32Schema,
  headBlock: decimalStringSchema,
  safeBlock: decimalStringSchema,
  indexerLagBlocks: decimalStringSchema,
  evaluator: healthComponentSchema,
  funding: healthComponentSchema,
  asOf: isoDateTimeSchema,
});

export type ServiceHealthStatus = z.infer<typeof serviceHealthStatusSchema>;
export type ComponentHealthStatus = z.infer<typeof componentHealthStatusSchema>;
export type HealthComponent = z.infer<typeof healthComponentSchema>;
export type HealthView = z.infer<typeof healthViewSchema>;
