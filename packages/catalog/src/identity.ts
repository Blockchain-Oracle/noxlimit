import type { Hex } from "viem";

import { hashCanonicalJson } from "./canonical.js";
import {
  stableMarketIdentitySchema,
  type StableMarketIdentity,
} from "./schema.js";

function identityHash(domain: "question" | "market", identity: StableMarketIdentity): Hex {
  return hashCanonicalJson({
    domain: `noxlimit:${domain}:v1`,
    identity: stableMarketIdentitySchema.parse(identity),
  });
}

export function deriveQuestionId(identity: StableMarketIdentity): Hex {
  return identityHash("question", identity);
}

export function deriveMarketId(identity: StableMarketIdentity): Hex {
  return identityHash("market", identity);
}
