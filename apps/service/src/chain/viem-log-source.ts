import type { Address, Hex, PublicClient } from "viem";

import type {
  ReplayLog,
  ReplayLogSource,
  ReplaySnapshot,
} from "./replay-engine.js";

export class ViemReplayLogSource implements ReplayLogSource {
  readonly #client: PublicClient;
  readonly #confirmationDepth: bigint;

  constructor(client: PublicClient, confirmationDepth = 6n) {
    if (confirmationDepth < 0n) throw new RangeError("negative confirmation depth");
    this.#client = client;
    this.#confirmationDepth = confirmationDepth;
  }

  async getSnapshot(): Promise<ReplaySnapshot> {
    const headBlock = await this.#client.getBlockNumber();
    return {
      headBlock,
      safeBlock: headBlock > this.#confirmationDepth
        ? headBlock - this.#confirmationDepth
        : 0n,
    };
  }

  async getBlockHash(blockNumber: bigint): Promise<Hex> {
    const block = await this.#client.getBlock({ blockNumber });
    if (!block.hash) throw new Error(`block ${blockNumber} has no hash`);
    return block.hash;
  }

  async getLogs(input: {
    address: Address;
    fromBlock: bigint;
    toBlock: bigint;
  }): Promise<readonly ReplayLog[]> {
    const logs = await this.#client.getLogs(input);
    return logs.flatMap((log) => {
      if (
        log.blockHash === null ||
        log.transactionHash === null ||
        log.blockNumber === null ||
        log.logIndex === null
      ) {
        return [];
      }
      return [
        {
          address: log.address,
          blockHash: log.blockHash,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          data: log.data,
          topics: log.topics,
        },
      ];
    });
  }
}
