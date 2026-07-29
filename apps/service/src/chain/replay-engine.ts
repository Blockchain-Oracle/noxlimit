import type { Address, Hex } from "viem";

import { boundedBlockRanges, replayFromWithOverlap } from "./block-ranges.js";
import { LogDeduplicator, type DurableLogIdentity } from "./log-identity.js";

export type ReplayLog = DurableLogIdentity &
  Readonly<{
    address: Address;
    blockNumber: bigint;
    data: Hex;
    topics: readonly Hex[];
  }>;

export type ReplayTarget = Readonly<{
  address: Address;
  deploymentBlock: bigint;
}>;

export interface ReplayLogSource {
  getSafeHead(): Promise<bigint>;
  getBlockHash(blockNumber: bigint): Promise<Hex>;
  getLogs(input: {
    address: Address;
    fromBlock: bigint;
    toBlock: bigint;
  }): Promise<readonly ReplayLog[]>;
}

export interface ReplayProjector {
  reset(): Promise<void> | void;
  apply(log: ReplayLog): Promise<void> | void;
  complete(safeBlock: bigint): Promise<void> | void;
}

export type ReplayResult = Readonly<{
  safeBlock: bigint;
  appliedLogs: number;
  rebuilt: boolean;
}>;

/// @notice Rebuildable chain-log projection. It intentionally owns no persistent database.
export class ReplayEngine {
  readonly #source: ReplayLogSource;
  readonly #projector: ReplayProjector;
  readonly #chunkSize: bigint;
  readonly #overlap: bigint;
  readonly #deduplicator = new LogDeduplicator();
  #targets: readonly ReplayTarget[] = [];
  #lastSafeBlock: bigint | undefined;
  #lastSafeHash: Hex | undefined;

  constructor(
    source: ReplayLogSource,
    projector: ReplayProjector,
    options: { chunkSize?: bigint; overlap?: bigint } = {},
  ) {
    this.#source = source;
    this.#projector = projector;
    this.#chunkSize = options.chunkSize ?? 2_000n;
    this.#overlap = options.overlap ?? 12n;
    if (this.#chunkSize <= 0n || this.#overlap < 0n) throw new RangeError("invalid replay policy");
  }

  async rebuild(targets: readonly ReplayTarget[]): Promise<ReplayResult> {
    validateTargets(targets);
    this.#targets = [...targets];
    this.#deduplicator.reset();
    await this.#projector.reset();
    const safeBlock = await this.#source.getSafeHead();
    let appliedLogs = 0;
    for (const target of this.#targets) {
      if (target.deploymentBlock > safeBlock) continue;
      appliedLogs += await this.#replayTarget(target, target.deploymentBlock, safeBlock);
    }
    await this.#projector.complete(safeBlock);
    this.#lastSafeBlock = safeBlock;
    this.#lastSafeHash = await this.#source.getBlockHash(safeBlock);
    return { safeBlock, appliedLogs, rebuilt: true };
  }

  async poll(): Promise<ReplayResult> {
    if (this.#lastSafeBlock === undefined || this.#lastSafeHash === undefined) {
      return this.rebuild(this.#targets);
    }
    const observedPreviousHash = await this.#source.getBlockHash(this.#lastSafeBlock);
    if (observedPreviousHash.toLowerCase() !== this.#lastSafeHash.toLowerCase()) {
      return this.rebuild(this.#targets);
    }

    const safeBlock = await this.#source.getSafeHead();
    if (safeBlock < this.#lastSafeBlock) return this.rebuild(this.#targets);
    let appliedLogs = 0;
    for (const target of this.#targets) {
      const fromBlock = replayFromWithOverlap(
        this.#lastSafeBlock,
        target.deploymentBlock,
        this.#overlap,
      );
      if (fromBlock > safeBlock) continue;
      appliedLogs += await this.#replayTarget(target, fromBlock, safeBlock);
    }
    await this.#projector.complete(safeBlock);
    this.#lastSafeBlock = safeBlock;
    this.#lastSafeHash = await this.#source.getBlockHash(safeBlock);
    return { safeBlock, appliedLogs, rebuilt: false };
  }

  async #replayTarget(target: ReplayTarget, fromBlock: bigint, toBlock: bigint): Promise<number> {
    let applied = 0;
    for (const range of boundedBlockRanges(fromBlock, toBlock, this.#chunkSize)) {
      const logs = await this.#source.getLogs({ address: target.address, ...range });
      const ordered = [...logs].sort((left, right) => {
        if (left.blockNumber !== right.blockNumber) return left.blockNumber < right.blockNumber ? -1 : 1;
        return left.logIndex - right.logIndex;
      });
      for (const log of ordered) {
        if (!this.#deduplicator.add(log)) continue;
        await this.#projector.apply(log);
        applied += 1;
      }
    }
    return applied;
  }
}

function validateTargets(targets: readonly ReplayTarget[]): void {
  const seen = new Set<string>();
  for (const target of targets) {
    if (target.deploymentBlock < 0n) throw new RangeError("negative deployment block");
    const address = target.address.toLowerCase();
    if (seen.has(address)) throw new Error(`duplicate replay target: ${target.address}`);
    seen.add(address);
  }
}
