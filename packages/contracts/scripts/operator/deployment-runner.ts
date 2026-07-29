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

/**
 * Execute one transaction from the journal's frozen manifest. A SUBMITTED or CONFIRMED step is
 * always recovered from its persisted hash, so restarting the deployment process cannot submit a
 * second transaction for that step. A bare INTENT remains fail-closed in DeploymentJournal until
 * the operator provides an attempt-bound ADOPT or RETRY decision.
 */
export async function runJournaledDeploymentStep(
  input: JournaledDeploymentStepInput,
): Promise<TransactionReceipt> {
  const disposition = await input.journal.prepareStep(input.stepId);
  let hash: Hash;
  if (disposition.action === "SUBMIT") {
    try {
      hash = await input.submit();
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : "unknown submission failure";
      throw new OperatorConfigurationError(
        `${input.label} submission failed after its INTENT was journaled; inspect the operator account before explicit RETRY or ADOPT recovery: ${detail}`,
      );
    }
    await input.journal.recordSubmitted(input.stepId, hash);
  } else {
    hash = disposition.transactionHash;
  }

  const receipt = await input.client.waitForTransactionReceipt({
    hash,
    confirmations: input.confirmations,
  });
  assertSuccessful(receipt, input.label);
  const transaction = await input.client.getTransaction({ hash });
  if (getAddress(transaction.from) !== getAddress(input.operator)) {
    throw new OperatorConfigurationError(
      `${input.label} journal transaction sender ${transaction.from} is not operator ${input.operator}`,
    );
  }

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
