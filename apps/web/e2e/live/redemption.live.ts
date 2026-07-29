/**
 * NoxLimit Phase 6 objective-resolution and redemption proof.
 *
 * Isolated from the ordinary browser suite and order-creation proof. Exact opt-in permits only one
 * catalog-bound resolver transaction and one canonical CTF redemption. A secret-free durable
 * journal is created before either write and records INTENT → SUBMITTED → CONFIRMED.
 */
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import {
  TEST_USDC_DECIMALS,
  buildRedeemPositionsTransaction,
  buildResolveMarketTransaction,
  decimalToAtoms,
  erc20Abi,
  fixedProductMarketMakerAbi,
  healthViewSchema,
  marketViewSchema,
  noxLimitOrderBookAbi,
  positionViewSchema,
  priceBinaryResolverAbi,
  type MarketView,
  type PositionView,
} from "@noxlimit/protocol";
import {
  createPublicClient,
  getAddress,
  http,
  parseAbi,
  parseEventLogs,
  parseUnits,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import {
  openLiveRedemptionJournal,
  redemptionJournalPath,
  type LiveRedemptionJournal,
  type RedemptionActionKind,
} from "./redemption-journal.ts";
import {
  reconcileBareRedemptionIntents,
  recordOrConfirmRetryBrowserEvidence,
} from "./redemption-recovery.ts";
import {
  LIVE_REDEMPTION_CONFIRMATION,
  readLiveRedemptionSettings,
  type LiveRedemptionSettings,
} from "./redemption-settings.ts";
import {
  createLiveSepoliaRedemptionWallet,
} from "./redemption-wallet.ts";

const PHASE_OFFSET = 64n;
const ROUND_MASK = (1n << PHASE_OFFSET) - 1n;
const ZERO_BYTES32 = `0x${"00".repeat(32)}` as Hex;

const transferAbi = parseAbi(["event Transfer(address indexed from,address indexed to,uint256 value)"]);
const conditionalTokensProofAbi = parseAbi([
  "event PayoutRedemption(address indexed redeemer,address indexed collateralToken,bytes32 indexed parentCollectionId,bytes32 conditionId,uint256[] indexSets,uint256 payout)",
  "function balanceOf(address,uint256) view returns (uint256)",
  "function payoutDenominator(bytes32) view returns (uint256)",
  "function payoutNumerators(bytes32,uint256) view returns (uint256)",
]);
const resolverBindingAbi = parseAbi([
  "function conditionalTokens() view returns (address)",
  "function settlementAdapter() view returns (address)",
  "function conditionId() view returns (bytes32)",
  "function questionId() view returns (bytes32)",
  "function strikePriceWad() view returns (int256)",
  "function resolvesAt() view returns (uint64)",
  "function maximumObservationDelay() view returns (uint64)",
]);
const adapterBindingAbi = parseAbi([
  "function feed() view returns (address)",
  "function feedDecimals() view returns (uint8)",
]);
const chainlinkProofAbi = parseAbi([
  "function getRoundData(uint80) view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)",
  "function phaseAggregators(uint16) view returns (address)",
]);
const aggregatorProofAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)",
]);

const live = readLiveRedemptionSettings();
const liveWriteRequested = process.env.LIVE_REDEMPTION_CONFIRM === LIVE_REDEMPTION_CONFIRMATION;
test.skip(!liveWriteRequested, live.enabled ? undefined : live.reason);

