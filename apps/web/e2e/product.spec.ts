import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  TEST_USDC_DECIMALS,
  buildRefundOrderTransaction,
  decimalToAtoms,
  erc20Abi,
  maxPriceWadToMinOut,
  noxLimitOrderBookAbi,
} from "@noxlimit/protocol";
import { decodeFunctionData, toFunctionSelector, toHex } from "viem";
import {
  FIXTURE_ACCOUNT,
  FIXTURE_CONDITIONAL_TOKENS,
  FIXTURE_HANDLE,
  FIXTURE_ORDER_BOOK,
  FIXTURE_RESOLVER,
  TX_APPROVAL,
  TX_CREATE,
  TX_REDEEM,
  TX_REFUND,
  TX_RESOLVE,
  installGatewayFixture,
  installInjectedSepoliaWallet,
  installRpcFixture,
  walletTransactions,
} from "./chain-fixture";

async function expectNoPageOverflow(page: import("@playwright/test").Page) {
  await expect.poll(() => page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))).toEqual(expect.objectContaining({ scroll: expect.any(Number), client: expect.any(Number) }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

async function connectInjectedWallet(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Connect browser wallet" }).click();
  await expect(page.getByTitle("Disconnect wallet")).toBeVisible();
}

test("one responsive product tree renders validated discovery data without horizontal overflow", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "desktop-1440") await expect(page.getByRole("heading", { name: "Market Stream" })).toBeVisible();
  await expect(page.getByLabel("Market Stream").getByRole("heading", { name: "Will BTC/USD settle at or above 65,000?" })).toBeVisible();
  await expect(page.locator('[aria-label="Market Stream"]')).toHaveCount(1);
  await expect(page.locator("#selected-market")).toHaveCount(1);
  await expect(page.getByLabel("Private order ticket")).toHaveCount(1);
  await expectNoPageOverflow(page);
  if (testInfo.project.name === "mobile-390") {
    const navigation = await page.locator(".app-nav").boundingBox();
    expect(navigation).not.toBeNull();
    expect(Math.round((navigation?.y ?? 0) + (navigation?.height ?? 0))).toBeGreaterThanOrEqual(843);
    await expect(page.getByRole("button", { name: "Connect browser wallet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Test funds" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Filter & sort" })).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).first().click();
    await expect(page.getByRole("article").nth(1)).toBeInViewport();
  }
});

test("primary shell has no serious or critical axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".chain-pill")).toHaveAttribute("title", "READY");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
});

test("primary shell matches the approved viewport baseline", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".chain-pill")).toHaveAttribute("title", "READY");
  await expect(page.getByLabel("Market Stream").getByRole("heading", { name: "Will BTC/USD settle at or above 65,000?" })).toBeVisible();
  await expect(page).toHaveScreenshot("primary-shell.png", { fullPage: true, animations: "disabled", caret: "hide" });
});

test("deterministic filters request the fixture API and explicit Open enters analysis", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile-390") await page.getByRole("button", { name: "Filter & sort" }).click();
  await page.getByLabel("Asset filter").selectOption("ETH/USD");
  await expect(page.getByText("Will ETH/USD settle at or above 3,500?")).toBeVisible();
  const open = page.getByRole("article").filter({ hasText: "ETH/USD" }).getByRole("button", { name: "Open market" });
  await open.click();
  await expect(page.locator("#selected-market")).toBeInViewport();
});

test("resolved discovery preserves verified history after pool liquidity is drained", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile-390") await page.getByRole("button", { name: "Filter & sort" }).click();
  await page.getByLabel("Lifecycle filter").selectOption("RESOLVED");
  const resolved = page.getByRole("article").filter({ hasText: "Did ETH/USD settle at or above 3,400?" });
  await expect(resolved).toBeVisible();
  await expect(resolved).toHaveAttribute("data-complete-set-depth-atoms", "0");
  await expect(page.getByRole("heading", { name: "No live catalog data" })).toHaveCount(0);
});

