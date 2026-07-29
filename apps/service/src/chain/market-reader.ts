import {
  liquidityProvenanceOf,
  type CatalogManifest,
  type CatalogRoute,
  type ImmutableMarketRecord,
} from "@noxlimit/catalog";
import {
  atomsToDecimal,
  averagePriceWad,
  decimalToAtoms,
  fixedProductMarketMakerAbi,
  marketHistoryViewSchema,
  marketStreamCardViewSchema,
  marketViewSchema,
  quoteViewSchema,
  TEST_USDC_DECIMALS,
  type MarketStreamCardView,
  type MarketHistoryView,
  type MarketTradeabilityReason,
  type MarketView,
  type QuoteView,
} from "@noxlimit/protocol";
import type { Address, PublicClient } from "viem";

import type { OutcomeHistorySource } from "../projections/fpmm-history-projector.js";
import type { ReplaySnapshot } from "./replay-engine.js";

const REFERENCE_AMOUNT_ATOMS = 1_000_000n;
const MAX_UINT128 = (1n << 128n) - 1n;
const CHAINLINK_PHASE_OFFSET = 64n;
const CHAINLINK_ROUND_MASK = (1n << CHAINLINK_PHASE_OFFSET) - 1n;
const CONFIRMATION_DEPTH = 6n;
const HISTORY_BATCH_SIZE = 24;
const MAX_HISTORY_ROUND_READS = 240;

const chainlinkLatestAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