test("resolves from the exact first observation and redeems the winning position through the product", async () => {
  if (!live.enabled) throw new Error(live.reason);
  const settings = live.settings;
  let safeFailureStage = "initialize";
  try {
  delete process.env.LIVE_REDEMPTION_PRIVATE_KEY;
  delete process.env.LIVE_REDEMPTION_RPC_URL;
  safeFailureStage = "check-evidence-target";
  await assertEvidenceTargetFresh(settings);

  const account = privateKeyToAccount(settings.privateKey);
  const publicClient = createPublicClient({ chain: sepolia, transport: http(settings.rpcUrl) });
  safeFailureStage = "read-service-preflight";
  const [health, market, initialPositions] = await Promise.all([
    readApi(settings, "/v1/health", healthViewSchema),
    readApi(settings, `/v1/markets/${settings.marketId}`, marketViewSchema),
    readPositions(settings, account.address),
  ]);
  if (health.status !== "READY") throw new Error("The live NoxLimit service must be READY before resolution writes.");
  if (market.marketId !== settings.marketId || market.chainId !== sepolia.id) throw new Error("The configured market is not the exact verified Sepolia market.");
  const initialPosition = exactPosition(initialPositions, settings.positionId);
  if (getAddress(initialPosition.owner) !== account.address || initialPosition.marketId !== settings.marketId) {
    throw new Error("The configured position is not owned by this wallet in the configured market.");
  }

  safeFailureStage = "verify-bundle-and-rounds";
  const bundle = await verifyBundleAndRoundEvidence(publicClient, market, health.catalogRevision, settings);
  if (bundle.expectedWinner !== initialPosition.side || bundle.expectedWinner !== settings.expectedWinner) {
    throw new Error("The independently derived Chainlink winner does not match the configured position side.");
  }

  safeFailureStage = "open-recovery-journal";
  const journal = await openLiveRedemptionJournal({
    journalPath: redemptionJournalPath(settings.evidencePath),
    binding: {
      chainId: sepolia.id,
      marketId: market.marketId,
      positionId: initialPosition.positionId,
      wallet: account.address,
      catalogRevision: health.catalogRevision,
      resolver: bundle.resolver,
      conditionalTokens: bundle.conditionalTokens,
      collateral: bundle.collateral,
      conditionId: market.contracts.conditionId,
      selectedRoundId: settings.selectedRoundId.toString(),
      predecessorRoundId: settings.predecessorRoundId.toString(),
      expectedWinner: bundle.expectedWinner,
      evidenceOutputPath: resolve(process.cwd(), settings.evidencePath),
    },
  });

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  try {
    safeFailureStage = "reconcile-recovery-journal";
    await reconcileBareRedemptionIntents({
      journal,
      client: publicClient,
      wallet: account.address,
      recovery: settings.recovery,
      expected: {
        resolution: buildResolveMarketTransaction({
          resolver: bundle.resolver,
          selectedRoundId: settings.selectedRoundId,
          predecessorRoundId: settings.predecessorRoundId,
        }),
        redemption: buildRedeemPositionsTransaction({
          conditionalTokens: bundle.conditionalTokens,
          collateral: bundle.collateral,
          conditionId: market.contracts.conditionId,
        }),
      },
    });
    await failClosedOnBareIntent(journal);
    const wallet = createLiveSepoliaRedemptionWallet({
      privateKey: settings.privateKey,
      rpcUrl: settings.rpcUrl,
      resolver: bundle.resolver,
      conditionalTokens: bundle.conditionalTokens,
      collateral: bundle.collateral,
      conditionId: market.contracts.conditionId,
      selectedRoundId: settings.selectedRoundId,
      predecessorRoundId: settings.predecessorRoundId,
      journal,
    });
    safeFailureStage = "launch-browser";
    browser = await launchLiveBrowser();
    context = await liveContext(browser, settings, wallet.install);
    page = await context.newPage();

    let resolutionReceipt = await receiptForRecordedAction(journal, publicClient, "resolution", bundle.resolver);
    if (!resolutionReceipt) {
      safeFailureStage = "check-unresolved-browser-position";
      const currentlyResolved = await publicClient.readContract({ address: bundle.resolver, abi: priceBinaryResolverAbi, functionName: "resolved" });
      if (currentlyResolved || initialPosition.state !== "AWAITING_RESOLUTION") {
        throw new Error("A fresh browser resolution requires an unresolved resolver and AWAITING_RESOLUTION position.");
      }
      safeFailureStage = "navigate-to-browser-position";
      await page.goto(`/positions/${settings.positionId}`);
      safeFailureStage = "locate-browser-wallet-connect";
      const connectButton = page.getByRole("button", { name: "Connect browser wallet" });
      const disconnectButton = page.getByTitle("Disconnect wallet");
      await expect(connectButton.or(disconnectButton).first()).toBeVisible();
      if (!(await disconnectButton.isVisible())) {
        safeFailureStage = "request-browser-wallet-connect";
        await connectButton.click();
      }
      safeFailureStage = "wait-for-browser-wallet-connect";
      try {
        await expect(disconnectButton).toBeVisible();
      } catch (reason) {
        const methods = wallet.requestedMethods();
        safeFailureStage = `wait-for-browser-wallet-connect:${methods.length > 0 ? methods.join(",") : "no-provider-request"}`;
        throw reason;
      }
      safeFailureStage = "verify-browser-resolution-evidence";
      const readyEvidence = page.locator(".resolution-evidence").filter({ hasText: "Resolver ready" });
      await expect(readyEvidence).toContainText(`Selected round ${settings.selectedRoundId.toString()}`);
      await expect(readyEvidence).toContainText(`adjacent predecessor ${settings.predecessorRoundId.toString()}`);
      safeFailureStage = "record-browser-safe-snapshot";
      const browserSnapshot = await browserSafeSnapshot(publicClient, readyEvidence);
      await recordOrConfirmRetryBrowserEvidence(journal, browserSnapshot);
      safeFailureStage = "submit-browser-resolution";
      await page.getByRole("button", { name: "Resolve market with this evidence" }).click();
      safeFailureStage = "wait-for-browser-resolution-receipt";
      await expect(page.getByText("Objective resolution receipt confirmed", { exact: true })).toBeVisible({ timeout: 180_000 });
      safeFailureStage = "verify-browser-resolution-write-count";
      await expect.poll(() => wallet.writes().length).toBe(1);
      safeFailureStage = "read-browser-resolution-journal";
      resolutionReceipt = await receiptForRecordedAction(journal, publicClient, "resolution", bundle.resolver);
      if (!resolutionReceipt) throw new Error("The browser resolution did not leave a submitted journal action.");
    }

    const resolutionEvent = validateResolutionReceipt(resolutionReceipt, bundle, settings);
    await confirmIfSubmitted(journal, "resolution", resolutionReceipt);
    safeFailureStage = "wait-for-redeemable-position";
    let redemptionExpectation = journal.snapshot().redemptionExpectation;
    if (!redemptionExpectation) {
      const redeemablePosition = await waitForPositionState(settings, account.address, settings.positionId, "REDEEMABLE");
      if (redeemablePosition.side !== bundle.expectedWinner) throw new Error("The redeemable position does not match the objective winning side.");
      await journal.recordRedemptionExpectation({
        side: redeemablePosition.side,
        shares: redeemablePosition.shares,
        maximumRedemption: redeemablePosition.maximumRedemption,
      });
      redemptionExpectation = journal.snapshot().redemptionExpectation;
    }
    if (!redemptionExpectation || redemptionExpectation.side !== bundle.expectedWinner) {
      throw new Error("The journaled payout expectation does not match the objective winner.");
    }

    let redemptionReceipt = await receiptForRecordedAction(journal, publicClient, "redemption", bundle.conditionalTokens);
    if (!redemptionReceipt) {
      safeFailureStage = "browser-redemption";
      await page.goto(`/positions/${settings.positionId}`);
      await connect(page);
      await expect(page.locator(".status-banner strong")).toHaveText("REDEEMABLE");
      await page.getByRole("button", { name: "Redeem winning shares" }).click();
      await expect(page.getByText("Redemption receipt confirmed", { exact: true })).toBeVisible({ timeout: 180_000 });
      await expect(page.getByRole("button", { name: "Redeem winning shares" })).toBeDisabled();
      await expect.poll(() => wallet.writes().length).toBe(2);
      redemptionReceipt = await receiptForRecordedAction(journal, publicClient, "redemption", bundle.conditionalTokens);
      if (!redemptionReceipt) throw new Error("The browser redemption did not leave a submitted journal action.");
    }

    safeFailureStage = "validate-redemption-proof";
    const payout = await validateRedemptionReceipt(
      publicClient,
      redemptionReceipt,
      bundle,
      market,
      account.address,
      redemptionExpectation,
    );
    await confirmIfSubmitted(journal, "redemption", redemptionReceipt);
    safeFailureStage = "wait-for-redeemed-projection";
    const finalPosition = await waitForPositionState(settings, account.address, settings.positionId, "REDEEMED");
    if (finalPosition.shares !== "0.000000") throw new Error("The final safe-block projection did not consume the redeemed shares.");

    const finalJournal = journal.snapshot();
    if (
      finalJournal.actions.resolution.state !== "CONFIRMED"
      || finalJournal.actions.redemption.state !== "CONFIRMED"
      || finalJournal.actions.resolution.attempt < 1
      || finalJournal.actions.redemption.attempt < 1
      || finalJournal.actions.resolution.transactionHash !== finalJournal.actions.resolution.preparedTransaction?.transactionHash
      || finalJournal.actions.redemption.transactionHash !== finalJournal.actions.redemption.preparedTransaction?.transactionHash
      || !finalJournal.browserEvidence
    ) throw new Error("The final journal does not prove one exact durable transaction per action.");

    safeFailureStage = "write-public-evidence";
    await writeEvidence(settings, {
      healthCatalogRevision: health.catalogRevision,
      market,
      initialPosition,
      redemptionExpectation,
      finalPosition,
      bundle,
      journal: finalJournal,
      resolutionReceipt,
      redemptionReceipt,
      resolutionEvent,
      payout,
    });
  } finally {
    await context?.close();
    await browser?.close();
    await journal.close();
  }
  } catch {
    throw new Error(`The live Sepolia redemption proof failed safely during ${safeFailureStage}. Provider credentials and signed transaction material were suppressed; inspect the private journal and redacted local logs.`);
  }
});

