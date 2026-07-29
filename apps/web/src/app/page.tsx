import { ProductShell } from "@/components/terminal/product-shell";
import { getMarketStream } from "@/lib/api/client";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const { market } = await searchParams;
  return <ProductShell result={await getMarketStream()} initialMarketId={market} />;
}
