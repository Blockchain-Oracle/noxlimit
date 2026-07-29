import { type Handle, type HandleClient } from "@iexec-nox/handle";
import type { Hex } from "viem";

import type { CandidateGateway } from "../worker/runtime.js";

export class HandleCandidateGateway implements CandidateGateway {
  readonly #client: HandleClient;
  readonly #timeoutMs: number;
  readonly #pollIntervalMs: number;

  constructor(client: HandleClient, options: { timeoutMs?: number; pollIntervalMs?: number } = {}) {
    this.#client = client;
    this.#timeoutMs = options.timeoutMs ?? 45_000;
    this.#pollIntervalMs = options.pollIntervalMs ?? 500;
    if (this.#timeoutMs <= 0 || this.#pollIntervalMs <= 0) {
      throw new RangeError("invalid Gateway retry policy");
    }
  }

  async decrypt(candidate: Hex): Promise<bigint> {
    const result = await this.#eventually(() =>
      this.#client.decrypt(candidate as Handle<"uint256">),
    );
    return result.value;
  }

  async publicDecrypt(candidate: Hex): Promise<{ value: bigint; proof: Hex }> {
    const result = await this.#eventually(() =>
      this.#client.publicDecrypt(candidate as Handle<"uint256">),
    );
    return { value: result.value, proof: result.decryptionProof as Hex };
  }

  async #eventually<T>(operation: () => Promise<T>): Promise<T> {
    const deadline = Date.now() + this.#timeoutMs;
    let latest: unknown;
    while (Date.now() < deadline) {
      try {
        return await operation();
      } catch (error) {
        latest = error;
        await new Promise((resolve) => setTimeout(resolve, this.#pollIntervalMs));
      }
    }
    throw latest instanceof Error ? latest : new Error("Nox Gateway operation timed out");
  }
}
