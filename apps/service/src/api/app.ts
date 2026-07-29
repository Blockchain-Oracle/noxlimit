import cors from "@fastify/cors";
import Fastify, { LogController, type FastifyInstance } from "fastify";
import {
  activityViewSchema,
  fundingChallengeRequestSchema,
  fundingChallengeResponseSchema,
  fundingClaimRequestSchema,
  fundingClaimResponseSchema,
  healthViewSchema,
  marketHistoryViewSchema,
  marketListPageSchema,
  marketViewSchema,
  orderViewSchema,
  positionViewSchema,
  quoteViewSchema,
  type OrderRef,
} from "@noxlimit/protocol";

import { serviceLoggerRedactPaths } from "../observability/redaction.js";
import type { FundingCoordinator, ServiceReadModel } from "./ports.js";

const ADDRESS_PATTERN = "^0x[0-9a-fA-F]{40}$";
const DECIMAL_PATTERN = "^(0|[1-9][0-9]*)$";
const DECIMAL_AMOUNT_PATTERN = "^(0|[1-9][0-9]*)(?:\\.[0-9]{1,6})?$";
const BYTES32_PATTERN = "^0x[0-9a-fA-F]{64}$";

export type AppDependencies = Readonly<{
  readModel: ServiceReadModel;
  funding: FundingCoordinator;
  webOrigin?: string;
  logger?: boolean;
}>;

