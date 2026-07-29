import assert from "node:assert/strict";
import test from "node:test";

import { findResolutionEvidence } from "../src/features/positions/resolution-evidence.ts";

const RESOLVER = "0x1111111111111111111111111111111111111111";
const ADAPTER = "0x2222222222222222222222222222222222222222";
const FEED = "0x3333333333333333333333333333333333333333";
const PRIOR_AGGREGATOR = "0x4444444444444444444444444444444444444444";
const composite = (phase, round) => (BigInt(phase) << 64n) | BigInt(round);

function clientFixture({
  now = 120n,
  resolvesAt = 100n,
  maximumDelay = 30n,
  decimals = 8,
  latestRoundId,
  rounds = new Map(),
  priorPhaseLastRound = 31n,
  resolved = false,
  resolvedYes = false,
  settlementPriceWad = 0n,
  settlementObservedAt = 0n,
  settlementRoundId = 0n,
  predecessorRoundId = 0n,
  safeBlockNumber = 123n,
  safeBlockHash = `0x${"ab".repeat(32)}`,
  blockRequests = [],
  contractBlockNumbers = [],
}) {
  return {
    async getBlock(input) {
      blockRequests.push(input);
      return { timestamp: now, number: safeBlockNumber, hash: safeBlockHash };
    },
    async readContract({ address, functionName, args = [], blockNumber }) {
      contractBlockNumbers.push(blockNumber);
      if (address === RESOLVER) {
        if (functionName === "resolved") return resolved;
        if (functionName === "resolvedYes") return resolvedYes;
        if (functionName === "settlementPriceWad") return settlementPriceWad;
        if (functionName === "settlementObservedAt") return settlementObservedAt;
        if (functionName === "settlementRoundId") return settlementRoundId;
        if (functionName === "predecessorRoundId") return predecessorRoundId;
        if (functionName === "settlementAdapter") return ADAPTER;
        if (functionName === "resolvesAt") return resolvesAt;
        if (functionName === "maximumObservationDelay") return maximumDelay;
      }
      if (address === ADAPTER) {
        if (functionName === "feed") return FEED;
        if (functionName === "feedDecimals") return decimals;
      }
      if (address === FEED) {
        if (functionName === "latestRoundData") {
          const round = rounds.get(latestRoundId);
          return [latestRoundId, round.answer, 0n, round.updatedAt, round.answeredInRound ?? latestRoundId];
        }
        if (functionName === "getRoundData") {
          const id = args[0];
          const round = rounds.get(id);
          if (!round) throw new Error(`missing round ${id}`);
          return [round.returnedId ?? id, round.answer, 0n, round.updatedAt, round.answeredInRound ?? id];
        }
        if (functionName === "phaseAggregators") return PRIOR_AGGREGATOR;
      }
      if (address === PRIOR_AGGREGATOR && functionName === "latestRoundData") {
        const predecessor = composite(1, priorPhaseLastRound);
        const round = rounds.get(predecessor);
        return [priorPhaseLastRound, round?.answer ?? 1n, 0n, round?.updatedAt ?? 1n, priorPhaseLastRound];
      }
      throw new Error(`unexpected read ${address}:${functionName}`);
    },
  };
}

test("selects the first same-phase Chainlink observation at or after resolution", async () => {
  const r10 = composite(2, 10), r11 = composite(2, 11), r12 = composite(2, 12);
  const rounds = new Map([
    [r10, { answer: 64_900_00000000n, updatedAt: 99n }],
    [r11, { answer: 65_100_00000000n, updatedAt: 105n }],
    [r12, { answer: 65_200_00000000n, updatedAt: 115n }],
  ]);
  const blockRequests = [], contractBlockNumbers = [];
  const evidence = await findResolutionEvidence({ client: clientFixture({ latestRoundId: r12, rounds, blockRequests, contractBlockNumbers }), resolver: RESOLVER, strikeUsd: "65000", oracleSource: "Chainlink" });
  assert.equal(evidence.state, "READY");
  assert.equal(evidence.selectedRoundId, r11);
  assert.equal(evidence.predecessorRoundId, r10);
  assert.equal(evidence.expectedWinner, "YES");
  assert.equal(evidence.safeBlockNumber, 123n);
  assert.equal(evidence.safeBlockHash, `0x${"ab".repeat(32)}`);
  assert.deepEqual(blockRequests, [{ blockTag: "safe" }]);
  assert.ok(contractBlockNumbers.length > 0);
  assert.ok(contractBlockNumbers.every((number) => number === 123n));
});

test("selects the terminal prior-phase round when phase round one crosses resolution", async () => {
  const predecessor = composite(1, 31), selected = composite(2, 1);
  const rounds = new Map([
    [predecessor, { answer: 64_900_00000000n, updatedAt: 99n }],
    [selected, { answer: 65_100_00000000n, updatedAt: 101n }],
  ]);
  const evidence = await findResolutionEvidence({ client: clientFixture({ latestRoundId: selected, rounds }), resolver: RESOLVER, strikeUsd: "65000", oracleSource: "Chainlink" });
  assert.equal(evidence.state, "READY");
  assert.equal(evidence.selectedRoundId, selected);
  assert.equal(evidence.predecessorRoundId, predecessor);
});

