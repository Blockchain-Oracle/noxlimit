import type { Address, Hex } from "viem";
import { z } from "zod";

const DECIMAL_INTEGER = /^(0|[1-9][0-9]*)$/;
const DECIMAL_AMOUNT = /^(0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX = /^0x(?:[0-9a-fA-F]{2})*$/;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;
const RFC3339_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

export const ETHEREUM_SEPOLIA_CHAIN_ID = 11_155_111 as const;

/** A canonical, non-negative base-10 integer for JSON boundaries. */
export const decimalStringSchema = z
  .string()
  .regex(DECIMAL_INTEGER, "Expected a canonical non-negative decimal integer");

/** A canonical, non-negative base-10 amount with an optional fractional part. */
export const decimalAmountSchema = z
  .string()
  .regex(DECIMAL_AMOUNT, "Expected a canonical non-negative decimal amount");

export const addressSchema = z
  .string()
  .regex(ADDRESS, "Expected a 20-byte Ethereum address")
  .transform((value): Address => value as Address);

export const nonZeroAddressSchema = addressSchema.refine(
  (value) => value.toLowerCase() !== "0x0000000000000000000000000000000000000000",
  "Zero address is not allowed",
);

export const hexSchema = z
  .string()
  .regex(HEX, "Expected an even-length 0x-prefixed hex value")
  .transform((value): Hex => value as Hex);

export const bytes32Schema = z
  .string()
  .regex(BYTES32, "Expected a 32-byte 0x-prefixed hex value")
  .transform((value): Hex => value as Hex);

export const nonZeroBytes32Schema = bytes32Schema.refine(
  (value) => value.toLowerCase() !== `0x${"0".repeat(64)}`,
  "Zero bytes32 is not allowed",
);

export const isoDateTimeSchema = z
  .string()
  .regex(RFC3339_UTC, "Expected an RFC 3339 UTC timestamp")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Timestamp is not a real date");

export const ethereumSepoliaChainIdSchema = z.literal(ETHEREUM_SEPOLIA_CHAIN_ID);
export const basisPointsSchema = z.number().int().min(0).max(10_000);
export const nonNegativeIntegerSchema = z.number().int().nonnegative();

export type DecimalString = z.infer<typeof decimalStringSchema>;
export type DecimalAmount = z.infer<typeof decimalAmountSchema>;
export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;

export function decimalStringToBigInt(value: string): bigint {
  return BigInt(decimalStringSchema.parse(value));
}

export function bigIntToDecimalString(value: bigint): DecimalString {
  if (value < 0n) throw new RangeError("Decimal strings cannot encode a negative bigint");
  return decimalStringSchema.parse(value.toString());
}
