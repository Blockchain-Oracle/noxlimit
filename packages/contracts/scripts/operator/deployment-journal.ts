import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  access,
  link,
  open,
  readFile,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  getAddress,
  isAddress,
  keccak256,
  toBytes,
  type Address,
  type Hash,
  type Hex,
} from "viem";

import {
  ETHEREUM_SEPOLIA_CHAIN_ID,
  OperatorConfigurationError,
  canonicalJson,
} from "./lib.js";

export type JsonPrimitive = string | number | boolean | null;
export interface JsonObject {
  readonly [key: string]: JsonValue;
}
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export type DeploymentStepRecovery =
  | Readonly<{ action: "ADOPT"; expectedAttempt: number; transactionHash: Hash }>
  | Readonly<{ action: "RETRY"; expectedAttempt: number }>;

export type DeploymentConfirmation = Readonly<{
  transactionHash: Hash;
  blockNumber: string;
  status: "success";
  blockHash?: Hash;
  contractAddress?: Address;
  result?: JsonObject;
}>;

export type DeploymentConfirmationInput = Readonly<{
  transactionHash: Hash;
  blockNumber: bigint | string;
  status?: "success";
  blockHash?: Hash;
  contractAddress?: Address;
  result?: JsonObject;
}>;

export type FailedDeploymentSubmission = Readonly<{
  transactionHash: Hash;
  blockNumber: string;
  blockHash: Hash;
  status: "reverted";
}>;

export type FailedDeploymentSubmissionInput = Readonly<{
  transactionHash: Hash;
  blockNumber: bigint | string;
  blockHash: Hash;
  status: "reverted";
}>;

export type DeploymentStepDisposition =
  | Readonly<{ action: "SUBMIT"; attempt: number }>
  | Readonly<{
      action: "RESUME_SUBMITTED";
      attempt: number;
      transactionHash: Hash;
    }>
  | Readonly<{
      action: "RESUME_CONFIRMED";
      attempt: number;
      transactionHash: Hash;
      confirmation: DeploymentConfirmation;
    }>
  | Readonly<{
      action: "VERIFY_FAILED_SUBMISSION";
      attempt: number;
      transactionHash: Hash;
    }>;

type StoredRecovery =
  | Readonly<{
      action: "ADOPT";
      expectedAttempt: number;
      recordedAt: string;
      transactionHash: Hash;
    }>
  | Readonly<{
      action: "RETRY";
      expectedAttempt: number;
      recordedAt: string;
      failedSubmission?: FailedDeploymentSubmission;
    }>;

type IntentStep = Readonly<{
  state: "INTENT";
  attempt: number;
  intentAt: string;
  recoveries: readonly StoredRecovery[];
}>;

type SubmittedStep = Readonly<{
  state: "SUBMITTED";
  attempt: number;
  intentAt: string;
  submittedAt: string;
  transactionHash: Hash;
  recoveries: readonly StoredRecovery[];
}>;

type ConfirmedStep = Readonly<{
  state: "CONFIRMED";
  attempt: number;
  intentAt: string;
  submittedAt: string;
  confirmedAt: string;
  transactionHash: Hash;
  confirmation: DeploymentConfirmation;
  recoveries: readonly StoredRecovery[];
}>;

export type DeploymentJournalStep = IntentStep | SubmittedStep | ConfirmedStep;

type FinalPayloads = Readonly<{
  catalog: JsonValue;
  evidence: JsonValue;
  catalogHash: Hex;
  evidenceHash: Hex;
  stagedAt: string;
  catalogPublished: boolean;
  evidencePublished: boolean;
  catalogPublishedAt?: string;
  evidencePublishedAt?: string;
}>;

export type DeploymentJournalRecord = Readonly<{
  schemaVersion: 1;
  kind: "NOXLIMIT_SEPOLIA_DEPLOYMENT_JOURNAL";
  state: "IN_PROGRESS" | "OUTPUTS_STAGED" | "COMPLETE";
  revision: string;
  createdAt: string;
  updatedAt: string;
  binding: Readonly<{
    planHash: Hex;
    operator: Address;
    chainId: typeof ETHEREUM_SEPOLIA_CHAIN_ID;
    catalogOutputPath: string;
    evidenceOutputPath: string;
  }>;
  fundingPlan: JsonObject;
  expectedSteps: readonly string[];
  steps: Readonly<Record<string, DeploymentJournalStep>>;
  finalPayloads?: FinalPayloads;
}>;

export type OpenDeploymentJournalInput = Readonly<{
  journalPath: string;
  plan: JsonValue;
  operator: Address;
  chainId: number;
  catalogOutputPath: string;
  evidenceOutputPath: string;
  /** Required for fresh creation; optional on resume to reuse the journal's frozen plan. */
  fundingPlan?: JsonObject;
  /** Required for fresh creation; optional on resume to reuse the ordered frozen manifest. */
  expectedSteps?: readonly string[];
  recoveryJson?: string;
}>;

const STEP_ID = /^[a-z][a-zA-Z0-9.-]{0,63}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const FORBIDDEN_STRUCTURE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const SENSITIVE_KEY_FRAGMENTS = [
  "apikey",
  "authorization",
  "ciphertext",
  "credential",
  "decryptionproof",
  "inputproof",
  "mnemonic",
  "password",
  "privatekey",
  "rpcurl",
  "secret",
  "seedphrase",
  "signature",
] as const;

function configurationError(message: string): OperatorConfigurationError {
  return new OperatorConfigurationError(`deployment journal: ${message}`);
}

