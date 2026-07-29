import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  openLiveRedemptionJournal,
  redemptionJournalPath,
} from "../e2e/live/redemption-journal.ts";
import {
  reconcileBareRedemptionIntents,
  recordOrConfirmRetryBrowserEvidence,
} from "../e2e/live/redemption-recovery.ts";

const RESOLVER = "0x1111111111111111111111111111111111111111";
const CONDITIONAL_TOKENS = "0x2222222222222222222222222222222222222222";
const signer = privateKeyToAccount(keccak256(toHex("NoxLimit recovery test signer")));

function binding(directory) {
  return {
    chainId: 11155111,
    marketId: `0x${"33".repeat(32)}`,
    positionId: `0x${"44".repeat(32)}`,
    wallet: signer.address,
    catalogRevision: `0x${"55".repeat(32)}`,
    resolver: RESOLVER,
    conditionalTokens: CONDITIONAL_TOKENS,
    collateral: "0x6666666666666666666666666666666666666666",
    conditionId: `0x${"77".repeat(32)}`,
    selectedRoundId: "100",
    predecessorRoundId: "99",
    expectedWinner: "YES",
    evidenceOutputPath: join(directory, "evidence.json"),
  };
}

async function prepared() {
  const calldata = "0x1234";
  const serializedTransaction = await signer.signTransaction({
    chainId: 11155111,
    type: "eip1559",
    nonce: 0,
    gas: 100_000n,
    maxFeePerGas: 2_000_000_000n,
    maxPriorityFeePerGas: 1_000_000_000n,
    to: RESOLVER,
    data: calldata,
    value: 0n,
  });
  return {
    transactionHash: keccak256(serializedTransaction),
    nonce: "0",
    serializedTransaction,
    destination: RESOLVER,
    calldata,
  };
}

async function bareIntent(directory) {
  const path = redemptionJournalPath(join(directory, "evidence.json"));
  const journal = await openLiveRedemptionJournal({ journalPath: path, binding: binding(directory) });
  const transaction = await prepared();
  await journal.recordBrowserEvidence({
    safeBlockNumber: 10n,
    safeBlockHash: `0x${"88".repeat(32)}`,
    safeBlockTimestamp: 20n,
  });
  await journal.reserve("resolution", transaction);
  return { journal, path, transaction };
}

function expected(transaction) {
  return {
    resolution: { to: RESOLVER, data: transaction.calldata },
    redemption: { to: CONDITIONAL_TOKENS, data: "0x5678" },
  };
}

test("bare INTENT ADOPT verifies the exact visible transaction before recording SUBMITTED", async () => {
  const directory = await mkdtemp(join(tmpdir(), "noxlimit-redemption-recovery-"));
  const { journal, path, transaction } = await bareIntent(directory);
  try {
    const client = {
      async getTransaction({ hash }) {
        return {
          hash,
          from: signer.address,
          to: RESOLVER,
          input: transaction.calldata,
          value: 0n,
          nonce: 0,
        };
      },
    };
    await reconcileBareRedemptionIntents({
      journal,
      client,
      wallet: signer.address,
      recovery: {
        resolution: { action: "ADOPT", expectedAttempt: 1, transactionHash: transaction.transactionHash },
      },
      expected: expected(transaction),
    });
    assert.equal(journal.snapshot().actions.resolution.state, "SUBMITTED");
    assert.equal(journal.snapshot().actions.resolution.transactionHash, transaction.transactionHash);
  } finally {
    await journal.close();
    await rm(path, { force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test("bare INTENT RETRY requires hash absence, stable block identity, and unchanged confirmed and pending nonce", async () => {
  const directory = await mkdtemp(join(tmpdir(), "noxlimit-redemption-recovery-"));
  const { journal, path, transaction } = await bareIntent(directory);
  try {
    const block = { number: 42n, hash: `0x${"99".repeat(32)}` };
    const client = {
      async getTransaction() {
        const error = new Error("not found");
        error.name = "TransactionNotFoundError";
        throw error;
      },
      async getTransactionReceipt() {
        const error = new Error("not found");
        error.name = "TransactionReceiptNotFoundError";
        throw error;
      },
      async getBlock() { return block; },
      async getTransactionCount() { return 0; },
    };
    await reconcileBareRedemptionIntents({
      journal,
      client,
      wallet: signer.address,
      recovery: {
        resolution: { action: "RETRY", expectedAttempt: 1, transactionHash: transaction.transactionHash },
      },
      expected: expected(transaction),
    });
    const action = journal.snapshot().actions.resolution;
    assert.equal(action.state, "RETRY_READY");
    assert.equal(action.recoveries.at(-1).action, "RETRY");
    assert.equal(action.recoveries.at(-1).proof.checkedAtBlockHash, block.hash);
    assert.equal(await recordOrConfirmRetryBrowserEvidence(journal, {
      safeBlockNumber: 43n,
      safeBlockHash: `0x${"aa".repeat(32)}`,
      safeBlockTimestamp: 50n,
    }), "PRESERVED");
    assert.deepEqual(journal.snapshot().browserEvidence, {
      safeBlockNumber: "10",
      safeBlockHash: `0x${"88".repeat(32)}`,
      safeBlockTimestamp: "20",
    });
  } finally {
    await journal.close();
    await rm(path, { force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test("bare INTENT RETRY fails closed when the planned transaction exists or the account nonce advanced", async () => {
  const directory = await mkdtemp(join(tmpdir(), "noxlimit-redemption-recovery-"));
  const { journal, path, transaction } = await bareIntent(directory);
  try {
    const client = {
      async getTransaction() {
        return {
          hash: transaction.transactionHash,
          from: signer.address,
          to: RESOLVER,
          input: transaction.calldata,
          value: 0n,
          nonce: 0,
        };
      },
      async getTransactionReceipt() {
        const error = new Error("not found");
        error.name = "TransactionReceiptNotFoundError";
        throw error;
      },
      async getBlock() { return { number: 42n, hash: `0x${"99".repeat(32)}` }; },
      async getTransactionCount() { return 1; },
    };
    await assert.rejects(
      () => reconcileBareRedemptionIntents({
        journal,
        client,
        wallet: signer.address,
        recovery: {
          resolution: { action: "RETRY", expectedAttempt: 1, transactionHash: transaction.transactionHash },
        },
        expected: expected(transaction),
      }),
      /exact planned hash exists/,
    );
    const advancedNonceClient = {
      ...client,
      async getTransaction() {
        const error = new Error("not found");
        error.name = "TransactionNotFoundError";
        throw error;
      },
    };
    await assert.rejects(
      () => reconcileBareRedemptionIntents({
        journal,
        client: advancedNonceClient,
        wallet: signer.address,
        recovery: {
          resolution: { action: "RETRY", expectedAttempt: 1, transactionHash: transaction.transactionHash },
        },
        expected: expected(transaction),
      }),
      /nonce does not positively prove no broadcast/,
    );
    assert.equal(journal.snapshot().actions.resolution.state, "INTENT");
  } finally {
    await journal.close();
    await rm(path, { force: true });
    await rm(directory, { recursive: true, force: true });
  }
});
