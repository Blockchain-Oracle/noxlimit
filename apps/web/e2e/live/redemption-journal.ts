import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
  type FileHandle,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  getAddress,
  isAddress,
  isHex,
  keccak256,
  parseTransaction,
  recoverTransactionAddress,
  toBytes,
  type Address,
  type Hex,
  type TransactionSerialized,
} from "viem";

export type RedemptionActionKind = "resolution" | "redemption";
export type RedemptionActionState = "UNUSED" | "RETRY_READY" | "INTENT" | "SUBMITTED" | "CONFIRMED";

export type RedemptionPreparedTransaction = Readonly<{
  transactionHash: Hex;
  nonce: string;
  serializedTransaction: Hex;
  destination: Address;
  calldata: Hex;
}>;

export type RedemptionRetryProof = Readonly<{
  checkedAtBlockNumber: string;
  checkedAtBlockHash: Hex;
  transactionAbsent: true;
  receiptAbsent: true;
  latestNonce: string;
  pendingNonce: string;
}>;

export type RedemptionActionRecovery =
  | Readonly<{
      action: "ADOPT";
      expectedAttempt: number;
      transactionHash: Hex;
      recordedAt: string;
    }>
  | Readonly<{
      action: "RETRY";
      expectedAttempt: number;
      transactionHash: Hex;
      proof: RedemptionRetryProof;
      recordedAt: string;
    }>;

export type LiveRedemptionBinding = Readonly<{
  chainId: 11155111;
  marketId: Hex;
  positionId: Hex;
  wallet: Address;
  catalogRevision: Hex;
  resolver: Address;
  conditionalTokens: Address;
  collateral: Address;
  conditionId: Hex;
  selectedRoundId: string;
  predecessorRoundId: string;
  expectedWinner: "YES" | "NO";
  evidenceOutputPath: string;
}>;

export type RedemptionActionRecord = Readonly<{
  state: RedemptionActionState;
  attempt: number;
  preparedTransaction?: RedemptionPreparedTransaction;
  transactionHash?: Hex;
  receiptBlockNumber?: string;
  receiptBlockHash?: Hex;
  recoveries: readonly RedemptionActionRecovery[];
}>;

export type LiveRedemptionJournalRecord = Readonly<{
  schemaVersion: 1;
  kind: "NoxLimitLiveRedemptionJournal";
  bindingHash: Hex;
  binding: LiveRedemptionBinding;
  browserEvidence?: Readonly<{
    safeBlockNumber: string;
    safeBlockHash: Hex;
    safeBlockTimestamp: string;
  }>;
  redemptionExpectation?: Readonly<{
    side: "YES" | "NO";
    shares: string;
    maximumRedemption: string;
  }>;
  actions: Readonly<Record<RedemptionActionKind, RedemptionActionRecord>>;
  createdAt: string;
  updatedAt: string;
}>;

/**
 * A small, create-first crash journal for the two browser writes. The exact signed transaction
 * hash, nonce, destination, and calldata are durable before broadcast. A bare INTENT remains
 * fail-closed until an attempt-bound ADOPT or chain-proven RETRY is explicitly recorded.
 */
export class LiveRedemptionJournal {
  readonly #path: string;
  readonly #lockPath: string;
  readonly #lock: FileHandle;
  #record: LiveRedemptionJournalRecord;
  #closed = false;
  #temporaryRevision = 0;
  readonly #reservationsInProgress = new Set<RedemptionActionKind>();

  constructor(input: {
    path: string;
    lockPath: string;
    lock: FileHandle;
    record: LiveRedemptionJournalRecord;
  }) {
    this.#path = input.path;
    this.#lockPath = input.lockPath;
    this.#lock = input.lock;
    this.#record = input.record;
  }