type VerifiedBundle = Readonly<{
  resolver: Address;
  conditionalTokens: Address;
  collateral: Address;
  questionId: Hex;
  yesPositionId: bigint;
  noPositionId: bigint;
  expectedWinner: "YES" | "NO";
  preflightSafeBlock: Readonly<{ number: bigint; hash: Hex; timestamp: bigint }>;
  selectedAnswer: bigint;
  selectedPriceWad: bigint;
  selectedObservedAt: bigint;
  predecessorObservedAt: bigint;
}>;

async function verifyBundleAndRoundEvidence(
  client: PublicClient,
  market: MarketView,
  catalogRevision: Hex,
  settings: LiveRedemptionSettings,
): Promise<VerifiedBundle> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(catalogRevision)) throw new Error("The service did not expose a canonical catalog revision.");
  const safe = await client.getBlock({ blockTag: "safe" });
  if (safe.number === null || safe.hash === null) throw new Error("The preflight safe block has no canonical number or hash.");
  const blockNumber = safe.number;
  const resolver = getAddress(market.contracts.resolver);
  const fpmm = getAddress(market.contracts.fpmm);
  const orderBook = getAddress(market.contracts.orderBook);
  const [
    resolverConditionalTokens,
    settlementAdapter,
    resolverConditionId,
    questionId,
    strikePriceWad,
    resolvesAt,
    maximumObservationDelay,
    fpmmConditionalTokens,
    collateral,
    fpmmConditionId,
    orderBookFpmm,
    orderBookConditionalTokens,
    orderBookCollateral,
    orderBookConditionId,
    yesPositionId,
    noPositionId,
  ] = await Promise.all([
    client.readContract({ address: resolver, abi: resolverBindingAbi, functionName: "conditionalTokens", blockNumber }),
    client.readContract({ address: resolver, abi: resolverBindingAbi, functionName: "settlementAdapter", blockNumber }),
    client.readContract({ address: resolver, abi: resolverBindingAbi, functionName: "conditionId", blockNumber }),
    client.readContract({ address: resolver, abi: resolverBindingAbi, functionName: "questionId", blockNumber }),
    client.readContract({ address: resolver, abi: resolverBindingAbi, functionName: "strikePriceWad", blockNumber }),
    client.readContract({ address: resolver, abi: resolverBindingAbi, functionName: "resolvesAt", blockNumber }),
    client.readContract({ address: resolver, abi: resolverBindingAbi, functionName: "maximumObservationDelay", blockNumber }),
    client.readContract({ address: fpmm, abi: fixedProductMarketMakerAbi, functionName: "conditionalTokens", blockNumber }),
    client.readContract({ address: fpmm, abi: fixedProductMarketMakerAbi, functionName: "collateralToken", blockNumber }),
    client.readContract({ address: fpmm, abi: fixedProductMarketMakerAbi, functionName: "conditionIds", args: [0n], blockNumber }),
    client.readContract({ address: orderBook, abi: noxLimitOrderBookAbi, functionName: "fpmm", blockNumber }),
    client.readContract({ address: orderBook, abi: noxLimitOrderBookAbi, functionName: "conditionalTokens", blockNumber }),
    client.readContract({ address: orderBook, abi: noxLimitOrderBookAbi, functionName: "collateral", blockNumber }),
    client.readContract({ address: orderBook, abi: noxLimitOrderBookAbi, functionName: "conditionId", blockNumber }),
    client.readContract({ address: orderBook, abi: noxLimitOrderBookAbi, functionName: "yesPositionId", blockNumber }),
    client.readContract({ address: orderBook, abi: noxLimitOrderBookAbi, functionName: "noPositionId", blockNumber }),
  ]);
  const conditionalTokens = getAddress(resolverConditionalTokens);
  const collateralAddress = getAddress(collateral);
  const expectedResolvesAt = BigInt(Math.floor(Date.parse(market.resolvesAt) / 1_000));
  if (
    conditionalTokens !== getAddress(fpmmConditionalTokens)
    || conditionalTokens !== getAddress(orderBookConditionalTokens)
    || fpmm !== getAddress(orderBookFpmm)
    || collateralAddress !== getAddress(orderBookCollateral)
    || resolverConditionId !== market.contracts.conditionId
    || fpmmConditionId !== market.contracts.conditionId
    || orderBookConditionId !== market.contracts.conditionId
    || strikePriceWad !== parseUnits(market.strikeUsd, 18)
    || resolvesAt !== expectedResolvesAt
    || maximumObservationDelay <= 0n
    || questionId === ZERO_BYTES32
    || yesPositionId === 0n
    || noPositionId === 0n
    || yesPositionId === noPositionId
  ) throw new Error("Resolver, FPMM, OrderBook, collateral, condition, strike, timing, or outcome-position bindings disagree.");

  const adapter = getAddress(settlementAdapter);
  const [feed, feedDecimals] = await Promise.all([
    client.readContract({ address: adapter, abi: adapterBindingAbi, functionName: "feed", blockNumber }),
    client.readContract({ address: adapter, abi: adapterBindingAbi, functionName: "feedDecimals", blockNumber }),
  ]);
  const feedAddress = getAddress(feed);
  const [selected, predecessor] = await Promise.all([
    client.readContract({ address: feedAddress, abi: chainlinkProofAbi, functionName: "getRoundData", args: [settings.selectedRoundId], blockNumber }),
    client.readContract({ address: feedAddress, abi: chainlinkProofAbi, functionName: "getRoundData", args: [settings.predecessorRoundId], blockNumber }),
  ]);
  const [selectedId, selectedAnswer, , selectedUpdatedAt] = selected;
  const [predecessorId, predecessorAnswer, , predecessorUpdatedAt] = predecessor;
  if (
    selectedId !== settings.selectedRoundId
    || predecessorId !== settings.predecessorRoundId
    || selectedAnswer <= 0n
    || predecessorAnswer <= 0n
    || selectedUpdatedAt === 0n
    || predecessorUpdatedAt === 0n
    || predecessorUpdatedAt >= resolvesAt
    || selectedUpdatedAt < resolvesAt
    || selectedUpdatedAt > resolvesAt + maximumObservationDelay
    || predecessorUpdatedAt >= selectedUpdatedAt
  ) throw new Error("The safe-block Chainlink round pair fails identity, positivity, chronology, or delay bounds.");
  await verifyRoundAdjacency(client, feedAddress, selected, predecessor, blockNumber);
  const expectedWinner = selectedAnswer >= parseUnits(market.strikeUsd, Number(feedDecimals)) ? "YES" : "NO";
  const selectedPriceWad = normalizePriceWad(selectedAnswer, Number(feedDecimals));
  return {
    resolver,
    conditionalTokens,
    collateral: collateralAddress,
    questionId,
    yesPositionId,
    noPositionId,
    expectedWinner,
    preflightSafeBlock: { number: safe.number, hash: safe.hash, timestamp: safe.timestamp },
    selectedAnswer,
    selectedPriceWad,
    selectedObservedAt: selectedUpdatedAt,
    predecessorObservedAt: predecessorUpdatedAt,
  };
}

