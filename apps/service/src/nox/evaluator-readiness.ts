import { noxLimitOrderBookAbi } from "@noxlimit/protocol";
import type { Address, PublicClient } from "viem";

export const SEPOLIA_NOX_GATEWAY_URL = "https://gateway-testnets.noxprotocol.dev";

export type EvaluatorReadiness = Readonly<{
  ready: boolean;
  detail?: string;
}>;

type GatewayFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Fail-closed readiness for the hosted evaluator.
 *
 * Worker bindings are immutable, so a successful all-market verification is cached. Gateway
 * health remains live and is checked on every call.
 */
export class EvaluatorReadinessProbe {
  readonly #client: PublicClient;
  readonly #worker: Address;
  readonly #orderBooks: readonly Address[];
  readonly #gatewayHealthUrl: URL;
  readonly #fetch: GatewayFetch;
  readonly #timeoutMs: number;
  #bindingsVerified = false;

  constructor(input: {
    client: PublicClient;
    worker: Address;
    orderBooks: readonly Address[];
    gatewayUrl?: string;
    fetch?: GatewayFetch;
    timeoutMs?: number;
  }) {
    this.#client = input.client;
    this.#worker = input.worker;
    this.#orderBooks = [...new Map(
      input.orderBooks.map((address) => [address.toLowerCase(), address] as const),
    ).values()];
    const gateway = new URL(input.gatewayUrl ?? SEPOLIA_NOX_GATEWAY_URL);
    if (!/^https?:$/.test(gateway.protocol) || gateway.username || gateway.password) {
      throw new TypeError("Nox Gateway readiness requires an HTTP(S) base URL without credentials");
    }
    this.#gatewayHealthUrl = new URL("/health", gateway);
    this.#fetch = input.fetch ?? globalThis.fetch;
    this.#timeoutMs = input.timeoutMs ?? 3_000;
    if (!Number.isSafeInteger(this.#timeoutMs) || this.#timeoutMs < 100 || this.#timeoutMs > 30_000) {
      throw new RangeError("Nox Gateway health timeout must be between 100ms and 30s");
    }
  }

  async check(safeBlock: bigint): Promise<EvaluatorReadiness> {
    if (this.#orderBooks.length === 0) {
      return { ready: false, detail: "No catalogued OrderBooks are available." };
    }
    if (!this.#bindingsVerified) {
      let configuredWorkers: readonly Address[];
      try {
        configuredWorkers = await Promise.all(this.#orderBooks.map((address) =>
          this.#client.readContract({
            address,
            abi: noxLimitOrderBookAbi,
            functionName: "worker",
            blockNumber: safeBlock,
          })
        ));
      } catch {
        return {
          ready: false,
          detail: "Evaluator worker bindings could not be verified at the safe block.",
        };
      }
      if (configuredWorkers.some(
        (configured) => configured.toLowerCase() !== this.#worker.toLowerCase(),
      )) {
        return {
          ready: false,
          detail: "The configured worker is not authorized by every catalogued OrderBook.",
        };
      }
      this.#bindingsVerified = true;
    }

    try {
      const response = await this.#fetch(this.#gatewayHealthUrl, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
      if (!response.ok) throw new Error("unhealthy Gateway response");
      const body = await response.text();
      if (body.length > 1_024) throw new Error("oversized Gateway health response");
      const payload = JSON.parse(body) as unknown;
      if (
        !payload ||
        typeof payload !== "object" ||
        (payload as { status?: unknown }).status !== "ok"
      ) throw new Error("invalid Gateway health response");
      return { ready: true };
    } catch {
      return { ready: false, detail: "The Nox Gateway health check failed." };
    }
  }
}
