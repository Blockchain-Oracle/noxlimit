import type { LiquidityProvenance } from "@noxlimit/protocol";

import type { ImmutableMarketRecord } from "./schema.js";

/** Public provenance projected directly from immutable seed evidence, never from lifecycle state. */
export function liquidityProvenanceOf(record: ImmutableMarketRecord): LiquidityProvenance {
  return {
    kind: "BUILDER_SEEDED",
    seedTransactionHash: record.pool.seedTransactionHash,
  };
}
