import { z } from "zod";

import { marketSideSchema } from "./markets.js";
import {
  addressSchema,
  bytes32Schema,
  decimalAmountSchema,
} from "./scalars.js";

export const positionStateSchema = z.enum([
  "OPEN",
  "AWAITING_RESOLUTION",
  "REDEEMABLE",
  "SETTLED_ZERO",
  "REDEMPTION_PENDING",
  "REDEEMED",
]);

export const positionViewSchema = z.strictObject({
  positionId: bytes32Schema,
  marketId: bytes32Schema,
  owner: addressSchema,
  side: marketSideSchema,
  shares: decimalAmountSchema,
  collateralSpent: decimalAmountSchema,
  realizedAveragePrice: decimalAmountSchema,
  indicativeValue: decimalAmountSchema.optional(),
  maximumRedemption: decimalAmountSchema,
  state: positionStateSchema,
  fillTransactionHash: bytes32Schema,
});

export type PositionState = z.infer<typeof positionStateSchema>;
export type PositionView = z.infer<typeof positionViewSchema>;
