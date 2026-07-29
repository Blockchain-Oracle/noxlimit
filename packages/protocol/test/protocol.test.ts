import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeFunctionData } from "viem";

import {
  ETHEREUM_SEPOLIA_CHAIN_ID,
  MARKET_HORIZON_SECONDS,
  SOLIDITY_ORDER_STATUS,
  atomsToDecimal,
  bigIntToDecimalString,
  buildCreateOrderTransaction,
  buildFinalizeOrderTransaction,
  buildRefundOrderTransaction,
  canonicalMarketQuestion,
  ceilDiv,
  decimalStringSchema,
  decimalStringToBigInt,
  decimalToAtoms,
  deriveDisclosureState,
  deriveOrderStatus,
  derivePrivateLimitDisplay,
  derivePublicationMaterialState,
  maxPriceWadToMinOut,
  liquidityProvenanceSchema,
  noxLimitOrderBookAbi,
  orderRefKey,
  orderViewSchema,
} from "../src/index.js";

const ADDRESS_A = "0x1111111111111111111111111111111111111111";
const ADDRESS_B = "0x2222222222222222222222222222222222222222";
const HASH_A = `0x${"a".repeat(64)}` as const;

describe("JSON-safe bigint and fixed-decimal adapters", () => {
  it("round-trips canonical decimal strings without precision loss", () => {
    const value = (1n << 255n) + 123n;
    const encoded = bigIntToDecimalString(value);
    assert.equal(decimalStringToBigInt(encoded), value);
    assert.equal(decimalStringSchema.safeParse("01").success, false);
    assert.equal(decimalStringSchema.safeParse("1e6").success, false);
  });

  it("converts six-decimal collateral without floating point", () => {
    assert.equal(decimalToAtoms("12.345678", 6), 12_345_678n);
    assert.equal(atomsToDecimal(12_345_678n, 6), "12.345678");
    assert.throws(() => decimalToAtoms("0.0000001", 6));
  });

  it("carries explicit builder-seeded liquidity provenance", () => {
    assert.deepEqual(
      liquidityProvenanceSchema.parse({ kind: "BUILDER_SEEDED", seedTransactionHash: HASH_A }),
      { kind: "BUILDER_SEEDED", seedTransactionHash: HASH_A },
    );
  });
});

describe("canonical market identity presentation", () => {
  it("binds supported horizons and exact UTC questions without floating point", () => {
    assert.equal(MARKET_HORIZON_SECONDS["1h"], 3_600n);
    assert.equal(MARKET_HORIZON_SECONDS["4h"], 14_400n);
    assert.equal(MARKET_HORIZON_SECONDS["24h"], 86_400n);
    assert.equal(
      canonicalMarketQuestion({
        asset: "BTC/USD",
        strikePriceWad: 65_000_125n * 10n ** 15n,
        resolvesAtSeconds: 1_924_995_600n,
      }),
      "Will BTC/USD be at or above $65,000.125 at 2031-01-01T01:00:00Z?",
    );
  });
});

describe("private-limit math", () => {
  it("rounds minimum shares upward at the exact integer boundary", () => {
    assert.equal(ceilDiv(10n, 3n), 4n);
    assert.equal(maxPriceWadToMinOut(1_000_000n, 1_000_000_000_000_000_000n), 1_000_000n);
    assert.equal(maxPriceWadToMinOut(1_000_000n, 440_000_000_000_000_000n), 2_272_728n);
  });

  it("rejects zero and uint256-overflow inputs", () => {
    assert.throws(() => maxPriceWadToMinOut(0n, 1n));
    assert.throws(() => maxPriceWadToMinOut(1n, 0n));
    assert.throws(() => maxPriceWadToMinOut(1n << 255n, 1n));
  });
});

