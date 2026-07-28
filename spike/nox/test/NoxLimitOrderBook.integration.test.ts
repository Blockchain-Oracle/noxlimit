import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createViemHandleClient,
  type Handle,
  type HandleClient,
} from "@iexec-nox/handle";
import {
  NOX_COMPUTE_ADDRESS,
  handleGatewayUrl,
  nox,
} from "@iexec-nox/nox-hardhat-plugin";
import { keccak256, parseEventLogs, toBytes, zeroHash } from "viem";

const STATUS = {
  Open: 1,
  Evaluating: 2,
  PublicationPending: 3,
  Executing: 4,
  Filled: 5,
  Cancelled: 6,
  Expired: 7,
  DisclosedRefundable: 8,
  Refunded: 9,
} as const;

const UNIT = 10n ** 18n;
const FEE = 3_000_000_000_000_000n;
const PRICE_SCALE = 10n ** 18n;

const PUBLIC_ACL_ABI = [
  {
    type: "function",
    name: "isPubliclyDecryptable",
    stateMutability: "view",
    inputs: [{ name: "handle", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function ceilDiv(numerator: bigint, denominator: bigint) {
  return numerator === 0n ? 0n : ((numerator - 1n) / denominator) + 1n;
}

function quoteFromBinaryBalances(
  amountIn: bigint,
  outcomeIndex: number,
  balances: readonly [bigint, bigint],
) {
  const net = amountIn - ((amountIn * FEE) / PRICE_SCALE);
  const otherIndex = outcomeIndex === 0 ? 1 : 0;
  const endingScaled = ceilDiv(
    balances[outcomeIndex] * PRICE_SCALE * balances[otherIndex],
    balances[otherIndex] + net,
  );
  return balances[outcomeIndex] + net - ceilDiv(endingScaled, PRICE_SCALE);
}

function balancesAfterBuy(
  amountIn: bigint,
  outcomeIndex: number,
  balances: readonly [bigint, bigint],
): [bigint, bigint] {
  const net = amountIn - ((amountIn * FEE) / PRICE_SCALE);
  const quote = quoteFromBinaryBalances(amountIn, outcomeIndex, balances);
  const next: [bigint, bigint] = [balances[0] + net, balances[1] + net];
  next[outcomeIndex] -= quote;
  return next;
}

type Fixture = Awaited<ReturnType<typeof deployFixture>>;

async function eventually<T>(fn: () => Promise<T>, timeoutMs = 30_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let latest: unknown;
  while (Date.now() < deadline) {
    try {
      return await fn();
    } catch (error) {
      latest = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw latest;
}

async function privateDecrypt(client: HandleClient, handle: `0x${string}`) {
  return eventually(() => client.decrypt(handle as Handle<"uint256">));
}

async function publicDecrypt(client: HandleClient, handle: `0x${string}`) {
  return eventually(() => client.publicDecrypt(handle as Handle<"uint256">));
}

async function deployFixture({
  evaluationTimeout = 10n,
  publicationTimeout = 10n,
  minimumEvaluationInterval = 0n,
  maximumEvaluations = 5,
}: {
  evaluationTimeout?: bigint;
  publicationTimeout?: bigint;
  minimumEvaluationInterval?: bigint;
  maximumEvaluations?: number;
} = {}) {
  const { viem, handleClient } = await nox.connect();
  const [owner, worker, rescuer, lp, attacker] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();

  const conditionalTokens = await viem.deployContract("GateCConditionalTokens");
  const collateral = await viem.deployContract("GateCTestCollateral");
  const factory = await viem.deployContract("GateCFixedProductMarketMakerFactory");
  const questionId = keccak256(toBytes("noxlimit-gate-c-local-binary-market"));
  await conditionalTokens.write.prepareCondition([
    owner.account.address,
    questionId,
    2n,
  ]);
  const conditionId = await conditionalTokens.read.getConditionId([
    owner.account.address,
    questionId,
    2n,
  ]);
  const collectionIds = await Promise.all(
    [1n, 2n].map((indexSet) =>
      conditionalTokens.read.getCollectionId([zeroHash, conditionId, indexSet]),
    ),
  );
  const positionIds = await Promise.all(
    collectionIds.map((collectionId) =>
      conditionalTokens.read.getPositionId([collateral.address, collectionId]),
    ),
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
  if (creation === undefined) throw new Error("FPMM creation event missing");
  const market = await viem.getContractAt(
    "GateCFixedProductMarketMaker",
    creation.args.fixedProductMarketMaker,
  );

  const seed = 100n * UNIT;
  await collateral.write.mint([lp.account.address, seed]);
  await collateral.write.approve([market.address, seed], { account: lp.account });
  await market.write.addFunding([seed, []], { account: lp.account });

  const orderBook = await viem.deployContract("NoxLimitOrderBook", [
    worker.account.address,
    market.address,
    conditionalTokens.address,
    collateral.address,
    conditionId,
    evaluationTimeout,
    publicationTimeout,
    minimumEvaluationInterval,
    maximumEvaluations,
  ], { gas: 25_000_000n });
  const workerScopedClient = {
    ...worker,
    getAddresses: async () => [worker.account.address],
  } as typeof worker;
  const workerHandleClient = await createViemHandleClient(workerScopedClient, {
    smartContractAddress: NOX_COMPUTE_ADDRESS,
    gatewayUrl: handleGatewayUrl(),
    subgraphUrl: "https://example.com/subgraphs/id/none",
  });

  return {
    viem,
    handleClient,
    workerHandleClient,
    publicClient,
    testClient,
    accounts: { owner, worker, rescuer, lp, attacker },
    collateral,
    conditionalTokens,
    factory,
    market,
    orderBook,
    conditionId,
    positionIds,
  };
}

async function createOrder(
  f: Fixture,
  {
    minOut,
    amountIn = UNIT,
    outcomeIndex = 1,
    recipient = f.accounts.owner.account.address,
    lifetime = 3_600n,
  }: {
    minOut: bigint;
    amountIn?: bigint;
    outcomeIndex?: number;
    recipient?: `0x${string}`;
    lifetime?: bigint;
  },
) {
  const encrypted = await f.handleClient.encryptInput(
    minOut,
    "uint256",
    f.orderBook.address,
  );
  const block = await f.publicClient.getBlock();
  await f.collateral.write.mint([f.accounts.owner.account.address, amountIn]);
  await f.collateral.write.approve([f.orderBook.address, amountIn], {
    account: f.accounts.owner.account,
  });
  await f.orderBook.write.createOrder(
    [
      recipient,
      outcomeIndex,
      amountIn,
      block.timestamp + lifetime,
      encrypted.handle,
      encrypted.handleProof,
    ],
    { account: f.accounts.owner.account },
  );
  return encrypted;
}

async function workerWrite(
  f: Fixture,
  functionName: "requestEvaluation" | "requestPublication",
  args: readonly [bigint] | readonly [bigint, number],
) {
  return f.accounts.worker.writeContract({
    address: f.orderBook.address,
    abi: f.orderBook.abi,
    functionName,
    args,
  } as never);
}

async function publishAndFinalize(f: Fixture, orderId = 1n, nonce = 1) {
  const candidate = await f.orderBook.read.candidateOf([orderId]);
  await workerWrite(f, "requestPublication", [orderId, nonce]);
  const published = await publicDecrypt(f.handleClient, candidate);
  const finalizeHash = await f.accounts.rescuer.writeContract({
    address: f.orderBook.address,
    abi: f.orderBook.abi,
    functionName: "finalize",
    args: [orderId, nonce, published.decryptionProof],
  });
  const finalizeReceipt = await f.publicClient.waitForTransactionReceipt({
    hash: finalizeHash,
  });
  return { candidate, published, finalizeReceipt };
}

async function isPublic(f: Fixture, handle: `0x${string}`) {
  return f.publicClient.readContract({
    address: NOX_COMPUTE_ADDRESS,
    abi: PUBLIC_ACL_ABI,
    functionName: "isPubliclyDecryptable",
    args: [handle],
  });
}

async function moveQuote(f: Fixture, amountIn: bigint, outcomeIndex: number) {
  await f.collateral.write.mint([f.accounts.attacker.account.address, amountIn]);
  await f.collateral.write.approve([f.market.address, amountIn], {
    account: f.accounts.attacker.account,
  });
  const quote = await f.market.read.calcBuyAmount([amountIn, BigInt(outcomeIndex)]);
  await f.market.write.buy([amountIn, BigInt(outcomeIndex), quote], {
    account: f.accounts.attacker.account,
  });
  return quote;
}

describe("NoxLimit combined Nox + FPMM adapter", () => {
  it(
    "binds the curated market and permissionlessly fills one real escrowed order",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      const amountIn = UNIT;
      const outcomeIndex = 1;
      const quote = await f.market.read.calcBuyAmount([amountIn, BigInt(outcomeIndex)]);
      await createOrder(f, { minOut: quote, amountIn, outcomeIndex });

      assert.equal(
        (await f.orderBook.read.ownerOf([1n])).toLowerCase(),
        f.accounts.owner.account.address.toLowerCase(),
      );
      assert.equal(
        (await f.orderBook.read.recipientOf([1n])).toLowerCase(),
        f.accounts.owner.account.address.toLowerCase(),
      );
      assert.equal(await f.orderBook.read.amountInOf([1n]), amountIn);
      assert.equal(await f.orderBook.read.outcomeIndexOf([1n]), outcomeIndex);
      assert.equal(await f.orderBook.read.escrowBalance(), amountIn);

      await workerWrite(f, "requestEvaluation", [1n]);
      const candidate = await f.orderBook.read.candidateOf([1n]);
      assert.equal((await privateDecrypt(f.workerHandleClient, candidate)).value, quote);
      const { published, finalizeReceipt } = await publishAndFinalize(f);

      const failures = parseEventLogs({
        abi: f.orderBook.abi,
        eventName: "ExecutionFailed",
        logs: finalizeReceipt.logs,
        strict: true,
      });
      assert.equal(
        Number(await f.orderBook.read.statusOf([1n])),
        STATUS.Filled,
        failures[0]?.args.reason,
      );
      assert.equal(await f.orderBook.read.authorizedMinOutOf([1n]), quote);
      assert.equal(await f.orderBook.read.outcomeTokensOf([1n]), quote);
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.accounts.owner.account.address,
          f.positionIds[outcomeIndex],
        ]),
        quote,
      );
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.orderBook.address,
          f.positionIds[outcomeIndex],
        ]),
        0n,
      );
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);
      assert.equal(await f.collateral.read.allowance([f.orderBook.address, f.market.address]), 0n);
      await assert.rejects(() =>
        f.accounts.rescuer.writeContract({
          address: f.orderBook.address,
          abi: f.orderBook.abi,
          functionName: "finalize",
          args: [1n, 1, published.decryptionProof],
        }),
      );

      await assert.rejects(() =>
        f.orderBook.write.onERC1155Received([
          f.market.address,
          f.market.address,
          f.positionIds[outcomeIndex],
          1n,
          "0x",
        ]),
      );
      const wrongCollateral = await f.viem.deployContract("GateCTestCollateral");
      await assert.rejects(() =>
        f.viem.deployContract("NoxLimitOrderBook", [
          f.accounts.worker.account.address,
          f.market.address,
          f.conditionalTokens.address,
          wrongCollateral.address,
          f.conditionId,
          10n,
          10n,
          0n,
          5,
        ]),
      );
      const wrongConditionalTokens = await f.viem.deployContract("GateCConditionalTokens");
      await assert.rejects(() =>
        f.viem.deployContract("NoxLimitOrderBook", [
          f.accounts.worker.account.address,
          f.market.address,
          wrongConditionalTokens.address,
          f.collateral.address,
          f.conditionId,
          10n,
          10n,
          0n,
          5,
        ]),
      );
      await assert.rejects(() =>
        f.viem.deployContract("NoxLimitOrderBook", [
          f.accounts.worker.account.address,
          f.market.address,
          f.conditionalTokens.address,
          f.collateral.address,
          zeroHash,
          10n,
          10n,
          0n,
          5,
        ]),
      );
    },
  );

  it(
    "enforces evaluation cadence and a bounded evaluation count",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture({
        evaluationTimeout: 10n,
        minimumEvaluationInterval: 20n,
        maximumEvaluations: 2,
      });
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);
      await createOrder(f, { minOut: quote + 1n });
      await workerWrite(f, "requestEvaluation", [1n]);
      await f.testClient.increaseTime({ seconds: 11 });
      await f.testClient.mine({ blocks: 1 });
      await f.orderBook.write.expireEvaluation([1n]);
      await assert.rejects(() => workerWrite(f, "requestEvaluation", [1n]));

      await f.testClient.increaseTime({ seconds: 10 });
      await f.testClient.mine({ blocks: 1 });
      await workerWrite(f, "requestEvaluation", [1n]);
      await f.testClient.increaseTime({ seconds: 21 });
      await f.testClient.mine({ blocks: 1 });
      await f.orderBook.write.expireEvaluation([1n]);
      await assert.rejects(() => workerWrite(f, "requestEvaluation", [1n]));
    },
  );

  it(
    "keeps two escrows isolated when one expires and the other fills",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      const firstAmount = UNIT;
      const secondAmount = 2n * UNIT;
      const firstQuote = await f.market.read.calcBuyAmount([firstAmount, 1n]);
      const secondQuote = await f.market.read.calcBuyAmount([secondAmount, 1n]);
      await createOrder(f, { minOut: firstQuote, amountIn: firstAmount, lifetime: 5n });
      await createOrder(f, { minOut: secondQuote, amountIn: secondAmount });
      assert.equal(await f.orderBook.read.escrowBalance(), firstAmount + secondAmount);

      await f.testClient.increaseTime({ seconds: 6 });
      await f.testClient.mine({ blocks: 1 });
      await f.orderBook.write.expireOrder([1n]);
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Expired);
      const ownerBeforeRefund = await f.collateral.read.balanceOf([
        f.accounts.owner.account.address,
      ]);
      await f.orderBook.write.refund([1n], { account: f.accounts.owner.account });
      assert.equal(
        await f.collateral.read.balanceOf([f.accounts.owner.account.address]),
        ownerBeforeRefund + firstAmount,
      );
      assert.equal(await f.orderBook.read.escrowBalance(), secondAmount);

      await workerWrite(f, "requestEvaluation", [2n]);
      const candidate = await f.orderBook.read.candidateOf([2n]);
      assert.equal((await privateDecrypt(f.workerHandleClient, candidate)).value, secondQuote);
      await publishAndFinalize(f, 2n, 1);
      assert.equal(Number(await f.orderBook.read.statusOf([2n])), STATUS.Filled);
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.accounts.owner.account.address,
          f.positionIds[1],
        ]),
        secondQuote,
      );
    },
  );

  it(
    "rejects unsolicited real Conditional Tokens so pre-existing share dust cannot be injected",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      const amount = UNIT;
      await f.collateral.write.mint([f.accounts.attacker.account.address, amount]);
      await f.collateral.write.approve([f.conditionalTokens.address, amount], {
        account: f.accounts.attacker.account,
      });
      await f.conditionalTokens.write.splitPosition(
        [f.collateral.address, zeroHash, f.conditionId, [1n, 2n], amount],
        { account: f.accounts.attacker.account },
      );
      const attackerBefore = await f.conditionalTokens.read.balanceOf([
        f.accounts.attacker.account.address,
        f.positionIds[1],
      ]);
      await assert.rejects(() =>
        f.conditionalTokens.write.safeTransferFrom(
          [
            f.accounts.attacker.account.address,
            f.orderBook.address,
            f.positionIds[1],
            amount,
            "0x",
          ],
          { account: f.accounts.attacker.account },
        ),
      );
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.accounts.attacker.account.address,
          f.positionIds[1],
        ]),
        attackerBefore,
      );
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.orderBook.address,
          f.positionIds[1],
        ]),
        0n,
      );
    },
  );

  it(
    "measures two quiet checks, reserve-driven success, and the normalized public shape of a delayed eligible control",
    { timeout: 240_000 },
    async () => {
      const f = await deployFixture();
      const initialBalances: [bigint, bigint] = [100n * UNIT, 100n * UNIT];
      const firstMove = 10n * UNIT;
      const secondMove = 20n * UNIT;
      const q1 = quoteFromBinaryBalances(UNIT, 1, initialBalances);
      const afterFirstMove = balancesAfterBuy(firstMove, 0, initialBalances);
      const q2 = quoteFromBinaryBalances(UNIT, 1, afterFirstMove);
      const afterSecondMove = balancesAfterBuy(secondMove, 0, afterFirstMove);
      const q3 = quoteFromBinaryBalances(UNIT, 1, afterSecondMove);
      assert.ok(q1 < q2 && q2 < q3);
      const threshold = q2 + ((q3 - q2) / 2n);

      await createOrder(f, { minOut: threshold });
      await createOrder(f, { minOut: q1 });

      const falseHash = await workerWrite(f, "requestEvaluation", [1n]);
      const falseReceipt = await f.publicClient.waitForTransactionReceipt({ hash: falseHash });
      const falseCandidate = await f.orderBook.read.candidateOf([1n]);
      assert.equal((await privateDecrypt(f.workerHandleClient, falseCandidate)).value, 0n);
      assert.equal(await isPublic(f, falseCandidate), false);

      const delayedHash = await workerWrite(f, "requestEvaluation", [2n]);
      const delayedReceipt = await f.publicClient.waitForTransactionReceipt({ hash: delayedHash });
      const delayedCandidate = await f.orderBook.read.candidateOf([2n]);
      assert.equal((await privateDecrypt(f.workerHandleClient, delayedCandidate)).value, q1);
      assert.equal(await isPublic(f, delayedCandidate), false);

      const publicShape = (receipt: typeof falseReceipt) =>
        receipt.logs.map((log) => log.topics[0] ?? "0x");
      assert.deepEqual(
        publicShape(falseReceipt),
        publicShape(delayedReceipt),
        "an observer sees the same event-type transcript for false and withheld-eligible checks",
      );
      const evaluations = [falseReceipt, delayedReceipt].map((receipt) => {
        const [event] = parseEventLogs({
          abi: f.orderBook.abi,
          eventName: "EvaluationRequested",
          logs: receipt.logs,
          strict: true,
        });
        return event?.args.quote;
      });
      assert.deepEqual(evaluations, [q1, q1]);

      await f.testClient.increaseTime({ seconds: 11 });
      await f.testClient.mine({ blocks: 1 });
      const falseTimeoutHash = await f.orderBook.write.expireEvaluation([1n]);
      const falseTimeoutReceipt = await f.publicClient.waitForTransactionReceipt({
        hash: falseTimeoutHash,
      });
      const delayedTimeoutHash = await f.orderBook.write.expireEvaluation([2n]);
      const delayedTimeoutReceipt = await f.publicClient.waitForTransactionReceipt({
        hash: delayedTimeoutHash,
      });
      assert.deepEqual(
        publicShape(falseTimeoutReceipt),
        publicShape(delayedTimeoutReceipt),
        "false and withheld-eligible checks use the same normalized timeout event shape",
      );
      await f.orderBook.write.cancel([2n], { account: f.accounts.owner.account });
      await f.orderBook.write.refund([2n], { account: f.accounts.owner.account });

      await moveQuote(f, firstMove, 0);
      assert.equal(await f.market.read.calcBuyAmount([UNIT, 1n]), q2);
      await workerWrite(f, "requestEvaluation", [1n]);
      const secondQuiet = await f.orderBook.read.candidateOf([1n]);
      assert.equal((await privateDecrypt(f.workerHandleClient, secondQuiet)).value, 0n);
      assert.equal(await isPublic(f, secondQuiet), false);
      await f.testClient.increaseTime({ seconds: 11 });
      await f.testClient.mine({ blocks: 1 });
      await f.orderBook.write.expireEvaluation([1n]);

      await moveQuote(f, secondMove, 0);
      assert.equal(await f.market.read.calcBuyAmount([UNIT, 1n]), q3);
      await workerWrite(f, "requestEvaluation", [1n]);
      const success = await f.orderBook.read.candidateOf([1n]);
      assert.equal((await privateDecrypt(f.workerHandleClient, success)).value, threshold);

      const lowerPriceBound = ceilDiv(UNIT * PRICE_SCALE, q3);
      const upperPriceBound = ceilDiv(UNIT * PRICE_SCALE, q2 + 1n);
      const configuredPriceTick = 100_000_000_000_000n;
      assert.ok(
        upperPriceBound - lowerPriceBound > configuredPriceTick,
        "honest quote bracketing must remain wider than one configured 0.0001 price tick",
      );
      await publishAndFinalize(f, 1n, 3);
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Filled);
      assert.equal(await isPublic(f, falseCandidate), false);
      assert.equal(await isPublic(f, secondQuiet), false);
      assert.equal(await isPublic(f, success), true);
    },
  );

  it(
    "keeps escrow refundable when the live pool quote crosses below the authorized minimum",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);
      await createOrder(f, { minOut: quote });
      await workerWrite(f, "requestEvaluation", [1n]);
      const candidate = await f.orderBook.read.candidateOf([1n]);
      assert.equal((await privateDecrypt(f.workerHandleClient, candidate)).value, quote);

      const manipulationAmount = 20n * UNIT;
      await f.collateral.write.mint([f.accounts.attacker.account.address, manipulationAmount]);
      await f.collateral.write.approve([f.market.address, manipulationAmount], {
        account: f.accounts.attacker.account,
      });
      const attackerQuote = await f.market.read.calcBuyAmount([manipulationAmount, 1n]);
      await f.market.write.buy([manipulationAmount, 1n, attackerQuote], {
        account: f.accounts.attacker.account,
      });
      assert.ok((await f.market.read.calcBuyAmount([UNIT, 1n])) < quote);

      const poolCollateralBefore = await f.collateral.read.balanceOf([f.market.address]);
      const poolPositionsBefore = await Promise.all(
        f.positionIds.map((positionId) =>
          f.conditionalTokens.read.balanceOf([f.market.address, positionId]),
        ),
      );
      const adapterCollateralBefore = await f.collateral.read.balanceOf([
        f.orderBook.address,
      ]);
      const { finalizeReceipt } = await publishAndFinalize(f);
      assert.equal(
        Number(await f.orderBook.read.statusOf([1n])),
        STATUS.DisclosedRefundable,
      );
      assert.equal(await f.orderBook.read.escrowBalance(), adapterCollateralBefore);
      assert.equal(await f.collateral.read.balanceOf([f.market.address]), poolCollateralBefore);
      assert.deepEqual(
        await Promise.all(
          f.positionIds.map((positionId) =>
            f.conditionalTokens.read.balanceOf([f.market.address, positionId]),
          ),
        ),
        poolPositionsBefore,
      );
      assert.equal(await f.collateral.read.allowance([f.orderBook.address, f.market.address]), 0n);
      assert.equal(
        parseEventLogs({
          abi: f.market.abi,
          eventName: "FPMMBuy",
          logs: finalizeReceipt.logs,
          strict: true,
        }).length,
        0,
      );
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.orderBook.address,
          f.positionIds[1],
        ]),
        0n,
      );
      const ownerBefore = await f.collateral.read.balanceOf([f.accounts.owner.account.address]);
      await f.orderBook.write.refund([1n], { account: f.accounts.owner.account });
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Refunded);
      assert.equal(
        await f.collateral.read.balanceOf([f.accounts.owner.account.address]),
        ownerBefore + UNIT,
      );
    },
  );

  it(
    "persists the refund state when a recipient returns oversized revert data",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      const rejector = await f.viem.deployContract("LargeRevertRecipient");
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);
      await createOrder(f, { minOut: quote, recipient: rejector.address });
      await workerWrite(f, "requestEvaluation", [1n]);
      const { finalizeReceipt } = await publishAndFinalize(f);
      assert.equal(finalizeReceipt.status, "success");
      assert.equal(
        Number(await f.orderBook.read.statusOf([1n])),
        STATUS.DisclosedRefundable,
      );
      assert.equal(await f.orderBook.read.escrowBalance(), UNIT);
      assert.equal(await f.collateral.read.allowance([f.orderBook.address, f.market.address]), 0n);
      await f.orderBook.write.refund([1n], { account: f.accounts.owner.account });
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Refunded);
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);
    },
  );

  it(
    "rolls back a rejecting recipient and refunds cancel and publication-timeout terminals",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      const rejector = await f.viem.deployContract("RejectingRecipient");
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);
      await createOrder(f, { minOut: quote, recipient: rejector.address });
      await workerWrite(f, "requestEvaluation", [1n]);
      const poolCollateralBefore = await f.collateral.read.balanceOf([f.market.address]);
      const poolPositionsBefore = await Promise.all(
        f.positionIds.map((positionId) =>
          f.conditionalTokens.read.balanceOf([f.market.address, positionId]),
        ),
      );
      const { finalizeReceipt } = await publishAndFinalize(f);
      assert.equal(
        Number(await f.orderBook.read.statusOf([1n])),
        STATUS.DisclosedRefundable,
      );
      assert.equal(await f.orderBook.read.escrowBalance(), UNIT);
      assert.equal(await f.collateral.read.balanceOf([f.market.address]), poolCollateralBefore);
      assert.deepEqual(
        await Promise.all(
          f.positionIds.map((positionId) =>
            f.conditionalTokens.read.balanceOf([f.market.address, positionId]),
          ),
        ),
        poolPositionsBefore,
      );
      assert.equal(await f.collateral.read.allowance([f.orderBook.address, f.market.address]), 0n);
      assert.equal(
        parseEventLogs({
          abi: f.market.abi,
          eventName: "FPMMBuy",
          logs: finalizeReceipt.logs,
          strict: true,
        }).length,
        0,
      );
      await f.orderBook.write.refund([1n], { account: f.accounts.owner.account });

      await createOrder(f, { minOut: quote });
      await f.orderBook.write.cancel([2n], { account: f.accounts.owner.account });
      assert.equal(Number(await f.orderBook.read.statusOf([2n])), STATUS.Cancelled);
      await f.orderBook.write.refund([2n], { account: f.accounts.owner.account });

      await createOrder(f, { minOut: quote });
      await workerWrite(f, "requestEvaluation", [3n]);
      await workerWrite(f, "requestPublication", [3n, 1]);
      await f.testClient.increaseTime({ seconds: 11 });
      await f.testClient.mine({ blocks: 1 });
      await f.orderBook.write.expirePublication([3n]);
      assert.equal(
        Number(await f.orderBook.read.statusOf([3n])),
        STATUS.DisclosedRefundable,
      );
      await f.orderBook.write.refund([3n], { account: f.accounts.owner.account });
      assert.equal(Number(await f.orderBook.read.statusOf([3n])), STATUS.Refunded);
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);
    },
  );
});
