import {
  getAddress,
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
  fundingTreasuryAbi,
  orderBookAbi,
  resolverAbi,
  settlementAdapterAbi,
} from "./abis.js";
import {
  COLLATERAL_DECIMALS,
  COLLATERAL_NAME,
  COLLATERAL_SYMBOL,
  OFFICIAL_SEPOLIA_CHAINLINK_FEEDS,
  OperatorConfigurationError,
  PINNED_CONDITIONAL_TOKENS,
  PINNED_FPMM_FACTORY,
  type BundleConfig,
} from "./lib.js";

export interface DeployedAddresses {
  readonly collateral: Address;
  readonly settlementAdapter: Address;
  readonly resolver: Address;
  readonly fpmm: Address;
  readonly orderBook: Address;
  readonly fundingTreasury: Address;
}

export interface VerificationResult {
  readonly feedDescription: string;
  readonly feedDecimals: number;
  readonly yesPositionId: bigint;
  readonly noPositionId: bigint;
  readonly poolYesBalance: bigint;
  readonly poolNoBalance: bigint;
  readonly lpShares: bigint;
  readonly runtimeCodeHashes: {
    readonly collateral: Hex;
    readonly settlementAdapter: Hex;
    readonly conditionalTokens: Hex;
    readonly resolver: Hex;
    readonly fpmm: Hex;
    readonly fpmmFactory: Hex;
    readonly chainlinkProxy: Hex;
    readonly orderBook: Hex;
    readonly fundingTreasury: Hex;
  };
}

export interface InfrastructureVerificationResult {
  readonly feedDescription: string;
  readonly feedDecimals: number;
  readonly runtimeCodeHashes: {
    readonly conditionalTokens: Hex;
    readonly fpmmFactory: Hex;
    readonly chainlinkProxy: Hex;
  };
}

function sameAddress(actual: Address, expected: Address, label: string): void {
  if (getAddress(actual) !== getAddress(expected)) {
    throw new OperatorConfigurationError(`${label} binding mismatch: ${actual} != ${expected}`);
  }
}

function sameBigInt(actual: bigint, expected: bigint, label: string): void {
  if (actual !== expected) {
    throw new OperatorConfigurationError(`${label} mismatch: ${actual} != ${expected}`);
  }
}

async function runtimeCodeHash(client: PublicClient, address: Address, label: string): Promise<Hex> {
  const code = await client.getCode({ address });
  if (!code || code === "0x") {
    throw new OperatorConfigurationError(`${label} has no runtime code at ${address}`);
  }
  const hash = keccak256(code);
  if (hash === zeroHash) throw new OperatorConfigurationError(`${label} has an invalid code hash`);
  return hash;
}

function sameCodeHash(actual: Hex, expected: Hex, label: string): void {
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new OperatorConfigurationError(
      `${label} runtime code hash mismatch: ${actual} != ${expected}`,
    );
  }
}

export async function verifyPinnedInfrastructure(
  client: PublicClient,
  config: BundleConfig,
): Promise<InfrastructureVerificationResult> {
  const policy = OFFICIAL_SEPOLIA_CHAINLINK_FEEDS[config.asset];
  const [conditionalTokensHash, fpmmFactoryHash, chainlinkProxyHash, feedDescription, feedDecimals] =
    await Promise.all([
      runtimeCodeHash(client, config.conditionalTokens, "Conditional Tokens"),
      runtimeCodeHash(client, config.fpmmFactory, "FPMM factory"),
      runtimeCodeHash(client, config.chainlinkProxy, "Chainlink proxy"),
      client.readContract({
        address: config.chainlinkProxy,
        abi: chainlinkFeedAbi,
        functionName: "description",
      }),
      client.readContract({
        address: config.chainlinkProxy,
        abi: chainlinkFeedAbi,
        functionName: "decimals",
      }),
    ] as const);
  sameCodeHash(
    conditionalTokensHash,
    PINNED_CONDITIONAL_TOKENS.runtimeCodeHash,
    "Conditional Tokens",
  );
  sameCodeHash(fpmmFactoryHash, PINNED_FPMM_FACTORY.runtimeCodeHash, "FPMM factory");
  sameCodeHash(chainlinkProxyHash, policy.runtimeCodeHash, `${config.asset} Chainlink proxy`);
  if (feedDescription !== policy.description || feedDecimals !== policy.decimals) {
    throw new OperatorConfigurationError(
      `${config.asset} Chainlink metadata mismatch: ${feedDescription}/${feedDecimals}`,
    );
  }
  return {
    feedDescription,
    feedDecimals,
    runtimeCodeHashes: {
      conditionalTokens: conditionalTokensHash,
      fpmmFactory: fpmmFactoryHash,
      chainlinkProxy: chainlinkProxyHash,
    },
  };
}