describe("named order state and disclosure", () => {
  const base = {
    nowSeconds: 100n,
    expiresAtSeconds: 200n,
    tradingClosesAtSeconds: 300n,
    evaluationCount: 1,
    maximumEvaluations: 2,
  };

  it("derives exhausted and expiry-ready states at exact boundaries", () => {
    assert.equal(
      deriveOrderStatus({ ...base, onchainStatus: SOLIDITY_ORDER_STATUS.Open, evaluationCount: 2 }),
      "MONITORING_EXHAUSTED",
    );
    assert.equal(
      deriveOrderStatus({
        ...base,
        onchainStatus: SOLIDITY_ORDER_STATUS.Evaluating,
        nowSeconds: 200n,
      }),
      "EXPIRY_READY",
    );
  });

  it("never infers publication from terminal lifecycle status", () => {
    assert.equal(deriveDisclosureState(false), "ENCRYPTED");
    assert.equal(derivePrivateLimitDisplay("ENCRYPTED", true), "KNOWN_IN_CURRENT_SESSION");
    assert.equal(deriveDisclosureState(true), "PUBLISHED");
    assert.equal(derivePublicationMaterialState(true, false), "REQUESTED");
    assert.equal(derivePublicationMaterialState(true, true), "AVAILABLE");
    assert.throws(() => derivePublicationMaterialState(false, true));
  });

  it("requires publication evidence and a published bound to agree", () => {
    const common = {
      ref: { chainId: ETHEREUM_SEPOLIA_CHAIN_ID, orderBook: ADDRESS_A, orderId: "1" },
      owner: ADDRESS_A,
      recipient: ADDRESS_B,
      marketId: HASH_A,
      side: "YES",
      amountIn: "5.000000",
      createdAt: "2030-01-01T00:00:00.000Z",
      expiresAt: "2030-01-01T01:00:00.000Z",
      tradingClosesAt: "2030-01-01T02:00:00.000Z",
      status: "REFUNDED",
      evaluationCount: 1,
      maximumEvaluations: 2,
      remainingEvaluations: 1,
      transactionHash: HASH_A,
    } as const;
    assert.equal(
      orderViewSchema.safeParse({
        ...common,
        disclosureState: "ENCRYPTED",
        publicationMaterialState: "NOT_REQUESTED",
      }).success,
      true,
    );
    assert.equal(
      orderViewSchema.safeParse({
        ...common,
        disclosureState: "PUBLISHED",
        publicationMaterialState: "AVAILABLE",
      }).success,
      false,
    );
    assert.equal(
      orderViewSchema.safeParse({
        ...common,
        disclosureState: "PUBLISHED",
        publicationMaterialState: "AVAILABLE",
        publishedMinShares: "11.363637",
      }).success,
      true,
    );
  });

  it("represents irreversible publication while Gateway material is still pending", () => {
    const pending = orderViewSchema.parse({
      ref: { chainId: ETHEREUM_SEPOLIA_CHAIN_ID, orderBook: ADDRESS_A, orderId: "9" },
      owner: ADDRESS_A,
      recipient: ADDRESS_B,
      marketId: HASH_A,
      side: "NO",
      amountIn: "3.000000",
      disclosureState: "PUBLISHED",
      publicationMaterialState: "REQUESTED",
      createdAt: "2030-01-01T00:00:00.000Z",
      expiresAt: "2030-01-01T01:00:00.000Z",
      tradingClosesAt: "2030-01-01T02:00:00.000Z",
      status: "PUBLICATION_PENDING",
      evaluationCount: 1,
      maximumEvaluations: 2,
      remainingEvaluations: 1,
      transactionHash: HASH_A,
    });
    assert.equal(pending.publishedMinShares, undefined);
    assert.equal(pending.disclosureState, "PUBLISHED");
    assert.equal(pending.publicationMaterialState, "REQUESTED");
  });
});

describe("composite identity and unsigned transactions", () => {
  it("isolates equal numeric IDs across OrderBooks", () => {
    const a = { chainId: ETHEREUM_SEPOLIA_CHAIN_ID, orderBook: ADDRESS_A, orderId: "7" } as const;
    const b = { chainId: ETHEREUM_SEPOLIA_CHAIN_ID, orderBook: ADDRESS_B, orderId: "7" } as const;
    assert.notEqual(orderRefKey(a), orderRefKey(b));
  });

  it("encodes encrypted-input order creation without a plaintext private limit", () => {
    const request = buildCreateOrderTransaction({
      orderBook: ADDRESS_A,
      recipient: ADDRESS_B,
      side: "NO",
      amountIn: 5_000_000n,
      expiresAt: 2_000_000_000n,
      encryptedMinOut: HASH_A,
      inputProof: "0x1234",
    });
    const decoded = decodeFunctionData({ abi: noxLimitOrderBookAbi, data: request.data });
    assert.equal(request.chainId, ETHEREUM_SEPOLIA_CHAIN_ID);
    assert.equal(decoded.functionName, "createOrder");
    assert.deepEqual(decoded.args, [ADDRESS_B, 1, 5_000_000n, 2_000_000_000n, HASH_A, "0x1234"]);
  });

  it("encodes a separate refund action", () => {
    const request = buildRefundOrderTransaction({
      chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
      orderBook: ADDRESS_A,
      orderId: "42",
    });
    const decoded = decodeFunctionData({ abi: noxLimitOrderBookAbi, data: request.data });
    assert.equal(decoded.functionName, "refund");
    assert.deepEqual(decoded.args, [42n]);
  });

  it("rejects a runtime order reference from any chain other than Ethereum Sepolia", () => {
    const wrongChainRef = {
      chainId: 1,
      orderBook: ADDRESS_A,
      orderId: "42",
    } as never;
    assert.throws(
      () => buildRefundOrderTransaction(wrongChainRef),
      /chainId must be Ethereum Sepolia 11155111/,
    );
    assert.throws(
      () => buildFinalizeOrderTransaction({
        ref: wrongChainRef,
        evaluationNonce: 1,
        decryptionProof: "0x1234",
      }),
      /chainId must be Ethereum Sepolia 11155111/,
    );
  });
});
