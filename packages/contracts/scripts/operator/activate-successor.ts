import { network } from "hardhat";
import {
  getAddress,
  isAddress,
  keccak256,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
} from "viem";

import { conditionalTokensAbi, fpmmAbi, orderBookAbi } from "./abis.js";
import {
  ETHEREUM_SEPOLIA_CHAIN_ID,
  OFFICIAL_SEPOLIA_CHAINLINK_FEEDS,
  OperatorConfigurationError,
  PINNED_CONDITIONAL_TOKENS,
  PINNED_FPMM_FACTORY,
  assertOutputReady,
  buildCatalogCutoverCandidate,
  explicitPath,
  historyPaths,
  loadCatalogAuthority,
  loadCatalogHistory,
  requireExplicitWrite,
  writeJsonExclusive,
} from "./lib.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new OperatorConfigurationError(`${name} is required`);
  return value;
}

function bytes32(name: string): Hex {
  const value = required(name);
  if (!/^0x[0-9a-f]{64}$/i.test(value) || value.toLowerCase() === zeroHash) {
    throw new OperatorConfigurationError(`${name} must be a nonzero bytes32`);
  }
  return value as Hex;
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

function bigintField(record: Record<string, unknown>, key: string): bigint {
  const value = record[key];
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) {
    throw new OperatorConfigurationError(`catalog ${key} is not an unsigned decimal integer`);
  }
  return BigInt(value);
}