test("terminal history requests real underlying and paged YES/NO outcome evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "One query-bound chart proof is viewport-independent.");
  const historyRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/history?")) historyRequests.push(request.url()); });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Underlying price history" })).toBeVisible();
  await expect(page.getByLabel("Chart legend")).toContainText("Strike · 65000 USD");
  await expect(page.getByLabel("Chart legend")).toContainText("NoxLimit orders close");
  await expect(page.getByLabel("Chart legend")).toContainText("Resolution");
  await page.getByRole("button", { name: "4h", exact: true }).click();
  await page.getByRole("tab", { name: "Outcome prices" }).click();
  await expect(page.getByRole("heading", { name: "Outcome price history" })).toBeVisible();
  await expect(page.getByLabel("Chart legend")).toContainText("YES · Test USDC/share");
  await expect(page.getByLabel("Chart legend")).toContainText("NO · Test USDC/share");
  await page.getByText("View exact chart data (2)").click();
  await expect(page.getByRole("table")).toContainText("0.480000");
  await expect(page.getByRole("table")).toContainText("0.530000");
  await page.getByRole("button", { name: "Load earlier observations" }).click();
  await expect(page.getByText("View exact chart data (4)")).toBeVisible();
  await expect(page.getByRole("table")).toContainText("0.450000");
  expect(historyRequests.some((url) => url.includes("mode=OUTCOME_PRICES") && url.includes("range=4h"))).toBe(true);
  expect(historyRequests.some((url) => url.includes("cursor=fixture-outcome-older"))).toBe(true);
});

test("filters never silently destroy a private draft", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-390", "The mobile workspace dismissal/back guard is covered separately.");
  await page.goto("/");
  await page.getByLabel(/Public amount/).fill("10");
  await page.getByLabel(/Private maximum price/).fill("0.52");
  if (testInfo.project.name === "mobile-390") await page.getByRole("button", { name: "Filter & sort" }).click();
  await page.getByLabel("Asset filter").selectOption("ETH/USD");
  await expect(page.getByRole("dialog", { name: "Discard this private draft?" })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel(/Public amount/)).toHaveValue("10");
  await expect(page.getByLabel(/Private maximum price/)).toHaveValue("0.52");
  await page.getByLabel("Asset filter").selectOption("ETH/USD");
  await page.getByRole("button", { name: "Discard and continue" }).click();
  await expect(page.getByLabel("Asset filter")).toHaveValue("ETH/USD");
  await expect(page.getByLabel(/Public amount/)).toHaveValue("");
  await expect(page.getByLabel(/Private maximum price/)).toHaveValue("");
});

test("dirty private drafts require an accessible focus-trapped decision", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-390", "The mobile workspace dismissal/back guard is covered separately.");
  await page.goto("/");
  await page.getByLabel(/Public amount/).fill("10");
  await page.getByLabel(/Private maximum price/).fill("0.52");
  const secondOpen = page.getByRole("article").nth(1).getByRole("button", { name: "Open market" });
  await secondOpen.focus();
  await secondOpen.click();
  const dialog = page.getByRole("dialog", { name: "Discard this private draft?" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Keep editing" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Discard and continue" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Keep editing" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(secondOpen).toBeFocused();
  await expect(page.getByLabel(/Private maximum price/)).toHaveValue("0.52");
});

test("Open market respects the sticky header and Market Stream toolbar", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("article").first().getByRole("button", { name: "Open market" }).click();
  const geometry = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".app-header-shell")!.getBoundingClientRect();
    const toolbar = document.querySelector<HTMLElement>(".stream-toolbar")!.getBoundingClientRect();
    const selectedHeading = document.querySelector<HTMLElement>("#selected-market h1")!.getBoundingClientRect();
    const firstCardHeading = document.querySelector<HTMLElement>(".market-card h2")!.getBoundingClientRect();
    return { headerBottom: header.bottom, toolbarBottom: toolbar.bottom, selectedHeadingTop: selectedHeading.top, firstCardHeadingTop: firstCardHeading.top };
  });
  expect(geometry.selectedHeadingTop).toBeGreaterThanOrEqual(geometry.headerBottom - 1);
  if (testInfo.project.name === "desktop-1440") expect(geometry.firstCardHeadingTop).toBeGreaterThanOrEqual(geometry.toolbarBottom - 1);
});

test("a durable retired market URL renders that exact market instead of a live substitute", async ({ page }) => {
  const marketId = `0x${"3".repeat(64)}`;
  await page.goto(`/markets/${marketId}`);
  await expect(page.getByRole("heading", { name: "Did BTC/USD settle at or above 64,000?" })).toBeVisible();
  await expect(page.locator("#selected-market")).toContainText("RESOLVED YES");
  await expect(page.locator("#selected-market")).not.toContainText("Will BTC/USD settle at or above 65,000?");
});

