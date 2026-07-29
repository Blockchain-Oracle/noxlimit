import { decimalAmountSchema } from "./scalars.js";

export const PRICE_SCALE_WAD = 10n ** 18n;
export const TEST_USDC_DECIMALS = 6;
export const MAX_UINT256 = (1n << 256n) - 1n;

function requireUint256(value: bigint, name: string): void {
  if (value < 0n || value > MAX_UINT256) {
    throw new RangeError(`${name} must fit uint256`);
  }
}

export function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n) throw new RangeError("numerator must be non-negative");
  if (denominator <= 0n) throw new RangeError("denominator must be positive");
  if (numerator === 0n) return 0n;
  return 1n + (numerator - 1n) / denominator;
}

/**
 * Convert a fee-inclusive maximum average price to the minimum outcome-share atoms accepted by
 * FPMM.buy. Collateral and outcome shares use the same decimal scale, so no floating point or
 * collateral-decimal conversion belongs in this calculation.
 */
export function maxPriceWadToMinOut(
  amountInAtoms: bigint,
  maxAveragePriceWad: bigint,
): bigint {
  requireUint256(amountInAtoms, "amountInAtoms");
  requireUint256(maxAveragePriceWad, "maxAveragePriceWad");
  if (amountInAtoms === 0n) throw new RangeError("amountInAtoms must be positive");
  if (maxAveragePriceWad === 0n) throw new RangeError("maxAveragePriceWad must be positive");
  if (amountInAtoms > MAX_UINT256 / PRICE_SCALE_WAD) {
    throw new RangeError("amountInAtoms × PRICE_SCALE_WAD overflows uint256");
  }

  const minOut = ceilDiv(amountInAtoms * PRICE_SCALE_WAD, maxAveragePriceWad);
  requireUint256(minOut, "minOut");
  return minOut;
}

/** Conservative fee-inclusive average price, rounded upward to a WAD. */
export function averagePriceWad(amountInAtoms: bigint, sharesOutAtoms: bigint): bigint {
  requireUint256(amountInAtoms, "amountInAtoms");
  requireUint256(sharesOutAtoms, "sharesOutAtoms");
  if (sharesOutAtoms === 0n) throw new RangeError("sharesOutAtoms must be positive");
  if (amountInAtoms > MAX_UINT256 / PRICE_SCALE_WAD) {
    throw new RangeError("amountInAtoms × PRICE_SCALE_WAD overflows uint256");
  }
  return ceilDiv(amountInAtoms * PRICE_SCALE_WAD, sharesOutAtoms);
}

export function decimalToAtoms(value: string, decimals: number): bigint {
  decimalAmountSchema.parse(value);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError("decimals must be an integer between 0 and 255");
  }
  const [whole = "0", fraction = ""] = value.split(".");
  if (fraction.length > decimals) {
    throw new RangeError(`value has more than ${decimals} fractional digits`);
  }
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

export function atomsToDecimal(value: bigint, decimals: number, trim = false): string {
  if (value < 0n) throw new RangeError("value must be non-negative");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError("decimals must be an integer between 0 and 255");
  }
  if (decimals === 0) return value.toString();
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  let fraction = (value % scale).toString().padStart(decimals, "0");
  if (trim) fraction = fraction.replace(/0+$/, "");
  return fraction.length === 0 ? whole.toString() : `${whole}.${fraction}`;
}
