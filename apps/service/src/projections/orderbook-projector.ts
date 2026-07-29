import type { CatalogManifest, ImmutableMarketRecord } from "@noxlimit/catalog";
import {
  atomsToDecimal,
  conditionalTokensAbi,
  deriveDisclosureState,
  deriveOrderStatus,
  derivePublicationMaterialState,
  noxLimitOrderBookAbi,
  orderViewSchema,
  priceBinaryResolverAbi,
  positionViewSchema,
  SOLIDITY_ORDER_STATUS,
  TEST_USDC_DECIMALS,
  type ActivityKind,
  type ActivityView,
  type OrderStatus,
  type PositionState,
} from "@noxlimit/protocol";
import {
  decodeEventLog,
  keccak256,
  toBytes,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

import type { ReplayLog, ReplayProjector } from "../chain/replay-engine.js";
import type { ProjectionStore } from "./store.js";

type Creation = Readonly<{
  record: ImmutableMarketRecord;
  orderId: bigint;
  owner: Address;
  recipient: Address;
  side: "YES" | "NO";
  amountIn: bigint;
  expiresAt: bigint;
  transactionHash: Hex;
  createdAt: string;
}>;

type Publication = Readonly<{ candidate: Hex; nonce: number }>;

type Fill = Readonly<{
  shares: bigint;
  transactionHash: Hex;
  blockNumber: bigint;
  logIndex: number;
}>;

type PositionAggregate = Readonly<{
  record: ImmutableMarketRecord;
  owner: Address;
  side: "YES" | "NO";
  acquiredShares: bigint;
  collateralSpent: bigint;
  latestFill: Fill;
}>;

const payoutRedemptionAbi = [
  {
    type: "event",
    name: "PayoutRedemption",
    anonymous: false,
    inputs: [
      { indexed: true, name: "redeemer", type: "address" },
      { indexed: true, name: "collateralToken", type: "address" },
      { indexed: true, name: "parentCollectionId", type: "bytes32" },
      { indexed: false, name: "conditionId", type: "bytes32" },
      { indexed: false, name: "indexSets", type: "uint256[]" },
      { indexed: false, name: "payout", type: "uint256" },
    ],
  },
] as const;

const resolverStateAbi = [
  { type: "function", name: "resolved", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "resolvedYes", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
] as const;

export interface PublishedValueResolver {
  publicValue(candidate: Hex): Promise<bigint>;
}

/** Event projection plus authoritative getter rereads for every known order at each safe head. */
export class OrderBookProjector implements ReplayProjector {
  readonly #client: PublicClient;
  readonly #store: ProjectionStore;
  readonly #recordsByOrderBook = new Map<string, ImmutableMarketRecord>();
  readonly #recordsByResolver = new Map<string, ImmutableMarketRecord>();
  readonly #recordsByCondition = new Map<string, ImmutableMarketRecord>();
  readonly #conditionalTokens = new Set<string>();
  readonly #creations = new Map<string, Creation>();
  readonly #publications = new Map<string, Publication>();
  readonly #publishedValues = new Map<string, bigint>();
  readonly #fills = new Map<string, Fill>();
  readonly #redemptions = new Set<string>();
  readonly #valueResolver?: PublishedValueResolver;

  constructor(input: {
    client: PublicClient;
    store: ProjectionStore;
    manifest: CatalogManifest;
    publishedValueResolver?: PublishedValueResolver;
  }) {
    this.#client = input.client;
    this.#store = input.store;
    this.#valueResolver = input.publishedValueResolver;
    for (const record of input.manifest.markets) {
      this.#recordsByOrderBook.set(record.contracts.orderBook.toLowerCase(), record);
      this.#recordsByResolver.set(record.contracts.resolver.toLowerCase(), record);
      this.#recordsByCondition.set(record.conditionId.toLowerCase(), record);
      this.#conditionalTokens.add(record.contracts.conditionalTokens.toLowerCase());
    }
  }

  reset(): void {
    this.#store.resetChainData();
    this.#creations.clear();
    this.#publications.clear();
    this.#publishedValues.clear();
    this.#fills.clear();
    this.#redemptions.clear();
  }

  async apply(log: ReplayLog): Promise<void> {
    const record = this.#recordsByOrderBook.get(log.address.toLowerCase());
    if (!record) {
      const resolverRecord = this.#recordsByResolver.get(log.address.toLowerCase());
      if (resolverRecord) {
        await this.#applyResolution(log, resolverRecord);
        return;
      }
      if (this.#conditionalTokens.has(log.address.toLowerCase())) {
        await this.#applyRedemption(log);
      }
      return;
    }
    let event: ReturnType<typeof decodeEventLog>;
    try {
      event = decodeEventLog({
        abi: noxLimitOrderBookAbi,
        data: log.data,
        topics: [...log.topics] as [] | [Hex, ...Hex[]],
        strict: true,
      });
    } catch {
      return;
    }
    const block = await this.#client.getBlock({ blockNumber: log.blockNumber });
    const occurredAt = timestamp(block.timestamp);
    const args = event.args as Record<string, unknown>;
    const orderId = typeof args.orderId === "bigint" ? args.orderId : undefined;
    if (orderId === undefined) return;
    const key = keyOf(record.contracts.orderBook, orderId);

    if (event.eventName === "OrderCreated") {
      const creation: Creation = {
        record,
        orderId,
        owner: args.owner as Address,
        recipient: args.recipient as Address,
        side: Number(args.outcomeIndex) === 0 ? "YES" : "NO",
        amountIn: args.amountIn as bigint,
        expiresAt: args.expiresAt as bigint,
        transactionHash: log.transactionHash,
        createdAt: occurredAt,
      };
      this.#creations.set(key, creation);
    } else if (event.eventName === "PublicationRequested") {
      this.#publications.set(key, {
        candidate: args.candidate as Hex,
        nonce: Number(args.nonce),
      });
    } else if (event.eventName === "Filled") {
      this.#publishedValues.set(key, args.minOut as bigint);
      this.#fills.set(key, {
        shares: args.outcomeTokens as bigint,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
      });
    }

    const creation = this.#creations.get(key);
    const activity = activityForEvent(event.eventName, {
      record,
      creation,
      orderId,
      args,
      log,
      occurredAt,
    });
    if (activity) this.#store.upsertActivity(activity);
  }

  async complete(safeBlock: bigint): Promise<void> {
    const safe = await this.#client.getBlock({ blockNumber: safeBlock });
    const resolutionByMarket = new Map<string, { resolved: boolean; resolvedYes: boolean }>();
    for (const [key, creation] of this.#creations) {
      const publication = this.#publications.get(key);
      if (publication && !this.#publishedValues.has(key) && this.#valueResolver) {
        try {
          this.#publishedValues.set(key, await this.#valueResolver.publicValue(publication.candidate));
        } catch {
          // REQUESTED is an honest public-decryption-in-progress state; retry on the next poll.
        }
      }
      const [
        onchainStatus,
        evaluationCount,
        maximumEvaluations,
        remainingEvaluations,
        lastEvaluationAt,
        minimumEvaluationInterval,
        authorizedMinOut,
      ] = await Promise.all([
        this.#client.readContract({ address: creation.record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "statusOf", args: [creation.orderId], blockNumber: safeBlock }),
        this.#client.readContract({ address: creation.record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "evaluationCountOf", args: [creation.orderId], blockNumber: safeBlock }),
        this.#client.readContract({ address: creation.record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "maximumEvaluations", blockNumber: safeBlock }),
        this.#client.readContract({ address: creation.record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "remainingEvaluations", args: [creation.orderId], blockNumber: safeBlock }),
        this.#client.readContract({ address: creation.record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "lastEvaluationAtOf", args: [creation.orderId], blockNumber: safeBlock }),
        this.#client.readContract({ address: creation.record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "minimumEvaluationInterval", blockNumber: safeBlock }),
        this.#client.readContract({ address: creation.record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "authorizedMinOutOf", args: [creation.orderId], blockNumber: safeBlock }),
      ]);
      const status = deriveOrderStatus({
        onchainStatus: Number(onchainStatus),
        nowSeconds: safe.timestamp,
        expiresAtSeconds: creation.expiresAt,
        tradingClosesAtSeconds: BigInt(creation.record.times.tradingClosesAt),
        evaluationCount: Number(evaluationCount),
        maximumEvaluations: Number(maximumEvaluations),
      });
      if (publication && !this.#publishedValues.has(key) && authorizedMinOut > 0n) {
        this.#publishedValues.set(key, authorizedMinOut);
      }
      const publicationValue = this.#publishedValues.get(key);
      const disclosureState = deriveDisclosureState(publication !== undefined);
      const publicationMaterialState = derivePublicationMaterialState(
        publication !== undefined,
        publicationValue !== undefined,
      );
      const order = orderViewSchema.parse({
        ref: {
          chainId: 11_155_111,
          orderBook: creation.record.contracts.orderBook,
          orderId: creation.orderId.toString(),
        },
        owner: creation.owner,
        recipient: creation.recipient,
        marketId: creation.record.marketId,
        side: creation.side,
        amountIn: atomsToDecimal(creation.amountIn, TEST_USDC_DECIMALS),
        disclosureState,
        publicationMaterialState,
        ...(publicationValue !== undefined
          ? { publishedMinShares: atomsToDecimal(publicationValue, TEST_USDC_DECIMALS) }
          : {}),
        createdAt: creation.createdAt,
        expiresAt: timestamp(creation.expiresAt),
        tradingClosesAt: timestamp(BigInt(creation.record.times.tradingClosesAt)),
        status,
        evaluationCount: Number(evaluationCount),
        maximumEvaluations: Number(maximumEvaluations),
        remainingEvaluations: Number(remainingEvaluations),
        ...(lastEvaluationAt !== 0n
          ? {
              lastEvaluationAt: timestamp(lastEvaluationAt),
              nextEvaluationEligibleAt: timestamp(lastEvaluationAt + BigInt(minimumEvaluationInterval)),
            }
          : {}),
        transactionHash: creation.transactionHash,
      });
      this.#store.upsertOrder(order);
    }
    await this.#projectPositions(safeBlock, safe.timestamp, resolutionByMarket);
  }

  async #applyRedemption(log: ReplayLog): Promise<void> {
    let event: ReturnType<typeof decodeEventLog>;
    try {
      event = decodeEventLog({
        abi: payoutRedemptionAbi,
        eventName: "PayoutRedemption",
        data: log.data,
        topics: [...log.topics] as [] | [Hex, ...Hex[]],
        strict: true,
      });
    } catch {
      return;
    }
    const args = event.args as {
      redeemer: Address;
      collateralToken: Address;
      conditionId: Hex;
      payout: bigint;
    };
    const record = this.#recordsByCondition.get(args.conditionId.toLowerCase());
    if (!record || args.collateralToken.toLowerCase() !== record.collateral.address.toLowerCase()) {
      return;
    }
    this.#redemptions.add(redemptionKey(args.redeemer, args.conditionId));
    const block = await this.#client.getBlock({ blockNumber: log.blockNumber });
    this.#store.upsertActivity({
      activityId: `${log.transactionHash}:${log.logIndex}`,
      kind: "POSITION_REDEEMED",
      marketId: record.marketId,
      actor: args.redeemer,
      amount: atomsToDecimal(args.payout, TEST_USDC_DECIMALS),
      occurredAt: timestamp(block.timestamp),
      blockNumber: log.blockNumber.toString(),
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
    });
  }

  async #applyResolution(log: ReplayLog, record: ImmutableMarketRecord): Promise<void> {
    let event: ReturnType<typeof decodeEventLog>;
    try {
      event = decodeEventLog({
        abi: priceBinaryResolverAbi,
        eventName: "MarketResolved",
        data: log.data,
        topics: [...log.topics] as [] | [Hex, ...Hex[]],
        strict: true,
      });
    } catch {
      return;
    }
    const args = event.args as { questionId: Hex; yesWon: boolean };
    if (args.questionId.toLowerCase() !== record.questionId.toLowerCase()) {
      throw new Error(
        `${record.marketId}: resolver emitted an unexpected question at ${log.transactionHash}:${log.logIndex}`,
      );
    }
    const block = await this.#client.getBlock({ blockNumber: log.blockNumber });
    this.#store.upsertActivity({
      activityId: `${log.transactionHash}:${log.logIndex}`,
      kind: "MARKET_RESOLVED",
      marketId: record.marketId,
      side: args.yesWon ? "YES" : "NO",
      occurredAt: timestamp(block.timestamp),
      blockNumber: log.blockNumber.toString(),
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
    });
  }

  async #projectPositions(
    safeBlock: bigint,
    now: bigint,
    resolutionByMarket: Map<string, { resolved: boolean; resolvedYes: boolean }>,
  ): Promise<void> {
    const aggregates = new Map<string, PositionAggregate>();
    for (const [key, fill] of this.#fills) {
      const creation = this.#creations.get(key);
      if (!creation) continue;
      const aggregateKey = positionAggregateKey(
        creation.recipient,
        creation.record.marketId,
        creation.side,
      );
      const existing = aggregates.get(aggregateKey);
      aggregates.set(aggregateKey, {
        record: creation.record,
        owner: creation.recipient,
        side: creation.side,
        acquiredShares: (existing?.acquiredShares ?? 0n) + fill.shares,
        collateralSpent: (existing?.collateralSpent ?? 0n) + creation.amountIn,
        latestFill: !existing || isLaterFill(fill, existing.latestFill) ? fill : existing.latestFill,
      });
    }

    const positions = [];
    for (const aggregate of aggregates.values()) {
      let resolution = resolutionByMarket.get(aggregate.record.marketId);
      if (!resolution) {
        const [resolved, resolvedYes] = await Promise.all([
          this.#client.readContract({ address: aggregate.record.contracts.resolver, abi: resolverStateAbi, functionName: "resolved", blockNumber: safeBlock }),
          this.#client.readContract({ address: aggregate.record.contracts.resolver, abi: resolverStateAbi, functionName: "resolvedYes", blockNumber: safeBlock }),
        ]);
        resolution = { resolved, resolvedYes };
        resolutionByMarket.set(aggregate.record.marketId, resolution);
      }
      const positionTokenId = aggregate.side === "YES"
        ? BigInt(aggregate.record.positions.yesPositionId)
        : BigInt(aggregate.record.positions.noPositionId);
      const currentShares = await this.#client.readContract({
        address: aggregate.record.contracts.conditionalTokens,
        abi: conditionalTokensAbi,
        functionName: "balanceOf",
        args: [aggregate.owner, positionTokenId],
        blockNumber: safeBlock,
      });
      const redemptionObserved = this.#redemptions.has(
        redemptionKey(aggregate.owner, aggregate.record.conditionId),
      );
      // A zero balance without a redemption event is a transfer (or another external disposal),
      // not evidence of redemption. Excluding it avoids falsely presenting a redeemable holding.
      if (currentShares === 0n && !redemptionObserved) continue;
      const won = resolution.resolved &&
        (aggregate.side === "YES") === resolution.resolvedYes;
      const state: PositionState = currentShares === 0n && redemptionObserved
        ? "REDEEMED"
        : resolution.resolved
          ? (won ? "REDEEMABLE" : "SETTLED_ZERO")
          : now >= BigInt(aggregate.record.times.resolvesAt)
            ? "AWAITING_RESOLUTION"
            : "OPEN";
      positions.push(positionViewSchema.parse({
        positionId: aggregatePositionId(
          aggregate.owner,
          aggregate.record.marketId,
          aggregate.side,
        ),
        marketId: aggregate.record.marketId,
        owner: aggregate.owner,
        side: aggregate.side,
        shares: atomsToDecimal(currentShares, TEST_USDC_DECIMALS),
        collateralSpent: atomsToDecimal(aggregate.collateralSpent, TEST_USDC_DECIMALS),
        realizedAveragePrice: atomsToDecimal(
          (aggregate.collateralSpent * 10n ** 18n + aggregate.acquiredShares - 1n) /
            aggregate.acquiredShares,
          18,
          true,
        ),
        maximumRedemption: atomsToDecimal(
          resolution.resolved && !won ? 0n : currentShares,
          TEST_USDC_DECIMALS,
        ),
        state,
        fillTransactionHash: aggregate.latestFill.transactionHash,
      }));
    }
    this.#store.replacePositions(positions);
  }
}

