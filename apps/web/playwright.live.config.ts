import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.LIVE_SEPOLIA_WEB_ORIGIN?.trim().replace(/\/$/, "")
  || "http://127.0.0.1:3000";
const fillTimeout = boundedMilliseconds(process.env.LIVE_SEPOLIA_FILL_TIMEOUT_MS, 20 * 60_000);

/**
 * Phase 6 live proof config.
 *
 * This config never starts a fixture or application server and never participates in the normal
 * mocked E2E suite. It targets an already-running production build. Trace, screenshots, and video
 * are deliberately disabled because the order form briefly contains a confidential value.
 */
export default defineConfig({
  testDir: "./e2e/live",
  testMatch: "sepolia.live.ts",
  timeout: fillTimeout + 5 * 60_000,
  globalTimeout: fillTimeout + 10 * 60_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [["list"]],
  outputDir: "test-results/live-sepolia",
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
  if (!Number.isSafeInteger(parsed) || parsed < 60_000 || parsed > 30 * 60_000) return fallback;
  return parsed;
}
