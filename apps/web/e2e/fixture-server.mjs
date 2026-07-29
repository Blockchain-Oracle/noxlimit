import { createServer } from "node:http";
import {
  activityViewSchema,
  healthViewSchema,
  marketHistoryViewSchema,
  marketListPageSchema,
  marketViewSchema,
  orderViewSchema,
  positionViewSchema,
  quoteViewSchema,
} from "@noxlimit/protocol";

const hex = (digit) => `0x${digit.repeat(64)}`;
const address = (digit) => `0x${digit.repeat(40)}`;
const now = "2030-01-01T00:10:00.000Z";

function card(index, asset, horizon, question, strikeUsd, oraclePriceUsd) {
  return {
    marketId: hex(String(index)), chainId: 11_155_111, asset, horizon, question,
    strikeUsd, opensAt: "2030-01-01T00:00:00.000Z", opensAtBlock: "100",
    tradingClosesAt: "2030-01-01T01:00:00.000Z", resolvesAt: "2030-01-01T01:05:00.000Z",
    verification: "VERIFIED", catalogActivation: "ACTIVE", lifecycle: "ORDERING_OPEN", tradeability: "TRADEABLE", tradeabilityReasons: [], badges: [],
    indexerSafeBlock: "120", asOf: now, oraclePriceUsd, oracleObservedAt: now,
    yesAveragePrice: "0.480000", noAveragePrice: "0.530000", referenceAmount: "1.000000", completeSetDepth: "1000.000000", completeSetDepthAtoms: "1000000000",
    liquidityProvenance: { kind: "BUILDER_SEEDED", seedTransactionHash: hex("a") }, oracleStale: false, poolQuotedAt: now, poolQuotedAtBlock: "120", poolStale: false,
    preview: { mode: "UNDERLYING", source: "Chainlink", feedRef: `fixture-feed-${index}`, asOf: now, stale: false, limitedHistory: false, points: [{ observedAt: "2030-01-01T00:00:00.000Z", priceUsd: oraclePriceUsd }, { observedAt: now, priceUsd: oraclePriceUsd }] },
    positionInFilteredStream: index === 4 ? 3 : index, filteredStreamCount: 3,
  };
}

const allCards = [
  card(1, "BTC/USD", "1h", "Will BTC/USD settle at or above 65,000?", "65000", "64800"),
  card(2, "ETH/USD", "4h", "Will ETH/USD settle at or above 3,500?", "3500", "3490"),
  card(4, "BTC/USD", "24h", "Will BTC/USD settle at or above 66,000?", "66000", "64800"),
];
const resolvedZeroDepthCard = {
  ...card(6, "ETH/USD", "1h", "Did ETH/USD settle at or above 3,400?", "3400", "3425"),
  tradingClosesAt: "2029-12-31T22:55:00.000Z",
  resolvesAt: "2029-12-31T23:00:00.000Z",
  lifecycle: "RESOLVED_YES",
  tradeability: "ORDERING_CLOSED",
  tradeabilityReasons: ["ORDERING_CLOSED"],
  completeSetDepth: "0.000000",
  completeSetDepthAtoms: "0",
  positionInFilteredStream: 1,
  filteredStreamCount: 1,
};
const cards = allCards.slice(0, 2);
const marketPage = marketListPageSchema.parse({ catalogRevision: hex("c"), snapshot: "fixture-snapshot", items: cards, nextCursor: "fixture-page-2" });
const nextMarketPage = marketListPageSchema.parse({ catalogRevision: hex("c"), snapshot: "fixture-snapshot", items: allCards.slice(2) });
const resolvedMarketPage = marketListPageSchema.parse({ catalogRevision: hex("c"), snapshot: "fixture-resolved-snapshot", items: [resolvedZeroDepthCard] });
const details = Object.fromEntries([...allCards, resolvedZeroDepthCard].map((item, index) => [item.marketId, marketViewSchema.parse({
  marketId: item.marketId, chainId: item.chainId, asset: item.asset, horizon: item.horizon, question: item.question, strikeUsd: item.strikeUsd,
  opensAt: item.opensAt, opensAtBlock: item.opensAtBlock, tradingClosesAt: item.tradingClosesAt, resolvesAt: item.resolvesAt,
  verification: item.verification, catalogActivation: item.catalogActivation, lifecycle: item.lifecycle, tradeability: item.tradeability, tradeabilityReasons: item.tradeabilityReasons, badges: item.badges, indexerSafeBlock: item.indexerSafeBlock, asOf: item.asOf,
  comparison: ">=", oracle: { source: "Chainlink", priceUsd: item.oraclePriceUsd, observedAt: now, stale: false },
  pool: { referenceAmount: "1.000000", yesAveragePrice: item.yesAveragePrice, noAveragePrice: item.noAveragePrice, completeSetDepth: item.completeSetDepth, completeSetDepthAtoms: item.completeSetDepthAtoms, feeBps: 200, liquidityProvenance: item.liquidityProvenance, quotedAt: now, quotedAtBlock: "120", stale: false },
  runtimePolicy: { oracleMaxAgeSeconds: 120, poolQuoteMaxAgeSeconds: 30, indexerMaxLagBlocks: 5, evaluatorHeartbeatMaxAgeSeconds: 60, lowLiquidityDepthAtoms: "1000000" },
  contracts: { resolver: address("1"), conditionId: hex(index === 0 ? "d" : "e"), fpmm: address("2"), orderBook: address(index === 0 ? "3" : "4"), version: "fixture-v1" },
})]));
const archivedMarketId = hex("3");
details[archivedMarketId] = marketViewSchema.parse({
  ...details[cards[0].marketId],
  marketId: archivedMarketId,
  horizon: "24h",
  question: "Did BTC/USD settle at or above 64,000?",
  strikeUsd: "64000",
  catalogActivation: "RETIRED",
  lifecycle: "RESOLVED_YES",
  tradeability: "NOT_ACTIVE",
  tradeabilityReasons: ["NOT_ACTIVE"],
  contracts: { ...details[cards[0].marketId].contracts, resolver: address("5"), conditionId: hex("f"), orderBook: address("6") },
});

