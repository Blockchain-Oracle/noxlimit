import type { Address, Hex } from "viem";
import { encodeFunctionData } from "viem";

import type { MarketSide } from "../markets.js";
import type { OrderRef } from "../orders.js";
import {
  ETHEREUM_SEPOLIA_CHAIN_ID,
  addressSchema,
  bytes32Schema,
  hexSchema,
} from "../scalars.js";
import {
  conditionalTokensAbi,
  erc20Abi,
  noxLimitOrderBookAbi,
  priceBinaryResolverAbi,
  testnetFundingTreasuryAbi,
} from "./abis.js";

export type UnsignedContractTransaction = {
  chainId: typeof ETHEREUM_SEPOLIA_CHAIN_ID;
  to: Address;
  data: Hex;
  value?: bigint;
};

const ZERO_BYTES32 = `0x${"0".repeat(64)}` as Hex;

function requireUnsignedBits(value: bigint, bits: number, name: string): bigint {
  const max = (1n << BigInt(bits)) - 1n;
  if (value < 0n || value > max) throw new RangeError(`${name} must fit uint${bits}`);
  return value;
}

function requireNonce(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new RangeError("nonce must fit uint32");
  }
  return value;
}

function outcomeIndex(side: MarketSide): number {
  return side === "YES" ? 0 : 1;
}

function transaction(to: Address, data: Hex): UnsignedContractTransaction {
  return { chainId: ETHEREUM_SEPOLIA_CHAIN_ID, to, data };
}

function requireSepoliaOrderRef(ref: OrderRef): Readonly<{
  orderBook: Address;
  orderId: bigint;
}> {
  if (ref.chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) {
    throw new RangeError(`order ref chainId must be Ethereum Sepolia ${ETHEREUM_SEPOLIA_CHAIN_ID}`);
  }
  return {
    orderBook: addressSchema.parse(ref.orderBook),
    orderId: requireUnsignedBits(BigInt(ref.orderId), 256, "orderId"),
  };
}

export function buildApproveCollateralTransaction(input: {
  collateral: Address;
  spender: Address;
  amount: bigint;
}): UnsignedContractTransaction {
  const collateral = addressSchema.parse(input.collateral);
  const spender = addressSchema.parse(input.spender);
  const amount = requireUnsignedBits(input.amount, 256, "amount");
  return transaction(
    collateral,
    encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender, amount] }),
  );
}

export function buildCreateOrderTransaction(input: {
  orderBook: Address;
  recipient: Address;
  side: MarketSide;
  amountIn: bigint;
  expiresAt: bigint;
  encryptedMinOut: Hex;
  inputProof: Hex;
}): UnsignedContractTransaction {
  const orderBook = addressSchema.parse(input.orderBook);
  const recipient = addressSchema.parse(input.recipient);
  const amountIn = requireUnsignedBits(input.amountIn, 128, "amountIn");
  const expiresAt = requireUnsignedBits(input.expiresAt, 64, "expiresAt");
  const encryptedMinOut = bytes32Schema.parse(input.encryptedMinOut);
  const inputProof = hexSchema.parse(input.inputProof);
  return transaction(
    orderBook,
    encodeFunctionData({
      abi: noxLimitOrderBookAbi,
      functionName: "createOrder",
      args: [recipient, outcomeIndex(input.side), amountIn, expiresAt, encryptedMinOut, inputProof],
    }),
  );
}

function buildSingleOrderIdAction(
  ref: OrderRef,
  functionName: "cancel" | "expireOrder" | "expireEvaluation" | "expirePublication" | "refund",
): UnsignedContractTransaction {
  const { orderBook, orderId } = requireSepoliaOrderRef(ref);
  return transaction(
    orderBook,
    encodeFunctionData({ abi: noxLimitOrderBookAbi, functionName, args: [orderId] }),
  );
}

export function buildCancelOrderTransaction(ref: OrderRef): UnsignedContractTransaction {
  return buildSingleOrderIdAction(ref, "cancel");
}

export function buildExpireOrderTransaction(ref: OrderRef): UnsignedContractTransaction {
  return buildSingleOrderIdAction(ref, "expireOrder");
}

export function buildExpireEvaluationTransaction(ref: OrderRef): UnsignedContractTransaction {
  return buildSingleOrderIdAction(ref, "expireEvaluation");
}

export function buildExpirePublicationTransaction(ref: OrderRef): UnsignedContractTransaction {
  return buildSingleOrderIdAction(ref, "expirePublication");
}

export function buildRefundOrderTransaction(ref: OrderRef): UnsignedContractTransaction {
  return buildSingleOrderIdAction(ref, "refund");
}

export function buildFinalizeOrderTransaction(input: {
  ref: OrderRef;
  evaluationNonce: number;
  decryptionProof: Hex;
}): UnsignedContractTransaction {
  const { orderBook, orderId } = requireSepoliaOrderRef(input.ref);
  const nonce = requireNonce(input.evaluationNonce);
  const proof = hexSchema.parse(input.decryptionProof);
  return transaction(
    orderBook,
    encodeFunctionData({
      abi: noxLimitOrderBookAbi,
      functionName: "finalize",
      args: [orderId, nonce, proof],
    }),
  );
}

export function buildResolveMarketTransaction(input: {
  resolver: Address;
  selectedRoundId: bigint;
  predecessorRoundId: bigint;
}): UnsignedContractTransaction {
  const selectedRoundId = requireUnsignedBits(input.selectedRoundId, 80, "selectedRoundId");
  const predecessorRoundId = requireUnsignedBits(
    input.predecessorRoundId,
    80,
    "predecessorRoundId",
  );
  return transaction(
    addressSchema.parse(input.resolver),
    encodeFunctionData({
      abi: priceBinaryResolverAbi,
      functionName: "resolve",
      args: [selectedRoundId, predecessorRoundId],
    }),
  );
}

export function buildRedeemPositionsTransaction(input: {
  conditionalTokens: Address;
  collateral: Address;
  conditionId: Hex;
  indexSets?: readonly bigint[];
  parentCollectionId?: Hex;
}): UnsignedContractTransaction {
  const indexSets = [...(input.indexSets ?? [1n, 2n])];
  if (indexSets.length === 0) throw new RangeError("indexSets cannot be empty");
  for (const [index, indexSet] of indexSets.entries()) {
    requireUnsignedBits(indexSet, 256, `indexSets[${index}]`);
    if (indexSet === 0n) throw new RangeError(`indexSets[${index}] must be nonzero`);
  }
  const parentCollectionId = bytes32Schema.parse(input.parentCollectionId ?? ZERO_BYTES32);
  return transaction(
    addressSchema.parse(input.conditionalTokens),
    encodeFunctionData({
      abi: conditionalTokensAbi,
      functionName: "redeemPositions",
      args: [
        addressSchema.parse(input.collateral),
        parentCollectionId,
        bytes32Schema.parse(input.conditionId),
        indexSets,
      ],
    }),
  );
}

export function buildFundingClaimTransaction(input: {
  treasury: Address;
  recipient: Address;
  nonce: bigint;
  deadline: bigint;
  signature: Hex;
}): UnsignedContractTransaction {
  return transaction(
    addressSchema.parse(input.treasury),
    encodeFunctionData({
      abi: testnetFundingTreasuryAbi,
      functionName: "claim",
      args: [
        addressSchema.parse(input.recipient),
        requireUnsignedBits(input.nonce, 256, "nonce"),
        requireUnsignedBits(input.deadline, 64, "deadline"),
        hexSchema.parse(input.signature),
      ],
    }),
  );
}
