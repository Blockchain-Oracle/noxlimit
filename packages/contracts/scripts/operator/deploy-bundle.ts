import { network } from "hardhat";
import {
  getAddress,
  parseEventLogs,
  zeroHash,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";

import {
  collateralAbi,
  conditionalTokensAbi,
  fpmmAbi,
  fpmmFactoryAbi,
  fundingTreasuryAbi,
} from "./abis.js";
import {
  ETHEREUM_SEPOLIA_CHAIN_ID,
  OperatorConfigurationError,
  assetIdOf,
  buildCatalogCandidate,
  collateralMintShortfall,
  deploymentJournalPath,
  deploymentPlanId,
  deriveIdentityId,
  loadCatalogAuthority,
  loadCatalogHistory,
  parseBundleConfig,
  readJsonIfExists,
  requireExplicitWrite,
  stableIdentityOf,
} from "./lib.js";
import {
  openDeploymentJournal,
  type JsonObject,
  type JsonValue,
} from "./deployment-journal.js";
import {
  deploymentStepManifest,
  runJournaledDeploymentStep,
} from "./deployment-runner.js";
import {
  verifyDeployedBundle,
  verifyPinnedInfrastructure,
  type DeployedAddresses,
} from "./verify.js";

async function main(): Promise<void> {
  const config = parseBundleConfig(process.env);
  requireExplicitWrite(process.env, "DEPLOY_SEPOLIA_BUNDLE");
  if (config.catalogOutputPath === config.evidenceOutputPath) {
    throw new OperatorConfigurationError("catalog and evidence outputs must use different paths");
  }
  const journalPath = deploymentJournalPath(config.evidenceOutputPath);
  const journalAlreadyExists = (await readJsonIfExists(journalPath)) !== undefined;
  const authority = await loadCatalogAuthority();
  const history = await loadCatalogHistory(config.catalogHistoryPaths, authority);

  const connection = await network.create();
  if (connection.networkName !== "sepoliaOperator") {
    throw new OperatorConfigurationError(
      "deployment must run through the explicit Hardhat sepoliaOperator network",
    );
  }
  const { viem } = connection;
  const publicClient = await viem.getPublicClient();
  const [operator] = await viem.getWalletClients();
  if (!operator) throw new OperatorConfigurationError("sepoliaOperator exposes no operator account");
  const chainId = await publicClient.getChainId();
  if (chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) {
    throw new OperatorConfigurationError(`refusing deployment on chain ${chainId}`);
  }
  const operatorAddress = getAddress(operator.account.address);

  // This must complete before the first transaction: address formatting alone is not provenance.
  await verifyPinnedInfrastructure(publicClient, config);

  let collateralAddress = config.existingCollateral;
  let collateralIssuer: Address = operatorAddress;
  let operatorCollateralBalanceBefore = 0n;
  let treasuryCollateralBefore = 0n;
  let treasuryNativeBefore = 0n;
  let fundingTreasuryAddress = config.existingFundingTreasury;

  // Reused contracts and their immutable funding policy are checked before any new transaction.
  // This avoids spending deployment gas before discovering an unusable shared substrate.
  if (collateralAddress) {
    const [code, name, symbol, decimals, issuer, balance] = await Promise.all([
      publicClient.getCode({ address: collateralAddress }),
      publicClient.readContract({
        address: collateralAddress,
        abi: collateralAbi,
        functionName: "name",
      }),
      publicClient.readContract({
        address: collateralAddress,
        abi: collateralAbi,
        functionName: "symbol",
      }),
      publicClient.readContract({
        address: collateralAddress,
        abi: collateralAbi,
        functionName: "decimals",
      }),
      publicClient.readContract({
        address: collateralAddress,
        abi: collateralAbi,
        functionName: "issuer",
      }),
      publicClient.readContract({
        address: collateralAddress,
        abi: collateralAbi,
        functionName: "balanceOf",
        args: [operatorAddress],
      }),
    ] as const);
    if (!code || code === "0x") {
      throw new OperatorConfigurationError("configured collateral address has no runtime code");
    }
    if (name !== "NoxLimit Test USDC" || symbol !== "NLTUSDC" || decimals !== 6) {
      throw new OperatorConfigurationError(
        "configured collateral does not match the six-decimal NoxLimit Test USDC contract",
      );
    }
    collateralIssuer = getAddress(issuer);
    operatorCollateralBalanceBefore = balance;
    collateralMintShortfall({
      operator: operatorAddress,
      issuer: collateralIssuer,
      operatorBalance: 0n,
      requiredAtoms: 0n,
    });
  }

  if (fundingTreasuryAddress) {
    if (!collateralAddress) {
      throw new OperatorConfigurationError(
        "a shared funding treasury cannot be preflighted without its existing collateral",
      );
    }
    const treasuryCode = await publicClient.getCode({ address: fundingTreasuryAddress });
    if (!treasuryCode || treasuryCode === "0x") {
      throw new OperatorConfigurationError("configured shared funding treasury has no runtime code");
    }
    const policy = await Promise.all([
      publicClient.readContract({
        address: fundingTreasuryAddress,
        abi: fundingTreasuryAbi,
        functionName: "collateral",
      }),
      publicClient.readContract({
        address: fundingTreasuryAddress,
        abi: fundingTreasuryAbi,
        functionName: "nativeTarget",
      }),
      publicClient.readContract({
        address: fundingTreasuryAddress,
        abi: fundingTreasuryAbi,
        functionName: "collateralTarget",
      }),
      publicClient.readContract({
        address: fundingTreasuryAddress,
        abi: fundingTreasuryAbi,
        functionName: "nativePerClaimCap",
      }),
      publicClient.readContract({
        address: fundingTreasuryAddress,
        abi: fundingTreasuryAbi,
        functionName: "collateralPerClaimCap",
      }),
      publicClient.readContract({
        address: fundingTreasuryAddress,
        abi: fundingTreasuryAbi,
        functionName: "nativeLifetimeCap",
      }),
      publicClient.readContract({
        address: fundingTreasuryAddress,
        abi: fundingTreasuryAbi,
        functionName: "collateralLifetimeCap",
      }),
      publicClient.readContract({
        address: fundingTreasuryAddress,
        abi: fundingTreasuryAbi,
        functionName: "cooldown",
      }),
      publicClient.readContract({
        address: collateralAddress,
        abi: collateralAbi,
        functionName: "balanceOf",
        args: [fundingTreasuryAddress],
      }),
      publicClient.getBalance({ address: fundingTreasuryAddress }),
    ] as const);
    if (
      getAddress(policy[0]) !== collateralAddress ||
      policy[1] !== config.funding.nativeTargetWei ||
      policy[2] !== config.funding.collateralTargetAtoms ||
      policy[3] !== config.funding.nativePerClaimCapWei ||
      policy[4] !== config.funding.collateralPerClaimCapAtoms ||
      policy[5] !== config.funding.nativeLifetimeCapWei ||
      policy[6] !== config.funding.collateralLifetimeCapAtoms ||
      policy[7] !== config.funding.cooldownSeconds
    ) {
      throw new OperatorConfigurationError(
        "shared funding treasury immutable policy does not match the deployment plan",
      );
    }
    treasuryCollateralBefore = policy[8];
    treasuryNativeBefore = policy[9];
  }

  const proposedTreasuryCollateralTopUp =
    treasuryCollateralBefore < config.funding.initialCollateralAtoms
      ? config.funding.initialCollateralAtoms - treasuryCollateralBefore
      : 0n;
  const proposedTreasuryNativeTopUp =
    treasuryNativeBefore < config.funding.initialNativeWei
      ? config.funding.initialNativeWei - treasuryNativeBefore
      : 0n;
  const proposedCollateralRequired = config.seedAtoms + proposedTreasuryCollateralTopUp;
  const proposedCollateralMintAtoms = collateralMintShortfall({
    operator: operatorAddress,
    issuer: collateralIssuer,
    operatorBalance: operatorCollateralBalanceBefore,
    requiredAtoms: proposedCollateralRequired,
  });
  const proposedFundingPlan = {
    seedAtoms: config.seedAtoms.toString(),
    operatorCollateralBalanceBeforeAtoms: operatorCollateralBalanceBefore.toString(),
    operatorCollateralMintAtoms: proposedCollateralMintAtoms.toString(),
    treasuryCollateralBalanceBeforeAtoms: treasuryCollateralBefore.toString(),
    treasuryNativeBalanceBeforeWei: treasuryNativeBefore.toString(),
    treasuryCollateralTopUpAtoms: proposedTreasuryCollateralTopUp.toString(),
    treasuryNativeTopUpWei: proposedTreasuryNativeTopUp.toString(),
    collateralRequiredAtoms: proposedCollateralRequired.toString(),
  } as const satisfies JsonObject;
  const proposedExpectedSteps = deploymentStepManifest({
    deployCollateral: !collateralAddress,
    mintCollateral: proposedCollateralMintAtoms > 0n,
    deployFundingTreasury: !fundingTreasuryAddress,
    topUpFundingCollateral: proposedTreasuryCollateralTopUp > 0n,
    topUpFundingNative: proposedTreasuryNativeTopUp > 0n,
  });
  const journal = await openDeploymentJournal({
    journalPath,
    plan: { planId: deploymentPlanId(config, operatorAddress) },
    operator: operatorAddress,
    chainId,
    catalogOutputPath: config.catalogOutputPath,
    evidenceOutputPath: config.evidenceOutputPath,
    fundingPlan: journalAlreadyExists ? undefined : proposedFundingPlan,
    expectedSteps: journalAlreadyExists ? undefined : proposedExpectedSteps,
    recoveryJson: process.env.NOXLIMIT_DEPLOYMENT_RECOVERY_JSON,
  });
  const initialJournal = journal.snapshot();
  if (initialJournal.state !== "IN_PROGRESS") {
    const published = await journal.publishFinalOutputs();
    process.stdout.write(
      `${JSON.stringify({ deployed: true, resumed: true, idempotent: true, journalPath, ...published })}\n`,
    );
    return;
  }

  function frozenAmount(key: string): bigint {
    const value = initialJournal.fundingPlan[key];
    if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
      throw new OperatorConfigurationError(`deployment journal funding plan has invalid ${key}`);
    }
    return BigInt(value);
  }
  const treasuryCollateralTopUp = frozenAmount("treasuryCollateralTopUpAtoms");
  const treasuryNativeTopUp = frozenAmount("treasuryNativeTopUpWei");
  const collateralRequired = frozenAmount("collateralRequiredAtoms");
  const collateralMintAtoms = frozenAmount("operatorCollateralMintAtoms");
  if (
    frozenAmount("seedAtoms") !== config.seedAtoms ||
    collateralRequired !== config.seedAtoms + treasuryCollateralTopUp ||
    collateralMintAtoms > collateralRequired
  ) {
    throw new OperatorConfigurationError("deployment journal funding plan is internally inconsistent");
  }

  async function runJournaledStep(
    stepId: string,
    label: string,
    submit: () => Promise<Hash>,
    resultOf?: (receipt: TransactionReceipt) => JsonObject,
  ): Promise<TransactionReceipt> {
    return runJournaledDeploymentStep({
      journal,
      client: publicClient,
      operator: operatorAddress,
      confirmations: config.confirmations,
      stepId,
      label,
      submit,
      ...(resultOf ? { resultOf } : {}),
    });
  }

  let collateralDeploymentHash: Hash | undefined;
  let collateralDeploymentReceipt: TransactionReceipt | undefined;
  if (!collateralAddress) {
    collateralDeploymentReceipt = await runJournaledStep(
      "collateralDeployment",
      "collateral deployment",
      async () => {
        const deployment = await viem.sendDeploymentTransaction(
          "contracts/testnet/NoxLimitTestUSDC.sol:NoxLimitTestUSDC",
          [operatorAddress],
        );
        return deployment.deploymentTransaction.hash;
      },
    );
    if (!collateralDeploymentReceipt.contractAddress) {
      throw new OperatorConfigurationError("collateral deployment receipt has no contract address");
    }
    collateralAddress = getAddress(collateralDeploymentReceipt.contractAddress);
    collateralDeploymentHash = collateralDeploymentReceipt.transactionHash;
  }

  const identity = stableIdentityOf(config, collateralAddress);
  const questionId = deriveIdentityId("question", identity);
  const marketId = deriveIdentityId("market", identity);
  const assetId = assetIdOf(config.asset);

  const adapterReceipt = await runJournaledStep(
    "settlementAdapterDeployment",
    "settlement adapter deployment",
    async () => {
      const deployment = await viem.sendDeploymentTransaction("ChainlinkRoundAdapter", [
        assetId,
        config.chainlinkProxy,
      ]);
      return deployment.deploymentTransaction.hash;
    },
  );
  if (!adapterReceipt.contractAddress) {
    throw new OperatorConfigurationError("settlement adapter receipt has no contract address");
  }
  const settlementAdapterAddress = getAddress(adapterReceipt.contractAddress);
  const settlementAdapterDeploymentHash = adapterReceipt.transactionHash;

  const resolverReceipt = await runJournaledStep(
    "resolverDeployment",
    "resolver deployment",
    async () => {
      const deployment = await viem.sendDeploymentTransaction("PriceBinaryResolver", [
        config.conditionalTokens,
        settlementAdapterAddress,
        questionId,
        config.strikePriceWad,
        config.tradingClosesAt,
        config.resolvesAt,
        config.maximumObservationDelaySeconds,
      ]);
      return deployment.deploymentTransaction.hash;
    },
  );
  if (!resolverReceipt.contractAddress) {
    throw new OperatorConfigurationError("resolver deployment receipt has no contract address");
  }
  const resolverAddress = getAddress(resolverReceipt.contractAddress);
  const resolverDeploymentHash = resolverReceipt.transactionHash;

  const prepareConditionReceipt = await runJournaledStep(
    "prepareCondition",
    "condition preparation",
    () =>
      operator.writeContract({
        address: config.conditionalTokens,
        abi: conditionalTokensAbi,
        functionName: "prepareCondition",
        args: [resolverAddress, questionId, 2n],
      }),
  );
  const prepareConditionHash = prepareConditionReceipt.transactionHash;
  const conditionId = await publicClient.readContract({
    address: config.conditionalTokens,
    abi: conditionalTokensAbi,
    functionName: "getConditionId",
    args: [resolverAddress, questionId, 2n],
  });
  if (conditionId === zeroHash) throw new OperatorConfigurationError("condition ID cannot be zero");

  const feeWad = BigInt(config.feeBps) * 100_000_000_000_000n;
  function fpmmCreationAddress(receiptValue: TransactionReceipt): Address {
    const [creation] = parseEventLogs({
      abi: fpmmFactoryAbi,
      eventName: "FixedProductMarketMakerCreation",
      logs: receiptValue.logs,
      strict: true,
    });
    if (!creation) throw new OperatorConfigurationError("FPMM factory emitted no creation event");
    return getAddress(creation.args.fixedProductMarketMaker);
  }
  const createFpmmReceipt = await runJournaledStep(
    "fpmmCreation",
    "FPMM creation",
    () =>
      operator.writeContract({
        address: config.fpmmFactory,
        abi: fpmmFactoryAbi,
        functionName: "createFixedProductMarketMaker",
        args: [config.conditionalTokens, collateralAddress, [conditionId], feeWad],
      }),
    (receiptValue) => ({ fpmmAddress: fpmmCreationAddress(receiptValue) }),
  );
  const createFpmmHash = createFpmmReceipt.transactionHash;
  const fpmmAddress = fpmmCreationAddress(createFpmmReceipt);

  let treasuryReceipt: TransactionReceipt | undefined;
  let treasuryDeploymentHash: Hash | undefined;
  let collateralMintHash: Hash | null = null;
  if (collateralMintAtoms > 0n) {
    const collateralMintReceipt = await runJournaledStep(
      "operatorCollateralMint",
      "operator collateral mint",
      () =>
        operator.writeContract({
          address: collateralAddress,
          abi: collateralAbi,
          functionName: "mint",
          args: [operatorAddress, collateralMintAtoms],
        }),
      () => ({ amountAtoms: collateralMintAtoms.toString() }),
    );
    collateralMintHash = collateralMintReceipt.transactionHash;
  }
  await runJournaledStep(
    "fpmmSeedApproval",
    "FPMM seed approval",
    () =>
      operator.writeContract({
        address: collateralAddress,
        abi: collateralAbi,
        functionName: "approve",
        args: [fpmmAddress, config.seedAtoms],
      }),
  );
  const seedReceipt = await runJournaledStep(
    "fpmmSeed",
    "FPMM seed",
    () =>
      operator.writeContract({
        address: fpmmAddress,
        abi: fpmmAbi,
        functionName: "addFunding",
        args: [config.seedAtoms, []],
      }),
    () => ({ amountAtoms: config.seedAtoms.toString() }),
  );
  const seedHash = seedReceipt.transactionHash;

  const orderBookReceipt = await runJournaledStep(
    "orderBookDeployment",
    "OrderBook deployment",
    async () => {
      const deployment = await viem.sendDeploymentTransaction("NoxLimitOrderBook", [
        config.worker,
        fpmmAddress,
        config.conditionalTokens,
        collateralAddress,
        conditionId,
        config.tradingClosesAt,
        config.evaluationTimeoutSeconds,
        config.publicationTimeoutSeconds,
        config.minimumEvaluationIntervalSeconds,
        config.maximumEvaluations,
      ]);
      return deployment.deploymentTransaction.hash;
    },
  );
  if (!orderBookReceipt.contractAddress) {
    throw new OperatorConfigurationError("OrderBook deployment receipt has no contract address");
  }
  const orderBookAddress = getAddress(orderBookReceipt.contractAddress);
  const orderBookDeploymentHash = orderBookReceipt.transactionHash;

  if (!fundingTreasuryAddress) {
    treasuryReceipt = await runJournaledStep(
      "fundingTreasuryDeployment",
      "funding treasury deployment",
      async () => {
        const deployment = await viem.sendDeploymentTransaction("TestnetFundingTreasury", [
          collateralAddress,
          config.funding.nativeTargetWei,
          config.funding.collateralTargetAtoms,
          config.funding.nativePerClaimCapWei,
          config.funding.collateralPerClaimCapAtoms,
          config.funding.nativeLifetimeCapWei,
          config.funding.collateralLifetimeCapAtoms,
          config.funding.cooldownSeconds,
        ]);
        return deployment.deploymentTransaction.hash;
      },
    );
    if (!treasuryReceipt.contractAddress) {
      throw new OperatorConfigurationError("funding treasury receipt has no contract address");
    }
    fundingTreasuryAddress = getAddress(treasuryReceipt.contractAddress);
    treasuryDeploymentHash = treasuryReceipt.transactionHash;
  }
  let fundTreasuryCollateralHash: Hash | null = null;
  if (treasuryCollateralTopUp > 0n) {
    const fundTreasuryCollateralReceipt = await runJournaledStep(
      "fundingTreasuryCollateralTopUp",
      "funding treasury collateral transfer",
      () =>
        operator.writeContract({
          address: collateralAddress,
          abi: collateralAbi,
          functionName: "transfer",
          args: [fundingTreasuryAddress, treasuryCollateralTopUp],
        }),
      () => ({ amountAtoms: treasuryCollateralTopUp.toString() }),
    );
    fundTreasuryCollateralHash = fundTreasuryCollateralReceipt.transactionHash;
  }
  let fundTreasuryNativeHash: Hash | null = null;
  if (treasuryNativeTopUp > 0n) {
    const fundTreasuryNativeReceipt = await runJournaledStep(
      "fundingTreasuryNativeTopUp",
      "funding treasury native transfer",
      () =>
        operator.sendTransaction({
          to: fundingTreasuryAddress,
          value: treasuryNativeTopUp,
        }),
      () => ({ amountWei: treasuryNativeTopUp.toString() }),
    );
    fundTreasuryNativeHash = fundTreasuryNativeReceipt.transactionHash;
  }

  const addresses: DeployedAddresses = {
    collateral: collateralAddress,
    settlementAdapter: settlementAdapterAddress,
    resolver: resolverAddress,
    fpmm: fpmmAddress,
    orderBook: orderBookAddress,
    fundingTreasury: fundingTreasuryAddress,
  };
  const verification = await verifyDeployedBundle(
    publicClient,
    operatorAddress,
    config,
    addresses,
    questionId,
    conditionId,
    assetId,
  );
  const verifiedBlock = await publicClient.getBlock();
  const verifiedAt = new Date(Number(verifiedBlock.timestamp) * 1_000).toISOString();
  const deploymentBlock = [
    collateralDeploymentReceipt?.blockNumber,
    adapterReceipt.blockNumber,
    resolverReceipt.blockNumber,
    prepareConditionReceipt.blockNumber,
    createFpmmReceipt.blockNumber,
    seedReceipt.blockNumber,
    orderBookReceipt.blockNumber,
    treasuryReceipt?.blockNumber,
  ].reduce<bigint | undefined>((minimum, value) => {
    if (value === undefined) return minimum;
    return minimum === undefined || value < minimum ? value : minimum;
  }, undefined);
  if (deploymentBlock === undefined) throw new OperatorConfigurationError("deployment block is unavailable");

  const marketRecord = {
    schemaVersion: 1,
    marketId,
    questionId,
    conditionId,
    version: config.version,
    identity,
    question: config.question,
    collateral: {
      address: collateralAddress,
      name: "NoxLimit Test USDC",
      symbol: "NLTUSDC",
      decimals: 6,
    },
    oracle: {
      source: "CHAINLINK",
      settlementAdapter: addresses.settlementAdapter,
      proxy: config.chainlinkProxy,
      assetId,
      feedDescription: verification.feedDescription,
      feedDecimals: verification.feedDecimals,
    },
    contracts: {
      conditionalTokens: config.conditionalTokens,
      resolver: addresses.resolver,
      fpmm: addresses.fpmm,
      orderBook: addresses.orderBook,
    },
    positions: {
      yesPositionId: verification.yesPositionId.toString(),
      noPositionId: verification.noPositionId.toString(),
    },
    times: {
      startsAt: config.startsAt.toString(),
      tradingClosesAt: config.tradingClosesAt.toString(),
      resolvesAt: config.resolvesAt.toString(),
    },
    pool: {
      feeBps: config.feeBps,
      builderSeededLiquidity: true,
      seedTransactionHash: seedHash,
      seededAtBlock: seedReceipt.blockNumber.toString(),
      completeSetsSeededAtoms: config.seedAtoms.toString(),
    },
    monitoringPolicy: {
      evaluationTimeoutSeconds: config.evaluationTimeoutSeconds.toString(),
      publicationTimeoutSeconds: config.publicationTimeoutSeconds.toString(),
      minimumEvaluationIntervalSeconds: config.minimumEvaluationIntervalSeconds.toString(),
      maximumEvaluations: config.maximumEvaluations,
    },
    runtimePolicy: {
      oracleMaxAgeSeconds: config.runtimePolicy.oracleMaxAgeSeconds,
      poolQuoteMaxAgeSeconds: config.runtimePolicy.poolQuoteMaxAgeSeconds,
      indexerMaxLagBlocks: config.runtimePolicy.indexerMaxLagBlocks,
      evaluatorHeartbeatMaxAgeSeconds: config.runtimePolicy.evaluatorHeartbeatMaxAgeSeconds,
      lowLiquidityDepthAtoms: config.runtimePolicy.lowLiquidityDepthAtoms.toString(),
    },
    deployment: {
      deploymentBlock: deploymentBlock.toString(),
      transactions: {
        resolver: resolverDeploymentHash,
        prepareCondition: prepareConditionHash,
        fpmm: createFpmmHash,
        seedLiquidity: seedHash,
        orderBook: orderBookDeploymentHash,
        ...(collateralDeploymentHash ? { collateral: collateralDeploymentHash } : {}),
        settlementAdapter: settlementAdapterDeploymentHash,
      },
    },
    provenance: config.provenance,
    verification: {
      status: "VERIFIED",
      verifiedAt,
      verifiedAtBlock: verifiedBlock.number.toString(),
      verifiedBy: operatorAddress,
      evidenceRef: config.evidenceRef,
      runtimeCodeHashes: {
        collateral: verification.runtimeCodeHashes.collateral,
        settlementAdapter: verification.runtimeCodeHashes.settlementAdapter,
        conditionalTokens: verification.runtimeCodeHashes.conditionalTokens,
        resolver: verification.runtimeCodeHashes.resolver,
        fpmm: verification.runtimeCodeHashes.fpmm,
        orderBook: verification.runtimeCodeHashes.orderBook,
      },
    },
  };
  const candidate = buildCatalogCandidate(
    history,
    marketRecord,
    verifiedAt,
    verifiedBlock.number,
    authority,
  );
  const evidence = {
    schemaVersion: 1,
    kind: "NOXLIMIT_SEPOLIA_BUNDLE_DEPLOYMENT",
    chainId,
    marketId,
    catalogRevisionCandidate: candidate.catalogRevision,
    operator: operatorAddress,
    deploymentPlanHash: initialJournal.binding.planHash,
    addresses: { ...addresses, conditionalTokens: config.conditionalTokens, fpmmFactory: config.fpmmFactory },
    identity: { questionId, conditionId, assetId },
    builderSeededLiquidity: {
      requestedCompleteSetsAtoms: config.seedAtoms.toString(),
      poolYesBalance: verification.poolYesBalance.toString(),
      poolNoBalance: verification.poolNoBalance.toString(),
      lpShares: verification.lpShares.toString(),
    },
    funding: {
      sharedTreasuryReused: config.existingFundingTreasury !== undefined,
      minimumNativeWei: config.funding.initialNativeWei.toString(),
      minimumCollateralAtoms: config.funding.initialCollateralAtoms.toString(),
      nativeTopUpWei: treasuryNativeTopUp.toString(),
      collateralTopUpAtoms: treasuryCollateralTopUp.toString(),
      operatorCollateralMintAtoms: collateralMintAtoms.toString(),
    },
    receipts: {
      collateral: collateralDeploymentHash ?? null,
      operatorCollateralMint: collateralMintHash,
      settlementAdapter: settlementAdapterDeploymentHash,
      resolver: resolverDeploymentHash,
      prepareCondition: prepareConditionHash,
      fpmm: createFpmmHash,
      seedLiquidity: seedHash,
      orderBook: orderBookDeploymentHash,
      fundingTreasury: treasuryDeploymentHash ?? null,
      fundTreasuryCollateral: fundTreasuryCollateralHash,
      fundTreasuryNative: fundTreasuryNativeHash,
    },
    verification: marketRecord.verification,
    infrastructureRuntimeCodeHashes: {
      fpmmFactory: verification.runtimeCodeHashes.fpmmFactory,
      chainlinkProxy: verification.runtimeCodeHashes.chainlinkProxy,
      fundingTreasury: verification.runtimeCodeHashes.fundingTreasury,
    },
  };

  // Payloads enter the resumable journal before either create-only final output is published.
  await journal.stageFinalPayloads({
    catalog: candidate as unknown as JsonValue,
    evidence: evidence as unknown as JsonValue,
  });
  const published = await journal.publishFinalOutputs();
  process.stdout.write(
    `${JSON.stringify({
      deployed: true,
      marketId,
      catalogRevision: candidate.catalogRevision,
      journalPath,
      ...published,
    })}\n`,
  );
}

await main();
