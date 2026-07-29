import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  openLiveRedemptionJournal,
  redemptionJournalPath,
} from "../e2e/live/redemption-journal.ts";

function binding(directory) {
  return {
    chainId: 11155111,
    marketId: `0x${"11".repeat(32)}`,
    positionId: `0x${"22".repeat(32)}`,
    wallet: signer.address,
    catalogRevision: `0x${"44".repeat(32)}`,
    resolver: `0x${"55".repeat(20)}`,
    conditionalTokens: `0x${"66".repeat(20)}`,
    collateral: `0x${"77".repeat(20)}`,
    conditionId: `0x${"88".repeat(32)}`,
    selectedRoundId: "100",
    predecessorRoundId: "99",
    expectedWinner: "YES",
    evidenceOutputPath: join(directory, "evidence.json"),
  };
}

const signer = privateKeyToAccount(keccak256(toHex("NoxLimit redemption journal test signer")));

async function preparedTransaction(nonce, destination = `0x${"55".repeat(20)}`) {
  const calldata = "0x1234";
  const serializedTransaction = await signer.signTransaction({
    chainId: 11155111,
    type: "eip1559",
    nonce,
    gas: 100_000n,
    maxFeePerGas: 2_000_000_000n,
    maxPriorityFeePerGas: 1_000_000_000n,
    to: destination,
    data: calldata,
    value: 0n,
  });
  return {
    transactionHash: keccak256(serializedTransaction),
    nonce: nonce.toString(),
    serializedTransaction,
    destination,
    calldata,
  };
}

