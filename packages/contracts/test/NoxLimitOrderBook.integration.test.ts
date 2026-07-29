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
import {
  BaseError,
  ContractFunctionRevertedError,
  encodeAbiParameters,
  keccak256,
  parseEventLogs,
  toBytes,
  toFunctionSelector,
  zeroHash,
} from "viem";

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

const UNIT = 10n ** 6n;
const FEE = 3_000_000_000_000_000n;
const PRICE_SCALE = 10n ** 18n;

const NOX_INVALID_PROOF_ABI = [
  {
    type: "error",
    name: "InvalidProof",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "reason", type: "string" },
    ],
  },
] as const;

const PUBLIC_ACL_ABI = [
  {
    type: "function",
    name: "isPubliclyDecryptable",
    stateMutability: "view",
    inputs: [{ name: "handle", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function hasContractRevert(error: unknown, expectedErrorName: string) {
  if (!(error instanceof BaseError)) return false;
  const reverted = error.walk(
    (cause) => cause instanceof ContractFunctionRevertedError,
  );
  if (
    reverted instanceof ContractFunctionRevertedError &&
    reverted.data?.errorName === expectedErrorName
  ) {
    return true;
  }

  // viem cannot name custom errors raised during constructor execution because no
  // deployed contract exists yet, but Hardhat preserves the exact revert selector.
  const signature = `${expectedErrorName}()`;
  const selector = toFunctionSelector(signature);
  const encoded = error.walk(
    (cause) =>
      cause instanceof BaseError &&
      (cause.details.includes(signature) ||
        cause.details.includes(selector) ||
        cause.message.includes(signature) ||
        cause.message.includes(selector)),
  );
  return encoded instanceof BaseError;
}

function hasNoxInvalidProof(error: unknown, expectedReason: string) {
  if (!(error instanceof BaseError)) return false;
  const reverted = error.walk(
    (cause) => cause instanceof ContractFunctionRevertedError,
  );
  if (!(reverted instanceof ContractFunctionRevertedError)) return false;
  const args = reverted.data?.args as readonly unknown[] | undefined;
  return reverted.data?.errorName === "InvalidProof" && args?.[1] === expectedReason;
}

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
  minimumEvaluationInterval = 1n,
  maximumEvaluations = 5,
  tradingLifetime = 7n * 24n * 60n * 60n,
}: {
  evaluationTimeout?: bigint;
  publicationTimeout?: bigint;
  minimumEvaluationInterval?: bigint;
  maximumEvaluations?: number;
  tradingLifetime?: bigint;
} = {}) {
  const { viem, handleClient } = await nox.connect();
  const [owner, worker, rescuer, lp, attacker] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();

  const conditionalTokens = await viem.deployContract("GateCConditionalTokens");
  const collateral = await viem.deployContract("GateCSixDecimalCollateral");
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

  const deploymentBlock = await publicClient.getBlock();
  const tradingClosesAt = deploymentBlock.timestamp + tradingLifetime;
  const orderBook = await viem.deployContract("NoxLimitOrderBook", [
    worker.account.address,
    market.address,
    conditionalTokens.address,
    collateral.address,
    conditionId,
    tradingClosesAt,
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
    tradingClosesAt,
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
    expiresAt,
  }: {
    minOut: bigint;
    amountIn?: bigint;
    outcomeIndex?: number;
    recipient?: `0x${string}`;
    lifetime?: bigint;
    expiresAt?: bigint;
  },
) {
  const encrypted = await f.handleClient.encryptInput(
    minOut,
    "uint256",
    f.orderBook.address,
  );
  const block = await f.publicClient.getBlock();
  const orderExpiry = expiresAt ?? block.timestamp + lifetime;
  await f.collateral.write.mint([f.accounts.owner.account.address, amountIn]);
  await f.collateral.write.approve([f.orderBook.address, amountIn], {
    account: f.accounts.owner.account,
  });
  await f.orderBook.write.createOrder(
    [
      recipient,
      outcomeIndex,
      amountIn,
      orderExpiry,
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
    "rejects degenerate monitoring and recovery policy configuration",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      const invalidPolicies = [
        {
          evaluationTimeout: 0n,
          publicationTimeout: 10n,
          minimumEvaluationInterval: 1n,
          maximumEvaluations: 5,
        },
        {
          evaluationTimeout: 10n,
          publicationTimeout: 0n,
          minimumEvaluationInterval: 1n,
          maximumEvaluations: 5,
        },
        {
          evaluationTimeout: 10n,
          publicationTimeout: 10n,
          minimumEvaluationInterval: 0n,
          maximumEvaluations: 5,
        },
        {
          evaluationTimeout: 10n,
          publicationTimeout: 10n,
          minimumEvaluationInterval: 1n,
          maximumEvaluations: 0,
        },
      ] as const;

      for (const policy of invalidPolicies) {
        await assert.rejects(
          () =>
            f.viem.deployContract("NoxLimitOrderBook", [
              f.accounts.worker.account.address,
              f.market.address,
              f.conditionalTokens.address,
              f.collateral.address,
              f.conditionId,
              f.tradingClosesAt,
              policy.evaluationTimeout,
              policy.publicationTimeout,
              policy.minimumEvaluationInterval,
              policy.maximumEvaluations,
            ]),
          (error: unknown) => hasContractRevert(error, "InvalidMonitoringPolicy"),
        );
      }
    },
  );

  it(
    "rolls back a failed six-decimal collateral pull, retries the same encrypted input, and accounts exactly through fill and refund",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      assert.equal(await f.collateral.read.decimals(), 6);

      const fillAmount = 25n * UNIT;
      const quote = await f.market.read.calcBuyAmount([fillAmount, 1n]);
      const encrypted = await f.handleClient.encryptInput(
        quote,
        "uint256",
        f.orderBook.address,
      );
      const block = await f.publicClient.getBlock();
      const expiresAt = block.timestamp + 3_600n;

      await assert.rejects(
        () =>
          f.orderBook.write.createOrder(
            [
              f.accounts.owner.account.address,
              1,
              fillAmount,
              expiresAt,
              encrypted.handle,
              encrypted.handleProof,
            ],
            { account: f.accounts.owner.account },
          ),
        (error: unknown) => hasContractRevert(error, "TokenCallFailed"),
      );
      assert.equal(await f.orderBook.read.inputUsed([encrypted.handle]), false);
      assert.equal(await f.orderBook.read.nextOrderId(), 1n);
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), 0);
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);

      await f.collateral.write.mint([f.accounts.owner.account.address, fillAmount]);
      await f.collateral.write.approve([f.orderBook.address, fillAmount], {
        account: f.accounts.owner.account,
      });
      await f.orderBook.write.createOrder(
        [
          f.accounts.owner.account.address,
          1,
          fillAmount,
          expiresAt,
          encrypted.handle,
          encrypted.handleProof,
        ],
        { account: f.accounts.owner.account },
      );
      assert.equal(await f.orderBook.read.inputUsed([encrypted.handle]), true);
      assert.equal(await f.orderBook.read.escrowBalance(), fillAmount);

      await workerWrite(f, "requestEvaluation", [1n]);
      await publishAndFinalize(f);
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Filled);
      assert.equal(await f.orderBook.read.outcomeTokensOf([1n]), quote);
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.accounts.owner.account.address,
          f.positionIds[1],
        ]),
        quote,
      );
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);

      const refundAmount = 7_250_000n;
      await createOrder(f, { minOut: 1n, amountIn: refundAmount });
      await f.orderBook.write.cancel([2n], { account: f.accounts.owner.account });
      const ownerBeforeRefund = await f.collateral.read.balanceOf([
        f.accounts.owner.account.address,
      ]);
      await f.orderBook.write.refund([2n], { account: f.accounts.owner.account });
      assert.equal(Number(await f.orderBook.read.statusOf([2n])), STATUS.Refunded);
      assert.equal(
        await f.collateral.read.balanceOf([f.accounts.owner.account.address]),
        ownerBeforeRefund + refundAmount,
      );
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);
    },
  );

  it(
    "pins actual OrderBook app and owner proof binding and rejects a reused input with InputAlreadyUsed",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      const block = await f.publicClient.getBlock();
      const expiresAt = block.timestamp + 3_600n;
      const abi = [...f.orderBook.abi, ...NOX_INVALID_PROOF_ABI] as const;

      const wrongApplication = await f.handleClient.encryptInput(
        1n,
        "uint256",
        f.accounts.owner.account.address,
      );
      await assert.rejects(
        () =>
          f.accounts.owner.writeContract({
            address: f.orderBook.address,
            abi,
            functionName: "createOrder",
            args: [
              f.accounts.owner.account.address,
              1,
              UNIT,
              expiresAt,
              wrongApplication.handle,
              wrongApplication.handleProof,
            ],
          }),
        (error: unknown) => hasNoxInvalidProof(error, "App mismatch"),
      );

      const ownerBound = await f.handleClient.encryptInput(
        1n,
        "uint256",
        f.orderBook.address,
      );
      await assert.rejects(
        () =>
          f.accounts.attacker.writeContract({
            address: f.orderBook.address,
            abi,
            functionName: "createOrder",
            args: [
              f.accounts.attacker.account.address,
              1,
              UNIT,
              expiresAt,
              ownerBound.handle,
              ownerBound.handleProof,
            ],
          }),
        (error: unknown) => hasNoxInvalidProof(error, "Owner mismatch"),
      );
      assert.equal(await f.orderBook.read.inputUsed([ownerBound.handle]), false);

      await f.collateral.write.mint([f.accounts.owner.account.address, 2n * UNIT]);
      await f.collateral.write.approve([f.orderBook.address, 2n * UNIT], {
        account: f.accounts.owner.account,
      });
      await f.orderBook.write.createOrder(
        [
          f.accounts.owner.account.address,
          1,
          UNIT,
          expiresAt,
          ownerBound.handle,
          ownerBound.handleProof,
        ],
        { account: f.accounts.owner.account },
      );
      await assert.rejects(
        () =>
          f.orderBook.write.createOrder(
            [
              f.accounts.owner.account.address,
              1,
              UNIT,
              expiresAt,
              ownerBound.handle,
              ownerBound.handleProof,
            ],
            { account: f.accounts.owner.account },
          ),
        (error: unknown) => hasContractRevert(error, "InputAlreadyUsed"),
      );
      assert.equal(await f.orderBook.read.nextOrderId(), 2n);
      assert.equal(await f.orderBook.read.escrowBalance(), UNIT);
    },
  );

  it(
    "enforces the global ResultAlreadyConsumed guard through a test-only derived contract",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      const guarded = await f.viem.deployContract("NoxLimitOrderBookTestHarness", [
        f.accounts.worker.account.address,
        f.market.address,
        f.conditionalTokens.address,
        f.collateral.address,
        f.conditionId,
        f.tradingClosesAt,
        10n,
        10n,
        1n,
        5,
      ], { gas: 25_000_000n });
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);
      const encrypted = await f.handleClient.encryptInput(
        quote,
        "uint256",
        guarded.address,
      );
      const block = await f.publicClient.getBlock();
      await f.collateral.write.mint([f.accounts.owner.account.address, UNIT]);
      await f.collateral.write.approve([guarded.address, UNIT], {
        account: f.accounts.owner.account,
      });
      await guarded.write.createOrder(
        [
          f.accounts.owner.account.address,
          1,
          UNIT,
          block.timestamp + 3_600n,
          encrypted.handle,
          encrypted.handleProof,
        ],
        { account: f.accounts.owner.account },
      );
      await guarded.write.requestEvaluation([1n], {
        account: f.accounts.worker.account,
      });
      const candidate = await guarded.read.candidateOf([1n]);
      await guarded.write.requestPublication([1n, 1], {
        account: f.accounts.worker.account,
      });
      const published = await publicDecrypt(f.handleClient, candidate);
      const resultKey = keccak256(
        encodeAbiParameters(
          [{ type: "bytes32" }, { type: "uint256" }],
          [candidate, published.value],
        ),
      );
      await guarded.write.seedResultConsumed([resultKey]);

      await assert.rejects(
        () =>
          guarded.write.finalize([1n, 1, published.decryptionProof], {
            account: f.accounts.rescuer.account,
          }),
        (error: unknown) => hasContractRevert(error, "ResultAlreadyConsumed"),
      );
      assert.equal(
        Number(await guarded.read.statusOf([1n])),
        STATUS.PublicationPending,
      );
      assert.equal(await guarded.read.resultConsumed([resultKey]), true);
      assert.equal(await guarded.read.escrowBalance(), UNIT);
      assert.equal(await f.collateral.read.balanceOf([guarded.address]), UNIT);
      assert.equal(await f.collateral.read.allowance([guarded.address, f.market.address]), 0n);
    },
  );

  it(
    "makes cancellation and publication first-writer-wins",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);

      await createOrder(f, { minOut: quote });
      await workerWrite(f, "requestEvaluation", [1n]);
      await f.orderBook.write.cancel([1n], { account: f.accounts.owner.account });
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Cancelled);
      assert.equal(await f.orderBook.read.candidateOf([1n]), zeroHash);
      await assert.rejects(
        () => workerWrite(f, "requestPublication", [1n, 1]),
        (error: unknown) => hasContractRevert(error, "InvalidStatus"),
      );
      await f.orderBook.write.refund([1n], { account: f.accounts.owner.account });
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Refunded);

      await createOrder(f, { minOut: quote });
      await workerWrite(f, "requestEvaluation", [2n]);
      const candidate = await f.orderBook.read.candidateOf([2n]);
      assert.notEqual(candidate, zeroHash);
      await workerWrite(f, "requestPublication", [2n, 1]);
      assert.equal(
        Number(await f.orderBook.read.statusOf([2n])),
        STATUS.PublicationPending,
      );
      assert.equal(await f.orderBook.read.candidateOf([2n]), candidate);

      await assert.rejects(
        () =>
          f.orderBook.write.cancel([2n], {
            account: f.accounts.owner.account,
          }),
        (error: unknown) => hasContractRevert(error, "InvalidStatus"),
      );
      await assert.rejects(
        () => f.orderBook.write.refund([2n], { account: f.accounts.owner.account }),
        (error: unknown) => hasContractRevert(error, "InvalidStatus"),
      );
      assert.equal(
        Number(await f.orderBook.read.statusOf([2n])),
        STATUS.PublicationPending,
      );
      assert.equal(await f.orderBook.read.candidateOf([2n]), candidate);

      const published = await publicDecrypt(f.handleClient, candidate);
      const finalizeHash = await f.accounts.rescuer.writeContract({
        address: f.orderBook.address,
        abi: f.orderBook.abi,
        functionName: "finalize",
        args: [2n, 1, published.decryptionProof],
      });
      await f.publicClient.waitForTransactionReceipt({ hash: finalizeHash });

      assert.equal(Number(await f.orderBook.read.statusOf([2n])), STATUS.Filled);
      assert.equal(await f.orderBook.read.candidateOf([2n]), zeroHash);
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.accounts.owner.account.address,
          f.positionIds[1],
        ]),
        quote,
      );
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);
    },
  );

  it(
    "keeps a published order retryable after a low-gas finalizer",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture({ publicationTimeout: 300n });
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);
      await createOrder(f, { minOut: quote });
      await workerWrite(f, "requestEvaluation", [1n]);
      const candidate = await f.orderBook.read.candidateOf([1n]);
      assert.equal((await privateDecrypt(f.workerHandleClient, candidate)).value, quote);
      await workerWrite(f, "requestPublication", [1n, 1]);
      const published = await publicDecrypt(f.handleClient, candidate);
      assert.equal(published.value, quote);

      const resultKey = keccak256(
        encodeAbiParameters(
          [{ type: "bytes32" }, { type: "uint256" }],
          [candidate, quote],
        ),
      );
      const constrainedGas =
        (await f.orderBook.read.EXECUTION_GAS_LIMIT()) +
        (await f.orderBook.read.EXECUTION_GAS_RESERVE());
      const poolCollateralBefore = await f.collateral.read.balanceOf([f.market.address]);
      const poolPositionsBefore = await Promise.all(
        f.positionIds.map((positionId) =>
          f.conditionalTokens.read.balanceOf([f.market.address, positionId]),
        ),
      );
      const recipientSharesBefore = await f.conditionalTokens.read.balanceOf([
        f.accounts.owner.account.address,
        f.positionIds[1],
      ]);

      await assert.rejects(
        () =>
          f.publicClient.simulateContract({
            address: f.orderBook.address,
            abi: f.orderBook.abi,
            functionName: "finalize",
            args: [1n, 1, published.decryptionProof],
            account: f.accounts.rescuer.account,
            gas: constrainedGas,
          }),
        (error: unknown) => hasContractRevert(error, "InsufficientFinalizeGas"),
      );

      await f.testClient.setAutomine(false);
      let lowGasHash: `0x${string}` | undefined;
      try {
        lowGasHash = await f.accounts.rescuer.writeContract({
          address: f.orderBook.address,
          abi: f.orderBook.abi,
          functionName: "finalize",
          args: [1n, 1, published.decryptionProof],
          gas: constrainedGas,
        });
        await f.testClient.mine({ blocks: 1 });
      } finally {
        await f.testClient.setAutomine(true);
      }
      if (lowGasHash === undefined) throw new Error("low-gas transaction was not submitted");

      const lowGasReceipt = await f.publicClient.waitForTransactionReceipt({
        hash: lowGasHash,
      });
      assert.equal(lowGasReceipt.status, "reverted");
      assert.ok(lowGasReceipt.gasUsed < constrainedGas);
      assert.equal(lowGasReceipt.logs.length, 0);
      assert.equal(
        Number(await f.orderBook.read.statusOf([1n])),
        STATUS.PublicationPending,
      );
      assert.equal(await f.orderBook.read.candidateOf([1n]), candidate);
      assert.equal(await isPublic(f, candidate), true);
      assert.equal(await f.orderBook.read.resultConsumed([resultKey]), false);
      assert.equal(await f.orderBook.read.authorizedMinOutOf([1n]), 0n);
      assert.equal(await f.orderBook.read.outcomeTokensOf([1n]), 0n);
      assert.equal(Number(await f.orderBook.read.nonceOf([1n])), 1);
      assert.equal(Number(await f.orderBook.read.evaluationCountOf([1n])), 1);
      assert.equal(await f.orderBook.read.escrowBalance(), UNIT);
      assert.equal(await f.collateral.read.allowance([f.orderBook.address, f.market.address]), 0n);
      assert.equal(await f.collateral.read.balanceOf([f.market.address]), poolCollateralBefore);
      assert.deepEqual(
        await Promise.all(
          f.positionIds.map((positionId) =>
            f.conditionalTokens.read.balanceOf([f.market.address, positionId]),
          ),
        ),
        poolPositionsBefore,
      );
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.accounts.owner.account.address,
          f.positionIds[1],
        ]),
        recipientSharesBefore,
      );

      const retryHash = await f.accounts.rescuer.writeContract({
        address: f.orderBook.address,
        abi: f.orderBook.abi,
        functionName: "finalize",
        args: [1n, 1, published.decryptionProof],
      });
      const retryReceipt = await f.publicClient.waitForTransactionReceipt({ hash: retryHash });
      assert.equal(retryReceipt.status, "success");
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Filled);
      assert.equal(await f.orderBook.read.resultConsumed([resultKey]), true);
      assert.equal(await f.orderBook.read.authorizedMinOutOf([1n]), quote);
      assert.equal(await f.orderBook.read.outcomeTokensOf([1n]), quote);
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);
      assert.equal(await f.collateral.read.allowance([f.orderBook.address, f.market.address]), 0n);
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.accounts.owner.account.address,
          f.positionIds[1],
        ]),
        recipientSharesBefore + quote,
      );
    },
  );

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
      assert.equal(Number(await f.orderBook.read.evaluationCountOf([1n])), 1);
      assert.equal(Number(await f.orderBook.read.remainingEvaluations([1n])), 4);
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
          f.tradingClosesAt,
          10n,
          10n,
          1n,
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
          f.tradingClosesAt,
          10n,
          10n,
          1n,
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
          f.tradingClosesAt,
          10n,
          10n,
          1n,
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

      assert.equal(Number(await f.orderBook.read.evaluationCountOf([1n])), 0);
      assert.equal(Number(await f.orderBook.read.remainingEvaluations([1n])), 0);

      await createOrder(f, { minOut: quote + 1n });

      assert.equal(Number(await f.orderBook.read.evaluationCountOf([1n])), 0);
      assert.equal(Number(await f.orderBook.read.remainingEvaluations([1n])), 2);

      await workerWrite(f, "requestEvaluation", [1n]);
      assert.equal(Number(await f.orderBook.read.nonceOf([1n])), 1);
      assert.equal(Number(await f.orderBook.read.evaluationCountOf([1n])), 1);
      assert.equal(Number(await f.orderBook.read.remainingEvaluations([1n])), 1);

      await f.testClient.increaseTime({ seconds: 11 });
      await f.testClient.mine({ blocks: 1 });
      await f.orderBook.write.expireEvaluation([1n]);
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Open);
      assert.equal(Number(await f.orderBook.read.nonceOf([1n])), 1);
      assert.equal(Number(await f.orderBook.read.evaluationCountOf([1n])), 1);
      assert.equal(Number(await f.orderBook.read.remainingEvaluations([1n])), 1);
      await assert.rejects(
        () => workerWrite(f, "requestEvaluation", [1n]),
        (error: unknown) => hasContractRevert(error, "EvaluationCadence"),
      );

      await f.testClient.increaseTime({ seconds: 10 });
      await f.testClient.mine({ blocks: 1 });
      await workerWrite(f, "requestEvaluation", [1n]);
      assert.equal(Number(await f.orderBook.read.nonceOf([1n])), 2);
      assert.equal(Number(await f.orderBook.read.evaluationCountOf([1n])), 2);
      assert.equal(Number(await f.orderBook.read.remainingEvaluations([1n])), 0);
      assert.notEqual(await f.orderBook.read.candidateOf([1n]), zeroHash);

      await f.testClient.increaseTime({ seconds: 21 });
      await f.testClient.mine({ blocks: 1 });
      await f.orderBook.write.expireEvaluation([1n]);
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Open);
      assert.equal(Number(await f.orderBook.read.nonceOf([1n])), 2);
      assert.equal(Number(await f.orderBook.read.evaluationCountOf([1n])), 2);
      assert.equal(Number(await f.orderBook.read.remainingEvaluations([1n])), 0);
      assert.equal(await f.orderBook.read.candidateOf([1n]), zeroHash);
      await assert.rejects(
        () => workerWrite(f, "requestEvaluation", [1n]),
        (error: unknown) => hasContractRevert(error, "EvaluationLimit"),
      );
    },
  );

  it(
    "exposes only currently actionable evaluation candidates",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture({
        evaluationTimeout: 10n,
        publicationTimeout: 10n,
      });
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);
      await createOrder(f, { minOut: quote + 1n });

      assert.equal(await f.orderBook.read.candidateOf([1n]), zeroHash);

      await workerWrite(f, "requestEvaluation", [1n]);
      const firstCandidate = await f.orderBook.read.candidateOf([1n]);
      assert.notEqual(firstCandidate, zeroHash);

      await f.testClient.increaseTime({ seconds: 11 });
      await f.testClient.mine({ blocks: 1 });
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Evaluating);
      assert.equal(await f.orderBook.read.candidateOf([1n]), zeroHash);

      await f.orderBook.write.expireEvaluation([1n]);
      assert.equal(await f.orderBook.read.candidateOf([1n]), zeroHash);

      await workerWrite(f, "requestEvaluation", [1n]);
      const secondCandidate = await f.orderBook.read.candidateOf([1n]);
      assert.notEqual(secondCandidate, zeroHash);
      assert.notEqual(secondCandidate, firstCandidate);

      await workerWrite(f, "requestPublication", [1n, 2]);
      assert.equal(await f.orderBook.read.candidateOf([1n]), secondCandidate);

      await f.testClient.increaseTime({ seconds: 11 });
      await f.testClient.mine({ blocks: 1 });
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.PublicationPending);
      assert.equal(await f.orderBook.read.candidateOf([1n]), zeroHash);

      await f.orderBook.write.expirePublication([1n]);
      assert.equal(await f.orderBook.read.candidateOf([1n]), zeroHash);
    },
  );

  it(
    "enforces exact evaluation and publication timeout boundaries without stranding escrow",
    { timeout: 180_000 },
    async () => {
      const evaluationTimeout = 60n;
      const publicationTimeout = 60n;
      const f = await deployFixture({
        evaluationTimeout,
        publicationTimeout,
        tradingLifetime: 3_600n,
      });
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);

      await createOrder(f, { minOut: quote + 1n, lifetime: 1_800n });
      const evaluationHash = await workerWrite(f, "requestEvaluation", [1n]);
      const evaluationReceipt = await f.publicClient.waitForTransactionReceipt({
        hash: evaluationHash,
      });
      const evaluationBlock = await f.publicClient.getBlock({
        blockNumber: evaluationReceipt.blockNumber,
      });
      const evaluationDeadline = evaluationBlock.timestamp + evaluationTimeout;
      assert.equal(
        await f.orderBook.read.lastEvaluationAtOf([1n]),
        evaluationBlock.timestamp,
      );
      assert.equal(await f.orderBook.read.phaseDeadlineOf([1n]), evaluationDeadline);
      const quietCandidate = await f.orderBook.read.candidateOf([1n]);
      assert.notEqual(quietCandidate, zeroHash);
      assert.equal((await privateDecrypt(f.workerHandleClient, quietCandidate)).value, 0n);

      await createOrder(f, { minOut: quote, lifetime: 1_800n });
      await workerWrite(f, "requestEvaluation", [2n]);
      const publishedCandidate = await f.orderBook.read.candidateOf([2n]);
      assert.equal(
        (await privateDecrypt(f.workerHandleClient, publishedCandidate)).value,
        quote,
      );
      const publicationHash = await workerWrite(f, "requestPublication", [2n, 1]);
      const publicationReceipt = await f.publicClient.waitForTransactionReceipt({
        hash: publicationHash,
      });
      const publicationBlock = await f.publicClient.getBlock({
        blockNumber: publicationReceipt.blockNumber,
      });
      const publicationDeadline = publicationBlock.timestamp + publicationTimeout;
      assert.equal(
        await f.orderBook.read.phaseDeadlineOf([2n]),
        publicationDeadline,
      );
      const published = await publicDecrypt(f.handleClient, publishedCandidate);
      assert.equal(published.value, quote);
      assert.ok(evaluationDeadline < publicationDeadline);

      const resultKey = keccak256(
        encodeAbiParameters(
          [{ type: "bytes32" }, { type: "uint256" }],
          [publishedCandidate, published.value],
        ),
      );
      const escrowBefore = await f.collateral.read.balanceOf([f.orderBook.address]);
      const poolCollateralBefore = await f.collateral.read.balanceOf([f.market.address]);
      const poolPositionsBefore = await Promise.all(
        f.positionIds.map((positionId) =>
          f.conditionalTokens.read.balanceOf([f.market.address, positionId]),
        ),
      );
      const recipientSharesBefore = await f.conditionalTokens.read.balanceOf([
        f.accounts.owner.account.address,
        f.positionIds[1],
      ]);
      assert.equal(escrowBefore, 2n * UNIT);

      await assert.rejects(
        () =>
          f.publicClient.simulateContract({
            address: f.orderBook.address,
            abi: f.orderBook.abi,
            functionName: "expireEvaluation",
            args: [1n],
            account: f.accounts.rescuer.account,
          }),
        (error: unknown) => hasContractRevert(error, "NotExpired"),
      );
      await assert.rejects(
        () =>
          f.publicClient.simulateContract({
            address: f.orderBook.address,
            abi: f.orderBook.abi,
            functionName: "expirePublication",
            args: [2n],
            account: f.accounts.rescuer.account,
          }),
        (error: unknown) => hasContractRevert(error, "NotExpired"),
      );

      const evaluationBoundarySnapshot = await f.testClient.snapshot();
      try {
        await f.testClient.setNextBlockTimestamp({ timestamp: evaluationDeadline });
        await assert.rejects(
          () => workerWrite(f, "requestPublication", [1n, 1]),
          (error: unknown) => hasContractRevert(error, "InvalidExpiry"),
        );
      } finally {
        await f.testClient.revert({ id: evaluationBoundarySnapshot });
      }

      await f.testClient.setNextBlockTimestamp({ timestamp: evaluationDeadline });
      const evaluationRecoveryHash = await f.orderBook.write.expireEvaluation([1n]);
      const evaluationRecoveryReceipt = await f.publicClient.waitForTransactionReceipt({
        hash: evaluationRecoveryHash,
      });
      const exactEvaluationBlock = await f.publicClient.getBlock({
        blockNumber: evaluationRecoveryReceipt.blockNumber,
      });
      assert.equal(exactEvaluationBlock.timestamp, evaluationDeadline);
      assert.ok(exactEvaluationBlock.timestamp < (await f.orderBook.read.expiryOf([1n])));
      assert.ok(exactEvaluationBlock.timestamp < (await f.orderBook.read.tradingClosesAt()));
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Open);
      assert.equal(Number(await f.orderBook.read.nonceOf([1n])), 1);
      assert.equal(Number(await f.orderBook.read.evaluationCountOf([1n])), 1);
      assert.equal(Number(await f.orderBook.read.remainingEvaluations([1n])), 4);
      assert.equal(await f.orderBook.read.phaseDeadlineOf([1n]), 0n);
      assert.equal(
        await f.orderBook.read.lastEvaluationAtOf([1n]),
        evaluationBlock.timestamp,
      );
      assert.equal(await f.orderBook.read.candidateOf([1n]), zeroHash);
      assert.equal(await f.orderBook.read.candidateOf([2n]), publishedCandidate);

      const publicationBoundarySnapshot = await f.testClient.snapshot();
      try {
        await f.testClient.setNextBlockTimestamp({ timestamp: publicationDeadline });
        const publicationRecoveryHash = await f.orderBook.write.expirePublication([2n]);
        const publicationRecoveryReceipt = await f.publicClient.waitForTransactionReceipt({
          hash: publicationRecoveryHash,
        });
        const recoveryBlock = await f.publicClient.getBlock({
          blockNumber: publicationRecoveryReceipt.blockNumber,
        });
        assert.equal(recoveryBlock.timestamp, publicationDeadline);
        assert.equal(
          Number(await f.orderBook.read.statusOf([2n])),
          STATUS.DisclosedRefundable,
        );
        assert.equal(await f.orderBook.read.resultConsumed([resultKey]), false);
      } finally {
        await f.testClient.revert({ id: publicationBoundarySnapshot });
      }

      await f.testClient.setNextBlockTimestamp({ timestamp: publicationDeadline });
      const finalizeHash = await f.accounts.rescuer.writeContract({
        address: f.orderBook.address,
        abi: f.orderBook.abi,
        functionName: "finalize",
        args: [2n, 1, published.decryptionProof],
      });
      const finalizeReceipt = await f.publicClient.waitForTransactionReceipt({
        hash: finalizeHash,
      });
      const exactPublicationBlock = await f.publicClient.getBlock({
        blockNumber: finalizeReceipt.blockNumber,
      });
      assert.equal(finalizeReceipt.status, "success");
      assert.equal(exactPublicationBlock.timestamp, publicationDeadline);
      assert.ok(exactPublicationBlock.timestamp < (await f.orderBook.read.expiryOf([2n])));
      assert.ok(exactPublicationBlock.timestamp < (await f.orderBook.read.tradingClosesAt()));
      assert.equal(
        Number(await f.orderBook.read.statusOf([2n])),
        STATUS.DisclosedRefundable,
      );
      assert.equal(await f.orderBook.read.candidateOf([2n]), zeroHash);
      assert.equal(await f.orderBook.read.resultConsumed([resultKey]), false);
      assert.equal(await f.orderBook.read.authorizedMinOutOf([2n]), 0n);
      assert.equal(await f.orderBook.read.outcomeTokensOf([2n]), 0n);
      assert.equal(await f.orderBook.read.phaseDeadlineOf([2n]), 0n);
      assert.equal(await f.orderBook.read.escrowBalance(), escrowBefore);
      assert.equal(await f.collateral.read.balanceOf([f.orderBook.address]), escrowBefore);
      assert.equal(await f.collateral.read.allowance([f.orderBook.address, f.market.address]), 0n);
      assert.equal(await f.collateral.read.balanceOf([f.market.address]), poolCollateralBefore);
      assert.deepEqual(
        await Promise.all(
          f.positionIds.map((positionId) =>
            f.conditionalTokens.read.balanceOf([f.market.address, positionId]),
          ),
        ),
        poolPositionsBefore,
      );
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.accounts.owner.account.address,
          f.positionIds[1],
        ]),
        recipientSharesBefore,
      );
      assert.equal(
        parseEventLogs({
          abi: f.market.abi,
          eventName: "FPMMBuy",
          logs: finalizeReceipt.logs,
          strict: true,
        }).length,
        0,
      );
      assert.equal(await isPublic(f, quietCandidate), false);
      assert.equal(await isPublic(f, publishedCandidate), true);

      await f.orderBook.write.cancel([1n], { account: f.accounts.owner.account });
      const ownerBeforeRefunds = await f.collateral.read.balanceOf([
        f.accounts.owner.account.address,
      ]);
      for (const orderId of [1n, 2n]) {
        await f.orderBook.write.refund([orderId], {
          account: f.accounts.owner.account,
        });
      }
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);
      assert.equal(await f.collateral.read.balanceOf([f.orderBook.address]), 0n);
      assert.equal(
        await f.collateral.read.balanceOf([f.accounts.owner.account.address]),
        ownerBeforeRefunds + escrowBefore,
      );
    },
  );

  it(
    "enforces the immutable market close across the complete order lifecycle",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture({
        evaluationTimeout: 300n,
        publicationTimeout: 300n,
        tradingLifetime: 120n,
      });
      const tradingClosesAt = await f.orderBook.read.tradingClosesAt();
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);

      const currentBlock = await f.publicClient.getBlock();
      await assert.rejects(
        () =>
          f.viem.deployContract("NoxLimitOrderBook", [
            f.accounts.worker.account.address,
            f.market.address,
            f.conditionalTokens.address,
            f.collateral.address,
            f.conditionId,
            currentBlock.timestamp,
            300n,
            300n,
            1n,
            5,
          ]),
        (error: unknown) => hasContractRevert(error, "MarketClosed"),
      );

      await assert.rejects(
        () => createOrder(f, { minOut: quote, expiresAt: tradingClosesAt + 1n }),
        (error: unknown) => hasContractRevert(error, "InvalidExpiry"),
      );

      await createOrder(f, { minOut: quote, expiresAt: tradingClosesAt });
      await createOrder(f, { minOut: quote, expiresAt: tradingClosesAt });
      await createOrder(f, { minOut: quote, expiresAt: tradingClosesAt });
      assert.equal(await f.orderBook.read.escrowBalance(), 3n * UNIT);

      await workerWrite(f, "requestEvaluation", [1n]);
      const evaluationCandidate = await f.orderBook.read.candidateOf([1n]);
      assert.notEqual(evaluationCandidate, zeroHash);

      await workerWrite(f, "requestEvaluation", [2n]);
      const publicationCandidate = await f.orderBook.read.candidateOf([2n]);
      assert.notEqual(publicationCandidate, zeroHash);
      await workerWrite(f, "requestPublication", [2n, 1]);

      const poolSharesBefore = await f.conditionalTokens.read.balanceOf([
        f.market.address,
        f.positionIds[1],
      ]);

      await f.testClient.setNextBlockTimestamp({ timestamp: tradingClosesAt });
      await f.testClient.mine({ blocks: 1 });
      assert.equal((await f.publicClient.getBlock()).timestamp, tradingClosesAt);
      assert.equal(await f.orderBook.read.candidateOf([1n]), zeroHash);
      assert.equal(await f.orderBook.read.candidateOf([2n]), zeroHash);

      await assert.rejects(
        () => workerWrite(f, "requestEvaluation", [3n]),
        (error: unknown) => hasContractRevert(error, "MarketClosed"),
      );
      await assert.rejects(
        () => workerWrite(f, "requestPublication", [1n, 1]),
        (error: unknown) => hasContractRevert(error, "MarketClosed"),
      );
      await assert.rejects(
        () =>
          f.orderBook.write.cancel([3n], {
            account: f.accounts.owner.account,
          }),
        (error: unknown) => hasContractRevert(error, "MarketClosed"),
      );

      const sharesBefore = await f.conditionalTokens.read.balanceOf([
        f.accounts.owner.account.address,
        f.positionIds[1],
      ]);
      const finalizeHash = await f.accounts.rescuer.writeContract({
        address: f.orderBook.address,
        abi: f.orderBook.abi,
        functionName: "finalize",
        args: [2n, 1, "0x"],
      });
      await f.publicClient.waitForTransactionReceipt({ hash: finalizeHash });
      assert.equal(
        Number(await f.orderBook.read.statusOf([2n])),
        STATUS.DisclosedRefundable,
      );
      assert.equal(await f.orderBook.read.authorizedMinOutOf([2n]), 0n);
      assert.equal(await f.orderBook.read.outcomeTokensOf([2n]), 0n);
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.accounts.owner.account.address,
          f.positionIds[1],
        ]),
        sharesBefore,
      );
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.market.address,
          f.positionIds[1],
        ]),
        poolSharesBefore,
      );

      await f.orderBook.write.expireEvaluation([1n]);
      await f.orderBook.write.expireOrder([3n]);
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Expired);
      assert.equal(Number(await f.orderBook.read.statusOf([3n])), STATUS.Expired);
      assert.equal(await f.orderBook.read.escrowBalance(), 3n * UNIT);

      for (const orderId of [1n, 2n, 3n]) {
        await f.orderBook.write.refund([orderId], {
          account: f.accounts.owner.account,
        });
      }
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);
    },
  );

  it(
    "enforces individual order expiry before market close and preserves every refund",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture({
        evaluationTimeout: 300n,
        publicationTimeout: 300n,
        tradingLifetime: 3_600n,
      });
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);
      const creationBlock = await f.publicClient.getBlock();
      const expiresAt = creationBlock.timestamp + 120n;

      await createOrder(f, { minOut: quote, expiresAt });
      await createOrder(f, { minOut: quote, expiresAt });
      await workerWrite(f, "requestEvaluation", [2n]);
      const evaluatingCandidate = await f.orderBook.read.candidateOf([2n]);
      assert.notEqual(evaluatingCandidate, zeroHash);

      await createOrder(f, { minOut: quote, expiresAt });
      await workerWrite(f, "requestEvaluation", [3n]);
      const publishedCandidate = await f.orderBook.read.candidateOf([3n]);
      assert.equal(
        (await privateDecrypt(f.workerHandleClient, publishedCandidate)).value,
        quote,
      );
      await workerWrite(f, "requestPublication", [3n, 1]);
      const published = await publicDecrypt(f.handleClient, publishedCandidate);
      assert.equal(published.value, quote);

      const resultKey = keccak256(
        encodeAbiParameters(
          [{ type: "bytes32" }, { type: "uint256" }],
          [publishedCandidate, quote],
        ),
      );
      const poolCollateralBefore = await f.collateral.read.balanceOf([f.market.address]);
      const poolPositionsBefore = await Promise.all(
        f.positionIds.map((positionId) =>
          f.conditionalTokens.read.balanceOf([f.market.address, positionId]),
        ),
      );
      const recipientSharesBefore = await f.conditionalTokens.read.balanceOf([
        f.accounts.owner.account.address,
        f.positionIds[1],
      ]);
      const escrowBefore = await f.collateral.read.balanceOf([f.orderBook.address]);
      assert.equal(escrowBefore, 3n * UNIT);

      await f.testClient.setNextBlockTimestamp({ timestamp: expiresAt });
      await f.testClient.mine({ blocks: 1 });
      const expiryBlock = await f.publicClient.getBlock();
      assert.equal(expiryBlock.timestamp, expiresAt);
      assert.ok(expiryBlock.timestamp < (await f.orderBook.read.tradingClosesAt()));
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Open);
      assert.equal(Number(await f.orderBook.read.statusOf([2n])), STATUS.Evaluating);
      assert.equal(
        Number(await f.orderBook.read.statusOf([3n])),
        STATUS.PublicationPending,
      );
      assert.equal(await f.orderBook.read.candidateOf([2n]), zeroHash);
      assert.equal(await f.orderBook.read.candidateOf([3n]), zeroHash);

      await assert.rejects(
        () =>
          f.orderBook.write.cancel([1n], {
            account: f.accounts.owner.account,
          }),
        (error: unknown) => hasContractRevert(error, "InvalidExpiry"),
      );
      await assert.rejects(
        () =>
          f.publicClient.simulateContract({
            address: f.orderBook.address,
            abi: f.orderBook.abi,
            functionName: "requestPublication",
            args: [2n, 1],
            account: f.accounts.worker.account,
          }),
        (error: unknown) => hasContractRevert(error, "InvalidExpiry"),
      );
      const lateFinalize = await f.publicClient.simulateContract({
        address: f.orderBook.address,
        abi: f.orderBook.abi,
        functionName: "finalize",
        args: [3n, 1, published.decryptionProof],
        account: f.accounts.rescuer.account,
      });
      assert.equal(lateFinalize.result, 0n);
      assert.equal(
        Number(await f.orderBook.read.statusOf([3n])),
        STATUS.PublicationPending,
      );
      assert.equal(await f.orderBook.read.resultConsumed([resultKey]), false);

      await f.orderBook.write.expireOrder([1n]);
      await f.orderBook.write.expireEvaluation([2n]);
      const finalizeHash = await f.accounts.rescuer.writeContract({
        address: f.orderBook.address,
        abi: f.orderBook.abi,
        functionName: "finalize",
        args: [3n, 1, published.decryptionProof],
      });
      const finalizeReceipt = await f.publicClient.waitForTransactionReceipt({
        hash: finalizeHash,
      });

      assert.equal(finalizeReceipt.status, "success");
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Expired);
      assert.equal(Number(await f.orderBook.read.statusOf([2n])), STATUS.Expired);
      assert.equal(
        Number(await f.orderBook.read.statusOf([3n])),
        STATUS.DisclosedRefundable,
      );
      assert.equal(await f.orderBook.read.resultConsumed([resultKey]), false);
      assert.equal(await f.orderBook.read.authorizedMinOutOf([3n]), 0n);
      assert.equal(await f.orderBook.read.outcomeTokensOf([3n]), 0n);
      assert.equal(await f.orderBook.read.escrowBalance(), escrowBefore);
      assert.equal(await f.collateral.read.balanceOf([f.orderBook.address]), escrowBefore);
      assert.equal(await f.collateral.read.allowance([f.orderBook.address, f.market.address]), 0n);
      assert.equal(await f.collateral.read.balanceOf([f.market.address]), poolCollateralBefore);
      assert.deepEqual(
        await Promise.all(
          f.positionIds.map((positionId) =>
            f.conditionalTokens.read.balanceOf([f.market.address, positionId]),
          ),
        ),
        poolPositionsBefore,
      );
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.accounts.owner.account.address,
          f.positionIds[1],
        ]),
        recipientSharesBefore,
      );
      assert.equal(
        parseEventLogs({
          abi: f.market.abi,
          eventName: "FPMMBuy",
          logs: finalizeReceipt.logs,
          strict: true,
        }).length,
        0,
      );

      const ownerBeforeRefunds = await f.collateral.read.balanceOf([
        f.accounts.owner.account.address,
      ]);
      for (const orderId of [1n, 2n, 3n]) {
        await f.orderBook.write.refund([orderId], {
          account: f.accounts.owner.account,
        });
        assert.equal(Number(await f.orderBook.read.statusOf([orderId])), STATUS.Refunded);
      }
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);
      assert.equal(await f.collateral.read.balanceOf([f.orderBook.address]), 0n);
      assert.equal(
        await f.collateral.read.balanceOf([f.accounts.owner.account.address]),
        ownerBeforeRefunds + escrowBefore,
      );
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
    "blocks recipient refund reentrancy with the exact guard while completing one fill",
    { timeout: 180_000 },
    async () => {
      const f = await deployFixture();
      const recipient = await f.viem.deployContract("ReentrantRefundRecipient", [
        f.orderBook.address,
        1n,
      ]);
      const quote = await f.market.read.calcBuyAmount([UNIT, 1n]);
      await createOrder(f, { minOut: quote, recipient: recipient.address });
      await workerWrite(f, "requestEvaluation", [1n]);
      const candidate = await f.orderBook.read.candidateOf([1n]);
      assert.equal((await privateDecrypt(f.workerHandleClient, candidate)).value, quote);

      const { published, finalizeReceipt } = await publishAndFinalize(f);
      const resultKey = keccak256(
        encodeAbiParameters(
          [{ type: "bytes32" }, { type: "uint256" }],
          [candidate, published.value],
        ),
      );
      const filled = parseEventLogs({
        abi: f.orderBook.abi,
        eventName: "Filled",
        logs: finalizeReceipt.logs,
        strict: true,
      });
      const executionFailures = parseEventLogs({
        abi: f.orderBook.abi,
        eventName: "ExecutionFailed",
        logs: finalizeReceipt.logs,
        strict: true,
      });
      const refunds = parseEventLogs({
        abi: f.orderBook.abi,
        eventName: "Refunded",
        logs: finalizeReceipt.logs,
        strict: true,
      });
      const buys = parseEventLogs({
        abi: f.market.abi,
        eventName: "FPMMBuy",
        logs: finalizeReceipt.logs,
        strict: true,
      });

      assert.equal(finalizeReceipt.status, "success");
      assert.equal(filled.length, 1);
      assert.equal(filled[0]?.args.orderId, 1n);
      assert.equal(filled[0]?.args.nonce, 1);
      assert.equal(filled[0]?.args.minOut, quote);
      assert.equal(filled[0]?.args.outcomeTokens, quote);
      assert.equal(executionFailures.length, 0);
      assert.equal(refunds.length, 0);
      assert.equal(buys.length, 1);
      assert.equal(await recipient.read.attempts(), 1n);
      assert.equal(await recipient.read.reentrySucceeded(), false);
      assert.equal(
        await recipient.read.reentrySelector(),
        toFunctionSelector("ReentrantCall()"),
      );
      assert.equal(Number(await f.orderBook.read.statusOf([1n])), STATUS.Filled);
      assert.equal(await f.orderBook.read.authorizedMinOutOf([1n]), quote);
      assert.equal(await f.orderBook.read.outcomeTokensOf([1n]), quote);
      assert.equal(await f.orderBook.read.resultConsumed([resultKey]), true);
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          recipient.address,
          f.positionIds[1],
        ]),
        quote,
      );
      assert.equal(
        await f.conditionalTokens.read.balanceOf([
          f.orderBook.address,
          f.positionIds[1],
        ]),
        0n,
      );
      assert.equal(await f.orderBook.read.escrowBalance(), 0n);
      assert.equal(await f.collateral.read.balanceOf([f.orderBook.address]), 0n);
      assert.equal(await f.collateral.read.allowance([f.orderBook.address, f.market.address]), 0n);
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