async function verifyRoundAdjacency(
  client: PublicClient,
  feed: Address,
  selected: readonly [bigint, bigint, bigint, bigint, bigint],
  predecessor: readonly [bigint, bigint, bigint, bigint, bigint],
  blockNumber: bigint,
): Promise<void> {
  const selectedPhase = selected[0] >> PHASE_OFFSET;
  const selectedLocal = selected[0] & ROUND_MASK;
  const predecessorPhase = predecessor[0] >> PHASE_OFFSET;
  const predecessorLocal = predecessor[0] & ROUND_MASK;
  if (selectedPhase === 0n || selectedLocal === 0n || predecessorPhase === 0n || predecessorLocal === 0n) {
    throw new Error("The Chainlink pair contains an invalid composite round identifier.");
  }
  if (selectedLocal > 1n) {
    if (predecessor[0] !== selected[0] - 1n) throw new Error("The same-phase Chainlink predecessor is not exactly adjacent.");
    return;
  }
  if (predecessorPhase + 1n !== selectedPhase) throw new Error("The Chainlink phase-transition predecessor is not in the immediately prior phase.");
  const aggregator = await client.readContract({
    address: feed,
    abi: chainlinkProofAbi,
    functionName: "phaseAggregators",
    args: [Number(predecessorPhase)],
    blockNumber,
  });
  if (getAddress(aggregator) === zeroAddress) throw new Error("The prior Chainlink phase has no bound aggregator.");
  const terminal = await client.readContract({ address: aggregator, abi: aggregatorProofAbi, functionName: "latestRoundData", blockNumber });
  if (terminal[0] !== predecessorLocal || terminal[1] !== predecessor[1] || terminal[3] !== predecessor[3]) {
    throw new Error("The prior phase terminal observation does not match the proxy predecessor.");
  }
}