test("order detail exposes durable lifecycle evidence and canonical close copy", async ({ page }) => {
  await page.goto(`/orders/11155111/0x${"3".repeat(40)}/1`);
  await expect(page.getByRole("heading", { name: "YES private order" })).toBeVisible();
  await expect(page.getByText("3 remaining", { exact: false })).toBeVisible();
  await expect(page.getByText("NoxLimit orders close", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Order lifecycle evidence" })).toBeVisible();
  await expect(page.getByText("Will BTC/USD settle at or above 65,000?", { exact: true })).toBeVisible();
  await expect(page.getByText("Immutable recipient", { exact: true })).toBeVisible();
  await expect(page.getByText("fixture-v1", { exact: true })).toBeVisible();
  await expect(page.getByText("Monitoring continues after this browser closes", { exact: true })).toBeVisible();
});

test("monitoring exhaustion presents cancel, separate refund, then replacement as staged recovery", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "One staged recovery proof is sufficient.");
  await page.route(`**/v1/orders/11155111/${FIXTURE_ORDER_BOOK}/1`, async (route) => {
    const response = await route.fetch();
    const order = await response.json();
    await route.fulfill({ response, json: { ...order, status: "MONITORING_EXHAUSTED", evaluationCount: 4, maximumEvaluations: 4, remainingEvaluations: 0, nextEvaluationEligibleAt: undefined } });
  });
  await page.goto(`/orders/11155111/${FIXTURE_ORDER_BOOK}/1`);
  await expect(page.getByText("Private monitoring is exhausted", { exact: true })).toBeVisible();
  await expect(page.getByText(/cancel this escrow first, then claim its refund as a separate confirmed transaction/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel order" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim refund" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Reopen exact market with public side and amount" })).toHaveCount(0);
});

test("the released Gateway and wallet path creates a durable composite order without leaking the private input", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "One network-boundary proof is sufficient.");
  const networkTraffic: Array<{ url: string; method: string; body: string }> = [];
  const consoleTraffic: string[] = [];
  page.on("request", (request) => {
    networkTraffic.push({ url: request.url(), method: request.method(), body: request.postData() ?? "" });
  });
  page.on("console", (message) => consoleTraffic.push(message.text()));
  await installRpcFixture(page);
  await installInjectedSepoliaWallet(page, [TX_APPROVAL, TX_CREATE]);
  const gatewayTraffic = await installGatewayFixture(page);
  await page.goto("/");
  await connectInjectedWallet(page);
  const privateSentinel = "0.517293";
  await page.getByLabel(/Public amount/).fill("10");
  await page.getByLabel(/Private maximum price/).fill(privateSentinel);
  await page.getByRole("button", { name: "Review private order" }).click();
  await expect(page.getByRole("heading", { name: "Review the protected order" })).toBeVisible();
  await expect(page.getByText(`Owner and immutable recipient:`)).toBeVisible();
  await expect(page.locator(".review-ticket p").filter({ hasText: "Pool fee:" })).toContainText("200 bps");
  await expect(page.locator(".review-ticket p").filter({ hasText: "Monitoring budget:" })).toContainText("4 confidential checks");
  await expect(page.getByText(/If publication succeeds, the derived minimum-share bound becomes public/)).toBeVisible();
  await page.getByRole("button", { name: "Send to Nox and continue" }).click();

  await expect(page).toHaveURL(`/orders/11155111/${FIXTURE_ORDER_BOOK}/1`);
  await expect(page.getByRole("heading", { name: "YES private order" })).toBeVisible();
  await expect(page.getByText("Composite order · Sepolia", { exact: false }).first()).toBeVisible();

  const amountAtoms = decimalToAtoms("10", TEST_USDC_DECIMALS);
  const maximumWad = decimalToAtoms(privateSentinel, 18);
  const expectedMinOut = maxPriceWadToMinOut(amountAtoms, maximumWad);
  const expectedGatewayValue = toHex(expectedMinOut, { size: 32 });
  const gatewayPosts = gatewayTraffic.filter((request) => request.method === "POST");
  expect(gatewayPosts).toHaveLength(1);
  expect(new URL(gatewayPosts[0]!.url).pathname).toBe("/v0/secrets");
  expect(JSON.parse(gatewayPosts[0]!.body)).toEqual({
    value: expectedGatewayValue,
    solidityType: "uint256",
    applicationContract: FIXTURE_ORDER_BOOK,
    owner: FIXTURE_ACCOUNT,
  });

  const walletWrites = await walletTransactions(page);
  expect(walletWrites).toHaveLength(2);
  const approval = decodeFunctionData({ abi: erc20Abi, data: walletWrites[0]!.data! });
  expect(approval.functionName).toBe("approve");
  expect(approval.args).toEqual([FIXTURE_ORDER_BOOK, amountAtoms]);
  const creation = decodeFunctionData({ abi: noxLimitOrderBookAbi, data: walletWrites[1]!.data! });
  expect(creation.functionName).toBe("createOrder");
  expect(creation.args[0]).toBe(FIXTURE_ACCOUNT);
  expect(creation.args[1]).toBe(0);
  expect(creation.args[2]).toBe(amountAtoms);
  expect(creation.args[4]).toBe(FIXTURE_HANDLE);

  const serviceTraffic = networkTraffic.filter((entry) => entry.url.startsWith("http://127.0.0.1:4174/v1/"));
  expect(serviceTraffic.some((entry) => entry.url.includes("/quote?") && entry.url.includes("amount=10"))).toBe(true);
  expect(serviceTraffic.map((entry) => `${entry.url} ${entry.body}`).join("\n")).not.toContain(privateSentinel);
  expect(serviceTraffic.map((entry) => `${entry.url} ${entry.body}`).join("\n")).not.toContain(expectedGatewayValue);
  const derivedValueDestinations = networkTraffic.filter((entry) => `${entry.url} ${entry.body}`.includes(expectedGatewayValue));
  expect(derivedValueDestinations.map((entry) => new URL(entry.url).origin)).toEqual(["https://gateway-testnets.noxprotocol.dev"]);
  expect(networkTraffic.map((entry) => `${entry.url} ${entry.body}`).join("\n")).not.toContain(privateSentinel);
  expect(consoleTraffic.join("\n")).not.toContain(privateSentinel);
  expect(consoleTraffic.join("\n")).not.toContain(expectedGatewayValue);
  const persistedBrowserState = await page.evaluate(() => JSON.stringify({
    href: window.location.href,
    cookie: document.cookie,
    local: Object.fromEntries(Object.entries(localStorage)),
    session: Object.fromEntries(Object.entries(sessionStorage)),
  }));
  expect(persistedBrowserState).not.toContain(privateSentinel);
  expect(persistedBrowserState).not.toContain(expectedGatewayValue);

  await page.reload();
  await expect(page.getByRole("heading", { name: "YES private order" })).toBeVisible();
  await expect(page.getByText("3 remaining", { exact: false })).toBeVisible();
});

