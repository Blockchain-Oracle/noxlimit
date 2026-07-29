import { isHex, type Hex } from "viem";

export const LIVE_REDEMPTION_CONFIRMATION = "RUN_REAL_SEPOLIA_RESOLUTION_AND_REDEMPTION";

export type LiveRedemptionRecoveryInput = Readonly<{
  action: "ADOPT" | "RETRY";
  expectedAttempt: number;
  transactionHash: Hex;
}>;

export type LiveRedemptionSettings = Readonly<{
  webOrigin: string;
  apiOrigin: string;
  rpcUrl: string;
  marketId: Hex;
  positionId: Hex;
  expectedWinner: "YES" | "NO";
  selectedRoundId: bigint;
  predecessorRoundId: bigint;
  evidencePath: string;
  timeoutMs: number;
  privateKey: Hex;
  recovery: Readonly<Partial<Record<"resolution" | "redemption", LiveRedemptionRecoveryInput>>>;
}>;

export type LiveRedemptionSettingsResult =
  | Readonly<{ enabled: true; settings: LiveRedemptionSettings }>
  | Readonly<{ enabled: false; reason: string }>;

/**
 * Separate, explicit opt-in for the Phase 6 objective-resolution and redemption proof.
 * No order secret or private maximum is involved. The private key is parsed only in Node and is
 * deleted from the worker environment before Chromium starts.
 *
 * Required environment:
 * - LIVE_REDEMPTION_CONFIRM=RUN_REAL_SEPOLIA_RESOLUTION_AND_REDEMPTION
 * - LIVE_REDEMPTION_PRIVATE_KEY, LIVE_REDEMPTION_RPC_URL
 * - LIVE_REDEMPTION_MARKET_ID, LIVE_REDEMPTION_POSITION_ID
 * - LIVE_REDEMPTION_EXPECTED_WINNER=YES|NO
 * - LIVE_REDEMPTION_SELECTED_ROUND_ID, LIVE_REDEMPTION_PREDECESSOR_ROUND_ID
 *
 * Optional environment:
 * - LIVE_REDEMPTION_WEB_ORIGIN (default http://127.0.0.1:3000)
 * - LIVE_REDEMPTION_API_ORIGIN (default http://127.0.0.1:8787)
 * - LIVE_REDEMPTION_TIMEOUT_MS (5–30 minutes, default 15 minutes)
 * - LIVE_REDEMPTION_EVIDENCE_PATH (create-only; default ignored test-results output)
 * - LIVE_REDEMPTION_RECOVERY_JSON (attempt-bound ADOPT or RETRY for one bare INTENT)
 */
