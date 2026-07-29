import { network } from "hardhat";
import {
  getAddress,
  isAddress,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
} from "viem";

import {
  chainlinkAggregatorAbi,
  chainlinkFeedAbi,
  resolverAbi,
  settlementAdapterAbi,
} from "./abis.js";
import {
  ETHEREUM_SEPOLIA_CHAIN_ID,
  OperatorConfigurationError,
  assertResolverIdentity,
  historyPaths,
  loadCatalogAuthority,
  loadCatalogHistory,
  officialChainlinkFeed,
  type ResolverIdentity,
  type SupportedAsset,
} from "./lib.js";
import {
  ResolutionRoundSelectionError,
  selectResolutionRounds,
  type ChainlinkRoundReader,
} from "./resolution-round-selector.js";

const DEFAULT_MAXIMUM_SCAN_ROUNDS = 512;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new OperatorConfigurationError(`${name} is required`);
  return value;
}

function marketId(): Hex {
  const value = required("NOXLIMIT_MARKET_ID");
  if (!/^0x[0-9a-f]{64}$/i.test(value) || value.toLowerCase() === zeroHash) {
    throw new OperatorConfigurationError("NOXLIMIT_MARKET_ID must be a nonzero bytes32");
  }
  return value as Hex;
}

function maximumScanRounds(): number {
  const raw = process.env.NOXLIMIT_RESOLUTION_SCAN_MAX_ROUNDS?.trim();
  if (!raw) return DEFAULT_MAXIMUM_SCAN_ROUNDS;
  if (!/^[0-9]+$/.test(raw)) {
    throw new OperatorConfigurationError(
      "NOXLIMIT_RESOLUTION_SCAN_MAX_ROUNDS must be an unsigned integer",
    );
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 2 || parsed > 10_000) {
    throw new OperatorConfigurationError(
      "NOXLIMIT_RESOLUTION_SCAN_MAX_ROUNDS must be between 2 and 10000",
    );
  }
  return parsed;
}

function objectField(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new OperatorConfigurationError(`catalog market lacks ${key}`);
  }
  return value as Record<string, unknown>;
}

function addressField(record: Record<string, unknown>, key: string): Address {
  const value = record[key];
  if (typeof value !== "string" || !isAddress(value, { strict: true })) {
    throw new OperatorConfigurationError(`catalog ${key} is not a valid address`);
  }
  const parsed = getAddress(value);
  if (parsed === zeroAddress) throw new OperatorConfigurationError(`catalog ${key} cannot be zero`);
  return parsed;
}

function hexField(record: Record<string, unknown>, key: string): Hex {
  const value = record[key];
  if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/i.test(value)) {
    throw new OperatorConfigurationError(`catalog ${key} is not bytes32`);
  }
  return value as Hex;
}

function bigintField(record: Record<string, unknown>, key: string): bigint {
  const value = record[key];
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) {
    throw new OperatorConfigurationError(`catalog ${key} is not an unsigned decimal integer`);
  }
  return BigInt(value);
}

function integerField(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new OperatorConfigurationError(`catalog ${key} is not a nonnegative integer`);
  }
  return value;
}

