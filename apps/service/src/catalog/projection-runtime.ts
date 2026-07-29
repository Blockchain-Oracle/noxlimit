import type { CatalogManifest } from "@noxlimit/catalog";
import type { HealthView } from "@noxlimit/protocol";
import type { PublicClient } from "viem";

import { LiveMarketReader } from "../chain/market-reader.js";
import {
  ReplayEngine,
  type ReplayLogSource,
  type ReplaySnapshot,
} from "../chain/replay-engine.js";
import { replayTargetsForManifest } from "../chain/replay-targets.js";
import { ViemReplayLogSource } from "../chain/viem-log-source.js";
import { CompositeReplayProjector } from "../projections/composite-projector.js";
import { FpmmHistoryProjector } from "../projections/fpmm-history-projector.js";
import { LiveReadModel } from "../projections/live-read-model.js";
import {
  OrderBookProjector,
  type PublishedValueResolver,
} from "../projections/orderbook-projector.js";
import { ProjectionStore } from "../projections/store.js";

export type CatalogProjectionRuntime = {
  manifest: CatalogManifest;
  store: ProjectionStore;
  fpmmHistory: FpmmHistoryProjector;
  marketReader: LiveMarketReader;
  replay: ReplayEngine;
  readModel: LiveReadModel;
  snapshot: ReplaySnapshot;
};

/**
 * Build a complete no-database projection in isolation.
 *
 * `ReplayEngine.rebuild` scans every catalogued OrderBook plus its market contracts and calls the
 * OrderBook projector's authoritative completion rereads before any caller can publish this
 * runtime. Market hydration is also complete before return.
 */
export async function buildCatalogProjectionRuntime(input: {
  client: PublicClient;
  manifest: CatalogManifest;
  initialHealth: HealthView;
  evaluatorAvailable: () => boolean;
  publishedValueResolver?: PublishedValueResolver;
  logSource?: ReplayLogSource;
}): Promise<CatalogProjectionRuntime> {
  const store = new ProjectionStore(input.manifest.catalogRevision, input.initialHealth);
  const fpmmHistory = new FpmmHistoryProjector(input.client, input.manifest);
  const marketReader = new LiveMarketReader(
    input.client,
    input.manifest,
    input.evaluatorAvailable,
    fpmmHistory,
  );
  const orderBookProjector = new OrderBookProjector({
    client: input.client,
    store,
    manifest: input.manifest,
    ...(input.publishedValueResolver
      ? { publishedValueResolver: input.publishedValueResolver }
      : {}),
  });
  const replay = new ReplayEngine(
    input.logSource ?? new ViemReplayLogSource(input.client),
    new CompositeReplayProjector(orderBookProjector, fpmmHistory),
  );
  const recovered = await replay.rebuild(replayTargetsForManifest(input.manifest));
  store.replaceMarkets(
    input.manifest.catalogRevision,
    await marketReader.hydrateAll(recovered.snapshot),
  );
  return {
    manifest: input.manifest,
    store,
    fpmmHistory,
    marketReader,
    replay,
    readModel: new LiveReadModel(store, marketReader),
    snapshot: recovered.snapshot,
  };
}
