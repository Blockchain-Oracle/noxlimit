export type WorkerOrderState =
  | "RESTING_PRIVATE"
  | "EVALUATING"
  | "PUBLICATION_PENDING"
  | "FILLED"
  | "CANCELLED"
  | "EXPIRED"
  | "DISCLOSED_REFUNDABLE"
  | "REFUNDED";

export type WorkerAction =
  | "REQUEST_EVALUATION"
  | "PRIVATE_DECRYPT"
  | "RECOVER_EVALUATION"
  | "PUBLIC_DECRYPT_AND_FINALIZE"
  | "RECOVER_PUBLICATION"
  | "EXPIRE_ORDER"
  | "NONE";

export type WorkerOrderSnapshot = Readonly<{
  state: WorkerOrderState;
  now: bigint;
  expiresAt: bigint;
  tradingClosesAt: bigint;
  phaseDeadline: bigint;
  remainingEvaluations: number;
  nextEvaluationAt: bigint;
}>;

export function decideWorkerAction(order: WorkerOrderSnapshot): WorkerAction {
  const orderClosed = order.now >= order.expiresAt || order.now >= order.tradingClosesAt;
  switch (order.state) {
    case "RESTING_PRIVATE":
      if (orderClosed) return "EXPIRE_ORDER";
      if (order.remainingEvaluations === 0 || order.now < order.nextEvaluationAt) return "NONE";
      return "REQUEST_EVALUATION";
    case "EVALUATING":
      if (orderClosed || order.now >= order.phaseDeadline) return "RECOVER_EVALUATION";
      return "PRIVATE_DECRYPT";
    case "PUBLICATION_PENDING":
      if (orderClosed || order.now >= order.phaseDeadline) return "RECOVER_PUBLICATION";
      return "PUBLIC_DECRYPT_AND_FINALIZE";
    default:
      return "NONE";
  }
}
