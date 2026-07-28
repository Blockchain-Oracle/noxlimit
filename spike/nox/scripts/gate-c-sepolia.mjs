import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createViemHandleClient } from "@iexec-nox/handle";
import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  keccak256,
  parseEventLogs,
  toBytes,
  zeroHash,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const NOX_COMPUTE = "0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF";
const DEFAULT_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const UNIT = 10n ** 18n;
const PRICE_SCALE = 10n ** 18n;
const SEED = 10n * UNIT;
const ORDER_AMOUNT = UNIT / 10n;
const FIRST_MOVE = UNIT;
const SECOND_MOVE = 2n * UNIT;
const FEE = 3_000_000_000_000_000n;
const EVALUATION_TIMEOUT = 45n;
const PUBLICATION_TIMEOUT = 600n;
const ORDER_LIFETIME = 3_600n;
const WORKER_TARGET_BALANCE = 5_000_000_000_000_000n;
const MINIMUM_DEPLOYER_BALANCE = 30_000_000_000_000_000n;
const CONFIGURED_PRICE_TICK = 100_000_000_000_000n;
const deployerKeyPath = fileURLToPath(new URL("../.gate-c-deployer-key", import.meta.url));
const workerKeyPath = fileURLToPath(new URL("../.gate-c-worker-key", import.meta.url));
const moverKeyPath = fileURLToPath(new URL("../.gate-c-mover-key", import.meta.url));
const evidencePath = fileURLToPath(
  new URL("../evidence/sepolia-gate-c.json", import.meta.url),
);

const STATUS = {
  Open: 1,
  Evaluating: 2,
  PublicationPending: 3,
  Filled: 5,
  Cancelled: 6,
  DisclosedRefundable: 8,
  Refunded: 9,
};