test("an unconfirmed create survives reload, confirms late, and can never send a duplicate escrow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "One exact-hash recovery proof is sufficient.");
  const rpc = await installRpcFixture(page, { allowance: 50_000_000n, withholdReceipts: [TX_CREATE] });
  await installInjectedSepoliaWallet(page, [TX_CREATE]);
  await installGatewayFixture(page);
  await page.goto("/");
  await connectInjectedWallet(page);
  await page.getByLabel(/Public amount/).fill("10");
  await page.getByLabel(/Private maximum price/).fill("0.51");
  await page.getByRole("button", { name: "Review private order" }).click();
  await page.getByRole("button", { name: "Send to Nox and continue" }).click();
  await expect.poll(async () => (await walletTransactions(page)).length).toBe(1);
  expect(await page.evaluate((hash) => Object.values(localStorage).some((value) => value.includes(hash)), TX_CREATE)).toBe(true);

  // Reload during the ordinary CONFIRMING window, before its 90-second wait can time out.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Order submitted; waiting for its receipt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review private order" })).toHaveCount(0);
  await expect(page.getByText(/will not expose another create action/)).toBeVisible();
  await expect(page.getByLabel(/Private maximum price/)).toHaveValue("");
  expect(await walletTransactions(page)).toHaveLength(1);
  rpc.releaseReceipt(TX_CREATE);
  await page.getByRole("button", { name: "Check exact receipt" }).click();
  await expect(page).toHaveURL(`/orders/11155111/${FIXTURE_ORDER_BOOK}/1`);
  expect(await walletTransactions(page)).toHaveLength(1);
});

