import {
  getAddress,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";

const PHASE_OFFSET = 64n;
const AGGREGATOR_ROUND_MASK = (1n << PHASE_OFFSET) - 1n;
const UINT64_MAX = AGGREGATOR_ROUND_MASK;
const INT256_MAX = (1n << 255n) - 1n;

export type ChainlinkRoundData = readonly [
  roundId: bigint,
  answer: bigint,
  startedAt: bigint,
  updatedAt: bigint,
  answeredInRound: bigint,
];

export interface ChainlinkRoundReader {
  readonly latestProxyRound: () => Promise<ChainlinkRoundData>;
  readonly proxyRound: (roundId: bigint) => Promise<ChainlinkRoundData>;
  readonly phaseAggregator: (phaseId: number) => Promise<Address>;
  readonly aggregatorLatestRound: (aggregator: Address) => Promise<ChainlinkRoundData>;
  readonly codeAt: (address: Address) => Promise<Hex | undefined>;
}

export interface ResolutionRoundSelection {
  readonly selectedRoundId: bigint;
  readonly predecessorRoundId: bigint;
  readonly settlementPriceWad: bigint;
  readonly selectedUpdatedAt: bigint;
  readonly predecessorUpdatedAt: bigint;
  readonly scannedProxyRounds: number;
}

export interface ResolutionRoundSelectorInput {
  readonly reader: ChainlinkRoundReader;
  readonly chainTimestamp: bigint;
  readonly resolvesAt: bigint;
  readonly maximumObservationDelay: bigint;
  readonly feedDecimals: number;
  readonly maximumScanRounds: number;
}

interface Observation {
  readonly roundId: bigint;
  readonly answer: bigint;
  readonly updatedAt: bigint;
  readonly phaseId: number;
  readonly aggregatorRoundId: bigint;
}

export class ResolutionRoundSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolutionRoundSelectionError";
  }
}

function decodeProxyRound(roundId: bigint): {
  readonly phaseId: number;
  readonly aggregatorRoundId: bigint;
} {
  if (roundId <= 0n || roundId >= 1n << 80n) {
    throw new ResolutionRoundSelectionError(`invalid Chainlink proxy round id ${roundId}`);
  }
  const phase = roundId >> PHASE_OFFSET;
  const aggregatorRoundId = roundId & AGGREGATOR_ROUND_MASK;
  if (phase === 0n || phase > 65_535n || aggregatorRoundId === 0n) {
    throw new ResolutionRoundSelectionError(`invalid Chainlink proxy round id ${roundId}`);
  }
  return { phaseId: Number(phase), aggregatorRoundId };
}

function validateProxyObservation(
  data: ChainlinkRoundData,
  expectedRoundId?: bigint,
): Observation {
  const [roundId, answer, , updatedAt] = data;
  if (expectedRoundId !== undefined && roundId !== expectedRoundId) {
    throw new ResolutionRoundSelectionError(
      `Chainlink returned round ${roundId} for requested proxy round ${expectedRoundId}`,
    );
  }
  const decoded = decodeProxyRound(roundId);
  if (answer <= 0n || updatedAt === 0n || updatedAt > UINT64_MAX) {
    throw new ResolutionRoundSelectionError(
      `invalid Chainlink observation at proxy round ${roundId}`,
    );
  }
  return { roundId, answer, updatedAt, ...decoded };
}

function normalizePriceWad(answer: bigint, feedDecimals: number): bigint {
  if (!Number.isSafeInteger(feedDecimals) || feedDecimals < 0 || feedDecimals > 36) {
    throw new ResolutionRoundSelectionError(
      `unsupported Chainlink feed decimals ${feedDecimals}`,
    );
  }
  let normalized: bigint;
  if (feedDecimals === 18) {
    normalized = answer;
  } else if (feedDecimals < 18) {
    const scale = 10n ** BigInt(18 - feedDecimals);
    if (answer > INT256_MAX / scale) {
      throw new ResolutionRoundSelectionError("selected Chainlink price overflows int256 WAD");
    }
    normalized = answer * scale;
  } else {
    normalized = answer / 10n ** BigInt(feedDecimals - 18);
  }
  if (normalized <= 0n) {
    throw new ResolutionRoundSelectionError("selected Chainlink price normalizes to zero");
  }
  return normalized;
}

async function readProxyRound(
  reader: ChainlinkRoundReader,
  roundId: bigint,
): Promise<Observation> {
  try {
    return validateProxyObservation(await reader.proxyRound(roundId), roundId);
  } catch (error) {
    if (error instanceof ResolutionRoundSelectionError) throw error;
    throw new ResolutionRoundSelectionError(
      `could not read adjacent Chainlink proxy round ${roundId}`,
    );
  }
}

