import type { MarketStreamCardView } from "@noxlimit/protocol";

export function isLiveCatalogMarket(market: MarketStreamCardView): boolean {
  if (market.verification !== "VERIFIED") return false;
  if (market.catalogActivation !== "ACTIVE") return false;
  if (market.lifecycle !== "ORDERING_OPEN") return false;
  if (market.tradeability === "NO_LIQUIDITY") return false;
  try {
    return BigInt(market.completeSetDepthAtoms) > 0n;
  } catch {
    return false;
  }
}

export function formatUtc(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Invalid timestamp";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}
