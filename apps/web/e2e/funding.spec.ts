import { expect, test, type Page } from "@playwright/test";
import { FUNDING_CLAIM_FIELDS } from "@noxlimit/protocol";
import { fundingFixtureValues, installFundingFixture } from "./funding-fixture";

async function connectInjectedWallet(page: Page) {
  await page.getByRole("button", { name: "Connect browser wallet" }).click();
  await expect(page.getByTitle("Disconnect wallet")).toBeVisible();
}

async function openFundingFromUnderfundedTicket(page: Page) {
  await page.goto("/");
  await connectInjectedWallet(page);
  const ticket = page.getByLabel("Private order ticket");
  await expect(ticket.getByRole("alert")).toContainText("Test funds required");
  await expect(ticket).toContainText("0 ETH / trading minimum 0.005");
  await expect(ticket).toContainText("0 USDC / trading minimum 0.01");
  await ticket.getByRole("link", { name: "Open test funding" }).click();
  await expect(page).toHaveURL("/funding");
  await expect(page.getByRole("heading", { name: "One wallet. No faucet hunt." })).toBeVisible();
}

test("an underfunded trader signs the exact bounded challenge, refreshes real balances, and returns ready", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "One deterministic wallet-signing proof is viewport-independent.");
  const fixture = await installFundingFixture(page);
  await openFundingFromUnderfundedTicket(page);

  await page.getByRole("button", { name: "Request funding challenge" }).click();
  await expect(page.getByText("Review signed request", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign and submit funding claim" }).click();

  const result = page.getByRole("status");
  await expect(result).toContainText("COMPLETE");
  await expect(result).toContainText("Received 0.01 Sepolia ETH and 25 NoxLimit Test USDC.");
  await expect(page.getByRole("button", { name: "Funding not needed" })).toBeDisabled();

  expect(fixture.challengeRequests).toEqual([{ address: fundingFixtureValues.account, chainId: 11_155_111 }]);
  expect(fixture.walletRequests).toHaveLength(1);
  const signingRequest = fixture.walletRequests[0]!;
  expect(signingRequest.method).toBe("eth_signTypedData_v4");
  expect(signingRequest.params?.[0]).toBe(fundingFixtureValues.account);
  const typedData = JSON.parse(String(signingRequest.params?.[1]));
  expect(typedData).toEqual(expect.objectContaining({
    domain: {
      name: "NoxLimit Testnet Funding",
      version: "1",
      chainId: 11_155_111,
      verifyingContract: fundingFixtureValues.treasury,
    },
    primaryType: "FundingClaim",
    message: {
      recipient: fundingFixtureValues.account,
      nonce: "3",
      deadline: fundingFixtureValues.deadline,
    },
  }));
  expect(typedData.types.FundingClaim).toEqual(FUNDING_CLAIM_FIELDS);
  expect(fixture.claimRequests).toEqual([{
    challengeId: fundingFixtureValues.challengeId,
    address: fundingFixtureValues.account,
    signature: fundingFixtureValues.signature,
  }]);
  expect(fixture.balanceReads).toEqual(expect.arrayContaining([
    { kind: "NATIVE", funded: false },
    { kind: "COLLATERAL", funded: false },
    { kind: "NATIVE", funded: true },
    { kind: "COLLATERAL", funded: true },
  ]));

  await page.goBack();
  await expect(page).toHaveURL("/");
  const ticket = page.getByLabel("Private order ticket");
  await expect(ticket.getByText("Test funds required")).toHaveCount(0);
  await ticket.getByLabel(/Public amount/).fill("10");
  await ticket.getByLabel(/Private maximum price/).fill("0.52");
  await expect(ticket.getByRole("button", { name: "Review private order" })).toBeEnabled();
});

test("an unavailable challenge service fails closed with honest copy", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The service-boundary copy is viewport-independent.");
  const fixture = await installFundingFixture(page, { challengeUnavailable: true });
  await openFundingFromUnderfundedTicket(page);
  await expect(page.locator(".readiness-list")).toContainText("Origin configured; relay readiness is checked when requested");
  await page.getByRole("button", { name: "Request funding challenge" }).click();
  const alert = page.locator(".funding-card").getByRole("alert");
  await expect(alert).toContainText("Funding action unavailable");
  await expect(alert).toContainText("NoxLimit service returned 503. Trust-critical actions remain disabled.");
  expect(fixture.walletRequests).toHaveLength(0);
  expect(fixture.claimRequests).toHaveLength(0);
});

test("a rejected funding signature is visible and never submits a claim", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The wallet-rejection boundary is viewport-independent.");
  const fixture = await installFundingFixture(page, { rejectSignature: true });
  await openFundingFromUnderfundedTicket(page);
  await page.getByRole("button", { name: "Request funding challenge" }).click();
  await page.getByRole("button", { name: "Sign and submit funding claim" }).click();
  const alert = page.locator(".funding-card").getByRole("alert");
  await expect(alert).toContainText("Funding action unavailable");
  await expect(alert).toContainText(/rejected/i);
  expect(fixture.walletRequests).toHaveLength(1);
  expect(fixture.walletRequests[0]?.method).toBe("eth_signTypedData_v4");
  expect(fixture.claimRequests).toHaveLength(0);
});
