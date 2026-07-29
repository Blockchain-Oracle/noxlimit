/**
 * NoxLimit Phase 6 live Sepolia proof.
 *
 * This file is excluded from the ordinary Playwright config. Running it makes real Sepolia writes
 * and requires the exact opt-in documented by `pnpm test:e2e:live:sepolia -- --list`. The signer
 * lives only in Node. This test never reads request bodies, never records confidential material,
 * and writes only redacted destinations plus public transaction hashes to its evidence file.
 */
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import {
  activityViewSchema,
  healthViewSchema,
  marketViewSchema,
  noxLimitOrderBookAbi,
  orderViewSchema,
  type OrderRef,
} from "@noxlimit/protocol";
import {
  createPublicClient,
  getAddress,
  http,
  parseEventLogs,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { sepolia } from "viem/chains";

import { createLiveSepoliaWallet, type RecordedWalletWrite } from "./live-wallet";
import {
  LIVE_CONFIRMATION,
  readLiveSepoliaSettings,
  type LiveFundingMode,
  type LiveSepoliaSettings,
} from "./live-settings";

const GATEWAY_ORIGIN = "https://gateway-testnets.noxprotocol.dev";
const live = readLiveSepoliaSettings();
const liveWriteRequested = process.env.LIVE_SEPOLIA_CONFIRM === LIVE_CONFIRMATION;
test.skip(!liveWriteRequested, live.enabled ? undefined : live.reason);

test("funds one wallet, creates one private order, closes, and reopens after a worker fill", async () => {
  if (!live.enabled) throw new Error(live.reason);
  const settings = live.settings;
  // Playwright first imports this file in its discovery process and later imports it again in the
  // worker. Deleting these values at module scope strips them before the worker can validate the
  // explicit opt-in and silently turns a requested live proof into a skip. Delete them only in the
  // worker, immediately before Chromium can inherit its environment. Parsed copies remain in this
  // Node worker until the private maximum is deliberately entered into the in-memory form.
  delete process.env.LIVE_SEPOLIA_PRIVATE_KEY;
  delete process.env.LIVE_SEPOLIA_PRIVATE_MAXIMUM;
  delete process.env.LIVE_SEPOLIA_RPC_URL;
  await assertEvidenceTargetFresh(settings);
  const publicClient = createPublicClient({ chain: sepolia, transport: http(settings.rpcUrl) });
  const [health, market] = await Promise.all([
    readApi(settings, "/v1/health", healthViewSchema),
    readApi(settings, `/v1/markets/${settings.marketId}`, marketViewSchema),
  ]);
  if (health.status !== "READY" || health.evaluator.status !== "READY" || health.funding.status !== "READY") {
    throw new Error("Live NoxLimit service, evaluator, and funding health must all be READY before writes.");
  }
  if (market.marketId !== settings.marketId || market.chainId !== sepolia.id || market.tradeability !== "TRADEABLE") {
    throw new Error("The configured live market is not the exact verified tradeable Sepolia market.");
  }
  if (Date.parse(market.tradingClosesAt) - Date.now() < 15 * 60_000) {
    throw new Error("The configured market has less than 15 minutes of NoxLimit ordering time remaining; no write was made.");
  }
  const orderBook = getAddress(market.contracts.orderBook);
  const collateral = await publicClient.readContract({
    address: orderBook,
    abi: noxLimitOrderBookAbi,
    functionName: "collateral",
  }) as Address;
  const wallet = createLiveSepoliaWallet({
    privateKey: settings.privateKey,
    rpcUrl: settings.rpcUrl,
    fundingTreasury: settings.fundingTreasury,
    orderBook,
    collateral,
    side: settings.side,
    amountAtoms: settings.amountAtoms,
    tradingClosesAt: market.tradingClosesAt,
  });
  let fundingHash: Hex | undefined;
  let ref: OrderRef | undefined;
  let gatewayPosts = 0;
  const firstBrowser = await launchLiveBrowser();
  let firstContext: BrowserContext | undefined;
  try {
    firstContext = await liveContext(firstBrowser, settings, wallet.install);
    const page = await firstContext.newPage();
    page.on("request", (request) => {
      const requestUrl = new URL(request.url());
      if (request.method() === "POST" && requestUrl.origin === GATEWAY_ORIGIN && requestUrl.pathname === "/v0/secrets") gatewayPosts += 1;
    });

    fundingHash = await completeFunding(page, settings.fundingMode);
    ref = await createPrivateOrder(page, settings, orderBook);
    expect(gatewayPosts).toBe(1);
    expect(wallet.writes().filter((entry) => entry.kind === "ORDER_CREATE")).toHaveLength(1);
  } finally {
    await firstContext?.close();
    await firstBrowser.close();
  }

  if ((settings.fundingMode === "REQUIRED" && !fundingHash) || !ref) {
    throw new Error("The required live funding or order receipt was not captured.");
  }
  const filledOrder = await waitForFilledOrder(settings, ref);
  const fillHash = await findFillHash(
    settings,
    publicClient,
    wallet.address,
    filledOrder.marketId,
    settings.side,
    ref,
  );

  const freshBrowser = await launchLiveBrowser();
  let freshContext: BrowserContext | undefined;
  try {
    freshContext = await liveContext(freshBrowser, settings, wallet.install);
    const page = await freshContext.newPage();
    await page.goto(orderHref(ref));
    await expect(page.getByRole("heading", { name: `${settings.side} private order` })).toBeVisible();
    await expect(page.locator(".status-banner strong")).toHaveText("FILLED");
    await expect(page.getByRole("link", { name: "Open confirmed positions" })).toBeVisible();
  } finally {
    await freshContext?.close();
    await freshBrowser.close();
  }

  await writeRedactedEvidence(settings, {
    fundingHash,
    fundingMode: settings.fundingMode,
    fillHash,
    gatewayPostCount: gatewayPosts,
    orderRef: ref,
    writes: wallet.writes(),
    wallet: wallet.address,
    fundingTreasury: settings.fundingTreasury,
    collateral,
    orderBook,
  });
});

function launchLiveBrowser(): Promise<Browser> {
  return chromium.launch({
    channel: process.env.PLAYWRIGHT_SYSTEM_CHROME === "1" ? "chrome" : undefined,
  });
}

async function liveContext(
  browser: Browser,
  settings: LiveSepoliaSettings,
  installWallet: (context: BrowserContext) => Promise<void>,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    baseURL: settings.webOrigin,
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  await installWallet(context);
  return context;
}

async function connect(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: "Connect browser wallet" });
  if (await button.isVisible()) await button.click();
  await expect(page.getByTitle("Disconnect wallet")).toBeVisible();
}

