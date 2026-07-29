import { network } from "hardhat";
import {
  getAddress,
  isAddress,
  zeroAddress,
  zeroHash,
  type Address,
  type Hash,
  type Hex,
} from "viem";

import { resolverAbi, settlementAdapterAbi } from "./abis.js";
import {
  ETHEREUM_SEPOLIA_CHAIN_ID,
  OperatorConfigurationError,
  assertOutputReady,
  assertResolverIdentity,
  explicitPath,
  historyPaths,
  loadCatalogAuthority,
  loadCatalogHistory,
  officialChainlinkFeed,
  readJsonIfExists,
  requireExplicitWrite,
  rethrowSanitizedOperatorFailure,
  writeJsonExclusive,
  type ResolverIdentity,
  type SupportedAsset,
} from "./lib.js";

const UINT80_MAX = (1n << 80n) - 1n;

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

function round(name: string): bigint {
  const value = required(name);
  if (!/^[0-9]+$/.test(value)) throw new OperatorConfigurationError(`${name} must be decimal`);
  const parsed = BigInt(value);
  if (parsed === 0n || parsed > UINT80_MAX) {
    throw new OperatorConfigurationError(`${name} must be a nonzero uint80`);
  }
  return parsed;
}

function confirmations(): number {
  const raw = required("NOXLIMIT_CONFIRMATIONS");
  if (!/^[0-9]+$/.test(raw)) {
    throw new OperatorConfigurationError("NOXLIMIT_CONFIRMATIONS must be an unsigned integer");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) {
    throw new OperatorConfigurationError("NOXLIMIT_CONFIRMATIONS must be between 1 and 100");
  }
  return value;
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

async function main(): Promise<void> {
  requireExplicitWrite(process.env, "RESOLVE_SEPOLIA_MARKET");
  const requestedMarketId = marketId();
  const selectedRoundId = round("NOXLIMIT_SELECTED_ROUND_ID");
  const predecessorRoundId = round("NOXLIMIT_PREDECESSOR_ROUND_ID");
  const confirmationCount = confirmations();
  const outputPath = explicitPath(process.env, "NOXLIMIT_RESOLUTION_EVIDENCE_OUTPUT_PATH");
  const existingEvidence = await readJsonIfExists(outputPath);
  if (existingEvidence === undefined) await assertOutputReady(outputPath);

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
    throw new OperatorConfigurationError("v1 resolution operator supports only cataloged BTC/USD or ETH/USD");
  }
  if (oracle.source !== "CHAINLINK") {
    throw new OperatorConfigurationError("v1 resolution operator requires a Chainlink market record");
  }
  const feedPolicy = officialChainlinkFeed(asset as SupportedAsset);
  if (addressField(oracle, "proxy") !== feedPolicy.proxy) {
    throw new OperatorConfigurationError(`catalog ${asset} market is not bound to its official proxy`);
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
  if (connection.networkName !== "sepoliaOperator") {
    throw new OperatorConfigurationError("resolution must use the explicit sepoliaOperator network");
  }
  const publicClient = await connection.viem.getPublicClient();
  const [operator] = await connection.viem.getWalletClients();
  if (!operator) throw new OperatorConfigurationError("sepoliaOperator exposes no operator account");
  const chainId = await publicClient.getChainId();
  if (chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) {
    throw new OperatorConfigurationError(`refusing resolution on chain ${chainId}`);
  }
  const code = await publicClient.getCode({ address: resolver });
  if (!code || code === "0x") throw new OperatorConfigurationError("catalog resolver has no runtime code");

  const resolverValues = await Promise.all([
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "conditionalTokens" }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "settlementAdapter" }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "questionId" }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "conditionId" }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "assetId" }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "strikePriceWad" }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "tradingClosesAt" }),
    publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "resolvesAt" }),
    publicClient.readContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "maximumObservationDelay",
    }),
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
  const [adapterAssetId, adapterFeed] = await Promise.all([
    publicClient.readContract({
      address: expectedResolver.settlementAdapter,
      abi: settlementAdapterAbi,
      functionName: "assetId",
    }),
    publicClient.readContract({
      address: expectedResolver.settlementAdapter,
      abi: settlementAdapterAbi,
      functionName: "feed",
    }),
  ] as const);
  if (
    adapterAssetId.toLowerCase() !== expectedResolver.assetId.toLowerCase() ||
    getAddress(adapterFeed) !== feedPolicy.proxy
  ) {
    throw new OperatorConfigurationError("catalog settlement adapter does not match the resolver/feed identity");
  }

  const alreadyResolved = await publicClient.readContract({
    address: resolver,
    abi: resolverAbi,
    functionName: "resolved",
  });
  if (existingEvidence !== undefined) {
    const existing = existingEvidence as Record<string, unknown>;
    if (
      existing.marketId !== requestedMarketId ||
      existing.catalogRevision !== current.catalogRevision ||
      existing.resolver !== resolver ||
      existing.selectedRoundId !== selectedRoundId.toString() ||
      existing.predecessorRoundId !== predecessorRoundId.toString()
    ) {
      throw new OperatorConfigurationError("existing resolution evidence describes another action");
    }
    if (!alreadyResolved) {
      throw new OperatorConfigurationError("evidence claims resolution but the catalog resolver is unresolved");
    }
  }

  let transactionHash: Hash | null = null;
  if (!alreadyResolved) {
    // A successful simulation proves this exact resolver and adjacent pair before the irreversible write.
    await publicClient.simulateContract({
      account: operator.account,
      address: resolver,
      abi: resolverAbi,
      functionName: "resolve",
      args: [selectedRoundId, predecessorRoundId],
    });
    transactionHash = await operator.writeContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "resolve",
      args: [selectedRoundId, predecessorRoundId],
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
      confirmations: confirmationCount,
    });
    if (receipt.status !== "success") {
      throw new OperatorConfigurationError(`resolution reverted: ${transactionHash}`);
    }
  }

  const [questionId, conditionId, yesWon, settlementPriceWad, observedAt, selected, predecessor] =
    await Promise.all([
      publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "questionId" }),
      publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "conditionId" }),
      publicClient.readContract({ address: resolver, abi: resolverAbi, functionName: "resolvedYes" }),
      publicClient.readContract({
        address: resolver,
        abi: resolverAbi,
        functionName: "settlementPriceWad",
      }),
      publicClient.readContract({
        address: resolver,
        abi: resolverAbi,
        functionName: "settlementObservedAt",
      }),
      publicClient.readContract({
        address: resolver,
        abi: resolverAbi,
        functionName: "settlementRoundId",
      }),
      publicClient.readContract({
        address: resolver,
        abi: resolverAbi,
        functionName: "predecessorRoundId",
      }),
    ] as const);
  if (selected !== selectedRoundId || predecessor !== predecessorRoundId) {
    throw new OperatorConfigurationError(
      "market was resolved with a different adjacent round pair; refusing misleading evidence",
    );
  }
  if (existingEvidence !== undefined) {
    process.stdout.write(`${JSON.stringify({ resolved: true, idempotent: true, outputPath })}\n`);
    return;
  }

  const evidence = {
    schemaVersion: 1,
    kind: "NOXLIMIT_SEPOLIA_OBJECTIVE_RESOLUTION",
    chainId,
    catalogRevision: current.catalogRevision,
    marketId: requestedMarketId,
    resolver,
    questionId,
    conditionId,
    alreadyResolved,
    transactionHash,
    selectedRoundId: selected.toString(),
    predecessorRoundId: predecessor.toString(),
    settlementPriceWad: settlementPriceWad.toString(),
    observedAt: observedAt.toString(),
    yesWon,
    operator: getAddress(operator.account.address),
  };
  await writeJsonExclusive(outputPath, evidence);
  process.stdout.write(
    `${JSON.stringify({ resolved: true, idempotent: alreadyResolved, transactionHash, outputPath })}\n`,
  );
}

try {
  await main();
} catch (error) {
  rethrowSanitizedOperatorFailure(
    error,
    "Sepolia objective resolution failed unexpectedly; inspect onchain state before retrying",
  );
}
