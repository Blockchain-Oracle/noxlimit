import {
  activityViewSchema,
  fundingChallengeResponseSchema,
  fundingClaimResponseSchema,
  healthViewSchema,
  marketHistoryViewSchema,
  marketListQuerySchema,
  marketListPageSchema,
  marketViewSchema,
  orderViewSchema,
  positionViewSchema,
  quoteViewSchema,
  type ActivityView,
  type FundingChallengeRequest,
  type FundingChallengeResponse,
  type FundingClaimRequest,
  type FundingClaimResponse,
  type HealthView,
  type MarketHistoryView,
  type MarketListQuery,
  type MarketListPage,
  type MarketSide,
  type MarketView,
  type OrderRef,
  type OrderView,
  type PositionView,
  type QuoteView,
} from "@noxlimit/protocol";
import type { DataResult } from "./result";
import { isLiveCatalogMarket } from "@/features/markets/catalog-integrity";

export const apiOrigin = process.env.NEXT_PUBLIC_NOXLIMIT_API_ORIGIN?.trim().replace(/\/$/, "") ?? "";
export const publicApiConfigured = apiOrigin.length > 0;

type Schema<T> = {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
};

async function request<T>(path: string, schema: Schema<T>, init?: RequestInit): Promise<DataResult<T>> {
  if (!publicApiConfigured) {
    return { state: "unavailable", message: "NEXT_PUBLIC_NOXLIMIT_API_ORIGIN is not configured. Live reads and service writes remain disabled." };
  }
  try {
    const headers = new Headers(init?.headers);
    headers.set("accept", "application/json");
    if (init?.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
    const response = await fetch(`${apiOrigin}${path}`, {
      ...init,
      cache: "no-store",
      headers,
    });
    if (response.status === 404) return { state: "empty", message: "The requested verified product record is not available." };
    if (!response.ok) return { state: "unavailable", message: `NoxLimit service returned ${response.status}. Trust-critical actions remain disabled.` };
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) return { state: "unavailable", message: "NoxLimit service returned data outside the canonical protocol schema. Trust-critical actions remain disabled." };
    return { state: "ready", data: parsed.data, asOf: new Date().toISOString() };
  } catch {
    return { state: "offline", message: "The NoxLimit service could not be reached. Cached values are not used for trust-critical actions." };
  }
}

function arraySchema<T>(item: Schema<T>): Schema<readonly T[]> {
  return {
    safeParse(value: unknown) {
      if (!Array.isArray(value)) return { success: false };
      const parsed = value.map((entry) => item.safeParse(entry));
      if (parsed.some((entry) => !entry.success)) return { success: false };
      return { success: true, data: parsed.map((entry) => (entry as { success: true; data: T }).data) };
    },
  };
}

export async function getMarketStream(input: Partial<MarketListQuery> = {}): Promise<DataResult<MarketListPage>> {
  const queryInput = marketListQuerySchema.parse(input);
  const query = new URLSearchParams({ sort: queryInput.sort, limit: String(queryInput.limit) });
  if (queryInput.asset) query.set("asset", queryInput.asset);
  if (queryInput.horizon) query.set("horizon", queryInput.horizon);
  if (queryInput.lifecycle) query.set("lifecycle", queryInput.lifecycle);
  if (queryInput.cursor) query.set("cursor", queryInput.cursor);
  if (queryInput.snapshot) query.set("snapshot", queryInput.snapshot);
  const result = await request(`/v1/markets?${query}`, marketListPageSchema);
  if (result.state === "ready") {
    const items = result.data.items.filter((market) => queryInput.lifecycle && queryInput.lifecycle !== "LIVE"
      ? market.verification === "VERIFIED"
      : isLiveCatalogMarket(market));
    if (items.length === 0) return {
      state: "empty",
      message: queryInput.lifecycle === "LIVE"
        ? "No verified, active, seeded markets are available."
        : `No verified ${queryInput.lifecycle?.toLowerCase() ?? "historical"} markets are available.`,
    };
    return { ...result, data: { ...result.data, items } };
  }
  return result;
}

export function getMarketHistory(input: {
  marketId: string;
  mode: MarketHistoryView["mode"];
  range: MarketHistoryView["range"];
  cursor?: string;
}): Promise<DataResult<MarketHistoryView>> {
  const query = new URLSearchParams({
    mode: input.mode,
    range: input.range,
    sampling: "TERMINAL_240_MAX",
    limit: "240",
  });
  if (input.cursor) query.set("cursor", input.cursor);
  return request(`/v1/markets/${encodeURIComponent(input.marketId)}/history?${query}`, marketHistoryViewSchema);
}

export function getMarketDetail(marketId: string): Promise<DataResult<MarketView>> {
  return request(`/v1/markets/${encodeURIComponent(marketId)}`, marketViewSchema);
}

export function getQuote(input: { marketId: string; side: MarketSide; amount: string }): Promise<DataResult<QuoteView>> {
  const query = new URLSearchParams({ side: input.side, amount: input.amount });
  return request(`/v1/markets/${encodeURIComponent(input.marketId)}/quote?${query}`, quoteViewSchema);
}

export function getHealth(): Promise<DataResult<HealthView>> {
  return request("/v1/health", healthViewSchema);
}

export function getOrder(ref: OrderRef): Promise<DataResult<OrderView>> {
  return request(`/v1/orders/${ref.chainId}/${encodeURIComponent(ref.orderBook)}/${encodeURIComponent(ref.orderId)}`, orderViewSchema);
}

export function getOrders(owner: string): Promise<DataResult<readonly OrderView[]>> {
  return request(`/v1/orders?${new URLSearchParams({ owner })}`, arraySchema(orderViewSchema));
}

export function getPositions(owner: string): Promise<DataResult<readonly PositionView[]>> {
  return request(`/v1/positions?${new URLSearchParams({ owner })}`, arraySchema(positionViewSchema));
}

export function getActivity(input: { owner?: string; marketId?: string }): Promise<DataResult<readonly ActivityView[]>> {
  return request(`/v1/activity?${new URLSearchParams(Object.entries(input).filter((entry): entry is [string, string] => Boolean(entry[1])))}`, arraySchema(activityViewSchema));
}

export function requestFundingChallenge(input: FundingChallengeRequest): Promise<DataResult<FundingChallengeResponse>> {
  return request("/v1/funding/challenge", fundingChallengeResponseSchema, { method: "POST", body: JSON.stringify(input) });
}

export function claimFunding(input: FundingClaimRequest): Promise<DataResult<FundingClaimResponse>> {
  return request("/v1/funding/claim", fundingClaimResponseSchema, { method: "POST", body: JSON.stringify(input) });
}
