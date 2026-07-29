import { createHash } from "node:crypto";

import type {
  ActivityView,
  HealthView,
  MarketHistoryView,
  MarketListPage,
  MarketStreamCardView,
  MarketTradeabilityReason,
  MarketView,
  OrderRef,
  OrderView,
  PositionView,
  QuoteView,
} from "@noxlimit/protocol";

import type { MarketHistoryInput, MarketListInput, ServiceReadModel } from "../api/ports.js";

type Snapshot = Readonly<{
  id: string;
  revision: string;
  queryKey: string;
  asOf: string;
  safeBlock: string;
  orderedMarketIds: readonly string[];
}>;

const MAX_SNAPSHOTS = 128;

export class ProjectionStore implements ServiceReadModel {
  #catalogRevision: MarketListPage["catalogRevision"];
  #health: HealthView;
  readonly #cards = new Map<string, MarketStreamCardView>();
  readonly #markets = new Map<string, MarketView>();
  readonly #histories = new Map<string, MarketHistoryView>();
  readonly #quotes = new Map<string, QuoteView>();
  readonly #orders = new Map<string, OrderView>();
  readonly #positions = new Map<string, PositionView>();
  readonly #activity = new Map<string, ActivityView>();
  readonly #snapshots = new Map<string, Snapshot>();
  readonly #now: () => Date;

  constructor(
    catalogRevision: MarketListPage["catalogRevision"],
    health: HealthView,
    now: () => Date = () => new Date(),
  ) {
    this.#catalogRevision = catalogRevision;
    this.#health = health;
    this.#now = now;
  }

  setHealth(health: HealthView): void {
    this.#health = health;
  }

  replaceCatalog(revision: MarketListPage["catalogRevision"], cards: readonly MarketStreamCardView[]): void {
    const revisionChanged = revision !== this.#catalogRevision;
    this.#catalogRevision = revision;
    this.#cards.clear();
    for (const card of cards) this.#cards.set(card.marketId, card);
    if (revisionChanged) this.#snapshots.clear();
  }

  replaceMarkets(
    revision: MarketListPage["catalogRevision"],
    entries: readonly Readonly<{ market: MarketView; card: MarketStreamCardView }>[],
  ): void {
    const revisionChanged = revision !== this.#catalogRevision;
    this.#catalogRevision = revision;
    this.#markets.clear();
    this.#cards.clear();
    for (const { market, card } of entries) {
      this.#markets.set(market.marketId, market);
      this.#cards.set(card.marketId, card);
    }
    if (revisionChanged) this.#snapshots.clear();
  }

  resetChainData(): void {
    this.#histories.clear();
    this.#quotes.clear();
    this.#orders.clear();
    this.#positions.clear();
    this.#activity.clear();
  }

  upsertMarket(market: MarketView, card: MarketStreamCardView): void {
    this.#markets.set(market.marketId, market);
    this.#cards.set(card.marketId, card);
  }

  setHistory(marketId: string, history: MarketHistoryView): void {
    this.#histories.set(marketId, history);
  }

  setQuote(marketId: string, side: "YES" | "NO", amount: string, quote: QuoteView): void {
    this.#quotes.set(quoteKey(marketId, side, amount), quote);
  }

  upsertOrder(order: OrderView): void {
    this.#orders.set(orderKey(order.ref), order);
  }

  upsertPosition(position: PositionView): void {
    this.#positions.set(position.positionId, position);
  }

  replacePositions(positions: readonly PositionView[]): void {
    this.#positions.clear();
    for (const position of positions) this.#positions.set(position.positionId, position);
  }

  upsertActivity(activity: ActivityView): void {
    this.#activity.set(activity.activityId, activity);
  }

