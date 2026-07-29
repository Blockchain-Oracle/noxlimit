import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", channel: process.env.PLAYWRIGHT_SYSTEM_CHROME === "1" ? "chrome" : undefined },
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: "node e2e/fixture-server.mjs", port: 4174, reuseExistingServer: false },
    {
      command: "pnpm dev --hostname 127.0.0.1 --port 4173",
      port: 4173,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_NOXLIMIT_API_ORIGIN: "http://127.0.0.1:4174",
        NEXT_PUBLIC_SEPOLIA_RPC_URL: "http://127.0.0.1:4174/rpc",
        NEXT_PUBLIC_TEST_USDC_ADDRESS: `0x${"8".repeat(40)}`,
        NEXT_PUBLIC_TRADING_MIN_ETH: "0.005",
        NEXT_PUBLIC_TRADING_MIN_USDC: "0.01",
      },
    },
  ],
});