const projectedOrder = orderViewSchema.parse({
  ref: { chainId: 11_155_111, orderBook: address("3"), orderId: "1" },
  owner: address("7"), recipient: address("7"), marketId: cards[0].marketId, side: "YES", amountIn: "10.000000",
  disclosureState: "ENCRYPTED", publicationMaterialState: "NOT_REQUESTED",
  createdAt: "2030-01-01T00:11:00.000Z", expiresAt: "2030-01-01T00:41:00.000Z", tradingClosesAt: cards[0].tradingClosesAt,
  status: "RESTING_PRIVATELY", evaluationCount: 1, maximumEvaluations: 4, remainingEvaluations: 3,
  lastEvaluationAt: "2030-01-01T00:12:00.000Z", nextEvaluationEligibleAt: "2030-01-01T00:13:00.000Z", transactionHash: hex("b"),
});
const refundableOrder = orderViewSchema.parse({
  ...projectedOrder,
  ref: { ...projectedOrder.ref, orderId: "2" },
  disclosureState: "ENCRYPTED",
  publicationMaterialState: "NOT_REQUESTED",
  status: "CANCELLED",
  evaluationCount: 0,
  remainingEvaluations: 4,
  lastEvaluationAt: undefined,
  nextEvaluationEligibleAt: undefined,
  transactionHash: hex("6"),
});

const positions = [
  positionViewSchema.parse({
    positionId: hex("4"), marketId: cards[0].marketId, owner: address("7"), side: "YES",
    shares: "20.000000", collateralSpent: "10.000000", realizedAveragePrice: "0.500000",
    indicativeValue: "10.400000", maximumRedemption: "20.000000", state: "AWAITING_RESOLUTION", fillTransactionHash: hex("d"),
  }),
  positionViewSchema.parse({
    positionId: hex("5"), marketId: cards[0].marketId, owner: address("7"), side: "YES",
    shares: "18.000000", collateralSpent: "10.000000", realizedAveragePrice: "0.555556",
    maximumRedemption: "18.000000", state: "REDEEMABLE", fillTransactionHash: hex("e"),
  }),
];

const marketActivity = [
  activityViewSchema.parse({
    activityId: `${hex("d")}:0`, kind: "ORDER_FILLED", marketId: cards[0].marketId,
    actor: address("7"), orderRef: projectedOrder.ref, amount: "20.000000", side: "YES",
    occurredAt: "2030-01-01T00:12:00.000Z", blockNumber: "121", transactionHash: hex("d"), logIndex: 0,
  }),
  activityViewSchema.parse({
    activityId: `${hex("f")}:0`, kind: "MARKET_RESOLVED", marketId: cards[0].marketId, side: "YES",
    occurredAt: "2030-01-01T01:06:00.000Z", blockNumber: "130", transactionHash: hex("f"), logIndex: 0,
  }),
];

