import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { encodePacked, keccak256, parseEther, zeroAddress, zeroHash } from "viem";
import { network } from "hardhat";

const PHASE_OFFSET = 64n;
const USD = 1_000_000n;

function proxyRound(phase: bigint, round: bigint) {
  return (phase << PHASE_OFFSET) | round;
}

function hasContractRevert(error: unknown, name: string) {
  let current: unknown = error;
  while (current && typeof current === "object") {
    const record = current as Record<string, unknown>;
    if (record.errorName === name) return true;
    if (typeof record.message === "string" && record.message.includes(name)) return true;
    current = record.cause;
  }
  return false;
}

async function settlementFixture({ feedDecimals = 8 }: { feedDecimals?: number } = {}) {
  const connection = await network.connect();
  const { viem } = connection;
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();
  const [operator] = await viem.getWalletClients();
  const conditionalTokens = await viem.deployContract("GateCConditionalTokens");
  const firstAggregator = await viem.deployContract("MockPhaseAggregator");
  const secondAggregator = await viem.deployContract("MockPhaseAggregator");
  const proxy = await viem.deployContract("MockChainlinkPhaseProxy", [feedDecimals]);
  await proxy.write.setPhaseAggregator([1, firstAggregator.address]);
  await proxy.write.setPhaseAggregator([2, secondAggregator.address]);
  const assetId = keccak256(encodePacked(["string"], ["BTC/USD"]));
  const adapter = await viem.deployContract("ChainlinkRoundAdapter", [assetId, proxy.address]);
  const block = await publicClient.getBlock();
  const tradingClosesAt = block.timestamp + 60n;
  const resolvesAt = tradingClosesAt + 60n;
  const strikePriceWad = 65_000n * 10n ** 18n;
  const questionId = keccak256(
    encodePacked(
      ["string", "uint256", "uint64"],
      ["BTC/USD >= 65000", strikePriceWad, resolvesAt],
    ),
  );
  const resolver = await viem.deployContract("PriceBinaryResolver", [
    conditionalTokens.address,
    adapter.address,
    questionId,
    strikePriceWad,
    tradingClosesAt,
    resolvesAt,
    300n,
  ]);
  await conditionalTokens.write.prepareCondition([resolver.address, questionId, 2n], {
    account: operator.account,
  });
  const conditionId = await conditionalTokens.read.getConditionId([
    resolver.address,
    questionId,
    2n,
  ]);
  return {
    viem,
    publicClient,
    testClient,
    conditionalTokens,
    firstAggregator,
    secondAggregator,
    proxy,
    adapter,
    resolver,
    resolvesAt,
    strikePriceWad,
    conditionId,
  };
}