  snapshot(): LiveRedemptionJournalRecord {
    return structuredClone(this.#record);
  }

  async recordBrowserEvidence(input: {
    safeBlockNumber: bigint;
    safeBlockHash: Hex;
    safeBlockTimestamp: bigint;
  }): Promise<void> {
    this.#assertOpen();
    const next = {
      safeBlockNumber: input.safeBlockNumber.toString(),
      safeBlockHash: input.safeBlockHash,
      safeBlockTimestamp: input.safeBlockTimestamp.toString(),
    } as const;
    if (this.#record.browserEvidence) {
      if (JSON.stringify(this.#record.browserEvidence) !== JSON.stringify(next)) {
        throw new Error("Live redemption journal already binds a different browser safe-block snapshot.");
      }
      return;
    }
    if (this.#record.actions.resolution.state !== "UNUSED") {
      throw new Error("Live redemption journal cannot add browser evidence after the resolution intent.");
    }
    this.#record = { ...this.#record, browserEvidence: next, updatedAt: new Date().toISOString() };
    await this.#persist();
  }

  async recordRedemptionExpectation(input: {
    side: "YES" | "NO";
    shares: string;
    maximumRedemption: string;
  }): Promise<void> {
    this.#assertOpen();
    if (this.#record.redemptionExpectation) {
      if (JSON.stringify(this.#record.redemptionExpectation) !== JSON.stringify(input)) {
        throw new Error("Live redemption journal already binds a different payout expectation.");
      }
      return;
    }
    if (this.#record.actions.redemption.state !== "UNUSED") {
      throw new Error("Live redemption journal cannot add a payout expectation after redemption intent.");
    }
    this.#record = { ...this.#record, redemptionExpectation: input, updatedAt: new Date().toISOString() };
    await this.#persist();
  }

  async reserve(
    kind: RedemptionActionKind,
    preparedTransaction?: RedemptionPreparedTransaction,
  ): Promise<RedemptionPreparedTransaction> {
    this.#assertOpen();
    this.assertCanReserve(kind);
    this.#reservationsInProgress.add(kind);
    try {
      const initial = this.#record.actions[kind];
      const planned = initial.state === "RETRY_READY"
        ? initial.preparedTransaction
        : preparedTransaction;
      if (!planned) {
        throw new Error(`Live redemption journal refuses ${kind} without an exact prepared transaction.`);
      }
      if (!validPreparedTransaction(planned)) {
        throw new Error(`Live redemption journal refuses malformed prepared transaction material for ${kind}.`);
      }
      await verifyRedemptionPreparedTransaction(planned, this.#record.binding.wallet);
      this.#assertReservableState(kind);
      const current = this.#record.actions[kind];
      if (current.state === "RETRY_READY" && preparedTransaction) {
        throw new Error(`Live redemption journal refuses replacement transaction material for ${kind} retry.`);
      }
      this.#replaceAction(kind, {
        state: "INTENT",
        attempt: current.attempt + 1,
        preparedTransaction: planned,
        recoveries: current.recoveries,
      });
      await this.#persist();
      return planned;
    } finally {
      this.#reservationsInProgress.delete(kind);
    }
  }

  assertCanReserve(kind: RedemptionActionKind): void {
    this.#assertOpen();
    if (this.#reservationsInProgress.has(kind)) {
      throw new Error(`Live redemption journal refuses ${kind}: a reservation is already in progress.`);
    }
    this.#assertReservableState(kind);
  }

  #assertReservableState(kind: RedemptionActionKind): void {
    const current = this.#record.actions[kind];
    if (current.state !== "UNUSED" && current.state !== "RETRY_READY") {
      throw new Error(`Live redemption journal refuses ${kind}: action is ${current.state}.`);
    }
    if (kind === "resolution" && !this.#record.browserEvidence) {
      throw new Error("Live redemption journal refuses resolution without durable browser evidence.");
    }
    if (kind === "redemption" && this.#record.actions.resolution.state !== "CONFIRMED") {
      throw new Error("Live redemption journal refuses redemption before confirmed resolution.");
    }
    if (kind === "redemption" && !this.#record.redemptionExpectation) {
      throw new Error("Live redemption journal refuses redemption without a durable payout expectation.");
    }
  }

  async recordSubmitted(kind: RedemptionActionKind, transactionHash: Hex): Promise<void> {
    this.#assertOpen();
    const current = this.#record.actions[kind];
    if (
      current.state !== "INTENT"
      || !current.preparedTransaction
      || current.preparedTransaction.transactionHash !== transactionHash
    ) {
      throw new Error(`Live redemption journal cannot submit ${kind} from ${current.state}.`);
    }
    this.#replaceAction(kind, { ...current, state: "SUBMITTED", transactionHash });
    await this.#persist();
  }

  async recoverAdopt(kind: RedemptionActionKind, input: {
    expectedAttempt: number;
    transactionHash: Hex;
  }): Promise<void> {
    this.#assertOpen();
    const current = this.#record.actions[kind];
    if (
      current.state !== "INTENT"
      || current.attempt !== input.expectedAttempt
      || current.preparedTransaction?.transactionHash !== input.transactionHash
    ) {
      throw new Error(`Live redemption journal refuses stale or mismatched ADOPT recovery for ${kind}.`);
    }
    const recordedAt = new Date().toISOString();
    this.#replaceAction(kind, {
      ...current,
      state: "SUBMITTED",
      transactionHash: input.transactionHash,
      recoveries: [...current.recoveries, {
        action: "ADOPT",
        expectedAttempt: input.expectedAttempt,
        transactionHash: input.transactionHash,
        recordedAt,
      }],
    });
    await this.#persist();
  }

  async recoverRetry(kind: RedemptionActionKind, input: {
    expectedAttempt: number;
    transactionHash: Hex;
    proof: RedemptionRetryProof;
  }): Promise<void> {
    this.#assertOpen();
    const current = this.#record.actions[kind];
    if (
      current.state !== "INTENT"
      || current.attempt !== input.expectedAttempt
      || current.preparedTransaction?.transactionHash !== input.transactionHash
      || current.preparedTransaction.nonce !== input.proof.latestNonce
      || current.preparedTransaction.nonce !== input.proof.pendingNonce
    ) {
      throw new Error(`Live redemption journal refuses stale, mismatched, or unproven RETRY recovery for ${kind}.`);
    }
    const recordedAt = new Date().toISOString();
    this.#replaceAction(kind, {
      ...current,
      state: "RETRY_READY",
      transactionHash: undefined,
      receiptBlockNumber: undefined,
      receiptBlockHash: undefined,
      recoveries: [...current.recoveries, {
        action: "RETRY",
        expectedAttempt: input.expectedAttempt,
        transactionHash: input.transactionHash,
        proof: input.proof,
        recordedAt,
      }],
    });
    await this.#persist();
  }

  async recordConfirmed(kind: RedemptionActionKind, input: {
    transactionHash: Hex;
    receiptBlockNumber: bigint;
    receiptBlockHash: Hex;
  }): Promise<void> {
    this.#assertOpen();
    const current = this.#record.actions[kind];
    if (current.state !== "SUBMITTED" || current.transactionHash !== input.transactionHash) {
      throw new Error(`Live redemption journal cannot confirm an unbound ${kind} receipt.`);
    }
    this.#replaceAction(kind, {
      ...current,
      state: "CONFIRMED",
      receiptBlockNumber: input.receiptBlockNumber.toString(),
      receiptBlockHash: input.receiptBlockHash,
    });
    await this.#persist();
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.#lock.close();
    try { await unlink(this.#lockPath); }
    catch (reason) {
      if ((reason as NodeJS.ErrnoException).code !== "ENOENT") throw reason;
    }
  }

  #replaceAction(kind: RedemptionActionKind, action: RedemptionActionRecord): void {
    this.#record = {
      ...this.#record,
      actions: { ...this.#record.actions, [kind]: action },
      updatedAt: new Date().toISOString(),
    };
  }

  async #persist(): Promise<void> {
    const temporary = `${this.#path}.tmp-${process.pid}-${this.#temporaryRevision++}`;
    const payload = `${JSON.stringify(this.#record, null, 2)}\n`;
    try {
      await writeFile(temporary, payload, { encoding: "utf8", flag: "wx", mode: 0o600 });
      await rename(temporary, this.#path);
    } catch (reason) {
      try { await unlink(temporary); } catch { /* Best-effort cleanup; journal stays fail-closed. */ }
      throw reason;
    }
  }

  #assertOpen(): void {
    if (this.#closed) throw new Error("Live redemption journal is closed.");
  }
}

