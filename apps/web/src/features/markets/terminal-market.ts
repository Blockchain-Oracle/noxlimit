import type {
  LiquidityProvenance,
  MarketRuntimePolicy,
  MarketStreamCardView,
  MarketView,
} from "@noxlimit/protocol";

/**
 * The selected terminal needs the same verified facts whether it was opened from
 * a stream card or from a durable /markets/:marketId URL. This is a view adapter,
 * not an alternate market schema or a source of synthetic values.
 */
export type TerminalMarket = Readonly<{
  marketId: MarketView["marketId"];
  asset: MarketView["asset"];
  horizon: MarketView["horizon"];
  question: string;
  strikeUsd: string;
  tradingClosesAt: string;
  resolvesAt: string;
  lifecycle: MarketView["lifecycle"];
  tradeability: MarketView["tradeability"];
  tradeabilityReasons: MarketView["tradeabilityReasons"];
  oraclePriceUsd: string;
  oracleObservedAt: string;
  oracleSource: string;
  yesAveragePrice: string;
  noAveragePrice: string;
  completeSetDepth: string;
  poolQuotedAt: string;
  oracleStale: boolean;
  poolStale: boolean;
  liquidityProvenance: LiquidityProvenance;
  runtimePolicy?: MarketRuntimePolicy;
}>;

export function terminalMarketFromStream(market: MarketStreamCardView): TerminalMarket {
  return {
    marketId: market.marketId,
    asset: market.asset,
    horizon: market.horizon,
    question: market.question,
    strikeUsd: market.strikeUsd,
    tradingClosesAt: market.tradingClosesAt,
    resolvesAt: market.resolvesAt,
    lifecycle: market.lifecycle,
    tradeability: market.tradeability,
    tradeabilityReasons: market.tradeabilityReasons,
    oraclePriceUsd: market.oraclePriceUsd,
    oracleObservedAt: market.oracleObservedAt,
    oracleSource: market.preview.mode === "UNDERLYING" ? market.preview.source : "Verified resolver feed",
    yesAveragePrice: market.yesAveragePrice,
    noAveragePrice: market.noAveragePrice,
    completeSetDepth: market.completeSetDepth,
    poolQuotedAt: market.poolQuotedAt,
    oracleStale: market.oracleStale,
    poolStale: market.poolStale,
    liquidityProvenance: market.liquidityProvenance,
  };
}

export function terminalMarketFromDetail(market: MarketView): TerminalMarket {
  return {
    marketId: market.marketId,
    asset: market.asset,
    horizon: market.horizon,
    question: market.question,
    strikeUsd: market.strikeUsd,
    tradingClosesAt: market.tradingClosesAt,
    resolvesAt: market.resolvesAt,
    lifecycle: market.lifecycle,
    tradeability: market.tradeability,
    tradeabilityReasons: market.tradeabilityReasons,
    oraclePriceUsd: market.oracle.priceUsd,
    oracleObservedAt: market.oracle.observedAt,
    oracleSource: market.oracle.source,
    yesAveragePrice: market.pool.yesAveragePrice,
    noAveragePrice: market.pool.noAveragePrice,
    completeSetDepth: market.pool.completeSetDepth,
    poolQuotedAt: market.pool.quotedAt,
    oracleStale: market.oracle.stale,
    poolStale: market.pool.stale,
    liquidityProvenance: market.pool.liquidityProvenance,
    runtimePolicy: market.runtimePolicy,
  };
}
