import { orderRefSchema } from "@noxlimit/protocol";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/features/orders/order-detail";

export default async function OrderPage({ params }: { params: Promise<{ chainId: string; orderBook: string; orderId: string }> }) {
  const value = await params;
  const parsed = orderRefSchema.safeParse({ chainId: Number(value.chainId), orderBook: value.orderBook, orderId: value.orderId });
  if (!parsed.success) notFound();
  return <OrderDetail refValue={parsed.data} />;
}
