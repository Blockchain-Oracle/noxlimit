// One-shot historical recovery for the 2026-07-28 Gate C deployment.
// It is preserved as provenance and is intentionally not a general-purpose package command.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createViemHandleClient } from "@iexec-nox/handle";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const NOX_COMPUTE = "0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF";
const DEFAULT_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const ORDER_ID = 1n;
const FINAL_NONCE = 3;
const ORDER_AMOUNT = 100_000_000_000_000_000n;
const FINALIZER_TARGET_BALANCE = 10_000_000_000_000_000n;
const STATUS = { PublicationPending: 3, Filled: 5, Cancelled: 6, Refunded: 9 };
const orderBookAddress = "0x5AfFd32C5e8Fc0B61d99a1a7AAD505cCC4947d28";
const orderBookDeploymentTransaction =
  "0x9b0163277b4664c4c89a5b4794c63872b9334ea46d4bab156046475d76c86480";
const deployerKeyPath = fileURLToPath(new URL("../.gate-c-deployer-key", import.meta.url));
const moverKeyPath = fileURLToPath(new URL("../.gate-c-mover-key", import.meta.url));
const setupPath = fileURLToPath(
  new URL("../evidence/sepolia-gate-c-setup.json", import.meta.url),
);
const evidencePath = fileURLToPath(
  new URL("../evidence/sepolia-gate-c.json", import.meta.url),
);

const NOX_PUBLIC_ABI = [
  {
    type: "error",
    name: "InvalidProof",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "reason", type: "string" },
    ],
  },
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

function hasContractRevert(error, expectedErrorName) {
  if (!(error instanceof BaseError)) return false;
  const reverted = error.walk(
    (cause) => cause instanceof ContractFunctionRevertedError,
  );
  return (
    reverted instanceof ContractFunctionRevertedError &&
    reverted.data?.errorName === expectedErrorName
  );
}

async function artifact(relativePath) {
  return JSON.parse(
    await readFile(new URL(`../artifacts/${relativePath}`, import.meta.url), "utf8"),
  );
}