const chainlinkRoundAbi = [
  {
    type: "function",
    name: "getRoundData",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint80" }],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

const chainlinkPhaseAbi = [
  {
    type: "function",
    name: "phaseAggregators",
    stateMutability: "view",
    inputs: [{ name: "phaseId", type: "uint16" }],
    outputs: [{ name: "aggregator", type: "address" }],
  },
] as const;

const chainlinkAggregatorLatestAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

const conditionalBalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

const resolverStateAbi = [
  { type: "function", name: "resolved", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "resolvedYes", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
] as const;

export type HydratedMarket = Readonly<{
  market: MarketView;
  card: MarketStreamCardView;
}>;

export type LiveMarketHistoryInput = Readonly<{
  marketId: string;
  mode?: "UNDERLYING" | "OUTCOME_PRICES";
  range?: "1h" | "4h" | "24h" | "ALL";
  sampling?: "CARD_24_MAX" | "TERMINAL_240_MAX";
  limit: number;
  cursor?: string;
}>;

/** Direct, no-cache reader for catalogued FPMM and oracle state. */
export class LiveMarketReader {
  readonly #client: PublicClient;
  readonly #records = new Map<string, ImmutableMarketRecord>();
  readonly #routes = new Map<string, CatalogRoute>();
  readonly #evaluatorAvailable: () => boolean;
  readonly #outcomeHistory: OutcomeHistorySource | undefined;

  constructor(
    client: PublicClient,
    manifest: CatalogManifest,
    evaluatorAvailable: () => boolean,
    outcomeHistory?: OutcomeHistorySource,
  ) {
    this.#client = client;
    this.#evaluatorAvailable = evaluatorAvailable;
    this.#outcomeHistory = outcomeHistory;
    for (const record of manifest.markets) this.#records.set(record.marketId.toLowerCase(), record);
    for (const route of manifest.routing) this.#routes.set(route.marketId.toLowerCase(), route);
  }

  /** Hydrate every market against the exact head/safe pair used by its completed replay. */
  async hydrateAll(snapshot: ReplaySnapshot): Promise<readonly HydratedMarket[]> {
    const output: HydratedMarket[] = [];
    if (this.#records.size === 0) return output;
    for (const record of this.#records.values()) {
      const route = this.#routes.get(record.marketId.toLowerCase());
      if (!route?.opensAt || !route.opensAtBlock) continue;
      output.push(await this.#hydrate(
        record,
        { ...route, opensAt: route.opensAt, opensAtBlock: route.opensAtBlock },
        snapshot,
      ));
    }
    return output;
  }

  async quote(marketId: string, side: "YES" | "NO", amount: string): Promise<QuoteView | undefined> {
    const record = this.#records.get(marketId.toLowerCase());
    const route = record ? this.#routes.get(record.marketId.toLowerCase()) : undefined;
    if (!record || !route || route.activation !== "ACTIVE") return undefined;
    const amountAtoms = decimalToAtoms(amount, TEST_USDC_DECIMALS);
    if (amountAtoms <= 0n) throw new RangeError("quote amount must be positive");
    if (amountAtoms > MAX_UINT128) throw new RangeError("quote amount exceeds the supported range");
    const block = await this.#client.getBlock({ blockTag: "latest" });
    const routeOpensAt = route.opensAt
      ? BigInt(Math.floor(Date.parse(route.opensAt) / 1_000))
      : BigInt(record.times.startsAt);
    if (
      block.timestamp < BigInt(record.times.startsAt) ||
      block.timestamp < routeOpensAt ||
      block.timestamp >= BigInt(record.times.tradingClosesAt)
    ) return undefined;

    const [sharesOut, referenceShares] = await Promise.all([
      this.#client.readContract({
        address: record.contracts.fpmm,
        abi: fixedProductMarketMakerAbi,
        functionName: "calcBuyAmount",
        args: [amountAtoms, side === "YES" ? 0n : 1n],
        blockNumber: block.number,
      }),
      this.#client.readContract({
        address: record.contracts.fpmm,
        abi: fixedProductMarketMakerAbi,
        functionName: "calcBuyAmount",
        args: [REFERENCE_AMOUNT_ATOMS, side === "YES" ? 0n : 1n],
        blockNumber: block.number,
      }),
    ]);
    if (sharesOut === 0n || referenceShares === 0n) return undefined;
    const average = averagePriceWad(amountAtoms, sharesOut);
    const referenceAverage = averagePriceWad(REFERENCE_AMOUNT_ATOMS, referenceShares);
    const difference = average > referenceAverage ? average - referenceAverage : 0n;
    const impact = referenceAverage === 0n ? 10_000n : (difference * 10_000n) / referenceAverage;
    return quoteViewSchema.parse({
      marketId: record.marketId,
      side,
      amountIn: atomsToDecimal(amountAtoms, TEST_USDC_DECIMALS),
      sharesOut: atomsToDecimal(sharesOut, TEST_USDC_DECIMALS),
      averagePrice: atomsToDecimal(average, 18, true),
      priceImpactBps: Number(impact > 10_000n ? 10_000n : impact),
      quotedAt: timestamp(block.timestamp),
      quotedAtBlock: block.number.toString(),
      stale: false,
    });
  }

  /** Bounded, pinned-safe-block Chainlink observations. No interpolation or synthetic points. */
  async history(input: LiveMarketHistoryInput): Promise<MarketHistoryView | undefined> {
    const record = this.#records.get(input.marketId.toLowerCase());
    const route = record ? this.#routes.get(record.marketId.toLowerCase()) : undefined;
    if (!record || !route) return undefined;
    if (input.mode === "OUTCOME_PRICES") return this.#outcomeHistory?.history(input);
    const oracle = record.oracle;
    if (oracle.source !== "CHAINLINK") return undefined;

    const head = await this.#client.getBlockNumber();
    const safeBlock = head > CONFIRMATION_DEPTH ? head - CONFIRMATION_DEPTH : 0n;
    const block = await this.#client.getBlock({ blockNumber: safeBlock });
    const latest = await this.#client.readContract({
      address: oracle.proxy,
      abi: chainlinkLatestAbi,
      functionName: "latestRoundData",
      blockNumber: safeBlock,
    });
    const [latestRoundId, latestAnswer, , latestUpdatedAt] = latest;
    if (
      latestRoundId === 0n ||
      latestAnswer <= 0n ||
      latestUpdatedAt === 0n
    ) throw new Error(`${record.marketId}: invalid latest Chainlink round`);

    const startRoundId = input.cursor
      ? decodeHistoryCursor(input.cursor, record.marketId)
      : latestRoundId;
    if (
      startRoundId > latestRoundId ||
      (startRoundId & CHAINLINK_ROUND_MASK) === 0n ||
      (startRoundId >> CHAINLINK_PHASE_OFFSET) === 0n
    ) {
      throw new RangeError("history cursor is outside the available Chainlink rounds");
    }
    const range = input.range ?? record.identity.horizon;
    const sampling = input.sampling ?? "TERMINAL_240_MAX";
    const samplingCap = sampling === "CARD_24_MAX" ? 24 : 240;
    const limit = Math.min(input.limit, samplingCap);
    const rangeSeconds = historyRangeSeconds(range);
    const cutoff = rangeSeconds === undefined || block.timestamp <= rangeSeconds
      ? 0n
      : block.timestamp - rangeSeconds;
    const points: Array<{ observedAt: string; primaryValue: string; sourceRef: string }> = [];
    let cursorRound = startRoundId;
    let rangeBoundaryReached = false;
    let sourceExhausted = false;
    let historyIncomplete = false;
    let roundReads = 0;
    let nextCursorRound: bigint | undefined;

    history: while (points.length < limit && roundReads < MAX_HISTORY_ROUND_READS) {
      const aggregatorRound = cursorRound & CHAINLINK_ROUND_MASK;
      const phase = cursorRound >> CHAINLINK_PHASE_OFFSET;
      if (aggregatorRound === 0n || phase === 0n) {
        historyIncomplete = true;
        break;
      }
      const batchCount = Math.min(
        HISTORY_BATCH_SIZE,
        MAX_HISTORY_ROUND_READS - roundReads,
        aggregatorRound > BigInt(HISTORY_BATCH_SIZE)
          ? HISTORY_BATCH_SIZE
          : Number(aggregatorRound),
      );
      const roundIds = Array.from({ length: batchCount }, (_, index) => cursorRound - BigInt(index));
      roundReads += roundIds.length;
      const rounds = await Promise.all(roundIds.map(async (roundId) => {
        try {
          return await this.#client.readContract({
            address: oracle.proxy,
            abi: chainlinkRoundAbi,
            functionName: "getRoundData",
            args: [roundId],
            blockNumber: safeBlock,
          });
        } catch {
          return undefined;
        }
      }));
      for (let index = 0; index < rounds.length && points.length < limit; index += 1) {
        const round = rounds[index];
        if (!round) continue;
        const [roundId, answer, , updatedAt] = round;
        if (
          roundId !== roundIds[index] ||
          answer <= 0n ||
          updatedAt === 0n
        ) continue;
        if (updatedAt < cutoff) {
          rangeBoundaryReached = true;
          break history;
        }
        points.push({
          observedAt: timestamp(updatedAt),
          primaryValue: atomsToDecimal(answer, oracle.feedDecimals, true),
          sourceRef: `chainlink:${oracle.proxy}:${roundId}`,
        });
        if (points.length === limit) {
          const predecessor = await this.#previousChainlinkRound(record, roundId, safeBlock);
          nextCursorRound = predecessor.roundId;
          sourceExhausted = predecessor.exhausted;
          historyIncomplete = predecessor.incomplete;
          break history;
        }
      }
      const oldestScanned = roundIds.at(-1);
      if (oldestScanned === undefined) {
        historyIncomplete = true;
        break;
      }
      const predecessor = await this.#previousChainlinkRound(record, oldestScanned, safeBlock);
      if (predecessor.roundId !== undefined) {
        cursorRound = predecessor.roundId;
      } else {
        sourceExhausted = predecessor.exhausted;
        historyIncomplete = predecessor.incomplete;
        break;
      }
    }

    if (
      !rangeBoundaryReached &&
      !sourceExhausted &&
      !historyIncomplete &&
      nextCursorRound === undefined &&
      roundReads >= MAX_HISTORY_ROUND_READS
    ) {
      nextCursorRound = cursorRound;
    }
    const oracleStale = block.timestamp > latestUpdatedAt + BigInt(record.runtimePolicy.oracleMaxAgeSeconds);
    return marketHistoryViewSchema.parse({
      marketId: record.marketId,
      mode: "UNDERLYING",
      source: "Chainlink",
      range,
      sampling,
      asOf: timestamp(block.timestamp),
      toSafeBlock: safeBlock.toString(),
      stale: oracleStale,
      limitedHistory:
        historyIncomplete ||
        nextCursorRound !== undefined ||
        (!rangeBoundaryReached && !sourceExhausted && roundReads >= MAX_HISTORY_ROUND_READS) ||
        points.length < 2,
      points: points.reverse(),
      ...(nextCursorRound !== undefined
        ? { nextCursor: encodeHistoryCursor(record.marketId, nextCursorRound) }
        : {}),
    });
  }

  async #previousChainlinkRound(
    record: ImmutableMarketRecord,
    currentRoundId: bigint,
    safeBlock: bigint,
  ): Promise<{ roundId?: bigint; exhausted: boolean; incomplete: boolean }> {
    if (record.oracle.source !== "CHAINLINK") {
      return { exhausted: false, incomplete: true };
    }
    const aggregatorRound = currentRoundId & CHAINLINK_ROUND_MASK;
    const phase = currentRoundId >> CHAINLINK_PHASE_OFFSET;
    if (phase === 0n || aggregatorRound === 0n) {
      return { exhausted: false, incomplete: true };
    }
    if (aggregatorRound > 1n) {
      return { roundId: currentRoundId - 1n, exhausted: false, incomplete: false };
    }
    if (phase === 1n) return { exhausted: true, incomplete: false };
    const priorPhase = phase - 1n;
    try {
      const aggregator = await this.#client.readContract({
        address: record.oracle.proxy,
        abi: chainlinkPhaseAbi,
        functionName: "phaseAggregators",
        args: [Number(priorPhase)],
        blockNumber: safeBlock,
      });
      const [roundId, answer, , updatedAt] = await this.#client.readContract({
        address: aggregator,
        abi: chainlinkAggregatorLatestAbi,
        functionName: "latestRoundData",
        blockNumber: safeBlock,
      });
      if (
        roundId === 0n ||
        roundId > CHAINLINK_ROUND_MASK ||
        answer <= 0n ||
        updatedAt === 0n
      ) return { exhausted: false, incomplete: true };
      return {
        roundId: (priorPhase << CHAINLINK_PHASE_OFFSET) | roundId,
        exhausted: false,
        incomplete: false,
      };
    } catch {
      return { exhausted: false, incomplete: true };
    }
  }

  async #hydrate(
    record: ImmutableMarketRecord,
    route: CatalogRoute & { opensAt: string; opensAtBlock: string },
    snapshot: ReplaySnapshot,
  ): Promise<HydratedMarket> {
    if (record.oracle.source !== "CHAINLINK") {
      throw new Error(`${record.marketId}: Pyth market cannot activate before the verified reader gate`);
    }
    const { headBlock, safeBlock } = snapshot;
    const block = await this.#client.getBlock({ blockNumber: safeBlock });
    const [round, yesQuote, noQuote, yesBalance, noBalance, resolved, resolvedYes] = await Promise.all([
      this.#client.readContract({ address: record.oracle.proxy, abi: chainlinkLatestAbi, functionName: "latestRoundData", blockNumber: safeBlock }),
      this.#client.readContract({ address: record.contracts.fpmm, abi: fixedProductMarketMakerAbi, functionName: "calcBuyAmount", args: [REFERENCE_AMOUNT_ATOMS, 0n], blockNumber: safeBlock }).catch(() => 0n),
      this.#client.readContract({ address: record.contracts.fpmm, abi: fixedProductMarketMakerAbi, functionName: "calcBuyAmount", args: [REFERENCE_AMOUNT_ATOMS, 1n], blockNumber: safeBlock }).catch(() => 0n),
      this.#client.readContract({ address: record.contracts.conditionalTokens, abi: conditionalBalanceAbi, functionName: "balanceOf", args: [record.contracts.fpmm, BigInt(record.positions.yesPositionId)], blockNumber: safeBlock }),
      this.#client.readContract({ address: record.contracts.conditionalTokens, abi: conditionalBalanceAbi, functionName: "balanceOf", args: [record.contracts.fpmm, BigInt(record.positions.noPositionId)], blockNumber: safeBlock }),
      this.#client.readContract({ address: record.contracts.resolver, abi: resolverStateAbi, functionName: "resolved", blockNumber: safeBlock }),
      this.#client.readContract({ address: record.contracts.resolver, abi: resolverStateAbi, functionName: "resolvedYes", blockNumber: safeBlock }),
    ]);
    const [, answer, , updatedAt] = round;
    if (answer <= 0n || updatedAt === 0n) throw new Error(`${record.marketId}: invalid latest oracle observation`);

    const now = block.timestamp;
    const close = BigInt(record.times.tradingClosesAt);
    const resolution = BigInt(record.times.resolvesAt);
    const lifecycle = resolved
      ? (resolvedYes ? "RESOLVED_YES" : "RESOLVED_NO")
      : now < BigInt(record.times.startsAt)
        ? "UPCOMING"
        : now < close
          ? "ORDERING_OPEN"
          : now < resolution
            ? "ORDERING_CLOSED"
            : "AWAITING_RESOLUTION";
    const depth = yesBalance < noBalance ? yesBalance : noBalance;
    const oracleStale = now > updatedAt + BigInt(record.runtimePolicy.oracleMaxAgeSeconds);
    const indexerLag = headBlock >= safeBlock ? headBlock - safeBlock : headBlock + 1n;
    const indexerUnsafe =
      headBlock < safeBlock ||
      indexerLag > BigInt(record.runtimePolicy.indexerMaxLagBlocks);
    const reasons: MarketTradeabilityReason[] = [];
    if (route.activation !== "ACTIVE") reasons.push("NOT_ACTIVE");
    if (lifecycle !== "ORDERING_OPEN") reasons.push("ORDERING_CLOSED");
    if (indexerUnsafe) reasons.push("INDEXER_UNSAFE");
    if (oracleStale) reasons.push("ORACLE_STALE");
    if (yesQuote === 0n || noQuote === 0n || depth === 0n) reasons.push("NO_LIQUIDITY");
    if (!this.#evaluatorAvailable()) reasons.push("EVALUATOR_UNAVAILABLE");
    const tradeability = reasons[0] ?? "TRADEABLE";
    const yesAverage = yesQuote === 0n ? "0" : atomsToDecimal(averagePriceWad(REFERENCE_AMOUNT_ATOMS, yesQuote), 18, true);
    const noAverage = noQuote === 0n ? "0" : atomsToDecimal(averagePriceWad(REFERENCE_AMOUNT_ATOMS, noQuote), 18, true);
    const oraclePrice = atomsToDecimal(answer, record.oracle.feedDecimals, true);
    const asOf = timestamp(now);
    const oracleObservedAt = timestamp(updatedAt);
    const badgeWindow = closingSoonWindow(record.identity.horizon);
    const activatedAt = BigInt(Math.floor(Date.parse(route.opensAt) / 1_000));
    const common = {
      marketId: record.marketId,
      chainId: 11_155_111 as const,
      asset: record.identity.asset,
      horizon: record.identity.horizon,
      question: record.question,
      strikeUsd: atomsToDecimal(BigInt(record.identity.strikePriceWad), 18, true),
      opensAt: route.opensAt,
      opensAtBlock: route.opensAtBlock,
      tradingClosesAt: timestamp(close),
      resolvesAt: timestamp(resolution),
      verification: "VERIFIED" as const,
      catalogActivation: route.activation,
      lifecycle,
      tradeability,
      tradeabilityReasons: reasons,
      badges: [
        ...(now >= activatedAt && now - activatedAt <= badgeWindow
          ? ["NEW" as const]
          : []),
        ...(close > now && close - now <= badgeWindow ? ["CLOSING_SOON" as const] : []),
        ...(depth > 0n && depth < BigInt(record.runtimePolicy.lowLiquidityDepthAtoms)
          ? ["LOW_LIQUIDITY" as const]
          : []),
        ...(oracleStale ? ["STALE" as const] : []),
      ],
      indexerSafeBlock: safeBlock.toString(),
      asOf,
    };
    const liquidityProvenance = liquidityProvenanceOf(record);
    // The FPMM calls above computed this quote during the current hydration. Confirmation depth
    // affects INDEXER_UNSAFE separately; it must not make a newly computed quote stale. The
    // ProjectionStore ages this timestamp against poolQuoteMaxAgeSeconds between polls.
    const poolQuotedAt = new Date().toISOString();
    const market = marketViewSchema.parse({
      ...common,
      comparison: ">=",
      oracle: { source: "Chainlink", priceUsd: oraclePrice, observedAt: oracleObservedAt, stale: oracleStale },
      pool: {
        referenceAmount: "1.000000",
        yesAveragePrice: yesAverage,
        noAveragePrice: noAverage,
        completeSetDepth: atomsToDecimal(depth, TEST_USDC_DECIMALS),
        completeSetDepthAtoms: depth.toString(),
        feeBps: record.pool.feeBps,
        liquidityProvenance,
        quotedAt: poolQuotedAt,
        quotedAtBlock: safeBlock.toString(),
        stale: false,
      },
      runtimePolicy: record.runtimePolicy,
      contracts: {
        resolver: record.contracts.resolver,
        conditionId: record.conditionId,
        fpmm: record.contracts.fpmm,
        orderBook: record.contracts.orderBook,
        version: record.version,
      },
    });
    const outcomePreview = this.#outcomeHistory?.preview(record.marketId, 24);
    const card = marketStreamCardViewSchema.parse({
      ...common,
      oraclePriceUsd: oraclePrice,
      oracleObservedAt,
      yesAveragePrice: yesAverage,
      noAveragePrice: noAverage,
      referenceAmount: "1.000000",
      completeSetDepth: atomsToDecimal(depth, TEST_USDC_DECIMALS),
      completeSetDepthAtoms: depth.toString(),
      liquidityProvenance,
      oracleStale,
      poolQuotedAt,
      poolQuotedAtBlock: safeBlock.toString(),
      poolStale: false,
      preview: outcomePreview && outcomePreview.points.length > 0
        ? outcomePreview
        : {
            mode: "UNDERLYING",
            source: "Chainlink",
            feedRef: record.oracle.proxy,
            asOf,
            stale: oracleStale,
            points: [{ observedAt: oracleObservedAt, priceUsd: oraclePrice }],
            limitedHistory: true,
          },
      positionInFilteredStream: 1,
      filteredStreamCount: 1,
    });
    return { market, card };
  }
}

