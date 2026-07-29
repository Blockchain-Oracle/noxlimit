import {
  TEST_USDC_DECIMALS,
  decimalToAtoms,
  type MarketSide,
} from "@noxlimit/protocol";
import { getAddress, isAddress, isHex, type Address, type Hex } from "viem";

export const LIVE_CONFIRMATION = "RUN_REAL_SEPOLIA_WRITES";
export type LiveFundingMode = "REQUIRED" | "ALREADY_FUNDED";

export type LiveSepoliaSettings = Readonly<{
  webOrigin: string;
  apiOrigin: string;
  rpcUrl: string;
  marketId: Hex;
  fundingTreasury: Address;
  fundingMode: LiveFundingMode;
  side: MarketSide;
  amount: string;
  amountAtoms: bigint;
  privateMaximum: string;
  fillTimeoutMs: number;
  evidencePath: string;
  privateKey: Hex;
}>;

export type LiveSettingsResult =
  | Readonly<{ enabled: true; settings: LiveSepoliaSettings }>
  | Readonly<{ enabled: false; reason: string }>;

/**
 * The live harness is intentionally impossible to enable by accident. Every value that affects a
 * real write is explicit. The private maximum and key are never included in validation messages.
 *
 * Required environment:
 * - LIVE_SEPOLIA_CONFIRM=RUN_REAL_SEPOLIA_WRITES
 * - LIVE_SEPOLIA_PRIVATE_KEY, LIVE_SEPOLIA_RPC_URL, LIVE_SEPOLIA_MARKET_ID
 * - LIVE_SEPOLIA_FUNDING_TREASURY_ADDRESS, LIVE_SEPOLIA_SIDE
 * - LIVE_SEPOLIA_FUNDING_MODE=REQUIRED for the first run, or ALREADY_FUNDED for the second
 * - LIVE_SEPOLIA_AMOUNT (capped at 25), LIVE_SEPOLIA_PRIVATE_MAXIMUM (capped at 1)
 *
 * Optional environment:
 * - LIVE_SEPOLIA_WEB_ORIGIN (default http://127.0.0.1:3000)
 * - LIVE_SEPOLIA_API_ORIGIN (default http://127.0.0.1:8787)
 * - LIVE_SEPOLIA_FILL_TIMEOUT_MS (1–30 minutes, default 20 minutes)
 * - LIVE_SEPOLIA_EVIDENCE_PATH (create-only, default ignored test-results output)
 */
