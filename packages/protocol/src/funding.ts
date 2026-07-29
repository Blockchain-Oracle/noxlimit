import { z } from "zod";

import {
  addressSchema,
  bytes32Schema,
  decimalAmountSchema,
  decimalStringSchema,
  ethereumSepoliaChainIdSchema,
  hexSchema,
  isoDateTimeSchema,
} from "./scalars.js";

const fundingClaimFields = [
  { name: "recipient", type: "address" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint64" },
] as const;

export const fundingChallengeRequestSchema = z.strictObject({
  address: addressSchema,
  chainId: ethereumSepoliaChainIdSchema,
});

export const fundingTypedDataSchema = z.strictObject({
  domain: z.strictObject({
    name: z.literal("NoxLimit Testnet Funding"),
    version: z.literal("1"),
    chainId: ethereumSepoliaChainIdSchema,
    verifyingContract: addressSchema,
  }),
  types: z.strictObject({
    FundingClaim: z.tuple([
      z.strictObject({ name: z.literal("recipient"), type: z.literal("address") }),
      z.strictObject({ name: z.literal("nonce"), type: z.literal("uint256") }),
      z.strictObject({ name: z.literal("deadline"), type: z.literal("uint64") }),
    ]),
  }),
  primaryType: z.literal("FundingClaim"),
  message: z.strictObject({
    recipient: addressSchema,
    nonce: decimalStringSchema,
    deadline: decimalStringSchema,
  }),
});

export const fundingChallengeResponseSchema = z.strictObject({
  challengeId: bytes32Schema,
  address: addressSchema,
  chainId: ethereumSepoliaChainIdSchema,
  treasury: addressSchema,
  nonce: decimalStringSchema,
  deadline: decimalStringSchema,
  expiresAt: isoDateTimeSchema,
  typedData: fundingTypedDataSchema,
});

export const fundingClaimRequestSchema = z.strictObject({
  challengeId: bytes32Schema,
  address: addressSchema,
  signature: hexSchema,
});

export const fundingClaimStatusSchema = z.enum([
  "COMPLETE",
  "PARTIAL",
  "COOLDOWN",
  "CAP_REACHED",
  "TREASURY_LOW",
]);

export const fundingClaimResponseSchema = z.strictObject({
  status: fundingClaimStatusSchema,
  address: addressSchema,
  nativeAmount: decimalAmountSchema,
  collateralAmount: decimalAmountSchema,
  nextEligibleAt: isoDateTimeSchema.optional(),
  transactionHash: bytes32Schema.optional(),
  asOf: isoDateTimeSchema,
});

export type FundingChallengeRequest = z.infer<typeof fundingChallengeRequestSchema>;
export type FundingTypedData = z.infer<typeof fundingTypedDataSchema>;
export type FundingChallengeResponse = z.infer<typeof fundingChallengeResponseSchema>;
export type FundingClaimRequest = z.infer<typeof fundingClaimRequestSchema>;
export type FundingClaimStatus = z.infer<typeof fundingClaimStatusSchema>;
export type FundingClaimResponse = z.infer<typeof fundingClaimResponseSchema>;

/** Canonical EIP-712 field order used by TestnetFundingTreasury. */
export const FUNDING_CLAIM_FIELDS = fundingClaimFields;
