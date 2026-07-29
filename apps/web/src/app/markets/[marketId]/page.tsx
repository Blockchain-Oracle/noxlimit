import { notFound } from "next/navigation";
import { DataState } from "@/components/states/data-state";
import { ProductShell } from "@/components/terminal/product-shell";
import { getMarketDetail, getMarketStream } from "@/lib/api/client";
import { TEST_USDC_DECIMALS, decimalToAtoms, type MarketSide } from "@noxlimit/protocol";

export default async function MarketPage({ params, searchParams }: { params: Promise<{ marketId: string }>; searchParams: Promise<{ side?: string | string[]; amount?: string | string[] }> }) {
  const { marketId } = await params;
  const query = await searchParams;
  const result = await getMarketDetail(marketId);
  if (result.state === "empty") notFound();
  if (result.state !== "ready") return <DataState title="Market data unavailable" message={result.message} actionHref="/" actionLabel="Return to Market Stream" />;
  const sideValue = Array.isArray(query.side) ? query.side[0] : query.side;
  const initialSide: MarketSide = sideValue === "NO" ? "NO" : "YES";
  const amountValue = Array.isArray(query.amount) ? query.amount[0] : query.amount;
  let initialPublicAmount: string | undefined;
  try {
    if (amountValue && decimalToAtoms(amountValue, TEST_USDC_DECIMALS) > 0n) initialPublicAmount = amountValue;
  } catch { /* Invalid public prefill is ignored; private input is never accepted here. */ }
  return <ProductShell result={await getMarketStream()} initialMarketId={result.data.marketId} initialMarket={result.data} initialSide={initialSide} initialPublicAmount={initialPublicAmount} />;
}
