import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";

import { network } from "hardhat";
import {
  getAddress,
  isAddress,
  keccak256,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

import {
  chainlinkFeedAbi,
  collateralAbi,
  conditionalTokensAbi,
  fpmmAbi,
  orderBookAbi,
  resolverAbi,
  settlementAdapterAbi,
} from "./abis.js";
import {
  COLLATERAL_DECIMALS,
  COLLATERAL_NAME,
  COLLATERAL_SYMBOL,
  ETHEREUM_SEPOLIA_CHAIN_ID,
  OFFICIAL_SEPOLIA_CHAINLINK_FEEDS,
  OperatorConfigurationError,
  PINNED_CONDITIONAL_TOKENS,
  PINNED_FPMM_FACTORY,
  assertOutputReady,
  buildCatalogMultiCutoverCandidate,
  explicitPath,
  historyPaths,
  loadCatalogAuthority,
  loadCatalogHistory,
  requireExplicitWrite,
  withExclusiveOperatorLock,
  writeJsonExclusive,
  type CatalogCutoverPair,
  type CatalogManifestLike,
} from "./lib.js";

const MAX_CUTOVER_PAIRS = 16;
const FPMM_FEE_SCALE = 100_000_000_000_000n;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new OperatorConfigurationError(`${name} is required`);
  return value;
}

function bytes32Value(value: unknown, label: string): Hex {
  if (
    typeof value !== "string" ||
    !/^0x[0-9a-f]{64}$/i.test(value) ||
    value.toLowerCase() === zeroHash
  ) {
    throw new OperatorConfigurationError(`${label} must be a nonzero bytes32`);
  }
  return value as Hex;
}

function cutoverPairs(): readonly CatalogCutoverPair[] {
  const raw = required("NOXLIMIT_CUTOVER_PAIRS_JSON");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new OperatorConfigurationError("NOXLIMIT_CUTOVER_PAIRS_JSON must be valid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > MAX_CUTOVER_PAIRS) {
    throw new OperatorConfigurationError(
      `NOXLIMIT_CUTOVER_PAIRS_JSON must contain between 1 and ${MAX_CUTOVER_PAIRS} pairs`,
    );
  }
  return parsed.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new OperatorConfigurationError(`cutover pair ${index} must be an object`);
    }
    const pair = value as Record<string, unknown>;
    const keys = Object.keys(pair).sort();
    if (
      keys.length !== 2 ||
      keys[0] !== "predecessorMarketId" ||
      keys[1] !== "successorMarketId"
    ) {
      throw new OperatorConfigurationError(
        `cutover pair ${index} must contain only predecessorMarketId and successorMarketId`,
      );
    }
    return {
      predecessorMarketId: bytes32Value(
        pair.predecessorMarketId,
        `cutover pair ${index} predecessorMarketId`,
      ),
      successorMarketId: bytes32Value(
        pair.successorMarketId,
        `cutover pair ${index} successorMarketId`,
      ),
    };
  });
}

function requiredAddress(name: string): Address {
  const value = required(name);
  if (!isAddress(value, { strict: true })) {
    throw new OperatorConfigurationError(`${name} must be a checksummed or lowercase EVM address`);
  }
  const parsed = getAddress(value);
  if (parsed === zeroAddress) throw new OperatorConfigurationError(`${name} cannot be zero`);
  return parsed;
}

function marketById(manifest: CatalogManifestLike, marketId: Hex): Record<string, unknown> {
  const record = manifest.markets.find(
    (candidate) =>
      typeof candidate.marketId === "string" &&
      candidate.marketId.toLowerCase() === marketId.toLowerCase(),
  );
  if (!record) throw new OperatorConfigurationError(`catalog has no market ${marketId}`);
  return record;
}

function objectField(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new OperatorConfigurationError(`catalog market ${String(record.marketId)} lacks ${key}`);
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

function bigintField(record: Record<string, unknown>, key: string, positive = false): bigint {
  const value = record[key];
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) {
    throw new OperatorConfigurationError(`catalog ${key} is not an unsigned decimal integer`);
  }
  const parsed = BigInt(value);
  if (positive && parsed === 0n) {
    throw new OperatorConfigurationError(`catalog ${key} must be positive`);
  }
  return parsed;
}

function integerField(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (!Number.isSafeInteger(value)) {
    throw new OperatorConfigurationError(`catalog ${key} is not a safe integer`);
  }
  return value as number;
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new OperatorConfigurationError(`catalog ${key} is not a nonempty string`);
  }
  return value;
}