const health = healthViewSchema.parse({ status: "READY", chainId: 11_155_111, catalogRevision: hex("c"), headBlock: "122", safeBlock: "120", indexerLagBlocks: "2", evaluator: { status: "READY", lastSuccessfulAt: now }, funding: { status: "READY", lastSuccessfulAt: now }, asOf: now });

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,HEAD,POST,OPTIONS" });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  if (request.method === "OPTIONS") return json(response, 204, {});
  const url = new URL(request.url, "http://127.0.0.1:4174");
  if (url.pathname === "/rpc" && request.method === "POST") {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      const payload = JSON.parse(body);
      const responseValue = payload.method === "eth_chainId" ? "0xaa36a7" : payload.method === "eth_blockNumber" ? "0x78" : null;
      json(response, 200, { jsonrpc: "2.0", id: payload.id, result: responseValue });
    });
    return;
  }
  if (url.pathname === "/v1/health") return json(response, 200, health);
  if (url.pathname === "/v1/markets") {
    if (url.searchParams.get("lifecycle") === "RESOLVED") return json(response, 200, resolvedMarketPage);
    if (url.searchParams.get("cursor") === "fixture-page-2" && url.searchParams.get("snapshot") === "fixture-snapshot") return json(response, 200, nextMarketPage);
    return json(response, 200, marketPage);
  }
  if (url.pathname === `/v1/orders/${projectedOrder.ref.chainId}/${projectedOrder.ref.orderBook}/${projectedOrder.ref.orderId}`) return json(response, 200, projectedOrder);
  if (url.pathname === `/v1/orders/${refundableOrder.ref.chainId}/${refundableOrder.ref.orderBook}/${refundableOrder.ref.orderId}`) return json(response, 200, refundableOrder);
  if (url.pathname === "/v1/positions") return json(response, 200, positions);
  if (url.pathname === "/v1/activity") {
    const owner = url.searchParams.get("owner")?.toLowerCase();
    const marketId = url.searchParams.get("marketId");
    return json(response, 200, marketActivity.filter((activity) =>
      (!owner || activity.actor?.toLowerCase() === owner) && (!marketId || activity.marketId === marketId),
    ));
  }
  const history = url.pathname.match(/^\/v1\/markets\/(0x[0-9a-f]+)\/history$/);
  if (history && details[history[1]]) {
    const mode = url.searchParams.get("mode") === "OUTCOME_PRICES" ? "OUTCOME_PRICES" : "UNDERLYING";
    const range = ["1h", "4h", "24h", "ALL"].includes(url.searchParams.get("range")) ? url.searchParams.get("range") : "ALL";
    if (mode === "OUTCOME_PRICES") {
      const older = url.searchParams.get("cursor") === "fixture-outcome-older";
      return json(response, 200, marketHistoryViewSchema.parse({
        marketId: history[1], mode, source: "FPMM_RECONSTRUCTED", range, sampling: "TERMINAL_240_MAX",
        asOf: now, fromBlock: older ? "100" : "110", toSafeBlock: "120", stale: false, limitedHistory: !older,
        points: older
          ? [{ observedAt: "2030-01-01T00:00:00.000Z", primaryValue: "0.450000", secondaryValue: "0.580000", sourceRef: "fixture-fill-1" }, { observedAt: "2030-01-01T00:03:00.000Z", primaryValue: "0.460000", secondaryValue: "0.570000", sourceRef: "fixture-fill-2" }]
          : [{ observedAt: "2030-01-01T00:05:00.000Z", primaryValue: "0.470000", secondaryValue: "0.540000", sourceRef: "fixture-fill-3" }, { observedAt: now, primaryValue: "0.480000", secondaryValue: "0.530000", sourceRef: "fixture-fill-4" }],
        ...(!older ? { nextCursor: "fixture-outcome-older" } : {}),
      }));
    }
    return json(response, 200, marketHistoryViewSchema.parse({ marketId: history[1], mode, source: "Chainlink", range, sampling: "TERMINAL_240_MAX", asOf: now, fromBlock: "100", toSafeBlock: "120", stale: false, limitedHistory: false, points: [{ observedAt: "2030-01-01T00:00:00.000Z", primaryValue: "64700", sourceRef: "fixture-round-1" }, { observedAt: now, primaryValue: "64800", sourceRef: "fixture-round-2" }] }));
  }
  const quote = url.pathname.match(/^\/v1\/markets\/(0x[0-9a-f]+)\/quote$/);
  if (quote && details[quote[1]]) { const side = url.searchParams.get("side"); const amount = url.searchParams.get("amount") ?? "1"; return json(response, 200, quoteViewSchema.parse({ marketId: quote[1], side, amountIn: amount, sharesOut: side === "YES" ? "2.000000" : "1.800000", averagePrice: side === "YES" ? "0.500000" : "0.555556", priceImpactBps: 25, quotedAt: now, quotedAtBlock: "120", stale: false })); }
  const detail = url.pathname.match(/^\/v1\/markets\/(0x[0-9a-f]+)$/);
  if (detail && details[detail[1]]) return json(response, 200, details[detail[1]]);
  return json(response, 404, { error: "NOT_FOUND" });
});

server.listen(4174, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close(() => process.exit(0)));