export function readLiveSepoliaSettings(environment: NodeJS.ProcessEnv = process.env): LiveSettingsResult {
  const required = [
    "LIVE_SEPOLIA_PRIVATE_KEY",
    "LIVE_SEPOLIA_RPC_URL",
    "LIVE_SEPOLIA_MARKET_ID",
    "LIVE_SEPOLIA_FUNDING_TREASURY_ADDRESS",
    "LIVE_SEPOLIA_FUNDING_MODE",
    "LIVE_SEPOLIA_SIDE",
    "LIVE_SEPOLIA_AMOUNT",
    "LIVE_SEPOLIA_PRIVATE_MAXIMUM",
  ] as const;
  const missing = required.filter((name) => !environment[name]?.trim());
  if (environment.LIVE_SEPOLIA_CONFIRM !== LIVE_CONFIRMATION || missing.length > 0) {
    const detail = missing.length > 0 ? ` Missing: ${missing.join(", ")}.` : "";
    return {
      enabled: false,
      reason: `Live Sepolia writes are disabled. Set LIVE_SEPOLIA_CONFIRM=${LIVE_CONFIRMATION}.${detail}`,
    };
  }

  const privateKey = environment.LIVE_SEPOLIA_PRIVATE_KEY!;
  const marketId = environment.LIVE_SEPOLIA_MARKET_ID!;
  const fundingTreasury = environment.LIVE_SEPOLIA_FUNDING_TREASURY_ADDRESS!;
  const fundingMode = environment.LIVE_SEPOLIA_FUNDING_MODE!;
  const side = environment.LIVE_SEPOLIA_SIDE!;
  if (!isHex(privateKey, { strict: true }) || privateKey.length !== 66) return invalid("LIVE_SEPOLIA_PRIVATE_KEY");
  if (!isHex(marketId, { strict: true }) || marketId.length !== 66) return invalid("LIVE_SEPOLIA_MARKET_ID");
  if (!isAddress(fundingTreasury, { strict: true })) return invalid("LIVE_SEPOLIA_FUNDING_TREASURY_ADDRESS");
  if (fundingMode !== "REQUIRED" && fundingMode !== "ALREADY_FUNDED") return invalid("LIVE_SEPOLIA_FUNDING_MODE");
  if (side !== "YES" && side !== "NO") return invalid("LIVE_SEPOLIA_SIDE");

  let amountAtoms: bigint;
  let privateMaximumWad: bigint;
  try {
    amountAtoms = decimalToAtoms(environment.LIVE_SEPOLIA_AMOUNT!, TEST_USDC_DECIMALS);
    privateMaximumWad = decimalToAtoms(environment.LIVE_SEPOLIA_PRIVATE_MAXIMUM!, 18);
  } catch {
    return invalid("LIVE_SEPOLIA_AMOUNT or LIVE_SEPOLIA_PRIVATE_MAXIMUM");
  }
  if (amountAtoms <= 0n || amountAtoms > 25_000_000n) {
    return { enabled: false, reason: "LIVE_SEPOLIA_AMOUNT must be greater than zero and no more than 25 Test USDC." };
  }
  if (privateMaximumWad <= 0n || privateMaximumWad > 10n ** 18n) {
    return { enabled: false, reason: "LIVE_SEPOLIA_PRIVATE_MAXIMUM must be greater than zero and no more than 1 Test USDC/share." };
  }

  const webOrigin = origin(environment.LIVE_SEPOLIA_WEB_ORIGIN ?? "http://127.0.0.1:3000", "LIVE_SEPOLIA_WEB_ORIGIN");
  if (typeof webOrigin !== "string") return webOrigin;
  const apiOrigin = origin(environment.LIVE_SEPOLIA_API_ORIGIN ?? "http://127.0.0.1:8787", "LIVE_SEPOLIA_API_ORIGIN");
  if (typeof apiOrigin !== "string") return apiOrigin;
  const rpcUrl = url(environment.LIVE_SEPOLIA_RPC_URL!, "LIVE_SEPOLIA_RPC_URL");
  if (typeof rpcUrl !== "string") return rpcUrl;

  const fillTimeoutMs = boundedInteger(environment.LIVE_SEPOLIA_FILL_TIMEOUT_MS, 20 * 60_000, 60_000, 30 * 60_000);
  if (fillTimeoutMs === null) return invalid("LIVE_SEPOLIA_FILL_TIMEOUT_MS");
  const evidencePath = environment.LIVE_SEPOLIA_EVIDENCE_PATH?.trim()
    || "test-results/live-sepolia-redacted.json";

  return {
    enabled: true,
    settings: {
      webOrigin,
      apiOrigin,
      rpcUrl,
      marketId: marketId as Hex,
      fundingTreasury: getAddress(fundingTreasury),
      fundingMode,
      side,
      amount: environment.LIVE_SEPOLIA_AMOUNT!,
      amountAtoms,
      privateMaximum: environment.LIVE_SEPOLIA_PRIVATE_MAXIMUM!,
      fillTimeoutMs,
      evidencePath,
      privateKey: privateKey as Hex,
    },
  };
}

function invalid(name: string): LiveSettingsResult {
  return { enabled: false, reason: `${name} is invalid; the live harness will not start.` };
}

function origin(value: string, name: string): string | LiveSettingsResult {
  try { return new URL(value).origin; }
  catch { return invalid(name); }
}

function url(value: string, name: string): string | LiveSettingsResult {
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
