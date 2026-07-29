import type { ReplayLog, ReplayProjector } from "../chain/replay-engine.js";

/** Fan one canonical replay stream into independently rebuildable projections. */
export class CompositeReplayProjector implements ReplayProjector {
  readonly #projectors: readonly ReplayProjector[];

  constructor(...projectors: readonly ReplayProjector[]) {
    if (projectors.length === 0) throw new RangeError("at least one replay projector is required");
    this.#projectors = projectors;
  }

  async reset(): Promise<void> {
    for (const projector of this.#projectors) await projector.reset();
  }

  async apply(log: ReplayLog): Promise<void> {
    for (const projector of this.#projectors) await projector.apply(log);
  }

  async complete(safeBlock: bigint): Promise<void> {
    for (const projector of this.#projectors) await projector.complete(safeBlock);
  }
}
