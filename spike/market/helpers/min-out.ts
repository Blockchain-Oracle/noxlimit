export const PRICE_SCALE = 10n ** 18n;
export const MAX_UINT256 = (1n << 256n) - 1n;

function requireUint256(value: bigint, label: string) {
  if (value < 0n || value > MAX_UINT256) {
    throw new RangeError(`${label} is outside uint256`);
  }
}

export function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n) throw new RangeError("numerator must be non-negative");
  if (denominator <= 0n) throw new RangeError("denominator must be positive");
  return numerator === 0n ? 0n : ((numerator - 1n) / denominator) + 1n;
}

/**
 * Converts a gross collateral input and fee-inclusive average-price cap into the
 * minimum outcome-share amount accepted by FPMM.buy. BigInt keeps the
 * intermediate multiplication exact; the returned value is explicitly bounded
 * to the euint256/Solidity uint256 domain.
 */
export function minOutFromMaxAveragePrice(
  grossAmountIn: bigint,
  maximumAveragePriceWad: bigint,
): bigint {
  requireUint256(grossAmountIn, "grossAmountIn");
  requireUint256(maximumAveragePriceWad, "maximumAveragePriceWad");
  if (grossAmountIn === 0n) throw new RangeError("grossAmountIn must be positive");
  if (maximumAveragePriceWad === 0n) {
    throw new RangeError("maximumAveragePriceWad must be positive");
  }

  const result = ceilDiv(grossAmountIn * PRICE_SCALE, maximumAveragePriceWad);
  requireUint256(result, "minOut");
  if (result === 0n) throw new RangeError("minOut must be positive");
  return result;
}

export function maxAveragePriceForFill(
  grossAmountIn: bigint,
  actualOutcomeTokens: bigint,
): bigint {
  if (grossAmountIn <= 0n || actualOutcomeTokens <= 0n) {
    throw new RangeError("fill amounts must be positive");
  }
  return ceilDiv(grossAmountIn * PRICE_SCALE, actualOutcomeTokens);
}
