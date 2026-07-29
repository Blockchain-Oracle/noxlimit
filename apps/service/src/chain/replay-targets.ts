import type { CatalogManifest } from "@noxlimit/catalog";

import type { ReplayTarget } from "./replay-engine.js";

/** Every public contract whose events contribute to the restart-rebuildable read model. */
export function replayTargetsForManifest(manifest: CatalogManifest): readonly ReplayTarget[] {
  const targets = new Map<string, ReplayTarget>();
  const add = (address: ReplayTarget["address"], deploymentBlock: bigint): void => {
    const key = address.toLowerCase();
    const existing = targets.get(key);
    if (!existing || deploymentBlock < existing.deploymentBlock) {
      targets.set(key, { address, deploymentBlock });
    }
  };
  for (const record of manifest.markets) {
    const deploymentBlock = BigInt(record.deployment.deploymentBlock);
    add(record.contracts.orderBook, deploymentBlock);
    add(record.contracts.fpmm, deploymentBlock);
    add(record.contracts.resolver, deploymentBlock);
    add(record.contracts.conditionalTokens, deploymentBlock);
  }
  return [...targets.values()];
}