function activityForEvent(
  eventName: string,
  input: {
    record: ImmutableMarketRecord;
    creation?: Creation;
    orderId: bigint;
    args: Record<string, unknown>;
    log: ReplayLog;
    occurredAt: string;
  },
): ActivityView | undefined {
  const kind = eventName === "Terminal"
    ? terminalActivityKind(Number(input.args.status))
    : activityKind(eventName);
  if (!kind) return undefined;
  const side = input.creation?.side;
  const amount = eventName === "Filled"
    ? atomsToDecimal(input.args.outcomeTokens as bigint, TEST_USDC_DECIMALS)
    : eventName === "Refunded"
      ? atomsToDecimal(input.args.amount as bigint, TEST_USDC_DECIMALS)
      : input.creation
        ? atomsToDecimal(input.creation.amountIn, TEST_USDC_DECIMALS)
        : undefined;
  return {
    activityId: `${input.log.transactionHash}:${input.log.logIndex}`,
    kind,
    marketId: input.record.marketId,
    ...(input.creation?.owner ? { actor: input.creation.owner } : {}),
    orderRef: {
      chainId: 11_155_111,
      orderBook: input.record.contracts.orderBook,
      orderId: input.orderId.toString(),
    },
    ...(amount ? { amount } : {}),
    ...(side ? { side } : {}),
    occurredAt: input.occurredAt,
    blockNumber: input.log.blockNumber.toString(),
    transactionHash: input.log.transactionHash,
    logIndex: input.log.logIndex,
  };
}

