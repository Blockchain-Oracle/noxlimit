import { EventEmitter } from "node:events";

import {
  catalogManifestSchema,
  createSepoliaBootstrapManifest,
  hashCatalogManifest,
  type CatalogManifest,
  type CatalogManifestPayload,
} from "@noxlimit/catalog";
import { healthViewSchema } from "@noxlimit/protocol";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/api/app.js";
import {
  CatalogReloadController,
  installCatalogReloadSignal,
  type CatalogRuntime,
} from "../src/catalog/reload-controller.js";
import { replayTargetsForManifest } from "../src/chain/replay-targets.js";
import { FundingUnavailable } from "../src/funding/unavailable.js";
import { ProjectionStore } from "../src/projections/store.js";
import { makeMarketRecord } from "./fixtures.js";

describe("atomic operator catalog reload", () => {
  it("verifies and fully stages every new market target before one active-pointer swap", async () => {
    const initial = createSepoliaBootstrapManifest();
    const candidate = nextRevision(initial);
    const events: string[] = [];
    let releaseRecovery: (() => void) | undefined;
    const recoveryGate = new Promise<void>((resolve) => {
      releaseRecovery = resolve;
    });
    const controller = new CatalogReloadController(runtime(initial), {
      load: async () => {
        events.push("load");
        return candidate;
      },
      verify: async () => {
        events.push("verify");
      },
      build: async (manifest) => {
        events.push("replay:start");
        expect(replayTargetsForManifest(manifest).map((target) => target.address.toLowerCase()))
          .toEqual(expect.arrayContaining(manifest.markets.flatMap((record) => [
            record.contracts.orderBook.toLowerCase(),
            record.contracts.fpmm.toLowerCase(),
            record.contracts.resolver.toLowerCase(),
            record.contracts.conditionalTokens.toLowerCase(),
          ])));
        await recoveryGate;
        events.push("replay:complete");
        return runtime(manifest);
      },
    });

    const reload = controller.reload("operator-only.json");
    await vi.waitFor(() => expect(events).toContain("replay:start"));
    expect(controller.active.manifest.catalogRevision).toBe(initial.catalogRevision);
    expect((await controller.readModel.health()).catalogRevision).toBe(initial.catalogRevision);

    releaseRecovery?.();
    await expect(reload).resolves.toEqual({
      changed: true,
      previousRevision: initial.catalogRevision,
      catalogRevision: candidate.catalogRevision,
    });
    expect(events).toEqual(["load", "verify", "replay:start", "replay:complete"]);
    expect(controller.active.manifest.catalogRevision).toBe(candidate.catalogRevision);
    expect((await controller.readModel.health()).catalogRevision).toBe(candidate.catalogRevision);
  });

  it("keeps the previous revision and read model after candidate recovery fails", async () => {
    const initial = createSepoliaBootstrapManifest();
    const candidate = nextRevision(initial);
    const original = runtime(initial);
    const controller = new CatalogReloadController(original, {
      load: async () => candidate,
      verify: async () => undefined,
      build: async () => {
        throw new Error("recovery reread failed");
      },
    });

    await expect(controller.reload("operator-only.json")).rejects.toThrow("recovery reread failed");
    expect(controller.active).toBe(original);
    expect((await controller.readModel.health()).catalogRevision).toBe(initial.catalogRevision);
  });

  it("serializes background recovery and reload so an old poll cannot cross the swap", async () => {
    const initial = createSepoliaBootstrapManifest();
    const candidate = nextRevision(initial);
    let releasePoll: (() => void) | undefined;
    const pollGate = new Promise<void>((resolve) => {
      releasePoll = resolve;
    });
    const load = vi.fn(async () => candidate);
    const controller = new CatalogReloadController(runtime(initial), {
      load,
      verify: async () => undefined,
      build: async (manifest) => runtime(manifest),
    });
    const poll = controller.withActive(async (active) => {
      expect(active.manifest.catalogRevision).toBe(initial.catalogRevision);
      await pollGate;
    });
    const reload = controller.reload("operator-only.json");
    await Promise.resolve();
    expect(load).not.toHaveBeenCalled();
    expect(controller.active.manifest.catalogRevision).toBe(initial.catalogRevision);

    releasePoll?.();
    await poll;
    await reload;
    expect(load).toHaveBeenCalledOnce();
    expect(controller.active.manifest.catalogRevision).toBe(candidate.catalogRevision);
  });

  it("rejects a non-linked candidate before chain verification and keeps the active revision", async () => {
    const initial = createSepoliaBootstrapManifest();
    const linked = nextRevision(initial);
    const payload = manifestPayload(linked);
    const unlinkedPayload: CatalogManifestPayload = {
      ...payload,
      previousRevisionHash: `0x${"f".repeat(64)}`,
    };
    const unlinked = catalogManifestSchema.parse({
      ...unlinkedPayload,
      catalogRevision: hashCatalogManifest(unlinkedPayload),
    });
    const verify = vi.fn(async () => undefined);
    const controller = new CatalogReloadController(runtime(initial), {
      load: async () => unlinked,
      verify,
      build: async (manifest) => runtime(manifest),
    });

    await expect(controller.reload("operator-only.json")).rejects.toThrow(
      "previousRevisionHash does not reference the active catalog revision",
    );
    expect(verify).not.toHaveBeenCalled();
    expect(controller.active.manifest.catalogRevision).toBe(initial.catalogRevision);
  });

  it("exposes reload only through the internal controller/SIGHUP control surface", async () => {
    const initial = createSepoliaBootstrapManifest();
    const candidate = nextRevision(initial);
    const controller = new CatalogReloadController(runtime(initial), {
      load: async () => candidate,
      verify: async () => undefined,
      build: async (manifest) => runtime(manifest),
    });
    const source = new EventEmitter();
    const completed = new Promise<void>((resolve, reject) => {
      const remove = installCatalogReloadSignal(
        () => controller.reload("operator-only.json"),
        {
          source: source as unknown as Pick<NodeJS.Process, "on" | "off">,
          onComplete: () => {
            remove();
            resolve();
          },
          onError: reject,
        },
      );
      source.emit("SIGHUP");
    });
    await completed;
    expect(controller.active.manifest.catalogRevision).toBe(candidate.catalogRevision);

    const app = createApp({
      readModel: controller.readModel,
      funding: new FundingUnavailable(),
    });
    const response = await app.inject({ method: "POST", url: "/v1/catalog/reload" });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});

function nextRevision(previous: CatalogManifest): CatalogManifest {
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
      activation: "ACTIVE",
      opensAt: new Date(Number(record.times.startsAt) * 1_000).toISOString(),
      opensAtBlock: "1000",
    }],
  };
  return catalogManifestSchema.parse({
    ...payload,
    catalogRevision: hashCatalogManifest(payload),
  });
}

function manifestPayload(manifest: CatalogManifest): CatalogManifestPayload {
  const { catalogRevision: _catalogRevision, ...payload } = manifest;
  return payload;
}

function runtime(manifest: CatalogManifest): CatalogRuntime {
  const store = new ProjectionStore(manifest.catalogRevision, healthViewSchema.parse({
    status: "READY",
    chainId: 11_155_111,
    catalogRevision: manifest.catalogRevision,
    headBlock: "100",
    safeBlock: "94",
    indexerLagBlocks: "6",
    evaluator: { status: "UNAVAILABLE" },
    funding: { status: "UNAVAILABLE" },
    asOf: "2030-01-01T00:00:00.000Z",
  }));
  return { manifest, readModel: store };
}
