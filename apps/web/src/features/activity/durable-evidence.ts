import type { ActivityView, OrderRef } from "@noxlimit/protocol";

function compareActivity(left: ActivityView, right: ActivityView): number {
  const leftBlock = BigInt(left.blockNumber);
  const rightBlock = BigInt(right.blockNumber);
  if (leftBlock !== rightBlock) return leftBlock < rightBlock ? -1 : 1;
  if (left.logIndex !== right.logIndex) return left.logIndex - right.logIndex;
  return left.activityId.localeCompare(right.activityId);
}

export function activityMatchesOrder(activity: ActivityView, ref: OrderRef): boolean {
  return activity.orderRef !== undefined
    && activity.orderRef.chainId === ref.chainId
    && activity.orderRef.orderBook.toLowerCase() === ref.orderBook.toLowerCase()
    && activity.orderRef.orderId === ref.orderId;
}

export function durableOrderActivity(
  activities: readonly ActivityView[],
  ref: OrderRef,
): readonly ActivityView[] {
  return activities.filter((activity) => activityMatchesOrder(activity, ref)).sort(compareActivity);
}