export function createApp(dependencies: AppDependencies): FastifyInstance {
  const webOrigin = dependencies.webOrigin ?? "http://127.0.0.1:3000";
  const app = Fastify({
    logger: dependencies.logger
      ? { redact: { paths: [...serviceLoggerRedactPaths], censor: "[REDACTED]" } }
      : false,
    logController: new LogController({ disableRequestLogging: true }),
    ajv: { customOptions: { removeAdditional: false } },
  });

  void app.register(cors, {
    origin(origin, callback) {
      callback(null, origin === webOrigin);
    },
    methods: ["GET", "HEAD", "POST", "OPTIONS"],
    allowedHeaders: ["content-type"],
    credentials: false,
    maxAge: 600,
    preflight: true,
    strictPreflight: true,
  });

  app.setErrorHandler((error, _request, reply) => {
    const explicitStatus = typeof error === "object" && error !== null && "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : undefined;
    const requestValidationFailure =
      typeof error === "object" && error !== null && "validation" in error;
    const statusCode = explicitStatus && explicitStatus >= 400 && explicitStatus < 600
      ? explicitStatus
      : requestValidationFailure
        ? 400
        : 500;
    const message = requestValidationFailure
      ? "Request validation failed."
      : statusCode < 500 && error instanceof Error
        ? error.message
        : "The service could not complete the request.";
    reply.status(statusCode).send({
      error: statusCode >= 500 ? "SERVICE_ERROR" : "INVALID_REQUEST",
      message,
    });
  });

  app.get<{ Querystring: MarketsQuery }>(
    "/v1/markets",
    { schema: { querystring: marketsQuerySchema } },
    async (request, reply) => {
      requirePaginationPair(request.query.cursor, request.query.snapshot);
      const limit = parseBoundedLimit(request.query.limit, 20, 50);
      const page = await dependencies.readModel.listMarkets({
        asset: request.query.asset,
        horizon: request.query.horizon,
        lifecycle: request.query.lifecycle,
        sort: request.query.sort ?? "CLOSING_SOON",
        limit,
        cursor: request.query.cursor,
        snapshot: request.query.snapshot,
      });
      reply.header("cache-control", "public, max-age=5, stale-while-revalidate=25");
      return marketListPageSchema.parse(page);
    },
  );

  app.get<{ Params: MarketParams }>(
    "/v1/markets/:marketId",
    { schema: { params: marketParamsSchema } },
    async (request, reply) => {
      const market = await dependencies.readModel.getMarket(request.params.marketId);
      if (!market) return reply.status(404).send({ error: "MARKET_NOT_FOUND" });
      reply.header("cache-control", "public, max-age=5, stale-while-revalidate=25");
      return marketViewSchema.parse(market);
    },
  );

  app.get<{ Params: MarketParams; Querystring: HistoryQuery }>(
    "/v1/markets/:marketId/history",
    { schema: { params: marketParamsSchema, querystring: historyQuerySchema } },
    async (request, reply) => {
      let history;
      try {
        history = await dependencies.readModel.getMarketHistory({
          marketId: request.params.marketId,
          mode: request.query.mode,
          range: request.query.range,
          sampling: request.query.sampling,
          limit: parseBoundedLimit(request.query.limit, 240, 240),
          cursor: request.query.cursor,
        });
      } catch (error) {
        if (error instanceof RangeError) throw new RequestValidationError(error.message);
        throw error;
      }
      if (!history) return reply.status(404).send({ error: "MARKET_NOT_FOUND" });
      reply.header("cache-control", "public, max-age=10, stale-while-revalidate=50");
      return marketHistoryViewSchema.parse(history);
    },
  );

  app.get<{ Params: MarketParams; Querystring: QuoteQuery }>(
    "/v1/markets/:marketId/quote",
    { schema: { params: marketParamsSchema, querystring: quoteQuerySchema } },
    async (request, reply) => {
      if (/^0(?:\.0+)?$/.test(request.query.amount)) {
        throw new RequestValidationError("quote amount must be positive");
      }
      let quote;
      try {
        quote = await dependencies.readModel.getQuote(
          request.params.marketId,
          request.query.side,
          request.query.amount,
        );
      } catch (error) {
        if (error instanceof RangeError) throw new RequestValidationError(error.message);
        throw error;
      }
      if (!quote) return reply.status(404).send({ error: "QUOTE_UNAVAILABLE" });
      reply.header("cache-control", "no-store");
      return quoteViewSchema.parse(quote);
    },
  );

  app.get<{ Params: OrderParams }>(
    "/v1/orders/:chainId/:orderBook/:orderId",
    { schema: { params: orderParamsSchema } },
    async (request, reply) => {
      const parsedChainId = Number(request.params.chainId);
      if (parsedChainId !== 11_155_111) {
        return reply.status(404).send({ error: "ORDER_NOT_FOUND" });
      }
      const orderRef: OrderRef = {
        chainId: 11_155_111,
        orderBook: request.params.orderBook,
        orderId: request.params.orderId,
      };
      const order = await dependencies.readModel.getOrder(orderRef);
      if (!order) return reply.status(404).send({ error: "ORDER_NOT_FOUND" });
      reply.header("cache-control", "no-store");
      return orderViewSchema.parse(order);
    },
  );

  app.get<{ Querystring: OwnerQuery }>(
    "/v1/orders",
    { schema: { querystring: ownerQuerySchema } },
    async (request, reply) => {
      reply.header("cache-control", "no-store");
      return orderViewSchema.array().parse(await dependencies.readModel.listOrders(request.query.owner));
    },
  );

  app.get<{ Querystring: OwnerQuery }>(
    "/v1/positions",
    { schema: { querystring: ownerQuerySchema } },
    async (request, reply) => {
      reply.header("cache-control", "no-store");
      return positionViewSchema.array().parse(
        await dependencies.readModel.listPositions(request.query.owner),
      );
    },
  );

  app.get<{ Querystring: ActivityQuery }>(
    "/v1/activity",
    { schema: { querystring: activityQuerySchema } },
    async (request, reply) => {
      if (!request.query.marketId && !request.query.owner) {
        return reply.status(400).send({ error: "ACTIVITY_SCOPE_REQUIRED" });
      }
      reply.header("cache-control", "no-store");
      return activityViewSchema.array().parse(
        await dependencies.readModel.listActivity(request.query),
      );
    },
  );

  app.get("/v1/health", async (_request, reply) => {
    reply.header("cache-control", "no-store");
    return healthViewSchema.parse(await dependencies.readModel.health());
  });

  app.post<{ Body: unknown }>(
    "/v1/funding/challenge",
    { schema: { body: fundingBodySchema } },
    async (request, reply) => {
      const input = fundingChallengeRequestSchema.parse(request.body);
      reply.header("cache-control", "no-store");
      return fundingChallengeResponseSchema.parse(await dependencies.funding.challenge(input));
    },
  );

  app.post<{ Body: unknown }>(
    "/v1/funding/claim",
    { schema: { body: fundingClaimBodySchema } },
    async (request, reply) => {
      const input = fundingClaimRequestSchema.parse(request.body);
      reply.header("cache-control", "no-store");
      return fundingClaimResponseSchema.parse(await dependencies.funding.claim(input));
    },
  );

  return app;
}

