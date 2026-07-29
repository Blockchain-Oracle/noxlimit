import { z } from "zod";

import { marketSideSchema } from "./markets.js";
import { orderRefSchema } from "./orders.js";
import {
  addressSchema,
  bytes32Schema,
  decimalAmountSchema,
  decimalStringSchema,
  isoDateTimeSchema,
  nonNegativeIntegerSchema,
} from "./scalars.js";
import { orderStatusSchema } from "./status.js";

export const activityKindSchema = z.enum([
  "ORDER_CREATED",
  "EVALUATION_REQUESTED",
  "EVALUATION_REOPENED",
  "PUBLICATION_REQUESTED",
  "ORDER_FILLED",
  "EXECUTION_FAILED",
  "ORDER_CANCELLED",
  "ORDER_EXPIRED",
  "ORDER_REFUNDED",
  "MARKET_RESOLVED",
  "POSITION_REDEEMED",
  "FUNDING_CLAIMED",
]);

export const activityViewSchema = z.strictObject({
  activityId: z.string().trim().min(1).max(256),
  kind: activityKindSchema,
  marketId: bytes32Schema.optional(),
  actor: addressSchema.optional(),
  orderRef: orderRefSchema.optional(),
  positionId: bytes32Schema.optional(),
  amount: decimalAmountSchema.optional(),
  side: marketSideSchema.optional(),
  status: orderStatusSchema.optional(),
  occurredAt: isoDateTimeSchema,
  blockNumber: decimalStringSchema,
  transactionHash: bytes32Schema,
  logIndex: nonNegativeIntegerSchema,
});

export const activityPageSchema = z.strictObject({
  items: z.array(activityViewSchema),
  nextCursor: z.string().min(1).optional(),
  toSafeBlock: decimalStringSchema,
  asOf: isoDateTimeSchema,
  stale: z.boolean(),
});

export type ActivityKind = z.infer<typeof activityKindSchema>;
export type ActivityView = z.infer<typeof activityViewSchema>;
export type ActivityPage = z.infer<typeof activityPageSchema>;