async function readAccount(path, label) {
  if (!existsSync(path)) throw new Error(`${label} key is missing`);
  return privateKeyToAccount((await readFile(path, "utf8")).trim());
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

function eventOf(events, name, predicate) {
  const matches = events.filter(
    (event) => event.eventName === name && (predicate === undefined || predicate(event.args)),
  );
  if (matches.length !== 1) {
    throw new Error(`expected one ${name} event, found ${matches.length}`);
  }
  return matches[0];
}

function normalizedReceiptShape(receipt) {
  return receipt.logs.map(
    (log) => `${log.address.toLowerCase()}:${log.topics[0] ?? "0x"}`,
  );
}

async function main() {
  const setup = JSON.parse(await readFile(setupPath, "utf8"));
  const [deployer, mover] = await Promise.all([
    readAccount(deployerKeyPath, "deployer"),
    readAccount(moverKeyPath, "mover"),
  ]);
  if (
    setup.chainId !== sepolia.id ||
    setup.roles.deployer.toLowerCase() !== deployer.address.toLowerCase() ||
    setup.roles.mover.toLowerCase() !== mover.address.toLowerCase()
  ) {
    throw new Error("setup checkpoint does not bind this chain and these actors");
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL?.trim() || DEFAULT_RPC;
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const deployerWallet = createWalletClient({
    account: deployer,
    chain: sepolia,
    transport,
  });
  const moverWallet = createWalletClient({ account: mover, chain: sepolia, transport });
  const [orderBookArtifact, collateralArtifact, conditionalTokensArtifact, marketArtifact] =
    await Promise.all([
      artifact("contracts/NoxLimitOrderBook.sol/NoxLimitOrderBook.json"),
      artifact("contracts/test/GateCMarketContracts.sol/GateCTestCollateral.json"),
      artifact("contracts/test/GateCMarketContracts.sol/GateCConditionalTokens.json"),
      artifact("contracts/test/GateCMarketContracts.sol/GateCFixedProductMarketMaker.json"),
    ]);

  const orderBookCode = await publicClient.getCode({ address: orderBookAddress });
  if (orderBookCode === undefined || orderBookCode === "0x") {
    throw new Error(`order book code is missing at ${orderBookAddress}`);
  }
  const orderBook = getContract({
    address: orderBookAddress,
    abi: orderBookArtifact.abi,
    client: { public: publicClient, wallet: moverWallet },
  });
  const collateral = getContract({
    address: setup.addresses.collateral,
    abi: collateralArtifact.abi,
    client: { public: publicClient, wallet: deployerWallet },
  });
  const conditionalTokens = getContract({
    address: setup.addresses.conditionalTokens,
    abi: conditionalTokensArtifact.abi,
    client: publicClient,
  });
  const market = getContract({
    address: setup.addresses.fpmm,
    abi: marketArtifact.abi,
    client: publicClient,
  });

  assertEqual(Number(await orderBook.read.statusOf([ORDER_ID])), STATUS.PublicationPending, "status");
  assertEqual(
    (await orderBook.read.ownerOf([ORDER_ID])).toLowerCase(),
    deployer.address.toLowerCase(),
    "target owner",
  );
  const candidate = await orderBook.read.candidateOf([ORDER_ID]);
  const publiclyDecryptable = await publicClient.readContract({
    address: NOX_COMPUTE,
    abi: NOX_PUBLIC_ABI,
    functionName: "isPubliclyDecryptable",
    args: [candidate],
  });
  assertEqual(publiclyDecryptable, true, "successful candidate public ACL");

  const moverHandleClient = await createViemHandleClient(moverWallet);
  const publicDecryptStarted = Date.now();
  const published = await waitForValue(() => moverHandleClient.publicDecrypt(candidate));
  const publicDecryptMs = Date.now() - publicDecryptStarted;
  const threshold = published.value;

  const orderBookDeploymentReceipt = await publicClient.getTransactionReceipt({
    hash: orderBookDeploymentTransaction,
  });
  if (
    orderBookDeploymentReceipt.status !== "success" ||
    orderBookDeploymentReceipt.contractAddress?.toLowerCase() !==
      orderBookAddress.toLowerCase()
  ) {
    throw new Error("order book deployment receipt does not bind the recovery address");
  }
  const orderBookRawLogs = await publicClient.getLogs({
    address: orderBookAddress,
    fromBlock: orderBookDeploymentReceipt.blockNumber,
    toBlock: "latest",
  });
  const orderBookEvents = parseEventLogs({
    abi: orderBookArtifact.abi,
    logs: orderBookRawLogs,
    strict: false,
  });
  const createdTarget = eventOf(
    orderBookEvents,
    "OrderCreated",
    (args) => args.orderId === ORDER_ID,
  );
  const createdControl = eventOf(
    orderBookEvents,
    "OrderCreated",
    (args) => args.orderId === 2n,
  );
  const evaluation = (orderId, nonce) =>
    eventOf(
      orderBookEvents,
      "EvaluationRequested",
      (args) => args.orderId === orderId && Number(args.nonce) === nonce,
    );
  const targetEvaluation1 = evaluation(ORDER_ID, 1);
  const controlEvaluation = evaluation(2n, 1);
  const targetEvaluation2 = evaluation(ORDER_ID, 2);
  const targetEvaluation3 = evaluation(ORDER_ID, 3);
  assertEqual(targetEvaluation3.args.candidate, candidate, "successful candidate");
  const q1 = targetEvaluation1.args.quote;
  const q2 = targetEvaluation2.args.quote;
  const q3 = targetEvaluation3.args.quote;
  if (
    controlEvaluation.args.quote !== q1 ||
    !(q1 < q2 && q2 < threshold && threshold <= q3)
  ) {
    throw new Error("recovered quote path or threshold relation is invalid");
  }
  const reopened = (orderId, nonce) =>
    eventOf(
      orderBookEvents,
      "EvaluationReopened",
      (args) => args.orderId === orderId && Number(args.nonce) === nonce,
    );
  const targetReopened1 = reopened(ORDER_ID, 1);
  const controlReopened = reopened(2n, 1);
  const targetReopened2 = reopened(ORDER_ID, 2);
  const publication = eventOf(
    orderBookEvents,
    "PublicationRequested",
    (args) => args.orderId === ORDER_ID && Number(args.nonce) === FINAL_NONCE,
  );
  assertEqual(publication.args.candidate, candidate, "publication candidate");
  const controlCancelled = eventOf(
    orderBookEvents,
    "Terminal",
    (args) => args.orderId === 2n && Number(args.status) === STATUS.Cancelled,
  );
  const controlRefunded = eventOf(
    orderBookEvents,
    "Refunded",
    (args) => args.orderId === 2n,
  );

  const priorCandidates = [
    targetEvaluation1.args.candidate,
    controlEvaluation.args.candidate,
    targetEvaluation2.args.candidate,
  ];
  if (new Set([...priorCandidates, candidate]).size !== 4) {
    throw new Error("recovered candidates are not order/nonce distinct");
  }
  const earlierCandidatesRemainPrivate = await Promise.all(
    priorCandidates.map((handle) =>
      publicClient.readContract({
        address: NOX_COMPUTE,
        abi: NOX_PUBLIC_ABI,
        functionName: "isPubliclyDecryptable",
        args: [handle],
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
      args: [targetEvaluation1.args.candidate, published.decryptionProof],
    });
  } catch (error) {
    if (!hasContractRevert(error, "InvalidProof")) throw error;
    crossHandleProofRejected = true;
  }
  if (!crossHandleProofRejected) {
    throw new Error("success proof unexpectedly validated against the first candidate");
  }

  const [targetEval1Receipt, controlEvalReceipt, targetTimeout1Receipt, controlTimeoutReceipt] =
    await Promise.all([
      publicClient.getTransactionReceipt({ hash: targetEvaluation1.transactionHash }),
      publicClient.getTransactionReceipt({ hash: controlEvaluation.transactionHash }),
      publicClient.getTransactionReceipt({ hash: targetReopened1.transactionHash }),
      publicClient.getTransactionReceipt({ hash: controlReopened.transactionHash }),
    ]);
  const sameQ1NormalizedEventShape =
    JSON.stringify(normalizedReceiptShape(targetEval1Receipt)) ===
    JSON.stringify(normalizedReceiptShape(controlEvalReceipt));
  const sameQ1NormalizedTimeoutShape =
    JSON.stringify(normalizedReceiptShape(targetTimeout1Receipt)) ===
    JSON.stringify(normalizedReceiptShape(controlTimeoutReceipt));
  if (!sameQ1NormalizedEventShape || !sameQ1NormalizedTimeoutShape) {
    throw new Error("recovered public event or timeout shapes differ");
  }

  const positionIds = setup.positionIds.map(BigInt);
  const [
    recipientSharesBefore,
    adapterSharesBefore,
    poolCollateralBefore,
    poolPositionsBefore,
    adapterCollateralBefore,
  ] = await Promise.all([
    conditionalTokens.read.balanceOf([deployer.address, positionIds[1]]),
    conditionalTokens.read.balanceOf([orderBookAddress, positionIds[1]]),
    collateral.read.balanceOf([setup.addresses.fpmm]),
    Promise.all(
      positionIds.map((positionId) =>
        conditionalTokens.read.balanceOf([setup.addresses.fpmm, positionId]),
      ),
    ),
    collateral.read.balanceOf([orderBookAddress]),
  ]);
  assertEqual(adapterCollateralBefore, ORDER_AMOUNT, "target escrow before finalization");

  let recoveryTopUpHash;
  let recoveryTopUpAmount = 0n;
  const moverBalance = await publicClient.getBalance({ address: mover.address });
  if (moverBalance < FINALIZER_TARGET_BALANCE) {
    recoveryTopUpAmount = FINALIZER_TARGET_BALANCE - moverBalance;
    recoveryTopUpHash = await deployerWallet.sendTransaction({
      to: mover.address,
      value: recoveryTopUpAmount,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: recoveryTopUpHash });
    if (receipt.status !== "success") throw new Error("recovery finalizer top-up failed");
  }
  const finalizeHash = await orderBook.write.finalize(
    [ORDER_ID, FINAL_NONCE, published.decryptionProof],
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
    buy.address.toLowerCase() !== setup.addresses.fpmm.toLowerCase()
  ) {
    throw new Error("combined fill event emitter mismatch");
  }

  const [
    recipientShares,
    adapterShares,
    status,
    allowance,
    escrow,
    storedOutcomeTokens,
    poolCollateralAfter,
    poolPositionsAfter,
  ] = await Promise.all([
    conditionalTokens.read.balanceOf([deployer.address, positionIds[1]]),
    conditionalTokens.read.balanceOf([orderBookAddress, positionIds[1]]),
    orderBook.read.statusOf([ORDER_ID]),
    collateral.read.allowance([orderBookAddress, setup.addresses.fpmm]),
    orderBook.read.escrowBalance(),
    orderBook.read.outcomeTokensOf([ORDER_ID]),
    collateral.read.balanceOf([setup.addresses.fpmm]),
    Promise.all(
      positionIds.map((positionId) =>
        conditionalTokens.read.balanceOf([setup.addresses.fpmm, positionId]),
      ),
    ),
  ]);
  const recipientDelta = recipientShares - recipientSharesBefore;
  const feeAmount = buy.args.feeAmount;
  const netInvestment = ORDER_AMOUNT - feeAmount;
  if (
    Number(status) !== STATUS.Filled ||
    fill.args.orderId !== ORDER_ID ||
    Number(fill.args.nonce) !== FINAL_NONCE ||
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
    await orderBook.simulate.finalize([ORDER_ID, FINAL_NONCE, published.decryptionProof], {
      account: mover,
    });
  } catch (error) {
    if (!hasContractRevert(error, "InvalidStatus")) throw error;
    replayRejected = true;
  }
  if (!replayRejected) throw new Error("finalization replay unexpectedly succeeded");

  const marketRawLogs = await publicClient.getLogs({
    address: setup.addresses.fpmm,
    fromBlock: orderBookDeploymentReceipt.blockNumber,
    toBlock: finalizeReceipt.blockNumber,
  });
  const marketEvents = parseEventLogs({
    abi: marketArtifact.abi,
    logs: marketRawLogs,
    strict: false,
  });
  const buys = marketEvents.filter((event) => event.eventName === "FPMMBuy");
  if (buys.length !== 3 || buys[2].transactionHash !== finalizeHash) {
    throw new Error(`expected two reserve moves plus the terminal buy, found ${buys.length}`);
  }

  const evidence = {
    generatedAt: new Date().toISOString(),
    verdict: "GO",
    chainId: sepolia.id,
    blockNumber: finalizeReceipt.blockNumber.toString(),
    recovery: {
      setupReused: true,
      initialSetupTransactionsAllSucceeded: true,
      firstInterruption:
        "local runner supplied a 20,000,000 gas limit above Sepolia's 16,777,216 cap; no order-book transaction was broadcast",
      secondInterruption:
        "the independent mover lacked the explicit 3,000,000-gas upfront reservation; publication and proof recovery had already succeeded",
      contractOrArchitectureFailure: false,
      initialFinalizerTopUp:
        "0xa3ef7583e1ff12d51e77c510a925a4f08aace93565c0ee1439de01df3e99c897",
      recoveryTopUp: recoveryTopUpHash,
      ownerGasFundingAfterTargetCreation: [
        {
          transactionHash:
            "0xa3ef7583e1ff12d51e77c510a925a4f08aace93565c0ee1439de01df3e99c897",
          value: "5000000000000000",
        },
        {
          transactionHash: recoveryTopUpHash,
          value: recoveryTopUpAmount.toString(),
        },
      ],
    },
    roles: {
      deployerOwnerRecipientAndInitialLiquidityProvider: deployer.address,
      fixedWorkerEvaluatorAndPublisher: setup.roles.worker,
      independentControlOwnerQuoteMoverAndPermissionlessRescuer: mover.address,
    },
    addresses: {
      noxCompute: NOX_COMPUTE,
      ...setup.addresses,
      orderBook: orderBookAddress,
    },
    questionId: setup.questionId,
    conditionId: setup.conditionId,
    positionIds: setup.positionIds,
    parameters: {
      amountIn: ORDER_AMOUNT.toString(),
      q1: q1.toString(),
      q2: q2.toString(),
      q3: q3.toString(),
      thresholdRevealedAtSuccess: threshold.toString(),
    },
    publicInferenceTrace: {
      observerUsedOnlyPublicRpcData: true,
      sameQ1NormalizedEventShape,
      sameQ1NormalizedTimeoutShape,
      firstFalse: {
        transactionHash: targetEvaluation1.transactionHash,
        blockNumber: targetEvaluation1.blockNumber.toString(),
        orderId: "1",
        nonce: 1,
        quote: q1.toString(),
        candidate: targetEvaluation1.args.candidate,
      },
      withheldEligible: {
        transactionHash: controlEvaluation.transactionHash,
        blockNumber: controlEvaluation.blockNumber.toString(),
        orderId: "2",
        nonce: 1,
        quote: q1.toString(),
        candidate: controlEvaluation.args.candidate,
      },
      secondFalse: {
        transactionHash: targetEvaluation2.transactionHash,
        blockNumber: targetEvaluation2.blockNumber.toString(),
        orderId: "1",
        nonce: 2,
        quote: q2.toString(),
        candidate: targetEvaluation2.args.candidate,
      },
      success: {
        transactionHash: targetEvaluation3.transactionHash,
        blockNumber: targetEvaluation3.blockNumber.toString(),
        orderId: "1",
        nonce: 3,
        quote: q3.toString(),
        candidate,
        publicationTransactionHash: publication.transactionHash,
      },
      interruptedRunnerAssertedPrivateResultsBeforePublication: {
        firstTargetCheck: "0",
        delayedEligibleControl: q1.toString(),
        secondTargetCheck: "0",
        successfulTargetCheckExactMinOut: threshold.toString(),
      },
      privateDecryptTimingsLostWhenTheProcessExitedBeforeFinalization: true,
      publicDecryptMs,
      earlierAndWithheldCandidatesStillPrivate: true,
      successfulCandidatePubliclyDecryptable: true,
      crossHandleProofRejected,
    },
    transactions: {
      ...setup.transactions,
      orderBook: orderBookDeploymentTransaction,
      approveTargetOrder:
        "0xaf88a3864c967e84fd25fc3ac38f2ab6f61c9e3ba94887ccbeffe958499fdb8e",
      approveControlOrder:
        "0x39b0a90bbc8baec1b345cbd5b222b1a037e4fb1d4d426e65581e8c911458de46",
      createTargetOrder: createdTarget.transactionHash,
      createDelayedEligibleControl: createdControl.transactionHash,
      requestTargetEvaluation1: targetEvaluation1.transactionHash,
      requestControlEvaluation: controlEvaluation.transactionHash,
      expireTargetEvaluation1: targetReopened1.transactionHash,
      expireControlEvaluation: controlReopened.transactionHash,
      cancelControl: controlCancelled.transactionHash,
      refundControl: controlRefunded.transactionHash,
      approveFirstReserveMove:
        "0xeafe8d0d7c03396223fad871f0ad6113e0b4f3d7b4768e69c27a7485e5c0a3fc",
      firstReserveMove: buys[0].transactionHash,
      requestTargetEvaluation2: targetEvaluation2.transactionHash,
      expireTargetEvaluation2: targetReopened2.transactionHash,
      approveSecondReserveMove:
        "0x167534b3c3d55ed2520faf7d76e561863461f23513739b4804116f421abe45ae",
      secondReserveMove: buys[1].transactionHash,
      requestTargetEvaluation3: targetEvaluation3.transactionHash,
      requestPublication: publication.transactionHash,
      initialFinalizerTopUp:
        "0xa3ef7583e1ff12d51e77c510a925a4f08aace93565c0ee1439de01df3e99c897",
      recoveryFinalizerTopUp: recoveryTopUpHash,
      finalize: finalizeHash,
    },
    result: {
      finalReceiptStatus: finalizeReceipt.status,
      finalizeGasUsed: finalizeReceipt.gasUsed.toString(),
      outcomeTokensBought: buy.args.outcomeTokensBought.toString(),
      outcomeTokensForwarded: fill.args.outcomeTokens.toString(),
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
      ownerAuthorizationRequiredAfterTargetCreation: false,
      ownerKeyUsedOnlyForFinalizerGasTopUpsAfterTargetCreation: true,
      independentNonOwnerFinalizer: mover.address,
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
