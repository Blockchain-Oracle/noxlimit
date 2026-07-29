import type {
  ActivityView,
  HealthView,
  MarketHistoryView,
  MarketListPage,
  MarketView,
  OrderRef,
  OrderView,
  PositionView,
  QuoteView,
} from "@noxlimit/protocol";

import type { ServiceReadModel, MarketHistoryInput, MarketListInput } from "../api/ports.js";
import type { LiveMarketReader } from "../chain/market-reader.js";

/** Keep trust-critical quotes direct-to-chain while delegating projections to the rebuildable store. */
export class LiveReadModel implements ServiceReadModel {
  constructor(
    readonly projections: ServiceReadModel,
    readonly markets: LiveMarketReader,
  ) {}

  listMarkets(input: MarketListInput): Promise<MarketListPage> {
    return this.projections.listMarkets(input);
  }
  getMarket(marketId: string): Promise<MarketView | undefined> {
    return this.projections.getMarket(marketId);
  }
  getMarketHistory(input: MarketHistoryInput): Promise<MarketHistoryView | undefined> {
    return this.markets.history(input);
  }
  getQuote(marketId: string, side: "YES" | "NO", amount: string): Promise<QuoteView | undefined> {
    return this.markets.quote(marketId, side, amount);
  }
  getOrder(ref: OrderRef): Promise<OrderView | undefined> {
    return this.projections.getOrder(ref);
  }
  listOrders(owner: `0x${string}`): Promise<readonly OrderView[]> {
    return this.projections.listOrders(owner);
  }
  listPositions(owner: `0x${string}`): Promise<readonly PositionView[]> {
    return this.projections.listPositions(owner);
  }
  listActivity(input: { marketId?: string; owner?: `0x${string}` }): Promise<readonly ActivityView[]> {
    return this.projections.listActivity(input);
  }
  health(): Promise<HealthView> {
    return this.projections.health();
  }
}
