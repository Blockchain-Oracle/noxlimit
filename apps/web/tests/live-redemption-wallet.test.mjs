import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildRedeemPositionsTransaction,
  buildResolveMarketTransaction,
} from "@noxlimit/protocol";
import { getAddress, keccak256, parseTransaction, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  openLiveRedemptionJournal,
  redemptionJournalPath,
} from "../e2e/live/redemption-journal.ts";
import { recordOrConfirmRetryBrowserEvidence } from "../e2e/live/redemption-recovery.ts";
import { createLiveSepoliaRedemptionWallet } from "../e2e/live/redemption-wallet.ts";

const RESOLVER = "0x1111111111111111111111111111111111111111";
const CONDITIONAL_TOKENS = "0x2222222222222222222222222222222222222222";
const COLLATERAL = "0x3333333333333333333333333333333333333333";
const CONDITION_ID = `0x${"44".repeat(32)}`;
const SELECTED_ROUND_ID = 18_446_744_073_709_584_250n;
const PREDECESSOR_ROUND_ID = 18_446_744_073_709_584_249n;
const PRIVATE_KEY = keccak256(toHex("NoxLimit direct redemption wallet test key"));

function journalBinding(directory, wallet) {
  return {
    chainId: 11155111,
    marketId: `0x${"55".repeat(32)}`,
    positionId: `0x${"66".repeat(32)}`,
    wallet,
    catalogRevision: `0x${"77".repeat(32)}`,
    resolver: RESOLVER,
    conditionalTokens: CONDITIONAL_TOKENS,
    collateral: COLLATERAL,
    conditionId: CONDITION_ID,
    selectedRoundId: SELECTED_ROUND_ID.toString(),
    predecessorRoundId: PREDECESSOR_ROUND_ID.toString(),
    expectedWinner: "YES",
    evidenceOutputPath: join(directory, "redemption-evidence.json"),
  };
}

async function startRpc(options = {}) {
  const calls = [];
  let sendCount = 0;
  const server = createServer(async (request, response) => {
    const body = await readBody(request);
    const payload = JSON.parse(body);
    calls.push(payload);
    const failure = options.failure?.(payload);
    if (failure) {
      response.writeHead(failure.httpStatus ?? 200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        jsonrpc: "2.0",
        id: payload.id,
        error: { code: -32_000, message: failure.message, data: failure.data },
      }));
      return;
    }

    let result;
    switch (payload.method) {
      case "eth_chainId":
        result = "0xaa36a7";
        break;
      case "eth_getTransactionCount":
        result = `0x${sendCount.toString(16)}`;
        break;
      case "eth_estimateGas":
        result = "0x30d40";
        break;
      case "eth_maxPriorityFeePerGas":
        result = "0x3b9aca00";
        break;
      case "eth_gasPrice":
        result = "0x77359400";
        break;
      case "eth_getBlockByNumber":
        result = rpcBlock();
        break;
      case "eth_sendRawTransaction":
        sendCount += 1;
        result = keccak256(payload.params[0]);
        break;
      case "eth_call":
        result = "0x";
        break;
      default:
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({
          jsonrpc: "2.0",
          id: payload.id,
          error: { code: -32_601, message: `Unsupported fixture method ${payload.method}` },
        }));
        return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("RPC fixture did not bind a TCP port.");
  return {
    calls,
    rpcUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((reason) => reason ? reject(reason) : resolve())),
  };
}

