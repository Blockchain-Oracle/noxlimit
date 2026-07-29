import {
  getAddress,
  type Address,
  type Hex,
  type PublicClient,
  type Transaction,
  type TransactionReceipt,
} from "viem";

import {
  verifyRedemptionPreparedTransaction,
  type LiveRedemptionJournal,
  type RedemptionActionKind,
  type RedemptionActionRecovery,
  type RedemptionPreparedTransaction,
} from "./redemption-journal.ts";
import type { LiveRedemptionRecoveryInput } from "./redemption-settings.ts";

type ExpectedWrite = Readonly<{ to: Address; data: Hex }>;

export async function recordOrConfirmRetryBrowserEvidence(
  journal: LiveRedemptionJournal,
  current: Readonly<{
    safeBlockNumber: bigint;
    safeBlockHash: Hex;
    safeBlockTimestamp: bigint;
  }>,
): Promise<"RECORDED" | "PRESERVED"> {
  const original = journal.snapshot().browserEvidence;
  if (!original) {
    await journal.recordBrowserEvidence(current);
    return "RECORDED";
  }
  if (
    current.safeBlockNumber < BigInt(original.safeBlockNumber)
    || current.safeBlockTimestamp < BigInt(original.safeBlockTimestamp)
  ) throw new Error("The retry browser safe-block snapshot predates the durable original evidence.");
  return "PRESERVED";
}

export async function reconcileBareRedemptionIntents(input: {
  journal: LiveRedemptionJournal;
  client: PublicClient;
  wallet: Address;
  recovery: Readonly<Partial<Record<RedemptionActionKind, LiveRedemptionRecoveryInput>>>;
  expected: Readonly<Record<RedemptionActionKind, ExpectedWrite>>;
}): Promise<void> {
  for (const kind of ["resolution", "redemption"] as const) {
    const recovery = input.recovery[kind];
    const action = input.journal.snapshot().actions[kind];
    if (action.state !== "INTENT") {
      if (recovery && !matchesRecordedRecovery(action.recoveries, recovery)) {
        throw new Error(`The ${kind} recovery instruction does not apply to the current journal state.`);
      }
      continue;
    }
    if (!recovery) {
      throw new Error(`The ${kind} journal contains a bare INTENT. Inspect the exact planned hash and provide attempt-bound ADOPT or RETRY recovery.`);
    }
    const prepared = action.preparedTransaction;
    if (
      !prepared
      || action.attempt !== recovery.expectedAttempt
      || prepared.transactionHash !== recovery.transactionHash
    ) throw new Error(`The ${kind} recovery instruction is stale or does not bind the planned transaction.`);
    await verifyRedemptionPreparedTransaction(prepared, input.wallet);

    const expected = input.expected[kind];
    if (
      getAddress(prepared.destination) !== getAddress(expected.to)
      || prepared.calldata.toLowerCase() !== expected.data.toLowerCase()
    ) throw new Error(`The ${kind} planned transaction no longer matches the catalog-bound action.`);

    if (recovery.action === "ADOPT") {
      const transaction = await transactionIfPresent(input.client, recovery.transactionHash);
      if (!transaction) throw new Error(`The ${kind} ADOPT hash is not visible through the configured Sepolia provider.`);
      assertRecoveredTransaction(transaction, input.wallet, prepared);
      await input.journal.recoverAdopt(kind, recovery);
      continue;
    }

    const [transaction, receipt, latestBlock, latestNonce, pendingNonce] = await Promise.all([
      transactionIfPresent(input.client, recovery.transactionHash),
      receiptIfPresent(input.client, recovery.transactionHash),
      input.client.getBlock({ blockTag: "latest" }).catch(() => {
        throw new Error("The RETRY no-broadcast proof could not read a canonical Sepolia block.");
      }),
      input.client.getTransactionCount({ address: input.wallet, blockTag: "latest" }).catch(() => {
        throw new Error("The RETRY no-broadcast proof could not read the confirmed wallet nonce.");
      }),
      input.client.getTransactionCount({ address: input.wallet, blockTag: "pending" }).catch(() => {
        throw new Error("The RETRY no-broadcast proof could not read the pending wallet nonce.");
      }),
    ]);
    if (transaction || receipt) {
      throw new Error(`The ${kind} RETRY was refused because the exact planned hash exists; use ADOPT after inspection.`);
    }
    const plannedNonce = BigInt(prepared.nonce);
    if (BigInt(latestNonce) !== plannedNonce || BigInt(pendingNonce) !== plannedNonce || !latestBlock.hash) {
      throw new Error(`The ${kind} RETRY was refused because the wallet nonce does not positively prove no broadcast.`);
    }
    const canonicalBlock = await input.client.getBlock({ blockNumber: latestBlock.number }).catch(() => {
      throw new Error("The RETRY no-broadcast proof could not re-read its canonical Sepolia block.");
    });
    if (canonicalBlock.hash !== latestBlock.hash) {
      throw new Error(`The ${kind} RETRY no-broadcast proof crossed a reorg and was refused.`);
    }
    await input.journal.recoverRetry(kind, {
      ...recovery,
      proof: {
        checkedAtBlockNumber: latestBlock.number.toString(),
        checkedAtBlockHash: latestBlock.hash,
        transactionAbsent: true,
        receiptAbsent: true,
        latestNonce: latestNonce.toString(),
        pendingNonce: pendingNonce.toString(),
      },
    });
  }
}

function matchesRecordedRecovery(
  recoveries: readonly RedemptionActionRecovery[],
  recovery: LiveRedemptionRecoveryInput,
): boolean {
  const last = recoveries.at(-1);
  return last?.action === recovery.action
    && last.expectedAttempt === recovery.expectedAttempt
    && last.transactionHash === recovery.transactionHash;
}

function assertRecoveredTransaction(
  transaction: Transaction,
  wallet: Address,
  prepared: RedemptionPreparedTransaction,
): void {
  if (
    transaction.hash !== prepared.transactionHash
    || getAddress(transaction.from) !== getAddress(wallet)
    || !transaction.to
    || getAddress(transaction.to) !== getAddress(prepared.destination)
    || transaction.input.toLowerCase() !== prepared.calldata.toLowerCase()
    || transaction.value !== 0n
    || transaction.nonce.toString() !== prepared.nonce
  ) throw new Error("The ADOPT transaction does not match the journaled sender, nonce, destination, calldata, and value.");
}

async function transactionIfPresent(client: PublicClient, hash: Hex): Promise<Transaction | undefined> {
  try { return await client.getTransaction({ hash }); }
  catch (reason) {
    if ((reason as { name?: string }).name === "TransactionNotFoundError") return undefined;
    throw new Error("The live recovery transaction lookup failed safely.");
  }
}

async function receiptIfPresent(client: PublicClient, hash: Hex): Promise<TransactionReceipt | undefined> {
  try { return await client.getTransactionReceipt({ hash }); }
  catch (reason) {
    if ((reason as { name?: string }).name === "TransactionReceiptNotFoundError") return undefined;
    throw new Error("The live recovery receipt lookup failed safely.");
  }
}
