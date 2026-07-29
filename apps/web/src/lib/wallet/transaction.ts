import type { PublicClient, TransactionReceipt, WalletClient } from "viem";
import type { UnsignedContractTransaction } from "@noxlimit/protocol";

export type ReceiptProgress =
  | { state: "SUBMITTED"; hash: `0x${string}` }
  | { state: "REPLACED"; hash: `0x${string}`; reason: "cancelled" | "replaced" | "repriced" }
  | { state: "UNCONFIRMED"; hash: `0x${string}` };

export class UnconfirmedTransactionError extends Error {
  readonly hash: `0x${string}`;

  constructor(hash: `0x${string}`) {
    super("The transaction is submitted but its receipt is not confirmed yet. NoxLimit will keep checking this exact hash and will not submit the action again.");
    this.name = "UnconfirmedTransactionError";
    this.hash = hash;
  }
}

export class TerminalTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TerminalTransactionError";
  }
}

export async function sendAndConfirm(input: {
  walletClient: WalletClient;
  publicClient: PublicClient;
  account: `0x${string}`;
  transaction: UnsignedContractTransaction;
  onProgress?: (progress: ReceiptProgress) => void;
}): Promise<{ hash: `0x${string}`; receipt: TransactionReceipt }> {
  const hash = await input.walletClient.sendTransaction({
    account: input.account,
    chain: input.walletClient.chain,
    to: input.transaction.to,
    data: input.transaction.data,
    value: input.transaction.value,
  });
  let effectiveHash = hash;
  let replacementFailure: Error | undefined;
  input.onProgress?.({ state: "SUBMITTED", hash });
  try {
    const receipt = await input.publicClient.waitForTransactionReceipt({
      hash,
      timeout: 90_000,
      onReplaced(replacement) {
        effectiveHash = replacement.transactionReceipt.transactionHash;
        input.onProgress?.({ state: "REPLACED", hash: effectiveHash, reason: replacement.reason });
        if (replacement.reason === "cancelled") {
          replacementFailure = new TerminalTransactionError("The wallet cancelled this transaction. No dependent transaction was submitted.");
          return;
        }
        const expectedTo = input.transaction.to.toLowerCase();
        const replacementTo = replacement.transaction.to?.toLowerCase();
        const expectedValue = input.transaction.value ?? 0n;
        if (
          replacementTo !== expectedTo ||
          replacement.transaction.input.toLowerCase() !== input.transaction.data.toLowerCase() ||
          replacement.transaction.value !== expectedValue
        ) {
          replacementFailure = new TerminalTransactionError("The wallet replaced this transaction with a different action. NoxLimit did not treat it as success.");
        }
      },
    });
    if (replacementFailure) throw replacementFailure;
    if (receipt.status !== "success") throw new TerminalTransactionError("The wallet transaction reverted onchain.");
    return { hash: effectiveHash, receipt };
  } catch (reason) {
    if (replacementFailure) throw replacementFailure;
    if (reason instanceof Error && reason.name === "WaitForTransactionReceiptTimeoutError") {
      input.onProgress?.({ state: "UNCONFIRMED", hash: effectiveHash });
      throw new UnconfirmedTransactionError(effectiveHash);
    }
    if (reason instanceof TerminalTransactionError) throw reason;
    input.onProgress?.({ state: "UNCONFIRMED", hash: effectiveHash });
    throw new UnconfirmedTransactionError(effectiveHash);
  }
}