function rpcBlock() {
  return {
    number: "0x1",
    hash: `0x${"88".repeat(32)}`,
    parentHash: `0x${"99".repeat(32)}`,
    nonce: "0x0000000000000000",
    sha3Uncles: `0x${"aa".repeat(32)}`,
    logsBloom: `0x${"00".repeat(256)}`,
    transactionsRoot: `0x${"bb".repeat(32)}`,
    stateRoot: `0x${"cc".repeat(32)}`,
    receiptsRoot: `0x${"dd".repeat(32)}`,
    miner: "0x0000000000000000000000000000000000000000",
    difficulty: "0x0",
    totalDifficulty: "0x0",
    extraData: "0x",
    size: "0x1",
    gasLimit: "0x1c9c380",
    gasUsed: "0x0",
    timestamp: "0x1",
    transactions: [],
    uncles: [],
    baseFeePerGas: "0x3b9aca00",
    mixHash: `0x${"ee".repeat(32)}`,
  };
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function fixture(t, rpcOptions = {}) {
  const directory = await mkdtemp(join(tmpdir(), "noxlimit-redemption-wallet-"));
  const rpc = await startRpc(rpcOptions);
  const account = privateKeyToAccount(PRIVATE_KEY);
  const evidencePath = join(directory, "redemption-evidence.json");
  const journalPath = redemptionJournalPath(evidencePath);
  const journal = await openLiveRedemptionJournal({
    journalPath,
    binding: journalBinding(directory, account.address),
  });
  await journal.recordBrowserEvidence({
    safeBlockNumber: 10n,
    safeBlockHash: `0x${"ff".repeat(32)}`,
    safeBlockTimestamp: 20n,
  });
  const wallet = createLiveSepoliaRedemptionWallet({
    privateKey: PRIVATE_KEY,
    rpcUrl: rpc.rpcUrl,
    resolver: RESOLVER,
    conditionalTokens: CONDITIONAL_TOKENS,
    collateral: COLLATERAL,
    conditionId: CONDITION_ID,
    selectedRoundId: SELECTED_ROUND_ID,
    predecessorRoundId: PREDECESSOR_ROUND_ID,
    journal,
  });
  let bridge;
  await wallet.install({
    async exposeBinding(_name, handler) {
      bridge = (providerRequest) => handler({}, providerRequest);
    },
    async addInitScript() {},
  });
  if (!bridge) throw new Error("The redemption wallet did not expose its provider binding.");
  t.after(async () => {
    await journal.close();
    await rpc.close();
    await rm(journalPath, { force: true });
    await rm(directory, { recursive: true, force: true });
  });
  return { account, bridge, journal, rpc, wallet };
}

function resolutionTransaction(overrides = {}) {
  const transaction = buildResolveMarketTransaction({
    resolver: RESOLVER,
    selectedRoundId: overrides.selectedRoundId ?? SELECTED_ROUND_ID,
    predecessorRoundId: overrides.predecessorRoundId ?? PREDECESSOR_ROUND_ID,
  });
  return transaction;
}

function redemptionTransaction(overrides = {}) {
  return buildRedeemPositionsTransaction({
    conditionalTokens: CONDITIONAL_TOKENS,
    collateral: overrides.collateral ?? COLLATERAL,
    conditionId: overrides.conditionId ?? CONDITION_ID,
    indexSets: overrides.indexSets,
  });
}

function sendRequest(from, transaction, overrides = {}) {
  return {
    method: "eth_sendTransaction",
    params: [{
      from,
      to: overrides.to ?? transaction.to,
      data: overrides.data ?? transaction.data,
      value: overrides.value ?? "0x0",
    }],
  };
}

async function confirmResolution(journal, transactionHash = `0x${"01".padStart(64, "0")}`) {
  await journal.recordConfirmed("resolution", {
    transactionHash,
    receiptBlockNumber: 11n,
    receiptBlockHash: `0x${"ab".repeat(32)}`,
  });
}

test("redemption wallet signs only the exact configured round pair and exact binary CTF redemption", async (t) => {
  const { account, bridge, journal, rpc, wallet } = await fixture(t);
  const resolution = resolutionTransaction();
  const resolutionHash = await bridge(sendRequest(account.address, resolution));
  await confirmResolution(journal, resolutionHash);
  await journal.recordRedemptionExpectation({ side: "YES", shares: "1.250000", maximumRedemption: "1.250000" });

  const redemption = redemptionTransaction();
  const redemptionHash = await bridge(sendRequest(account.address, redemption, { value: 0 }));

  const rawWrites = rpc.calls.filter((entry) => entry.method === "eth_sendRawTransaction");
  assert.equal(rawWrites.length, 2);
  assert.equal(resolutionHash, keccak256(rawWrites[0].params[0]));
  assert.equal(redemptionHash, keccak256(rawWrites[1].params[0]));
  const decodedResolution = parseTransaction(rawWrites[0].params[0]);
  const decodedRedemption = parseTransaction(rawWrites[1].params[0]);
  assert.equal(getAddress(decodedResolution.to), getAddress(RESOLVER));
  assert.equal(decodedResolution.data.toLowerCase(), resolution.data.toLowerCase());
  assert.equal(decodedResolution.value ?? 0n, 0n);
  assert.equal(getAddress(decodedRedemption.to), getAddress(CONDITIONAL_TOKENS));
  assert.equal(decodedRedemption.data.toLowerCase(), redemption.data.toLowerCase());
  assert.equal(decodedRedemption.value ?? 0n, 0n);
  assert.deepEqual(wallet.writes().map(({ kind, destination, transactionHash }) => ({ kind, destination: getAddress(destination), transactionHash })), [
    { kind: "MARKET_RESOLVE", destination: getAddress(RESOLVER), transactionHash: resolutionHash },
    { kind: "POSITION_REDEEM", destination: getAddress(CONDITIONAL_TOKENS), transactionHash: redemptionHash },
  ]);
});

test("redemption wallet refuses the wrong sender, destination, value, calldata, and round pair before transport", async (t) => {
  const { account, bridge, journal, rpc } = await fixture(t);
  const exact = resolutionTransaction();
  const otherAccount = privateKeyToAccount(keccak256(toHex("NoxLimit other wallet")));
  const alternateRounds = resolutionTransaction({ selectedRoundId: SELECTED_ROUND_ID + 1n });
  const mutatedData = `${exact.data.slice(0, -2)}${exact.data.endsWith("00") ? "01" : "00"}`;
  const cases = [
    [sendRequest(otherAccount.address, exact), /transaction sender/],
    [sendRequest(account.address, exact, { to: COLLATERAL }), /unknown contract destination/],
    [sendRequest(account.address, exact, { value: "0x1" }), /non-zero transaction value/],
    [sendRequest(account.address, exact, { data: mutatedData }), /resolution evidence/],
    [sendRequest(account.address, alternateRounds), /resolution evidence/],
  ];
  for (const [request, message] of cases) {
    await assert.rejects(() => bridge(request), message);
  }
  assert.equal(journal.snapshot().actions.resolution.state, "UNUSED");
  assert.equal(rpc.calls.length, 0);
});

test("redemption wallet refuses alternate CTF payout bindings", async (t) => {
  const { account, bridge, journal, rpc } = await fixture(t);
  const resolutionHash = await bridge(sendRequest(account.address, resolutionTransaction()));
  await confirmResolution(journal, resolutionHash);
  await journal.recordRedemptionExpectation({ side: "YES", shares: "1.250000", maximumRedemption: "1.250000" });

  for (const transaction of [
    redemptionTransaction({ indexSets: [1n] }),
    redemptionTransaction({ collateral: RESOLVER }),
    redemptionTransaction({ conditionId: `0x${"45".repeat(32)}` }),
  ]) {
    await assert.rejects(() => bridge(sendRequest(account.address, transaction)), /redemption calldata/);
  }
  assert.equal(journal.snapshot().actions.redemption.state, "UNUSED");
  assert.equal(rpc.calls.filter((entry) => entry.method === "eth_sendRawTransaction").length, 1);
});

test("redemption wallet refuses every unneeded signing and raw-transaction method", async (t) => {
  const { account, bridge, rpc } = await fixture(t);
  const methods = [
    "eth_sign",
    "personal_sign",
    "eth_signTransaction",
    "eth_signTypedData",
    "eth_signTypedData_v4",
    "eth_sendRawTransaction",
    "wallet_sendCalls",
  ];
  for (const method of methods) {
    await assert.rejects(
      () => bridge({ method, params: [account.address, "0x"] }),
      new RegExp(`method ${method}`),
    );
  }
  assert.equal(rpc.calls.length, 0);
});

test("redemption wallet refuses redemption before resolution is durably confirmed", async (t) => {
  const { account, bridge, journal, rpc } = await fixture(t);
  await journal.recordRedemptionExpectation({ side: "YES", shares: "1.250000", maximumRedemption: "1.250000" });
  await assert.rejects(
    () => bridge(sendRequest(account.address, redemptionTransaction())),
    /before confirmed resolution/,
  );
  assert.equal(journal.snapshot().actions.redemption.state, "UNUSED");
  assert.equal(rpc.calls.length, 0);
});

test("redemption wallet reserves a concurrent duplicate before either request can send twice", async (t) => {
  const { account, bridge, journal, rpc } = await fixture(t);
  const request = sendRequest(account.address, resolutionTransaction());
  const results = await Promise.allSettled([bridge(request), bridge(request)]);
  assert.equal(results.filter((entry) => entry.status === "fulfilled").length, 1);
  assert.equal(results.filter((entry) => entry.status === "rejected").length, 1);
  assert.match(
    results.find((entry) => entry.status === "rejected").reason.message,
    /reservation is already in progress|action is INTENT/,
  );
  assert.equal(journal.snapshot().actions.resolution.state, "SUBMITTED");
  assert.equal(rpc.calls.filter((entry) => entry.method === "eth_sendRawTransaction").length, 1);
});

test("redemption wallet retry preserves the original browser evidence and rebroadcasts the identical signed transaction", async (t) => {
  let failWrite = true;
  const { account, bridge, journal, rpc } = await fixture(t, {
    failure: ({ method }) => method === "eth_sendRawTransaction" && failWrite
      ? { message: "ambiguous fixture submission" }
      : undefined,
  });
  const request = sendRequest(account.address, resolutionTransaction());
  await assert.rejects(() => bridge(request), /explicit recovery/);
  const intent = journal.snapshot().actions.resolution;
  assert.equal(intent.state, "INTENT");
  const firstRaw = rpc.calls.find((entry) => entry.method === "eth_sendRawTransaction").params[0];

  await journal.recoverRetry("resolution", {
    expectedAttempt: 1,
    transactionHash: intent.preparedTransaction.transactionHash,
    proof: {
      checkedAtBlockNumber: "11",
      checkedAtBlockHash: `0x${"cd".repeat(32)}`,
      transactionAbsent: true,
      receiptAbsent: true,
      latestNonce: "0",
      pendingNonce: "0",
    },
  });
  assert.equal(await recordOrConfirmRetryBrowserEvidence(journal, {
    safeBlockNumber: 11n,
    safeBlockHash: `0x${"ef".repeat(32)}`,
    safeBlockTimestamp: 21n,
  }), "PRESERVED");
  failWrite = false;
  const retryResults = await Promise.allSettled([bridge(request), bridge(request)]);
  assert.equal(retryResults.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(retryResults.filter((result) => result.status === "rejected").length, 1);
  const hash = retryResults.find((result) => result.status === "fulfilled").value;
  const rawWrites = rpc.calls.filter((entry) => entry.method === "eth_sendRawTransaction");
  assert.equal(rawWrites.length, 2);
  assert.equal(rawWrites[1].params[0], firstRaw);
  assert.equal(hash, keccak256(firstRaw));
  assert.equal(journal.snapshot().actions.resolution.state, "SUBMITTED");
  assert.equal(journal.snapshot().actions.resolution.attempt, 2);
  assert.equal(journal.snapshot().browserEvidence.safeBlockNumber, "10");
});

test("redemption wallet decodes and rejects tampered signed recovery bytes before any broadcast", async () => {
  const rpc = await startRpc();
  try {
    const account = privateKeyToAccount(PRIVATE_KEY);
    const attacker = privateKeyToAccount(keccak256(toHex("NoxLimit tampered recovery signer")));
    const exact = resolutionTransaction();
    const serializedTransaction = await attacker.signTransaction({
      chainId: 11155111,
      type: "eip1559",
      nonce: 0,
      gas: 100_000n,
      maxFeePerGas: 2_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
      to: RESOLVER,
      data: exact.data,
      value: 0n,
    });
    const preparedTransaction = {
      transactionHash: keccak256(serializedTransaction),
      nonce: "0",
      serializedTransaction,
      destination: RESOLVER,
      calldata: exact.data,
    };
    const fakeJournal = {
      assertCanReserve() {},
      snapshot() {
        return {
          actions: {
            resolution: { state: "RETRY_READY", attempt: 1, preparedTransaction, recoveries: [] },
            redemption: { state: "UNUSED", attempt: 0, recoveries: [] },
          },
        };
      },
      async reserve() { return preparedTransaction; },
      async recordSubmitted() { throw new Error("recordSubmitted must not run"); },
    };
    const wallet = createLiveSepoliaRedemptionWallet({
      privateKey: PRIVATE_KEY,
      rpcUrl: rpc.rpcUrl,
      resolver: RESOLVER,
      conditionalTokens: CONDITIONAL_TOKENS,
      collateral: COLLATERAL,
      conditionId: CONDITION_ID,
      selectedRoundId: SELECTED_ROUND_ID,
      predecessorRoundId: PREDECESSOR_ROUND_ID,
      journal: fakeJournal,
    });
    let bridge;
    await wallet.install({
      async exposeBinding(_name, handler) { bridge = (providerRequest) => handler({}, providerRequest); },
      async addInitScript() {},
    });
    await assert.rejects(
      () => bridge(sendRequest(account.address, exact)),
      /not signed by the bound wallet/,
    );
    assert.equal(rpc.calls.filter((entry) => entry.method === "eth_sendRawTransaction").length, 0);
  } finally {
    await rpc.close();
  }
});

test("redemption wallet read errors redact credential-bearing RPC details", async (t) => {
  const credential = "rpc-user-secret";
  const keyMaterial = PRIVATE_KEY;
  const { bridge, rpc } = await fixture(t, {
    failure: ({ method }) => method === "eth_call"
      ? { message: `upstream rejected ${credential}`, data: { privateKey: keyMaterial } }
      : undefined,
  });
  let failure;
  try {
    await bridge({ method: "eth_call", params: [{ to: RESOLVER, data: "0x" }, "safe"] });
  } catch (reason) {
    failure = reason;
  }
  assert.ok(failure instanceof Error);
  assert.equal(failure.message, "Live redemption wallet refused Sepolia read.");
  assert.doesNotMatch(failure.stack ?? failure.message, new RegExp(credential, "i"));
  assert.doesNotMatch(failure.stack ?? failure.message, new RegExp(keyMaterial.slice(2), "i"));
  assert.equal(rpc.calls.length, 1);
});

test("redemption wallet write errors do not expose RPC or private-key credentials", async (t) => {
  const rpcCredential = "write-rpc-secret";
  const keyMaterial = PRIVATE_KEY;
  const { account, bridge } = await fixture(t, {
    failure: ({ method }) => method === "eth_sendRawTransaction"
      ? { message: `upstream rejected ${rpcCredential}`, data: { privateKey: keyMaterial } }
      : undefined,
  });
  let failure;
  try {
    await bridge(sendRequest(account.address, resolutionTransaction()));
  } catch (reason) {
    failure = reason;
  }
  assert.ok(failure instanceof Error);
  assert.doesNotMatch(failure.message, new RegExp(rpcCredential, "i"));
  assert.doesNotMatch(failure.message, new RegExp(keyMaterial.slice(2), "i"));
});
