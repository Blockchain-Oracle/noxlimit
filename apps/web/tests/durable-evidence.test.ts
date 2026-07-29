import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityView, OrderRef } from "@noxlimit/protocol";

import { activityMatchesOrder, durableOrderActivity } from "../src/features/activity/durable-evidence.ts";

const ref: OrderRef = {
  chainId: 11_155_111,
  orderBook: "0x3333333333333333333333333333333333333333",
  orderId: "1",
};

function activity(input: Partial<ActivityView> & Pick<ActivityView, "activityId" | "blockNumber" | "logIndex">): ActivityView {
  return {
    kind: "ORDER_CREATED",
    occurredAt: "2030-01-01T00:00:00.000Z",
    transactionHash: `0x${input.activityId.padStart(64, "0")}`,
    orderRef: ref,
    ...input,
  } as ActivityView;
}

test("matches the complete composite reference instead of a numeric order id", () => {
  const same = activity({ activityId: "1", blockNumber: "10", logIndex: 0 });
  const otherBook = activity({
    activityId: "2",
    blockNumber: "10",
    logIndex: 1,
    orderRef: { ...ref, orderBook: "0x4444444444444444444444444444444444444444" },
  });
  const otherChain = activity({
    activityId: "3",
    blockNumber: "10",
    logIndex: 2,
    orderRef: { ...ref, chainId: 1 },
  });
  assert.equal(activityMatchesOrder(same, ref), true);
  assert.equal(activityMatchesOrder(otherBook, ref), false);
  assert.equal(activityMatchesOrder(otherChain, ref), false);
});

test("sorts exact order evidence by bigint block, log index, and stable identity", () => {
  const laterBlock = activity({ activityId: "3", blockNumber: "100000000000000000001", logIndex: 0 });
  const laterLog = activity({ activityId: "2", blockNumber: "100000000000000000000", logIndex: 2 });
  const first = activity({ activityId: "1", blockNumber: "100000000000000000000", logIndex: 1 });
  const unrelated = activity({
    activityId: "4",
    blockNumber: "1",
    logIndex: 0,
    orderRef: { ...ref, orderId: "2" },
  });
  assert.deepEqual(
    durableOrderActivity([laterBlock, unrelated, laterLog, first], ref).map((item) => item.activityId),
    ["1", "2", "3"],
  );
});
