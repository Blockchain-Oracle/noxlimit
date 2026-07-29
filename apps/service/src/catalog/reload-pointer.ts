import { open } from "node:fs/promises";
import { isAbsolute, normalize } from "node:path";

const MAX_RELOAD_POINTER_BYTES = 4_096;

/**
 * Select the durable catalog authority for process startup.
 *
 * A configured pointer always wins so a process restart cannot silently fall back to the older
 * bootstrap path after a successful SIGHUP adoption. Development/bootstrap environments without
 * a pointer retain the explicit manifest path.
 */
export async function resolveStartupCatalogPath(
  manifestPath: string,
  pointerPath?: string,
): Promise<string> {
  return pointerPath ? loadCatalogReloadPointer(pointerPath) : manifestPath;
}

/**
 * Resolve the operator-managed catalog pointer used by SIGHUP reloads.
 *
 * The pointer is deliberately a tiny, single-line UTF-8 file whose value is one absolute path to
 * an immutable manifest. Keeping the mutable indirection separate from the manifest means an
 * operator can publish a create-only revision and then atomically repoint reloads to it.
 */
export async function loadCatalogReloadPointer(pointerPath: string): Promise<string> {
  if (!isCanonicalAbsolutePath(pointerPath)) {
    throw new CatalogReloadPointerError("reload pointer path must be an absolute normalized path");
  }

  const handle = await open(pointerPath, "r");
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new CatalogReloadPointerError("reload pointer must be a regular file");
    }
    if (stats.size < 1 || stats.size > MAX_RELOAD_POINTER_BYTES) {
      throw new CatalogReloadPointerError(
        `reload pointer must contain between 1 and ${MAX_RELOAD_POINTER_BYTES} bytes`,
      );
    }

    const bounded = Buffer.alloc(MAX_RELOAD_POINTER_BYTES + 1);
    const { bytesRead } = await handle.read(bounded, 0, bounded.byteLength, 0);
    if (bytesRead < 1 || bytesRead > MAX_RELOAD_POINTER_BYTES) {
      throw new CatalogReloadPointerError(
        `reload pointer must contain between 1 and ${MAX_RELOAD_POINTER_BYTES} bytes`,
      );
    }
    const bytes = bounded.subarray(0, bytesRead);
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      throw new CatalogReloadPointerError("reload pointer must not contain a UTF-8 byte-order mark");
    }

    let value: string;
    try {
      value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new CatalogReloadPointerError("reload pointer must be valid UTF-8");
    }
    if (value.endsWith("\n")) value = value.slice(0, -1);
    if (value.length === 0 || /[\r\n\0]/u.test(value)) {
      throw new CatalogReloadPointerError(
        "reload pointer must contain exactly one non-empty line",
      );
    }
    if (value.trim() !== value) {
      throw new CatalogReloadPointerError("reload pointer path must not have surrounding whitespace");
    }
    if (!isCanonicalAbsolutePath(value)) {
      throw new CatalogReloadPointerError(
        "reload pointer must contain an absolute normalized manifest path",
      );
    }
    return value;
  } finally {
    await handle.close();
  }
}

export class CatalogReloadPointerError extends Error {
  constructor(message: string) {
    super(`Catalog reload pointer rejected: ${message}`);
    this.name = "CatalogReloadPointerError";
  }
}

function isCanonicalAbsolutePath(value: string): boolean {
  return isAbsolute(value) && normalize(value) === value;
}