  async listMarkets(input: MarketListInput): Promise<MarketListPage> {
    if ((input.cursor === undefined) !== (input.snapshot === undefined)) {
      throw new RangeError("cursor and snapshot must be provided together");
    }
    const nowMilliseconds = this.#now().getTime();
    const queryKey = stableQueryKey(input);
    let snapshot = input.snapshot ? this.#snapshots.get(input.snapshot) : undefined;
    if (input.snapshot && !snapshot) throw new RangeError("unknown or expired snapshot");
    if (snapshot && (snapshot.revision !== this.#catalogRevision || snapshot.queryKey !== queryKey)) {
      throw new RangeError("snapshot does not match the current catalog or query");
    }
    if (!snapshot) {
      const matchingCards = [...this.#cards.values()]
        .map((card) => this.#withCurrentPoolFreshness(card, nowMilliseconds))
        .filter((card) => matchesMarket(card, input))
        .sort(comparator(input.sort));
      const ordered = matchingCards.map((card) => card.marketId);
      const asOf = latestTimestamp(matchingCards.map((card) => card.asOf));
      const safeBlock = maximumDecimal(matchingCards.map((card) => card.indexerSafeBlock));
      const id = createHash("sha256")
        .update(`${this.#catalogRevision}:${queryKey}:${asOf}:${safeBlock}:${ordered.join(",")}`)
        .digest("base64url");
      snapshot = {
        id,
        revision: this.#catalogRevision,
        queryKey,
        asOf,
        safeBlock,
        orderedMarketIds: ordered,
      };
      this.#snapshots.set(id, snapshot);
      while (this.#snapshots.size > MAX_SNAPSHOTS) {
        const oldest = this.#snapshots.keys().next().value as string | undefined;
        if (!oldest) break;
        this.#snapshots.delete(oldest);
      }
    }

    const offset = decodeCursor(input.cursor, snapshot.id);
    const selectedIds = snapshot.orderedMarketIds.slice(offset, offset + input.limit);
    const items = selectedIds.flatMap((marketId, index) => {
      const card = this.#cards.get(marketId);
      if (!card) return [];
      const current = this.#withCurrentPoolFreshness(card, nowMilliseconds);
      return [
        {
          ...current,
          positionInFilteredStream: offset + index + 1,
          filteredStreamCount: snapshot.orderedMarketIds.length,
        },
      ];
    });
    const nextOffset = offset + items.length;
    return {
      catalogRevision: this.#catalogRevision,
      snapshot: snapshot.id,
      items,
      ...(nextOffset < snapshot.orderedMarketIds.length
        ? { nextCursor: encodeCursor(snapshot.id, nextOffset) }
        : {}),
    };
  }

  async getMarket(marketId: string): Promise<MarketView | undefined> {
    const market = this.#markets.get(marketId);
    return market
      ? this.#withCurrentMarketPoolFreshness(market, this.#now().getTime())
      : undefined;
  }

  async getMarketHistory(input: MarketHistoryInput): Promise<MarketHistoryView | undefined> {
    return this.#histories.get(input.marketId);
  }

  async getQuote(
    marketId: string,
    side: "YES" | "NO",
    amount: string,
  ): Promise<QuoteView | undefined> {
    return this.#quotes.get(quoteKey(marketId, side, amount));
  }

  async getOrder(ref: OrderRef): Promise<OrderView | undefined> {
    return this.#orders.get(orderKey(ref));
  }

  async listOrders(owner: `0x${string}`): Promise<readonly OrderView[]> {
    return [...this.#orders.values()]
      .filter((order) => order.owner.toLowerCase() === owner.toLowerCase())
      .sort((left, right) => compareTime(right.createdAt, left.createdAt));
  }

  async listPositions(owner: `0x${string}`): Promise<readonly PositionView[]> {
    return [...this.#positions.values()].filter(
      (position) => position.owner.toLowerCase() === owner.toLowerCase(),
    );
  }

  async listActivity(input: {
    marketId?: string;
    owner?: `0x${string}`;
  }): Promise<readonly ActivityView[]> {
    return [...this.#activity.values()]
      .filter(
        (activity) =>
          (!input.marketId || activity.marketId === input.marketId) &&
          (!input.owner || activity.actor?.toLowerCase() === input.owner.toLowerCase()),
      )
      .sort((left, right) => compareTime(right.occurredAt, left.occurredAt));
  }

  async health(): Promise<HealthView> {
    return this.#health;
  }

  #withCurrentPoolFreshness(
    card: MarketStreamCardView,
    nowMilliseconds: number,
  ): MarketStreamCardView {
    const market = this.#markets.get(card.marketId);
    if (!market || !poolQuoteExpired(market, nowMilliseconds)) return card;
    const reasons = withIndexerUnsafe(card.tradeabilityReasons);
    return {
      ...card,
      tradeability: reasons[0] ?? "TRADEABLE",
      tradeabilityReasons: reasons,
      badges: card.badges.includes("STALE") ? card.badges : [...card.badges, "STALE"],
      poolStale: true,
    };
  }

  #withCurrentMarketPoolFreshness(
    market: MarketView,
    nowMilliseconds: number,
  ): MarketView {
    if (!poolQuoteExpired(market, nowMilliseconds)) return market;
    const reasons = withIndexerUnsafe(market.tradeabilityReasons);
    return {
      ...market,
      tradeability: reasons[0] ?? "TRADEABLE",
      tradeabilityReasons: reasons,
      badges: market.badges.includes("STALE") ? market.badges : [...market.badges, "STALE"],
      pool: { ...market.pool, stale: true },
    };
  }
}

const TRADEABILITY_PRECEDENCE: readonly MarketTradeabilityReason[] = [
  "UNVERIFIED",
  "NOT_ACTIVE",
  "ORDERING_CLOSED",
  "INDEXER_UNSAFE",
  "ORACLE_STALE",
  "NO_LIQUIDITY",
  "EVALUATOR_UNAVAILABLE",
];

function withIndexerUnsafe(
  existing: readonly MarketTradeabilityReason[],
): MarketTradeabilityReason[] {
  const values = new Set(existing);
  values.add("INDEXER_UNSAFE");
  return TRADEABILITY_PRECEDENCE.filter((reason) => values.has(reason));
}

function poolQuoteExpired(market: MarketView, nowMilliseconds: number): boolean {
  if (market.pool.stale) return true;
  const quotedAt = Date.parse(market.pool.quotedAt);
  return Number.isFinite(nowMilliseconds) &&
    Number.isFinite(quotedAt) &&
    nowMilliseconds > quotedAt + market.runtimePolicy.poolQuoteMaxAgeSeconds * 1_000;
}

function latestTimestamp(values: readonly string[]): string {
  if (values.length === 0) return "1970-01-01T00:00:00.000Z";
  return values.reduce((latest, value) => Date.parse(value) > Date.parse(latest) ? value : latest);
}

function maximumDecimal(values: readonly string[]): string {
  if (values.length === 0) return "0";
  return values.reduce((maximum, value) => BigInt(value) > BigInt(maximum) ? value : maximum);
}

function matchesMarket(card: MarketStreamCardView, input: MarketListInput): boolean {
  if (input.asset && card.asset !== input.asset) return false;
  if (input.horizon && card.horizon !== input.horizon) return false;
  switch (input.lifecycle) {
    case "LIVE":
      return (
        card.verification === "VERIFIED" &&
        card.catalogActivation === "ACTIVE" &&
        card.lifecycle === "ORDERING_OPEN" &&
        !card.tradeabilityReasons.includes("NO_LIQUIDITY")
      );
    case "RESOLVING":
      return card.lifecycle === "ORDERING_CLOSED" || card.lifecycle === "AWAITING_RESOLUTION";
    case "RESOLVED":
      return card.lifecycle === "RESOLVED_YES" || card.lifecycle === "RESOLVED_NO";
    default:
      return true;
  }
}

function comparator(
  sort: MarketListInput["sort"],
): (left: MarketStreamCardView, right: MarketStreamCardView) => number {
  return (left, right) => {
    let difference = 0;
    if (sort === "CLOSING_SOON") {
      difference = compareTime(left.tradingClosesAt, right.tradingClosesAt);
    } else if (sort === "RECENTLY_OPENED") {
      difference = compareTime(right.opensAt, left.opensAt);
    } else {
      const leftDepth = BigInt(left.completeSetDepthAtoms);
      const rightDepth = BigInt(right.completeSetDepthAtoms);
      difference = leftDepth === rightDepth ? 0 : leftDepth > rightDepth ? -1 : 1;
    }
    return difference || left.marketId.localeCompare(right.marketId);
  };
}

function compareTime(left: string, right: string): number {
  return Date.parse(left) - Date.parse(right);
}

function stableQueryKey(input: MarketListInput): string {
  return JSON.stringify({
    asset: input.asset ?? null,
    horizon: input.horizon ?? null,
    lifecycle: input.lifecycle ?? null,
    sort: input.sort,
  });
}

function encodeCursor(snapshot: string, offset: number): string {
  return Buffer.from(JSON.stringify({ snapshot, offset }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined, snapshot: string): number {
  if (!cursor) return 0;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new RangeError("invalid cursor");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as { snapshot?: unknown }).snapshot !== snapshot ||
    !Number.isSafeInteger((parsed as { offset?: unknown }).offset) ||
    Number((parsed as { offset: number }).offset) < 0
  ) {
    throw new RangeError("invalid cursor");
  }
  return Number((parsed as { offset: number }).offset);
}

function orderKey(ref: OrderRef): string {
  return `${ref.chainId}:${ref.orderBook.toLowerCase()}:${ref.orderId}`;
}

function quoteKey(marketId: string, side: "YES" | "NO", amount: string): string {
  return `${marketId}:${side}:${amount}`;
}
