import assert from "node:assert/strict";
import test from "node:test";

import { keccak256, toHex } from "viem";

import { createLiveSepoliaWallet } from "../e2e/live/live-wallet.ts";

const PRIVATE_KEY = keccak256(toHex("NoxLimit live wallet diagnostics test key"));

function wallet() {
  return createLiveSepoliaWallet({
    privateKey: PRIVATE_KEY,
    rpcUrl: "http://127.0.0.1:9",
    fundingTreasury: "0x1111111111111111111111111111111111111111",
    orderBook: "0x2222222222222222222222222222222222222222",
    collateral: "0x3333333333333333333333333333333333333333",
    side: "YES",
    amountAtoms: 1_000_000n,
    tradingClosesAt: "2031-01-01T00:00:00.000Z",
  });
}

test("live wallet diagnostics sanitize browser-controlled method names and return snapshots", async () => {
  const liveWallet = wallet();
  let binding;
  await liveWallet.install({
    exposeBinding: async (_name, callback) => { binding = callback; },
    addInitScript: async () => {},
  });
  assert.equal(typeof binding, "function");

  const privateText = "eth_private\nmaximum=0.42";
  await assert.rejects(
    () => binding({}, { method: privateText }),
    (error) => {
      assert.match(error.message, /method unknown/);
      assert.doesNotMatch(error.message, /private|maximum|0\.42/);
      return true;
    },
  );

  const first = liveWallet.requestedMethods();
  assert.deepEqual(first, ["unknown"]);
  first.push("mutated-copy");
  assert.deepEqual(liveWallet.requestedMethods(), ["unknown"]);

  const accounts = await binding({}, { method: "eth_accounts" });
  assert.deepEqual(accounts, [liveWallet.address]);
  assert.deepEqual(liveWallet.requestedMethods(), ["unknown", "eth_accounts"]);
});