async function main(): Promise<void> {
  const requestedMarketId = marketId();
  const scanBound = maximumScanRounds();
  const authority = await loadCatalogAuthority();
  const history = await loadCatalogHistory(historyPaths(process.env), authority);
  const current = history.at(-1);
  if (!current) throw new OperatorConfigurationError("catalog history is empty");
  const record = current.markets.find(
    (candidate) =>
      typeof candidate.marketId === "string" &&
      candidate.marketId.toLowerCase() === requestedMarketId.toLowerCase(),
  );
  if (!record) {
    throw new OperatorConfigurationError(`current catalog has no market ${requestedMarketId}`);
  }

  const contracts = objectField(record, "contracts");
  const oracle = objectField(record, "oracle");
  const identity = objectField(record, "identity");
  const resolverPolicy = objectField(identity, "resolverPolicy");
  const times = objectField(record, "times");
  const resolver = addressField(contracts, "resolver");
  const asset = identity.asset;
  if (asset !== "BTC/USD" && asset !== "ETH/USD") {
    throw new OperatorConfigurationError(
      "v1 resolution selector supports only cataloged BTC/USD or ETH/USD",
    );
  }
  if (
    oracle.source !== "CHAINLINK" ||
    resolverPolicy.policyVersion !== "chainlink-first-observation-v1" ||
    resolverPolicy.comparison !== ">="
  ) {
    throw new OperatorConfigurationError(
      "catalog market does not use the supported Chainlink first-observation policy",
    );
  }
  const feedPolicy = officialChainlinkFeed(asset as SupportedAsset);
  if (addressField(oracle, "proxy") !== feedPolicy.proxy) {
    throw new OperatorConfigurationError(`catalog ${asset} market is not bound to its official proxy`);
  }
  const catalogFeedDecimals = integerField(oracle, "feedDecimals");
  if (catalogFeedDecimals !== feedPolicy.decimals) {
    throw new OperatorConfigurationError(`catalog ${asset} feed precision is not official`);
  }
  const expectedResolver: ResolverIdentity = {
    conditionalTokens: addressField(contracts, "conditionalTokens"),
    settlementAdapter: addressField(oracle, "settlementAdapter"),
    questionId: hexField(record, "questionId"),
    conditionId: hexField(record, "conditionId"),
    assetId: hexField(oracle, "assetId"),
    strikePriceWad: bigintField(identity, "strikePriceWad"),
    tradingClosesAt: bigintField(times, "tradingClosesAt"),
    resolvesAt: bigintField(times, "resolvesAt"),
    maximumObservationDelay: bigintField(
      resolverPolicy,
      "maximumObservationDelaySeconds",
    ),
  };

  const connection = await network.create();
  if (connection.networkName !== "sepolia") {
    throw new OperatorConfigurationError("round selection must use the read-only sepolia network");
  }
  const publicClient = await connection.viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  if (chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) {
    throw new OperatorConfigurationError(`refusing round selection on chain ${chainId}`);
  }
  const snapshot = await publicClient.getBlock({ blockTag: "safe" });
  const blockNumber = snapshot.number;
  const [resolverCode, adapterCode, feedCode] = await Promise.all([
    publicClient.getCode({ address: resolver, blockNumber }),
    publicClient.getCode({ address: expectedResolver.settlementAdapter, blockNumber }),
    publicClient.getCode({ address: feedPolicy.proxy, blockNumber }),
  ]);
  if (!resolverCode || resolverCode === "0x") {
    throw new OperatorConfigurationError("catalog resolver has no runtime code at the safe snapshot");
  }
  if (!adapterCode || adapterCode === "0x") {
    throw new OperatorConfigurationError("catalog settlement adapter has no runtime code at the safe snapshot");
  }
  if (!feedCode || feedCode === "0x") {
    throw new OperatorConfigurationError("catalog Chainlink proxy has no runtime code at the safe snapshot");
  }

  const resolverValues = await Promise.all([
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "conditionalTokens", blockNumber }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "settlementAdapter", blockNumber }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "questionId", blockNumber }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "conditionId", blockNumber }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "assetId", blockNumber }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "strikePriceWad", blockNumber }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "tradingClosesAt", blockNumber }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "resolvesAt", blockNumber }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "maximumObservationDelay", blockNumber }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "resolved", blockNumber }),
  ] as const);
  assertResolverIdentity(
    {
      conditionalTokens: resolverValues[0],
      settlementAdapter: resolverValues[1],
      questionId: resolverValues[2],
      conditionId: resolverValues[3],
      assetId: resolverValues[4],
      strikePriceWad: resolverValues[5],
      tradingClosesAt: resolverValues[6],
      resolvesAt: resolverValues[7],
      maximumObservationDelay: resolverValues[8],
    },
    expectedResolver,
  );
  if (resolverValues[9]) {
    throw new OperatorConfigurationError("catalog market is already resolved");
  }

  const [adapterAssetId, adapterFeed, adapterDecimals, feedDecimals, feedDescription] =
    await Promise.all([
      publicClient.readContract({
        address: expectedResolver.settlementAdapter,
        abi: settlementAdapterAbi,
        functionName: "assetId",
        blockNumber,
      }),
      publicClient.readContract({
        address: expectedResolver.settlementAdapter,
        abi: settlementAdapterAbi,
        functionName: "feed",
        blockNumber,
      }),
      publicClient.readContract({
        address: expectedResolver.settlementAdapter,
        abi: settlementAdapterAbi,
        functionName: "feedDecimals",
        blockNumber,
      }),
      publicClient.readContract({
        address: feedPolicy.proxy,
        abi: chainlinkFeedAbi,
        functionName: "decimals",
        blockNumber,
      }),
      publicClient.readContract({
        address: feedPolicy.proxy,
        abi: chainlinkFeedAbi,
        functionName: "description",
        blockNumber,
      }),
    ] as const);
  if (
    adapterAssetId.toLowerCase() !== expectedResolver.assetId.toLowerCase() ||
    getAddress(adapterFeed) !== feedPolicy.proxy ||
    adapterDecimals !== feedPolicy.decimals ||
    feedDecimals !== feedPolicy.decimals ||
    feedDescription !== feedPolicy.description
  ) {
    throw new OperatorConfigurationError(
      "catalog settlement adapter does not match the official resolver/feed identity",
    );
  }

  const reader: ChainlinkRoundReader = {
    latestProxyRound: () =>
      publicClient.readContract({
        address: feedPolicy.proxy,
        abi: chainlinkFeedAbi,
        functionName: "latestRoundData",
        blockNumber,
      }),
    proxyRound: (roundId) =>
      publicClient.readContract({
        address: feedPolicy.proxy,
        abi: chainlinkFeedAbi,
        functionName: "getRoundData",
        args: [roundId],
        blockNumber,
      }),
    phaseAggregator: (phaseId) =>
      publicClient.readContract({
        address: feedPolicy.proxy,
        abi: chainlinkFeedAbi,
        functionName: "phaseAggregators",
        args: [phaseId],
        blockNumber,
      }),
    aggregatorLatestRound: (aggregator) =>
      publicClient.readContract({
        address: aggregator,
        abi: chainlinkAggregatorAbi,
        functionName: "latestRoundData",
        blockNumber,
      }),
    codeAt: (address) => publicClient.getCode({ address, blockNumber }),
  };
  const selected = await selectResolutionRounds({
    reader,
    chainTimestamp: snapshot.timestamp,
    resolvesAt: expectedResolver.resolvesAt,
    maximumObservationDelay: expectedResolver.maximumObservationDelay,
    feedDecimals,
    maximumScanRounds: scanBound,
  });

  process.stdout.write(
    `${JSON.stringify({
      ready: true,
      chainId,
      catalogRevision: current.catalogRevision,
      marketId: requestedMarketId,
      asset,
      resolver,
      proxy: feedPolicy.proxy,
      snapshotBlock: blockNumber.toString(),
      snapshotTimestamp: snapshot.timestamp.toString(),
      resolvesAt: expectedResolver.resolvesAt.toString(),
      maximumObservationDelay: expectedResolver.maximumObservationDelay.toString(),
      selectedRoundId: selected.selectedRoundId.toString(),
      predecessorRoundId: selected.predecessorRoundId.toString(),
      settlementPriceWad: selected.settlementPriceWad.toString(),
      selectedUpdatedAt: selected.selectedUpdatedAt.toString(),
      predecessorUpdatedAt: selected.predecessorUpdatedAt.toString(),
      scannedProxyRounds: selected.scannedProxyRounds,
      resolveEnvironment: {
        NOXLIMIT_MARKET_ID: requestedMarketId,
        NOXLIMIT_SELECTED_ROUND_ID: selected.selectedRoundId.toString(),
        NOXLIMIT_PREDECESSOR_ROUND_ID: selected.predecessorRoundId.toString(),
      },
    })}\n`,
  );
}

try {
  await main();
} catch (error) {
  if (
    error instanceof OperatorConfigurationError ||
    error instanceof ResolutionRoundSelectionError
  ) {
    throw error;
  }
  throw new OperatorConfigurationError(
    "read-only resolution round selection failed; no round pair was produced",
  );
}