export function readLiveRedemptionSettings(
  environment: NodeJS.ProcessEnv = process.env,
): LiveRedemptionSettingsResult {
  const required = [
    "LIVE_REDEMPTION_PRIVATE_KEY",
    "LIVE_REDEMPTION_RPC_URL",
    "LIVE_REDEMPTION_MARKET_ID",
    "LIVE_REDEMPTION_POSITION_ID",
    "LIVE_REDEMPTION_EXPECTED_WINNER",
    "LIVE_REDEMPTION_SELECTED_ROUND_ID",
    "LIVE_REDEMPTION_PREDECESSOR_ROUND_ID",
  ] as const;
  const missing = required.filter((name) => !environment[name]?.trim());
  if (environment.LIVE_REDEMPTION_CONFIRM !== LIVE_REDEMPTION_CONFIRMATION || missing.length > 0) {
    const detail = missing.length > 0 ? ` Missing: ${missing.join(", ")}.` : "";
    return {
      enabled: false,
      reason: `Live Sepolia redemption writes are disabled. Set LIVE_REDEMPTION_CONFIRM=${LIVE_REDEMPTION_CONFIRMATION}.${detail}`,
    };
  }

  const privateKey = environment.LIVE_REDEMPTION_PRIVATE_KEY!;
  const marketId = environment.LIVE_REDEMPTION_MARKET_ID!;
  const positionId = environment.LIVE_REDEMPTION_POSITION_ID!;
  const expectedWinner = environment.LIVE_REDEMPTION_EXPECTED_WINNER!;
  if (!isHex(privateKey, { strict: true }) || privateKey.length !== 66) return invalid("LIVE_REDEMPTION_PRIVATE_KEY");
  if (!isHex(marketId, { strict: true }) || marketId.length !== 66) return invalid("LIVE_REDEMPTION_MARKET_ID");
  if (!isHex(positionId, { strict: true }) || positionId.length !== 66) return invalid("LIVE_REDEMPTION_POSITION_ID");
  if (expectedWinner !== "YES" && expectedWinner !== "NO") return invalid("LIVE_REDEMPTION_EXPECTED_WINNER");

  const selectedRoundId = roundId(environment.LIVE_REDEMPTION_SELECTED_ROUND_ID!);
  const predecessorRoundId = roundId(environment.LIVE_REDEMPTION_PREDECESSOR_ROUND_ID!);
  if (selectedRoundId === null) return invalid("LIVE_REDEMPTION_SELECTED_ROUND_ID");
  if (predecessorRoundId === null) return invalid("LIVE_REDEMPTION_PREDECESSOR_ROUND_ID");
  if (selectedRoundId === predecessorRoundId) return invalid("LIVE_REDEMPTION round pair");

  const webOrigin = origin(environment.LIVE_REDEMPTION_WEB_ORIGIN ?? "http://127.0.0.1:3000", "LIVE_REDEMPTION_WEB_ORIGIN");
  if (typeof webOrigin !== "string") return webOrigin;
  const apiOrigin = origin(environment.LIVE_REDEMPTION_API_ORIGIN ?? "http://127.0.0.1:8787", "LIVE_REDEMPTION_API_ORIGIN");
  if (typeof apiOrigin !== "string") return apiOrigin;
  const rpcUrl = url(environment.LIVE_REDEMPTION_RPC_URL!, "LIVE_REDEMPTION_RPC_URL");
  if (typeof rpcUrl !== "string") return rpcUrl;
  const timeoutMs = boundedInteger(environment.LIVE_REDEMPTION_TIMEOUT_MS, 15 * 60_000, 5 * 60_000, 30 * 60_000);
  if (timeoutMs === null) return invalid("LIVE_REDEMPTION_TIMEOUT_MS");
  let recovery: LiveRedemptionSettings["recovery"];
  try { recovery = parseRecoveryJson(environment.LIVE_REDEMPTION_RECOVERY_JSON); }
  catch { return invalid("LIVE_REDEMPTION_RECOVERY_JSON"); }

  return {
    enabled: true,
    settings: {
      webOrigin,
      apiOrigin,
      rpcUrl,
      marketId: marketId as Hex,
      positionId: positionId as Hex,
      expectedWinner,
      selectedRoundId,
      predecessorRoundId,
      evidencePath: environment.LIVE_REDEMPTION_EVIDENCE_PATH?.trim()
        || "test-results/live-sepolia-redemption-redacted.json",
      timeoutMs,
      privateKey: privateKey as Hex,
      recovery,
    },
  };
}

export function parseRecoveryJson(
  raw: string | undefined,
): LiveRedemptionSettings["recovery"] {
  if (raw === undefined || raw.trim() === "") return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!plainRecord(parsed)) throw new Error("Recovery JSON must be an object.");
  const output: Partial<Record<"resolution" | "redemption", LiveRedemptionRecoveryInput>> = {};
  for (const [kind, value] of Object.entries(parsed)) {
    if (kind !== "resolution" && kind !== "redemption") throw new Error("Recovery action is unknown.");
    if (!plainRecord(value)) throw new Error("Recovery entry must be an object.");
    const keys = Object.keys(value).sort();
    if (keys.join(",") !== "action,expectedAttempt,transactionHash") {
      throw new Error("Recovery entry has unexpected fields.");
    }
    if (value.action !== "ADOPT" && value.action !== "RETRY") throw new Error("Recovery action is invalid.");
    if (!Number.isSafeInteger(value.expectedAttempt) || (value.expectedAttempt as number) < 1) {
      throw new Error("Recovery attempt is invalid.");
    }
    if (typeof value.transactionHash !== "string" || !isHex(value.transactionHash, { strict: true }) || value.transactionHash.length !== 66) {
      throw new Error("Recovery transaction hash is invalid.");
    }
    output[kind] = {
      action: value.action,
      expectedAttempt: value.expectedAttempt as number,
      transactionHash: value.transactionHash as Hex,
    };
  }
  return output;
}

function roundId(value: string): bigint | null {
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = BigInt(value);
  return parsed < 2n ** 80n ? parsed : null;
}

function invalid(name: string): LiveRedemptionSettingsResult {
  return { enabled: false, reason: `${name} is invalid; the live redemption harness will not start.` };
}

function origin(value: string, name: string): string | LiveRedemptionSettingsResult {
  try { return new URL(value).origin; }
  catch { return invalid(name); }
}

function url(value: string, name: string): string | LiveRedemptionSettingsResult {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return invalid(name);
    return parsed.toString();
  } catch { return invalid(name); }
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number | null {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
