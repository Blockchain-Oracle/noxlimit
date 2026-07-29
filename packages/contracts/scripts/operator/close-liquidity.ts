import { network } from "hardhat";
import {
  getAddress,
  isAddress,
  zeroAddress,
  zeroHash,
  type Address,
  type Hash,
  type Hex,
} from "viem";

import { collateralAbi, conditionalTokensAbi, fpmmAbi, orderBookAbi } from "./abis.js";
import {
  ETHEREUM_SEPOLIA_CHAIN_ID,
  OperatorConfigurationError,
  assertLiquidityClosePreconditions,
  assertOutputReady,
  explicitPath,
  planLiquidityClose,
  readJsonIfExists,
  requireExplicitWrite,
  rethrowSanitizedOperatorFailure,
  writeJsonExclusive,
} from "./lib.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new OperatorConfigurationError(`${name} is required`);
  return value;
}

function address(name: string): Address {
  const value = required(name);
  if (!isAddress(value, { strict: true })) {
    throw new OperatorConfigurationError(`${name} must be a valid address`);
  }
  const parsed = getAddress(value);
  if (parsed === zeroAddress) throw new OperatorConfigurationError(`${name} cannot be zero`);
  return parsed;
}

function bytes32(name: string): Hex {
  const value = required(name);
  if (!/^0x[0-9a-f]{64}$/i.test(value) || value.toLowerCase() === zeroHash) {
    throw new OperatorConfigurationError(`${name} must be a nonzero bytes32`);
  }
  return value as Hex;
}

function confirmations(): number {
  const raw = required("NOXLIMIT_CONFIRMATIONS");
  if (!/^[0-9]+$/.test(raw)) {
    throw new OperatorConfigurationError("NOXLIMIT_CONFIRMATIONS must be an unsigned integer");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) {
    throw new OperatorConfigurationError("NOXLIMIT_CONFIRMATIONS must be between 1 and 100");
  }
  return value;
}

