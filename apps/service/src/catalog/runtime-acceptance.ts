import type { CatalogManifest } from "@noxlimit/catalog";
import type { MarketStreamCardView } from "@noxlimit/protocol";

import type { CatalogRuntime } from "./reload-controller.js";

const PAGE_SIZE = 50;
const MAX_CATALOG_CARDS = 10_000;
const LIVE_BLOCKING_REASONS = new Set([
  "INDEXER_UNSAFE",
  "ORACLE_STALE",
  "NO_LIQUIDITY",
  "EVALUATOR_UNAVAILABLE",
]);

export type EvaluatorCatalogRuntime = CatalogRuntime & Readonly<{
  evaluatorReady: boolean;
}>;

/**
 * Reject a fully staged catalog before it can become the public runtime when an ACTIVE market is
 * neither a seeded future market nor an actually usable open market. Future ACTIVE markets remain
 * truthfully non-tradeable until their immutable start time; only ORDERING_OPEN markets require a
 * ready evaluator and completely clear dynamic tradeability gates. Closed/retired history and
 * not-yet-active successor records remain adoptable independently of trading.
 */
export async function assertStagedCatalogRuntimeAcceptable(
  runtime: EvaluatorCatalogRuntime,
): Promise<void> {
  const manifest = runtime.manifest;
  if (isInitialEmptyBootstrap(manifest)) return;

  const cards = await readAllMarketCards(runtime);
  const cardsById = new Map(cards.map((card) => [card.marketId.toLowerCase(), card]));
  const issues: string[] = [];

  const activeCards: MarketStreamCardView[] = [];
  const openActiveCards: MarketStreamCardView[] = [];
  for (const route of manifest.routing) {
    if (route.activation !== "ACTIVE") continue;
    const card = cardsById.get(route.marketId.toLowerCase());
    if (!card) {
      issues.push(`${route.marketId}: active market is missing from the staged read model`);
      continue;
    }
    activeCards.push(card);
    if (card.catalogActivation !== "ACTIVE") {
      issues.push(`${route.marketId}: staged activation does not match the ACTIVE catalog route`);
    }
    if (card.lifecycle === "ORDERING_OPEN") {
      openActiveCards.push(card);
    } else if (card.lifecycle !== "UPCOMING") {
      issues.push(
        `${route.marketId}: ACTIVE market lifecycle ${card.lifecycle} is already closed or resolved`,
      );
    }
  }

  if (openActiveCards.length > 0 && !runtime.evaluatorReady) {
    issues.push("staged evaluator is unavailable for open active markets");
  }

  for (const card of activeCards) {
    if (card.verification !== "VERIFIED") {
      issues.push(`${card.marketId}: ACTIVE market is not VERIFIED`);
    }
    if (BigInt(card.completeSetDepthAtoms) <= 0n) {
      issues.push(`${card.marketId}: complete-set depth must be positive`);
    }
    if (!isPositiveDecimal(card.yesAveragePrice) || !isPositiveDecimal(card.noAveragePrice)) {
      issues.push(`${card.marketId}: YES and NO pool quotes must both be nonzero`);
    }

    if (card.lifecycle === "UPCOMING") {
      if (
        card.tradeability !== "ORDERING_CLOSED" ||
        card.tradeabilityReasons[0] !== "ORDERING_CLOSED"
      ) {
        issues.push(
          `${card.marketId}: UPCOMING ACTIVE market must remain non-tradeable as ORDERING_CLOSED`,
        );
      }
      if (card.tradeabilityReasons.includes("NO_LIQUIDITY")) {
        issues.push(`${card.marketId}: UPCOMING ACTIVE market reports no liquidity`);
      }
      continue;
    }
    if (card.lifecycle !== "ORDERING_OPEN") continue;

    const blockingReasons = card.tradeabilityReasons.filter((reason) =>
      LIVE_BLOCKING_REASONS.has(reason)
    );
    if (blockingReasons.length > 0) {
      issues.push(`${card.marketId}: ${blockingReasons.join(", ")}`);
    }
    if (card.tradeability !== "TRADEABLE" || card.tradeabilityReasons.length > 0) {
      issues.push(`${card.marketId}: ACTIVE market is not tradeable`);
    }
  }

  if (issues.length > 0) throw new CatalogRuntimeAcceptanceError(issues);
}

export class CatalogRuntimeAcceptanceError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Staged catalog runtime rejected:\n- ${issues.join("\n- ")}`);
    this.name = "CatalogRuntimeAcceptanceError";
  }
}

async function readAllMarketCards(
  runtime: CatalogRuntime,
): Promise<readonly MarketStreamCardView[]> {
  const cards: MarketStreamCardView[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  let snapshot: string | undefined;

  do {
    const page = await runtime.readModel.listMarkets({
      sort: "CLOSING_SOON",
      limit: PAGE_SIZE,
      ...(cursor && snapshot ? { cursor, snapshot } : {}),
    });
    if (page.catalogRevision.toLowerCase() !== runtime.manifest.catalogRevision.toLowerCase()) {
      throw new CatalogRuntimeAcceptanceError([
        "staged read model revision does not match the staged manifest",
      ]);
    }
    snapshot = page.snapshot;
    cards.push(...page.items);
    if (cards.length > MAX_CATALOG_CARDS) {
      throw new CatalogRuntimeAcceptanceError([
        `staged catalog exceeds the ${MAX_CATALOG_CARDS}-card acceptance bound`,
      ]);
    }
    cursor = page.nextCursor;
    if (cursor && seenCursors.has(cursor)) {
      throw new CatalogRuntimeAcceptanceError(["staged market pagination repeated a cursor"]);
    }
    if (cursor) seenCursors.add(cursor);
  } while (cursor);

  return cards;
}

function isInitialEmptyBootstrap(manifest: CatalogManifest): boolean {
  return manifest.revision === "0" && manifest.markets.length === 0 && manifest.routing.length === 0;
}

function isPositiveDecimal(value: string): boolean {
  if (!/^\d+(?:\.\d+)?$/u.test(value)) return false;
  return BigInt(value.replace(".", "")) > 0n;
}
