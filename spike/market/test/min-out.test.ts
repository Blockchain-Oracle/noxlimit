import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_UINT256,
  PRICE_SCALE,
  ceilDiv,
  maxAveragePriceForFill,
  minOutFromMaxAveragePrice,
} from "../helpers/min-out.js";

describe("private max-price to minOut conversion", () => {
  it("rounds upward at exact and non-exact boundaries without floating point", () => {
    assert.equal(ceilDiv(10n, 2n), 5n);
    assert.equal(ceilDiv(10n, 3n), 4n);
    assert.equal(minOutFromMaxAveragePrice(10n, 2n * PRICE_SCALE), 5n);
    assert.equal(minOutFromMaxAveragePrice(10n, 3n * PRICE_SCALE), 4n);
  });

  it("uses the same unit-safe formula for 6- and 18-decimal collateral amounts", () => {
    const fiftyCents = PRICE_SCALE / 2n;
    assert.equal(minOutFromMaxAveragePrice(1_000_000n, fiftyCents), 2_000_000n);
    assert.equal(minOutFromMaxAveragePrice(10n ** 18n, fiftyCents), 2n * 10n ** 18n);
  });

  it("handles tiny and uint256-boundary values and rejects invalid outputs", () => {
    assert.equal(minOutFromMaxAveragePrice(1n, PRICE_SCALE), 1n);
    assert.equal(minOutFromMaxAveragePrice(MAX_UINT256, PRICE_SCALE), MAX_UINT256);
    assert.throws(() => minOutFromMaxAveragePrice(0n, PRICE_SCALE));
    assert.throws(() => minOutFromMaxAveragePrice(1n, 0n));
    assert.throws(() => minOutFromMaxAveragePrice(MAX_UINT256, 1n));
  });

  it("guarantees every accepted fill has a fee-inclusive gross price within the cap", () => {
    const vectors = [
      [1n, PRICE_SCALE],
      [1_000_000n, 733_000_000_000_000_000n],
      [10n ** 18n, 499_000_000_000_000_000n],
      [2n ** 128n, 3n * PRICE_SCALE],
    ] as const;

    for (const [grossAmountIn, maximumPrice] of vectors) {
      const minOut = minOutFromMaxAveragePrice(grossAmountIn, maximumPrice);
      for (const actualOut of [minOut, minOut + 1n, minOut * 2n]) {
        assert.ok(maxAveragePriceForFill(grossAmountIn, actualOut) <= maximumPrice);
      }
    }
  });
});