export function redemptionJournalPath(evidenceOutputPath: string): string {
  const evidenceIdentity = keccak256(toBytes(resolve(process.cwd(), evidenceOutputPath))).slice(2);
  return resolve(process.cwd(), ".thoughts/raw/live-redemption-journals", `${evidenceIdentity}.journal.json`);
}

export async function openLiveRedemptionJournal(input: {
  journalPath: string;
  binding: LiveRedemptionBinding;
}): Promise<LiveRedemptionJournal> {
  const path = resolve(input.journalPath);
  const lockPath = `${path}.lock`;
  await mkdir(dirname(path), { recursive: true });
  let lock: FileHandle;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch (reason) {
    const code = (reason as NodeJS.ErrnoException).code;
    throw new Error(code === "EEXIST"
      ? `Live redemption journal is locked at ${lockPath}. Verify no harness is active before removing that exact stale lock.`
      : "Live redemption journal lock could not be acquired.");
  }
  try {
    await lock.writeFile(`${JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() })}\n`);
  } catch {
    await lock.close();
    try { await unlink(lockPath); } catch { /* Preserve the lock-write failure. */ }
    throw new Error("Live redemption journal lock metadata could not be persisted.");
  }

  try {
    const normalizedBinding = { ...input.binding, evidenceOutputPath: resolve(input.binding.evidenceOutputPath) };
    const bindingHash = hashBinding(normalizedBinding);
    const existing = await readJournalIfPresent(path);
    let record: LiveRedemptionJournalRecord;
    if (existing) {
      record = validateJournal(existing);
      if (record.bindingHash !== bindingHash || JSON.stringify(record.binding) !== JSON.stringify(normalizedBinding)) {
        throw new Error("Live redemption journal binding does not match this exact market, position, wallet, round pair, and output.");
      }
      await Promise.all(Object.values(record.actions).map(async (action) => {
        if (action.preparedTransaction) {
          await verifyRedemptionPreparedTransaction(action.preparedTransaction, record.binding.wallet);
        }
      }));
    } else {
      const now = new Date().toISOString();
      record = {
        schemaVersion: 1,
        kind: "NoxLimitLiveRedemptionJournal",
        bindingHash,
        binding: normalizedBinding,
        actions: {
          resolution: { state: "UNUSED", attempt: 0, recoveries: [] },
          redemption: { state: "UNUSED", attempt: 0, recoveries: [] },
        },
        createdAt: now,
        updatedAt: now,
      };
      await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    }
    return new LiveRedemptionJournal({ path, lockPath, lock, record });
  } catch (reason) {
    await lock.close();
    try { await unlink(lockPath); } catch { /* Preserve the original validation error. */ }
    throw reason;
  }
}

