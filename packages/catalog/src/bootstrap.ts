import { ETHEREUM_SEPOLIA_CHAIN_ID } from "@noxlimit/protocol";

import type { CatalogManifest, CatalogManifestPayload } from "./schema.js";
import { catalogManifestSchema } from "./schema.js";
import { hashCatalogManifest } from "./validate.js";

export const SEPOLIA_BOOTSTRAP_PAYLOAD: CatalogManifestPayload = {
  schemaVersion: 1,
  chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
  revision: "0",
  previousRevisionHash: null,
  effectiveAt: "1970-01-01T00:00:00.000Z",
  effectiveBlock: "0",
  markets: [],
  routing: [],
};

export function createSepoliaBootstrapManifest(): CatalogManifest {
  return catalogManifestSchema.parse({
    ...SEPOLIA_BOOTSTRAP_PAYLOAD,
    catalogRevision: hashCatalogManifest(SEPOLIA_BOOTSTRAP_PAYLOAD),
  });
}
