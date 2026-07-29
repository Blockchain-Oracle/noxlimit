import assert from "node:assert/strict";
import test from "node:test";

import {
  LIVE_REDEMPTION_CONFIRMATION,
  parseRecoveryJson,
  readLiveRedemptionSettings,
} from "../e2e/live/redemption-settings.ts";

function validEnvironment() {
  return {
    LIVE_REDEMPTION_CONFIRM: LIVE_REDEMPTION_CONFIRMATION,
    LIVE_REDEMPTION_PRIVATE_KEY: `0x${"11".repeat(32)}`,
    LIVE_REDEMPTION_RPC_URL: "https://rpc.example.test/project",
    LIVE_REDEMPTION_MARKET_ID: `0x${"22".repeat(32)}`,
    LIVE_REDEMPTION_POSITION_ID: `0x${"33".repeat(32)}`,
    LIVE_REDEMPTION_EXPECTED_WINNER: "YES",
    LIVE_REDEMPTION_SELECTED_ROUND_ID: "18446744073709584250",
    LIVE_REDEMPTION_PREDECESSOR_ROUND_ID: "18446744073709584249",
  };
}

test("live redemption remains disabled without the exact explicit confirmation", () => {
  const result = readLiveRedemptionSettings({});
  assert.equal(result.enabled, false);
  assert.match(result.reason, /disabled/);
});

test("live redemption parses one exact market, position, winner, and uint80 round pair", () => {
  const result = readLiveRedemptionSettings(validEnvironment());
  assert.equal(result.enabled, true);
  assert.equal(result.settings.expectedWinner, "YES");
  assert.equal(result.settings.selectedRoundId, 18_446_744_073_709_584_250n);
  assert.equal(result.settings.predecessorRoundId, 18_446_744_073_709_584_249n);
  assert.equal(result.settings.rpcUrl, "https://rpc.example.test/project");
  assert.deepEqual(result.settings.recovery, {});
});

test("live redemption recovery accepts only exact attempt-bound ADOPT or RETRY entries", () => {
  const transactionHash = `0x${"44".repeat(32)}`;
  assert.deepEqual(parseRecoveryJson(JSON.stringify({
    resolution: { action: "ADOPT", expectedAttempt: 1, transactionHash },
    redemption: { action: "RETRY", expectedAttempt: 2, transactionHash },
  })), {
    resolution: { action: "ADOPT", expectedAttempt: 1, transactionHash },
    redemption: { action: "RETRY", expectedAttempt: 2, transactionHash },
  });

  for (const value of [
    { resolution: { action: "RETRY", expectedAttempt: 0, transactionHash } },
    { resolution: { action: "ADOPT", expectedAttempt: 1, transactionHash, privateKey: `0x${"11".repeat(32)}` } },
    { other: { action: "RETRY", expectedAttempt: 1, transactionHash } },
  ]) assert.throws(() => parseRecoveryJson(JSON.stringify(value)));
});

test("live redemption rejects duplicate or overflowing round evidence", () => {
  const duplicate = validEnvironment();
  duplicate.LIVE_REDEMPTION_PREDECESSOR_ROUND_ID = duplicate.LIVE_REDEMPTION_SELECTED_ROUND_ID;
  assert.equal(readLiveRedemptionSettings(duplicate).enabled, false);

  const overflow = validEnvironment();
  overflow.LIVE_REDEMPTION_SELECTED_ROUND_ID = (2n ** 80n).toString();
  assert.equal(readLiveRedemptionSettings(overflow).enabled, false);
});
