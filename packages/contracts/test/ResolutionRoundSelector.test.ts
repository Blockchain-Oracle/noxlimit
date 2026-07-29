import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import type { Address } from "viem";

import {
  chainlinkAggregatorAbi,
  chainlinkFeedAbi,
} from "../scripts/operator/abis.js";
import {
  ResolutionRoundSelectionError,
  selectResolutionRounds,
  type ChainlinkRoundReader,
} from "../scripts/operator/resolution-round-selector.js";

const PHASE_OFFSET = 64n;
const RESOLVES_AT = 10_000n;
const PRICE_SCALE = 10n ** 8n;

function proxyRound(phase: bigint, round: bigint): bigint {
  return (phase << PHASE_OFFSET) | round;
}

async function selectorFixture({ bindFirstPhase = true } = {}) {
  const connection = await network.connect();
  const { viem } = connection;
  const publicClient = await viem.getPublicClient();
  const firstAggregator = await viem.deployContract("MockPhaseAggregator");
  const secondAggregator = await viem.deployContract("MockPhaseAggregator");
  const proxy = await viem.deployContract("MockChainlinkPhaseProxy", [8]);
  if (bindFirstPhase) {
    await proxy.write.setPhaseAggregator([1, firstAggregator.address]);
  }
  await proxy.write.setPhaseAggregator([2, secondAggregator.address]);

  const reader: ChainlinkRoundReader = {
    latestProxyRound: () =>
      publicClient.readContract({
        address: proxy.address,
        abi: chainlinkFeedAbi,
        functionName: "latestRoundData",
      }),
    proxyRound: (roundId) =>
      publicClient.readContract({
        address: proxy.address,
        abi: chainlinkFeedAbi,
        functionName: "getRoundData",
        args: [roundId],
      }),
    phaseAggregator: (phaseId) =>
      publicClient.readContract({
        address: proxy.address,
        abi: chainlinkFeedAbi,
        functionName: "phaseAggregators",
        args: [phaseId],
      }),
    aggregatorLatestRound: (aggregator: Address) =>
      publicClient.readContract({
        address: aggregator,
        abi: chainlinkAggregatorAbi,
        functionName: "latestRoundData",
      }),
    codeAt: (address) => publicClient.getCode({ address }),
  };
  const select = (overrides: {
    readonly chainTimestamp?: bigint;
    readonly maximumObservationDelay?: bigint;
    readonly maximumScanRounds?: number;
  } = {}) =>
    selectResolutionRounds({
      reader,
      chainTimestamp: overrides.chainTimestamp ?? RESOLVES_AT + 600n,
      resolvesAt: RESOLVES_AT,
      maximumObservationDelay: overrides.maximumObservationDelay ?? 300n,
      feedDecimals: 8,
      maximumScanRounds: overrides.maximumScanRounds ?? 32,
    });

  return { firstAggregator, secondAggregator, select };
}

