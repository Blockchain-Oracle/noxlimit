import type { CatalogManifest, ImmutableMarketRecord } from "@noxlimit/catalog";
import {
  conditionalTokensAbi,
  erc20Abi,
  fixedProductMarketMakerAbi,
  noxLimitOrderBookAbi,
} from "@noxlimit/protocol";
import { keccak256, type Address, type Hex, type PublicClient } from "viem";

const resolverBindingAbi = [
  { type: "function", name: "conditionalTokens", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "settlementAdapter", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "questionId", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "assetId", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "strikePriceWad", stateMutability: "view", inputs: [], outputs: [{ type: "int256" }] },
  { type: "function", name: "tradingClosesAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "resolvesAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "maximumObservationDelay", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
] as const;

const settlementAdapterBindingAbi = [
  { type: "function", name: "assetId", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
] as const;

const chainlinkAdapterBindingAbi = [
  ...settlementAdapterBindingAbi,
  { type: "function", name: "feed", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "feedDecimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

const erc20MetadataAbi = [
  ...erc20Abi,
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

const conditionalTokensVerificationAbi = [
  ...conditionalTokensAbi,
  {
    type: "function",
    name: "getOutcomeSlotCount",
    stateMutability: "view",
    inputs: [{ type: "bytes32", name: "conditionId" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export class CatalogChainVerificationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Catalog chain verification failed:\n- ${issues.join("\n- ")}`);
    this.name = "CatalogChainVerificationError";
  }
}

/**
 * Verify immutable catalog claims against the selected chain before exposing a revision.
 * Empty bootstrap catalogs are valid and expose no product markets.
 */
export async function verifyCatalogOnchain(
  manifest: CatalogManifest,
  client: PublicClient,
): Promise<void> {
  const chainId = await client.getChainId();
  if (chainId !== manifest.chainId) {
    throw new CatalogChainVerificationError([
      `RPC chain ${chainId} does not match catalog chain ${manifest.chainId}`,
    ]);
  }

  const issues: string[] = [];
  for (const record of manifest.markets) {
    issues.push(...(await verifyRecord(record, client)));
  }
  if (issues.length > 0) throw new CatalogChainVerificationError(issues);
}

async function verifyRecord(
  record: ImmutableMarketRecord,
  client: PublicClient,
): Promise<string[]> {
  const issues: string[] = [];
  const label = record.marketId;
  const codeTargets: ReadonlyArray<readonly [string, Address, Hex]> = [
    ["collateral", record.collateral.address, record.verification.runtimeCodeHashes.collateral],
    ["settlementAdapter", record.oracle.settlementAdapter, record.verification.runtimeCodeHashes.settlementAdapter],
    ["conditionalTokens", record.contracts.conditionalTokens, record.verification.runtimeCodeHashes.conditionalTokens],
    ["resolver", record.contracts.resolver, record.verification.runtimeCodeHashes.resolver],
    ["fpmm", record.contracts.fpmm, record.verification.runtimeCodeHashes.fpmm],
    ["orderBook", record.contracts.orderBook, record.verification.runtimeCodeHashes.orderBook],
  ];
  for (const [name, address, expectedHash] of codeTargets) {
    const bytecode = await client.getCode({ address });
    if (!bytecode || bytecode === "0x") {
      issues.push(`${label}: ${name} has no runtime code at ${address}`);
    } else if (keccak256(bytecode).toLowerCase() !== expectedHash.toLowerCase()) {
      issues.push(`${label}: ${name} runtime code hash does not match verified evidence`);
    }
  }
  if (issues.length > 0) return issues;

  const read = async <T>(input: Parameters<PublicClient["readContract"]>[0]): Promise<T> =>
    client.readContract(input) as Promise<T>;
  const expectEqual = (name: string, actual: unknown, expected: unknown): void => {
    const left = typeof actual === "string" ? actual.toLowerCase() : actual?.toString();
    const right = typeof expected === "string" ? expected.toLowerCase() : expected?.toString();
    if (left !== right) issues.push(`${label}: ${name} mismatch (${String(actual)} != ${String(expected)})`);
  };

  try {
    const [
      collateralName,
      collateralSymbol,
      collateralDecimals,
      fpmmCollateral,
      fpmmConditionalTokens,
      fpmmCondition,
      fpmmFee,
      slotCount,
      orderBookFpmm,
      orderBookConditionalTokens,
      orderBookCollateral,
      orderBookCondition,
      orderBookClose,
      yesPositionId,
      noPositionId,
      evaluationTimeout,
      publicationTimeout,
      minimumEvaluationInterval,
      maximumEvaluations,
      resolverConditionalTokens,
      resolverAdapter,
      resolverQuestion,
      resolverAsset,
      resolverStrike,
      resolverClose,
      resolverTime,
      resolverDelay,
      adapterAsset,
    ] = await Promise.all([
      read<string>({ address: record.collateral.address, abi: erc20MetadataAbi, functionName: "name" }),
      read<string>({ address: record.collateral.address, abi: erc20MetadataAbi, functionName: "symbol" }),
      read<number>({ address: record.collateral.address, abi: erc20MetadataAbi, functionName: "decimals" }),
      read<Address>({ address: record.contracts.fpmm, abi: fixedProductMarketMakerAbi, functionName: "collateralToken" }),
      read<Address>({ address: record.contracts.fpmm, abi: fixedProductMarketMakerAbi, functionName: "conditionalTokens" }),
      read<Hex>({ address: record.contracts.fpmm, abi: fixedProductMarketMakerAbi, functionName: "conditionIds", args: [0n] }),
      read<bigint>({ address: record.contracts.fpmm, abi: fixedProductMarketMakerAbi, functionName: "fee" }),
      read<bigint>({ address: record.contracts.conditionalTokens, abi: conditionalTokensVerificationAbi, functionName: "getOutcomeSlotCount", args: [record.conditionId] }),
      read<Address>({ address: record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "fpmm" }),
      read<Address>({ address: record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "conditionalTokens" }),
      read<Address>({ address: record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "collateral" }),
      read<Hex>({ address: record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "conditionId" }),
      read<bigint>({ address: record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "tradingClosesAt" }),
      read<bigint>({ address: record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "yesPositionId" }),
      read<bigint>({ address: record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "noPositionId" }),
      read<bigint>({ address: record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "evaluationTimeout" }),
      read<bigint>({ address: record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "publicationTimeout" }),
      read<bigint>({ address: record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "minimumEvaluationInterval" }),
      read<number>({ address: record.contracts.orderBook, abi: noxLimitOrderBookAbi, functionName: "maximumEvaluations" }),
      read<Address>({ address: record.contracts.resolver, abi: resolverBindingAbi, functionName: "conditionalTokens" }),
      read<Address>({ address: record.contracts.resolver, abi: resolverBindingAbi, functionName: "settlementAdapter" }),
      read<Hex>({ address: record.contracts.resolver, abi: resolverBindingAbi, functionName: "questionId" }),
      read<Hex>({ address: record.contracts.resolver, abi: resolverBindingAbi, functionName: "assetId" }),
      read<bigint>({ address: record.contracts.resolver, abi: resolverBindingAbi, functionName: "strikePriceWad" }),
      read<bigint>({ address: record.contracts.resolver, abi: resolverBindingAbi, functionName: "tradingClosesAt" }),
      read<bigint>({ address: record.contracts.resolver, abi: resolverBindingAbi, functionName: "resolvesAt" }),
      read<bigint>({ address: record.contracts.resolver, abi: resolverBindingAbi, functionName: "maximumObservationDelay" }),
      read<Hex>({ address: record.oracle.settlementAdapter, abi: settlementAdapterBindingAbi, functionName: "assetId" }),
    ]);

    expectEqual("collateral name", collateralName, record.collateral.name);
    expectEqual("collateral symbol", collateralSymbol, record.collateral.symbol);
    expectEqual("collateral decimals", collateralDecimals, record.collateral.decimals);
    expectEqual("FPMM collateral", fpmmCollateral, record.collateral.address);
    expectEqual("FPMM Conditional Tokens", fpmmConditionalTokens, record.contracts.conditionalTokens);
    expectEqual("FPMM condition", fpmmCondition, record.conditionId);
    expectEqual("FPMM fee", fpmmFee, BigInt(record.pool.feeBps) * 100_000_000_000_000n);
    expectEqual("condition outcome slots", slotCount, 2n);
    expectEqual("OrderBook FPMM", orderBookFpmm, record.contracts.fpmm);
    expectEqual("OrderBook Conditional Tokens", orderBookConditionalTokens, record.contracts.conditionalTokens);
    expectEqual("OrderBook collateral", orderBookCollateral, record.collateral.address);
    expectEqual("OrderBook condition", orderBookCondition, record.conditionId);
    expectEqual("OrderBook trading close", orderBookClose, record.times.tradingClosesAt);
    expectEqual("OrderBook YES position", yesPositionId, record.positions.yesPositionId);
    expectEqual("OrderBook NO position", noPositionId, record.positions.noPositionId);
    expectEqual("evaluation timeout", evaluationTimeout, record.monitoringPolicy.evaluationTimeoutSeconds);
    expectEqual("publication timeout", publicationTimeout, record.monitoringPolicy.publicationTimeoutSeconds);
    expectEqual("minimum evaluation interval", minimumEvaluationInterval, record.monitoringPolicy.minimumEvaluationIntervalSeconds);
    expectEqual("maximum evaluations", maximumEvaluations, record.monitoringPolicy.maximumEvaluations);
    expectEqual("resolver Conditional Tokens", resolverConditionalTokens, record.contracts.conditionalTokens);
    expectEqual("resolver adapter", resolverAdapter, record.oracle.settlementAdapter);
    expectEqual("resolver question", resolverQuestion, record.questionId);
    expectEqual("resolver asset", resolverAsset, record.oracle.assetId);
    expectEqual("resolver strike", resolverStrike, record.identity.strikePriceWad);
    expectEqual("resolver trading close", resolverClose, record.times.tradingClosesAt);
    expectEqual("resolver time", resolverTime, record.times.resolvesAt);
    expectEqual(
      "resolver observation delay",
      resolverDelay,
      record.identity.resolverPolicy.maximumObservationDelaySeconds,
    );
    expectEqual("settlement adapter asset", adapterAsset, record.oracle.assetId);
    if (record.oracle.source === "CHAINLINK") {
      const [adapterFeed, adapterFeedDecimals] = await Promise.all([
        read<Address>({
          address: record.oracle.settlementAdapter,
          abi: chainlinkAdapterBindingAbi,
          functionName: "feed",
        }),
        read<number>({
          address: record.oracle.settlementAdapter,
          abi: chainlinkAdapterBindingAbi,
          functionName: "feedDecimals",
        }),
      ]);
      expectEqual("settlement adapter feed", adapterFeed, record.oracle.proxy);
      expectEqual("settlement adapter feed decimals", adapterFeedDecimals, record.oracle.feedDecimals);
    }
  } catch (error) {
    issues.push(`${label}: immutable binding read failed (${errorMessage(error)})`);
  }
  return issues;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.split("\n")[0] : String(error);
}
