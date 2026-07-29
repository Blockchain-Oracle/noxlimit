import { describe, expect, it, vi } from "vitest";
import type { Address, PublicClient } from "viem";

import { EvaluatorReadinessProbe } from "../src/nox/evaluator-readiness.js";
import { testAddress } from "./fixtures.js";

describe("evaluator readiness", () => {
  it("requires every immutable OrderBook worker binding and caches a successful verification", async () => {
    const worker = testAddress("a");
    const readContract = vi.fn(async () => worker);
    const gatewayFetch = vi.fn(async () => response({ status: "ok" }));
    const probe = new EvaluatorReadinessProbe({
      client: { readContract } as unknown as PublicClient,
      worker,
      orderBooks: [testAddress("1"), testAddress("2"), testAddress("2")],
      gatewayUrl: "https://gateway.example",
      fetch: gatewayFetch,
      timeoutMs: 500,
    });

    await expect(probe.check(100n)).resolves.toEqual({ ready: true });
    await expect(probe.check(101n)).resolves.toEqual({ ready: true });
    expect(readContract).toHaveBeenCalledTimes(2);
    expect(readContract.mock.calls.map(([input]) => input)).toEqual([
      expect.objectContaining({ address: testAddress("1"), functionName: "worker", blockNumber: 100n }),
      expect.objectContaining({ address: testAddress("2"), functionName: "worker", blockNumber: 100n }),
    ]);
    expect(gatewayFetch).toHaveBeenCalledTimes(2);
    expect(gatewayFetch.mock.calls[0]?.[0].toString()).toBe("https://gateway.example/health");
  });

  it("fails closed before probing the Gateway when any OrderBook has another worker", async () => {
    const worker = testAddress("a");
    const readContract = vi.fn(async (input: { address: Address }) =>
      input.address === testAddress("1") ? worker : testAddress("b")
    );
    const gatewayFetch = vi.fn(async () => response({ status: "ok" }));
    const probe = new EvaluatorReadinessProbe({
      client: { readContract } as unknown as PublicClient,
      worker,
      orderBooks: [testAddress("1"), testAddress("2")],
      gatewayUrl: "https://gateway.example",
      fetch: gatewayFetch,
      timeoutMs: 500,
    });
    await expect(probe.check(100n)).resolves.toEqual({
      ready: false,
      detail: "The configured worker is not authorized by every catalogued OrderBook.",
    });
    expect(gatewayFetch).not.toHaveBeenCalled();
  });

  it("reports empty catalogs and unhealthy or malformed Gateway responses honestly", async () => {
    const worker = testAddress("a");
    const noMarkets = new EvaluatorReadinessProbe({
      client: {} as PublicClient,
      worker,
      orderBooks: [],
      gatewayUrl: "https://gateway.example",
      fetch: vi.fn(),
      timeoutMs: 500,
    });
    await expect(noMarkets.check(100n)).resolves.toEqual({
      ready: false,
      detail: "No catalogued OrderBooks are available.",
    });

    const gatewayFetch = vi.fn(async () => response({ service: "Gateway" }));
    const unhealthy = new EvaluatorReadinessProbe({
      client: { readContract: async () => worker } as unknown as PublicClient,
      worker,
      orderBooks: [testAddress("1")],
      gatewayUrl: "https://gateway.example",
      fetch: gatewayFetch,
      timeoutMs: 500,
    });
    await expect(unhealthy.check(100n)).resolves.toEqual({
      ready: false,
      detail: "The Nox Gateway health check failed.",
    });
  });
});

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
