import {
  catalogManifestSchema,
  createSepoliaBootstrapManifest,
  hashCatalogManifest,
  type CatalogManifest,
  type CatalogManifestPayload,
  type ImmutableMarketRecord,
} from "@noxlimit/catalog";
import {
  healthViewSchema,
  marketStreamCardViewSchema,
  type MarketStreamCardView,
} from "@noxlimit/protocol";
import { describe, expect, it } from "vitest";

import { CatalogReloadController } from "../src/catalog/reload-controller.js";
import {
  assertStagedCatalogRuntimeAcceptable,
  type EvaluatorCatalogRuntime,
} from "../src/catalog/runtime-acceptance.js";
import { ProjectionStore } from "../src/projections/store.js";
import { makeMarketRecord } from "./fixtures.js";

describe("staged catalog runtime acceptance", () => {
  it("allows the exact initial empty bootstrap without evaluator credentials", async () => {
    await expect(
      assertStagedCatalogRuntimeAcceptable(runtime(createSepoliaBootstrapManifest(), false)),
    ).resolves.toBeUndefined();
  });

  it("accepts open active markets only when the staged product is fully tradeable", async () => {
    const initial = createSepoliaBootstrapManifest();
    const candidate = nextRevision(initial);
    const card = marketCard(candidate.markets[0]!);
    const staged = runtime(candidate, true, [card]);

    await expect(assertStagedCatalogRuntimeAcceptable(staged)).resolves.toBeUndefined();
  });

  it("accepts a verified seeded future ACTIVE market without pretending it is tradeable", async () => {
    const initial = createSepoliaBootstrapManifest();
    const candidate = nextRevision(initial);
    const upcomingCard = marketCard(candidate.markets[0]!, {
      lifecycle: "UPCOMING",
      tradeability: "ORDERING_CLOSED",
      tradeabilityReasons: ["ORDERING_CLOSED", "EVALUATOR_UNAVAILABLE"],
    });

    await expect(
      assertStagedCatalogRuntimeAcceptable(runtime(candidate, false, [upcomingCard])),
    ).resolves.toBeUndefined();
  });

  it("keeps the evaluator gate strict for an ORDERING_OPEN ACTIVE market", async () => {
    const initial = createSepoliaBootstrapManifest();
    const candidate = nextRevision(initial);
    const openCard = marketCard(candidate.markets[0]!, {
      tradeability: "EVALUATOR_UNAVAILABLE",
      tradeabilityReasons: ["EVALUATOR_UNAVAILABLE"],
    });

    await expect(
      assertStagedCatalogRuntimeAcceptable(runtime(candidate, false, [openCard])),
    ).rejects.toThrow("staged evaluator is unavailable for open active markets");
  });

  it("rejects an UPCOMING ACTIVE market that claims to be tradeable", async () => {
    const initial = createSepoliaBootstrapManifest();
    const candidate = nextRevision(initial);
    const upcomingCard = marketCard(candidate.markets[0]!, {
      lifecycle: "UPCOMING",
    });

    await expect(
      assertStagedCatalogRuntimeAcceptable(runtime(candidate, true, [upcomingCard])),
    ).rejects.toThrow("UPCOMING ACTIVE market must remain non-tradeable as ORDERING_CLOSED");
  });

  it("rejects an UPCOMING ACTIVE market without positive pool liquidity", async () => {
    const initial = createSepoliaBootstrapManifest();
    const candidate = nextRevision(initial);
    const upcomingCard = marketCard(candidate.markets[0]!, {
      lifecycle: "UPCOMING",
      tradeability: "ORDERING_CLOSED",
      tradeabilityReasons: ["ORDERING_CLOSED", "NO_LIQUIDITY"],
      yesAveragePrice: "0",
      noAveragePrice: "0",
      completeSetDepth: "0",
      completeSetDepthAtoms: "0",
    });

    await expect(
      assertStagedCatalogRuntimeAcceptable(runtime(candidate, false, [upcomingCard])),
    ).rejects.toThrow("complete-set depth must be positive");
  });

  it("rejects an unsafe open candidate and leaves the previous runtime active", async () => {
    const initial = createSepoliaBootstrapManifest();
    const candidate = nextRevision(initial);
    const original = runtime(initial, false);
    const unsafeCard = marketCard(candidate.markets[0]!, {
      tradeability: "INDEXER_UNSAFE",
      tradeabilityReasons: [
        "INDEXER_UNSAFE",
        "ORACLE_STALE",
        "NO_LIQUIDITY",
        "EVALUATOR_UNAVAILABLE",
      ],
      yesAveragePrice: "0",
      noAveragePrice: "0",
      completeSetDepth: "0",
      completeSetDepthAtoms: "0",
      oracleStale: true,
      poolStale: true,
    });
    const controller = new CatalogReloadController(original, {
      load: async () => candidate,
      verify: async () => undefined,
      build: async () => runtime(candidate, false, [unsafeCard]),
      acceptStaged: assertStagedCatalogRuntimeAcceptable,
    });

    await expect(controller.reload("/operator/catalog-revision-1.json")).rejects.toThrow(
      "Staged catalog runtime rejected",
    );
    expect(controller.active).toBe(original);
    expect((await controller.readModel.health()).catalogRevision).toBe(initial.catalogRevision);
  });

  it("accepts closed/retired archives and pre-activation successor history without an evaluator", async () => {
    const initial = createSepoliaBootstrapManifest();
    const closedManifest = nextRevision(initial, "RETIRED");
    const closedCard = marketCard(closedManifest.markets[0]!, {
      catalogActivation: "RETIRED",
      lifecycle: "ORDERING_CLOSED",
      tradeability: "NOT_ACTIVE",
      tradeabilityReasons: ["NOT_ACTIVE", "ORDERING_CLOSED", "EVALUATOR_UNAVAILABLE"],
    });
    await expect(
      assertStagedCatalogRuntimeAcceptable(runtime(closedManifest, false, [closedCard])),
    ).resolves.toBeUndefined();

    const successorManifest = nextRevision(initial, "SUCCESSOR");
    await expect(
      assertStagedCatalogRuntimeAcceptable(runtime(successorManifest, false)),
    ).resolves.toBeUndefined();
  });

  it("rejects a staged read model that omits an active market", async () => {
    const initial = createSepoliaBootstrapManifest();
    const candidate = nextRevision(initial);
    await expect(
      assertStagedCatalogRuntimeAcceptable(runtime(candidate, true)),
    ).rejects.toThrow("active market is missing from the staged read model");
  });

  it.each([
    "ORDERING_CLOSED",
    "AWAITING_RESOLUTION",
    "RESOLVED_YES",
    "RESOLVED_NO",
  ] as const)(
    "rejects an ACTIVE route whose staged lifecycle is %s",
    async (lifecycle) => {
      const initial = createSepoliaBootstrapManifest();
      const candidate = nextRevision(initial);
      const card = marketCard(candidate.markets[0]!, {
        lifecycle,
        tradeability: "ORDERING_CLOSED",
        tradeabilityReasons: ["ORDERING_CLOSED"],
      });

      await expect(
        assertStagedCatalogRuntimeAcceptable(runtime(candidate, true, [card])),
      ).rejects.toThrow(`ACTIVE market lifecycle ${lifecycle} is already closed or resolved`);
    },
  );
});