function hashBinding(binding: LiveRedemptionBinding): Hex {
  return keccak256(toBytes(JSON.stringify(binding)));
}

async function readJournalIfPresent(path: string): Promise<unknown | undefined> {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (reason) {
    if ((reason as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw new Error("Live redemption journal is unreadable or invalid JSON.");
  }
}

function validateJournal(value: unknown): LiveRedemptionJournalRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Live redemption journal is malformed.");
  const record = value as Partial<LiveRedemptionJournalRecord>;
  if (
    record.schemaVersion !== 1
    || record.kind !== "NoxLimitLiveRedemptionJournal"
    || typeof record.bindingHash !== "string"
    || typeof record.binding !== "object"
    || record.binding === null
    || typeof record.actions !== "object"
    || record.actions === null
    || typeof record.createdAt !== "string"
    || typeof record.updatedAt !== "string"
  ) throw new Error("Live redemption journal has an invalid envelope.");
  if (record.browserEvidence && (
    !/^[0-9]+$/.test(record.browserEvidence.safeBlockNumber)
    || !/^0x[0-9a-fA-F]{64}$/.test(record.browserEvidence.safeBlockHash)
    || !/^[0-9]+$/.test(record.browserEvidence.safeBlockTimestamp)
  )) throw new Error("Live redemption journal browser evidence is malformed.");
  if (record.redemptionExpectation && (
    (record.redemptionExpectation.side !== "YES" && record.redemptionExpectation.side !== "NO")
    || !/^[0-9]+(?:\.[0-9]+)?$/.test(record.redemptionExpectation.shares)
    || !/^[0-9]+(?:\.[0-9]+)?$/.test(record.redemptionExpectation.maximumRedemption)
  )) throw new Error("Live redemption journal payout expectation is malformed.");
  for (const kind of ["resolution", "redemption"] as const) {
    const action = record.actions[kind];
    if (
      !action
      || !["UNUSED", "RETRY_READY", "INTENT", "SUBMITTED", "CONFIRMED"].includes(action.state)
      || !Number.isSafeInteger(action.attempt)
      || action.attempt < 0
      || !Array.isArray(action.recoveries)
      || (action.state === "UNUSED" && (action.attempt !== 0 || action.preparedTransaction !== undefined || action.recoveries.length !== 0))
      || (action.state !== "UNUSED" && !validPreparedTransaction(action.preparedTransaction))
      || ((action.state === "SUBMITTED" || action.state === "CONFIRMED") && action.transactionHash !== action.preparedTransaction?.transactionHash)
      || ((action.state === "INTENT" || action.state === "RETRY_READY") && action.transactionHash !== undefined)
      || (action.state === "CONFIRMED" && (typeof action.receiptBlockNumber !== "string" || typeof action.receiptBlockHash !== "string"))
      || (action.state !== "CONFIRMED" && (action.receiptBlockNumber !== undefined || action.receiptBlockHash !== undefined))
      || !validRecoveries(action.recoveries, action.preparedTransaction)
      || (action.state === "RETRY_READY" && action.recoveries.at(-1)?.action !== "RETRY")
    ) throw new Error(`Live redemption journal ${kind} action is malformed.`);
  }
  if (record.actions.redemption.state !== "UNUSED" && record.actions.resolution.state !== "CONFIRMED") {
    throw new Error("Live redemption journal contains redemption before confirmed resolution.");
  }
  if (record.actions.resolution.state !== "UNUSED" && !record.browserEvidence) {
    throw new Error("Live redemption journal contains a resolution action without browser evidence.");
  }
  if (record.actions.redemption.state !== "UNUSED" && !record.redemptionExpectation) {
    throw new Error("Live redemption journal contains redemption without a payout expectation.");
  }
  return record as LiveRedemptionJournalRecord;
}

function validPreparedTransaction(value: unknown): value is RedemptionPreparedTransaction {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const input = value as Partial<RedemptionPreparedTransaction>;
  const structurallyValid = typeof input.transactionHash === "string"
    && /^0x[0-9a-fA-F]{64}$/.test(input.transactionHash)
    && typeof input.nonce === "string"
    && /^(0|[1-9][0-9]*)$/.test(input.nonce)
    && typeof input.serializedTransaction === "string"
    && isHex(input.serializedTransaction, { strict: true })
    && keccak256(input.serializedTransaction) === input.transactionHash
    && typeof input.destination === "string"
    && isAddress(input.destination)
    && typeof input.calldata === "string"
    && isHex(input.calldata, { strict: true });
  if (!structurallyValid) return false;
  try {
    const transaction = parseTransaction(input.serializedTransaction as Hex);
    return transaction.chainId === 11155111
      && transaction.nonce !== undefined
      && transaction.nonce.toString() === input.nonce
      && transaction.to !== null
      && transaction.to !== undefined
      && getAddress(transaction.to) === getAddress(input.destination as Address)
      && (transaction.data ?? "0x").toLowerCase() === (input.calldata as Hex).toLowerCase()
      && (transaction.value ?? 0n) === 0n;
  } catch {
    return false;
  }
}

export async function verifyRedemptionPreparedTransaction(
  prepared: RedemptionPreparedTransaction,
  expectedSigner: Address,
): Promise<void> {
  if (!validPreparedTransaction(prepared)) {
    throw new Error("Live redemption prepared transaction does not match its Sepolia metadata.");
  }
  let recovered: Address;
  try {
    recovered = await recoverTransactionAddress({
      serializedTransaction: prepared.serializedTransaction as TransactionSerialized,
    });
  } catch {
    throw new Error("Live redemption prepared transaction signature could not be recovered.");
  }
  if (getAddress(recovered) !== getAddress(expectedSigner)) {
    throw new Error("Live redemption prepared transaction was not signed by the bound wallet.");
  }
}

function validRecoveries(
  values: readonly RedemptionActionRecovery[],
  prepared: RedemptionPreparedTransaction | undefined,
): boolean {
  let previousExpectedAttempt = 0;
  for (const value of values) {
    if (
      typeof value !== "object"
      || value === null
      || (value.action !== "ADOPT" && value.action !== "RETRY")
      || !Number.isSafeInteger(value.expectedAttempt)
      || value.expectedAttempt <= previousExpectedAttempt
      || value.transactionHash !== prepared?.transactionHash
      || typeof value.recordedAt !== "string"
      || Number.isNaN(Date.parse(value.recordedAt))
    ) return false;
    if (value.action === "RETRY") {
      const proof = value.proof;
      if (
        !/^[0-9]+$/.test(proof.checkedAtBlockNumber)
        || !/^0x[0-9a-fA-F]{64}$/.test(proof.checkedAtBlockHash)
        || proof.transactionAbsent !== true
        || proof.receiptAbsent !== true
        || proof.latestNonce !== prepared?.nonce
        || proof.pendingNonce !== prepared?.nonce
      ) return false;
    }
    previousExpectedAttempt = value.expectedAttempt;
  }
  return true;
}
