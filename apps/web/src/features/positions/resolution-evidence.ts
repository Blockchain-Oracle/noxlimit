import { formatUnits, parseAbi, parseUnits, type Address, type PublicClient } from "viem";

const PHASE_OFFSET = 64n;
const ROUND_MASK = (1n << PHASE_OFFSET) - 1n;
const MAX_ROUNDS_TO_SCAN = 256;

const resolverEvidenceAbi = parseAbi([
  "function settlementAdapter() view returns (address)",
  "function resolvesAt() view returns (uint64)",
  "function maximumObservationDelay() view returns (uint64)",
  "function resolved() view returns (bool)",
  "function resolvedYes() view returns (bool)",
  "function settlementPriceWad() view returns (int256)",
  "function settlementObservedAt() view returns (uint64)",
  "function settlementRoundId() view returns (uint80)",
  "function predecessorRoundId() view returns (uint80)",
]);

const adapterEvidenceAbi = parseAbi([
  "function feed() view returns (address)",
  "function feedDecimals() view returns (uint8)",
]);

const chainlinkEvidenceAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)",
  "function getRoundData(uint80 roundId) view returns (uint80 id,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)",
  "function phaseAggregators(uint16 phaseId) view returns (address)",
]);

const aggregatorEvidenceAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)",
]);

type ReadyEvidence = Readonly<{
  state: "READY";
  safeBlockNumber: bigint;
  safeBlockHash: `0x${string}`;
  safeBlockTimestamp: bigint;
  selectedRoundId: bigint;
  predecessorRoundId: bigint;
  selectedObservedAt: bigint;
  predecessorObservedAt: bigint;
  settlementPriceUsd: string;
  expectedWinner: "YES" | "NO";
}>;

type ResolvedEvidence = Readonly<{
  state: "RESOLVED";
  safeBlockNumber: bigint;
  safeBlockHash: `0x${string}`;
  safeBlockTimestamp: bigint;
  selectedRoundId: bigint;
  predecessorRoundId: bigint;
  selectedObservedAt: bigint;
  settlementPriceUsd: string;
  winner: "YES" | "NO";
}>;

export type ResolutionEvidence =
  | ReadyEvidence
  | ResolvedEvidence
  | Readonly<{ state: "NOT_READY" | "NO_ACCEPTED_OBSERVATION" | "UNAVAILABLE"; detail: string }>;

type ChainlinkRound = Readonly<{
  id: bigint;
  answer: bigint;
  updatedAt: bigint;
}>;

async function readRound(
  client: PublicClient,
  feed: Address,
  roundId: bigint,
  blockNumber: bigint,
): Promise<ChainlinkRound> {
  const [id, answer, , updatedAt] = await client.readContract({
    address: feed,
    abi: chainlinkEvidenceAbi,
    functionName: "getRoundData",
    args: [roundId],
    blockNumber,
  });
  // `answeredInRound` is intentionally not a validity condition. Chainlink deprecated that
  // check, and the resolver instead binds exact proxy-round identity, positive answer,
  // chronology, adjacency, and its immutable observation-delay window.
  if (id !== roundId || answer <= 0n || updatedAt === 0n) {
    throw new Error(`Chainlink round ${roundId} is not a valid positive observation.`);
  }
  return { id, answer, updatedAt };
}

async function adjacentPredecessor(
  client: PublicClient,
  feed: Address,
  selectedRoundId: bigint,
  blockNumber: bigint,
): Promise<bigint> {
  const phase = selectedRoundId >> PHASE_OFFSET;
  const aggregatorRound = selectedRoundId & ROUND_MASK;
  if (phase === 0n || aggregatorRound === 0n) throw new Error("Chainlink returned an invalid composite round identifier.");
  if (aggregatorRound > 1n) return selectedRoundId - 1n;
  if (phase === 1n) throw new Error("No predecessor exists before the first Chainlink phase.");
  const predecessorPhase = phase - 1n;
  const aggregator = await client.readContract({
    address: feed,
    abi: chainlinkEvidenceAbi,
    functionName: "phaseAggregators",
    args: [Number(predecessorPhase)],
    blockNumber,
  });
  const [lastRound] = await client.readContract({
    address: aggregator,
    abi: aggregatorEvidenceAbi,
    functionName: "latestRoundData",
    blockNumber,
  });
  if (lastRound === 0n || lastRound > ROUND_MASK) throw new Error("The prior Chainlink phase has no valid terminal round.");
  return (predecessorPhase << PHASE_OFFSET) | lastRound;
}