test("wallet rejection preserves the in-memory reviewed draft and sends no transaction", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "One wallet-rejection proof is sufficient.");
  await installRpcFixture(page, { allowance: 50_000_000n });
  await installInjectedSepoliaWallet(page, [], { rejectTransactionAt: 0 });
  await installGatewayFixture(page);
  await page.goto("/");
  await connectInjectedWallet(page);
  await page.getByLabel(/Public amount/).fill("10");
  await page.getByLabel(/Private maximum price/).fill("0.52");
  await page.getByRole("button", { name: "Review private order" }).click();
  await page.getByRole("button", { name: "Send to Nox and continue" }).click();
  await expect(page.getByText(/wallet request was rejected/i)).toBeVisible();
  await expect(page.getByLabel(/Public amount/)).toHaveValue("10");
  await expect(page.getByLabel(/Private maximum price/)).toHaveValue("0.52");
  await expect(page.getByRole("button", { name: "Send to Nox and continue" })).toBeVisible();
  expect(await walletTransactions(page)).toHaveLength(0);
});

test("a target-ready wallet cannot review an order larger than its measured collateral", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "One amount-specific collateral proof is sufficient.");
  await installRpcFixture(page);
  await installInjectedSepoliaWallet(page, []);
  await page.goto("/");
  await connectInjectedWallet(page);
  await page.getByLabel(/Public amount/).fill("100");
  await page.getByLabel(/Private maximum price/).fill("0.52");
  await expect(page.getByText("Order collateral required", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review private order" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Open test funding" })).toBeVisible();
  expect(await walletTransactions(page)).toHaveLength(0);
});

test("confirmed recovery signs the exact composite-order refund", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "One wallet-signing proof is sufficient.");
  await installRpcFixture(page);
  await installInjectedSepoliaWallet(page, [TX_REFUND]);
  await page.goto(`/orders/11155111/${FIXTURE_ORDER_BOOK}/2`);
  await connectInjectedWallet(page);
  await page.getByRole("button", { name: "Claim refund" }).click();
  await expect(page.getByText("Claim refund transaction confirmed", { exact: true })).toBeVisible();
  const writes = await walletTransactions(page);
  expect(writes).toHaveLength(1);
  const expected = buildRefundOrderTransaction({ chainId: 11_155_111, orderBook: FIXTURE_ORDER_BOOK, orderId: "2" });
  expect(writes[0]).toEqual(expect.objectContaining({ from: FIXTURE_ACCOUNT, to: expected.to, data: expected.data }));
  await page.getByRole("link", { name: "Reopen exact market with public side and amount" }).click();
  await expect(page.getByLabel(/Public amount/)).toHaveValue("10.000000");
  await expect(page.getByRole("button", { name: "Buy YES" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel(/Private maximum price/)).toHaveValue("");
});

test("an unconfirmed order recovery survives reload and never exposes a duplicate write", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "One exact-hash order recovery proof is sufficient.");
  const rpc = await installRpcFixture(page, { withholdReceipts: [TX_REFUND] });
  await installInjectedSepoliaWallet(page, [TX_REFUND]);
  await page.goto(`/orders/11155111/${FIXTURE_ORDER_BOOK}/2`);
  await connectInjectedWallet(page);
  await page.getByRole("button", { name: "Claim refund" }).click();
  await expect.poll(async () => (await walletTransactions(page)).length).toBe(1);
  expect(await page.evaluate((hash) => Object.values(localStorage).some((value) => value.includes(hash)), TX_REFUND)).toBe(true);

  await page.reload();
  await expect(page.getByText("Claim refund transaction remains locked", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim refund" })).toBeDisabled();
  expect(await walletTransactions(page)).toHaveLength(1);
  rpc.releaseReceipt(TX_REFUND);
  await page.getByRole("button", { name: "Check exact receipt" }).click();
  await expect(page.getByText("Claim refund transaction confirmed", { exact: true })).toBeVisible();
  expect(await walletTransactions(page)).toHaveLength(1);
  expect(await page.evaluate((hash) => Object.values(localStorage).some((value) => value.includes(hash)), TX_REFUND)).toBe(false);
});

