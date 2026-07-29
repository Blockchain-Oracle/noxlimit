import { z } from "zod";

export const disclosureStateSchema = z.enum(["ENCRYPTED", "PUBLISHED"]);
export const publicationMaterialStateSchema = z.enum([
  "NOT_REQUESTED",
  "REQUESTED",
  "AVAILABLE",
]);
export const privateLimitDisplaySchema = z.enum([
  "ENCRYPTED",
  "KNOWN_IN_CURRENT_SESSION",
  "PUBLISHED",
]);
export const orderStatusSchema = z.enum([
  "RESTING_PRIVATELY",
  "EVALUATING",
  "PUBLICATION_PENDING",
  "FILLED",
  "MONITORING_EXHAUSTED",
  "EXPIRY_READY",
  "CANCELLED",
  "EXPIRED",
  "DISCLOSED_REFUNDABLE",
  "REFUND_PENDING",
  "REFUNDED",
]);

export const SOLIDITY_ORDER_STATUS = {
  None: 0,
  Open: 1,
  Evaluating: 2,
  PublicationPending: 3,
  Executing: 4,
  Filled: 5,
  Cancelled: 6,
  Expired: 7,
  DisclosedRefundable: 8,
  Refunded: 9,
} as const;

export const solidityOrderStatusSchema = z.number().int().min(0).max(9);

export type DisclosureState = z.infer<typeof disclosureStateSchema>;
export type PublicationMaterialState = z.infer<typeof publicationMaterialStateSchema>;
export type PrivateLimitDisplay = z.infer<typeof privateLimitDisplaySchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type SolidityOrderStatus = z.infer<typeof solidityOrderStatusSchema>;

export function deriveDisclosureState(publicationObserved: boolean): DisclosureState {
  return publicationObserved ? "PUBLISHED" : "ENCRYPTED";
}

export function derivePublicationMaterialState(
  publicationObserved: boolean,
  publishedValueAvailable: boolean,
): PublicationMaterialState {
  if (!publicationObserved && publishedValueAvailable) {
    throw new Error("published material cannot exist before publication is observed");
  }
  if (!publicationObserved) return "NOT_REQUESTED";
  return publishedValueAvailable ? "AVAILABLE" : "REQUESTED";
}

export function derivePrivateLimitDisplay(
  disclosureState: DisclosureState,
  knownInCurrentSession: boolean,
): PrivateLimitDisplay {
  if (disclosureState === "PUBLISHED") return "PUBLISHED";
  return knownInCurrentSession ? "KNOWN_IN_CURRENT_SESSION" : "ENCRYPTED";
}

export type DeriveOrderStatusInput = {
  onchainStatus: SolidityOrderStatus;
  nowSeconds: bigint;
  expiresAtSeconds: bigint;
  tradingClosesAtSeconds: bigint;
  evaluationCount: number;
  maximumEvaluations: number;
  refundPending?: boolean;
};

export function deriveOrderStatus(input: DeriveOrderStatusInput): OrderStatus {
  solidityOrderStatusSchema.parse(input.onchainStatus);
  if (input.nowSeconds < 0n || input.expiresAtSeconds < 0n || input.tradingClosesAtSeconds < 0n) {
    throw new RangeError("order times must be non-negative");
  }
  if (!Number.isInteger(input.evaluationCount) || input.evaluationCount < 0) {
    throw new RangeError("evaluationCount must be a non-negative integer");
  }
  if (!Number.isInteger(input.maximumEvaluations) || input.maximumEvaluations <= 0) {
    throw new RangeError("maximumEvaluations must be a positive integer");
  }

  const atExecutionBoundary =
    input.nowSeconds >= input.expiresAtSeconds ||
    input.nowSeconds >= input.tradingClosesAtSeconds;
  let status: OrderStatus;

  switch (input.onchainStatus) {
    case SOLIDITY_ORDER_STATUS.Open:
      status = atExecutionBoundary
        ? "EXPIRY_READY"
        : input.evaluationCount >= input.maximumEvaluations
          ? "MONITORING_EXHAUSTED"
          : "RESTING_PRIVATELY";
      break;
    case SOLIDITY_ORDER_STATUS.Evaluating:
      status = atExecutionBoundary ? "EXPIRY_READY" : "EVALUATING";
      break;
    case SOLIDITY_ORDER_STATUS.PublicationPending:
    case SOLIDITY_ORDER_STATUS.Executing:
      status = "PUBLICATION_PENDING";
      break;
    case SOLIDITY_ORDER_STATUS.Filled:
      status = "FILLED";
      break;
    case SOLIDITY_ORDER_STATUS.Cancelled:
      status = "CANCELLED";
      break;
    case SOLIDITY_ORDER_STATUS.Expired:
      status = "EXPIRED";
      break;
    case SOLIDITY_ORDER_STATUS.DisclosedRefundable:
      status = "DISCLOSED_REFUNDABLE";
      break;
    case SOLIDITY_ORDER_STATUS.Refunded:
      status = "REFUNDED";
      break;
    default:
      throw new RangeError("Status.None cannot be represented as an OrderView");
  }

  if (
    input.refundPending === true &&
    (status === "CANCELLED" || status === "EXPIRED" || status === "DISCLOSED_REFUNDABLE")
  ) {
    return "REFUND_PENDING";
  }
  return status;
}
