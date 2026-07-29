import type { Hex } from "viem";

import { canonicalJson, hashCanonicalJson } from "./canonical.js";
import { deriveMarketId, deriveQuestionId } from "./identity.js";
import {
  catalogManifestPayloadSchema,
  catalogManifestSchema,
  type CatalogManifest,
  type CatalogManifestPayload,
  type CatalogRoute,
  type ImmutableMarketRecord,
} from "./schema.js";

export class CatalogValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Catalog validation failed:\n- ${issues.join("\n- ")}`);
    this.name = "CatalogValidationError";
  }
}

function manifestPayload(input: CatalogManifest | CatalogManifestPayload): CatalogManifestPayload {
  const { catalogRevision: _catalogRevision, ...payload } = input as CatalogManifest;
  return catalogManifestPayloadSchema.parse(payload);
}

export function hashCatalogManifest(input: CatalogManifest | CatalogManifestPayload): Hex {
  return hashCanonicalJson(manifestPayload(input));
}

function axis(record: ImmutableMarketRecord): string {
  return `${record.identity.asset}:${record.identity.horizon}`;
}

function routeMap(manifest: CatalogManifest): Map<string, CatalogRoute> {
  return new Map(manifest.routing.map((route) => [route.marketId.toLowerCase(), route]));
}

function recordMap(manifest: CatalogManifest): Map<string, ImmutableMarketRecord> {
  return new Map(manifest.markets.map((record) => [record.marketId.toLowerCase(), record]));
}

function lower(value: string): string {
  return value.toLowerCase();
}

function validateSingleManifest(manifest: CatalogManifest): string[] {
  const issues: string[] = [];
  if (hashCatalogManifest(manifest).toLowerCase() !== manifest.catalogRevision.toLowerCase()) {
    issues.push("catalogRevision does not match the canonical manifest payload hash");
  }

  const records = recordMap(manifest);
  const routes = routeMap(manifest);
  if (records.size !== manifest.markets.length) issues.push("marketId values must be unique");
  if (routes.size !== manifest.routing.length) issues.push("routing marketId values must be unique");
  if (records.size !== routes.size) issues.push("every immutable market must have exactly one route");

  const uniqueFields: Array<[string, (record: ImmutableMarketRecord) => string]> = [
    ["questionId", (record) => record.questionId],
    ["conditionId", (record) => record.conditionId],
    ["resolver", (record) => record.contracts.resolver],
    ["fpmm", (record) => record.contracts.fpmm],
    ["orderBook", (record) => record.contracts.orderBook],
  ];
  for (const [name, select] of uniqueFields) {
    const values = manifest.markets.map((record) => lower(select(record)));
    if (new Set(values).size !== values.length) issues.push(`${name} values must be unique`);
  }

  const routesByAxis = new Map<string, Array<{ route: CatalogRoute; record: ImmutableMarketRecord }>>();
  for (const record of manifest.markets) {
    const expectedMarketId = deriveMarketId(record.identity);
    const expectedQuestionId = deriveQuestionId(record.identity);
    if (lower(expectedMarketId) !== lower(record.marketId)) {
      issues.push(`${record.marketId}: marketId is not derived from its stable identity`);
    }
    if (lower(expectedQuestionId) !== lower(record.questionId)) {
      issues.push(`${record.marketId}: questionId is not derived from its stable identity`);
    }
    const route = routes.get(lower(record.marketId));
    if (route === undefined) continue;
    const key = axis(record);
    const group = routesByAxis.get(key) ?? [];
    group.push({ route, record });
    routesByAxis.set(key, group);

    const hasOpenIdentity = route.opensAt !== undefined && route.opensAtBlock !== undefined;
    if ((route.activation === "ACTIVE" || route.activation === "RETIRED") && !hasOpenIdentity) {
      issues.push(`${record.marketId}: ${route.activation} route must preserve opensAt and opensAtBlock`);
    }
    if (route.activation === "SUCCESSOR" && hasOpenIdentity) {
      issues.push(`${record.marketId}: SUCCESSOR cannot claim first activation before becoming ACTIVE`);
    }
    if (route.activation === "ACTIVE") {
      const effectiveSeconds = BigInt(Math.floor(Date.parse(manifest.effectiveAt) / 1_000));
      if (BigInt(record.times.tradingClosesAt) <= effectiveSeconds) {
        issues.push(`${record.marketId}: ACTIVE route is already past NoxLimit trading close`);
      }
      if (BigInt(record.pool.seededAtBlock) > BigInt(manifest.effectiveBlock)) {
        issues.push(`${record.marketId}: ACTIVE route predates its seeded liquidity evidence`);
      }
    }
  }
  for (const route of manifest.routing) {
    if (!records.has(lower(route.marketId))) issues.push(`${route.marketId}: route has no market record`);
  }
  for (const [key, group] of routesByAxis) {
    const nonRetired = group.filter(({ route }) => route.activation !== "RETIRED");
    const active = group.filter(({ route }) => route.activation === "ACTIVE");
    if (nonRetired.length > 0 && active.length !== 1) {
      issues.push(`${key}: exactly one ACTIVE route is required when the axis has live routing`);
    }
  }
  return issues;
}

export function validateCatalogManifest(input: unknown): CatalogManifest {
  const parsed = catalogManifestSchema.parse(input);
  const issues = validateSingleManifest(parsed);
  if (issues.length > 0) throw new CatalogValidationError(issues);
  return parsed;
}

function validateTransition(previous: CatalogManifest, current: CatalogManifest): string[] {
  const issues: string[] = [];
  if (current.chainId !== previous.chainId) issues.push("catalog chainId cannot change");
  if (BigInt(current.revision) !== BigInt(previous.revision) + 1n) {
    issues.push("catalog revision must increment by exactly one");
  }
  if (lower(current.previousRevisionHash ?? "") !== lower(previous.catalogRevision)) {
    issues.push("previousRevisionHash does not reference the preceding catalog revision");
  }
  if (BigInt(current.effectiveBlock) < BigInt(previous.effectiveBlock)) {
    issues.push("effectiveBlock cannot move backwards");
  }
  if (Date.parse(current.effectiveAt) < Date.parse(previous.effectiveAt)) {
    issues.push("effectiveAt cannot move backwards");
  }

  const previousRecords = recordMap(previous);
  const currentRecords = recordMap(current);
  const previousRoutes = routeMap(previous);
  const currentRoutes = routeMap(current);
  for (const [marketId, oldRecord] of previousRecords) {
    const nextRecord = currentRecords.get(marketId);
    if (nextRecord === undefined) {
      issues.push(`${oldRecord.marketId}: immutable history cannot be removed`);
      continue;
    }
    if (canonicalJson(oldRecord) !== canonicalJson(nextRecord)) {
      issues.push(`${oldRecord.marketId}: immutable market record changed`);
    }
    const oldRoute = previousRoutes.get(marketId);
    const nextRoute = currentRoutes.get(marketId);
    if (oldRoute === undefined || nextRoute === undefined) continue;
    if (oldRoute.opensAt !== undefined && nextRoute.opensAt !== oldRoute.opensAt) {
      issues.push(`${oldRecord.marketId}: first activation time changed`);
    }
    if (oldRoute.opensAtBlock !== undefined && nextRoute.opensAtBlock !== oldRoute.opensAtBlock) {
      issues.push(`${oldRecord.marketId}: first activation block changed`);
    }
    if (oldRoute.activation === "RETIRED" && nextRoute.activation !== "RETIRED") {
      issues.push(`${oldRecord.marketId}: a retired market cannot be revived`);
    }
  }

  const axes = new Set(previous.markets.map(axis));
  for (const axisKey of axes) {
    const previousActive = previous.markets.find((record) => {
      return axis(record) === axisKey && previousRoutes.get(lower(record.marketId))?.activation === "ACTIVE";
    });
    const currentActive = current.markets.find((record) => {
      return axis(record) === axisKey && currentRoutes.get(lower(record.marketId))?.activation === "ACTIVE";
    });
    if (
      previousActive !== undefined &&
      currentActive !== undefined &&
      lower(previousActive.marketId) !== lower(currentActive.marketId)
    ) {
      if (previousRoutes.get(lower(currentActive.marketId))?.activation !== "SUCCESSOR") {
        issues.push(`${axisKey}: replacement ACTIVE market was not a verified SUCCESSOR first`);
      }
      if (currentRoutes.get(lower(previousActive.marketId))?.activation !== "RETIRED") {
        issues.push(`${axisKey}: predecessor must become RETIRED in the activation revision`);
      }
      const effectiveSeconds = BigInt(Math.floor(Date.parse(current.effectiveAt) / 1_000));
      if (BigInt(previousActive.times.tradingClosesAt) > effectiveSeconds) {
        issues.push(`${axisKey}: predecessor was still ordering-open at successor cutover`);
      }
    }
  }
  return issues;
}

export function validateCatalogChain(inputs: readonly unknown[]): readonly CatalogManifest[] {
  if (inputs.length === 0) throw new CatalogValidationError(["catalog chain cannot be empty"]);
  const manifests = inputs.map(validateCatalogManifest);
  const issues: string[] = [];
  if (manifests[0]?.previousRevisionHash !== null) {
    issues.push("the first catalog revision must have a null previousRevisionHash");
  }
  for (let index = 1; index < manifests.length; index += 1) {
    const previous = manifests[index - 1];
    const current = manifests[index];
    if (previous !== undefined && current !== undefined) {
      issues.push(...validateTransition(previous, current));
    }
  }
  if (issues.length > 0) throw new CatalogValidationError(issues);
  return manifests;
}