test("objective resolution and winning-share redemption each require the exact wallet-signed call", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "One objective lifecycle signing proof is sufficient.");
  await installRpcFixture(page, { resolution: "READY" });
  await installInjectedSepoliaWallet(page, [TX_RESOLVE, TX_REDEEM]);
  await page.goto(`/positions/0x${"4".repeat(64)}`);
  await connectInjectedWallet(page);
  await expect(page.getByRole("heading", { name: /First valid observation: 66000 USD/ })).toBeVisible();
  await page.getByRole("button", { name: "Resolve market with this evidence" }).click();
  await expect(page.getByText("Objective resolution receipt confirmed", { exact: true })).toBeVisible();

  await page.goto(`/positions/0x${"5".repeat(64)}`);
  await page.getByRole("button", { name: "Redeem winning shares" }).click();
  await expect(page.getByText("Redemption receipt confirmed", { exact: true })).toBeVisible();
  const writes = await walletTransactions(page);
  expect(writes).toHaveLength(2);
  expect(writes[0]).toEqual(expect.objectContaining({ from: FIXTURE_ACCOUNT, to: FIXTURE_RESOLVER }));
  expect(writes[0]!.data?.slice(0, 10)).toBe(toFunctionSelector("resolve(uint80,uint80)"));
  expect(writes[1]).toEqual(expect.objectContaining({ from: FIXTURE_ACCOUNT, to: FIXTURE_CONDITIONAL_TOKENS }));
  expect(writes[1]!.data?.slice(0, 10)).toBe(toFunctionSelector("redeemPositions(address,bytes32,bytes32,uint256[])"));
});

test("unconfirmed resolution and redemption each survive reload without a duplicate wallet write", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "One exact-hash position recovery proof is sufficient.");
  const rpc = await installRpcFixture(page, { resolution: "READY", withholdReceipts: [TX_RESOLVE, TX_REDEEM] });
  await installInjectedSepoliaWallet(page, [TX_RESOLVE, TX_REDEEM]);

  await page.goto(`/positions/0x${"4".repeat(64)}`);
  await connectInjectedWallet(page);
  await page.getByRole("button", { name: "Resolve market with this evidence" }).click();
  await expect.poll(async () => (await walletTransactions(page)).length).toBe(1);
  await page.reload();
  await expect(page.getByText("Objective resolution transaction remains locked", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resolve market with this evidence" })).toBeDisabled();
  rpc.releaseReceipt(TX_RESOLVE);
  await page.getByRole("button", { name: "Check exact receipt" }).click();
  await expect(page.getByText("Objective resolution receipt confirmed", { exact: true })).toBeVisible();
  expect(await walletTransactions(page)).toHaveLength(1);

  await page.goto(`/positions/0x${"5".repeat(64)}`);
  await page.getByRole("button", { name: "Redeem winning shares" }).click();
  await expect.poll(async () => (await walletTransactions(page)).length).toBe(2);
  await page.reload();
  await expect(page.getByText("Redemption transaction remains locked", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Redeem winning shares" })).toBeDisabled();
  rpc.releaseReceipt(TX_REDEEM);
  await page.getByRole("button", { name: "Check exact receipt" }).click();
  await expect(page.getByText("Redemption receipt confirmed", { exact: true })).toBeVisible();
  expect(await walletTransactions(page)).toHaveLength(2);
  expect(await page.evaluate((hashes) => Object.values(localStorage).some((value) => hashes.some((hash) => value.includes(hash))), [TX_RESOLVE, TX_REDEEM])).toBe(false);
});

test("pagination continues the exact stream snapshot without destroying a private draft", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The snapshot/draft assertion is viewport-independent.");
  const marketRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/v1/markets?")) marketRequests.push(request.url()); });
  await page.goto("/");
  await page.getByLabel(/Public amount/).fill("10");
  await page.getByLabel(/Private maximum price/).fill("0.52");
  await page.getByRole("button", { name: "Load more markets" }).click();
  await expect(page.getByRole("heading", { name: "Will BTC/USD settle at or above 66,000?" })).toBeVisible();
  await expect(page.getByLabel(/Public amount/)).toHaveValue("10");
  await expect(page.getByLabel(/Private maximum price/)).toHaveValue("0.52");
  expect(marketRequests.some((url) => url.includes("cursor=fixture-page-2") && url.includes("snapshot=fixture-snapshot"))).toBe(true);
});

test("the terminal exposes only confirmed market-scoped public fills", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile-390") await page.getByRole("article").first().getByRole("button", { name: "Trade YES" }).click();
  await page.getByRole("tab", { name: "Recent public fills" }).click();
  await expect(page.getByLabel("Confirmed public fills").getByText("YES · 20.000000 shares")).toBeVisible();
  await expect(page.getByLabel("Confirmed public fills").getByText(/block 121/)).toBeVisible();
});

