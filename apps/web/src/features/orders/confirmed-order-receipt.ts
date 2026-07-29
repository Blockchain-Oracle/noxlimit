import type { MarketSide, OrderRef } from "@noxlimit/protocol";
import type { Hex } from "viem";

/** Public receipt context retained only in the in-memory Query cache while the indexer catches up. */
export type ConfirmedOrderReceipt = Readonly<{
  ref: OrderRef;
  marketId: string;
  side: MarketSide;
  amountIn: string;
  transactionHash: Hex;
  confirmedAt: string;
}>;

export function confirmedOrderReceiptQueryKey(ref: OrderRef) {
  return ["confirmed-order-receipt", ref.chainId, ref.orderBook.toLowerCase(), ref.orderId] as const;
}
