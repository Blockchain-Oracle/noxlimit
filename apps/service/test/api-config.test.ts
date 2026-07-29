import type {
  FundingChallengeRequest,
  FundingClaimRequest,
  HealthView,
  MarketHistoryView,
  QuoteView,
} from "@noxlimit/protocol";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { createApp } from "../src/api/app.js";
import type { FundingCoordinator, ServiceReadModel } from "../src/api/ports.js";
import { loadCatalogManifest } from "../src/catalog/load.js";
import { loadConfig } from "../src/config/env.js";
import { FundingUnavailable } from "../src/funding/unavailable.js";
import { redactSensitive, safeErrorSummary } from "../src/observability/redaction.js";
import { testAddress, testHash } from "./fixtures.js";

const openApps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

describe("public API boundary", () => {
  it("allows only the configured browser origin and handles funding preflight", async () => {
    const app = makeApp({}, noFunding(), "https://app.noxlimit.example");
    const allowed = await app.inject({
      method: "OPTIONS",
      url: "/v1/funding/challenge",
      headers: {
        origin: "https://app.noxlimit.example",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "https://app.noxlimit.example",
    );
    expect(allowed.headers["access-control-allow-methods"]).toContain("POST");
    expect(allowed.headers["access-control-allow-headers"]).toBe("content-type");
    expect(allowed.headers["access-control-allow-credentials"]).toBeUndefined();

    const rejected = await app.inject({
      method: "OPTIONS",
      url: "/v1/funding/challenge",
      headers: {
        origin: "https://attacker.example",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    expect(rejected.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("accepts canonical fractional Test USDC quotes and keeps them no-store", async () => {
    const marketId = testHash("a");
    const quote: QuoteView = {
      marketId,
      side: "YES",
      amountIn: "1.500000",
      sharesOut: "2.000000",
      averagePrice: "0.75",
      priceImpactBps: 12,
      quotedAt: "2030-01-01T00:00:00.000Z",
      quotedAtBlock: "100",
      stale: false,
    };
    const getQuote = vi.fn(async () => quote);
    const app = makeApp({ getQuote });
    const response = await app.inject({
      method: "GET",
      url: `/v1/markets/${marketId}/quote?side=YES&amount=1.500000`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toEqual(quote);
    expect(getQuote).toHaveBeenCalledWith(marketId, "YES", "1.500000");
  });

  it("forwards the OUTCOME_PRICES history mode and returns only schema-safe pool points", async () => {
    const marketId = testHash("a");
    const history: MarketHistoryView = {
      marketId,
      mode: "OUTCOME_PRICES",
      source: "FPMM_RECONSTRUCTED",
      range: "4h",
      sampling: "TERMINAL_240_MAX",
      asOf: "2030-01-01T00:00:00.000Z",
      fromBlock: "90",
      toSafeBlock: "100",
      stale: false,
      limitedHistory: false,
      points: [{
        observedAt: "2029-12-31T23:59:00.000Z",
        primaryValue: "0.53",
        secondaryValue: "0.49",
        sourceRef: "fpmm:transaction:0",
      }],
    };
    const getMarketHistory = vi.fn(async () => history);
    const app = makeApp({ getMarketHistory });
    const response = await app.inject({
      method: "GET",
      url: `/v1/markets/${marketId}/history?mode=OUTCOME_PRICES&range=4h&sampling=TERMINAL_240_MAX&limit=12`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=10, stale-while-revalidate=50");
    expect(response.json()).toEqual(history);
    expect(getMarketHistory).toHaveBeenCalledWith({
      marketId,
      mode: "OUTCOME_PRICES",
      range: "4h",
      sampling: "TERMINAL_240_MAX",
      limit: 12,
      cursor: undefined,
    });
  });

  it("rejects zero, over-precision, malformed IDs, private query fields, and orphan cursors", async () => {
    const marketId = testHash("a");
    const app = makeApp();
    for (const url of [
      `/v1/markets/${marketId}/quote?side=YES&amount=0.000000`,
      `/v1/markets/${marketId}/quote?side=YES&amount=1.0000001`,
      "/v1/markets/not-a-bytes32/quote?side=YES&amount=1",
      `/v1/markets/${marketId}/quote?side=YES&amount=1&maxPrice=0.5`,
      "/v1/markets?cursor=orphan",
    ]) {
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode, url).toBe(400);
      expect(response.body).not.toContain("maxPrice");
    }
  });

  it("fails closed when an internal projection tries to add a private field", async () => {
    const secret = "0.412345";
    const app = makeApp({
      health: vi.fn(async () => ({ ...health(), maxPrice: secret }) as HealthView),
    });
    const response = await app.inject({ method: "GET", url: "/v1/health" });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: "SERVICE_ERROR",
      message: "The service could not complete the request.",
    });
    expect(response.body).not.toContain(secret);
  });

  it("returns 503 for explicitly requested funding when the relay is unavailable", async () => {
    const app = makeApp({}, new FundingUnavailable());
    const response = await app.inject({
      method: "POST",
      url: "/v1/funding/challenge",
      payload: { address: testAddress("1"), chainId: 11_155_111 },
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "SERVICE_ERROR" });
  });
});

describe("configuration and redaction", () => {
  it("ignores unrelated shell variables while validating known service values", () => {
    const config = loadConfig({
      PATH: "/not/a/service/setting",
      RANDOM_UNRELATED_KEY: "present",
      SEPOLIA_RPC_URL: "https://rpc.example",
    });
    expect(config.SEPOLIA_RPC_URL).toBe("https://rpc.example");
    expect(config.WEB_ORIGIN).toBe("http://127.0.0.1:3000");
    expect(config.PORT).toBe(8787);
    expect(config.CATALOG_RELOAD_POINTER_PATH).toBeUndefined();
    expect(loadConfig({
      SEPOLIA_RPC_URL: "https://rpc.example",
      WEB_ORIGIN: "https://app.noxlimit.example/some/path",
      CATALOG_RELOAD_POINTER_PATH: "/var/lib/noxlimit/catalog-current.pointer",
    }).WEB_ORIGIN).toBe("https://app.noxlimit.example");
    expect(loadConfig({
      SEPOLIA_RPC_URL: "https://rpc.example",
      CATALOG_RELOAD_POINTER_PATH: "/var/lib/noxlimit/catalog-current.pointer",
    }).CATALOG_RELOAD_POINTER_PATH).toBe("/var/lib/noxlimit/catalog-current.pointer");
    expect(() => loadConfig({ SEPOLIA_RPC_URL: "not-a-url" })).toThrow();
    expect(() => loadConfig({
      SEPOLIA_RPC_URL: "https://rpc.example",
      WEB_ORIGIN: "not-an-origin",
    })).toThrow();
    expect(() => loadConfig({
      SEPOLIA_RPC_URL: "https://rpc.example",
      CATALOG_RELOAD_POINTER_PATH: "relative/catalog-current.pointer",
    })).toThrow("CATALOG_RELOAD_POINTER_PATH must be absolute");
  });

  it("resolves the committed catalog from the service package working directory", async () => {
    const manifest = await loadCatalogManifest("packages/catalog/sepolia/markets.json");
    expect(manifest.chainId).toBe(11_155_111);
    expect(manifest.markets).toEqual([]);
  });

  it("redacts signatures, candidates, private limits, circular data, and error messages", () => {
    const value: Record<string, unknown> = {
      signature: "0xsigned",
      candidateHandle: testHash("3"),
      nested: { maxAveragePrice: "0.42" },
    };
    value.self = value;
    expect(redactSensitive(value)).toEqual({
      signature: "[REDACTED]",
      candidateHandle: "[REDACTED]",
      nested: { maxAveragePrice: "[REDACTED]" },
      self: "[CIRCULAR]",
    });
    expect(safeErrorSummary(new Error("gateway included secret plaintext"))).toEqual({
      name: "Error",
    });
  });
});

function makeApp(
  overrides: Partial<ServiceReadModel> = {},
  funding: FundingCoordinator = noFunding(),
  webOrigin?: string,
): FastifyInstance {
  const readModel: ServiceReadModel = {
    listMarkets: async () => ({
      catalogRevision: testHash("f"),
      snapshot: "empty",
      items: [],
    }),
    getMarket: async () => undefined,
    getMarketHistory: async () => undefined,
    getQuote: async () => undefined,
    getOrder: async () => undefined,
    listOrders: async () => [],
    listPositions: async () => [],
    listActivity: async () => [],
    health: async () => health(),
    ...overrides,
  };
  const app = createApp({ readModel, funding, webOrigin });
  openApps.push(app);
  return app;
}

function noFunding(): FundingCoordinator {
  return {
    challenge: async (_input: FundingChallengeRequest) => {
      throw new Error("not called");
    },
    claim: async (_input: FundingClaimRequest) => {
      throw new Error("not called");
    },
  };
}

function health(): HealthView {
  return {
    status: "READY",
    chainId: 11_155_111,
    catalogRevision: testHash("f"),
    headBlock: "100",
    safeBlock: "94",
    indexerLagBlocks: "6",
    evaluator: { status: "READY", lastSuccessfulAt: "2030-01-01T00:00:00.000Z" },
    funding: { status: "UNAVAILABLE", detail: "Funding is not configured." },
    asOf: "2030-01-01T00:00:00.000Z",
  };
}