function sameAddress(actual: Address, expected: Address, label: string): void {
  if (getAddress(actual) !== getAddress(expected)) {
    throw new OperatorConfigurationError(`${label} mismatch: ${actual} != ${expected}`);
  }
}

function sameBigInt(actual: bigint, expected: bigint, label: string): void {
  if (actual !== expected) {
    throw new OperatorConfigurationError(`${label} mismatch: ${actual} != ${expected}`);
  }
}

async function runtimeCodeHash(
  client: PublicClient,
  address: Address,
  blockNumber: bigint,
  label: string,
): Promise<Hex> {
  const code = await client.getCode({ address, blockNumber });
  if (!code || code === "0x") {
    throw new OperatorConfigurationError(`${label} has no runtime code at the cutover block`);
  }
  return keccak256(code);
}

function expectedRuntimeHash(
  hashes: Record<string, unknown>,
  key: string,
  label: string,
): Hex {
  return bytes32Value(hashes[key], `${label} catalog runtime hash`);
}

function sameHash(actual: Hex, expected: Hex, label: string): void {
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new OperatorConfigurationError(`${label} runtime code changed after verification`);
  }
}

interface PairVerification {
  readonly predecessorMarketId: Hex;
  readonly successorMarketId: Hex;
  readonly successorPool: Address;
  readonly totalLiquidityShares: string;
  readonly builderLiquidityShares: string;
  readonly yesAtoms: string;
  readonly noAtoms: string;
}

async function assertNoPublishedCatalogChild(
  directory: string,
  parentRevision: string,
): Promise<void> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    throw new OperatorConfigurationError("cannot inspect the canonical catalog directory");
  }
  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name) !== ".json") continue;
    let value: unknown;
    try {
      value = JSON.parse(await readFile(join(directory, entry.name), "utf8")) as unknown;
    } catch {
      throw new OperatorConfigurationError(
        `cannot validate catalog sibling ${entry.name} before cutover publication`,
      );
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    if (
      record.chainId === ETHEREUM_SEPOLIA_CHAIN_ID &&
      record.previousRevisionHash === parentRevision
    ) {
      throw new OperatorConfigurationError(
        `catalog revision ${parentRevision} already has a published child ${entry.name}`,
      );
    }
  }
}