function validateResolutionReceipt(
  receipt: TransactionReceipt,
  bundle: VerifiedBundle,
  settings: LiveRedemptionSettings,
) {
  const events = parseEventLogs({ abi: priceBinaryResolverAbi, eventName: "MarketResolved", logs: receipt.logs, strict: true })
    .filter((entry) => getAddress(entry.address) === bundle.resolver);
  if (events.length !== 1) throw new Error("The exact resolver receipt does not contain one MarketResolved event.");
  const event = events[0]!;
  if (
    event.args.questionId !== bundle.questionId
    || event.args.selectedRoundId !== settings.selectedRoundId
    || event.args.predecessorRoundId !== settings.predecessorRoundId
    || event.args.settlementPriceWad !== bundle.selectedPriceWad
    || event.args.observedAt !== bundle.selectedObservedAt
    || (event.args.yesWon ? "YES" : "NO") !== bundle.expectedWinner
  ) throw new Error("The full MarketResolved event does not match the bound question, price, time, rounds, and winner.");
  return event.args;
}

function normalizePriceWad(answer: bigint, decimals: number): bigint {
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 36 || answer <= 0n) {
    throw new Error("The selected Chainlink answer cannot be normalized safely.");
  }
  return decimals === 18
    ? answer
    : decimals < 18
      ? answer * 10n ** BigInt(18 - decimals)
      : answer / 10n ** BigInt(decimals - 18);
}

