import {
  getAddress,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";

import {
  DeploymentJournal,
  type JsonObject,
} from "./deployment-journal.js";
import { OperatorConfigurationError } from "./lib.js";

export type DeploymentStepManifestInput = Readonly<{
  deployCollateral: boolean;
  mintCollateral: boolean;
  deployFundingTreasury: boolean;
  topUpFundingCollateral: boolean;
  topUpFundingNative: boolean;
}>;

export function deploymentStepManifest(
  input: DeploymentStepManifestInput,
): readonly string[] {
  return [
    ...(input.deployCollateral ? ["collateralDeployment"] : []),
    "settlementAdapterDeployment",
    "resolverDeployment",
    "prepareCondition",
    "fpmmCreation",
    ...(input.mintCollateral ? ["operatorCollateralMint"] : []),
    "fpmmSeedApproval",
    "fpmmSeed",
    "orderBookDeployment",
    ...(input.deployFundingTreasury ? ["fundingTreasuryDeployment"] : []),
    ...(input.topUpFundingCollateral ? ["fundingTreasuryCollateralTopUp"] : []),
    ...(input.topUpFundingNative ? ["fundingTreasuryNativeTopUp"] : []),
  ];
}

export interface DeploymentReceiptClient {
  waitForTransactionReceipt(input: Readonly<{
    hash: Hash;
    confirmations: number;
  }>): Promise<TransactionReceipt>;
  getTransaction(input: Readonly<{ hash: Hash }>): Promise<Readonly<{ from: Address }>>;
}

export type JournaledDeploymentStepInput = Readonly<{
  journal: DeploymentJournal;
  client: DeploymentReceiptClient;
  operator: Address;
  confirmations: number;
  stepId: string;
  label: string;
  submit: () => Promise<Hash>;
  resultOf?: (receipt: TransactionReceipt) => JsonObject;
}>;

function assertSuccessful(receipt: TransactionReceipt, label: string): void {
  if (receipt.status !== "success") {
    throw new OperatorConfigurationError(
      `${label} transaction reverted: ${receipt.transactionHash}`,
    );
  }
}

function assertReceiptHash(receipt: TransactionReceipt, hash: Hash, label: string): void {
  if (receipt.transactionHash !== hash) {
    throw new OperatorConfigurationError(
      `${label} receipt hash ${receipt.transactionHash} does not match journal transaction ${hash}`,
    );
  }
}

async function assertOperatorTransaction(
  client: DeploymentReceiptClient,
  hash: Hash,
  operator: Address,
  label: string,
): Promise<void> {
  const transaction = await client.getTransaction({ hash });
  if (getAddress(transaction.from) !== getAddress(operator)) {
    throw new OperatorConfigurationError(
      `${label} journal transaction sender ${transaction.from} is not operator ${operator}`,
    );
  }
}

async function submitAndJournal(input: JournaledDeploymentStepInput): Promise<Hash> {
  let hash: Hash;
  try {
    hash = await input.submit();
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : "unknown submission failure";
    throw new OperatorConfigurationError(
      `${input.label} submission failed after its INTENT was journaled; inspect the operator account before explicit RETRY or ADOPT recovery: ${detail}`,
    );
  }
  await input.journal.recordSubmitted(input.stepId, hash);
  return hash;
}

/**
 * Execute one transaction from the journal's frozen manifest. A SUBMITTED step is recovered from
 * its persisted hash unless an attempt-bound RETRY is present. That RETRY can advance only after
 * the configured receipt client proves the exact hash reverted with the configured confirmations
 * and the transaction sender matches the operator. Pending or successful submissions are never
 * replaced. A bare INTENT remains fail-closed until the operator provides attempt-bound ADOPT or
 * RETRY recovery.
 */
export async function runJournaledDeploymentStep(
  input: JournaledDeploymentStepInput,
): Promise<TransactionReceipt> {
  const disposition = await input.journal.prepareStep(input.stepId);
  let hash: Hash;
  if (disposition.action === "SUBMIT") {
    hash = await submitAndJournal(input);
  } else if (disposition.action === "VERIFY_FAILED_SUBMISSION") {
    const failedHash = disposition.transactionHash;
    const failedReceipt = await input.client.waitForTransactionReceipt({
      hash: failedHash,
      confirmations: input.confirmations,
    });
    assertReceiptHash(failedReceipt, failedHash, input.label);
    if (failedReceipt.status === "success") {
      throw new OperatorConfigurationError(
        `${input.label} RETRY refused because submitted transaction succeeded: ${failedHash}`,
      );
    }
    await assertOperatorTransaction(
      input.client,
      failedHash,
      input.operator,
      input.label,
    );
    await input.journal.recordFailedSubmittedRetry(input.stepId, {
      transactionHash: failedHash,
      blockNumber: failedReceipt.blockNumber,
      blockHash: failedReceipt.blockHash,
      status: "reverted",
    });
    hash = await submitAndJournal(input);
  } else {
    hash = disposition.transactionHash;
  }

  const receipt = await input.client.waitForTransactionReceipt({
    hash,
    confirmations: input.confirmations,
  });
  assertReceiptHash(receipt, hash, input.label);
  assertSuccessful(receipt, input.label);
  await assertOperatorTransaction(input.client, hash, input.operator, input.label);

  if (disposition.action === "RESUME_CONFIRMED") {
    const confirmation = disposition.confirmation;
    const confirmedContractAddress = confirmation.contractAddress
      ? getAddress(confirmation.contractAddress)
      : undefined;
    const receiptContractAddress = receipt.contractAddress
      ? getAddress(receipt.contractAddress)
      : undefined;
    if (
      confirmation.blockNumber !== receipt.blockNumber.toString() ||
      (confirmation.blockHash !== undefined && confirmation.blockHash !== receipt.blockHash) ||
      confirmedContractAddress !== receiptContractAddress
    ) {
      throw new OperatorConfigurationError(
        `${input.label} confirmed journal receipt no longer matches chain`,
      );
    }
  } else {
    await input.journal.recordConfirmed(input.stepId, {
      transactionHash: hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      ...(receipt.contractAddress
        ? { contractAddress: getAddress(receipt.contractAddress) }
        : {}),
      ...(input.resultOf ? { result: input.resultOf(receipt) } : {}),
    });
  }
  return receipt;
}