function activityKind(eventName: string): ActivityKind | undefined {
  switch (eventName) {
    case "OrderCreated": return "ORDER_CREATED";
    case "EvaluationRequested": return "EVALUATION_REQUESTED";
    case "EvaluationReopened": return "EVALUATION_REOPENED";
    case "PublicationRequested": return "PUBLICATION_REQUESTED";
    case "Filled": return "ORDER_FILLED";
    case "ExecutionFailed": return "EXECUTION_FAILED";
    case "Refunded": return "ORDER_REFUNDED";
    default: return undefined;
  }
}

function terminalActivityKind(status: number): ActivityKind | undefined {
  if (status === SOLIDITY_ORDER_STATUS.Cancelled) return "ORDER_CANCELLED";
  if (status === SOLIDITY_ORDER_STATUS.Expired) return "ORDER_EXPIRED";
  return undefined;
}

function aggregatePositionId(owner: Address, marketId: Hex, side: "YES" | "NO"): Hex {
  return keccak256(toBytes(positionAggregateKey(owner, marketId, side)));
}

function positionAggregateKey(owner: Address, marketId: string, side: "YES" | "NO"): string {
  return `${owner.toLowerCase()}:${marketId.toLowerCase()}:${side}`;
}

function redemptionKey(owner: Address, conditionId: Hex): string {
  return `${owner.toLowerCase()}:${conditionId.toLowerCase()}`;
}

function isLaterFill(left: Fill, right: Fill): boolean {
  return left.blockNumber > right.blockNumber ||
    (left.blockNumber === right.blockNumber && left.logIndex > right.logIndex);
}

function keyOf(orderBook: Address, orderId: bigint): string {
  return `${orderBook.toLowerCase()}:${orderId}`;
}

function timestamp(seconds: bigint): string {
  return new Date(Number(seconds) * 1_000).toISOString();
}