test("reports not ready before the immutable resolution time", async () => {
  const evidence = await findResolutionEvidence({ client: clientFixture({ now: 99n, latestRoundId: composite(2, 1) }), resolver: RESOLVER, strikeUsd: "65000", oracleSource: "Chainlink" });
  assert.equal(evidence.state, "NOT_READY");
});

test("rejects a chronological first observation outside the immutable delay", async () => {
  const predecessor = composite(2, 10), selected = composite(2, 11);
  const rounds = new Map([
    [predecessor, { answer: 64_900_00000000n, updatedAt: 99n }],
    [selected, { answer: 65_100_00000000n, updatedAt: 131n }],
  ]);
  const evidence = await findResolutionEvidence({ client: clientFixture({ now: 140n, latestRoundId: selected, rounds }), resolver: RESOLVER, strikeUsd: "65000", oracleSource: "Chainlink" });
  assert.equal(evidence.state, "NO_ACCEPTED_OBSERVATION");
});

test("reads the resolver's accepted evidence after another account already resolved", async () => {
  const selected = composite(2, 11), predecessor = composite(2, 10);
  const evidence = await findResolutionEvidence({ client: clientFixture({ resolved: true, resolvedYes: true, settlementPriceWad: 65_100n * 10n ** 18n, settlementObservedAt: 105n, settlementRoundId: selected, predecessorRoundId: predecessor }), resolver: RESOLVER, strikeUsd: "65000", oracleSource: "Chainlink" });
  assert.equal(evidence.state, "RESOLVED");
  assert.equal(evidence.winner, "YES");
  assert.equal(evidence.selectedRoundId, selected);
});

test("compares strike and answer with exact feed-decimal integer precision", async () => {
  const predecessor = composite(2, 10), selected = composite(2, 11);
  const rounds = new Map([
    [predecessor, { answer: 65_000_12345670n, updatedAt: 99n }],
    [selected, { answer: 65_000_12345677n, updatedAt: 101n }],
  ]);
  const evidence = await findResolutionEvidence({ client: clientFixture({ latestRoundId: selected, rounds }), resolver: RESOLVER, strikeUsd: "65000.12345678", oracleSource: "Chainlink" });
  assert.equal(evidence.state, "READY");
  assert.equal(evidence.settlementPriceUsd, "65000.12345677");
  assert.equal(evidence.expectedWinner, "NO");
});

test("does not use Chainlink's deprecated answeredInRound field as a validity gate", async () => {
  const predecessor = composite(2, 10), selected = composite(2, 11);
  const rounds = new Map([
    [predecessor, { answer: 64_900_00000000n, updatedAt: 99n, answeredInRound: 0n }],
    [selected, { answer: 65_100_00000000n, updatedAt: 101n, answeredInRound: 0n }],
  ]);
  const evidence = await findResolutionEvidence({ client: clientFixture({ latestRoundId: selected, rounds }), resolver: RESOLVER, strikeUsd: "65000", oracleSource: "Chainlink" });
  assert.equal(evidence.state, "READY");
  assert.equal(evidence.selectedRoundId, selected);
});

test("fails closed when the safe block has no canonical identity", async () => {
  const evidence = await findResolutionEvidence({ client: clientFixture({ safeBlockNumber: null, safeBlockHash: null }), resolver: RESOLVER, strikeUsd: "65000", oracleSource: "Chainlink" });
  assert.equal(evidence.state, "UNAVAILABLE");
});

test("propagates safe-block RPC failure without falling back to a torn latest-head scan", async () => {
  const client = { async getBlock() { throw new Error("safe block unavailable"); } };
  await assert.rejects(
    () => findResolutionEvidence({ client, resolver: RESOLVER, strikeUsd: "65000", oracleSource: "Chainlink" }),
    /safe block unavailable/,
  );
});

test("resolved evidence reads every resolver field at the same safe block", async () => {
  const selected = composite(2, 11), predecessor = composite(2, 10);
  const contractBlockNumbers = [];
  const evidence = await findResolutionEvidence({ client: clientFixture({ resolved: true, resolvedYes: true, settlementPriceWad: 65_100n * 10n ** 18n, settlementObservedAt: 105n, settlementRoundId: selected, predecessorRoundId: predecessor, contractBlockNumbers }), resolver: RESOLVER, strikeUsd: "65000", oracleSource: "Chainlink" });
  assert.equal(evidence.state, "RESOLVED");
  assert.ok(contractBlockNumbers.every((number) => number === 123n));
});

test("still rejects wrong returned IDs, nonpositive answers, and zero timestamps", async () => {
  const predecessor = composite(2, 10), selected = composite(2, 11);
  for (const invalidSelected of [
    { returnedId: selected + 1n, answer: 65_100_00000000n, updatedAt: 101n },
    { answer: 0n, updatedAt: 101n },
    { answer: 65_100_00000000n, updatedAt: 0n },
  ]) {
    const rounds = new Map([
      [predecessor, { answer: 64_900_00000000n, updatedAt: 99n }],
      [selected, invalidSelected],
    ]);
    await assert.rejects(
      () => findResolutionEvidence({ client: clientFixture({ latestRoundId: selected, rounds }), resolver: RESOLVER, strikeUsd: "65000", oracleSource: "Chainlink" }),
      /not a valid positive observation/,
    );
  }
});