const NOX_PUBLIC_ABI = [
  {
    type: "function",
    name: "isPubliclyDecryptable",
    stateMutability: "view",
    inputs: [{ name: "handle", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "validateDecryptionProof",
    stateMutability: "view",
    inputs: [
      { name: "handle", type: "bytes32" },
      { name: "decryptionProof", type: "bytes" },
    ],
    outputs: [{ name: "decryptedResult", type: "bytes" }],
  },
];

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function ceilDiv(numerator, denominator) {
  return numerator === 0n ? 0n : ((numerator - 1n) / denominator) + 1n;
}

function quoteFromBinaryBalances(amountIn, outcomeIndex, balances) {
  const net = amountIn - ((amountIn * FEE) / PRICE_SCALE);
  const otherIndex = outcomeIndex === 0 ? 1 : 0;
  const endingScaled = ceilDiv(
    balances[outcomeIndex] * PRICE_SCALE * balances[otherIndex],
    balances[otherIndex] + net,
  );
  return balances[outcomeIndex] + net - ceilDiv(endingScaled, PRICE_SCALE);
}

function balancesAfterBuy(amountIn, outcomeIndex, balances) {
  const net = amountIn - ((amountIn * FEE) / PRICE_SCALE);
  const quote = quoteFromBinaryBalances(amountIn, outcomeIndex, balances);
  const next = [balances[0] + net, balances[1] + net];
  next[outcomeIndex] -= quote;
  return next;
}

async function requiredPrivateKey() {
  const value = process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY?.trim();
  const saved = existsSync(deployerKeyPath)
    ? (await readFile(deployerKeyPath, "utf8")).trim()
    : undefined;
  const selected = value || saved;
  if (!selected) {
    throw new Error(
      "no Sepolia deployer key found; run `pnpm gate-c:prepare` or set SEPOLIA_DEPLOYER_PRIVATE_KEY",
    );
  }
  const normalized = selected.startsWith("0x") ? selected : `0x${selected}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("SEPOLIA_DEPLOYER_PRIVATE_KEY must be a 32-byte hex private key");
  }
  return normalized;
}

async function artifact(relativePath) {
  return JSON.parse(
    await readFile(new URL(`../artifacts/${relativePath}`, import.meta.url), "utf8"),
  );
}

async function waitForValue(fn, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  let latest;
  while (Date.now() < deadline) {
    try {
      return await fn();
    } catch (error) {
      latest = error;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
  throw latest;
}

async function waitForChainTimestamp(publicClient, targetTimestamp, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const block = await publicClient.getBlock();
    if (block.timestamp >= targetTimestamp) return block;
    await new Promise((resolve) => setTimeout(resolve, 4_000));
  }
  throw new Error(`chain timestamp did not reach ${targetTimestamp} before timeout`);
}

async function loadOrCreateActor(keyPath) {
  if (existsSync(keyPath)) {
    const saved = (await readFile(keyPath, "utf8")).trim();
    return privateKeyToAccount(saved);
  }
  const key = generatePrivateKey();
  await writeFile(keyPath, `${key}\n`, { mode: 0o600 });
  return privateKeyToAccount(key);
}

// This observer deliberately receives only public RPC data, a public ABI, and a public handle.
// It never receives either wallet client or the worker's decryption client/key.
async function observePublicEvaluation({
  publicClient,
  receipt,
  orderBookAbi,
  candidate,
  expectedQuote,
}) {
  const evaluations = parseEventLogs({
    abi: orderBookAbi,
    eventName: "EvaluationRequested",
    logs: receipt.logs,
    strict: true,
  });
  const publications = parseEventLogs({
    abi: orderBookAbi,
    eventName: "PublicationRequested",
    logs: receipt.logs,
    strict: true,
  });
  if (evaluations.length !== 1) throw new Error("public observer expected one evaluation event");
  if (publications.length !== 0) throw new Error("evaluation unexpectedly emitted publication");
  assertEqual(evaluations[0].args.quote, expectedQuote, "public evaluation quote");
  const publiclyDecryptable = await publicClient.readContract({
    address: NOX_COMPUTE,
    abi: NOX_PUBLIC_ABI,
    functionName: "isPubliclyDecryptable",
    args: [candidate],
  });
  return {
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    orderId: evaluations[0].args.orderId.toString(),
    nonce: Number(evaluations[0].args.nonce),
    quote: evaluations[0].args.quote.toString(),
    candidate,
    publiclyDecryptable,
    normalizedEventShape: receipt.logs.map(
      (log) => `${log.address.toLowerCase()}:${log.topics[0] ?? "0x"}`,
    ),
  };
}

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL?.trim() || DEFAULT_RPC;
  const deployer = privateKeyToAccount(await requiredPrivateKey());
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const deployerWallet = createWalletClient({
    account: deployer,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const chainId = await publicClient.getChainId();
  if (chainId !== sepolia.id) throw new Error(`wrong chain ${chainId}`);
  const noxCode = await publicClient.getCode({ address: NOX_COMPUTE });
  if (noxCode === undefined || noxCode === "0x") {
    throw new Error("live NoxCompute code is missing");
  }
  const deployerBalance = await publicClient.getBalance({ address: deployer.address });
  if (deployerBalance < MINIMUM_DEPLOYER_BALANCE) {
    throw new Error(
      `deployer ${deployer.address} needs at least 0.03 Sepolia ETH; current balance is ${deployerBalance}`,
    );
  }

  const worker = await loadOrCreateActor(workerKeyPath);
  const mover = await loadOrCreateActor(moverKeyPath);
  const workerWallet = createWalletClient({
    account: worker,
    chain: sepolia,
    transport: http(rpcUrl),
  });
  const moverWallet = createWalletClient({
    account: mover,
    chain: sepolia,
    transport: http(rpcUrl),
  });
  async function fundActor(actor) {
    const balance = await publicClient.getBalance({ address: actor.address });
    if (balance >= WORKER_TARGET_BALANCE) return undefined;
    const hash = await deployerWallet.sendTransaction({
      to: actor.address,
      value: WORKER_TARGET_BALANCE - balance,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }
  const workerFundingHash = await fundActor(worker);
  const moverFundingHash = await fundActor(mover);

  const [
    collateralArtifact,
    conditionalTokensArtifact,
    factoryArtifact,
    marketArtifact,
    orderBookArtifact,
  ] = await Promise.all([
    artifact("contracts/test/GateCMarketContracts.sol/GateCTestCollateral.json"),
    artifact("contracts/test/GateCMarketContracts.sol/GateCConditionalTokens.json"),
    artifact(
      "contracts/test/GateCMarketContracts.sol/GateCFixedProductMarketMakerFactory.json",
    ),
    artifact("contracts/test/GateCMarketContracts.sol/GateCFixedProductMarketMaker.json"),
    artifact("contracts/NoxLimitOrderBook.sol/NoxLimitOrderBook.json"),
  ]);

  const deploymentTxs = {};
  async function deploy(label, contractArtifact, args = [], gas) {
    const hash = await deployerWallet.deployContract({
      abi: contractArtifact.abi,
      bytecode: contractArtifact.bytecode,
      args,
      ...(gas === undefined ? {} : { gas }),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success" || receipt.contractAddress === null) {
      throw new Error(`${label} deployment failed: ${hash}`);
    }
    deploymentTxs[label] = hash;
    return receipt.contractAddress;
  }

  const collateralAddress = await deploy("collateral", collateralArtifact);
  const conditionalTokensAddress = await deploy("conditionalTokens", conditionalTokensArtifact);
  const factoryAddress = await deploy("fpmmFactory", factoryArtifact);
  const collateral = getContract({
    address: collateralAddress,
    abi: collateralArtifact.abi,
    client: { public: publicClient, wallet: deployerWallet },
  });
  const moverCollateral = getContract({
    address: collateralAddress,
    abi: collateralArtifact.abi,
    client: { public: publicClient, wallet: moverWallet },
  });
  const conditionalTokens = getContract({
    address: conditionalTokensAddress,
    abi: conditionalTokensArtifact.abi,
    client: { public: publicClient, wallet: deployerWallet },
  });
  const factory = getContract({
    address: factoryAddress,
    abi: factoryArtifact.abi,
    client: { public: publicClient, wallet: deployerWallet },
  });

  const questionId = keccak256(toBytes(`noxlimit-gate-c-${Date.now()}`));
  const prepareHash = await conditionalTokens.write.prepareCondition([
    deployer.address,
    questionId,
    2n,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: prepareHash });
  const conditionId = await conditionalTokens.read.getConditionId([
    deployer.address,
    questionId,
    2n,
  ]);
  const positionIds = await Promise.all(
    [1n, 2n].map(async (indexSet) => {
      const collectionId = await conditionalTokens.read.getCollectionId([
        zeroHash,
        conditionId,
        indexSet,
      ]);
      return conditionalTokens.read.getPositionId([collateralAddress, collectionId]);
    }),
  );

  const createMarketHash = await factory.write.createFixedProductMarketMaker([
    conditionalTokensAddress,
    collateralAddress,
    [conditionId],
    FEE,
  ]);
  const createMarketReceipt = await publicClient.waitForTransactionReceipt({
    hash: createMarketHash,
  });
  const [marketCreated] = parseEventLogs({
    abi: factoryArtifact.abi,
    eventName: "FixedProductMarketMakerCreation",
    logs: createMarketReceipt.logs,
    strict: true,
  });
  if (marketCreated === undefined) throw new Error("FPMM creation event missing");
  const marketAddress = marketCreated.args.fixedProductMarketMaker;
  const market = getContract({
    address: marketAddress,
    abi: marketArtifact.abi,
    client: { public: publicClient, wallet: deployerWallet },
  });
  const moverMarket = getContract({
    address: marketAddress,
    abi: marketArtifact.abi,
    client: { public: publicClient, wallet: moverWallet },
  });

  const mintOwnerHash = await collateral.write.mint([
    deployer.address,
    SEED + ORDER_AMOUNT,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: mintOwnerHash });
  const mintMoverHash = await collateral.write.mint([
    mover.address,
    ORDER_AMOUNT + FIRST_MOVE + SECOND_MOVE,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: mintMoverHash });
  const approveSeedHash = await collateral.write.approve([marketAddress, SEED]);
  await publicClient.waitForTransactionReceipt({ hash: approveSeedHash });
  const fundHash = await market.write.addFunding([SEED, []]);
  await publicClient.waitForTransactionReceipt({ hash: fundHash });

  const orderBookAddress = await deploy(
    "orderBook",
    orderBookArtifact,
    [
      worker.address,
      marketAddress,
      conditionalTokensAddress,
      collateralAddress,
      conditionId,
      EVALUATION_TIMEOUT,
      PUBLICATION_TIMEOUT,
      0n,
      3,
    ],
    20_000_000n,
  );
  const orderBook = getContract({
    address: orderBookAddress,
    abi: orderBookArtifact.abi,
    client: { public: publicClient, wallet: deployerWallet },
  });
  const workerOrderBook = getContract({
    address: orderBookAddress,
    abi: orderBookArtifact.abi,
    client: { public: publicClient, wallet: workerWallet },
  });
  const moverOrderBook = getContract({
    address: orderBookAddress,
    abi: orderBookArtifact.abi,
    client: { public: publicClient, wallet: moverWallet },
  });

  const initialBalances = [SEED, SEED];
  const expectedQ1 = quoteFromBinaryBalances(ORDER_AMOUNT, 1, initialBalances);
  const afterFirstMove = balancesAfterBuy(FIRST_MOVE, 0, initialBalances);
  const expectedQ2 = quoteFromBinaryBalances(ORDER_AMOUNT, 1, afterFirstMove);
  const afterSecondMove = balancesAfterBuy(SECOND_MOVE, 0, afterFirstMove);
  const expectedQ3 = quoteFromBinaryBalances(ORDER_AMOUNT, 1, afterSecondMove);
  if (!(expectedQ1 < expectedQ2 && expectedQ2 < expectedQ3)) {
    throw new Error("constructed quote path is not strictly increasing");
  }
  const threshold = expectedQ2 + ((expectedQ3 - expectedQ2) / 2n);
  const liveQ1 = await market.read.calcBuyAmount([ORDER_AMOUNT, 1n]);
  assertEqual(liveQ1, expectedQ1, "initial independent FPMM quote");

  const ownerHandleClient = await createViemHandleClient(deployerWallet);
  const moverHandleClient = await createViemHandleClient(moverWallet);
  const workerHandleClient = await createViemHandleClient(workerWallet);
  const approveTargetHash = await collateral.write.approve([orderBookAddress, ORDER_AMOUNT]);
  await publicClient.waitForTransactionReceipt({ hash: approveTargetHash });
  const approveControlHash = await moverCollateral.write.approve([
    orderBookAddress,
    ORDER_AMOUNT,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: approveControlHash });
  const orderExpiry = (await publicClient.getBlock()).timestamp + ORDER_LIFETIME;

  async function createOrder({ walletOrderBook, handleClient, recipient, minOut }) {
    const encrypted = await handleClient.encryptInput(
      minOut,
      "uint256",
      orderBookAddress,
    );
    const hash = await walletOrderBook.write.createOrder([
      recipient,
      1,
      ORDER_AMOUNT,
      orderExpiry,
      encrypted.handle,
      encrypted.handleProof,
    ]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const [created] = parseEventLogs({
      abi: orderBookArtifact.abi,
      eventName: "OrderCreated",
      logs: receipt.logs,
      strict: true,
    });
    if (created === undefined) throw new Error("OrderCreated event missing");
    return { id: created.args.orderId, hash };
  }

  const targetOrder = await createOrder({
    walletOrderBook: orderBook,
    handleClient: ownerHandleClient,
    recipient: deployer.address,
    minOut: threshold,
  });
  const delayedEligibleControl = await createOrder({
    walletOrderBook: moverOrderBook,
    handleClient: moverHandleClient,
    recipient: mover.address,
    minOut: expectedQ1,
  });
  assertEqual(targetOrder.id, 1n, "target order id");
  assertEqual(delayedEligibleControl.id, 2n, "control order id");

  async function evaluateAndObserve(orderId, expectedQuote, expectedPrivateResult) {
    const started = Date.now();
    const hash = await workerOrderBook.write.requestEvaluation([orderId]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const candidate = await orderBook.read.candidateOf([orderId]);
    const decrypted = await waitForValue(() => workerHandleClient.decrypt(candidate));
    assertEqual(decrypted.value, expectedPrivateResult, "worker private result");
    const publicObservation = await observePublicEvaluation({
      publicClient,
      receipt,
      orderBookAbi: orderBookArtifact.abi,
      candidate,
      expectedQuote,
    });
    if (publicObservation.publiclyDecryptable) {
      throw new Error("candidate became public before an explicit publication request");
    }
    return {
      hash,
      receipt,
      candidate,
      privateResult: decrypted.value,
      privateDecryptMs: Date.now() - started,
      publicObservation,
    };
  }

  const firstFalse = await evaluateAndObserve(targetOrder.id, expectedQ1, 0n);
  const withheldEligible = await evaluateAndObserve(
    delayedEligibleControl.id,
    expectedQ1,
    expectedQ1,
  );
  if (
    JSON.stringify(firstFalse.publicObservation.normalizedEventShape) !==
    JSON.stringify(withheldEligible.publicObservation.normalizedEventShape)
  ) {
    throw new Error("false and withheld-eligible public event shapes differ");
  }

  const firstTimeoutTarget = (await publicClient.getBlock()).timestamp + EVALUATION_TIMEOUT + 1n;
  await waitForChainTimestamp(publicClient, firstTimeoutTarget);
  const expireFirstHash = await moverOrderBook.write.expireEvaluation([targetOrder.id]);
  const expireFirstReceipt = await publicClient.waitForTransactionReceipt({
    hash: expireFirstHash,
  });
  const expireControlHash = await moverOrderBook.write.expireEvaluation([
    delayedEligibleControl.id,
  ]);
  const expireControlReceipt = await publicClient.waitForTransactionReceipt({
    hash: expireControlHash,
  });
  const normalizedTimeoutShape = (receipt) =>
    receipt.logs.map((log) => `${log.address.toLowerCase()}:${log.topics[0] ?? "0x"}`);
  if (
    JSON.stringify(normalizedTimeoutShape(expireFirstReceipt)) !==
    JSON.stringify(normalizedTimeoutShape(expireControlReceipt))
  ) {
    throw new Error("false and withheld-eligible timeout event shapes differ");
  }
  const cancelControlHash = await moverOrderBook.write.cancel([delayedEligibleControl.id]);
  await publicClient.waitForTransactionReceipt({ hash: cancelControlHash });
  const refundControlHash = await moverOrderBook.write.refund([delayedEligibleControl.id]);
  await publicClient.waitForTransactionReceipt({ hash: refundControlHash });
  assertEqual(
    Number(await orderBook.read.statusOf([delayedEligibleControl.id])),
    STATUS.Refunded,
    "control refund status",
  );

  async function movePool(amountIn) {
    const approveHash = await moverCollateral.write.approve([marketAddress, amountIn]);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    const minOut = await market.read.calcBuyAmount([amountIn, 0n]);
    const hash = await moverMarket.write.buy([amountIn, 0n, minOut]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("reserve-moving FPMM buy failed");
    return { approveHash, hash, outcomeTokens: minOut };
  }

  const firstMove = await movePool(FIRST_MOVE);
  const liveQ2 = await market.read.calcBuyAmount([ORDER_AMOUNT, 1n]);
  assertEqual(liveQ2, expectedQ2, "first moved independent FPMM quote");
  const secondFalse = await evaluateAndObserve(targetOrder.id, expectedQ2, 0n);
  const secondTimeoutTarget =
    (await publicClient.getBlock()).timestamp + EVALUATION_TIMEOUT + 1n;
  await waitForChainTimestamp(publicClient, secondTimeoutTarget);
  const expireSecondHash = await moverOrderBook.write.expireEvaluation([targetOrder.id]);
  await publicClient.waitForTransactionReceipt({ hash: expireSecondHash });

  const secondMove = await movePool(SECOND_MOVE);
  const liveQ3 = await market.read.calcBuyAmount([ORDER_AMOUNT, 1n]);
  assertEqual(liveQ3, expectedQ3, "second moved independent FPMM quote");
  const successfulEvaluation = await evaluateAndObserve(
    targetOrder.id,
    expectedQ3,
    threshold,
  );
  const uniqueCandidates = new Set([
    firstFalse.candidate,
    secondFalse.candidate,
    successfulEvaluation.candidate,
  ]);
  if (uniqueCandidates.size !== 3) throw new Error("evaluation candidates are not nonce-distinct");

  const lowerPriceBound = ceilDiv(ORDER_AMOUNT * PRICE_SCALE, expectedQ3);
  const upperPriceBound = ceilDiv(ORDER_AMOUNT * PRICE_SCALE, expectedQ2 + 1n);
  const priceBracketWidth = upperPriceBound - lowerPriceBound;
  if (priceBracketWidth <= CONFIGURED_PRICE_TICK) {
    throw new Error("constructed live inference bracket is no wider than one UI price tick");
  }

  const publishHash = await workerOrderBook.write.requestPublication([targetOrder.id, 3]);
  await publicClient.waitForTransactionReceipt({ hash: publishHash });
  const publicationStarted = Date.now();
  const published = await waitForValue(() =>
    moverHandleClient.publicDecrypt(successfulEvaluation.candidate),
  );
  assertEqual(published.value, threshold, "published threshold");
  const publicDecryptMs = Date.now() - publicationStarted;

  const earlierCandidatesRemainPrivate = await Promise.all(
    [firstFalse.candidate, secondFalse.candidate, withheldEligible.candidate].map((candidate) =>
      publicClient.readContract({
        address: NOX_COMPUTE,
        abi: NOX_PUBLIC_ABI,
        functionName: "isPubliclyDecryptable",
        args: [candidate],
      }),
    ),
  );
  if (earlierCandidatesRemainPrivate.some(Boolean)) {
    throw new Error("an earlier or withheld candidate became publicly decryptable");
  }

  let crossHandleProofRejected = false;
  try {
    await publicClient.readContract({
      address: NOX_COMPUTE,
      abi: NOX_PUBLIC_ABI,
      functionName: "validateDecryptionProof",
      args: [firstFalse.candidate, published.decryptionProof],
    });
  } catch {
    crossHandleProofRejected = true;
  }
  if (!crossHandleProofRejected) {
    throw new Error("success proof unexpectedly validated against an earlier candidate");
  }

  const recipientSharesBefore = await conditionalTokens.read.balanceOf([
    deployer.address,
    positionIds[1],
  ]);
  const adapterSharesBefore = await conditionalTokens.read.balanceOf([
    orderBookAddress,
    positionIds[1],
  ]);
  const poolCollateralBefore = await collateral.read.balanceOf([marketAddress]);
  const poolPositionsBefore = await Promise.all(
    positionIds.map((positionId) =>
      conditionalTokens.read.balanceOf([marketAddress, positionId]),
    ),
  );
  const adapterCollateralBefore = await collateral.read.balanceOf([orderBookAddress]);
  assertEqual(adapterCollateralBefore, ORDER_AMOUNT, "target escrow before finalization");

  const finalizeHash = await moverOrderBook.write.finalize(
    [targetOrder.id, 3, published.decryptionProof],
    { gas: 3_000_000n },
  );
  const finalizeReceipt = await publicClient.waitForTransactionReceipt({ hash: finalizeHash });
  if (finalizeReceipt.status !== "success") throw new Error("finalize transaction reverted");
  const [fill] = parseEventLogs({
    abi: orderBookArtifact.abi,
    eventName: "Filled",
    logs: finalizeReceipt.logs,
    strict: true,
  });
  const [buy] = parseEventLogs({
    abi: marketArtifact.abi,
    eventName: "FPMMBuy",
    logs: finalizeReceipt.logs,
    strict: true,
  });
  if (fill === undefined || buy === undefined) throw new Error("combined fill events missing");
  if (
    fill.address.toLowerCase() !== orderBookAddress.toLowerCase() ||
    buy.address.toLowerCase() !== marketAddress.toLowerCase()
  ) {
    throw new Error("combined fill event emitter mismatch");
  }

  const recipientShares = await conditionalTokens.read.balanceOf([
    deployer.address,
    positionIds[1],
  ]);
  const adapterShares = await conditionalTokens.read.balanceOf([
    orderBookAddress,
    positionIds[1],
  ]);
  const status = Number(await orderBook.read.statusOf([targetOrder.id]));
  const allowance = await collateral.read.allowance([orderBookAddress, marketAddress]);
  const escrow = await orderBook.read.escrowBalance();
  const storedOutcomeTokens = await orderBook.read.outcomeTokensOf([targetOrder.id]);
  const poolCollateralAfter = await collateral.read.balanceOf([marketAddress]);
  const poolPositionsAfter = await Promise.all(
    positionIds.map((positionId) =>
      conditionalTokens.read.balanceOf([marketAddress, positionId]),
    ),
  );
  const recipientDelta = recipientShares - recipientSharesBefore;
  const feeAmount = buy.args.feeAmount;
  const netInvestment = ORDER_AMOUNT - feeAmount;
  if (
    status !== STATUS.Filled ||
    fill.args.orderId !== targetOrder.id ||
    Number(fill.args.nonce) !== 3 ||
    fill.args.minOut !== threshold ||
    fill.args.outcomeTokens !== buy.args.outcomeTokensBought ||
    buy.args.buyer.toLowerCase() !== orderBookAddress.toLowerCase() ||
    buy.args.investmentAmount !== ORDER_AMOUNT ||
    buy.args.outcomeIndex !== 1n ||
    buy.args.outcomeTokensBought < threshold ||
    storedOutcomeTokens !== fill.args.outcomeTokens ||
    recipientDelta !== fill.args.outcomeTokens ||
    adapterSharesBefore !== 0n ||
    adapterShares !== 0n ||
    allowance !== 0n ||
    escrow !== 0n ||
    poolCollateralAfter !== poolCollateralBefore + feeAmount ||
    poolPositionsAfter[0] !== poolPositionsBefore[0] + netInvestment ||
    poolPositionsAfter[1] !==
      poolPositionsBefore[1] + netInvestment - buy.args.outcomeTokensBought
  ) {
    throw new Error("terminal postconditions failed");
  }

  let replayRejected = false;
  try {
    await orderBook.simulate.finalize([targetOrder.id, 3, published.decryptionProof], {
      account: mover,
    });
  } catch {
    replayRejected = true;
  }
  if (!replayRejected) throw new Error("finalization replay unexpectedly succeeded");

  const evidence = {
    generatedAt: new Date().toISOString(),
    chainId,
    blockNumber: finalizeReceipt.blockNumber.toString(),
    roles: {
      deployerOwnerRecipientAndInitialLiquidityProvider: deployer.address,
      fixedWorkerEvaluatorAndPublisher: worker.address,
      independentControlOwnerQuoteMoverAndPermissionlessRescuer: mover.address,
    },
    addresses: {
      noxCompute: NOX_COMPUTE,
      collateral: collateralAddress,
      conditionalTokens: conditionalTokensAddress,
      fpmmFactory: factoryAddress,
      fpmm: marketAddress,
      orderBook: orderBookAddress,
    },
    conditionId,
    positionIds: positionIds.map(String),
    parameters: {
      fee: FEE.toString(),
      seed: SEED.toString(),
      amountIn: ORDER_AMOUNT.toString(),
      firstReserveMove: FIRST_MOVE.toString(),
      secondReserveMove: SECOND_MOVE.toString(),
      q1: expectedQ1.toString(),
      q2: expectedQ2.toString(),
      q3: expectedQ3.toString(),
      thresholdRevealedAtSuccess: threshold.toString(),
      evaluationTimeout: EVALUATION_TIMEOUT.toString(),
      publicationTimeout: PUBLICATION_TIMEOUT.toString(),
    },
    publicInferenceTrace: {
      observerUsedOnlyPublicRpcData: true,
      rawReceiptsExpectedToDiffer: true,
      sameQ1NormalizedEventShape:
        JSON.stringify(firstFalse.publicObservation.normalizedEventShape) ===
        JSON.stringify(withheldEligible.publicObservation.normalizedEventShape),
      sameQ1NormalizedTimeoutShape:
        JSON.stringify(normalizedTimeoutShape(expireFirstReceipt)) ===
        JSON.stringify(normalizedTimeoutShape(expireControlReceipt)),
      firstFalse: firstFalse.publicObservation,
      withheldEligible: withheldEligible.publicObservation,
      secondFalse: secondFalse.publicObservation,
      successBeforePublication: successfulEvaluation.publicObservation,
      inferredThresholdRange: {
        assumption: "honest worker publishes every eligible target check without delay",
        lowerExclusiveQuote: expectedQ2.toString(),
        upperInclusiveQuote: expectedQ3.toString(),
        lowerPriceBound: lowerPriceBound.toString(),
        upperPriceBound: upperPriceBound.toString(),
        width: priceBracketWidth.toString(),
        configuredUiTick: CONFIGURED_PRICE_TICK.toString(),
      },
      unconditionalPublicConclusion:
        "silence alone is not a deterministic inequality because the eligible control was withheld",
      workerKnowledge: {
        firstTargetCheck: "0, proving quote < minOut",
        delayedEligibleControl: expectedQ1.toString(),
        secondTargetCheck: "0, proving quote < minOut",
        successfulTargetCheckExactMinOut: threshold.toString(),
      },
      earlierAndWithheldCandidatesStillPrivate: earlierCandidatesRemainPrivate.every(
        (value) => value === false,
      ),
      crossHandleProofRejected,
    },
    transactions: {
      workerFunding: workerFundingHash,
      moverFunding: moverFundingHash,
      ...deploymentTxs,
      prepareCondition: prepareHash,
      createMarket: createMarketHash,
      mintOwnerCollateral: mintOwnerHash,
      mintMoverCollateral: mintMoverHash,
      approveSeed: approveSeedHash,
      fundMarket: fundHash,
      approveTargetOrder: approveTargetHash,
      approveControlOrder: approveControlHash,
      createTargetOrder: targetOrder.hash,
      createDelayedEligibleControl: delayedEligibleControl.hash,
      requestTargetEvaluation1: firstFalse.hash,
      requestControlEvaluation: withheldEligible.hash,
      expireTargetEvaluation1: expireFirstHash,
      expireControlEvaluation: expireControlHash,
      cancelControl: cancelControlHash,
      refundControl: refundControlHash,
      approveFirstReserveMove: firstMove.approveHash,
      firstReserveMove: firstMove.hash,
      requestTargetEvaluation2: secondFalse.hash,
      expireTargetEvaluation2: expireSecondHash,
      approveSecondReserveMove: secondMove.approveHash,
      secondReserveMove: secondMove.hash,
      requestTargetEvaluation3: successfulEvaluation.hash,
      requestPublication: publishHash,
      finalize: finalizeHash,
    },
    result: {
      privateDecryptMs: {
        firstFalse: firstFalse.privateDecryptMs,
        withheldEligible: withheldEligible.privateDecryptMs,
        secondFalse: secondFalse.privateDecryptMs,
        success: successfulEvaluation.privateDecryptMs,
      },
      publicDecryptMs,
      outcomeTokensBought: buy.args.outcomeTokensBought.toString(),
      outcomeTokensForwarded: fill.args.outcomeTokens.toString(),
      recipientShares: recipientShares.toString(),
      recipientShareDelta: recipientDelta.toString(),
      storedOutcomeTokens: storedOutcomeTokens.toString(),
      adapterShares: adapterShares.toString(),
      adapterCollateral: escrow.toString(),
      fpmmAllowance: allowance.toString(),
      poolCollateralDelta: (poolCollateralAfter - poolCollateralBefore).toString(),
      poolPositionDeltas: poolPositionsAfter.map((balance, index) =>
        (balance - poolPositionsBefore[index]).toString(),
      ),
      replayRejected,
      ownerKeyRequiredAfterTargetCreation: false,
      objectiveResolutionIncluded: false,
    },
  };
  await mkdir(new URL("../evidence/", import.meta.url), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
