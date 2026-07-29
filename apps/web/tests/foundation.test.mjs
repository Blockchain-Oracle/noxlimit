import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("the discover route is only a redirect to the canonical shell", async () => {
  assert.match(await read("src/app/discover/page.tsx"), /redirect\("\/"\)/);
});

test("the private maximum remains client-memory only", async () => {
  const ticket = await read("src/features/orders/private-order-flow.tsx");
  const api = await read("src/lib/api/client.ts");
  assert.match(ticket, /useState\(""\)/);
  assert.match(ticket, /type PendingCreation = \{ hash: Hex; orderBook: Address; marketId: string; side: MarketSide; amountIn: string; account: Address; chainId:/);
  assert.doesNotMatch(ticket.match(/type PendingCreation = \{[^\n]+/)?.[0] ?? "", /privateMaximum|minOut|encrypted/);
  assert.doesNotMatch(ticket, /localStorage\.setItem\([^\n]+privateMaximum|localStorage\.setItem\([^\n]+minOut|sessionStorage|URLSearchParams|console\./);
  assert.doesNotMatch(api, /maxPrice|privateMaximum|minOut|encryptInput/);
  assert.match(ticket, /handleClient\.encryptInput/);
});

test("wire schemas and transaction builders come from the canonical protocol package", async () => {
  const api = await read("src/lib/api/client.ts");
  const order = await read("src/features/orders/private-order-flow.tsx");
  assert.match(api, /from "@noxlimit\/protocol"/);
  assert.match(order, /buildCreateOrderTransaction/);
  await assert.rejects(read("src/lib/api/types.ts"));
});

test("providers compose wagmi and TanStack Query with SSR state", async () => {
  const providers = await read("src/components/providers/providers.tsx");
  const layout = await read("src/app/layout.tsx");
  assert.match(providers, /WagmiProvider/);
  assert.match(providers, /QueryClientProvider/);
  assert.match(providers, /WagmiProvider/);
  assert.doesNotMatch(providers, /RainbowKitProvider/);
  assert.match(layout, /cookieToInitialState/);
});

test("wallet identity changes clear the in-memory private draft", async () => {
  const order = await read("src/features/orders/private-order-flow.tsx");
  assert.match(order, /previousWalletIdentity/);
  assert.match(order, /setPrivateMaximum\(""\)/);
  assert.match(order, /setAmount\(""\)/);
});

test("order submission refreshes trust-critical reads and synchronously rejects duplicates", async () => {
  const order = await read("src/features/orders/private-order-flow.tsx");
  assert.match(order, /submissionInFlight\.current/);
  assert.match(order, /const freshDetail = await getMarketDetail/);
  assert.match(order, /const finalQuote = await getQuote/);
  assert.ok(order.indexOf("const finalQuote = await getQuote") < order.indexOf("handleClient.encryptInput"));
});

test("funding is an explicit challenge, typed signature, and claim", async () => {
  const funding = await read("src/components/onboarding/funding-readiness.tsx");
  assert.match(funding, /requestFundingChallenge/);
  assert.match(funding, /signTypedDataAsync/);
  assert.match(funding, /claimFunding/);
  assert.doesNotMatch(funding, /setTimeout|mock|fixture/i);
});

test("market switches require an explicit private-draft decision", async () => {
  const shell = await read("src/components/terminal/product-shell.tsx");
  assert.match(shell, /Discard this private draft/);
  assert.match(shell, /Keep editing/);
  assert.match(shell, /discardAndApply/);
  assert.match(shell, /kind: "filters"/);
  assert.match(shell, /draftResetKey/);
});

test("production market UI does not contain the design sample prices", async () => {
  const shell = await read("src/components/terminal/product-shell.tsx");
  for (const fixture of ["64,872.13", "65,000", "0.47", "56.818182", "5,000"]) assert.doesNotMatch(shell, new RegExp(fixture.replace(".", "\\.")));
});

test("all required route entry files exist", async () => {
  for (const path of ["src/app/page.tsx", "src/app/orders/page.tsx", "src/app/positions/page.tsx", "src/app/activity/page.tsx", "src/app/privacy/page.tsx", "src/app/funding/page.tsx", "src/app/loading.tsx", "src/app/error.tsx", "src/app/not-found.tsx"]) await assert.doesNotReject(read(path));
});

test("confirmed creation decodes OrderCreated and navigates by composite reference", async () => {
  const order = await read("src/features/orders/private-order-flow.tsx");
  assert.match(order, /decodeEventLog/);
  assert.match(order, /eventName === "OrderCreated"/);
  assert.match(order, /router\.push\(`\/orders\/\$\{ref\.chainId\}\/\$\{ref\.orderBook\}\/\$\{ref\.orderId\}`\)/);
});

test("wallet surfaces use real service projections and canonical transaction builders", async () => {
  const api = await read("src/lib/api/client.ts");
  const detail = await read("src/features/orders/order-detail.tsx");
  const position = await read("src/features/positions/position-detail.tsx");
  for (const endpoint of ["/v1/orders", "/v1/positions", "/v1/activity", "/history"]) assert.match(api, new RegExp(endpoint));
  for (const builder of ["buildCancelOrderTransaction", "buildExpireOrderTransaction", "buildRefundOrderTransaction"]) assert.match(detail, new RegExp(builder));
  assert.match(position, /buildRedeemPositionsTransaction/);
  assert.match(position, /buildResolveMarketTransaction/);
  assert.match(position, /findResolutionEvidence/);
});

test("receipt tracking is replacement-aware and conservative about dropped transactions", async () => {
  const receipt = await read("src/lib/wallet/transaction.ts");
  assert.match(receipt, /onReplaced/);
  assert.match(receipt, /UNCONFIRMED/);
  assert.match(receipt, /UnconfirmedTransactionError/);
  assert.match(receipt, /keep checking this exact hash/);
  assert.doesNotMatch(receipt, /state: "DROPPED"/);
  assert.match(receipt, /replacement\.reason === "cancelled"/);
  assert.match(receipt, /different action/);
});

test("accepted fonts are self-hosted with no remote font request", async () => {
  const tokens = await read("src/styles/tokens.css");
  assert.match(tokens, /\/fonts\/archivo-variable\.woff2/);
  assert.match(tokens, /\/fonts\/ibm-plex-mono\.woff2/);
  assert.doesNotMatch(tokens, /https?:\/\//);
});

test("browser fixtures are isolated from production imports", async () => {
  const productionFiles = ["src/lib/api/client.ts", "src/components/terminal/product-shell.tsx", "src/app/page.tsx"];
  for (const file of productionFiles) assert.doesNotMatch(await read(file), /fixture-server|e2e\//);
  assert.match(await read("playwright.config.ts"), /desktop-1440/);
  assert.match(await read("playwright.config.ts"), /mobile-390/);
});

test("runtime variables are documented without secrets", async () => {
  const env = await read(".env.example");
  for (const key of ["NEXT_PUBLIC_NOXLIMIT_API_ORIGIN", "NEXT_PUBLIC_SEPOLIA_RPC_URL", "NEXT_PUBLIC_TEST_USDC_ADDRESS", "NEXT_PUBLIC_FUNDING_TARGET_ETH", "NEXT_PUBLIC_FUNDING_TARGET_USDC"]) assert.match(env, new RegExp(key));
  assert.doesNotMatch(env, /PRIVATE_KEY|SECRET|PASSWORD/);
});

test("heavy Nox client loads only after a wallet exists", async () => {
  const hook = await read("src/lib/nox/use-handle-client.ts");
  assert.match(hook, /enabled: Boolean\(walletClient\)/);
  assert.match(hook, /await import\("@iexec-nox\/handle"\)/);
  assert.doesNotMatch(hook, /import \{ createViemHandleClient/);
});

test("recovery, funding, and disconnected collections expose safe user actions", async () => {
  const order = await read("src/features/orders/order-detail.tsx");
  const funding = await read("src/components/onboarding/funding-readiness.tsx");
  const balanceReadiness = await read("src/lib/wallet/use-funding-readiness.ts");
  const collections = await read("src/components/wallet/wallet-collections.tsx");
  assert.doesNotMatch(order, /buildExpireEvaluationTransaction/);
  assert.match(order, /buildExpireOrderTransaction/);
  assert.match(funding, /prerequisitesReady && funding\.status === "INSUFFICIENT"/);
  assert.match(funding, /funding\.refetchBalances\(\)/);
  assert.match(balanceReadiness, /nativeBalance\.refetch\(\)/);
  assert.match(balanceReadiness, /collateralBalance\.refetch\(\)/);
  assert.match(collections, /Connect one wallet to load its confirmed orders/);
});

test("closed market history, chart controls, and card previews use verified service evidence", async () => {
  const api = await read("src/lib/api/client.ts");
  const shell = await read("src/components/terminal/product-shell.tsx");
  assert.match(api, /queryInput\.lifecycle && queryInput\.lifecycle !== "LIVE"[\s\S]+market\.verification === "VERIFIED"[\s\S]+isLiveCatalogMarket\(market\)/);
  assert.match(api, /mode: input\.mode/);
  assert.match(api, /range: input\.range/);
  assert.match(api, /if \(input\.cursor\) query\.set\("cursor", input\.cursor\)/);
  assert.match(shell, /<MarketPreviewChart preview=\{market\.preview\}/);
  assert.doesNotMatch(shell, /className="unit-bar"/);
  assert.match(shell, /Outcome prices/);
  assert.match(shell, /View exact chart data/);
  assert.match(shell, /NoxLimit orders close/);
});

test("a submitted create is publicly persisted and cannot fall back to a blind resend", async () => {
  const order = await read("src/features/orders/private-order-flow.tsx");
  assert.match(order, /pendingCreationStorageKey/);
  assert.match(order, /SUBMITTED_UNCONFIRMED/);
  assert.match(order, /Check exact receipt/);
  assert.match(order, /setPrivateMaximum\(""\)/);
  assert.match(order, /will not expose another create action/);
});

test("durable markets reuse the canonical responsive shell and draft dialogs trap focus", async () => {
  const route = await read("src/app/markets/[marketId]/page.tsx");
  const home = await read("src/app/page.tsx");
  const shell = await read("src/components/terminal/product-shell.tsx");
  assert.match(route, /<ProductShell/);
  assert.match(route, /initialMarket=\{result\.data\}/);
  assert.doesNotMatch(route, /redirect/);
  assert.match(home, /initialMarketId/);
  assert.match(shell, /event\.key === "Escape"/);
  assert.match(shell, /requestAnimationFrame\(\(\) => dialogTriggerRef\.current\?\.focus\(\)\)/);
});

test("mobile navigation, filters, and explicit previous-next share one responsive tree", async () => {
  const header = await read("src/components/shell/app-header.tsx");
  const shell = await read("src/components/terminal/product-shell.tsx");
  const styles = await read("src/styles/components.css");
  assert.match(header, /app-header-backdrop/);
  assert.match(header, /<nav className="app-nav"/);
  assert.ok(header.indexOf("<\/header>") < header.indexOf("<nav className=\"app-nav\""));
  assert.match(shell, /Filter &amp; sort/);
  assert.match(shell, /Previous/);
  assert.match(shell, /Next/);
  assert.match(styles, /scroll-margin-block-start: 59px/);
});

test("confirmed order receipts are seeded before navigation and indexer lag has an onchain fallback", async () => {
  const create = await read("src/features/orders/private-order-flow.tsx");
  const detail = await read("src/features/orders/order-detail.tsx");
  assert.match(create, /queryClient\.setQueryData\(confirmedOrderReceiptQueryKey/);
  assert.ok(create.indexOf("queryClient.setQueryData") < create.indexOf("router.push"));
  assert.match(detail, /ownerOf/);
  assert.match(detail, /Order confirmed; indexer catching up/);
  assert.match(detail, /NoxLimit orders close/);
  for (const field of ["remainingEvaluations", "lastEvaluationAt", "nextEvaluationEligibleAt", "transactionHash"]) assert.match(detail, new RegExp(field));
});

test("GET reads avoid unnecessary JSON preflights while writes keep a JSON content type", async () => {
  const api = await read("src/lib/api/client.ts");
  assert.match(api, /init\?\.body !== undefined/);
  assert.doesNotMatch(api, /headers: \{ accept: "application\/json", "content-type": "application\/json"/);
});