test("mobile Trade is one full-context workspace with focus-restoring clean back and swipe dismissal", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "This is the 390px workspace contract.");
  await page.goto("/");
  const trade = page.getByRole("article").first().getByRole("button", { name: "Trade YES" });
  await trade.focus();
  await trade.click();
  const workspace = page.getByRole("region", { name: "Trade workspace" });
  await expect(workspace).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to Discover" })).toBeFocused();
  await expect(workspace.getByRole("heading", { name: "Will BTC/USD settle at or above 65,000?" })).toBeVisible();
  await expect(workspace.getByRole("heading", { name: "Underlying price history" })).toBeVisible();
  await expect(workspace.getByRole("heading", { name: "Real pool evidence" })).toBeVisible();
  await expect(workspace.getByLabel("Private order ticket")).toBeVisible();
  await page.getByRole("button", { name: "Back to Discover" }).click();
  await expect(workspace).toBeHidden();
  await expect(trade).toBeFocused();

  await trade.click();
  await workspace.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 7, clientX: 12, clientY: 320 });
  await workspace.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 7, clientX: 130, clientY: 326 });
  await expect(workspace).toBeHidden();
  await expect(trade).toBeFocused();
});

test("mobile browser back and edge swipe never silently lose a dirty private draft", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "This is the 390px draft-safety contract.");
  await page.goto("/");
  const trade = page.getByRole("article").first().getByRole("button", { name: "Trade YES" });
  await trade.click();
  const workspace = page.getByRole("region", { name: "Trade workspace" });
  await page.getByLabel(/Public amount/).fill("10");
  await page.getByLabel(/Private maximum price/).fill("0.52");
  await expect(page.locator(".app-nav")).toBeHidden();
  await page.getByRole("button", { name: "Back to Discover" }).focus();
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => document.querySelector<HTMLElement>('.trade-workspace')?.contains(document.activeElement))).toBe(true);
  await page.locator('.app-nav a[href="/orders"]').dispatchEvent("click");
  let dialog = page.getByRole("dialog", { name: "Discard this private draft?" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL("/");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel(/Private maximum price/)).toHaveValue("0.52");
  await page.goBack();
  dialog = page.getByRole("dialog", { name: "Discard this private draft?" });
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel(/Private maximum price/)).toHaveValue("0.52");

  await workspace.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 9, clientX: 10, clientY: 350 });
  await workspace.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 9, clientX: 135, clientY: 356 });
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel(/Private maximum price/)).toHaveValue("0.52");

  await page.getByRole("button", { name: "Back to Discover" }).click();
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Discard and continue" }).click();
  await expect(workspace).toBeHidden();
  await trade.click();
  await expect(page.getByLabel(/Public amount/)).toHaveValue("");
  await expect(page.getByLabel(/Private maximum price/)).toHaveValue("");
});

test("privacy explanation is reachable by keyboard and precise", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "One protected instruction inside a public market." })).toBeVisible();
  await expect(page.getByText(/raw maximum stays in browser memory/i).first()).toBeVisible();
  await expect(page.getByText(/derived minimum-share bound/i).first()).toBeVisible();
  await expectNoPageOverflow(page);
});

test("invalid catalog responses fail closed instead of rendering fixtures", async ({ page }) => {
  await page.route("**/v1/markets?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [{ question: "unsafe" }] }) }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "No live catalog data" })).toBeVisible();
  await expect(page.getByText(/outside the canonical protocol schema/i)).toBeVisible();
  await expect(page.getByText("unsafe")).toHaveCount(0);
});

test("reduced motion disables smooth scrolling and mobile snap", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const styles = await page.evaluate(() => ({ html: getComputedStyle(document.documentElement).scrollBehavior, snap: getComputedStyle(document.querySelector<HTMLElement>(".market-stream")!).scrollSnapType }));
  expect(styles.html).toBe("auto");
  expect(styles.snap).toBe("none");
});
