import {
  canonicalJson,
  type CatalogManifest,
  type CatalogRoute,
  type ImmutableMarketRecord,
  validateCatalogManifest,
} from "@noxlimit/catalog";
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

import type { MarketHistoryInput, MarketListInput, ServiceReadModel } from "../api/ports.js";

export type CatalogRuntime = Readonly<{
  manifest: CatalogManifest;
  readModel: ServiceReadModel;
}>;

export type CatalogReloadResult = Readonly<{
  changed: boolean;
  previousRevision: CatalogManifest["catalogRevision"];
  catalogRevision: CatalogManifest["catalogRevision"];
}>;

export type CatalogReloadDependencies<Runtime extends CatalogRuntime> = Readonly<{
  load(path: string): Promise<CatalogManifest>;
  verify(manifest: CatalogManifest): Promise<void>;
  build(manifest: CatalogManifest): Promise<Runtime>;
  acceptStaged?(staged: Runtime, previous: Runtime): Promise<void> | void;
}>;

/**
 * Operator-controlled, all-or-nothing catalog adoption.
 *
 * The candidate runtime is validated, chain-verified, and fully built off to the side. Public
 * readers continue using the old runtime until one synchronous pointer assignment publishes the
 * candidate. Reload and background reconciliation share one queue so an old poll cannot mutate a
 * newly adopted runtime.
 */
export class CatalogReloadController<Runtime extends CatalogRuntime> {
  #active: Runtime;
  #operationTail: Promise<void> = Promise.resolve();
  readonly readModel: ServiceReadModel;

  constructor(
    initial: Runtime,
    readonly dependencies: CatalogReloadDependencies<Runtime>,
  ) {
    this.#active = initial;
    this.readModel = new SwitchingReadModel(() => this.#active.readModel);
  }

  get active(): Runtime {
    return this.#active;
  }

  reload(path: string): Promise<CatalogReloadResult> {
    return this.#exclusive(async () => {
      const previous = this.#active;
      const loaded = await this.dependencies.load(path);
      const candidate = validateCatalogManifest(loaded);
      if (candidate.catalogRevision.toLowerCase() === previous.manifest.catalogRevision.toLowerCase()) {
        return {
          changed: false,
          previousRevision: previous.manifest.catalogRevision,
          catalogRevision: previous.manifest.catalogRevision,
        };
      }
      assertDirectCatalogTransition(previous.manifest, candidate);
      await this.dependencies.verify(candidate);
      const staged = await this.dependencies.build(candidate);
      if (staged.manifest.catalogRevision.toLowerCase() !== candidate.catalogRevision.toLowerCase()) {
        throw new Error("staged catalog runtime does not match the verified candidate revision");
      }
      await this.dependencies.acceptStaged?.(staged, previous);
      this.#active = staged;
      return {
        changed: true,
        previousRevision: previous.manifest.catalogRevision,
        catalogRevision: staged.manifest.catalogRevision,
      };
    });
  }

  /** Serialize polling/recovery against reload without blocking public reads. */
  withActive<Result>(operation: (runtime: Runtime) => Promise<Result>): Promise<Result> {
    return this.#exclusive(() => operation(this.#active));
  }

  #exclusive<Result>(operation: () => Promise<Result>): Promise<Result> {
    const result = this.#operationTail.then(operation, operation);
    this.#operationTail = result.then(() => undefined, () => undefined);
    return result;
  }
}

