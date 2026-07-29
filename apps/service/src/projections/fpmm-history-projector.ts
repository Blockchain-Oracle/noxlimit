import type { CatalogManifest, ImmutableMarketRecord } from "@noxlimit/catalog";
import {
  atomsToDecimal,
  averagePriceWad,
  marketHistoryViewSchema,
  type MarketHistoryView,
} from "@noxlimit/protocol";
import {
  decodeEventLog,
  parseAbi,
  type Hex,
  type PublicClient,
} from "viem";

import type { MarketHistoryInput } from "../api/ports.js";
import type { ReplayLog, ReplayProjector } from "../chain/replay-engine.js";

const ONE = 10n ** 18n;
const REFERENCE_AMOUNT_ATOMS = 1_000_000n;
const DEFAULT_MAX_POINTS_PER_MARKET = 2_048;

export const fpmmHistoryAbi = parseAbi([
  "event FPMMFundingAdded(address indexed funder,uint256[] amountsAdded,uint256 sharesMinted)",
  "event FPMMFundingRemoved(address indexed funder,uint256[] amountsRemoved,uint256 collateralRemovedFromFeePool,uint256 sharesBurnt)",
  "event FPMMBuy(address indexed buyer,uint256 investmentAmount,uint256 feeAmount,uint256 indexed outcomeIndex,uint256 outcomeTokensBought)",
  "event FPMMSell(address indexed seller,uint256 returnAmount,uint256 feeAmount,uint256 indexed outcomeIndex,uint256 outcomeTokensSold)",
]);

type ReconstructedPoint = Readonly<{
  blockNumber: bigint;
  observedAt: string;
  sourceRef: string;
  yesAveragePrice: string;
  noAveragePrice: string;
}>;

type MarketState = {
  readonly record: ImmutableMarketRecord;
  reserves: [bigint, bigint];
  readonly points: ReconstructedPoint[];
  droppedPoints: boolean;
};

type HistoryCursor = Readonly<{
  marketId: string;
  toSafeBlock: string;
  safeBlockHash: Hex;
  asOf: string;
  beforeSourceRef: string;
}>;

export type OutcomePricePreview = Readonly<{
  mode: "OUTCOME_PRICES";
  source: "FPMM_RECONSTRUCTED";
  asOf: string;
  asOfBlock: string;
  stale: boolean;
  points: readonly Readonly<{
    observedAt: string;
    yesAveragePrice: string;
    noAveragePrice: string;
  }>[];
  limitedHistory: boolean;
}>;

export interface OutcomeHistorySource {
  history(input: MarketHistoryInput): MarketHistoryView | undefined;
  preview(marketId: string, maximumPoints?: number): OutcomePricePreview | undefined;
}

/**
 * Rebuildable, log-ordered FPMM reserve projection.
 *
 * Every emitted point is the exact one-Test-USDC fixed-input average quote implied by reserves
 * after a real funding or completed trade event. The projector never interpolates between logs.
 */
export class FpmmHistoryProjector implements ReplayProjector, OutcomeHistorySource {
  readonly #client: PublicClient;
  readonly #statesByFpmm = new Map<string, MarketState>();
  readonly #statesByMarket = new Map<string, MarketState>();
  readonly #blockTimestamps = new Map<bigint, bigint>();
  readonly #completedSafeBlockHashes = new Map<bigint, Hex>();
  readonly #maximumPoints: number;
  #safeBlock: bigint | undefined;
  #safeTimestamp: bigint | undefined;

  constructor(
    client: PublicClient,
    manifest: CatalogManifest,
    maximumPoints = DEFAULT_MAX_POINTS_PER_MARKET,
  ) {
    if (!Number.isSafeInteger(maximumPoints) || maximumPoints < 240) {
      throw new RangeError("FPMM history capacity must be an integer of at least 240 points");
    }
    this.#client = client;
    this.#maximumPoints = maximumPoints;
    for (const record of manifest.markets) {
      const state: MarketState = {
        record,
        reserves: [0n, 0n],
        points: [],
        droppedPoints: false,
      };
      this.#statesByFpmm.set(record.contracts.fpmm.toLowerCase(), state);
      this.#statesByMarket.set(record.marketId.toLowerCase(), state);
    }
  }