function fileError(error: unknown): NodeJS.ErrnoException | undefined {
  return error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw configurationError(`${label} must be a JSON object`);
  return value;
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set([...required, ...optional]);
  const missing = required.filter((key) => !(key in value));
  const extra = Object.keys(value).filter((key) => !allowed.has(key));
  if (missing.length > 0) {
    throw configurationError(`${label} is missing ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    throw configurationError(`${label} contains unsupported fields: ${extra.join(", ")}`);
  }
}

function normalizedKey(key: string): string {
  return key.replaceAll(/[^a-zA-Z]/g, "").toLowerCase();
}

function safeJson(value: unknown, label: string, seen = new WeakSet<object>()): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw configurationError(`${label} contains a non-finite number`);
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
      throw configurationError(`${label} contains an unsafe integer; persist it as a decimal string`);
    }
    return value;
  }
  if (typeof value !== "object") {
    throw configurationError(`${label} contains non-JSON ${typeof value}`);
  }
  if (seen.has(value)) throw configurationError(`${label} contains a circular reference`);
  seen.add(value);
  if (Array.isArray(value)) {
    const output = value.map((entry, index) => safeJson(entry, `${label}[${index}]`, seen));
    seen.delete(value);
    return output;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw configurationError(`${label} contains a non-plain JSON object`);
  }
  const output: Record<string, JsonValue> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_STRUCTURE_KEYS.has(key)) {
      throw configurationError(`${label} contains unsafe object field ${key}`);
    }
    if (SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalizedKey(key).includes(fragment))) {
      throw configurationError(`${label} contains forbidden secret field ${key}`);
    }
    output[key] = safeJson(nested, `${label}.${key}`, seen);
  }
  seen.delete(value);
  return output;
}

function jsonObject(value: unknown, label: string): JsonObject {
  const parsed = safeJson(value, label);
  if (!isRecord(parsed)) {
    throw configurationError(`${label} must be a JSON object`);
  }
  return parsed as JsonObject;
}

function cloneJson<T extends JsonValue>(value: T): T {
  return JSON.parse(canonicalJson(value)) as T;
}

function hashJson(value: JsonValue): Hex {
  return keccak256(toBytes(canonicalJson(value)));
}

export function deploymentPlanHash(plan: JsonValue): Hex {
  return hashJson(safeJson(plan, "plan"));
}

function requireHash(value: unknown, label: string): Hash {
  if (typeof value !== "string" || !HASH.test(value)) {
    throw configurationError(`${label} must be a 32-byte hex hash`);
  }
  return value.toLowerCase() as Hash;
}

function requireAddress(value: unknown, label: string): Address {
  if (typeof value !== "string" || !isAddress(value, { strict: true })) {
    throw configurationError(`${label} must be an EVM address`);
  }
  return getAddress(value);
}

function requireDecimal(value: unknown, label: string): string {
  if (typeof value !== "string" || !DECIMAL.test(value)) {
    throw configurationError(`${label} must be an unsigned decimal string`);
  }
  return value;
}

function requirePositiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw configurationError(`${label} must be a positive safe integer`);
  }
  return value;
}

function requireTimestamp(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw configurationError(`${label} must be an ISO timestamp`);
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw configurationError(`${label} must be boolean`);
  return value;
}

function requireStepId(value: string): string {
  if (!STEP_ID.test(value)) {
    throw configurationError(
      `step ID ${JSON.stringify(value)} must match ${STEP_ID.source}`,
    );
  }
  return value;
}

function normalizeExpectedSteps(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw configurationError(`${label} must be a non-empty array`);
  }
  const steps = value.map((entry, index) => {
    if (typeof entry !== "string") {
      throw configurationError(`${label}[${index}] must be a step ID`);
    }
    return requireStepId(entry);
  });
  if (new Set(steps).size !== steps.length) {
    throw configurationError(`${label} cannot contain duplicate step IDs`);
  }
  return steps;
}

export function parseDeploymentRecoveryJson(
  raw: string | undefined,
): Readonly<Record<string, DeploymentStepRecovery>> {
  if (raw === undefined || raw.trim() === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw configurationError("recovery JSON is not valid JSON");
  }
  const root = record(parsed, "recovery JSON");
  const output: Record<string, DeploymentStepRecovery> = {};
  for (const [stepId, rawRecovery] of Object.entries(root)) {
    requireStepId(stepId);
    const recovery = record(rawRecovery, `recovery ${stepId}`);
    if (recovery.action === "RETRY") {
      exactKeys(recovery, ["action", "expectedAttempt"], [], `recovery ${stepId}`);
      output[stepId] = {
        action: "RETRY",
        expectedAttempt: requirePositiveInteger(
          recovery.expectedAttempt,
          `recovery ${stepId}.expectedAttempt`,
        ),
      };
      continue;
    }
    if (recovery.action === "ADOPT") {
      exactKeys(
        recovery,
        ["action", "expectedAttempt", "transactionHash"],
        [],
        `recovery ${stepId}`,
      );
      output[stepId] = {
        action: "ADOPT",
        expectedAttempt: requirePositiveInteger(
          recovery.expectedAttempt,
          `recovery ${stepId}.expectedAttempt`,
        ),
        transactionHash: requireHash(
          recovery.transactionHash,
          `recovery ${stepId}.transactionHash`,
        ),
      };
      continue;
    }
    throw configurationError(`recovery ${stepId}.action must be ADOPT or RETRY`);
  }
  return output;
}

function validateStoredRecovery(value: unknown, label: string): StoredRecovery {
  const input = record(value, label);
  if (input.action === "RETRY") {
    exactKeys(input, ["action", "expectedAttempt", "recordedAt"], ["failedSubmission"], label);
    return {
      action: "RETRY",
      expectedAttempt: requirePositiveInteger(input.expectedAttempt, `${label}.expectedAttempt`),
      recordedAt: requireTimestamp(input.recordedAt, `${label}.recordedAt`),
      ...(input.failedSubmission === undefined
        ? {}
        : {
            failedSubmission: validateFailedSubmission(
              input.failedSubmission,
              `${label}.failedSubmission`,
            ),
          }),
    };
  }
  if (input.action === "ADOPT") {
    exactKeys(
      input,
      ["action", "expectedAttempt", "recordedAt", "transactionHash"],
      [],
      label,
    );
    return {
      action: "ADOPT",
      expectedAttempt: requirePositiveInteger(input.expectedAttempt, `${label}.expectedAttempt`),
      recordedAt: requireTimestamp(input.recordedAt, `${label}.recordedAt`),
      transactionHash: requireHash(input.transactionHash, `${label}.transactionHash`),
    };
  }
  throw configurationError(`${label}.action must be ADOPT or RETRY`);
}

function validateFailedSubmission(value: unknown, label: string): FailedDeploymentSubmission {
  const input = record(value, label);
  exactKeys(
    input,
    ["transactionHash", "blockNumber", "blockHash", "status"],
    [],
    label,
  );
  if (input.status !== "reverted") {
    throw configurationError(`${label}.status must be reverted`);
  }
  return {
    transactionHash: requireHash(input.transactionHash, `${label}.transactionHash`),
    blockNumber: requireDecimal(input.blockNumber, `${label}.blockNumber`),
    blockHash: requireHash(input.blockHash, `${label}.blockHash`),
    status: "reverted",
  };
}

function normalizeFailedSubmission(
  input: FailedDeploymentSubmissionInput,
): FailedDeploymentSubmission {
  return validateFailedSubmission(
    {
      transactionHash: input.transactionHash,
      blockNumber: typeof input.blockNumber === "bigint"
        ? input.blockNumber.toString()
        : input.blockNumber,
      blockHash: input.blockHash,
      status: input.status,
    },
    "failed submission",
  );
}

function validateConfirmation(value: unknown, label: string): DeploymentConfirmation {
  const input = record(value, label);
  exactKeys(
    input,
    ["transactionHash", "blockNumber", "status"],
    ["blockHash", "contractAddress", "result"],
    label,
  );
  if (input.status !== "success") throw configurationError(`${label}.status must be success`);
  const result = input.result === undefined ? undefined : jsonObject(input.result, `${label}.result`);
  return {
    transactionHash: requireHash(input.transactionHash, `${label}.transactionHash`),
    blockNumber: requireDecimal(input.blockNumber, `${label}.blockNumber`),
    status: "success",
    ...(input.blockHash === undefined
      ? {}
      : { blockHash: requireHash(input.blockHash, `${label}.blockHash`) }),
    ...(input.contractAddress === undefined
      ? {}
      : { contractAddress: requireAddress(input.contractAddress, `${label}.contractAddress`) }),
    ...(result === undefined ? {} : { result }),
  };
}

function normalizeConfirmation(input: DeploymentConfirmationInput): DeploymentConfirmation {
  const blockNumber = typeof input.blockNumber === "bigint"
    ? input.blockNumber.toString()
    : input.blockNumber;
  return validateConfirmation(
    {
      transactionHash: input.transactionHash,
      blockNumber,
      status: input.status ?? "success",
      ...(input.blockHash === undefined ? {} : { blockHash: input.blockHash }),
      ...(input.contractAddress === undefined ? {} : { contractAddress: input.contractAddress }),
      ...(input.result === undefined ? {} : { result: input.result }),
    },
    "confirmation",
  );
}

function validateStep(value: unknown, stepId: string): DeploymentJournalStep {
  const input = record(value, `step ${stepId}`);
  const state = input.state;
  const commonRequired = ["state", "attempt", "intentAt", "recoveries"] as const;
  const recoveriesValue = input.recoveries;
  if (!Array.isArray(recoveriesValue)) {
    throw configurationError(`step ${stepId}.recoveries must be an array`);
  }
  const recoveries = recoveriesValue.map((entry, index) =>
    validateStoredRecovery(entry, `step ${stepId}.recoveries[${index}]`),
  );
  const common = {
    attempt: requirePositiveInteger(input.attempt, `step ${stepId}.attempt`),
    intentAt: requireTimestamp(input.intentAt, `step ${stepId}.intentAt`),
    recoveries,
  };
  let historicalAttempt = 1;
  let adoptedHashForAttempt: Hash | undefined;
  for (let index = 0; index < recoveries.length; index += 1) {
    const recovery = recoveries[index]!;
    if (recovery.expectedAttempt !== historicalAttempt) {
      throw configurationError(`step ${stepId} recovery does not match its historical attempt`);
    }
    if (recovery.action === "ADOPT") {
      if (adoptedHashForAttempt !== undefined) {
        throw configurationError(`step ${stepId} has duplicate ADOPT recovery for one attempt`);
      }
      adoptedHashForAttempt = recovery.transactionHash;
    } else {
      if (
        recovery.failedSubmission !== undefined &&
        adoptedHashForAttempt !== undefined &&
        recovery.failedSubmission.transactionHash !== adoptedHashForAttempt
      ) {
        throw configurationError(
          `step ${stepId} failed submission hash does not match its ADOPT recovery`,
        );
      }
      historicalAttempt += 1;
      adoptedHashForAttempt = undefined;
    }
    if (
      index > 0 &&
      Date.parse(recovery.recordedAt) < Date.parse(recoveries[index - 1]!.recordedAt)
    ) {
      throw configurationError(`step ${stepId} recovery timestamps are out of order`);
    }
  }
  if (common.attempt !== historicalAttempt) {
    throw configurationError(`step ${stepId}.attempt does not match its RETRY history`);
  }
  if (state === "INTENT") {
    exactKeys(input, commonRequired, [], `step ${stepId}`);
    if (adoptedHashForAttempt !== undefined) {
      throw configurationError(`step ${stepId} cannot remain INTENT after ADOPT in its current attempt`);
    }
    return { state, ...common };
  }
  if (state === "SUBMITTED") {
    exactKeys(
      input,
      [...commonRequired, "submittedAt", "transactionHash"],
      [],
      `step ${stepId}`,
    );
    const submittedAt = requireTimestamp(input.submittedAt, `step ${stepId}.submittedAt`);
    const transactionHash = requireHash(input.transactionHash, `step ${stepId}.transactionHash`);
    if (Date.parse(submittedAt) < Date.parse(common.intentAt)) {
      throw configurationError(`step ${stepId}.submittedAt precedes its intent`);
    }
    if (adoptedHashForAttempt !== undefined && adoptedHashForAttempt !== transactionHash) {
      throw configurationError(`step ${stepId} ADOPT hash does not match submission`);
    }
    return {
      state,
      ...common,
      submittedAt,
      transactionHash,
    };
  }
  if (state === "CONFIRMED") {
    exactKeys(
      input,
      [
        ...commonRequired,
        "submittedAt",
        "confirmedAt",
        "transactionHash",
        "confirmation",
      ],
      [],
      `step ${stepId}`,
    );
    const transactionHash = requireHash(input.transactionHash, `step ${stepId}.transactionHash`);
    const confirmation = validateConfirmation(input.confirmation, `step ${stepId}.confirmation`);
    if (confirmation.transactionHash !== transactionHash) {
      throw configurationError(`step ${stepId} confirmation hash does not match submission`);
    }
    const submittedAt = requireTimestamp(input.submittedAt, `step ${stepId}.submittedAt`);
    const confirmedAt = requireTimestamp(input.confirmedAt, `step ${stepId}.confirmedAt`);
    if (Date.parse(submittedAt) < Date.parse(common.intentAt)) {
      throw configurationError(`step ${stepId}.submittedAt precedes its intent`);
    }
    if (Date.parse(confirmedAt) < Date.parse(submittedAt)) {
      throw configurationError(`step ${stepId}.confirmedAt precedes submission`);
    }
    if (adoptedHashForAttempt !== undefined && adoptedHashForAttempt !== transactionHash) {
      throw configurationError(`step ${stepId} ADOPT hash does not match submission`);
    }
    return {
      state,
      ...common,
      submittedAt,
      confirmedAt,
      transactionHash,
      confirmation,
    };
  }
  throw configurationError(`step ${stepId}.state must be INTENT, SUBMITTED, or CONFIRMED`);
}

function validateFinalPayloads(value: unknown): FinalPayloads {
  const input = record(value, "finalPayloads");
  exactKeys(
    input,
    [
      "catalog",
      "evidence",
      "catalogHash",
      "evidenceHash",
      "stagedAt",
      "catalogPublished",
      "evidencePublished",
    ],
    ["catalogPublishedAt", "evidencePublishedAt"],
    "finalPayloads",
  );
  const catalog = safeJson(input.catalog, "finalPayloads.catalog");
  const evidence = safeJson(input.evidence, "finalPayloads.evidence");
  const catalogHash = requireHash(input.catalogHash, "finalPayloads.catalogHash");
  const evidenceHash = requireHash(input.evidenceHash, "finalPayloads.evidenceHash");
  if (catalogHash !== hashJson(catalog)) {
    throw configurationError("finalPayloads.catalogHash does not match its payload");
  }
  if (evidenceHash !== hashJson(evidence)) {
    throw configurationError("finalPayloads.evidenceHash does not match its payload");
  }
  const catalogPublished = requireBoolean(
    input.catalogPublished,
    "finalPayloads.catalogPublished",
  );
  const evidencePublished = requireBoolean(
    input.evidencePublished,
    "finalPayloads.evidencePublished",
  );
  const catalogPublishedAt = input.catalogPublishedAt === undefined
    ? undefined
    : requireTimestamp(input.catalogPublishedAt, "finalPayloads.catalogPublishedAt");
  const evidencePublishedAt = input.evidencePublishedAt === undefined
    ? undefined
    : requireTimestamp(input.evidencePublishedAt, "finalPayloads.evidencePublishedAt");
  if (catalogPublished !== (catalogPublishedAt !== undefined)) {
    throw configurationError("catalog publication flag and timestamp disagree");
  }
  if (evidencePublished !== (evidencePublishedAt !== undefined)) {
    throw configurationError("evidence publication flag and timestamp disagree");
  }
  if (catalogPublished && !evidencePublished) {
    throw configurationError("catalog cannot be published before evidence");
  }
  if (
    catalogPublishedAt !== undefined &&
    evidencePublishedAt !== undefined &&
    Date.parse(catalogPublishedAt) < Date.parse(evidencePublishedAt)
  ) {
    throw configurationError("catalog publication timestamp precedes evidence publication");
  }
  return {
    catalog,
    evidence,
    catalogHash,
    evidenceHash,
    stagedAt: requireTimestamp(input.stagedAt, "finalPayloads.stagedAt"),
    catalogPublished,
    evidencePublished,
    ...(catalogPublishedAt === undefined ? {} : { catalogPublishedAt }),
    ...(evidencePublishedAt === undefined ? {} : { evidencePublishedAt }),
  };
}

function validateJournal(value: unknown): DeploymentJournalRecord {
  const input = record(safeJson(value, "journal"), "journal");
  exactKeys(
    input,
    [
      "schemaVersion",
      "kind",
      "state",
      "revision",
      "createdAt",
      "updatedAt",
      "binding",
      "fundingPlan",
      "expectedSteps",
      "steps",
    ],
    ["finalPayloads"],
    "journal",
  );
  if (input.schemaVersion !== 1) throw configurationError("schemaVersion must be 1");
  if (input.kind !== "NOXLIMIT_SEPOLIA_DEPLOYMENT_JOURNAL") {
    throw configurationError("kind is not a NoxLimit Sepolia deployment journal");
  }
  if (
    input.state !== "IN_PROGRESS" &&
    input.state !== "OUTPUTS_STAGED" &&
    input.state !== "COMPLETE"
  ) {
    throw configurationError("state must be IN_PROGRESS, OUTPUTS_STAGED, or COMPLETE");
  }
  const bindingInput = record(input.binding, "journal.binding");
  exactKeys(
    bindingInput,
    ["planHash", "operator", "chainId", "catalogOutputPath", "evidenceOutputPath"],
    [],
    "journal.binding",
  );
  if (bindingInput.chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) {
    throw configurationError(`journal.binding.chainId must be ${ETHEREUM_SEPOLIA_CHAIN_ID}`);
  }
  if (
    typeof bindingInput.catalogOutputPath !== "string" ||
    resolve(bindingInput.catalogOutputPath) !== bindingInput.catalogOutputPath
  ) {
    throw configurationError("journal.binding.catalogOutputPath must be absolute");
  }
  if (
    typeof bindingInput.evidenceOutputPath !== "string" ||
    resolve(bindingInput.evidenceOutputPath) !== bindingInput.evidenceOutputPath
  ) {
    throw configurationError("journal.binding.evidenceOutputPath must be absolute");
  }
  const expectedSteps = normalizeExpectedSteps(input.expectedSteps, "journal.expectedSteps");
  const expectedStepSet = new Set(expectedSteps);
  const stepsInput = record(input.steps, "journal.steps");
  const steps: Record<string, DeploymentJournalStep> = {};
  for (const [stepId, step] of Object.entries(stepsInput)) {
    requireStepId(stepId);
    if (!expectedStepSet.has(stepId)) {
      throw configurationError(`journal contains undeclared deployment step ${stepId}`);
    }
    steps[stepId] = validateStep(step, stepId);
  }
  let blockedByEarlierStep = false;
  for (const stepId of expectedSteps) {
    const step = steps[stepId];
    if (step === undefined) {
      blockedByEarlierStep = true;
      continue;
    }
    if (blockedByEarlierStep) {
      throw configurationError(`journal step ${stepId} appears before its predecessors completed`);
    }
    if (step.state !== "CONFIRMED") blockedByEarlierStep = true;
  }
  const finalPayloads = input.finalPayloads === undefined
    ? undefined
    : validateFinalPayloads(input.finalPayloads);
  if (input.state === "IN_PROGRESS" && finalPayloads !== undefined) {
    throw configurationError("IN_PROGRESS journal cannot contain final payloads");
  }
  if (input.state !== "IN_PROGRESS" && finalPayloads === undefined) {
    throw configurationError(`${input.state} journal requires final payloads`);
  }
  if (
    input.state === "COMPLETE" &&
    (!finalPayloads?.catalogPublished || !finalPayloads.evidencePublished)
  ) {
    throw configurationError("COMPLETE journal requires both final outputs to be published");
  }
  if (
    input.state !== "IN_PROGRESS" &&
    expectedSteps.some((stepId) => steps[stepId]?.state !== "CONFIRMED")
  ) {
    throw configurationError(`${input.state} journal requires every expected step to be CONFIRMED`);
  }
  const createdAt = requireTimestamp(input.createdAt, "journal.createdAt");
  const updatedAt = requireTimestamp(input.updatedAt, "journal.updatedAt");
  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    throw configurationError("journal.updatedAt precedes createdAt");
  }
  return {
    schemaVersion: 1,
    kind: "NOXLIMIT_SEPOLIA_DEPLOYMENT_JOURNAL",
    state: input.state,
    revision: requireDecimal(input.revision, "journal.revision"),
    createdAt,
    updatedAt,
    binding: {
      planHash: requireHash(bindingInput.planHash, "journal.binding.planHash"),
      operator: requireAddress(bindingInput.operator, "journal.binding.operator"),
      chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
      catalogOutputPath: bindingInput.catalogOutputPath,
      evidenceOutputPath: bindingInput.evidenceOutputPath,
    },
    fundingPlan: jsonObject(input.fundingPlan, "journal.fundingPlan"),
    expectedSteps,
    steps,
    ...(finalPayloads === undefined ? {} : { finalPayloads }),
  };
}

async function ensureWritableParent(path: string): Promise<void> {
  const parent = dirname(path);
  let parentStats;
  try {
    parentStats = await stat(parent);
    await access(parent, fsConstants.W_OK | fsConstants.X_OK);
  } catch (error) {
    const code = fileError(error)?.code;
    throw configurationError(
      `output parent for ${path} is not accessible${code ? ` (${code})` : ""}`,
    );
  }
  if (!parentStats.isDirectory()) {
    throw configurationError(`output parent for ${path} is not a directory`);
  }
}

async function readJson(path: string, label: string): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    const code = fileError(error)?.code;
    throw configurationError(`cannot read ${label}${code ? ` (${code})` : ""}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw configurationError(`${label} is not valid JSON`);
  }
}

async function readIfExists(path: string, label: string): Promise<unknown | undefined> {
  try {
    return await readJson(path, label);
  } catch (error) {
    const cause = fileError(error);
    if (cause?.code === "ENOENT") return undefined;
    // readJson intentionally wraps failures, so inspect directly when absence is possible.
    try {
      await stat(path);
    } catch (statError) {
      if (fileError(statError)?.code === "ENOENT") return undefined;
    }
    throw error;
  }
}

function serialized(value: JsonValue): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeTemporary(target: string, value: JsonValue): Promise<string> {
  await ensureWritableParent(target);
  const temporary = `${target}.tmp-${process.pid}-${randomUUID()}`;
  const handle = await open(temporary, "wx", 0o600).catch((error: unknown) => {
    const code = fileError(error)?.code;
    throw configurationError(`cannot create temporary journal file${code ? ` (${code})` : ""}`);
  });
  try {
    await handle.writeFile(serialized(value), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  return temporary;
}

async function syncParent(path: string): Promise<void> {
  let handle;
  try {
    handle = await open(dirname(path), "r");
    await handle.sync();
  } catch (error) {
    const code = fileError(error)?.code;
    if (code !== "EINVAL" && code !== "ENOTSUP" && code !== "EPERM" && code !== "EISDIR") {
      throw configurationError(`cannot sync output directory${code ? ` (${code})` : ""}`);
    }
  } finally {
    await handle?.close();
  }
}

async function withJournalLock<T>(journalPath: string, operation: () => Promise<T>): Promise<T> {
  const lockPath = `${journalPath}.lock`;
  await ensureWritableParent(lockPath);
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
  } catch (error) {
    const code = fileError(error)?.code;
    if (code === "EEXIST") {
      throw configurationError(
        `journal is locked by another operator process at ${lockPath}; if it is stale, verify no deployment process is active before removing that exact lock file`,
      );
    }
    throw configurationError(`cannot acquire journal lock${code ? ` (${code})` : ""}`);
  }
  try {
    await handle.writeFile(
      `${JSON.stringify({ schemaVersion: 1, pid: process.pid, createdAt: new Date().toISOString() })}\n`,
      "utf8",
    );
    await handle.sync();
    await syncParent(lockPath);
    return await operation();
  } finally {
    await handle.close();
    await rm(lockPath, { force: true });
    await syncParent(lockPath);
  }
}

async function createJsonAtomic(target: string, value: JsonValue): Promise<void> {
  const temporary = await writeTemporary(target, value);
  try {
    await link(temporary, target);
    await syncParent(target);
  } catch (error) {
    const code = fileError(error)?.code;
    if (code === "EEXIST") {
      throw configurationError(`refusing to overwrite existing output ${target}`);
    }
    throw configurationError(`cannot publish create-only output${code ? ` (${code})` : ""}`);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function replaceJsonAtomic(target: string, value: JsonValue): Promise<void> {
  const temporary = await writeTemporary(target, value);
  try {
    await rename(temporary, target);
    await syncParent(target);
  } catch (error) {
    const code = fileError(error)?.code;
    throw configurationError(`cannot atomically update journal${code ? ` (${code})` : ""}`);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function ensureAbsent(path: string): Promise<void> {
  try {
    await stat(path);
  } catch (error) {
    if (fileError(error)?.code === "ENOENT") {
      await ensureWritableParent(path);
      return;
    }
    const code = fileError(error)?.code;
    throw configurationError(`cannot inspect output ${path}${code ? ` (${code})` : ""}`);
  }
  throw configurationError(`refusing to overwrite existing output ${path}`);
}

async function outputMatches(path: string, payload: JsonValue): Promise<boolean | undefined> {
  let existing: unknown;
  try {
    existing = await readJson(path, `output ${path}`);
  } catch (error) {
    try {
      await stat(path);
    } catch (statError) {
      if (fileError(statError)?.code === "ENOENT") return undefined;
    }
    throw error;
  }
  const parsed = safeJson(existing, `output ${path}`);
  return canonicalJson(parsed) === canonicalJson(payload);
}

async function publishExact(path: string, payload: JsonValue): Promise<void> {
  const prior = await outputMatches(path, payload);
  if (prior === true) return;
  if (prior === false) throw configurationError(`existing output ${path} does not match journal`);
  try {
    await createJsonAtomic(path, payload);
  } catch (error) {
    if ((await outputMatches(path, payload)) === true) return;
    throw error;
  }
}

function bindingFor(input: OpenDeploymentJournalInput): DeploymentJournalRecord["binding"] {
  if (input.chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) {
    throw configurationError(`chainId must be Ethereum Sepolia ${ETHEREUM_SEPOLIA_CHAIN_ID}`);
  }
  const catalogOutputPath = resolve(input.catalogOutputPath);
  const evidenceOutputPath = resolve(input.evidenceOutputPath);
  if (catalogOutputPath === evidenceOutputPath) {
    throw configurationError("catalog and evidence outputs must use different paths");
  }
  return {
    planHash: deploymentPlanHash(input.plan),
    operator: requireAddress(input.operator, "operator"),
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    catalogOutputPath,
    evidenceOutputPath,
  };
}

async function verifyOutputState(recordValue: DeploymentJournalRecord): Promise<void> {
  const finalPayloads = recordValue.finalPayloads;
  for (const [label, path, payload, published] of [
    [
      "catalog",
      recordValue.binding.catalogOutputPath,
      finalPayloads?.catalog,
      finalPayloads?.catalogPublished ?? false,
    ],
    [
      "evidence",
      recordValue.binding.evidenceOutputPath,
      finalPayloads?.evidence,
      finalPayloads?.evidencePublished ?? false,
    ],
  ] as const) {
    if (payload === undefined) {
      if ((await outputMatches(path, null)) !== undefined) {
        throw configurationError(`${label} output exists before final payloads were staged`);
      }
      continue;
    }
    const match = await outputMatches(path, payload);
    if (match === false) throw configurationError(`${label} output does not match staged payload`);
    if (published && match !== true) {
      throw configurationError(`${label} is marked published but its output is absent`);
    }
  }
}

export class DeploymentJournal {
  readonly #path: string;
  readonly #recovery: Readonly<Record<string, DeploymentStepRecovery>>;
  #record: DeploymentJournalRecord;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(
    path: string,
    recordValue: DeploymentJournalRecord,
    recovery: Readonly<Record<string, DeploymentStepRecovery>>,
  ) {
    this.#path = path;
    this.#record = recordValue;
    this.#recovery = recovery;
  }

  snapshot(): DeploymentJournalRecord {
    return cloneJson(this.#record as unknown as JsonValue) as DeploymentJournalRecord;
  }

  prepareStep(stepIdValue: string): Promise<DeploymentStepDisposition> {
    return this.#serialize(async () => {
      const stepId = requireStepId(stepIdValue);
      if (this.#record.state !== "IN_PROGRESS") {
        throw configurationError(`cannot prepare ${stepId} after final payload staging`);
      }
      const expectedIndex = this.#record.expectedSteps.indexOf(stepId);
      if (expectedIndex === -1) {
        throw configurationError(`${stepId} is not declared in the frozen deployment step manifest`);
      }
      const existing = this.#record.steps[stepId];
      const recovery = this.#recovery[stepId];
      if (existing === undefined) {
        if (recovery !== undefined) {
          throw configurationError(`recovery for ${stepId} cannot apply before its first intent`);
        }
        const incompletePredecessor = this.#record.expectedSteps
          .slice(0, expectedIndex)
          .find((predecessor) => this.#record.steps[predecessor]?.state !== "CONFIRMED");
        if (incompletePredecessor !== undefined) {
          throw configurationError(
            `${stepId} cannot start before expected step ${incompletePredecessor} is CONFIRMED`,
          );
        }
        const now = new Date().toISOString();
        await this.#update((current) => ({
          ...current,
          steps: {
            ...current.steps,
            [stepId]: {
              state: "INTENT",
              attempt: 1,
              intentAt: now,
              recoveries: [],
            },
          },
        }));
        return { action: "SUBMIT", attempt: 1 };
      }
      if (existing.state === "SUBMITTED") {
        if (recovery !== undefined) {
          if (recovery.expectedAttempt !== existing.attempt) {
            throw configurationError(
              `${stepId} recovery expected attempt ${recovery.expectedAttempt}, but current attempt is ${existing.attempt}`,
            );
          }
          if (recovery.action !== "RETRY") {
            throw configurationError(
              `${stepId} is already SUBMITTED; only RETRY may apply after its persisted transaction is proven reverted`,
            );
          }
          return {
            action: "VERIFY_FAILED_SUBMISSION",
            attempt: existing.attempt,
            transactionHash: existing.transactionHash,
          };
        }
        return {
          action: "RESUME_SUBMITTED",
          attempt: existing.attempt,
          transactionHash: existing.transactionHash,
        };
      }
      if (existing.state === "CONFIRMED") {
        return {
          action: "RESUME_CONFIRMED",
          attempt: existing.attempt,
          transactionHash: existing.transactionHash,
          confirmation: existing.confirmation,
        };
      }
      if (recovery === undefined) {
        throw configurationError(
          `${stepId} has an unresolved INTENT without a transaction hash; provide explicit ADOPT or RETRY recovery JSON`,
        );
      }
      if (recovery.expectedAttempt !== existing.attempt) {
        throw configurationError(
          `${stepId} recovery expected attempt ${recovery.expectedAttempt}, but current attempt is ${existing.attempt}`,
        );
      }
      const now = new Date().toISOString();
      if (recovery.action === "ADOPT") {
        await this.#update((current) => {
          const intent = current.steps[stepId];
          if (intent?.state !== "INTENT") throw configurationError(`${stepId} is no longer INTENT`);
          return {
            ...current,
            steps: {
              ...current.steps,
              [stepId]: {
                ...intent,
                state: "SUBMITTED",
                submittedAt: now,
                transactionHash: recovery.transactionHash,
                recoveries: [
                  ...intent.recoveries,
                  {
                    action: "ADOPT",
                    expectedAttempt: recovery.expectedAttempt,
                    recordedAt: now,
                    transactionHash: recovery.transactionHash,
                  },
                ],
              },
            },
          };
        });
        return {
          action: "RESUME_SUBMITTED",
          attempt: existing.attempt,
          transactionHash: recovery.transactionHash,
        };
      }
      await this.#update((current) => {
        const intent = current.steps[stepId];
        if (intent?.state !== "INTENT") throw configurationError(`${stepId} is no longer INTENT`);
        return {
          ...current,
          steps: {
            ...current.steps,
            [stepId]: {
              state: "INTENT",
              attempt: intent.attempt + 1,
              intentAt: now,
              recoveries: [
                ...intent.recoveries,
                {
                  action: "RETRY",
                  expectedAttempt: recovery.expectedAttempt,
                  recordedAt: now,
                },
              ],
            },
          },
        };
      });
      return { action: "SUBMIT", attempt: existing.attempt + 1 };
    });
  }

  recordFailedSubmittedRetry(
    stepIdValue: string,
    input: FailedDeploymentSubmissionInput,
  ): Promise<void> {
    return this.#serialize(async () => {
      const stepId = requireStepId(stepIdValue);
      const failure = normalizeFailedSubmission(input);
      const recovery = this.#recovery[stepId];
      if (recovery?.action !== "RETRY") {
        throw configurationError(
          `${stepId} failed submission retry requires explicit RETRY recovery JSON`,
        );
      }
      const existing = this.#record.steps[stepId];
      if (existing?.state !== "SUBMITTED") {
        throw configurationError(`${stepId} must be SUBMITTED before failed-transaction retry`);
      }
      if (recovery.expectedAttempt !== existing.attempt) {
        throw configurationError(
          `${stepId} recovery expected attempt ${recovery.expectedAttempt}, but current attempt is ${existing.attempt}`,
        );
      }
      if (failure.transactionHash !== existing.transactionHash) {
        throw configurationError(`${stepId} failed submission hash mismatch`);
      }
      const now = new Date().toISOString();
      await this.#update((current) => {
        const submitted = current.steps[stepId];
        if (submitted?.state !== "SUBMITTED") {
          throw configurationError(`${stepId} is no longer SUBMITTED`);
        }
        if (submitted.transactionHash !== failure.transactionHash) {
          throw configurationError(`${stepId} failed submission hash mismatch`);
        }
        return {
          ...current,
          steps: {
            ...current.steps,
            [stepId]: {
              state: "INTENT",
              attempt: submitted.attempt + 1,
              intentAt: now,
              recoveries: [
                ...submitted.recoveries,
                {
                  action: "RETRY",
                  expectedAttempt: recovery.expectedAttempt,
                  recordedAt: now,
                  failedSubmission: failure,
                },
              ],
            },
          },
        };
      });
    });
  }

  recordSubmitted(stepIdValue: string, transactionHashValue: Hash): Promise<void> {
    return this.#serialize(async () => {
      const stepId = requireStepId(stepIdValue);
      const transactionHash = requireHash(transactionHashValue, `${stepId} transaction hash`);
      const existing = this.#record.steps[stepId];
      if (existing === undefined) throw configurationError(`${stepId} has no persisted INTENT`);
      if (existing.state !== "INTENT") {
        if (existing.transactionHash !== transactionHash) {
          throw configurationError(`${stepId} transaction hash mismatch`);
        }
        return;
      }
      const now = new Date().toISOString();
      await this.#update((current) => {
        const intent = current.steps[stepId];
        if (intent?.state !== "INTENT") throw configurationError(`${stepId} is no longer INTENT`);
        return {
          ...current,
          steps: {
            ...current.steps,
            [stepId]: {
              ...intent,
              state: "SUBMITTED",
              submittedAt: now,
              transactionHash,
            },
          },
        };
      });
    });
  }

  recordConfirmed(stepIdValue: string, input: DeploymentConfirmationInput): Promise<void> {
    return this.#serialize(async () => {
      const stepId = requireStepId(stepIdValue);
      const confirmation = normalizeConfirmation(input);
      const existing = this.#record.steps[stepId];
      if (existing === undefined || existing.state === "INTENT") {
        throw configurationError(`${stepId} must be SUBMITTED before confirmation`);
      }
      if (existing.transactionHash !== confirmation.transactionHash) {
        throw configurationError(`${stepId} confirmation hash mismatch`);
      }
      if (existing.state === "CONFIRMED") {
        if (canonicalJson(existing.confirmation) !== canonicalJson(confirmation)) {
          throw configurationError(`${stepId} confirmation payload mismatch`);
        }
        return;
      }
      const now = new Date().toISOString();
      await this.#update((current) => {
        const submitted = current.steps[stepId];
        if (submitted?.state !== "SUBMITTED") {
          throw configurationError(`${stepId} is no longer SUBMITTED`);
        }
        if (submitted.transactionHash !== confirmation.transactionHash) {
          throw configurationError(`${stepId} confirmation hash mismatch`);
        }
        return {
          ...current,
          steps: {
            ...current.steps,
            [stepId]: {
              ...submitted,
              state: "CONFIRMED",
              confirmedAt: now,
              confirmation,
            },
          },
        };
      });
    });
  }

  stageFinalPayloads(input: Readonly<{ catalog: JsonValue; evidence: JsonValue }>): Promise<void> {
    return this.#serialize(async () => {
      const catalog = safeJson(input.catalog, "catalog payload");
      const evidence = safeJson(input.evidence, "evidence payload");
      const existing = this.#record.finalPayloads;
      if (existing !== undefined) {
        if (
          canonicalJson(existing.catalog) !== canonicalJson(catalog) ||
          canonicalJson(existing.evidence) !== canonicalJson(evidence)
        ) {
          throw configurationError("final payloads do not match the staged journal payloads");
        }
        return;
      }
      const incompleteStep = this.#record.expectedSteps.find(
        (stepId) => this.#record.steps[stepId]?.state !== "CONFIRMED",
      );
      if (incompleteStep !== undefined) {
        throw configurationError(
          `expected deployment step ${incompleteStep} must be CONFIRMED before outputs`,
        );
      }
      await Promise.all([
        ensureAbsent(this.#record.binding.catalogOutputPath),
        ensureAbsent(this.#record.binding.evidenceOutputPath),
      ]);
      const now = new Date().toISOString();
      await this.#update((current) => ({
        ...current,
        state: "OUTPUTS_STAGED",
        finalPayloads: {
          catalog,
          evidence,
          catalogHash: hashJson(catalog),
          evidenceHash: hashJson(evidence),
          stagedAt: now,
          catalogPublished: false,
          evidencePublished: false,
        },
      }));
    });
  }

  publishFinalOutputs(): Promise<{
    catalogPath: string;
    evidencePath: string;
    state: "COMPLETE";
  }> {
    return this.#serialize(async () => {
      const staged = this.#record.finalPayloads;
      if (staged === undefined) {
        throw configurationError("final payloads must be staged before publication");
      }
      if (!staged.evidencePublished) {
        await publishExact(this.#record.binding.evidenceOutputPath, staged.evidence);
        const publishedAt = new Date().toISOString();
        await this.#update((current) => ({
          ...current,
          finalPayloads: {
            ...current.finalPayloads!,
            evidencePublished: true,
            evidencePublishedAt: publishedAt,
          },
        }));
      }
      if (!this.#record.finalPayloads!.catalogPublished) {
        await publishExact(
          this.#record.binding.catalogOutputPath,
          this.#record.finalPayloads!.catalog,
        );
        const publishedAt = new Date().toISOString();
        await this.#update((current) => ({
          ...current,
          finalPayloads: {
            ...current.finalPayloads!,
            catalogPublished: true,
            catalogPublishedAt: publishedAt,
          },
        }));
      }
      await verifyOutputState(this.#record);
      if (this.#record.state !== "COMPLETE") {
        await this.#update((current) => ({ ...current, state: "COMPLETE" }));
      }
      await verifyOutputState(this.#record);
      return {
        catalogPath: this.#record.binding.catalogOutputPath,
        evidencePath: this.#record.binding.evidenceOutputPath,
        state: "COMPLETE",
      };
    });
  }

  #serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(operation, operation);
    this.#queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async #update(
    update: (current: DeploymentJournalRecord) => DeploymentJournalRecord,
  ): Promise<void> {
    await withJournalLock(this.#path, async () => {
      const disk = validateJournal(await readJson(this.#path, "deployment journal"));
      if (
        disk.revision !== this.#record.revision ||
        canonicalJson(disk) !== canonicalJson(this.#record)
      ) {
        throw configurationError("journal changed outside this operator process");
      }
      const now = new Date().toISOString();
      const next = validateJournal({
        ...update(this.#record),
        revision: (BigInt(this.#record.revision) + 1n).toString(),
        updatedAt: now,
      });
      await replaceJsonAtomic(this.#path, next as unknown as JsonValue);
      this.#record = next;
    });
  }
}

export async function openDeploymentJournal(
  input: OpenDeploymentJournalInput,
): Promise<DeploymentJournal> {
  const journalPath = resolve(input.journalPath);
  const binding = bindingFor(input);
  if (
    journalPath === binding.catalogOutputPath ||
    journalPath === binding.evidenceOutputPath ||
    `${journalPath}.lock` === binding.catalogOutputPath ||
    `${journalPath}.lock` === binding.evidenceOutputPath
  ) {
    throw configurationError("journal and lock paths must differ from final output paths");
  }
  const recovery = parseDeploymentRecoveryJson(input.recoveryJson);
  const existing = await readIfExists(journalPath, "deployment journal");
  let journal: DeploymentJournalRecord;
  if (existing === undefined) {
    if (Object.keys(recovery).length > 0) {
      throw configurationError("recovery JSON requires an existing recoverable deployment step");
    }
    if (input.fundingPlan === undefined) {
      throw configurationError("funding plan is required when creating a fresh journal");
    }
    if (input.expectedSteps === undefined) {
      throw configurationError("expected steps are required when creating a fresh journal");
    }
    const fundingPlan = jsonObject(input.fundingPlan, "funding plan");
    const expectedSteps = normalizeExpectedSteps(input.expectedSteps, "expected steps");
    await Promise.all([
      ensureAbsent(journalPath),
      ensureAbsent(binding.catalogOutputPath),
      ensureAbsent(binding.evidenceOutputPath),
    ]);
    const now = new Date().toISOString();
    journal = validateJournal({
      schemaVersion: 1,
      kind: "NOXLIMIT_SEPOLIA_DEPLOYMENT_JOURNAL",
      state: "IN_PROGRESS",
      revision: "0",
      createdAt: now,
      updatedAt: now,
      binding,
      fundingPlan,
      expectedSteps,
      steps: {},
    });
    await createJsonAtomic(journalPath, journal as unknown as JsonValue);
  } else {
    journal = validateJournal(existing);
    if (canonicalJson(journal.binding) !== canonicalJson(binding)) {
      throw configurationError("plan, operator, chain, or output-path binding mismatch");
    }
    if (input.fundingPlan !== undefined) {
      const fundingPlan = jsonObject(input.fundingPlan, "funding plan");
      if (canonicalJson(journal.fundingPlan) !== canonicalJson(fundingPlan)) {
        throw configurationError("funding plan mismatch");
      }
    }
    if (input.expectedSteps !== undefined) {
      const expectedSteps = normalizeExpectedSteps(input.expectedSteps, "expected steps");
      if (canonicalJson(journal.expectedSteps) !== canonicalJson(expectedSteps)) {
        throw configurationError("expected step manifest mismatch");
      }
    }
    await verifyOutputState(journal);
    for (const stepId of Object.keys(recovery)) {
      const step = journal.steps[stepId];
      const instruction = recovery[stepId]!;
      if (step === undefined) {
        throw configurationError(`recovery for ${stepId} requires an existing deployment step`);
      }
      if (instruction.action === "ADOPT" && step.state !== "INTENT") {
        throw configurationError(`ADOPT recovery for ${stepId} requires an unresolved INTENT`);
      }
      if (
        instruction.action === "RETRY" &&
        step.state !== "INTENT" &&
        step.state !== "SUBMITTED"
      ) {
        throw configurationError(
          `RETRY recovery for ${stepId} requires an unresolved INTENT or SUBMITTED transaction`,
        );
      }
      if (instruction.expectedAttempt !== step.attempt) {
        throw configurationError(
          `recovery for ${stepId} expected attempt ${instruction.expectedAttempt}, but current attempt is ${step.attempt}`,
        );
      }
    }
  }
  return new DeploymentJournal(journalPath, journal, recovery);
}