test("live redemption journal reserves one concurrent intent before either caller can send", async () => {
  const directory = await mkdtemp(join(tmpdir(), "noxlimit-redemption-journal-"));
  try {
    const path = redemptionJournalPath(join(directory, "evidence.json"));
    const journal = await openLiveRedemptionJournal({ journalPath: path, binding: binding(directory) });
    await journal.recordBrowserEvidence({ safeBlockNumber: 10n, safeBlockHash: `0x${"99".repeat(32)}`, safeBlockTimestamp: 20n });
    const transaction = await preparedTransaction(0n);
    const [first, second] = await Promise.allSettled([
      journal.reserve("resolution", transaction),
      journal.reserve("resolution", transaction),
    ]);
    assert.equal([first, second].filter((result) => result.status === "fulfilled").length, 1);
    assert.equal([first, second].filter((result) => result.status === "rejected").length, 1);
    assert.equal(journal.snapshot().actions.resolution.state, "INTENT");
    const disk = JSON.parse(await readFile(path, "utf8"));
    assert.equal(disk.actions.resolution.state, "INTENT");
    await journal.close();
    await rm(path, { force: true });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("live redemption journal persists the exact ordered two-action lifecycle and resumes it", async () => {
  const directory = await mkdtemp(join(tmpdir(), "noxlimit-redemption-journal-"));
  try {
    const evidencePath = join(directory, "evidence.json");
    const path = redemptionJournalPath(evidencePath);
    const expectedBinding = binding(directory);
    const journal = await openLiveRedemptionJournal({ journalPath: path, binding: expectedBinding });
    await journal.recordBrowserEvidence({ safeBlockNumber: 10n, safeBlockHash: `0x${"99".repeat(32)}`, safeBlockTimestamp: 20n });
    const resolutionTransaction = await preparedTransaction(0n);
    await journal.reserve("resolution", resolutionTransaction);
    const resolutionHash = resolutionTransaction.transactionHash;
    await journal.recordSubmitted("resolution", resolutionHash);
    await journal.recordConfirmed("resolution", { transactionHash: resolutionHash, receiptBlockNumber: 11n, receiptBlockHash: `0x${"bb".repeat(32)}` });
    await journal.recordRedemptionExpectation({ side: "YES", shares: "1.250000", maximumRedemption: "1.250000" });
    const redemptionTransaction = await preparedTransaction(1n, `0x${"66".repeat(20)}`);
    await journal.reserve("redemption", redemptionTransaction);
    const redemptionHash = redemptionTransaction.transactionHash;
    await journal.recordSubmitted("redemption", redemptionHash);
    await journal.recordConfirmed("redemption", { transactionHash: redemptionHash, receiptBlockNumber: 12n, receiptBlockHash: `0x${"dd".repeat(32)}` });
    await journal.close();

    const resumed = await openLiveRedemptionJournal({ journalPath: path, binding: expectedBinding });
    assert.equal(resumed.snapshot().actions.resolution.state, "CONFIRMED");
    assert.equal(resumed.snapshot().actions.redemption.state, "CONFIRMED");
    assert.equal(resumed.snapshot().actions.resolution.attempt, 1);
    assert.equal(resumed.snapshot().actions.redemption.attempt, 1);
    await resumed.close();
    await rm(path, { force: true });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("live redemption journal excludes a second process while the exact lock is held", async () => {
  const directory = await mkdtemp(join(tmpdir(), "noxlimit-redemption-journal-"));
  try {
    const path = redemptionJournalPath(join(directory, "evidence.json"));
    const first = await openLiveRedemptionJournal({ journalPath: path, binding: binding(directory) });
    await assert.rejects(
      () => openLiveRedemptionJournal({ journalPath: path, binding: binding(directory) }),
      /locked/,
    );
    await first.close();
    await rm(path, { force: true });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("live redemption journal requires durable browser evidence before resolution intent", async () => {
  const directory = await mkdtemp(join(tmpdir(), "noxlimit-redemption-journal-"));
  const path = redemptionJournalPath(join(directory, "evidence.json"));
  try {
    const journal = await openLiveRedemptionJournal({ journalPath: path, binding: binding(directory) });
    await assert.rejects(
      () => journal.reserve("resolution", preparedTransaction(0n)),
      /without durable browser evidence/,
    );
    assert.equal(journal.snapshot().actions.resolution.state, "UNUSED");
    await journal.close();
    await rm(path, { force: true });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("live redemption journal resumes a bare intent only through attempt-bound ADOPT", async () => {
  const directory = await mkdtemp(join(tmpdir(), "noxlimit-redemption-journal-"));
  const path = redemptionJournalPath(join(directory, "evidence.json"));
  try {
    const exactBinding = binding(directory);
    const transaction = await preparedTransaction(0n);
    const initial = await openLiveRedemptionJournal({ journalPath: path, binding: exactBinding });
    await initial.recordBrowserEvidence({ safeBlockNumber: 10n, safeBlockHash: `0x${"99".repeat(32)}`, safeBlockTimestamp: 20n });
    await initial.reserve("resolution", transaction);
    await initial.close();

    const resumed = await openLiveRedemptionJournal({ journalPath: path, binding: exactBinding });
    await assert.rejects(
      () => resumed.recoverAdopt("resolution", { expectedAttempt: 2, transactionHash: transaction.transactionHash }),
      /stale or mismatched ADOPT/,
    );
    await resumed.recoverAdopt("resolution", {
      expectedAttempt: 1,
      transactionHash: transaction.transactionHash,
    });
    assert.equal(resumed.snapshot().actions.resolution.state, "SUBMITTED");
    assert.equal(resumed.snapshot().actions.resolution.recoveries.at(-1).action, "ADOPT");
    await resumed.close();
    await rm(path, { force: true });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("live redemption journal permits RETRY only with a bound no-broadcast proof and reuses the exact signed transaction", async () => {
  const directory = await mkdtemp(join(tmpdir(), "noxlimit-redemption-journal-"));
  const path = redemptionJournalPath(join(directory, "evidence.json"));
  try {
    const exactBinding = binding(directory);
    const transaction = await preparedTransaction(0n);
    const initial = await openLiveRedemptionJournal({ journalPath: path, binding: exactBinding });
    await initial.recordBrowserEvidence({ safeBlockNumber: 10n, safeBlockHash: `0x${"99".repeat(32)}`, safeBlockTimestamp: 20n });
    await initial.reserve("resolution", transaction);
    await initial.close();

    const resumed = await openLiveRedemptionJournal({ journalPath: path, binding: exactBinding });
    const proof = {
      checkedAtBlockNumber: "11",
      checkedAtBlockHash: `0x${"ab".repeat(32)}`,
      transactionAbsent: true,
      receiptAbsent: true,
      latestNonce: "0",
      pendingNonce: "0",
    };
    await assert.rejects(
      () => resumed.recoverRetry("resolution", {
        expectedAttempt: 1,
        transactionHash: transaction.transactionHash,
        proof: { ...proof, pendingNonce: "1" },
      }),
      /unproven RETRY/,
    );
    await resumed.recoverRetry("resolution", {
      expectedAttempt: 1,
      transactionHash: transaction.transactionHash,
      proof,
    });
    assert.equal(resumed.snapshot().actions.resolution.state, "RETRY_READY");
    const retried = await resumed.reserve("resolution");
    assert.deepEqual(retried, transaction);
    assert.equal(resumed.snapshot().actions.resolution.attempt, 2);
    await resumed.recordSubmitted("resolution", transaction.transactionHash);
    await resumed.close();

    const verified = await openLiveRedemptionJournal({ journalPath: path, binding: exactBinding });
    assert.equal(verified.snapshot().actions.resolution.state, "SUBMITTED");
    assert.equal(verified.snapshot().actions.resolution.recoveries.at(-1).action, "RETRY");
    await verified.close();
    await rm(path, { force: true });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