async function main(): Promise<void> {
  requireExplicitWrite(process.env, "ACTIVATE_SEPOLIA_SUCCESSOR");
  const predecessorMarketId = bytes32("NOXLIMIT_PREDECESSOR_MARKET_ID");
  const successorMarketId = bytes32("NOXLIMIT_SUCCESSOR_MARKET_ID");
  const outputPath = explicitPath(process.env, "NOXLIMIT_CATALOG_OUTPUT_PATH");
  await assertOutputReady(outputPath);
  const authority = await loadCatalogAuthority();
  const history = await loadCatalogHistory(historyPaths(process.env), authority);
  const current = history.at(-1);
  if (!current) throw new OperatorConfigurationError("catalog history is empty");
  const predecessor = current.markets.find(
    (record) =>
      typeof record.marketId === "string" &&
      record.marketId.toLowerCase() === predecessorMarketId.toLowerCase(),
  );
  const successor = current.markets.find(
    (record) =>
      typeof record.marketId === "string" &&
      record.marketId.toLowerCase() === successorMarketId.toLowerCase(),
  );
  if (!predecessor || !successor) {
    throw new OperatorConfigurationError("cutover markets must both exist in the current catalog");
  }

  const connection = await network.create();
  if (connection.networkName !== "sepolia") {
    throw new OperatorConfigurationError("successor activation must use the read-only sepolia network");
  }
  const client = await connection.viem.getPublicClient();
  const chainId = await client.getChainId();
  if (chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) {
    throw new OperatorConfigurationError(`refusing successor activation on chain ${chainId}`);
  }
  const block = await client.getBlock();
  const effectiveAt = new Date(Number(block.timestamp) * 1_000).toISOString();

  const predecessorContracts = objectField(predecessor, "contracts");
  const predecessorTimes = objectField(predecessor, "times");
  const predecessorOrderBook = addressField(predecessorContracts, "orderBook");
  const successorContracts = objectField(successor, "contracts");
  const successorCollateral = objectField(successor, "collateral");
  const successorIdentity = objectField(successor, "identity");
  const successorOracle = objectField(successor, "oracle");
  const successorVerification = objectField(successor, "verification");
  const successorHashes = objectField(successorVerification, "runtimeCodeHashes");
  const successorOrderBook = addressField(successorContracts, "orderBook");
  const successorFpmm = addressField(successorContracts, "fpmm");
  const successorConditionalTokens = addressField(successorContracts, "conditionalTokens");
  const collateral = addressField(successorCollateral, "address");
  const conditionId = bytes32FromRecord(successor, "conditionId");
  const yesPositionId = bigintField(objectField(successor, "positions"), "yesPositionId");
  const noPositionId = bigintField(objectField(successor, "positions"), "noPositionId");
  const asset = successorIdentity.asset;
  if (asset !== "BTC/USD" && asset !== "ETH/USD") {
    throw new OperatorConfigurationError("v1 successor activation supports only BTC/USD or ETH/USD");
  }
  const feedPolicy = OFFICIAL_SEPOLIA_CHAINLINK_FEEDS[asset];
  if (
    successorConditionalTokens !== PINNED_CONDITIONAL_TOKENS.address ||
    addressField(successorOracle, "proxy") !== feedPolicy.proxy
  ) {
    throw new OperatorConfigurationError("successor external infrastructure violates the pinned policy");
  }
  const provenance = objectField(successor, "provenance");
  if (
    provenance.conditionalTokensCommit !== PINNED_CONDITIONAL_TOKENS.sourceCommit ||
    provenance.fpmmCommit !== PINNED_FPMM_FACTORY.sourceCommit
  ) {
    throw new OperatorConfigurationError("successor source provenance does not match audited pins");
  }

  const [
    predecessorClose,
    successorClose,
    orderBookFpmm,
    orderBookConditionalTokens,
    orderBookCollateral,
    orderBookCondition,
    poolConditionalTokens,
    poolCollateral,
    poolCondition,
    totalSupply,
    yesBalance,
    noBalance,
  ] = await Promise.all([
    client.readContract({
      address: predecessorOrderBook,
      abi: orderBookAbi,
      functionName: "tradingClosesAt",
    }),
    client.readContract({
      address: successorOrderBook,
      abi: orderBookAbi,
      functionName: "tradingClosesAt",
    }),
    client.readContract({ address: successorOrderBook, abi: orderBookAbi, functionName: "fpmm" }),
    client.readContract({
      address: successorOrderBook,
      abi: orderBookAbi,
      functionName: "conditionalTokens",
    }),
    client.readContract({
      address: successorOrderBook,
      abi: orderBookAbi,
      functionName: "collateral",
    }),
    client.readContract({
      address: successorOrderBook,
      abi: orderBookAbi,
      functionName: "conditionId",
    }),
    client.readContract({
      address: successorFpmm,
      abi: fpmmAbi,
      functionName: "conditionalTokens",
    }),
    client.readContract({ address: successorFpmm, abi: fpmmAbi, functionName: "collateralToken" }),
    client.readContract({
      address: successorFpmm,
      abi: fpmmAbi,
      functionName: "conditionIds",
      args: [0n],
    }),
    client.readContract({ address: successorFpmm, abi: fpmmAbi, functionName: "totalSupply" }),
    client.readContract({
      address: successorConditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "balanceOf",
      args: [successorFpmm, yesPositionId],
    }),
    client.readContract({
      address: successorConditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "balanceOf",
      args: [successorFpmm, noPositionId],
    }),
  ] as const);
  if (
    predecessorClose !== bigintField(predecessorTimes, "tradingClosesAt") ||
    predecessorClose > block.timestamp
  ) {
    throw new OperatorConfigurationError("predecessor OrderBook is still ordering-open or mismatched");
  }
  if (
    successorClose !== bigintField(objectField(successor, "times"), "tradingClosesAt") ||
    successorClose <= block.timestamp
  ) {
    throw new OperatorConfigurationError("successor OrderBook is closed or mismatched");
  }
  if (
    getAddress(orderBookFpmm) !== successorFpmm ||
    getAddress(orderBookConditionalTokens) !== successorConditionalTokens ||
    getAddress(orderBookCollateral) !== collateral ||
    orderBookCondition !== conditionId ||
    getAddress(poolConditionalTokens) !== successorConditionalTokens ||
    getAddress(poolCollateral) !== collateral ||
    poolCondition !== conditionId
  ) {
    throw new OperatorConfigurationError("successor OrderBook/FPMM immutable bindings do not match catalog");
  }
  if (totalSupply === 0n || yesBalance === 0n || noBalance === 0n) {
    throw new OperatorConfigurationError("successor is not currently seeded and tradeable");
  }

  for (const [label, target, expectedHash] of [
    ["Conditional Tokens", successorConditionalTokens, successorHashes.conditionalTokens],
    ["successor FPMM", successorFpmm, successorHashes.fpmm],
    ["successor OrderBook", successorOrderBook, successorHashes.orderBook],
  ] as const) {
    if (typeof expectedHash !== "string" || !/^0x[0-9a-f]{64}$/i.test(expectedHash)) {
      throw new OperatorConfigurationError(`${label} catalog runtime hash is invalid`);
    }
    const code = await client.getCode({ address: target });
    if (!code || code === "0x" || keccak256(code).toLowerCase() !== expectedHash.toLowerCase()) {
      throw new OperatorConfigurationError(`${label} runtime code changed after immutable verification`);
    }
  }

  const candidate = buildCatalogCutoverCandidate(
    history,
    predecessorMarketId,
    successorMarketId,
    effectiveAt,
    block.number,
    authority,
  );
  await writeJsonExclusive(outputPath, candidate);
  process.stdout.write(
    `${JSON.stringify({
      activated: true,
      predecessorMarketId,
      successorMarketId,
      catalogRevision: candidate.catalogRevision,
      effectiveAt,
      effectiveBlock: block.number.toString(),
      outputPath,
    })}\n`,
  );
}

function bytes32FromRecord(record: Record<string, unknown>, key: string): Hex {
  const value = record[key];
  if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/i.test(value) || value === zeroHash) {
    throw new OperatorConfigurationError(`catalog ${key} is not a nonzero bytes32`);
  }
  return value as Hex;
}

await main();