async function validateRedemptionReceipt(
  client: PublicClient,
  receipt: TransactionReceipt,
  bundle: VerifiedBundle,
  market: MarketView,
  owner: Address,
  position: Readonly<{ maximumRedemption: string }>,
) {
  if (receipt.blockNumber === 0n) throw new Error("The redemption receipt has no prior block for a balance snapshot.");
  const beforeBlock = receipt.blockNumber - 1n;
  const afterBlock = receipt.blockNumber;
  const [
    collateralBefore,
    collateralAfter,
    yesBefore,
    noBefore,
    yesAfter,
    noAfter,
    payoutDenominator,
    yesNumerator,
    noNumerator,
  ] = await Promise.all([
    balanceOf(client, bundle.collateral, owner, beforeBlock),
    balanceOf(client, bundle.collateral, owner, afterBlock),
    conditionalBalance(client, bundle.conditionalTokens, owner, bundle.yesPositionId, beforeBlock),
    conditionalBalance(client, bundle.conditionalTokens, owner, bundle.noPositionId, beforeBlock),
    conditionalBalance(client, bundle.conditionalTokens, owner, bundle.yesPositionId, afterBlock),
    conditionalBalance(client, bundle.conditionalTokens, owner, bundle.noPositionId, afterBlock),
    client.readContract({ address: bundle.conditionalTokens, abi: conditionalTokensProofAbi, functionName: "payoutDenominator", args: [market.contracts.conditionId], blockNumber: afterBlock }),
    client.readContract({ address: bundle.conditionalTokens, abi: conditionalTokensProofAbi, functionName: "payoutNumerators", args: [market.contracts.conditionId, 0n], blockNumber: afterBlock }),
    client.readContract({ address: bundle.conditionalTokens, abi: conditionalTokensProofAbi, functionName: "payoutNumerators", args: [market.contracts.conditionId, 1n], blockNumber: afterBlock }),
  ]);
  if (payoutDenominator === 0n || yesAfter !== 0n || noAfter !== 0n) throw new Error("The redemption did not consume both binary outcome balances against a resolved payout vector.");
  const computedPayout = (yesBefore * yesNumerator) / payoutDenominator + (noBefore * noNumerator) / payoutDenominator;
  const collateralDelta = collateralAfter - collateralBefore;
  const redemptions = parseEventLogs({ abi: conditionalTokensProofAbi, eventName: "PayoutRedemption", logs: receipt.logs, strict: true })
    .filter((entry) =>
      getAddress(entry.address) === bundle.conditionalTokens
      && getAddress(entry.args.redeemer) === owner
      && getAddress(entry.args.collateralToken) === bundle.collateral
      && entry.args.parentCollectionId === ZERO_BYTES32
      && entry.args.conditionId === market.contracts.conditionId
      && entry.args.indexSets.length === 2
      && entry.args.indexSets[0] === 1n
      && entry.args.indexSets[1] === 2n
    );
  if (redemptions.length !== 1) throw new Error("The exact CTF receipt does not contain one bound PayoutRedemption event.");
  const payout = redemptions[0]!.args.payout;
  const transfers = parseEventLogs({ abi: transferAbi, eventName: "Transfer", logs: receipt.logs, strict: true })
    .filter((entry) =>
      getAddress(entry.address) === bundle.collateral
      && getAddress(entry.args.from) === bundle.conditionalTokens
      && getAddress(entry.args.to) === owner
      && entry.args.value === payout
    );
  const apiMaximum = decimalToAtoms(position.maximumRedemption, TEST_USDC_DECIMALS);
  if (transfers.length !== 1 || payout <= 0n || payout !== computedPayout || payout !== collateralDelta || payout !== apiMaximum) {
    throw new Error("Redemption payout, exact transfer, block-pinned balance delta, computed CTF payout, and API corroboration disagree.");
  }
  return {
    beforeBlock,
    afterBlock,
    collateralBefore,
    collateralAfter,
    collateralDelta,
    yesBefore,
    noBefore,
    yesAfter,
    noAfter,
    payoutDenominator,
    yesNumerator,
    noNumerator,
    computedPayout,
    eventPayout: payout,
  };
}

async function receiptForRecordedAction(
  journal: LiveRedemptionJournal,
  client: PublicClient,
  kind: RedemptionActionKind,
  destination: Address,
): Promise<TransactionReceipt | undefined> {
  const action = journal.snapshot().actions[kind];
  if (action.state === "UNUSED" || action.state === "RETRY_READY") return undefined;
  if (action.state === "INTENT" || !action.transactionHash) {
    throw new Error(`The ${kind} journal contains a bare INTENT. Inspect the wallet and chain; blind retry is forbidden.`);
  }
  let receipt: TransactionReceipt;
  try { receipt = await client.getTransactionReceipt({ hash: action.transactionHash }); }
  catch { throw new Error(`The journaled ${kind} transaction has no receipt yet; the harness will not resend it.`); }
  if (receipt.status !== "success" || !receipt.to || getAddress(receipt.to) !== destination) {
    throw new Error(`The journaled ${kind} receipt failed or targets the wrong contract.`);
  }
  if (action.state === "CONFIRMED" && (
    action.receiptBlockNumber !== receipt.blockNumber.toString()
    || action.receiptBlockHash !== receipt.blockHash
  )) throw new Error(`The confirmed ${kind} receipt no longer matches its journaled block identity.`);
  return receipt;
}

async function confirmIfSubmitted(
  journal: LiveRedemptionJournal,
  kind: RedemptionActionKind,
  receipt: TransactionReceipt,
): Promise<void> {
  if (journal.snapshot().actions[kind].state !== "SUBMITTED") return;
  await journal.recordConfirmed(kind, {
    transactionHash: receipt.transactionHash,
    receiptBlockNumber: receipt.blockNumber,
    receiptBlockHash: receipt.blockHash,
  });
}

async function failClosedOnBareIntent(journal: LiveRedemptionJournal): Promise<void> {
  for (const kind of ["resolution", "redemption"] as const) {
    if (journal.snapshot().actions[kind].state === "INTENT") {
      throw new Error(`The ${kind} journal contains a bare INTENT. Inspect the wallet and chain before explicit recovery; no write was retried.`);
    }
  }
}