describe("deterministic Chainlink resolution round selector", () => {
  it("walks backward to the first adjacent post-resolution round in one phase", async () => {
    const f = await selectorFixture();
    await f.secondAggregator.write.setRound([7n, 64_900n * PRICE_SCALE, RESOLVES_AT - 1n]);
    await f.secondAggregator.write.setRound([8n, 65_100n * PRICE_SCALE, RESOLVES_AT + 4n]);
    await f.secondAggregator.write.setRound([9n, 65_200n * PRICE_SCALE, RESOLVES_AT + 20n]);

    const selected = await f.select();
    assert.deepEqual(selected, {
      selectedRoundId: proxyRound(2n, 8n),
      predecessorRoundId: proxyRound(2n, 7n),
      settlementPriceWad: 65_100n * 10n ** 18n,
      selectedUpdatedAt: RESOLVES_AT + 4n,
      predecessorUpdatedAt: RESOLVES_AT - 1n,
      scannedProxyRounds: 3,
    });
  });

  it("selects round one only after proving the previous phase terminal round", async () => {
    const f = await selectorFixture();
    await f.firstAggregator.write.setRound([31n, 65_100n * PRICE_SCALE, RESOLVES_AT - 2n]);
    await f.secondAggregator.write.setRound([1n, 64_900n * PRICE_SCALE, RESOLVES_AT + 3n]);
    await f.secondAggregator.write.setRound([2n, 64_800n * PRICE_SCALE, RESOLVES_AT + 30n]);

    const selected = await f.select();
    assert.equal(selected.selectedRoundId, proxyRound(2n, 1n));
    assert.equal(selected.predecessorRoundId, proxyRound(1n, 31n));
    assert.equal(selected.settlementPriceWad, 64_900n * 10n ** 18n);
    assert.equal(selected.scannedProxyRounds, 3);
  });

  it("fails closed before resolver time or before the feed has a post-resolution observation", async () => {
    const beforeTime = await selectorFixture();
    await beforeTime.secondAggregator.write.setRound([
      1n,
      65_100n * PRICE_SCALE,
      RESOLVES_AT + 1n,
    ]);
    await assert.rejects(
      () => beforeTime.select({ chainTimestamp: RESOLVES_AT - 1n }),
      (error: unknown) =>
        error instanceof ResolutionRoundSelectionError && /not ready/.test(error.message),
    );

    const feedBehind = await selectorFixture();
    await feedBehind.secondAggregator.write.setRound([
      1n,
      65_100n * PRICE_SCALE,
      RESOLVES_AT - 1n,
    ]);
    await assert.rejects(
      () => feedBehind.select(),
      (error: unknown) =>
        error instanceof ResolutionRoundSelectionError && /no Chainlink observation/.test(error.message),
    );
  });

  it("rejects a first observation outside the resolver delay policy", async () => {
    const f = await selectorFixture();
    await f.secondAggregator.write.setRound([1n, 64_900n * PRICE_SCALE, RESOLVES_AT - 1n]);
    await f.secondAggregator.write.setRound([2n, 65_100n * PRICE_SCALE, RESOLVES_AT + 301n]);

    await assert.rejects(
      () => f.select({ maximumObservationDelay: 300n }),
      (error: unknown) =>
        error instanceof ResolutionRoundSelectionError && /exceeds maximum delay/.test(error.message),
    );
  });

  it("stops at the configured scan bound instead of guessing an older pair", async () => {
    const f = await selectorFixture();
    await f.secondAggregator.write.setRound([1n, 64_900n * PRICE_SCALE, RESOLVES_AT - 1n]);
    await f.secondAggregator.write.setRound([2n, 65_000n * PRICE_SCALE, RESOLVES_AT + 1n]);
    await f.secondAggregator.write.setRound([3n, 65_100n * PRICE_SCALE, RESOLVES_AT + 2n]);
    await f.secondAggregator.write.setRound([4n, 65_200n * PRICE_SCALE, RESOLVES_AT + 3n]);

    await assert.rejects(
      () => f.select({ maximumScanRounds: 2 }),
      (error: unknown) =>
        error instanceof ResolutionRoundSelectionError && /scan exceeded 2/.test(error.message),
    );
  });

  it("rejects invalid data, nonmonotonic timestamps, and an unverifiable phase transition", async () => {
    const invalid = await selectorFixture();
    await invalid.secondAggregator.write.setRound([1n, 65_000n * PRICE_SCALE, RESOLVES_AT - 1n]);
    await invalid.secondAggregator.write.setRound([2n, 0n, RESOLVES_AT + 1n]);
    await assert.rejects(
      () => invalid.select(),
      (error: unknown) =>
        error instanceof ResolutionRoundSelectionError && /invalid Chainlink observation/.test(error.message),
    );

    const nonmonotonic = await selectorFixture();
    await nonmonotonic.secondAggregator.write.setRound([
      1n,
      65_000n * PRICE_SCALE,
      RESOLVES_AT - 1n,
    ]);
    await nonmonotonic.secondAggregator.write.setRound([
      2n,
      65_100n * PRICE_SCALE,
      RESOLVES_AT + 2n,
    ]);
    await nonmonotonic.secondAggregator.write.setRound([
      3n,
      65_200n * PRICE_SCALE,
      RESOLVES_AT + 1n,
    ]);
    await assert.rejects(
      () => nonmonotonic.select(),
      (error: unknown) =>
        error instanceof ResolutionRoundSelectionError && /nonmonotonic/.test(error.message),
    );

    const missingPhase = await selectorFixture({ bindFirstPhase: false });
    await missingPhase.secondAggregator.write.setRound([
      1n,
      65_100n * PRICE_SCALE,
      RESOLVES_AT + 1n,
    ]);
    await assert.rejects(
      () => missingPhase.select(),
      (error: unknown) =>
        error instanceof ResolutionRoundSelectionError && /unbound aggregator/.test(error.message),
    );
  });
});