function runtime(
  manifest: CatalogManifest,
  evaluatorReady: boolean,
  cards: readonly MarketStreamCardView[] = [],
): EvaluatorCatalogRuntime {
  const store = new ProjectionStore(
    manifest.catalogRevision,
    healthViewSchema.parse({
      status: evaluatorReady ? "READY" : "DEGRADED",
      chainId: 11_155_111,
      catalogRevision: manifest.catalogRevision,
      headBlock: "100",
      safeBlock: "94",
      indexerLagBlocks: "6",
      evaluator: evaluatorReady ? { status: "READY" } : { status: "UNAVAILABLE" },
      funding: { status: "UNAVAILABLE" },
      asOf: "2030-01-01T00:10:00.000Z",
    }),
    () => new Date("2030-01-01T00:10:00.000Z"),
  );
  store.replaceCatalog(manifest.catalogRevision, cards);
  return { manifest, readModel: store, evaluatorReady };
}

function nextRevision(
  previous: CatalogManifest,
  activation: "ACTIVE" | "SUCCESSOR" | "RETIRED" = "ACTIVE",
): CatalogManifest {
  const record = makeMarketRecord();
  const payload: CatalogManifestPayload = {
    schemaVersion: 1,
    chainId: 11_155_111,
    revision: (BigInt(previous.revision) + 1n).toString(),
    previousRevisionHash: previous.catalogRevision,
    effectiveAt: "2029-12-31T00:00:00.000Z",
    effectiveBlock: "1000",
    markets: [record],
    routing: [{
      marketId: record.marketId,
      activation,
      ...(activation === "ACTIVE"
        ? {
            opensAt: new Date(Number(record.times.startsAt) * 1_000).toISOString(),
            opensAtBlock: "1000",
          }
        : {}),
    }],
  };
  return catalogManifestSchema.parse({
    ...payload,
    catalogRevision: hashCatalogManifest(payload),
  });
}

function marketCard(
  record: ImmutableMarketRecord,
  overrides: Partial<MarketStreamCardView> = {},
): MarketStreamCardView {
  const opensAt = new Date(Number(record.times.startsAt) * 1_000).toISOString();
  const tradingClosesAt = new Date(Number(record.times.tradingClosesAt) * 1_000).toISOString();
  const resolvesAt = new Date(Number(record.times.resolvesAt) * 1_000).toISOString();
  return marketStreamCardViewSchema.parse({
    marketId: record.marketId,
    chainId: 11_155_111,
    asset: record.identity.asset,
    horizon: record.identity.horizon,
    question: record.question,
    strikeUsd: "65000",
    opensAt,
    opensAtBlock: "1000",
    tradingClosesAt,
    resolvesAt,
    verification: "VERIFIED",
    catalogActivation: "ACTIVE",
    lifecycle: "ORDERING_OPEN",
    tradeability: "TRADEABLE",
    tradeabilityReasons: [],
    badges: [],
    indexerSafeBlock: "1000",
    asOf: "2030-01-01T00:10:00.000Z",
    oraclePriceUsd: "66000",
    oracleObservedAt: "2030-01-01T00:09:30.000Z",
    yesAveragePrice: "0.6",
    noAveragePrice: "0.4",
    referenceAmount: "1.000000",
    completeSetDepth: "50",
    completeSetDepthAtoms: "50000000",
    liquidityProvenance: {
      kind: "BUILDER_SEEDED",
      seedTransactionHash: record.pool.seedTransactionHash,
    },
    oracleStale: false,
    poolQuotedAt: "2030-01-01T00:10:00.000Z",
    poolQuotedAtBlock: "1000",
    poolStale: false,
    preview: {
      mode: "UNDERLYING",
      source: "Chainlink",
      feedRef: record.oracle.source === "CHAINLINK" ? record.oracle.proxy : record.oracle.priceId,
      asOf: "2030-01-01T00:10:00.000Z",
      stale: false,
      points: [{ observedAt: "2030-01-01T00:09:30.000Z", priceUsd: "66000" }],
      limitedHistory: false,
    },
    positionInFilteredStream: 1,
    filteredStreamCount: 1,
    ...overrides,
  });
}