async function verifyPairAtBlock(
  client: PublicClient,
  current: CatalogManifestLike,
  pair: CatalogCutoverPair,
  lpOwner: Address,
  blockNumber: bigint,
  blockTimestamp: bigint,
): Promise<PairVerification> {
  const predecessor = marketById(current, pair.predecessorMarketId);
  const successor = marketById(current, pair.successorMarketId);
  const predecessorContracts = objectField(predecessor, "contracts");
  const predecessorTimes = objectField(predecessor, "times");
  const predecessorVerification = objectField(predecessor, "verification");
  const predecessorHashes = objectField(predecessorVerification, "runtimeCodeHashes");
  const predecessorOrderBook = addressField(predecessorContracts, "orderBook");

  const identity = objectField(successor, "identity");
  const resolverPolicy = objectField(identity, "resolverPolicy");
  const asset = identity.asset;
  if (asset !== "BTC/USD" && asset !== "ETH/USD") {
    throw new OperatorConfigurationError("v1 multi-successor activation supports BTC/USD and ETH/USD only");
  }
  const contracts = objectField(successor, "contracts");
  const collateralRecord = objectField(successor, "collateral");
  const oracle = objectField(successor, "oracle");
  const pool = objectField(successor, "pool");
  const positions = objectField(successor, "positions");
  const times = objectField(successor, "times");
  const provenance = objectField(successor, "provenance");
  const verification = objectField(successor, "verification");
  const hashes = objectField(verification, "runtimeCodeHashes");
  const verifiedBy = addressField(verification, "verifiedBy");

  const conditionalTokens = addressField(contracts, "conditionalTokens");
  const resolver = addressField(contracts, "resolver");
  const fpmm = addressField(contracts, "fpmm");
  const orderBook = addressField(contracts, "orderBook");
  const collateral = addressField(collateralRecord, "address");
  const settlementAdapter = addressField(oracle, "settlementAdapter");
  const chainlinkProxy = addressField(oracle, "proxy");
  const conditionId = bytes32Value(successor.conditionId, "catalog conditionId");
  const questionId = bytes32Value(successor.questionId, "catalog questionId");
  const assetId = bytes32Value(oracle.assetId, "catalog oracle assetId");
  const yesPositionId = bigintField(positions, "yesPositionId", true);
  const noPositionId = bigintField(positions, "noPositionId", true);
  const successorClose = bigintField(times, "tradingClosesAt", true);
  const successorResolvesAt = bigintField(times, "resolvesAt", true);
  const strikePriceWad = bigintField(identity, "strikePriceWad", true);
  const maximumObservationDelay = bigintField(
    resolverPolicy,
    "maximumObservationDelaySeconds",
    true,
  );
  const predecessorClose = bigintField(predecessorTimes, "tradingClosesAt", true);
  const declaredSeedAtoms = bigintField(pool, "completeSetsSeededAtoms", true);
  const feeBps = integerField(pool, "feeBps");

  if (oracle.source !== "CHAINLINK") {
    throw new OperatorConfigurationError("v1 successor oracle provenance must be CHAINLINK");
  }
  if (conditionalTokens !== PINNED_CONDITIONAL_TOKENS.address) {
    throw new OperatorConfigurationError("successor Conditional Tokens address violates the pinned policy");
  }
  const feedPolicy = OFFICIAL_SEPOLIA_CHAINLINK_FEEDS[asset];
  sameAddress(chainlinkProxy, feedPolicy.proxy, `${asset} Chainlink proxy`);
  if (
    stringField(oracle, "feedDescription") !== feedPolicy.description ||
    integerField(oracle, "feedDecimals") !== feedPolicy.decimals ||
    resolverPolicy.policyVersion !== "chainlink-first-observation-v1" ||
    resolverPolicy.comparison !== ">="
  ) {
    throw new OperatorConfigurationError("successor resolver/feed policy does not match the supported Chainlink policy");
  }
  if (
    provenance.conditionalTokensCommit !== PINNED_CONDITIONAL_TOKENS.sourceCommit ||
    provenance.fpmmCommit !== PINNED_FPMM_FACTORY.sourceCommit
  ) {
    throw new OperatorConfigurationError("successor source provenance does not match audited pins");
  }
  sameAddress(lpOwner, verifiedBy, "declared LP owner/catalog bundle verifier");

  const [
    onchainPredecessorClose,
    orderBookFpmm,
    orderBookConditionalTokens,
    orderBookCollateral,
    orderBookCondition,
    orderBookClose,
    orderBookYesPosition,
    orderBookNoPosition,
    poolConditionalTokens,
    poolCollateral,
    poolCondition,
    poolFee,
    totalSupply,
    builderLpShares,
    outcomeSlotCount,
    derivedConditionId,
    yesCollectionId,
    noCollectionId,
    poolYesBalance,
    poolNoBalance,
    collateralName,
    collateralSymbol,
    collateralDecimals,
    resolverConditionalTokens,
    resolverSettlementAdapter,
    resolverQuestionId,
    resolverConditionId,
    resolverAssetId,
    resolverStrikePrice,
    resolverTradingClose,
    resolverResolvesAt,
    resolverMaximumObservationDelay,
    adapterAssetId,
    adapterFeed,
    adapterFeedDecimals,
    onchainFeedDecimals,
    onchainFeedDescription,
  ] = await Promise.all([
    client.readContract({
      address: predecessorOrderBook,
      abi: orderBookAbi,
      functionName: "tradingClosesAt",
      blockNumber,
    }),
    client.readContract({ address: orderBook, abi: orderBookAbi, functionName: "fpmm", blockNumber }),
    client.readContract({
      address: orderBook,
      abi: orderBookAbi,
      functionName: "conditionalTokens",
      blockNumber,
    }),
    client.readContract({
      address: orderBook,
      abi: orderBookAbi,
      functionName: "collateral",
      blockNumber,
    }),
    client.readContract({
      address: orderBook,
      abi: orderBookAbi,
      functionName: "conditionId",
      blockNumber,
    }),
    client.readContract({
      address: orderBook,
      abi: orderBookAbi,
      functionName: "tradingClosesAt",
      blockNumber,
    }),
    client.readContract({
      address: orderBook,
      abi: orderBookAbi,
      functionName: "yesPositionId",
      blockNumber,
    }),
    client.readContract({
      address: orderBook,
      abi: orderBookAbi,
      functionName: "noPositionId",
      blockNumber,
    }),
    client.readContract({
      address: fpmm,
      abi: fpmmAbi,
      functionName: "conditionalTokens",
      blockNumber,
    }),
    client.readContract({
      address: fpmm,
      abi: fpmmAbi,
      functionName: "collateralToken",
      blockNumber,
    }),
    client.readContract({
      address: fpmm,
      abi: fpmmAbi,
      functionName: "conditionIds",
      args: [0n],
      blockNumber,
    }),
    client.readContract({ address: fpmm, abi: fpmmAbi, functionName: "fee", blockNumber }),
    client.readContract({ address: fpmm, abi: fpmmAbi, functionName: "totalSupply", blockNumber }),
    client.readContract({
      address: fpmm,
      abi: fpmmAbi,
      functionName: "balanceOf",
      args: [lpOwner],
      blockNumber,
    }),
    client.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getOutcomeSlotCount",
      args: [conditionId],
      blockNumber,
    }),
    client.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getConditionId",
      args: [resolver, questionId, 2n],
      blockNumber,
    }),
    client.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getCollectionId",
      args: [zeroHash, conditionId, 1n],
      blockNumber,
    }),
    client.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getCollectionId",
      args: [zeroHash, conditionId, 2n],
      blockNumber,
    }),
    client.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "balanceOf",
      args: [fpmm, yesPositionId],
      blockNumber,
    }),
    client.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "balanceOf",
      args: [fpmm, noPositionId],
      blockNumber,
    }),
    client.readContract({ address: collateral, abi: collateralAbi, functionName: "name", blockNumber }),
    client.readContract({ address: collateral, abi: collateralAbi, functionName: "symbol", blockNumber }),
    client.readContract({ address: collateral, abi: collateralAbi, functionName: "decimals", blockNumber }),
    client.readContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "conditionalTokens",
      blockNumber,
    }),
    client.readContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "settlementAdapter",
      blockNumber,
    }),
    client.readContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "questionId",
      blockNumber,
    }),
    client.readContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "conditionId",
      blockNumber,
    }),
    client.readContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "assetId",
      blockNumber,
    }),
    client.readContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "strikePriceWad",
      blockNumber,
    }),
    client.readContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "tradingClosesAt",
      blockNumber,
    }),
    client.readContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "resolvesAt",
      blockNumber,
    }),
    client.readContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "maximumObservationDelay",
      blockNumber,
    }),
    client.readContract({
      address: settlementAdapter,
      abi: settlementAdapterAbi,
      functionName: "assetId",
      blockNumber,
    }),
    client.readContract({
      address: settlementAdapter,
      abi: settlementAdapterAbi,
      functionName: "feed",
      blockNumber,
    }),
    client.readContract({
      address: settlementAdapter,
      abi: settlementAdapterAbi,
      functionName: "feedDecimals",
      blockNumber,
    }),
    client.readContract({
      address: chainlinkProxy,
      abi: chainlinkFeedAbi,
      functionName: "decimals",
      blockNumber,
    }),
    client.readContract({
      address: chainlinkProxy,
      abi: chainlinkFeedAbi,
      functionName: "description",
      blockNumber,
    }),
  ] as const);

  sameBigInt(onchainPredecessorClose, predecessorClose, "predecessor OrderBook close");
  if (onchainPredecessorClose > blockTimestamp) {
    throw new OperatorConfigurationError("predecessor OrderBook is still ordering-open at cutover block");
  }
  sameBigInt(orderBookClose, successorClose, "successor OrderBook close");
  if (orderBookClose <= blockTimestamp) {
    throw new OperatorConfigurationError("successor OrderBook is closed at cutover block");
  }
  sameAddress(orderBookFpmm, fpmm, "OrderBook FPMM");
  sameAddress(orderBookConditionalTokens, conditionalTokens, "OrderBook Conditional Tokens");
  sameAddress(orderBookCollateral, collateral, "OrderBook collateral");
  if (orderBookCondition !== conditionId) {
    throw new OperatorConfigurationError("OrderBook condition mismatch");
  }
  sameBigInt(orderBookYesPosition, yesPositionId, "OrderBook YES position");
  sameBigInt(orderBookNoPosition, noPositionId, "OrderBook NO position");

  sameAddress(poolConditionalTokens, conditionalTokens, "FPMM Conditional Tokens");
  sameAddress(poolCollateral, collateral, "FPMM collateral");
  if (poolCondition !== conditionId) throw new OperatorConfigurationError("FPMM condition mismatch");
  sameBigInt(poolFee, BigInt(feeBps) * FPMM_FEE_SCALE, "FPMM fee");
  sameBigInt(outcomeSlotCount, 2n, "condition outcome count");
  if (derivedConditionId !== conditionId) {
    throw new OperatorConfigurationError("Conditional Tokens condition identity mismatch");
  }
  const [derivedYesPositionId, derivedNoPositionId] = await Promise.all([
    client.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getPositionId",
      args: [collateral, yesCollectionId],
      blockNumber,
    }),
    client.readContract({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getPositionId",
      args: [collateral, noCollectionId],
      blockNumber,
    }),
  ] as const);
  sameBigInt(derivedYesPositionId, yesPositionId, "derived YES position");
  sameBigInt(derivedNoPositionId, noPositionId, "derived NO position");
  if (
    totalSupply === 0n ||
    builderLpShares === 0n ||
    poolYesBalance === 0n ||
    poolNoBalance === 0n ||
    declaredSeedAtoms === 0n
  ) {
    throw new OperatorConfigurationError("successor lacks positive onchain builder liquidity");
  }

  if (
    collateralName !== COLLATERAL_NAME ||
    collateralSymbol !== COLLATERAL_SYMBOL ||
    collateralDecimals !== COLLATERAL_DECIMALS
  ) {
    throw new OperatorConfigurationError("successor collateral metadata mismatch");
  }
  sameAddress(resolverConditionalTokens, conditionalTokens, "resolver Conditional Tokens");
  sameAddress(resolverSettlementAdapter, settlementAdapter, "resolver settlement adapter");
  if (resolverQuestionId !== questionId || resolverConditionId !== conditionId) {
    throw new OperatorConfigurationError("resolver question/condition identity mismatch");
  }
  if (resolverAssetId !== assetId || adapterAssetId !== assetId) {
    throw new OperatorConfigurationError("resolver/settlement adapter asset ID mismatch");
  }
  sameBigInt(resolverStrikePrice, strikePriceWad, "resolver strike price");
  sameBigInt(resolverTradingClose, successorClose, "resolver trading close");
  sameBigInt(resolverResolvesAt, successorResolvesAt, "resolver resolution time");
  sameBigInt(
    resolverMaximumObservationDelay,
    maximumObservationDelay,
    "resolver maximum observation delay",
  );
  sameAddress(adapterFeed, chainlinkProxy, "settlement adapter feed");
  if (
    adapterFeedDecimals !== feedPolicy.decimals ||
    onchainFeedDecimals !== feedPolicy.decimals ||
    onchainFeedDescription !== feedPolicy.description
  ) {
    throw new OperatorConfigurationError("settlement adapter/Chainlink feed metadata mismatch");
  }

  const runtimeTargets = [
    ["predecessor OrderBook", predecessorOrderBook, expectedRuntimeHash(predecessorHashes, "orderBook", "predecessor OrderBook")],
    ["collateral", collateral, expectedRuntimeHash(hashes, "collateral", "collateral")],
    ["settlement adapter", settlementAdapter, expectedRuntimeHash(hashes, "settlementAdapter", "settlement adapter")],
    ["Conditional Tokens", conditionalTokens, expectedRuntimeHash(hashes, "conditionalTokens", "Conditional Tokens")],
    ["resolver", resolver, expectedRuntimeHash(hashes, "resolver", "resolver")],
    ["FPMM", fpmm, expectedRuntimeHash(hashes, "fpmm", "FPMM")],
    ["OrderBook", orderBook, expectedRuntimeHash(hashes, "orderBook", "OrderBook")],
    ["Chainlink proxy", chainlinkProxy, feedPolicy.runtimeCodeHash],
  ] as const;
  if (runtimeTargets[3][2].toLowerCase() !== PINNED_CONDITIONAL_TOKENS.runtimeCodeHash.toLowerCase()) {
    throw new OperatorConfigurationError("catalog Conditional Tokens runtime hash violates the pinned policy");
  }
  const actualRuntimeHashes = await Promise.all(
    runtimeTargets.map(([label, target]) => runtimeCodeHash(client, target, blockNumber, label)),
  );
  for (const [index, [label, , expected]] of runtimeTargets.entries()) {
    const actual = actualRuntimeHashes[index];
    if (!actual) throw new OperatorConfigurationError(`${label} runtime verification was not recorded`);
    sameHash(actual, expected, label);
  }

  return {
    predecessorMarketId: pair.predecessorMarketId,
    successorMarketId: pair.successorMarketId,
    successorPool: fpmm,
    totalLiquidityShares: totalSupply.toString(),
    builderLiquidityShares: builderLpShares.toString(),
    yesAtoms: poolYesBalance.toString(),
    noAtoms: poolNoBalance.toString(),
  };
}

