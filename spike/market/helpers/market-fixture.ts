import { network } from "hardhat";
import { keccak256, parseEventLogs, toBytes, zeroHash } from "viem";

const OUTCOME_SLOT_COUNT = 2n;
const PARTITION = [1n, 2n] as const;
const FEE = 3_000_000_000_000_000n;
const UNIT = 10n ** 18n;

export async function deployMarketFixture() {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [deployer, oracle, lp, trader] = await viem.getWalletClients();

  const conditionalTokens = await viem.deployContract("GateBConditionalTokens");
  const collateral = await viem.deployContract("GateBTestCollateral");
  const factory = await viem.deployContract("GateBFixedProductMarketMakerFactory");

  const questionId = keccak256(toBytes("noxlimit-gate-b-binary-market"));
  await conditionalTokens.write.prepareCondition([
    oracle.account.address,
    questionId,
    OUTCOME_SLOT_COUNT,
  ]);
  const conditionId = await conditionalTokens.read.getConditionId([
    oracle.account.address,
    questionId,
    OUTCOME_SLOT_COUNT,
  ]);

  const collectionIds = await Promise.all(
    PARTITION.map((indexSet) =>
      conditionalTokens.read.getCollectionId([zeroHash, conditionId, indexSet]),
    ),
  );
  const positionIds = await Promise.all(
    collectionIds.map((collectionId) =>
      conditionalTokens.read.getPositionId([collateral.address, collectionId]),
    ),
  );

  const splitAmount = 2n * UNIT;
  const seedAmount = 10n * UNIT;
  await collateral.write.mint([lp.account.address, splitAmount + seedAmount]);
  await collateral.write.approve([conditionalTokens.address, splitAmount], {
    account: lp.account,
  });
  await conditionalTokens.write.splitPosition(
    [collateral.address, zeroHash, conditionId, [...PARTITION], splitAmount],
    { account: lp.account },
  );

  const createHash = await factory.write.createFixedProductMarketMaker([
    conditionalTokens.address,
    collateral.address,
    [conditionId],
    FEE,
  ]);
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
  const [creation] = parseEventLogs({
    abi: factory.abi,
    eventName: "FixedProductMarketMakerCreation",
    logs: createReceipt.logs,
    strict: true,
  });
  if (creation === undefined) {
    throw new Error("factory did not emit FixedProductMarketMakerCreation");
  }
  const marketAddress = creation.args.fixedProductMarketMaker;
  const market = await viem.getContractAt("GateBFixedProductMarketMaker", marketAddress);

  await collateral.write.approve([market.address, seedAmount], { account: lp.account });
  await market.write.addFunding([seedAmount, []], { account: lp.account });

  const implementationMaster = await factory.read.implementationMaster();
  const splitPositionBalances = await Promise.all(
    positionIds.map((positionId) =>
      conditionalTokens.read.balanceOf([lp.account.address, positionId]),
    ),
  );
  const marketPositionBalances = await Promise.all(
    positionIds.map((positionId) =>
      conditionalTokens.read.balanceOf([market.address, positionId]),
    ),
  );
  const lpShares = await market.read.balanceOf([lp.account.address]);

  async function fundTrader(amount: bigint) {
    await collateral.write.mint([trader.account.address, amount]);
    await collateral.write.approve([market.address, amount], { account: trader.account });
  }

  async function buyForTrader(amount: bigint, outcomeIndex: bigint) {
    await fundTrader(amount);
    const quote = await market.read.calcBuyAmount([amount, outcomeIndex]);
    await market.write.buy([amount, outcomeIndex, quote], { account: trader.account });
    return quote;
  }

  return {
    publicClient,
    accounts: { deployer, oracle, lp, trader },
    contracts: { conditionalTokens, collateral, factory },
    market,
    creation,
    implementationMaster,
    questionId,
    conditionId,
    collectionIds,
    positionIds,
    splitAmount,
    seedAmount,
    splitPositionBalances,
    marketPositionBalances,
    lpShares,
    fundTrader,
    buyForTrader,
    fee: FEE,
    unit: UNIT,
  };
}