export async function findResolutionEvidence(input: {
  client: PublicClient;
  resolver: Address;
  strikeUsd: string;
  oracleSource: string;
}): Promise<ResolutionEvidence> {
  if (input.oracleSource !== "Chainlink") {
    return { state: "UNAVAILABLE", detail: `Automatic adjacent-round discovery is not available for ${input.oracleSource}.` };
  }
  // Freeze every resolver/feed read to one safe block. This prevents a new oracle round or phase
  // transition from changing the evidence halfway through the browser's bounded scan.
  const block = await input.client.getBlock({ blockTag: "safe" });
  if (block.number === null || block.hash === null) {
    return { state: "UNAVAILABLE", detail: "The safe Sepolia block has no canonical number or hash." };
  }
  const blockNumber = block.number;
  const resolved = await input.client.readContract({
    address: input.resolver,
    abi: resolverEvidenceAbi,
    functionName: "resolved",
    blockNumber,
  });
  if (resolved) {
    const [winner, priceWad, observedAt, selectedRoundId, predecessorRoundId] = await Promise.all([
      input.client.readContract({ address: input.resolver, abi: resolverEvidenceAbi, functionName: "resolvedYes", blockNumber }),
      input.client.readContract({ address: input.resolver, abi: resolverEvidenceAbi, functionName: "settlementPriceWad", blockNumber }),
      input.client.readContract({ address: input.resolver, abi: resolverEvidenceAbi, functionName: "settlementObservedAt", blockNumber }),
      input.client.readContract({ address: input.resolver, abi: resolverEvidenceAbi, functionName: "settlementRoundId", blockNumber }),
      input.client.readContract({ address: input.resolver, abi: resolverEvidenceAbi, functionName: "predecessorRoundId", blockNumber }),
    ]);
    return {
      state: "RESOLVED",
      safeBlockNumber: blockNumber,
      safeBlockHash: block.hash,
      safeBlockTimestamp: block.timestamp,
      selectedRoundId,
      predecessorRoundId,
      selectedObservedAt: observedAt,
      settlementPriceUsd: formatUnits(priceWad, 18),
      winner: winner ? "YES" : "NO",
    };
  }

  const [adapter, resolvesAt, maximumObservationDelay] = await Promise.all([
    input.client.readContract({ address: input.resolver, abi: resolverEvidenceAbi, functionName: "settlementAdapter", blockNumber }),
    input.client.readContract({ address: input.resolver, abi: resolverEvidenceAbi, functionName: "resolvesAt", blockNumber }),
    input.client.readContract({ address: input.resolver, abi: resolverEvidenceAbi, functionName: "maximumObservationDelay", blockNumber }),
  ]);
  if (block.timestamp < resolvesAt) {
    return { state: "NOT_READY", detail: `Objective resolution opens at ${new Date(Number(resolvesAt) * 1_000).toLocaleString()}.` };
  }
  const [feed, decimals] = await Promise.all([
    input.client.readContract({ address: adapter, abi: adapterEvidenceAbi, functionName: "feed", blockNumber }),
    input.client.readContract({ address: adapter, abi: adapterEvidenceAbi, functionName: "feedDecimals", blockNumber }),
  ]);
  const [latestRoundId] = await input.client.readContract({ address: feed, abi: chainlinkEvidenceAbi, functionName: "latestRoundData", blockNumber });
  let selectedRoundId = latestRoundId;
  for (let scanned = 0; scanned < MAX_ROUNDS_TO_SCAN; scanned += 1) {
    const selected = await readRound(input.client, feed, selectedRoundId, blockNumber);
    if (selected.updatedAt < resolvesAt) {
      return { state: "NOT_READY", detail: "Chainlink has not published an observation at or after the resolution timestamp." };
    }
    const predecessorRoundId = await adjacentPredecessor(input.client, feed, selectedRoundId, blockNumber);
    const predecessor = await readRound(input.client, feed, predecessorRoundId, blockNumber);
    if (predecessor.updatedAt < resolvesAt) {
      if (selected.updatedAt > resolvesAt + maximumObservationDelay) {
        return { state: "NO_ACCEPTED_OBSERVATION", detail: "The first chronological Chainlink observation is outside this market's immutable maximum delay." };
      }
      const strike = parseUnits(input.strikeUsd, decimals);
      return {
        state: "READY",
        safeBlockNumber: blockNumber,
        safeBlockHash: block.hash,
        safeBlockTimestamp: block.timestamp,
        selectedRoundId,
        predecessorRoundId,
        selectedObservedAt: selected.updatedAt,
        predecessorObservedAt: predecessor.updatedAt,
        settlementPriceUsd: formatUnits(selected.answer, decimals),
        expectedWinner: selected.answer >= strike ? "YES" : "NO",
      };
    }
    selectedRoundId = predecessorRoundId;
  }
  return { state: "UNAVAILABLE", detail: `No crossing pair was found within the bounded ${MAX_ROUNDS_TO_SCAN}-round scan.` };
}