async function fundingFixture({
  nativeTarget = parseEther("0.02"),
  collateralTarget = 25n * USD,
  nativePerClaimCap = nativeTarget,
  collateralPerClaimCap = collateralTarget,
  nativeLifetimeCap = nativePerClaimCap * 2n,
  collateralLifetimeCap = collateralPerClaimCap * 2n,
  cooldown = 3_600n,
  initialNativeTreasury = nativeTarget * 4n,
  initialCollateralTreasury = collateralTarget * 4n,
}: {
  nativeTarget?: bigint;
  collateralTarget?: bigint;
  nativePerClaimCap?: bigint;
  collateralPerClaimCap?: bigint;
  nativeLifetimeCap?: bigint;
  collateralLifetimeCap?: bigint;
  cooldown?: bigint;
  initialNativeTreasury?: bigint;
  initialCollateralTreasury?: bigint;
} = {}) {
  const connection = await network.connect();
  const { viem } = connection;
  const [issuer, recipient, relayer, outsider] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();
  const token = await viem.deployContract(
    "contracts/testnet/NoxLimitTestUSDC.sol:NoxLimitTestUSDC",
    [issuer.account.address],
  );
  const treasury = await viem.deployContract("TestnetFundingTreasury", [
    token.address,
    nativeTarget,
    collateralTarget,
    nativePerClaimCap,
    collateralPerClaimCap,
    nativeLifetimeCap,
    collateralLifetimeCap,
    cooldown,
  ]);
  if (initialCollateralTreasury !== 0n) {
    await token.write.mint([treasury.address, initialCollateralTreasury], {
      account: issuer.account,
    });
  }
  if (initialNativeTreasury !== 0n) {
    await issuer.sendTransaction({ to: treasury.address, value: initialNativeTreasury });
  }
  await testClient.setBalance({ address: recipient.account.address, value: 0n });
  const chainId = await publicClient.getChainId();
  const signClaim = async (
    nonce: bigint,
    deadline: bigint,
    signer = recipient,
    signedRecipient = recipient.account.address,
  ) => signer.signTypedData({
    domain: {
      name: "NoxLimit Testnet Funding",
      version: "1",
      chainId,
      verifyingContract: treasury.address,
    },
    types: {
      FundingClaim: [
        { name: "recipient", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint64" },
      ],
    },
    primaryType: "FundingClaim",
    message: { recipient: signedRecipient, nonce, deadline },
  });

  return {
    viem,
    publicClient,
    testClient,
    accounts: { issuer, recipient, relayer, outsider },
    token,
    treasury,
    signClaim,
    policy: {
      nativeTarget,
      collateralTarget,
      nativePerClaimCap,
      collateralPerClaimCap,
      nativeLifetimeCap,
      collateralLifetimeCap,
      cooldown,
    },
  };
}

describe("resolver-first market foundations", () => {
  it("rejects unsupported feed precision and a resolver adapter without an asset identity", async () => {
    const connection = await network.connect();
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const conditionalTokens = await viem.deployContract("GateCConditionalTokens");
    const unsupportedProxy = await viem.deployContract("MockChainlinkPhaseProxy", [37]);
    const assetId = keccak256(encodePacked(["string"], ["BTC/USD"]));
    await assert.rejects(
      () => viem.deployContract("ChainlinkRoundAdapter", [assetId, unsupportedProxy.address]),
      (error: unknown) => hasContractRevert(error, "UnsupportedDecimals"),
    );

    const zeroAssetAdapter = await viem.deployContract("MockSettlementPriceAdapter", [zeroHash]);
    const block = await publicClient.getBlock();
    await assert.rejects(
      () =>
        viem.deployContract("PriceBinaryResolver", [
          conditionalTokens.address,
          zeroAssetAdapter.address,
          keccak256(encodePacked(["string"], ["zero-asset-market"])),
          1n,
          block.timestamp + 60n,
          block.timestamp + 120n,
          60n,
        ]),
      (error: unknown) => hasContractRevert(error, "InvalidConfiguration"),
    );
  });

  it("resolves YES from the first adjacent observation inside one Chainlink phase", async () => {
    const f = await settlementFixture();
    await f.secondAggregator.write.setRound([7n, 64_900n * 10n ** 8n, f.resolvesAt - 1n]);
    await f.secondAggregator.write.setRound([8n, 65_100n * 10n ** 8n, f.resolvesAt + 4n]);
    await f.testClient.setNextBlockTimestamp({ timestamp: f.resolvesAt });
    await f.testClient.mine({ blocks: 1 });

    await f.resolver.write.resolve([proxyRound(2n, 8n), proxyRound(2n, 7n)]);
    assert.equal(await f.resolver.read.resolved(), true);
    assert.equal(await f.resolver.read.resolvedYes(), true);
    assert.equal(await f.resolver.read.settlementPriceWad(), 65_100n * 10n ** 18n);
    assert.equal(await f.conditionalTokens.read.payoutNumerators([f.conditionId, 0n]), 1n);
    assert.equal(await f.conditionalTokens.read.payoutNumerators([f.conditionId, 1n]), 0n);
  });

  it("treats equality at the strike as YES and makes resolution one-shot", async () => {
    const f = await settlementFixture();
    await f.secondAggregator.write.setRound([10n, 64_999n * 10n ** 8n, f.resolvesAt - 1n]);
    await f.secondAggregator.write.setRound([11n, 65_000n * 10n ** 8n, f.resolvesAt]);
    await f.testClient.setNextBlockTimestamp({ timestamp: f.resolvesAt });
    await f.testClient.mine({ blocks: 1 });

    await f.resolver.write.resolve([proxyRound(2n, 11n), proxyRound(2n, 10n)]);
    assert.equal(await f.resolver.read.resolved(), true);
    assert.equal(await f.resolver.read.resolvedYes(), true);
    assert.equal(await f.resolver.read.settlementPriceWad(), f.strikePriceWad);
    assert.equal(await f.resolver.read.settlementObservedAt(), f.resolvesAt);
    assert.equal(await f.resolver.read.settlementRoundId(), proxyRound(2n, 11n));
    assert.equal(await f.resolver.read.predecessorRoundId(), proxyRound(2n, 10n));
    assert.equal(await f.conditionalTokens.read.payoutNumerators([f.conditionId, 0n]), 1n);
    assert.equal(await f.conditionalTokens.read.payoutNumerators([f.conditionId, 1n]), 0n);

    await assert.rejects(
      () => f.resolver.write.resolve([proxyRound(2n, 11n), proxyRound(2n, 10n)]),
      (error: unknown) => hasContractRevert(error, "AlreadyResolved"),
    );
  });

  it("rejects resolution before its configured time and invalid observation values", async () => {
    const early = await settlementFixture();
    await early.secondAggregator.write.setRound([
      1n,
      64_900n * 10n ** 8n,
      early.resolvesAt - 1n,
    ]);
    await early.secondAggregator.write.setRound([
      2n,
      65_100n * 10n ** 8n,
      early.resolvesAt,
    ]);
    await assert.rejects(
      () => early.resolver.write.resolve([proxyRound(2n, 2n), proxyRound(2n, 1n)]),
      (error: unknown) => hasContractRevert(error, "ResolutionNotReady"),
    );
    assert.equal(await early.resolver.read.resolved(), false);

    const zeroAnswer = await settlementFixture();
    await zeroAnswer.secondAggregator.write.setRound([
      3n,
      64_900n * 10n ** 8n,
      zeroAnswer.resolvesAt - 1n,
    ]);
    await zeroAnswer.secondAggregator.write.setRound([4n, 0n, zeroAnswer.resolvesAt]);
    await zeroAnswer.testClient.setNextBlockTimestamp({ timestamp: zeroAnswer.resolvesAt });
    await zeroAnswer.testClient.mine({ blocks: 1 });
    await assert.rejects(
      () =>
        zeroAnswer.resolver.write.resolve([
          proxyRound(2n, 4n),
          proxyRound(2n, 3n),
        ]),
      (error: unknown) => hasContractRevert(error, "InvalidObservation"),
    );
    assert.equal(await zeroAnswer.resolver.read.resolved(), false);

    const noCrossing = await settlementFixture();
    await noCrossing.secondAggregator.write.setRound([
      5n,
      64_900n * 10n ** 8n,
      noCrossing.resolvesAt - 2n,
    ]);
    await noCrossing.secondAggregator.write.setRound([
      6n,
      65_100n * 10n ** 8n,
      noCrossing.resolvesAt - 1n,
    ]);
    await noCrossing.testClient.setNextBlockTimestamp({ timestamp: noCrossing.resolvesAt });
    await noCrossing.testClient.mine({ blocks: 1 });
    await assert.rejects(
      () =>
        noCrossing.resolver.write.resolve([
          proxyRound(2n, 6n),
          proxyRound(2n, 5n),
        ]),
      (error: unknown) => hasContractRevert(error, "InvalidObservation"),
    );
    assert.equal(await noCrossing.resolver.read.resolved(), false);
  });

  it("normalizes feeds on both sides of 18 decimals and rejects zero or overflowing WAD results", async () => {
    const highDecimals = await settlementFixture({ feedDecimals: 20 });
    const highScale = 10n ** 20n;
    await highDecimals.secondAggregator.write.setRound([
      1n,
      64_999n * highScale,
      highDecimals.resolvesAt - 1n,
    ]);
    await highDecimals.secondAggregator.write.setRound([
      2n,
      65_000n * highScale,
      highDecimals.resolvesAt,
    ]);
    await highDecimals.testClient.setNextBlockTimestamp({ timestamp: highDecimals.resolvesAt });
    await highDecimals.testClient.mine({ blocks: 1 });
    await highDecimals.resolver.write.resolve([proxyRound(2n, 2n), proxyRound(2n, 1n)]);
    assert.equal(await highDecimals.resolver.read.settlementPriceWad(), 65_000n * 10n ** 18n);

    const truncated = await settlementFixture({ feedDecimals: 36 });
    await truncated.secondAggregator.write.setRound([1n, 1n, truncated.resolvesAt - 1n]);
    await truncated.secondAggregator.write.setRound([2n, 1n, truncated.resolvesAt]);
    await truncated.testClient.setNextBlockTimestamp({ timestamp: truncated.resolvesAt });
    await truncated.testClient.mine({ blocks: 1 });
    await assert.rejects(
      () => truncated.resolver.write.resolve([proxyRound(2n, 2n), proxyRound(2n, 1n)]),
      (error: unknown) => hasContractRevert(error, "InvalidObservation"),
    );

    const overflowing = await settlementFixture({ feedDecimals: 0 });
    const maxInt256 = (1n << 255n) - 1n;
    await overflowing.secondAggregator.write.setRound([1n, 1n, overflowing.resolvesAt - 1n]);
    await overflowing.secondAggregator.write.setRound([
      2n,
      maxInt256,
      overflowing.resolvesAt,
    ]);
    await overflowing.testClient.setNextBlockTimestamp({ timestamp: overflowing.resolvesAt });
    await overflowing.testClient.mine({ blocks: 1 });
    await assert.rejects(
      () => overflowing.resolver.write.resolve([proxyRound(2n, 2n), proxyRound(2n, 1n)]),
      (error: unknown) => hasContractRevert(error, "InvalidObservation"),
    );
  });

  it("proves adjacency across a Chainlink proxy phase boundary", async () => {
    const f = await settlementFixture();
    await f.firstAggregator.write.setRound([31n, 65_100n * 10n ** 8n, f.resolvesAt - 2n]);
    await f.secondAggregator.write.setRound([1n, 64_900n * 10n ** 8n, f.resolvesAt + 3n]);
    await f.testClient.setNextBlockTimestamp({ timestamp: f.resolvesAt });
    await f.testClient.mine({ blocks: 1 });

    await f.resolver.write.resolve([proxyRound(2n, 1n), proxyRound(1n, 31n)]);
    assert.equal(await f.resolver.read.resolvedYes(), false);
    assert.equal(await f.conditionalTokens.read.payoutNumerators([f.conditionId, 0n]), 0n);
    assert.equal(await f.conditionalTokens.read.payoutNumerators([f.conditionId, 1n]), 1n);
  });

  it("rejects a cross-phase predecessor that was not the terminal round of its phase", async () => {
    const f = await settlementFixture();
    await f.firstAggregator.write.setRound([31n, 65_100n * 10n ** 8n, f.resolvesAt - 2n]);
    await f.firstAggregator.write.setRound([32n, 65_050n * 10n ** 8n, f.resolvesAt - 1n]);
    await f.secondAggregator.write.setRound([1n, 64_900n * 10n ** 8n, f.resolvesAt + 3n]);
    await f.testClient.setNextBlockTimestamp({ timestamp: f.resolvesAt });
    await f.testClient.mine({ blocks: 1 });

    await assert.rejects(
      () => f.resolver.write.resolve([proxyRound(2n, 1n), proxyRound(1n, 31n)]),
      (error: unknown) => hasContractRevert(error, "NonAdjacentRounds"),
    );
    assert.equal(await f.resolver.read.resolved(), false);
  });

  it("rejects a caller-selected later round and an observation outside policy", async () => {
    const f = await settlementFixture();
    await f.secondAggregator.write.setRound([4n, 64_800n * 10n ** 8n, f.resolvesAt - 1n]);
    await f.secondAggregator.write.setRound([5n, 64_900n * 10n ** 8n, f.resolvesAt + 1n]);
    await f.secondAggregator.write.setRound([6n, 66_000n * 10n ** 8n, f.resolvesAt + 2n]);
    await f.testClient.setNextBlockTimestamp({ timestamp: f.resolvesAt });
    await f.testClient.mine({ blocks: 1 });

    await assert.rejects(
      () => f.resolver.write.resolve([proxyRound(2n, 6n), proxyRound(2n, 4n)]),
      (error: unknown) => hasContractRevert(error, "NonAdjacentRounds"),
    );

    const late = await settlementFixture();
    await late.secondAggregator.write.setRound([
      1n,
      65_100n * 10n ** 8n,
      late.resolvesAt - 1n,
    ]);
    await late.secondAggregator.write.setRound([
      2n,
      65_200n * 10n ** 8n,
      late.resolvesAt + 301n,
    ]);
    await late.testClient.setNextBlockTimestamp({ timestamp: late.resolvesAt });
    await late.testClient.mine({ blocks: 1 });
    await assert.rejects(
      () => late.resolver.write.resolve([proxyRound(2n, 2n), proxyRound(2n, 1n)]),
      (error: unknown) => hasContractRevert(error, "ObservationTooLate"),
    );
  });

  it("tops real balances only after a signed request and exposes cooldown in preview", async () => {
    const f = await fundingFixture();
    const block = await f.publicClient.getBlock();
    const deadline = block.timestamp + 7_200n;
    const signature = await f.signClaim(0n, deadline);

    await f.treasury.write.claim(
      [f.accounts.recipient.account.address, 0n, deadline, signature],
      { account: f.accounts.relayer.account },
    );
    assert.equal(
      await f.publicClient.getBalance({ address: f.accounts.recipient.account.address }),
      f.policy.nativeTarget,
    );
    assert.equal(
      await f.token.read.balanceOf([f.accounts.recipient.account.address]),
      f.policy.collateralTarget,
    );
    assert.equal(await f.treasury.read.nonces([f.accounts.recipient.account.address]), 1n);

    const lastClaimAt = await f.treasury.read.lastClaimAt([
      f.accounts.recipient.account.address,
    ]);
    const preview = await f.treasury.read.preview([f.accounts.recipient.account.address]);
    assert.equal(preview[0], 0n);
    assert.equal(preview[1], 0n);
    assert.equal(preview[2], lastClaimAt + f.policy.cooldown);
    assert.equal(preview[3], 1n);

    const secondSignature = await f.signClaim(1n, deadline);
    await assert.rejects(
      () =>
        f.treasury.write.claim(
          [f.accounts.recipient.account.address, 1n, deadline, secondSignature],
          { account: f.accounts.relayer.account },
        ),
      (error: unknown) => hasContractRevert(error, "CooldownActive"),
    );
  });

  it("rejects wrong-signature, expired, and replayed funding authorizations", async () => {
    const f = await fundingFixture();
    const block = await f.publicClient.getBlock();
    const wrongSignerDeadline = block.timestamp + 300n;
    const wrongSigner = await f.signClaim(
      0n,
      wrongSignerDeadline,
      f.accounts.outsider,
    );
    await assert.rejects(
      () =>
        f.treasury.write.claim(
          [
            f.accounts.recipient.account.address,
            0n,
            wrongSignerDeadline,
            wrongSigner,
          ],
          { account: f.accounts.relayer.account },
        ),
      (error: unknown) => hasContractRevert(error, "InvalidSignature"),
    );
    assert.equal(await f.treasury.read.nonces([f.accounts.recipient.account.address]), 0n);

    const expiringDeadline = block.timestamp + 1n;
    const expiredSignature = await f.signClaim(0n, expiringDeadline);
    await f.testClient.setNextBlockTimestamp({ timestamp: expiringDeadline + 1n });
    await f.testClient.mine({ blocks: 1 });
    await assert.rejects(
      () =>
        f.treasury.write.claim(
          [
            f.accounts.recipient.account.address,
            0n,
            expiringDeadline,
            expiredSignature,
          ],
          { account: f.accounts.relayer.account },
        ),
      (error: unknown) => hasContractRevert(error, "ExpiredAuthorization"),
    );
    assert.equal(await f.treasury.read.nonces([f.accounts.recipient.account.address]), 0n);

    const validBlock = await f.publicClient.getBlock();
    const validDeadline = validBlock.timestamp + 300n;
    const validSignature = await f.signClaim(0n, validDeadline);
    await f.treasury.write.claim(
      [f.accounts.recipient.account.address, 0n, validDeadline, validSignature],
      { account: f.accounts.relayer.account },
    );
    await assert.rejects(
      () =>
        f.treasury.write.claim(
          [f.accounts.recipient.account.address, 0n, validDeadline, validSignature],
          { account: f.accounts.relayer.account },
        ),
      (error: unknown) => hasContractRevert(error, "InvalidNonce"),
    );
    assert.equal(await f.treasury.read.nonces([f.accounts.recipient.account.address]), 1n);
  });

  it("records partial treasury funding and completes it only through a later explicit claim", async () => {
    const partialNative = parseEther("0.003");
    const partialCollateral = 4n * USD;
    const f = await fundingFixture({
      initialNativeTreasury: partialNative,
      initialCollateralTreasury: partialCollateral,
    });
    const firstBlock = await f.publicClient.getBlock();
    const firstDeadline = firstBlock.timestamp + 10_000n;
    const firstSignature = await f.signClaim(0n, firstDeadline);
    await f.treasury.write.claim(
      [f.accounts.recipient.account.address, 0n, firstDeadline, firstSignature],
      { account: f.accounts.relayer.account },
    );
    assert.equal(
      await f.publicClient.getBalance({ address: f.accounts.recipient.account.address }),
      partialNative,
    );
    assert.equal(
      await f.token.read.balanceOf([f.accounts.recipient.account.address]),
      partialCollateral,
    );
    assert.equal(
      await f.treasury.read.nativeGranted([f.accounts.recipient.account.address]),
      partialNative,
    );
    assert.equal(
      await f.treasury.read.collateralGranted([f.accounts.recipient.account.address]),
      partialCollateral,
    );

    await f.accounts.issuer.sendTransaction({
      to: f.treasury.address,
      value: f.policy.nativeTarget,
    });
    await f.token.write.mint([f.treasury.address, f.policy.collateralTarget], {
      account: f.accounts.issuer.account,
    });
    const nextEligible =
      (await f.treasury.read.lastClaimAt([f.accounts.recipient.account.address]))
      + f.policy.cooldown;
    await f.testClient.setNextBlockTimestamp({ timestamp: nextEligible });
    await f.testClient.mine({ blocks: 1 });
    const secondBlock = await f.publicClient.getBlock();
    const secondDeadline = secondBlock.timestamp + 300n;
    const secondSignature = await f.signClaim(1n, secondDeadline);
    await f.treasury.write.claim(
      [f.accounts.recipient.account.address, 1n, secondDeadline, secondSignature],
      { account: f.accounts.relayer.account },
    );
    assert.equal(
      await f.publicClient.getBalance({ address: f.accounts.recipient.account.address }),
      f.policy.nativeTarget,
    );
    assert.equal(
      await f.token.read.balanceOf([f.accounts.recipient.account.address]),
      f.policy.collateralTarget,
    );
    assert.equal(await f.treasury.read.nonces([f.accounts.recipient.account.address]), 2n);
  });

  it("supports explicit refills after cooldown and stops exactly at each lifetime cap", async () => {
    const nativePerClaim = parseEther("0.01");
    const collateralPerClaim = 10n * USD;
    const f = await fundingFixture({
      nativePerClaimCap: nativePerClaim,
      collateralPerClaimCap: collateralPerClaim,
      nativeLifetimeCap: 2n * nativePerClaim,
      collateralLifetimeCap: 2n * collateralPerClaim,
    });
    const firstBlock = await f.publicClient.getBlock();
    const firstDeadline = firstBlock.timestamp + 10_000n;
    const firstSignature = await f.signClaim(0n, firstDeadline);
    await f.treasury.write.claim(
      [f.accounts.recipient.account.address, 0n, firstDeadline, firstSignature],
      { account: f.accounts.relayer.account },
    );
    assert.equal(
      await f.treasury.read.nativeGranted([f.accounts.recipient.account.address]),
      nativePerClaim,
    );
    assert.equal(
      await f.treasury.read.collateralGranted([f.accounts.recipient.account.address]),
      collateralPerClaim,
    );

    const cooldownSignature = await f.signClaim(1n, firstDeadline);
    await assert.rejects(
      () =>
        f.treasury.write.claim(
          [
            f.accounts.recipient.account.address,
            1n,
            firstDeadline,
            cooldownSignature,
          ],
          { account: f.accounts.relayer.account },
        ),
      (error: unknown) => hasContractRevert(error, "CooldownActive"),
    );

    await f.token.write.transfer([f.accounts.issuer.account.address, collateralPerClaim], {
      account: f.accounts.recipient.account,
    });
    await f.testClient.setBalance({ address: f.accounts.recipient.account.address, value: 0n });
    const secondEligible =
      (await f.treasury.read.lastClaimAt([f.accounts.recipient.account.address]))
      + f.policy.cooldown;
    await f.testClient.setNextBlockTimestamp({ timestamp: secondEligible });
    await f.testClient.mine({ blocks: 1 });
    const secondDeadline = secondEligible + 300n;
    const secondSignature = await f.signClaim(1n, secondDeadline);
    await f.treasury.write.claim(
      [f.accounts.recipient.account.address, 1n, secondDeadline, secondSignature],
      { account: f.accounts.relayer.account },
    );
    assert.equal(
      await f.treasury.read.nativeGranted([f.accounts.recipient.account.address]),
      2n * nativePerClaim,
    );
    assert.equal(
      await f.treasury.read.collateralGranted([f.accounts.recipient.account.address]),
      2n * collateralPerClaim,
    );

    await f.token.write.transfer([f.accounts.issuer.account.address, collateralPerClaim], {
      account: f.accounts.recipient.account,
    });
    await f.testClient.setBalance({ address: f.accounts.recipient.account.address, value: 0n });
    const finalEligible =
      (await f.treasury.read.lastClaimAt([f.accounts.recipient.account.address]))
      + f.policy.cooldown;
    await f.testClient.setNextBlockTimestamp({ timestamp: finalEligible });
    await f.testClient.mine({ blocks: 1 });
    const preview = await f.treasury.read.preview([f.accounts.recipient.account.address]);
    assert.equal(preview[0], 0n);
    assert.equal(preview[1], 0n);
    assert.equal(preview[3], 2n);
    const exhaustedDeadline = finalEligible + 300n;
    const exhaustedSignature = await f.signClaim(2n, exhaustedDeadline);
    await assert.rejects(
      () =>
        f.treasury.write.claim(
          [
            f.accounts.recipient.account.address,
            2n,
            exhaustedDeadline,
            exhaustedSignature,
          ],
          { account: f.accounts.relayer.account },
        ),
      (error: unknown) => hasContractRevert(error, "NothingToFund"),
    );
    assert.equal(await f.treasury.read.nonces([f.accounts.recipient.account.address]), 2n);
  });

  it("implements exact six-decimal ERC-20 mint, transfer, and allowance semantics", async () => {
    const connection = await network.connect();
    const { viem } = connection;
    const [issuer, owner, spender, recipient] = await viem.getWalletClients();
    const token = await viem.deployContract(
      "contracts/testnet/NoxLimitTestUSDC.sol:NoxLimitTestUSDC",
      [issuer.account.address],
    );
    assert.equal(await token.read.name(), "NoxLimit Test USDC");
    assert.equal(await token.read.symbol(), "NLTUSDC");
    assert.equal(await token.read.decimals(), 6);

    const minted = 12_345_678n;
    await token.write.mint([owner.account.address, minted], { account: issuer.account });
    assert.equal(await token.read.totalSupply(), minted);
    assert.equal(await token.read.balanceOf([owner.account.address]), minted);
    await assert.rejects(
      () => token.write.mint([owner.account.address, 1n], { account: spender.account }),
      (error: unknown) => hasContractRevert(error, "NotIssuer"),
    );
    await assert.rejects(
      () => token.write.mint([zeroAddress, 1n], { account: issuer.account }),
      (error: unknown) => hasContractRevert(error, "InvalidRecipient"),
    );

    const approved = 3_250_000n;
    const transferred = 1_250_001n;
    await token.write.approve([spender.account.address, approved], { account: owner.account });
    await token.write.transferFrom(
      [owner.account.address, recipient.account.address, transferred],
      { account: spender.account },
    );
    assert.equal(
      await token.read.allowance([owner.account.address, spender.account.address]),
      approved - transferred,
    );
    assert.equal(await token.read.balanceOf([recipient.account.address]), transferred);
    assert.equal(await token.read.balanceOf([owner.account.address]), minted - transferred);

    await token.write.approve([spender.account.address, 0n], { account: owner.account });
    await assert.rejects(
      () =>
        token.write.transferFrom([owner.account.address, recipient.account.address, 1n], {
          account: spender.account,
        }),
      (error: unknown) => hasContractRevert(error, "InsufficientAllowance"),
    );
    await assert.rejects(
      () => token.write.transfer([recipient.account.address, minted], { account: recipient.account }),
      (error: unknown) => hasContractRevert(error, "InsufficientBalance"),
    );
  });
});