function parseBoundedLimit(value: string | undefined, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new RequestValidationError(`limit must be between 1 and ${maximum}`);
  }
  return parsed;
}

function requirePaginationPair(cursor: string | undefined, snapshot: string | undefined): void {
  if ((cursor === undefined) !== (snapshot === undefined)) {
    throw new RequestValidationError("cursor and snapshot must be provided together");
  }
}

class RequestValidationError extends Error {
  readonly statusCode = 400;
}

type MarketsQuery = {
  asset?: "BTC/USD" | "ETH/USD" | "SOL/USD";
  horizon?: "1h" | "4h" | "24h";
  lifecycle?: "LIVE" | "RESOLVING" | "RESOLVED";
  sort?: "CLOSING_SOON" | "RECENTLY_OPENED" | "LIQUIDITY";
  limit?: string;
  cursor?: string;
  snapshot?: string;
};
type MarketParams = { marketId: string };
type HistoryQuery = {
  mode?: "UNDERLYING" | "OUTCOME_PRICES";
  range?: "1h" | "4h" | "24h" | "ALL";
  sampling?: "CARD_24_MAX" | "TERMINAL_240_MAX";
  limit?: string;
  cursor?: string;
};
type QuoteQuery = { side: "YES" | "NO"; amount: string };
type OwnerQuery = { owner: `0x${string}` };
type ActivityQuery = { marketId?: string; owner?: `0x${string}` };
type OrderParams = {
  chainId: string;
  orderBook: `0x${string}`;
  orderId: string;
};

const marketParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["marketId"],
  properties: { marketId: { type: "string", pattern: BYTES32_PATTERN } },
} as const;
const marketsQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    asset: { type: "string", enum: ["BTC/USD", "ETH/USD", "SOL/USD"] },
    horizon: { type: "string", enum: ["1h", "4h", "24h"] },
    lifecycle: { type: "string", enum: ["LIVE", "RESOLVING", "RESOLVED"] },
    sort: { type: "string", enum: ["CLOSING_SOON", "RECENTLY_OPENED", "LIQUIDITY"] },
    limit: { type: "string", pattern: "^[0-9]+$" },
    cursor: { type: "string", minLength: 1 },
    snapshot: { type: "string", minLength: 1 },
  },
} as const;
const historyQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["UNDERLYING", "OUTCOME_PRICES"] },
    range: { type: "string", enum: ["1h", "4h", "24h", "ALL"] },
    sampling: { type: "string", enum: ["CARD_24_MAX", "TERMINAL_240_MAX"] },
    limit: { type: "string", pattern: "^[0-9]+$" },
    cursor: { type: "string", minLength: 1 },
  },
} as const;
const quoteQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["side", "amount"],
  properties: {
    side: { type: "string", enum: ["YES", "NO"] },
    amount: { type: "string", pattern: DECIMAL_AMOUNT_PATTERN, maxLength: 64 },
  },
} as const;
const ownerQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["owner"],
  properties: { owner: { type: "string", pattern: ADDRESS_PATTERN } },
} as const;
const activityQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    marketId: { type: "string", pattern: BYTES32_PATTERN },
    owner: { type: "string", pattern: ADDRESS_PATTERN },
  },
} as const;
const orderParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["chainId", "orderBook", "orderId"],
  properties: {
    chainId: { type: "string", pattern: "^[1-9][0-9]*$" },
    orderBook: { type: "string", pattern: ADDRESS_PATTERN },
    orderId: { type: "string", pattern: DECIMAL_PATTERN },
  },
} as const;
const fundingBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["address", "chainId"],
  properties: {
    address: { type: "string", pattern: ADDRESS_PATTERN },
    chainId: { type: "integer", const: 11155111 },
  },
} as const;
const fundingClaimBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["challengeId", "address", "signature"],
  properties: {
    challengeId: { type: "string", pattern: BYTES32_PATTERN },
    address: { type: "string", pattern: ADDRESS_PATTERN },
    signature: { type: "string", pattern: "^0x[0-9a-fA-F]{130}$" },
  },
} as const;
