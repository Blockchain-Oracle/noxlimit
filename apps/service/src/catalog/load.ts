import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isAbsolute, resolve } from "node:path";

import {
  type CatalogManifest,
  validateCatalogManifest,
} from "@noxlimit/catalog";

/** Load one committed catalog revision. Validation includes its canonical self-hash. */
export async function loadCatalogManifest(path: string): Promise<CatalogManifest> {
  const candidates = isAbsolute(path)
    ? [path]
    : [resolve(path), resolve(fileURLToPath(new URL("../../../../", import.meta.url)), path)];
  let absolutePath = candidates[0]!;
  let source: string | undefined;
  for (const candidate of new Set(candidates)) {
    try {
      source = await readFile(candidate, "utf8");
      absolutePath = candidate;
      break;
    } catch (error) {
      if (!isMissingFile(error) || candidate === candidates.at(-1)) throw error;
    }
  }
  if (source === undefined) throw new Error(`catalog manifest was not found: ${path}`);
  let input: unknown;
  try {
    input = JSON.parse(source);
  } catch (error) {
    throw new Error(`catalog is not valid JSON: ${absolutePath}`, { cause: error });
  }
  return validateCatalogManifest(input);
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT";
}