async function completeFunding(page: Page, mode: LiveFundingMode): Promise<Hex | undefined> {
  await page.goto("/funding");
  await connect(page);
  if (mode === "ALREADY_FUNDED") {
    const ready = page.getByRole("button", { name: "Funding not needed" });
    await expect(ready, "ALREADY_FUNDED may proceed only after the product measures both balance targets as ready.").toBeDisabled();
    for (const label of ["Sepolia ETH", "Test USDC"] as const) {
      const row = page.getByRole("listitem").filter({ has: page.getByText(label, { exact: true }) });
      await expect(row).toContainText("Ready");
    }
    return undefined;
  }
  const challenge = page.getByRole("button", { name: "Request funding challenge" });
  await expect(challenge, "Use a fresh/low-balance key so this proof exercises real in-product funding.").toBeEnabled();
  await challenge.click();
  await expect(page.getByText("Review signed request", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign and submit funding claim" }).click();
  const explorer = page.getByRole("link", { name: "View real funding transaction" });
  await expect(explorer).toBeVisible({ timeout: 120_000 });
  const hash = transactionHash(await explorer.getAttribute("href"));
  await expect(page.getByRole("status")).toContainText(/COMPLETE|PARTIAL/);
  return hash;
}

async function createPrivateOrder(page: Page, settings: LiveSepoliaSettings, orderBook: Address): Promise<OrderRef> {
  await page.goto(`/markets/${settings.marketId}`);
  await connect(page);
  await page.getByRole("button", { name: `Buy ${settings.side}`, exact: true }).click();
  await page.getByLabel(/Public amount/).fill(settings.amount);
  await page.getByLabel(/Private maximum price/).fill(settings.privateMaximum);
  const review = page.getByRole("button", { name: "Review private order" });
  await expect(review).toBeEnabled();
  await review.click();
  await expect(page.getByRole("heading", { name: "Review the protected order" })).toBeVisible();
  await page.getByRole("button", { name: "Send to Nox and continue" }).click();
  await page.waitForURL(/\/orders\/11155111\/0x[0-9a-fA-F]{40}\/[0-9]+$/, { timeout: 240_000 });
  const match = new URL(page.url()).pathname.match(/^\/orders\/(11155111)\/(0x[0-9a-fA-F]{40})\/([0-9]+)$/);
  if (!match || getAddress(match[2]!) !== orderBook) throw new Error("The confirmed order URL did not match the configured OrderBook.");
  // The create receipt is final at this point. Do not keep the browser open merely to wait for the
  // deliberately safe-block-lagged service projection; the browser-off poll below owns that proof.
  return { chainId: sepolia.id, orderBook, orderId: match[3]! };
}

async function waitForFilledOrder(settings: LiveSepoliaSettings, ref: OrderRef) {
  let latest: NonNullable<Awaited<ReturnType<typeof readOrder>>> | undefined;
  await expect.poll(async () => {
    latest = await readOrder(settings, ref);
    return latest?.status ?? "NOT_INDEXED";
  }, {
    message: "The hosted worker did not project this browser-created order as FILLED within the bounded live window.",
    timeout: settings.fillTimeoutMs,
    intervals: [5_000, 10_000, 15_000],
  }).toBe("FILLED");
  if (!latest) throw new Error("Filled order projection is unavailable.");
  return latest;
}

function readOrder(settings: LiveSepoliaSettings, ref: OrderRef) {
  return readOptionalApi(
    settings,
    `/v1/orders/${ref.chainId}/${ref.orderBook}/${ref.orderId}`,
    orderViewSchema,
  );
}

async function findFillHash(
  settings: LiveSepoliaSettings,
  publicClient: PublicClient,
  owner: Address,
  marketId: Hex,
  side: "YES" | "NO",
  ref: OrderRef,
): Promise<Hex> {
  const activities = await readApi(
    settings,
    `/v1/activity?owner=${owner}&marketId=${marketId}`,
    activityViewSchema.array(),
  );
  const fills = activities.filter((entry) =>
    entry.kind === "ORDER_FILLED" &&
    entry.side === side &&
    entry.orderRef?.chainId === ref.chainId &&
    entry.orderRef.orderBook.toLowerCase() === ref.orderBook.toLowerCase() &&
    entry.orderRef.orderId === ref.orderId
  );
  if (fills.length !== 1) {
    throw new Error("The exact composite order reference does not have one durable fill activity.");
  }
  const fill = fills[0]!;
  const receipt = await publicClient.getTransactionReceipt({ hash: fill.transactionHash });
  if (receipt.status !== "success") {
    throw new Error("The exact order fill transaction did not succeed onchain.");
  }
  const matchingLogs = parseEventLogs({
    abi: noxLimitOrderBookAbi,
    eventName: "Filled",
    logs: receipt.logs,
    strict: true,
  }).filter((log) =>
    getAddress(log.address) === getAddress(ref.orderBook) &&
    log.args.orderId === BigInt(ref.orderId) &&
    log.logIndex === fill.logIndex
  );
  if (matchingLogs.length !== 1) {
    throw new Error("The projected fill is not bound to the exact OrderBook event and order ID.");
  }
  return fill.transactionHash;
}

async function readApi<T>(
  settings: LiveSepoliaSettings,
  path: string,
  schema: { parse(value: unknown): T },
): Promise<T> {
  const response = await fetch(`${settings.apiOrigin}${path}`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`The live API returned HTTP ${response.status} for a required read.`);
  try { return schema.parse(await response.json()); }
  catch { throw new Error("The live API returned data outside the canonical protocol schema."); }
}

async function readOptionalApi<T>(
  settings: LiveSepoliaSettings,
  path: string,
  schema: { parse(value: unknown): T },
): Promise<T | undefined> {
  const response = await fetch(`${settings.apiOrigin}${path}`, {
    headers: { accept: "application/json" },
  });
  if (response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(`The live API returned HTTP ${response.status} for a required read.`);
  }
  try { return schema.parse(await response.json()); }
  catch { throw new Error("The live API returned data outside the canonical protocol schema."); }
}

async function writeRedactedEvidence(settings: LiveSepoliaSettings, input: {
  fundingHash?: Hex;
  fundingMode: LiveFundingMode;
  fillHash: Hex;
  gatewayPostCount: number;
  orderRef: OrderRef;
  writes: readonly RecordedWalletWrite[];
  wallet: Address;
  fundingTreasury: Address;
  collateral: Address;
  orderBook: Address;
}): Promise<void> {
  const output = resolve(process.cwd(), settings.evidencePath);
  await mkdir(dirname(output), { recursive: true });
  const transactions = [
    ...(input.fundingHash ? [{ kind: "FUNDING_CLAIM", transactionHash: input.fundingHash }] : []),
    ...input.writes.map((entry) => ({ kind: entry.kind, transactionHash: entry.transactionHash })),
    { kind: "ORDER_FILL", transactionHash: input.fillHash },
  ];
  const evidence = {
    schemaVersion: 1,
    chainId: sepolia.id,
    recordedAt: new Date().toISOString(),
    publicOrder: {
      ref: input.orderRef,
      marketId: settings.marketId,
      side: settings.side,
      amount: settings.amount,
    },
    fundingMode: input.fundingMode,
    destinations: {
      web: redactOrigin(settings.webOrigin),
      api: redactOrigin(settings.apiOrigin),
      rpc: redactOrigin(settings.rpcUrl),
      gateway: redactOrigin(GATEWAY_ORIGIN),
      wallet: redactAddress(input.wallet),
      fundingTreasury: redactAddress(input.fundingTreasury),
      collateral: redactAddress(input.collateral),
      orderBook: redactAddress(input.orderBook),
    },
    transactionHashes: transactions,
    networkEvidence: { directGatewayPostCount: input.gatewayPostCount },
    checks: [
      input.fundingMode === "REQUIRED" ? "REAL_FUNDING" : "BALANCES_ALREADY_READY",
      "DIRECT_GATEWAY",
      "ORDER_CREATED",
      "BROWSER_CLOSED",
      "API_FILLED",
      "FRESH_BROWSER_FILLED",
    ],
  };
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
}

async function assertEvidenceTargetFresh(settings: LiveSepoliaSettings): Promise<void> {
  const output = resolve(process.cwd(), settings.evidencePath);
  try {
    await access(output, constants.F_OK);
  } catch (reason) {
    if ((reason as NodeJS.ErrnoException).code === "ENOENT") return;
    throw new Error("The live evidence destination could not be checked safely.");
  }
  throw new Error("The live evidence destination already exists. Choose a new create-only path before any write.");
}

function orderHref(ref: OrderRef): string {
  return `/orders/${ref.chainId}/${ref.orderBook}/${ref.orderId}`;
}

function transactionHash(href: string | null): Hex {
  const hash = href?.match(/\/tx\/(0x[0-9a-fA-F]{64})/)?.[1];
  if (!hash) throw new Error("A confirmed funding explorer link did not contain a transaction hash.");
  return hash as Hex;
}

function redactAddress(address: Address): string {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function redactOrigin(value: string): string {
  const parsed = new URL(value);
  return `${parsed.protocol}//${parsed.hostname}${parsed.port ? ":<port>" : ""}`;
}
