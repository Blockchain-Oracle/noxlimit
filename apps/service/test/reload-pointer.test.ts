import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { installCatalogReloadSignal } from "../src/catalog/reload-controller.js";
import {
  loadCatalogReloadPointer,
  resolveStartupCatalogPath,
} from "../src/catalog/reload-pointer.js";
import { testHash } from "./fixtures.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true,
  })));
});

describe("operator catalog reload pointer", () => {
  it("reads one bounded UTF-8 absolute immutable-manifest path", async () => {
    const directory = await temporaryDirectory();
    const pointerPath = join(directory, "catalog.pointer");
    const manifestPath = join(directory, "catalog-revision-1.json");
    await writeFile(pointerPath, `${manifestPath}\n`, "utf8");

    await expect(loadCatalogReloadPointer(pointerPath)).resolves.toBe(manifestPath);
  });

  it("rejects relative, multiline, malformed UTF-8, and oversized pointer contents", async () => {
    const directory = await temporaryDirectory();
    const pointerPath = join(directory, "catalog.pointer");

    await writeFile(pointerPath, "relative/catalog.json", "utf8");
    await expect(loadCatalogReloadPointer(pointerPath)).rejects.toThrow(
      "absolute normalized manifest path",
    );

    await writeFile(pointerPath, "/one/catalog.json\n/two/catalog.json\n", "utf8");
    await expect(loadCatalogReloadPointer(pointerPath)).rejects.toThrow(
      "exactly one non-empty line",
    );

    await writeFile(pointerPath, Uint8Array.from([0xc3, 0x28]));
    await expect(loadCatalogReloadPointer(pointerPath)).rejects.toThrow("valid UTF-8");

    await writeFile(pointerPath, `/${"a".repeat(4_096)}`, "utf8");
    await expect(loadCatalogReloadPointer(pointerPath)).rejects.toThrow("between 1 and 4096 bytes");
  });

  it("resolves the mutable pointer afresh for every SIGHUP", async () => {
    const directory = await temporaryDirectory();
    const pointerPath = join(directory, "catalog.pointer");
    const firstManifestPath = join(directory, "catalog-revision-1.json");
    const secondManifestPath = join(directory, "catalog-revision-2.json");
    const source = new EventEmitter();
    const observed: string[] = [];
    await writeFile(pointerPath, firstManifestPath, "utf8");

    const remove = installCatalogReloadSignal(
      async () => {
        const manifestPath = await loadCatalogReloadPointer(pointerPath);
        observed.push(manifestPath);
        return {
          changed: true,
          previousRevision: testHash("1"),
          catalogRevision: testHash("2"),
        };
      },
      { source: source as unknown as Pick<NodeJS.Process, "on" | "off"> },
    );

    source.emit("SIGHUP");
    await vi.waitFor(() => expect(observed).toEqual([firstManifestPath]));
    await writeFile(pointerPath, `${secondManifestPath}\n`, "utf8");
    source.emit("SIGHUP");
    await vi.waitFor(() => expect(observed).toEqual([firstManifestPath, secondManifestPath]));
    remove();
  });

  it("boots the latest pointer target after a reload and process restart", async () => {
    const directory = await temporaryDirectory();
    const pointerPath = join(directory, "catalog.pointer");
    const bootstrapPath = join(directory, "catalog-bootstrap.json");
    const firstManifestPath = join(directory, "catalog-revision-1.json");
    const secondManifestPath = join(directory, "catalog-revision-2.json");

    await writeFile(pointerPath, firstManifestPath, "utf8");
    await expect(
      resolveStartupCatalogPath(bootstrapPath, pointerPath),
    ).resolves.toBe(firstManifestPath);

    // The operator atomically repoints after revision 2 is fully published and accepted. A fresh
    // process must select revision 2 immediately; no second SIGHUP is part of restart recovery.
    await writeFile(pointerPath, `${secondManifestPath}\n`, "utf8");
    await expect(
      resolveStartupCatalogPath(bootstrapPath, pointerPath),
    ).resolves.toBe(secondManifestPath);
    await expect(resolveStartupCatalogPath(bootstrapPath)).resolves.toBe(bootstrapPath);
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "noxlimit-catalog-pointer-"));
  temporaryDirectories.push(directory);
  return directory;
}