async function priorRoundId(
  reader: ChainlinkRoundReader,
  current: Observation,
): Promise<{ readonly roundId: bigint; readonly terminal?: ChainlinkRoundData }> {
  if (current.aggregatorRoundId > 1n) {
    return { roundId: current.roundId - 1n };
  }
  if (current.phaseId === 1) {
    throw new ResolutionRoundSelectionError(
      `proxy round ${current.roundId} has no verifiable adjacent predecessor`,
    );
  }

  const priorPhaseId = current.phaseId - 1;
  try {
    const [currentAggregator, priorAggregator] = await Promise.all([
      reader.phaseAggregator(current.phaseId),
      reader.phaseAggregator(priorPhaseId),
    ]);
    if (
      getAddress(currentAggregator) === zeroAddress ||
      getAddress(priorAggregator) === zeroAddress
    ) {
      throw new ResolutionRoundSelectionError(
        `phase ${priorPhaseId} → ${current.phaseId} has an unbound aggregator`,
      );
    }
    const [currentCode, priorCode] = await Promise.all([
      reader.codeAt(currentAggregator),
      reader.codeAt(priorAggregator),
    ]);
    if (!currentCode || currentCode === "0x" || !priorCode || priorCode === "0x") {
      throw new ResolutionRoundSelectionError(
        `phase ${priorPhaseId} → ${current.phaseId} cannot be verified from deployed aggregators`,
      );
    }
    const terminal = await reader.aggregatorLatestRound(priorAggregator);
    const [terminalRoundId, terminalAnswer, , terminalUpdatedAt] = terminal;
    if (
      terminalRoundId === 0n ||
      terminalRoundId > AGGREGATOR_ROUND_MASK ||
      terminalAnswer <= 0n ||
      terminalUpdatedAt === 0n ||
      terminalUpdatedAt > UINT64_MAX
    ) {
      throw new ResolutionRoundSelectionError(
        `phase ${priorPhaseId} has no valid terminal aggregator round`,
      );
    }
    return {
      roundId: (BigInt(priorPhaseId) << PHASE_OFFSET) | terminalRoundId,
      terminal,
    };
  } catch (error) {
    if (error instanceof ResolutionRoundSelectionError) throw error;
    throw new ResolutionRoundSelectionError(
      `phase ${priorPhaseId} → ${current.phaseId} adjacency is unverifiable`,
    );
  }
}

function assertTerminalMatchesProxy(
  terminal: ChainlinkRoundData,
  predecessor: Observation,
): void {
  const [terminalRoundId, terminalAnswer, , terminalUpdatedAt] = terminal;
  if (
    terminalRoundId !== predecessor.aggregatorRoundId ||
    terminalAnswer !== predecessor.answer ||
    terminalUpdatedAt !== predecessor.updatedAt
  ) {
    throw new ResolutionRoundSelectionError(
      `phase ${predecessor.phaseId} terminal round does not match proxy round ${predecessor.roundId}`,
    );
  }
}

export async function selectResolutionRounds(
  input: ResolutionRoundSelectorInput,
): Promise<ResolutionRoundSelection> {
  if (input.resolvesAt <= 0n || input.maximumObservationDelay <= 0n) {
    throw new ResolutionRoundSelectionError(
      "resolution time and maximum observation delay must be positive",
    );
  }
  if (
    !Number.isSafeInteger(input.maximumScanRounds) ||
    input.maximumScanRounds < 2 ||
    input.maximumScanRounds > 10_000
  ) {
    throw new ResolutionRoundSelectionError(
      "maximum scan rounds must be between 2 and 10000",
    );
  }
  if (input.chainTimestamp < input.resolvesAt) {
    throw new ResolutionRoundSelectionError(
      `resolution is not ready at chain timestamp ${input.chainTimestamp}`,
    );
  }

  let current: Observation;
  try {
    current = validateProxyObservation(await input.reader.latestProxyRound());
  } catch (error) {
    if (error instanceof ResolutionRoundSelectionError) throw error;
    throw new ResolutionRoundSelectionError(
      "could not read the latest Chainlink proxy round",
    );
  }
  if (current.updatedAt < input.resolvesAt) {
    throw new ResolutionRoundSelectionError(
      `no Chainlink observation is available at or after ${input.resolvesAt}`,
    );
  }

  let scannedProxyRounds = 1;
  for (;;) {
    if (scannedProxyRounds >= input.maximumScanRounds) {
      throw new ResolutionRoundSelectionError(
        `resolution round scan exceeded ${input.maximumScanRounds} proxy observations`,
      );
    }
    const prior = await priorRoundId(input.reader, current);
    const predecessor = await readProxyRound(input.reader, prior.roundId);
    scannedProxyRounds += 1;
    if (prior.terminal) assertTerminalMatchesProxy(prior.terminal, predecessor);
    if (predecessor.updatedAt >= current.updatedAt) {
      throw new ResolutionRoundSelectionError(
        `nonmonotonic Chainlink timestamps between ${predecessor.roundId} and ${current.roundId}`,
      );
    }

    if (predecessor.updatedAt < input.resolvesAt) {
      const latestAllowed = input.resolvesAt + input.maximumObservationDelay;
      if (current.updatedAt > latestAllowed) {
        throw new ResolutionRoundSelectionError(
          `first post-resolution observation ${current.roundId} at ${current.updatedAt} exceeds maximum delay ${latestAllowed}`,
        );
      }
      return {
        selectedRoundId: current.roundId,
        predecessorRoundId: predecessor.roundId,
        settlementPriceWad: normalizePriceWad(current.answer, input.feedDecimals),
        selectedUpdatedAt: current.updatedAt,
        predecessorUpdatedAt: predecessor.updatedAt,
        scannedProxyRounds,
      };
    }
    current = predecessor;
  }
}
