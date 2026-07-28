import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEventLogs, zeroHash } from "viem";

import { deployMarketFixture } from "../helpers/market-fixture.js";
import {
  maxAveragePriceForFill,
  minOutFromMaxAveragePrice,
} from "../helpers/min-out.js";

const ONE = 10n ** 18n;

function ceilDiv(numerator: bigint, denominator: bigint) {
  return numerator === 0n ? 0n : ((numerator - 1n) / denominator) + 1n;
}

function independentBinaryBuyQuote(
  investmentAmount: bigint,
  fee: bigint,
  buyPoolBalance: bigint,
  otherPoolBalance: bigint,
) {
  const netInvestment = investmentAmount - ((investmentAmount * fee) / ONE);
  const endingScaled = ceilDiv(
    buyPoolBalance * ONE * otherPoolBalance,
    otherPoolBalance + netInvestment,
  );
  return buyPoolBalance + netInvestment - ceilDiv(endingScaled, ONE);
}

describe("Gate B real Conditional Tokens + FPMM lifecycle", function () {
  it("creates a factory clone and seeds both binary outcome pools after a real split", async function () {
    const fixture = await deployMarketFixture();

    assert.notEqual(
      fixture.market.address,
      fixture.implementationMaster,
      "the market must be the factory-created clone, not its implementation master",
    );
    assert.deepEqual(fixture.splitPositionBalances, [fixture.splitAmount, fixture.splitAmount]);
    assert.deepEqual(fixture.marketPositionBalances, [fixture.seedAmount, fixture.seedAmount]);
    assert.equal(fixture.lpShares, fixture.seedAmount);
    assert.equal(
      fixture.creation.args.creator.toLowerCase(),
      fixture.accounts.deployer.account.address.toLowerCase(),
    );
    assert.equal(
      fixture.creation.args.conditionalTokens.toLowerCase(),
      fixture.contracts.conditionalTokens.address.toLowerCase(),
    );
    assert.equal(
      fixture.creation.args.collateralToken.toLowerCase(),
      fixture.contracts.collateral.address.toLowerCase(),
    );
    assert.deepEqual(fixture.creation.args.conditionIds, [fixture.conditionId]);
    assert.equal(fixture.creation.args.fee, fixture.fee);
    assert.equal(
      (await fixture.market.read.conditionalTokens()).toLowerCase(),
      fixture.contracts.conditionalTokens.address.toLowerCase(),
    );
    assert.equal(
      (await fixture.market.read.collateralToken()).toLowerCase(),
      fixture.contracts.collateral.address.toLowerCase(),
    );
    assert.equal(await fixture.market.read.conditionIds([0n]), fixture.conditionId);
    assert.equal(await fixture.market.read.fee(), fixture.fee);
  });

  it("rejects an excessive minOut and delivers the quoted ERC-1155 outcome on an exact-minimum buy", async function () {
    const fixture = await deployMarketFixture();
    const investmentAmount = fixture.unit;
    const outcomeIndex = 1n;
    const trader = fixture.accounts.trader.account.address;
    const outcomePositionId = fixture.positionIds[Number(outcomeIndex)];

    await fixture.fundTrader(investmentAmount);
    const balancesBefore = await Promise.all(
      fixture.positionIds.map((positionId) =>
        fixture.contracts.conditionalTokens.read.balanceOf([
          fixture.market.address,
          positionId,
        ]),
      ),
    );
    const quote = await fixture.market.read.calcBuyAmount([investmentAmount, outcomeIndex]);
    const expectedQuote = independentBinaryBuyQuote(
      investmentAmount,
      fixture.fee,
      balancesBefore[Number(outcomeIndex)],
      balancesBefore[Number(1n - outcomeIndex)],
    );
    assert.equal(quote, expectedQuote, "quote must match an independent reserve/fee derivation");

    await assert.rejects(
      fixture.market.write.buy([investmentAmount, outcomeIndex, quote + 1n], {
        account: fixture.accounts.trader.account,
      }),
      /minimum buy amount not reached/,
    );
    assert.equal(
      await fixture.contracts.collateral.read.balanceOf([trader]),
      investmentAmount,
      "the reverted buy must not spend collateral",
    );
    assert.equal(
      await fixture.contracts.conditionalTokens.read.balanceOf([trader, outcomePositionId]),
      0n,
      "the reverted buy must not deliver outcome tokens",
    );

    const buyHash = await fixture.market.write.buy([investmentAmount, outcomeIndex, quote], {
      account: fixture.accounts.trader.account,
    });
    const buyReceipt = await fixture.publicClient.waitForTransactionReceipt({ hash: buyHash });
    const [buyEvent] = parseEventLogs({
      abi: fixture.market.abi,
      eventName: "FPMMBuy",
      logs: buyReceipt.logs,
      strict: true,
    });

    assert.equal(buyReceipt.status, "success");
    assert.equal(buyEvent?.args.outcomeTokensBought, quote);
    assert.equal(await fixture.contracts.collateral.read.balanceOf([trader]), 0n);
    assert.equal(
      await fixture.contracts.conditionalTokens.read.balanceOf([trader, outcomePositionId]),
      quote,
      "the trader must receive the quoted ERC-1155 position",
    );
    const netInvestment = investmentAmount - ((investmentAmount * fixture.fee) / ONE);
    const balancesAfter = await Promise.all(
      fixture.positionIds.map((positionId) =>
        fixture.contracts.conditionalTokens.read.balanceOf([
          fixture.market.address,
          positionId,
        ]),
      ),
    );
    assert.equal(
      balancesAfter[Number(outcomeIndex)],
      balancesBefore[Number(outcomeIndex)] + netInvestment - quote,
    );
    assert.equal(
      balancesAfter[Number(1n - outcomeIndex)],
      balancesBefore[Number(1n - outcomeIndex)] + netInvestment,
    );
    assert.ok(
      (await fixture.market.read.calcBuyAmount([investmentAmount, outcomeIndex])) < quote,
      "buying one side must worsen its next fixed-input quote",
    );
  });

  it("resolves the condition and redeems the winning position back to collateral", async function () {
    const fixture = await deployMarketFixture();
    const investmentAmount = fixture.unit;
    const winningOutcomeIndex = 1n;
    const trader = fixture.accounts.trader.account.address;
    const winningPositionId = fixture.positionIds[Number(winningOutcomeIndex)];
    const quote = await fixture.buyForTrader(investmentAmount, winningOutcomeIndex);

    await fixture.contracts.conditionalTokens.write.reportPayouts(
      [fixture.questionId, [0n, 1n]],
      { account: fixture.accounts.oracle.account },
    );
    const collateralBefore = await fixture.contracts.collateral.read.balanceOf([trader]);
    const redeemHash = await fixture.contracts.conditionalTokens.write.redeemPositions(
      [
        fixture.contracts.collateral.address,
        zeroHash,
        fixture.conditionId,
        [1n, 2n],
      ],
      { account: fixture.accounts.trader.account },
    );
    const redeemReceipt = await fixture.publicClient.waitForTransactionReceipt({ hash: redeemHash });
    const [redemption] = parseEventLogs({
      abi: fixture.contracts.conditionalTokens.abi,
      eventName: "PayoutRedemption",
      logs: redeemReceipt.logs,
      strict: true,
    });

    assert.equal(redeemReceipt.status, "success");
    assert.equal(redemption?.args.payout, quote);
    assert.equal(
      await fixture.contracts.collateral.read.balanceOf([trader]),
      collateralBefore + quote,
    );
    assert.equal(
      await fixture.contracts.conditionalTokens.read.balanceOf([trader, winningPositionId]),
      0n,
      "redeeming must burn the winning ERC-1155 position",
    );
  });

  it("enforces an entered private max price against a real asymmetrically skewed pool", async function () {
    const fixture = await deployMarketFixture();
    const targetOutcome = 0n;
    const skewAmount = 90n * fixture.unit;
    await fixture.fundTrader(skewAmount);
    const skewQuote = await fixture.market.read.calcBuyAmount([skewAmount, targetOutcome]);
    await fixture.market.write.buy([skewAmount, targetOutcome, skewQuote], {
      account: fixture.accounts.trader.account,
    });

    const poolBalances = await Promise.all(
      fixture.positionIds.map((positionId) =>
        fixture.contracts.conditionalTokens.read.balanceOf([
          fixture.market.address,
          positionId,
        ]),
      ),
    );
    const largerReserve = poolBalances[0] > poolBalances[1] ? poolBalances[0] : poolBalances[1];
    const smallerReserve = poolBalances[0] > poolBalances[1] ? poolBalances[1] : poolBalances[0];
    assert.ok(largerReserve > smallerReserve * 3n, "the test pool must be materially asymmetric");

    const amountIn = fixture.unit;
    await fixture.fundTrader(amountIn);
    const quote = await fixture.market.read.calcBuyAmount([amountIn, targetOutcome]);
    const numerator = amountIn * ONE;
    const enteredMaximumPrice = ceilDiv(numerator, quote);
    const derivedMinOut = minOutFromMaxAveragePrice(amountIn, enteredMaximumPrice);
    assert.ok(derivedMinOut <= quote);

    const tighterMaximumPrice = numerator / (quote + 1n);
    const tooHighMinOut = minOutFromMaxAveragePrice(amountIn, tighterMaximumPrice);
    assert.ok(tooHighMinOut > quote);
    const trader = fixture.accounts.trader.account.address;
    const collateralBefore = await fixture.contracts.collateral.read.balanceOf([trader]);
    const positionBefore = await fixture.contracts.conditionalTokens.read.balanceOf([
      trader,
      fixture.positionIds[Number(targetOutcome)],
    ]);
    await assert.rejects(
      fixture.market.write.buy([amountIn, targetOutcome, tooHighMinOut], {
        account: fixture.accounts.trader.account,
      }),
      /minimum buy amount not reached/,
    );
    assert.equal(await fixture.contracts.collateral.read.balanceOf([trader]), collateralBefore);
    assert.equal(
      await fixture.contracts.conditionalTokens.read.balanceOf([
        trader,
        fixture.positionIds[Number(targetOutcome)],
      ]),
      positionBefore,
    );

    await fixture.market.write.buy([amountIn, targetOutcome, derivedMinOut], {
      account: fixture.accounts.trader.account,
    });
    const positionAfter = await fixture.contracts.conditionalTokens.read.balanceOf([
      trader,
      fixture.positionIds[Number(targetOutcome)],
    ]);
    const actualOut = positionAfter - positionBefore;
    assert.equal(actualOut, quote);
    assert.ok(maxAveragePriceForFill(amountIn, actualOut) <= enteredMaximumPrice);
  });
});