async function browserSafeSnapshot(client: PublicClient, evidence: ReturnType<Page["locator"]>) {
  const numberText = await evidence.getAttribute("data-safe-block-number");
  const hashText = await evidence.getAttribute("data-safe-block-hash");
  if (!numberText || !/^[0-9]+$/.test(numberText) || !hashText || !/^0x[0-9a-fA-F]{64}$/.test(hashText)) {
    throw new Error("The browser did not expose its exact resolution safe-block identity.");
  }
  const number = BigInt(numberText);
  const block = await client.getBlock({ blockNumber: number });
  if (block.hash !== hashText) throw new Error("The browser resolution snapshot hash does not match canonical Sepolia.");
  return { safeBlockNumber: number, safeBlockHash: block.hash, safeBlockTimestamp: block.timestamp };
}

async function balanceOf(client: PublicClient, token: Address, owner: Address, blockNumber: bigint): Promise<bigint> {
  return client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner], blockNumber });
}

async function conditionalBalance(
  client: PublicClient,
  conditionalTokens: Address,
  owner: Address,
  positionId: bigint,
  blockNumber: bigint,
): Promise<bigint> {
  return client.readContract({ address: conditionalTokens, abi: conditionalTokensProofAbi, functionName: "balanceOf", args: [owner, positionId], blockNumber });
}

function launchLiveBrowser(): Promise<Browser> {
  return chromium.launch({ channel: process.env.PLAYWRIGHT_SYSTEM_CHROME === "1" ? "chrome" : undefined });
}

async function liveContext(browser: Browser, settings: LiveRedemptionSettings, installWallet: (context: BrowserContext) => Promise<void>): Promise<BrowserContext> {
  const context = await browser.newContext({ baseURL: settings.webOrigin, viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  await installWallet(context);
  return context;
}

async function connect(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: "Connect browser wallet" });
  const connected = page.getByTitle("Disconnect wallet");
  await expect(button.or(connected).first()).toBeVisible();
  if (!(await connected.isVisible())) await button.click();
  await expect(connected).toBeVisible();
}

function exactPosition(positions: readonly PositionView[], positionId: Hex): PositionView {
  const matches = positions.filter((entry) => entry.positionId === positionId);
  if (matches.length !== 1) throw new Error("The exact configured position is not uniquely projected.");
  return matches[0]!;
}

async function waitForPositionState(settings: LiveRedemptionSettings, owner: Address, positionId: Hex, state: PositionView["state"]): Promise<PositionView> {
  let latest: PositionView | undefined;
  await expect.poll(async () => {
    const matches = (await readPositions(settings, owner)).filter((entry) => entry.positionId === positionId);
    if (matches.length > 1) throw new Error("The service projected a duplicate position identity.");
    latest = matches[0];
    return latest?.state ?? "NOT_PROJECTED";
  }, { message: `The exact position did not reach ${state} through the safe-block projection.`, timeout: settings.timeoutMs, intervals: [5_000, 10_000, 15_000] }).toBe(state);
  if (!latest) throw new Error("The exact position projection disappeared.");
  return latest;
}

function readPositions(settings: LiveRedemptionSettings, owner: Address): Promise<readonly PositionView[]> {
  return readApi(settings, `/v1/positions?${new URLSearchParams({ owner })}`, positionViewSchema.array());
}

async function readApi<T>(settings: LiveRedemptionSettings, path: string, schema: { parse(value: unknown): T }): Promise<T> {
  let response: Response;
  try { response = await fetch(`${settings.apiOrigin}${path}`, { headers: { accept: "application/json" } }); }
  catch { throw new Error("The live API could not be reached for a required read."); }
  if (!response.ok) throw new Error(`The live API returned HTTP ${response.status} for a required read.`);
  try { return schema.parse(await response.json()); }
  catch { throw new Error("The live API returned data outside the canonical protocol schema."); }
}

async function assertEvidenceTargetFresh(settings: LiveRedemptionSettings): Promise<void> {
  const output = resolve(process.cwd(), settings.evidencePath);
  try { await access(output, constants.F_OK); }
  catch (reason) {
    if ((reason as NodeJS.ErrnoException).code === "ENOENT") return;
    throw new Error("The live redemption evidence destination could not be checked safely.");
  }
  throw new Error("The live redemption evidence destination already exists. Choose a new create-only path before any write.");
}

