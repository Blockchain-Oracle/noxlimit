import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.LIVE_REDEMPTION_WEB_ORIGIN?.trim().replace(/\/$/, "")
  || "http://127.0.0.1:3000";
const timeout = boundedMilliseconds(process.env.LIVE_REDEMPTION_TIMEOUT_MS, 15 * 60_000);

/**
 * Isolated Phase 6 resolution/redemption proof. It never starts fixture servers and never runs in
 * the ordinary mocked browser suite. Media capture stays off so the operational wallet session is
 * not copied into test artifacts.
 */
export default defineConfig({
  testDir: "./e2e/live",
  testMatch: "redemption.live.ts",
  timeout,
  globalTimeout: timeout + 5 * 60_000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [["list"]],
  outputDir: "test-results/live-sepolia-redemption",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    viewport: { width: 1440, height: 1000 },
    channel: process.env.PLAYWRIGHT_SYSTEM_CHROME === "1" ? "chrome" : undefined,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});

function boundedMilliseconds(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 5 * 60_000 && parsed <= 30 * 60_000
    ? parsed
    : fallback;
}