export async function verifyDeployedBundle(
  client: PublicClient,
  operator: Address,
  config: BundleConfig,
  addresses: DeployedAddresses,
  questionId: Hex,
  conditionId: Hex,
  assetId: Hex,
): Promise<VerificationResult> {
  const infrastructure = await verifyPinnedInfrastructure(client, config);
  const codeHashes = await Promise.all([
    runtimeCodeHash(client, addresses.collateral, "collateral"),
    runtimeCodeHash(client, addresses.settlementAdapter, "settlement adapter"),
    runtimeCodeHash(client, addresses.resolver, "resolver"),
    runtimeCodeHash(client, addresses.fpmm, "FPMM"),
    runtimeCodeHash(client, addresses.orderBook, "OrderBook"),
    runtimeCodeHash(client, addresses.fundingTreasury, "funding treasury"),
  ]);

  const [collateralName, collateralSymbol, collateralDecimals, collateralIssuer] = await Promise.all([
    client.readContract({ address: addresses.collateral, abi: collateralAbi, functionName: "name" }),
    client.readContract({ address: addresses.collateral, abi: collateralAbi, functionName: "symbol" }),
    client.readContract({ address: addresses.collateral, abi: collateralAbi, functionName: "decimals" }),
    client.readContract({ address: addresses.collateral, abi: collateralAbi, functionName: "issuer" }),
  ]);
  if (collateralName !== COLLATERAL_NAME || collateralSymbol !== COLLATERAL_SYMBOL) {
    throw new OperatorConfigurationError("collateral metadata does not match the catalog contract");
  }
  if (collateralDecimals !== COLLATERAL_DECIMALS) {
    throw new OperatorConfigurationError("collateral must use exactly six decimals");
  }
  sameAddress(collateralIssuer, operator, "collateral issuer");

  const { feedDescription, feedDecimals } = infrastructure;

  const [adapterAssetId, adapterFeed, adapterDecimals] = await Promise.all([
    client.readContract({
      address: addresses.settlementAdapter,
      abi: settlementAdapterAbi,
      functionName: "assetId",
    }),
    client.readContract({
      address: addresses.settlementAdapter,
      abi: settlementAdapterAbi,
      functionName: "feed",
    }),
    client.readContract({
      address: addresses.settlementAdapter,
      abi: settlementAdapterAbi,
      functionName: "feedDecimals",
    }),
  ]);
  if (adapterAssetId !== assetId) throw new OperatorConfigurationError("adapter asset ID mismatch");
  sameAddress(adapterFeed, config.chainlinkProxy, "adapter feed");
  if (adapterDecimals !== feedDecimals) {
    throw new OperatorConfigurationError("adapter/feed decimal mismatch");
  }

  const resolverValues = await Promise.all([
    client.readContract({ address: addresses.resolver, abi: resolverAbi, functionName: "conditionalTokens" }),
    client.readContract({ address: addresses.resolver, abi: resolverAbi, functionName: "settlementAdapter" }),
    client.readContract({ address: addresses.resolver, abi: resolverAbi, functionName: "questionId" }),
    client.readContract({ address: addresses.resolver, abi: resolverAbi, functionName: "conditionId" }),
    client.readContract({ address: addresses.resolver, abi: resolverAbi, functionName: "assetId" }),
    client.readContract({ address: addresses.resolver, abi: resolverAbi, functionName: "strikePriceWad" }),
    client.readContract({ address: addresses.resolver, abi: resolverAbi, functionName: "tradingClosesAt" }),
    client.readContract({ address: addresses.resolver, abi: resolverAbi, functionName: "resolvesAt" }),
    client.readContract({
      address: addresses.resolver,
      abi: resolverAbi,
      functionName: "maximumObservationDelay",
    }),
  ] as const);
  sameAddress(resolverValues[0], config.conditionalTokens, "resolver Conditional Tokens");
  sameAddress(resolverValues[1], addresses.settlementAdapter, "resolver adapter");
  if (resolverValues[2] !== questionId || resolverValues[3] !== conditionId) {
    throw new OperatorConfigurationError("resolver question/condition identity mismatch");
  }
  if (resolverValues[4] !== assetId) throw new OperatorConfigurationError("resolver asset ID mismatch");
  sameBigInt(resolverValues[5], config.strikePriceWad, "resolver strike");
  sameBigInt(resolverValues[6], config.tradingClosesAt, "resolver trading close");
  sameBigInt(resolverValues[7], config.resolvesAt, "resolver resolution time");
  sameBigInt(
    resolverValues[8],
    config.maximumObservationDelaySeconds,
    "resolver maximum observation delay",
  );

  const outcomeSlotCount = await client.readContract({
    address: config.conditionalTokens,
    abi: conditionalTokensAbi,
    functionName: "getOutcomeSlotCount",
    args: [conditionId],
  });
  sameBigInt(outcomeSlotCount, 2n, "condition outcome count");
  const [yesCollectionId, noCollectionId] = await Promise.all([
    client.readContract({
      address: config.conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getCollectionId",
      args: [zeroHash, conditionId, 1n],
    }),
    client.readContract({
      address: config.conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getCollectionId",
      args: [zeroHash, conditionId, 2n],
    }),
  ]);
  const [yesPositionId, noPositionId] = await Promise.all([
    client.readContract({
      address: config.conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getPositionId",
      args: [addresses.collateral, yesCollectionId],
    }),
    client.readContract({
      address: config.conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "getPositionId",
      args: [addresses.collateral, noCollectionId],
    }),
  ]);
  if (yesPositionId === 0n || noPositionId === 0n || yesPositionId === noPositionId) {
    throw new OperatorConfigurationError("derived binary position IDs are invalid");
  }

  const [poolConditionalTokens, poolCollateral, poolCondition, poolFee, lpShares] = await Promise.all([
    client.readContract({ address: addresses.fpmm, abi: fpmmAbi, functionName: "conditionalTokens" }),
    client.readContract({ address: addresses.fpmm, abi: fpmmAbi, functionName: "collateralToken" }),
    client.readContract({ address: addresses.fpmm, abi: fpmmAbi, functionName: "conditionIds", args: [0n] }),
    client.readContract({ address: addresses.fpmm, abi: fpmmAbi, functionName: "fee" }),
    client.readContract({ address: addresses.fpmm, abi: fpmmAbi, functionName: "balanceOf", args: [operator] }),
  ]);
  sameAddress(poolConditionalTokens, config.conditionalTokens, "FPMM Conditional Tokens");
  sameAddress(poolCollateral, addresses.collateral, "FPMM collateral");
  if (poolCondition !== conditionId) throw new OperatorConfigurationError("FPMM condition mismatch");
  sameBigInt(poolFee, BigInt(config.feeBps) * 100_000_000_000_000n, "FPMM fee");
  try {
    await client.readContract({
      address: addresses.fpmm,
      abi: fpmmAbi,
      functionName: "conditionIds",
      args: [1n],
    });
    throw new OperatorConfigurationError("FPMM unexpectedly binds more than one condition");
  } catch (error) {
    if (error instanceof OperatorConfigurationError) throw error;
  }
  const [poolYesBalance, poolNoBalance] = await Promise.all([
    client.readContract({
      address: config.conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "balanceOf",
      args: [addresses.fpmm, yesPositionId],
    }),
    client.readContract({
      address: config.conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "balanceOf",
      args: [addresses.fpmm, noPositionId],
    }),
  ]);
  if (poolYesBalance < config.seedAtoms || poolNoBalance < config.seedAtoms || lpShares === 0n) {
    throw new OperatorConfigurationError("FPMM does not contain the declared builder seed liquidity");
  }

  const orderBookValues = await Promise.all([
    client.readContract({ address: addresses.orderBook, abi: orderBookAbi, functionName: "worker" }),
    client.readContract({ address: addresses.orderBook, abi: orderBookAbi, functionName: "fpmm" }),
    client.readContract({
      address: addresses.orderBook,
      abi: orderBookAbi,
      functionName: "conditionalTokens",
    }),
    client.readContract({ address: addresses.orderBook, abi: orderBookAbi, functionName: "collateral" }),
    client.readContract({ address: addresses.orderBook, abi: orderBookAbi, functionName: "conditionId" }),
    client.readContract({
      address: addresses.orderBook,
      abi: orderBookAbi,
      functionName: "tradingClosesAt",
    }),
    client.readContract({ address: addresses.orderBook, abi: orderBookAbi, functionName: "yesPositionId" }),
    client.readContract({ address: addresses.orderBook, abi: orderBookAbi, functionName: "noPositionId" }),
    client.readContract({
      address: addresses.orderBook,
      abi: orderBookAbi,
      functionName: "evaluationTimeout",
    }),
    client.readContract({
      address: addresses.orderBook,
      abi: orderBookAbi,
      functionName: "publicationTimeout",
    }),
    client.readContract({
      address: addresses.orderBook,
      abi: orderBookAbi,
      functionName: "minimumEvaluationInterval",
    }),
    client.readContract({
      address: addresses.orderBook,
      abi: orderBookAbi,
      functionName: "maximumEvaluations",
    }),
  ] as const);
  sameAddress(orderBookValues[0], config.worker, "OrderBook worker");
  sameAddress(orderBookValues[1], addresses.fpmm, "OrderBook FPMM");
  sameAddress(orderBookValues[2], config.conditionalTokens, "OrderBook Conditional Tokens");
  sameAddress(orderBookValues[3], addresses.collateral, "OrderBook collateral");
  if (orderBookValues[4] !== conditionId) throw new OperatorConfigurationError("OrderBook condition mismatch");
  sameBigInt(orderBookValues[5], config.tradingClosesAt, "OrderBook trading close");
  sameBigInt(orderBookValues[6], yesPositionId, "OrderBook YES position");
  sameBigInt(orderBookValues[7], noPositionId, "OrderBook NO position");
  sameBigInt(orderBookValues[8], config.evaluationTimeoutSeconds, "OrderBook evaluation timeout");
  sameBigInt(orderBookValues[9], config.publicationTimeoutSeconds, "OrderBook publication timeout");
  sameBigInt(
    orderBookValues[10],
    config.minimumEvaluationIntervalSeconds,
    "OrderBook evaluation interval",
  );
  if (orderBookValues[11] !== config.maximumEvaluations) {
    throw new OperatorConfigurationError("OrderBook maximum evaluation count mismatch");
  }

  const treasuryValues = await Promise.all([
    client.readContract({
      address: addresses.fundingTreasury,
      abi: fundingTreasuryAbi,
      functionName: "collateral",
    }),
    client.readContract({ address: addresses.fundingTreasury, abi: fundingTreasuryAbi, functionName: "nativeTarget" }),
    client.readContract({
      address: addresses.fundingTreasury,
      abi: fundingTreasuryAbi,
      functionName: "collateralTarget",
    }),
    client.readContract({
      address: addresses.fundingTreasury,
      abi: fundingTreasuryAbi,
      functionName: "nativePerClaimCap",
    }),
    client.readContract({
      address: addresses.fundingTreasury,
      abi: fundingTreasuryAbi,
      functionName: "collateralPerClaimCap",
    }),
    client.readContract({
      address: addresses.fundingTreasury,
      abi: fundingTreasuryAbi,
      functionName: "nativeLifetimeCap",
    }),
    client.readContract({
      address: addresses.fundingTreasury,
      abi: fundingTreasuryAbi,
      functionName: "collateralLifetimeCap",
    }),
    client.readContract({ address: addresses.fundingTreasury, abi: fundingTreasuryAbi, functionName: "cooldown" }),
  ] as const);
  sameAddress(treasuryValues[0], addresses.collateral, "funding treasury collateral");
  sameBigInt(treasuryValues[1], config.funding.nativeTargetWei, "funding native target");
  sameBigInt(treasuryValues[2], config.funding.collateralTargetAtoms, "funding collateral target");
  sameBigInt(treasuryValues[3], config.funding.nativePerClaimCapWei, "funding native claim cap");
  sameBigInt(
    treasuryValues[4],
    config.funding.collateralPerClaimCapAtoms,
    "funding collateral claim cap",
  );
  sameBigInt(treasuryValues[5], config.funding.nativeLifetimeCapWei, "funding native lifetime cap");
  sameBigInt(
    treasuryValues[6],
    config.funding.collateralLifetimeCapAtoms,
    "funding collateral lifetime cap",
  );
  sameBigInt(treasuryValues[7], config.funding.cooldownSeconds, "funding cooldown");
  const [treasuryNativeBalance, treasuryCollateralBalance] = await Promise.all([
    client.getBalance({ address: addresses.fundingTreasury }),
    client.readContract({
      address: addresses.collateral,
      abi: collateralAbi,
      functionName: "balanceOf",
      args: [addresses.fundingTreasury],
    }),
  ]);
  if (
    treasuryNativeBalance < config.funding.initialNativeWei ||
    treasuryCollateralBalance < config.funding.initialCollateralAtoms
  ) {
    throw new OperatorConfigurationError("funding treasury balances are below the declared initial funding");
  }

  if (addresses.collateral === zeroAddress) {
    throw new OperatorConfigurationError("zero collateral cannot be verified");
  }
  return {
    feedDescription,
    feedDecimals,
    yesPositionId,
    noPositionId,
    poolYesBalance,
    poolNoBalance,
    lpShares,
    runtimeCodeHashes: {
      collateral: codeHashes[0],
      settlementAdapter: codeHashes[1],
      conditionalTokens: infrastructure.runtimeCodeHashes.conditionalTokens,
      resolver: codeHashes[2],
      fpmm: codeHashes[3],
      fpmmFactory: infrastructure.runtimeCodeHashes.fpmmFactory,
      chainlinkProxy: infrastructure.runtimeCodeHashes.chainlinkProxy,
      orderBook: codeHashes[4],
      fundingTreasury: codeHashes[5],
    },
  };
}