async function writeEvidence(settings: LiveRedemptionSettings, input: {
  healthCatalogRevision: Hex;
  market: MarketView;
  initialPosition: PositionView;
  redemptionExpectation: Readonly<{ side: "YES" | "NO"; shares: string; maximumRedemption: string }>;
  finalPosition: PositionView;
  bundle: VerifiedBundle;
  journal: ReturnType<LiveRedemptionJournal["snapshot"]>;
  resolutionReceipt: TransactionReceipt;
  redemptionReceipt: TransactionReceipt;
  resolutionEvent: ReturnType<typeof validateResolutionReceipt>;
  payout: Awaited<ReturnType<typeof validateRedemptionReceipt>>;
}): Promise<void> {
  const output = resolve(process.cwd(), settings.evidencePath);
  await mkdir(dirname(output), { recursive: true });
  const evidence = {
    schemaVersion: 1,
    chainId: sepolia.id,
    recordedAt: new Date().toISOString(),
    catalogRevision: input.healthCatalogRevision,
    publicIdentity: { wallet: input.initialPosition.owner, marketId: input.market.marketId, positionId: input.initialPosition.positionId, side: input.initialPosition.side, question: input.market.question },
    contracts: { resolver: input.bundle.resolver, conditionalTokens: input.bundle.conditionalTokens, collateral: input.bundle.collateral, conditionId: input.market.contracts.conditionId, questionId: input.bundle.questionId, fpmm: input.market.contracts.fpmm, orderBook: input.market.contracts.orderBook, yesPositionId: input.bundle.yesPositionId.toString(), noPositionId: input.bundle.noPositionId.toString() },
    safeEvidence: {
      preflight: { blockNumber: input.bundle.preflightSafeBlock.number.toString(), blockHash: input.bundle.preflightSafeBlock.hash, timestamp: input.bundle.preflightSafeBlock.timestamp.toString() },
      browser: input.journal.browserEvidence,
      selectedAnswer: input.bundle.selectedAnswer.toString(),
      selectedObservedAt: input.bundle.selectedObservedAt.toString(),
      predecessorObservedAt: input.bundle.predecessorObservedAt.toString(),
    },
    objectiveResolution: { transactionHash: input.resolutionReceipt.transactionHash, blockNumber: input.resolutionReceipt.blockNumber.toString(), blockHash: input.resolutionReceipt.blockHash, questionId: input.resolutionEvent.questionId, winner: input.resolutionEvent.yesWon ? "YES" : "NO", settlementPriceWad: input.resolutionEvent.settlementPriceWad.toString(), observedAt: input.resolutionEvent.observedAt.toString(), selectedRoundId: input.resolutionEvent.selectedRoundId.toString(), predecessorRoundId: input.resolutionEvent.predecessorRoundId.toString() },
    redemption: {
      transactionHash: input.redemptionReceipt.transactionHash,
      blockNumber: input.redemptionReceipt.blockNumber.toString(),
      blockHash: input.redemptionReceipt.blockHash,
      beforeBlock: input.payout.beforeBlock.toString(),
      afterBlock: input.payout.afterBlock.toString(),
      yesSharesBefore: input.payout.yesBefore.toString(),
      noSharesBefore: input.payout.noBefore.toString(),
      yesSharesAfter: input.payout.yesAfter.toString(),
      noSharesAfter: input.payout.noAfter.toString(),
      payoutDenominator: input.payout.payoutDenominator.toString(),
      yesPayoutNumerator: input.payout.yesNumerator.toString(),
      noPayoutNumerator: input.payout.noNumerator.toString(),
      computedPayoutAtoms: input.payout.computedPayout.toString(),
      eventPayoutAtoms: input.payout.eventPayout.toString(),
      collateralBalanceBeforeAtoms: input.payout.collateralBefore.toString(),
      collateralBalanceAfterAtoms: input.payout.collateralAfter.toString(),
      collateralDeltaAtoms: input.payout.collateralDelta.toString(),
      apiMaximumRedemption: input.redemptionExpectation.maximumRedemption,
      finalPositionState: input.finalPosition.state,
      finalShares: input.finalPosition.shares,
    },
    journal: {
      storage: "private-local",
      bindingHash: input.journal.bindingHash,
      resolution: publicJournalAction(input.journal.actions.resolution),
      redemption: publicJournalAction(input.journal.actions.redemption),
    },
    destinations: { web: redactOrigin(settings.webOrigin), api: redactOrigin(settings.apiOrigin), rpc: redactOrigin(settings.rpcUrl) },
    checks: ["CATALOG_AND_BUNDLE_BOUND", "EXACT_SAFE_ROUND_PAIR", "BROWSER_WALLET_RESOLUTION", "DURABLE_ONE_SHOT_JOURNAL", "ONE_SHOT_RESOLVER_EVENT", "WINNING_POSITION_REDEEMABLE", "BROWSER_WALLET_REDEMPTION", "CTF_PAYOUT_REDEMPTION_EVENT", "EXACT_COLLATERAL_TRANSFER", "BLOCK_PINNED_COLLATERAL_DELTA", "BOTH_OUTCOME_BALANCES_CONSUMED", "SAFE_BLOCK_REDEEMED_PROJECTION"],
  };
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
}

function redactOrigin(value: string): string {
  const parsed = new URL(value);
  return `${parsed.protocol}//${parsed.hostname}${parsed.port ? ":<port>" : ""}`;
}

function publicJournalAction(action: ReturnType<LiveRedemptionJournal["snapshot"]>["actions"][RedemptionActionKind]) {
  return {
    state: action.state,
    attempt: action.attempt,
    plannedTransactionHash: action.preparedTransaction?.transactionHash,
    plannedNonce: action.preparedTransaction?.nonce,
    destination: action.preparedTransaction?.destination,
    transactionHash: action.transactionHash,
    receiptBlockNumber: action.receiptBlockNumber,
    receiptBlockHash: action.receiptBlockHash,
    recoveries: action.recoveries,
  };
}