async function main(): Promise<void> {
  requireExplicitWrite(process.env, "CLOSE_SEPOLIA_LIQUIDITY");
  const conditionalTokens = address("NOXLIMIT_CONDITIONAL_TOKENS");
  const collateral = address("NOXLIMIT_COLLATERAL_ADDRESS");
  const fpmm = address("NOXLIMIT_FPMM_ADDRESS");
  const orderBook = address("NOXLIMIT_ORDER_BOOK_ADDRESS");
  const lpOwner = address("NOXLIMIT_LP_OWNER");
  const conditionId = bytes32("NOXLIMIT_CONDITION_ID");
  const outputPath = explicitPath(process.env, "NOXLIMIT_LIQUIDITY_EVIDENCE_OUTPUT_PATH");
  const confirmationCount = confirmations();
  const existingEvidence = await readJsonIfExists(outputPath);
  if (existingEvidence === undefined) await assertOutputReady(outputPath);

  const connection = await network.create();
  if (connection.networkName !== "sepoliaOperator") {
    throw new OperatorConfigurationError("liquidity close must use the explicit sepoliaOperator network");
  }
  const publicClient = await connection.viem.getPublicClient();
  const [operator] = await connection.viem.getWalletClients();
  if (!operator) throw new OperatorConfigurationError("sepoliaOperator exposes no operator account");
  const operatorAddress = getAddress(operator.account.address);
  if (operatorAddress !== lpOwner) {
    throw new OperatorConfigurationError(
      `active signer ${operatorAddress} is not the declared LP owner ${lpOwner}`,
    );
  }
  const chainId = await publicClient.getChainId();
  if (chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) {
    throw new OperatorConfigurationError(`refusing liquidity close on chain ${chainId}`);
  }
  for (const [label, target] of [
    ["Conditional Tokens", conditionalTokens],
    ["collateral", collateral],
    ["FPMM", fpmm],
    ["OrderBook", orderBook],
  ] as const) {
    const code = await publicClient.getCode({ address: target });
    if (!code || code === "0x") throw new OperatorConfigurationError(`${label} has no runtime code`);
  }
  const [
    boundConditionalTokens,
    boundCollateral,
    boundCondition,
    orderBookFpmm,
    orderBookConditionalTokens,
    orderBookCollateral,
    orderBookCondition,
    tradingClosesAt,
    latestBlock,
  ] = await Promise.all([
    publicClient.readContract({ address: fpmm, abi: fpmmAbi, functionName: "conditionalTokens" }),
    publicClient.readContract({ address: fpmm, abi: fpmmAbi, functionName: "collateralToken" }),
    publicClient.readContract({ address: fpmm, abi: fpmmAbi, functionName: "conditionIds", args: [0n] }),
    publicClient.readContract({ address: orderBook, abi: orderBookAbi, functionName: "fpmm" }),
    publicClient.readContract({
      address: orderBook,
      abi: orderBookAbi,
      functionName: "conditionalTokens",
    }),
    publicClient.readContract({ address: orderBook, abi: orderBookAbi, functionName: "collateral" }),
    publicClient.readContract({ address: orderBook, abi: orderBookAbi, functionName: "conditionId" }),
    publicClient.readContract({
      address: orderBook,
      abi: orderBookAbi,
      functionName: "tradingClosesAt",
    }),
    publicClient.getBlock(),
  ]);
  if (
    getAddress(boundConditionalTokens) !== conditionalTokens ||
    getAddress(boundCollateral) !== collateral ||
    boundCondition !== conditionId
  ) {
    throw new OperatorConfigurationError("FPMM does not match the declared immutable market bundle");
  }
  if (
    getAddress(orderBookFpmm) !== fpmm ||
    getAddress(orderBookConditionalTokens) !== conditionalTokens ||
    getAddress(orderBookCollateral) !== collateral ||
    orderBookCondition !== conditionId
  ) {
    throw new OperatorConfigurationError("OrderBook does not match the declared immutable market bundle");
  }
  if (latestBlock.timestamp < tradingClosesAt) {
    throw new OperatorConfigurationError(
      `builder liquidity cannot close before NoxLimit trading close ${tradingClosesAt}`,
    );
  }

  const [yesCollection, noCollection] = await Promise.all([
    publicClient.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getCollectionId",
      args: [zeroHash, conditionId, 1n],
    }),
    publicClient.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getCollectionId",
      args: [zeroHash, conditionId, 2n],
    }),
  ]);
  const [yesPositionId, noPositionId] = await Promise.all([
    publicClient.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getPositionId",
      args: [collateral, yesCollection],
    }),
    publicClient.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getPositionId",
      args: [collateral, noCollection],
    }),
  ]);

  const state = async () => {
    const [lpShares, yesBalance, noBalance, payoutDenominator, collateralBalance] = await Promise.all([
      publicClient.readContract({ address: fpmm, abi: fpmmAbi, functionName: "balanceOf", args: [operatorAddress] }),
      publicClient.readContract({
        address: conditionalTokens,
        abi: conditionalTokensAbi,
        functionName: "balanceOf",
        args: [operatorAddress, yesPositionId],
      }),
      publicClient.readContract({
        address: conditionalTokens,
        abi: conditionalTokensAbi,
        functionName: "balanceOf",
        args: [operatorAddress, noPositionId],
      }),
      publicClient.readContract({
        address: conditionalTokens,
        abi: conditionalTokensAbi,
        functionName: "payoutDenominator",
        args: [conditionId],
      }),
      publicClient.readContract({
        address: collateral,
        abi: collateralAbi,
        functionName: "balanceOf",
        args: [operatorAddress],
      }),
    ]);
    return { lpShares, yesBalance, noBalance, payoutDenominator, collateralBalance };
  };

  const before = await state();
  if (existingEvidence !== undefined) {
    const prior = existingEvidence as Record<string, unknown>;
    if (
      prior.fpmm !== fpmm ||
      prior.conditionId !== conditionId ||
      prior.orderBook !== orderBook ||
      prior.lpOwner !== lpOwner ||
      prior.operator !== operatorAddress
    ) {
      throw new OperatorConfigurationError("existing liquidity evidence describes another market");
    }
    const noFurtherAction =
      before.lpShares === 0n &&
      (before.payoutDenominator === 0n || (before.yesBalance === 0n && before.noBalance === 0n));
    if (noFurtherAction) {
      process.stdout.write(`${JSON.stringify({ closed: true, idempotent: true, outputPath })}\n`);
      return;
    }
    throw new OperatorConfigurationError(
      "additional close/redemption work is now available; provide a new explicit evidence output path",
    );
  }

  assertLiquidityClosePreconditions({
    operator: operatorAddress,
    lpOwner,
    latestTimestamp: latestBlock.timestamp,
    tradingClosesAt,
  });
  const beforePlan = planLiquidityClose(before);

  const receipts: { removeFunding: Hash | null; redeemPositions: Hash | null } = {
    removeFunding: null,
    redeemPositions: null,
  };
  if (beforePlan.removeFunding) {
    receipts.removeFunding = await operator.writeContract({
      address: fpmm,
      abi: fpmmAbi,
      functionName: "removeFunding",
      args: [before.lpShares],
    });
    const removeReceipt = await publicClient.waitForTransactionReceipt({
      hash: receipts.removeFunding,
      confirmations: confirmationCount,
    });
    if (removeReceipt.status !== "success") {
      throw new OperatorConfigurationError(`removeFunding reverted: ${receipts.removeFunding}`);
    }
  }
  const afterRemoval = beforePlan.removeFunding ? await state() : before;
  const afterRemovalPlan = planLiquidityClose(afterRemoval);
  if (afterRemovalPlan.redeemPositions) {
    receipts.redeemPositions = await operator.writeContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "redeemPositions",
      args: [collateral, zeroHash, conditionId, [1n, 2n]],
    });
    const redeemReceipt = await publicClient.waitForTransactionReceipt({
      hash: receipts.redeemPositions,
      confirmations: confirmationCount,
    });
    if (redeemReceipt.status !== "success") {
      throw new OperatorConfigurationError(`redeemPositions reverted: ${receipts.redeemPositions}`);
    }
  }
  const after = await state();
  if (after.lpShares !== 0n) {
    throw new OperatorConfigurationError("operator still owns FPMM LP shares after close");
  }
  const evidence = {
    schemaVersion: 1,
    kind: "NOXLIMIT_SEPOLIA_LIQUIDITY_CLOSE",
    chainId,
    operator: operatorAddress,
    conditionalTokens,
    collateral,
    fpmm,
    orderBook,
    lpOwner,
    conditionId,
    tradingClosesAt: tradingClosesAt.toString(),
    closedAtBlock: latestBlock.number.toString(),
    closedAtTimestamp: latestBlock.timestamp.toString(),
    positions: { yesPositionId: yesPositionId.toString(), noPositionId: noPositionId.toString() },
    before: Object.fromEntries(Object.entries(before).map(([key, value]) => [key, value.toString()])),
    after: Object.fromEntries(Object.entries(after).map(([key, value]) => [key, value.toString()])),
    receipts,
    redeemed: receipts.redeemPositions !== null,
    unresolvedPositionsRemain:
      after.payoutDenominator === 0n && (after.yesBalance > 0n || after.noBalance > 0n),
  };
  await writeJsonExclusive(outputPath, evidence);
  process.stdout.write(
    `${JSON.stringify({
      closed: true,
      idempotent: before.lpShares === 0n && receipts.redeemPositions === null,
      redeemed: evidence.redeemed,
      unresolvedPositionsRemain: evidence.unresolvedPositionsRemain,
      outputPath,
    })}\n`,
  );
}

try {
  await main();
} catch (error) {
  rethrowSanitizedOperatorFailure(
    error,
    "Sepolia liquidity close failed unexpectedly; inspect onchain state before retrying",
  );
}