  reset(): void {
    this.#safeBlock = undefined;
    this.#safeTimestamp = undefined;
    this.#blockTimestamps.clear();
    this.#completedSafeBlockHashes.clear();
    for (const state of this.#statesByMarket.values()) {
      state.reserves = [0n, 0n];
      state.points.length = 0;
      state.droppedPoints = false;
    }
  }

  async apply(log: ReplayLog): Promise<void> {
    const state = this.#statesByFpmm.get(log.address.toLowerCase());
    if (!state) return;
    let decoded: ReturnType<typeof decodeEventLog<typeof fpmmHistoryAbi>>;
    try {
      decoded = decodeEventLog({
        abi: fpmmHistoryAbi,
        data: log.data,
        topics: [...log.topics] as [] | [Hex, ...Hex[]],
      });
    } catch {
      // The shared replay target also sees ERC-20 Transfer/Approval logs from the FPMM itself.
      return;
    }

    switch (decoded.eventName) {
      case "FPMMFundingAdded": {
        const [yes, no] = binaryAmounts(decoded.args.amountsAdded, "funding addition");
        state.reserves = [state.reserves[0] + yes, state.reserves[1] + no];
        break;
      }
      case "FPMMFundingRemoved": {
        const [yes, no] = binaryAmounts(decoded.args.amountsRemoved, "funding removal");
        state.reserves = [
          checkedSubtract(state.reserves[0], yes, "YES funding removal"),
          checkedSubtract(state.reserves[1], no, "NO funding removal"),
        ];
        break;
      }
      case "FPMMBuy": {
        const outcomeIndex = binaryOutcome(decoded.args.outcomeIndex);
        const feeWad = feeWadOf(state.record);
        const expectedFee = (decoded.args.investmentAmount * feeWad) / ONE;
        if (decoded.args.feeAmount !== expectedFee) {
          throw projectionError(state.record, log, "buy fee does not match immutable FPMM policy");
        }
        const expectedBought = calcBuyAmount(
          state.reserves,
          decoded.args.investmentAmount,
          outcomeIndex,
          feeWad,
        );
        if (decoded.args.outcomeTokensBought !== expectedBought) {
          throw projectionError(state.record, log, "buy amount does not match reconstructed reserves");
        }
        const netInvestment = decoded.args.investmentAmount - decoded.args.feeAmount;
        const next: [bigint, bigint] = [
          state.reserves[0] + netInvestment,
          state.reserves[1] + netInvestment,
        ];
        next[outcomeIndex] = checkedSubtract(
          next[outcomeIndex],
          decoded.args.outcomeTokensBought,
          "bought outcome reserve",
        );
        state.reserves = next;
        break;
      }
      case "FPMMSell": {
        const outcomeIndex = binaryOutcome(decoded.args.outcomeIndex);
        const feeWad = feeWadOf(state.record);
        const expectedFee = (decoded.args.returnAmount * feeWad) / (ONE - feeWad);
        if (decoded.args.feeAmount !== expectedFee) {
          throw projectionError(state.record, log, "sell fee does not match immutable FPMM policy");
        }
        const expectedSold = calcSellAmount(
          state.reserves,
          decoded.args.returnAmount,
          outcomeIndex,
          feeWad,
        );
        if (decoded.args.outcomeTokensSold !== expectedSold) {
          throw projectionError(state.record, log, "sell amount does not match reconstructed reserves");
        }
        const returnedCompleteSets = decoded.args.returnAmount + decoded.args.feeAmount;
        const next: [bigint, bigint] = [...state.reserves];
        next[outcomeIndex] += decoded.args.outcomeTokensSold;
        next[0] = checkedSubtract(next[0], returnedCompleteSets, "YES sell merge");
        next[1] = checkedSubtract(next[1], returnedCompleteSets, "NO sell merge");
        state.reserves = next;
        break;
      }
    }

    const prices = referencePrices(state.reserves, feeWadOf(state.record));
    if (!prices) return;
    const observedAt = timestamp(await this.#blockTimestamp(log.blockNumber));
    state.points.push({
      blockNumber: log.blockNumber,
      observedAt,
      sourceRef: `fpmm:${log.address}:${log.blockHash}:${log.transactionHash}:${log.logIndex}`,
      yesAveragePrice: prices.yesAveragePrice,
      noAveragePrice: prices.noAveragePrice,
    });
    if (state.points.length > this.#maximumPoints) {
      state.points.splice(0, state.points.length - this.#maximumPoints);
      state.droppedPoints = true;
    }
  }

  async complete(safeBlock: bigint): Promise<void> {
    const block = await this.#client.getBlock({ blockNumber: safeBlock });
    if (!block.hash) throw new Error(`safe block ${safeBlock} has no canonical hash`);
    this.#safeBlock = safeBlock;
    this.#safeTimestamp = block.timestamp;
    this.#blockTimestamps.set(safeBlock, block.timestamp);
    this.#completedSafeBlockHashes.set(safeBlock, block.hash);
    while (this.#completedSafeBlockHashes.size > 2_048) {
      const oldest = this.#completedSafeBlockHashes.keys().next().value as bigint | undefined;
      if (oldest === undefined) break;
      this.#completedSafeBlockHashes.delete(oldest);
    }
  }

  history(input: MarketHistoryInput): MarketHistoryView | undefined {
    const state = this.#statesByMarket.get(input.marketId.toLowerCase());
    if (!state || this.#safeBlock === undefined || this.#safeTimestamp === undefined) return undefined;
    const range = input.range ?? state.record.identity.horizon;
    const sampling = input.sampling ?? "TERMINAL_240_MAX";
    const maximum = sampling === "CARD_24_MAX" ? 24 : 240;
    const limit = Math.min(input.limit, maximum);
    const decodedCursor = input.cursor
      ? decodeCursor(input.cursor, state.record.marketId)
      : undefined;
    const snapshotSafeBlock = decodedCursor
      ? BigInt(decodedCursor.toSafeBlock)
      : this.#safeBlock;
    const snapshotSafeHash = decodedCursor?.safeBlockHash ??
      this.#completedSafeBlockHashes.get(snapshotSafeBlock);
    const snapshotAsOf = decodedCursor?.asOf ?? timestamp(this.#safeTimestamp);
    if (snapshotSafeBlock > this.#safeBlock) {
      throw new RangeError("outcome history cursor points beyond the current safe block");
    }
    const canonicalSafeHash = this.#completedSafeBlockHashes.get(snapshotSafeBlock);
    if (
      !snapshotSafeHash ||
      !canonicalSafeHash ||
      snapshotSafeHash.toLowerCase() !== canonicalSafeHash.toLowerCase()
    ) {
      throw new RangeError("outcome history cursor is no longer on the canonical projection");
    }
    const snapshotSeconds = isoSeconds(snapshotAsOf);
    const rangeSeconds = historyRangeSeconds(range);
    const cutoff = rangeSeconds === undefined || snapshotSeconds <= rangeSeconds
      ? 0n
      : snapshotSeconds - rangeSeconds;
    const available = state.points.filter(
      (point) => point.blockNumber <= snapshotSafeBlock && isoSeconds(point.observedAt) >= cutoff,
    );
    let end = available.length;
    if (decodedCursor) {
      const anchor = available.findIndex(
        (point) => point.sourceRef === decodedCursor.beforeSourceRef,
      );
      if (anchor < 0) {
        throw new RangeError("outcome history cursor is no longer in the canonical projection");
      }
      end = anchor;
    }
    const start = Math.max(0, end - limit);
    const selected = available.slice(start, end);
    const hasMore = start > 0;
    const limitedHistory =
      state.droppedPoints ||
      hasMore ||
      decodedCursor !== undefined ||
      available.length < 2;
    return marketHistoryViewSchema.parse({
      marketId: state.record.marketId,
      mode: "OUTCOME_PRICES",
      source: "FPMM_RECONSTRUCTED",
      range,
      sampling,
      asOf: snapshotAsOf,
      ...(selected[0] ? { fromBlock: selected[0].blockNumber.toString() } : {}),
      toSafeBlock: snapshotSafeBlock.toString(),
      stale: false,
      limitedHistory,
      points: selected.map((point) => ({
        observedAt: point.observedAt,
        primaryValue: point.yesAveragePrice,
        secondaryValue: point.noAveragePrice,
        sourceRef: point.sourceRef,
      })),
      ...(hasMore && selected[0]
        ? {
            nextCursor: encodeCursor({
              marketId: state.record.marketId,
              toSafeBlock: snapshotSafeBlock.toString(),
              safeBlockHash: snapshotSafeHash,
              asOf: snapshotAsOf,
              beforeSourceRef: selected[0].sourceRef,
            }),
          }
        : {}),
    });
  }

  preview(marketId: string, maximumPoints = 24): OutcomePricePreview | undefined {
    const state = this.#statesByMarket.get(marketId.toLowerCase());
    if (!state || this.#safeBlock === undefined || this.#safeTimestamp === undefined) return undefined;
    if (!Number.isSafeInteger(maximumPoints) || maximumPoints < 1 || maximumPoints > 24) {
      throw new RangeError("outcome preview maximum must be between 1 and 24");
    }
    const available = state.points.filter((point) => point.blockNumber <= this.#safeBlock!);
    const points = available.slice(-maximumPoints);
    return {
      mode: "OUTCOME_PRICES",
      source: "FPMM_RECONSTRUCTED",
      asOf: timestamp(this.#safeTimestamp),
      asOfBlock: this.#safeBlock.toString(),
      stale: false,
      points: points.map((point) => ({
        observedAt: point.observedAt,
        yesAveragePrice: point.yesAveragePrice,
        noAveragePrice: point.noAveragePrice,
      })),
      limitedHistory: state.droppedPoints || available.length > maximumPoints || points.length < 2,
    };
  }

  async #blockTimestamp(blockNumber: bigint): Promise<bigint> {
    const cached = this.#blockTimestamps.get(blockNumber);
    if (cached !== undefined) return cached;
    const block = await this.#client.getBlock({ blockNumber });
    this.#blockTimestamps.set(blockNumber, block.timestamp);
    return block.timestamp;
  }
}

function feeWadOf(record: ImmutableMarketRecord): bigint {
  return BigInt(record.pool.feeBps) * 100_000_000_000_000n;
}

function binaryAmounts(values: readonly bigint[], label: string): [bigint, bigint] {
  if (values.length !== 2 || values[0] === undefined || values[1] === undefined) {
    throw new Error(`FPMM ${label} must contain exactly two outcomes`);
  }
  return [values[0], values[1]];
}

function binaryOutcome(value: bigint): 0 | 1 {
  if (value !== 0n && value !== 1n) throw new Error(`FPMM outcome index ${value} is not binary`);
  return value === 0n ? 0 : 1;
}

function checkedSubtract(value: bigint, amount: bigint, label: string): bigint {
  if (amount > value) throw new Error(`FPMM ${label} underflows reconstructed reserves`);
  return value - amount;
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError("FPMM reconstruction denominator must be positive");
  return numerator === 0n ? 0n : 1n + (numerator - 1n) / denominator;
}

export function calcBuyAmount(
  reserves: readonly [bigint, bigint],
  investmentAmount: bigint,
  outcomeIndex: 0 | 1,
  feeWad: bigint,
): bigint {
  if (investmentAmount <= 0n || feeWad < 0n || feeWad >= ONE) {
    throw new RangeError("invalid FPMM buy inputs");
  }
  const net = investmentAmount - (investmentAmount * feeWad) / ONE;
  const otherIndex = outcomeIndex === 0 ? 1 : 0;
  const buyBalance = reserves[outcomeIndex];
  const otherBalance = reserves[otherIndex];
  if (buyBalance === 0n || otherBalance === 0n) return 0n;
  const endingScaled = ceilDiv(
    buyBalance * ONE * otherBalance,
    otherBalance + net,
  );
  return buyBalance + net - ceilDiv(endingScaled, ONE);
}

export function calcSellAmount(
  reserves: readonly [bigint, bigint],
  returnAmount: bigint,
  outcomeIndex: 0 | 1,
  feeWad: bigint,
): bigint {
  if (returnAmount <= 0n || feeWad < 0n || feeWad >= ONE) {
    throw new RangeError("invalid FPMM sell inputs");
  }
  const returnWithFees = (returnAmount * ONE) / (ONE - feeWad);
  const otherIndex = outcomeIndex === 0 ? 1 : 0;
  const sellBalance = reserves[outcomeIndex];
  const otherBalance = reserves[otherIndex];
  if (sellBalance === 0n || otherBalance <= returnWithFees) return 0n;
  const endingScaled = ceilDiv(
    sellBalance * ONE * otherBalance,
    otherBalance - returnWithFees,
  );
  return returnWithFees + ceilDiv(endingScaled, ONE) - sellBalance;
}

function referencePrices(
  reserves: readonly [bigint, bigint],
  feeWad: bigint,
): { yesAveragePrice: string; noAveragePrice: string } | undefined {
  const yesShares = calcBuyAmount(reserves, REFERENCE_AMOUNT_ATOMS, 0, feeWad);
  const noShares = calcBuyAmount(reserves, REFERENCE_AMOUNT_ATOMS, 1, feeWad);
  if (yesShares === 0n || noShares === 0n) return undefined;
  return {
    yesAveragePrice: atomsToDecimal(
      averagePriceWad(REFERENCE_AMOUNT_ATOMS, yesShares),
      18,
      true,
    ),
    noAveragePrice: atomsToDecimal(
      averagePriceWad(REFERENCE_AMOUNT_ATOMS, noShares),
      18,
      true,
    ),
  };
}

function projectionError(
  record: ImmutableMarketRecord,
  log: ReplayLog,
  detail: string,
): Error {
  return new Error(
    `${record.marketId}: ${detail} at ${log.transactionHash}:${log.logIndex}`,
  );
}

function historyRangeSeconds(range: "1h" | "4h" | "24h" | "ALL"): bigint | undefined {
  if (range === "1h") return 3_600n;
  if (range === "4h") return 14_400n;
  if (range === "24h") return 86_400n;
  return undefined;
}

function encodeCursor(cursor: HistoryCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(cursor: string, marketId: string): HistoryCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new RangeError("invalid outcome history cursor");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as Partial<HistoryCursor>).marketId !== marketId ||
    typeof (parsed as Partial<HistoryCursor>).toSafeBlock !== "string" ||
    !/^[0-9]+$/.test((parsed as HistoryCursor).toSafeBlock) ||
    typeof (parsed as Partial<HistoryCursor>).safeBlockHash !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/.test((parsed as HistoryCursor).safeBlockHash) ||
    typeof (parsed as Partial<HistoryCursor>).asOf !== "string" ||
    !Number.isFinite(Date.parse((parsed as HistoryCursor).asOf)) ||
    typeof (parsed as Partial<HistoryCursor>).beforeSourceRef !== "string" ||
    (parsed as HistoryCursor).beforeSourceRef.length === 0
  ) {
    throw new RangeError("invalid outcome history cursor");
  }
  return parsed as HistoryCursor;
}

function isoSeconds(value: string): bigint {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new RangeError("invalid history timestamp");
  return BigInt(Math.floor(milliseconds / 1_000));
}

function timestamp(seconds: bigint): string {
  if (seconds < 0n || seconds > BigInt(Number.MAX_SAFE_INTEGER) / 1_000n) {
    throw new RangeError("timestamp is outside JavaScript Date range");
  }
  return new Date(Number(seconds) * 1_000).toISOString();
}
