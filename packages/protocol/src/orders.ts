import { z } from "zod";

import { marketSideSchema } from "./markets.js";
import {
  addressSchema,
  bytes32Schema,
  decimalAmountSchema,
  decimalStringSchema,
  ethereumSepoliaChainIdSchema,
  isoDateTimeSchema,
} from "./scalars.js";
import {
  disclosureStateSchema,
  orderStatusSchema,
  publicationMaterialStateSchema,
} from "./status.js";

export const orderRefSchema = z.strictObject({
  chainId: ethereumSepoliaChainIdSchema,
  orderBook: addressSchema,
  orderId: decimalStringSchema,
});

export const orderViewSchema = z
  .strictObject({
    ref: orderRefSchema,
    owner: addressSchema,
    recipient: addressSchema,
    marketId: bytes32Schema,
    side: marketSideSchema,
    amountIn: decimalAmountSchema,
    disclosureState: disclosureStateSchema,
    publicationMaterialState: publicationMaterialStateSchema,
    publishedMinShares: decimalAmountSchema.optional(),
    createdAt: isoDateTimeSchema,
    expiresAt: isoDateTimeSchema,
    tradingClosesAt: isoDateTimeSchema,
    status: orderStatusSchema,
    evaluationCount: z.number().int().nonnegative(),
    maximumEvaluations: z.number().int().positive(),
    remainingEvaluations: z.number().int().nonnegative(),
    lastEvaluationAt: isoDateTimeSchema.optional(),
    nextEvaluationEligibleAt: isoDateTimeSchema.optional(),
    transactionHash: bytes32Schema,
  })
  .superRefine((value, context) => {
    if (value.evaluationCount + value.remainingEvaluations !== value.maximumEvaluations) {
      context.addIssue({
        code: "custom",
        message: "evaluation count plus remaining evaluations must equal the maximum",
        path: ["remainingEvaluations"],
      });
    }
    if (
      value.disclosureState === "ENCRYPTED" &&
      value.publicationMaterialState !== "NOT_REQUESTED"
    ) {
      context.addIssue({
        code: "custom",
        message: "encrypted orders cannot have public-decryption material",
        path: ["publicationMaterialState"],
      });
    }
    if (
      value.disclosureState === "PUBLISHED" &&
      value.publicationMaterialState === "NOT_REQUESTED"
    ) {
      context.addIssue({
        code: "custom",
        message: "published disclosure requires requested or available publication material",
        path: ["publicationMaterialState"],
      });
    }
    if (
      value.publicationMaterialState === "AVAILABLE" &&
      value.publishedMinShares === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "available publication material must expose its minimum shares",
        path: ["publishedMinShares"],
      });
    }
    if (
      value.publicationMaterialState !== "AVAILABLE" &&
      value.publishedMinShares !== undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "minimum shares are exposed only after publication material is available",
        path: ["publishedMinShares"],
      });
    }
  });

export type OrderRef = z.infer<typeof orderRefSchema>;
export type OrderView = z.infer<typeof orderViewSchema>;

export function orderRefKey(ref: OrderRef): string {
  const value = orderRefSchema.parse(ref);
  return `${value.chainId}:${value.orderBook.toLowerCase()}:${value.orderId}`;
}