async function main(): Promise<void> {
  requireExplicitWrite(process.env, "ACTIVATE_SEPOLIA_SUCCESSORS");
  const pairs = cutoverPairs();
  const lpOwner = requiredAddress("NOXLIMIT_LP_OWNER");
  const outputPath = resolve(explicitPath(process.env, "NOXLIMIT_CATALOG_OUTPUT_PATH"));
  await assertOutputReady(outputPath);
  const authority = await loadCatalogAuthority();
  const catalogPaths = historyPaths(process.env);
  const initialHistory = await loadCatalogHistory(catalogPaths, authority);
  const initialCurrent = initialHistory.at(-1);
  if (!initialCurrent) throw new OperatorConfigurationError("catalog history is empty");
  const currentCatalogPath = resolve(catalogPaths.at(-1)!);
  const catalogDirectory = dirname(currentCatalogPath);
  if (dirname(outputPath) !== catalogDirectory || extname(outputPath) !== ".json") {
    throw new OperatorConfigurationError(
      "catalog cutover output must be a JSON file in the canonical catalog directory",
    );
  }
  const lockPath = join(
    catalogDirectory,
    `.noxlimit-next-${initialCurrent.catalogRevision.slice(2).toLowerCase()}.lock`,
  );

  await withExclusiveOperatorLock(lockPath, async () => {
    let history = await loadCatalogHistory(catalogPaths, authority);
    let current = history.at(-1);
    if (!current || current.catalogRevision !== initialCurrent.catalogRevision) {
      throw new OperatorConfigurationError("catalog authority changed before cutover verification");
    }
    await assertNoPublishedCatalogChild(catalogDirectory, current.catalogRevision);

    const connection = await network.create();
    if (connection.networkName !== "sepolia") {
      throw new OperatorConfigurationError("multi-successor activation must use the read-only sepolia network");
    }
    const client = await connection.viem.getPublicClient();
    const chainId = await client.getChainId();
    if (chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) {
      throw new OperatorConfigurationError(`refusing multi-successor activation on chain ${chainId}`);
    }

    const block = await client.getBlock({ blockTag: "safe" });
    if (!block.hash) {
      throw new OperatorConfigurationError("safe cutover snapshot has no canonical block hash");
    }
    const effectiveAt = new Date(Number(block.timestamp) * 1_000).toISOString();
    const candidate = buildCatalogMultiCutoverCandidate(
      history,
      pairs,
      effectiveAt,
      block.number,
      authority,
    );
    const pairVerifications: PairVerification[] = [];
    for (const pair of pairs) {
      pairVerifications.push(
        await verifyPairAtBlock(
          client,
          current,
          pair,
          lpOwner,
          block.number,
          block.timestamp,
        ),
      );
    }

    const canonicalSnapshot = await client.getBlock({ blockNumber: block.number });
    if (
      !canonicalSnapshot.hash ||
      canonicalSnapshot.hash.toLowerCase() !== block.hash.toLowerCase() ||
      canonicalSnapshot.timestamp !== block.timestamp
    ) {
      throw new OperatorConfigurationError("safe cutover snapshot changed during verification");
    }

    history = await loadCatalogHistory(catalogPaths, authority);
    current = history.at(-1);
    if (!current || current.catalogRevision !== initialCurrent.catalogRevision) {
      throw new OperatorConfigurationError("catalog authority changed during cutover verification");
    }
    await assertNoPublishedCatalogChild(catalogDirectory, current.catalogRevision);
    authority.validateCatalogChain([...history, candidate]);
    await writeJsonExclusive(outputPath, candidate);
    process.stdout.write(
      `${JSON.stringify({
        catalogCandidateCreated: true,
        networkWrites: 0,
        pairCount: pairs.length,
        pairs: pairVerifications,
        catalogRevision: candidate.catalogRevision,
        effectiveAt,
        effectiveBlock: block.number.toString(),
        effectiveBlockHash: block.hash,
        outputPath,
      })}\n`,
    );
  });
}

try {
  await main();
} catch (error) {
  if (error instanceof OperatorConfigurationError) throw error;
  throw new OperatorConfigurationError(
    "multi-successor verification failed; no catalog candidate was created",
  );
}
