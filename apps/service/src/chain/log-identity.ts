import type { Hex } from "viem";

export type DurableLogIdentity = Readonly<{
  blockHash: Hex;
  transactionHash: Hex;
  logIndex: number;
}>;

export function logIdentityKey(identity: DurableLogIdentity): string {
  if (!Number.isSafeInteger(identity.logIndex) || identity.logIndex < 0) {
    throw new RangeError("invalid log index");
  }
  return `${identity.blockHash.toLowerCase()}:${identity.transactionHash.toLowerCase()}:${identity.logIndex}`;
}

export class LogDeduplicator {
  readonly #seen = new Set<string>();

  add(identity: DurableLogIdentity): boolean {
    const key = logIdentityKey(identity);
    if (this.#seen.has(key)) return false;
    this.#seen.add(key);
    return true;
  }

  reset(): void {
    this.#seen.clear();
  }

  get size(): number {
    return this.#seen.size;
  }
}