/** Validate one direct hash-linked successor without requiring every historical manifest file. */
export function assertDirectCatalogTransition(
  previous: CatalogManifest,
  candidate: CatalogManifest,
): void {
  const issues: string[] = [];
  if (candidate.chainId !== previous.chainId) issues.push("catalog chainId cannot change");
  if (BigInt(candidate.revision) !== BigInt(previous.revision) + 1n) {
    issues.push("catalog revision must increment by exactly one");
  }
  if ((candidate.previousRevisionHash ?? "").toLowerCase() !== previous.catalogRevision.toLowerCase()) {
    issues.push("previousRevisionHash does not reference the active catalog revision");
  }
  if (BigInt(candidate.effectiveBlock) < BigInt(previous.effectiveBlock)) {
    issues.push("effectiveBlock cannot move backwards");
  }
  if (Date.parse(candidate.effectiveAt) < Date.parse(previous.effectiveAt)) {
    issues.push("effectiveAt cannot move backwards");
  }

  const previousRecords = recordMap(previous);
  const candidateRecords = recordMap(candidate);
  const previousRoutes = routeMap(previous);
  const candidateRoutes = routeMap(candidate);
  for (const [marketId, previousRecord] of previousRecords) {
    const candidateRecord = candidateRecords.get(marketId);
    if (!candidateRecord) {
      issues.push(`${previousRecord.marketId}: immutable history cannot be removed`);
      continue;
    }
    if (canonicalJson(candidateRecord) !== canonicalJson(previousRecord)) {
      issues.push(`${previousRecord.marketId}: immutable market record changed`);
    }
    const before = previousRoutes.get(marketId);
    const after = candidateRoutes.get(marketId);
    if (!before || !after) continue;
    if (before.opensAt !== undefined && after.opensAt !== before.opensAt) {
      issues.push(`${previousRecord.marketId}: first activation time changed`);
    }
    if (before.opensAtBlock !== undefined && after.opensAtBlock !== before.opensAtBlock) {
      issues.push(`${previousRecord.marketId}: first activation block changed`);
    }
    if (before.activation === "RETIRED" && after.activation !== "RETIRED") {
      issues.push(`${previousRecord.marketId}: a retired market cannot be revived`);
    }
  }

  const axes = new Set(previous.markets.map(marketAxis));
  for (const axis of axes) {
    const previousActive = activeRecordForAxis(previous, previousRoutes, axis);
    const candidateActive = activeRecordForAxis(candidate, candidateRoutes, axis);
    if (
      !previousActive ||
      !candidateActive ||
      previousActive.marketId.toLowerCase() === candidateActive.marketId.toLowerCase()
    ) continue;
    if (previousRoutes.get(candidateActive.marketId.toLowerCase())?.activation !== "SUCCESSOR") {
      issues.push(`${axis}: replacement ACTIVE market was not a SUCCESSOR in the active revision`);
    }
    if (candidateRoutes.get(previousActive.marketId.toLowerCase())?.activation !== "RETIRED") {
      issues.push(`${axis}: predecessor must become RETIRED in the activation revision`);
    }
    const effectiveSeconds = BigInt(Math.floor(Date.parse(candidate.effectiveAt) / 1_000));
    if (BigInt(previousActive.times.tradingClosesAt) > effectiveSeconds) {
      issues.push(`${axis}: predecessor was still ordering-open at successor cutover`);
    }
  }

  if (issues.length > 0) {
    throw new CatalogReloadError(issues);
  }
}

export class CatalogReloadError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Catalog reload rejected:\n- ${issues.join("\n- ")}`);
    this.name = "CatalogReloadError";
  }
}

type ReloadSignalSource = Pick<NodeJS.Process, "on" | "off">;

/** SIGHUP is an OS/operator control surface; no public HTTP route can invoke catalog adoption. */
export function installCatalogReloadSignal(
  reload: () => Promise<CatalogReloadResult>,
  callbacks: Readonly<{
    source?: ReloadSignalSource;
    onComplete?(result: CatalogReloadResult): void;
    onError?(error: unknown): void;
  }> = {},
): () => void {
  const source = callbacks.source ?? process;
  const handler = (): void => {
    void reload().then(callbacks.onComplete, callbacks.onError);
  };
  source.on("SIGHUP", handler);
  return () => source.off("SIGHUP", handler);
}

class SwitchingReadModel implements ServiceReadModel {
  constructor(readonly current: () => ServiceReadModel) {}

  listMarkets(input: MarketListInput): Promise<MarketListPage> {
    return this.current().listMarkets(input);
  }
  getMarket(marketId: string): Promise<MarketView | undefined> {
    return this.current().getMarket(marketId);
  }
  getMarketHistory(input: MarketHistoryInput): Promise<MarketHistoryView | undefined> {
    return this.current().getMarketHistory(input);
  }
  getQuote(marketId: string, side: "YES" | "NO", amount: string): Promise<QuoteView | undefined> {
    return this.current().getQuote(marketId, side, amount);
  }
  getOrder(ref: OrderRef): Promise<OrderView | undefined> {
    return this.current().getOrder(ref);
  }
  listOrders(owner: `0x${string}`): Promise<readonly OrderView[]> {
    return this.current().listOrders(owner);
  }
  listPositions(owner: `0x${string}`): Promise<readonly PositionView[]> {
    return this.current().listPositions(owner);
  }
  listActivity(input: { marketId?: string; owner?: `0x${string}` }): Promise<readonly ActivityView[]> {
    return this.current().listActivity(input);
  }
  health(): Promise<HealthView> {
    return this.current().health();
  }
}

function recordMap(manifest: CatalogManifest): Map<string, ImmutableMarketRecord> {
  return new Map(manifest.markets.map((record) => [record.marketId.toLowerCase(), record]));
}

function routeMap(manifest: CatalogManifest): Map<string, CatalogRoute> {
  return new Map(manifest.routing.map((route) => [route.marketId.toLowerCase(), route]));
}

function marketAxis(record: ImmutableMarketRecord): string {
  return `${record.identity.asset}:${record.identity.horizon}`;
}

function activeRecordForAxis(
  manifest: CatalogManifest,
  routes: ReadonlyMap<string, CatalogRoute>,
  axis: string,
): ImmutableMarketRecord | undefined {
  return manifest.markets.find((record) =>
    marketAxis(record) === axis && routes.get(record.marketId.toLowerCase())?.activation === "ACTIVE"
  );
}