function closingSoonWindow(horizon: ImmutableMarketRecord["identity"]["horizon"]): bigint {
  const horizonSeconds = horizon === "1h" ? 3_600n : horizon === "4h" ? 14_400n : 86_400n;
  const quarter = horizonSeconds / 4n;
  return quarter < 3_600n ? quarter : 3_600n;
}

function historyRangeSeconds(range: "1h" | "4h" | "24h" | "ALL"): bigint | undefined {
  if (range === "1h") return 3_600n;
  if (range === "4h") return 14_400n;
  if (range === "24h") return 86_400n;
  return undefined;
}

function encodeHistoryCursor(marketId: string, roundId: bigint): string {
  return Buffer.from(JSON.stringify({ marketId, roundId: roundId.toString() }), "utf8")
    .toString("base64url");
}

function decodeHistoryCursor(cursor: string, marketId: string): bigint {
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new RangeError("invalid history cursor");
  }
  if (
    !decoded ||
    typeof decoded !== "object" ||
    (decoded as { marketId?: unknown }).marketId !== marketId ||
    typeof (decoded as { roundId?: unknown }).roundId !== "string" ||
    !/^[1-9][0-9]*$/.test((decoded as { roundId: string }).roundId)
  ) throw new RangeError("invalid history cursor");
  return BigInt((decoded as { roundId: string }).roundId);
}

function timestamp(seconds: bigint): string {
  if (seconds < 0n || seconds > BigInt(Number.MAX_SAFE_INTEGER) / 1_000n) {
    throw new RangeError("timestamp is outside JavaScript Date range");
  }
  return new Date(Number(seconds) * 1_000).toISOString();
}
