import type {
  ActivityView,
  FundingChallengeRequest,
  FundingChallengeResponse,
  FundingClaimRequest,
  FundingClaimResponse,
  HealthView,
  MarketHistoryView,
  MarketListPage,
  MarketView,
  OrderRef,
  OrderView,
  PositionView,
  QuoteView,
} from "@noxlimit/protocol";

export type MarketListInput = Readonly<{
  asset?: "BTC/USD" | "ETH/USD" | "SOL/USD";
  horizon?: "1h" | "4h" | "24h";
  lifecycle?: "LIVE" | "RESOLVING" | "RESOLVED";
  sort: "CLOSING_SOON" | "RECENTLY_OPENED" | "LIQUIDITY";
  limit: number;
  cursor?: string;
  snapshot?: string;
}>;

export type MarketHistoryInput = Readonly<{
  marketId: string;
  mode?: "UNDERLYING" | "OUTCOME_PRICES";
  range?: "1h" | "4h" | "24h" | "ALL";
  sampling?: "CARD_24_MAX" | "TERMINAL_240_MAX";
  limit: number;
  cursor?: string;
}>;

export interface ServiceReadModel {
  listMarkets(input: MarketListInput): Promise<MarketListPage>;
  getMarket(marketId: string): Promise<MarketView | undefined>;
  getMarketHistory(input: MarketHistoryInput): Promise<MarketHistoryView | undefined>;
  getQuote(marketId: string, side: "YES" | "NO", amount: string): Promise<QuoteView | undefined>;
  getOrder(orderRef: OrderRef): Promise<OrderView | undefined>;
  listOrders(owner: `0x${string}`): Promise<readonly OrderView[]>;
  listPositions(owner: `0x${string}`): Promise<readonly PositionView[]>;
  listActivity(input: {
    marketId?: string;
    owner?: `0x${string}`;
  }): Promise<readonly ActivityView[]>;
  health(): Promise<HealthView>;
}

export interface FundingCoordinator {
  challenge(input: FundingChallengeRequest): Promise<FundingChallengeResponse>;
  claim(input: FundingClaimRequest): Promise<FundingClaimResponse>;
}
