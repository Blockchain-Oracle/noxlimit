import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createViemHandleClient,
  type Handle,
  type HandleClient,
} from "@iexec-nox/handle";
import {
  handleGatewayUrl,
  NOX_COMPUTE_ADDRESS,
  nox,
} from "@iexec-nox/nox-hardhat-plugin";

const STATUS = {
  Open: 1,
  Evaluating: 2,
  PublicationPending: 3,
  Finalized: 4,
  Cancelled: 5,
  Expired: 6,
  DisclosedRefundable: 7,
} as const;

const PUBLIC_ACL_ABI = [
  {
    type: "function",
    name: "isPubliclyDecryptable",
    stateMutability: "view",
    inputs: [{ name: "handle", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

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

async function deployFixture({
  quote = 50n,
  evaluationTimeout = 30n,
  publicationTimeout = 30n,
}: {
  quote?: bigint;
  evaluationTimeout?: bigint;
  publicationTimeout?: bigint;
} = {}) {
  const { viem, handleClient } = await nox.connect();
  const [owner, worker, rescuer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();
  const quoteSource = await viem.deployContract("MutableFixedInputQuote", [quote]);
  const harness = await viem.deployContract("NoxLimitHarness", [
    worker.account.address,
    quoteSource.address,
    10n,
    0n,
    evaluationTimeout,
    publicationTimeout,
  ]);
  // beta.13's Viem adapter reads getAddresses()[0] for ACL checks even when the
  // WalletClient has an explicit account. Hardhat wallet clients expose every
  // dev account, so scope this method to the fixed worker explicitly.
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
    owner,
    worker,
    rescuer,
    publicClient,
    testClient,
    handleClient,
    workerHandleClient,
    quoteSource,
    harness,
  };
}

async function createOrder(fixture: Fixture, minOut = 100n, lifetime = 3_600n) {
  const encrypted = await fixture.handleClient.encryptInput(
    minOut,
    "uint256",
    fixture.harness.address,
  );
  const block = await fixture.publicClient.getBlock();
  await fixture.harness.write.createOrder([
    encrypted.handle,
    encrypted.handleProof,
    block.timestamp + lifetime,
  ]);
  return encrypted;
}

async function workerWrite(
  fixture: Fixture,
  functionName: "requestEvaluation" | "requestPublication",
  args: readonly [bigint] | readonly [bigint, bigint],
) {
  return fixture.worker.writeContract({
    address: fixture.harness.address,
    abi: fixture.harness.abi,
    functionName,
    args,
  } as never);
}

async function privateDecrypt(client: HandleClient, handle: `0x${string}`) {
  return eventually(() => client.decrypt(handle as Handle<"uint256">));
}

async function publicDecrypt(client: HandleClient, handle: `0x${string}`) {
  return eventually(() => client.publicDecrypt(handle as Handle<"uint256">));
}

async function isPublic(fixture: Fixture, handle: `0x${string}`) {
  return fixture.publicClient.readContract({
    address: NOX_COMPUTE_ADDRESS,
    abi: PUBLIC_ACL_ABI,
    functionName: "isPubliclyDecryptable",
    args: [handle],
  });
}

describe("NoxLimit released Nox path", () => {
  it(
    "binds an encrypted threshold and makes identical-value evaluations nonce-distinct",
    { timeout: 120_000 },
    async () => {
      const f = await deployFixture();
      await createOrder(f);

      await workerWrite(f, "requestEvaluation", [1n]);
      const first = await f.harness.read.candidateOf([1n]);
      await f.testClient.increaseTime({ seconds: 31 });
      await f.testClient.mine({ blocks: 1 });
      await f.harness.write.expireEvaluation([1n]);
      await workerWrite(f, "requestEvaluation", [1n]);
      const second = await f.harness.read.candidateOf([1n]);

      assert.notEqual(first, second);
      assert.equal(
        (await f.harness.read.ownerOf([1n])).toLowerCase(),
        f.owner.account.address.toLowerCase(),
      );
    },
  );

  it(
    "keeps zero private, restricts publication, isolates ACLs and rejects an old proof",
    { timeout: 120_000 },
    async () => {
      const f = await deployFixture({ quote: 50n });
      await createOrder(f, 100n);
      await workerWrite(f, "requestEvaluation", [1n]);
      const first = await f.harness.read.candidateOf([1n]);

      assert.equal((await privateDecrypt(f.workerHandleClient, first)).value, 0n);
      await assert.rejects(() =>
        f.handleClient.decrypt(first as Handle<"uint256">),
      );
      assert.equal(await isPublic(f, first), false);
      await assert.rejects(() =>
        f.rescuer.writeContract({
          address: f.harness.address,
          abi: f.harness.abi,
          functionName: "requestPublication",
          args: [1n, 1n],
        }),
      );

      await workerWrite(f, "requestPublication", [1n, 1n]);
      assert.equal(await isPublic(f, first), true);
      const firstPublic = await publicDecrypt(f.handleClient, first);
      assert.equal(firstPublic.value, 0n);
      await f.rescuer.writeContract({
        address: f.harness.address,
        abi: f.harness.abi,
        functionName: "finalize",
        args: [1n, 1n, firstPublic.decryptionProof],
      });
      assert.equal(Number(await f.harness.read.statusOf([1n])), STATUS.Open);

      await workerWrite(f, "requestEvaluation", [1n]);
      const second = await f.harness.read.candidateOf([1n]);
      assert.notEqual(first, second);
      assert.equal(await isPublic(f, second), false);

      await workerWrite(f, "requestPublication", [1n, 2n]);
      await assert.rejects(() =>
        f.rescuer.writeContract({
          address: f.harness.address,
          abi: f.harness.abi,
          functionName: "finalize",
          args: [1n, 2n, firstPublic.decryptionProof],
        }),
      );
      const secondPublic = await publicDecrypt(f.handleClient, second);
      await f.rescuer.writeContract({
        address: f.harness.address,
        abi: f.harness.abi,
        functionName: "finalize",
        args: [1n, 2n, secondPublic.decryptionProof],
      });
      assert.equal(Number(await f.harness.read.statusOf([1n])), STATUS.Open);
    },
  );

  it(
    "lets a non-worker rescue a published nonzero proof exactly once",
    { timeout: 120_000 },
    async () => {
      const f = await deployFixture({ quote: 150n });
      await createOrder(f, 100n);
      await workerWrite(f, "requestEvaluation", [1n]);
      const candidate = await f.harness.read.candidateOf([1n]);

      assert.equal((await privateDecrypt(f.workerHandleClient, candidate)).value, 100n);
      await workerWrite(f, "requestPublication", [1n, 1n]);
      const published = await publicDecrypt(f.handleClient, candidate);
      await f.rescuer.writeContract({
        address: f.harness.address,
        abi: f.harness.abi,
        functionName: "finalize",
        args: [1n, 1n, published.decryptionProof],
      });

      assert.equal(Number(await f.harness.read.statusOf([1n])), STATUS.Finalized);
      assert.equal(await f.harness.read.authorizedMinOutOf([1n]), 100n);
      await assert.rejects(() =>
        f.rescuer.writeContract({
          address: f.harness.address,
          abi: f.harness.abi,
          functionName: "finalize",
          args: [1n, 1n, published.decryptionProof],
        }),
      );
    },
  );

  it(
    "rejects reused inputs and proofs bound to another application or order",
    { timeout: 120_000 },
    async () => {
      const f = await deployFixture({ quote: 150n });
      const encrypted = await createOrder(f, 100n);
      const block = await f.publicClient.getBlock();

      await assert.rejects(() =>
        f.harness.write.createOrder([
          encrypted.handle,
          encrypted.handleProof,
          block.timestamp + 3_600n,
        ]),
      );

      const wrongApplication = await f.handleClient.encryptInput(
        100n,
        "uint256",
        f.owner.account.address,
      );
      await assert.rejects(() =>
        f.harness.write.createOrder([
          wrongApplication.handle,
          wrongApplication.handleProof,
          block.timestamp + 3_600n,
        ]),
      );

      await createOrder(f, 110n);
      await workerWrite(f, "requestEvaluation", [1n]);
      await workerWrite(f, "requestPublication", [1n, 1n]);
      const firstCandidate = await f.harness.read.candidateOf([1n]);
      const firstProof = await publicDecrypt(f.handleClient, firstCandidate);

      await workerWrite(f, "requestEvaluation", [2n]);
      await workerWrite(f, "requestPublication", [2n, 1n]);
      await assert.rejects(() =>
        f.rescuer.writeContract({
          address: f.harness.address,
          abi: f.harness.abi,
          functionName: "finalize",
          args: [2n, 1n, firstProof.decryptionProof],
        }),
      );
    },
  );

  it(
    "reopens neutral evaluations and marks abandoned publication refund-eligible",
    { timeout: 120_000 },
    async () => {
      const f = await deployFixture({
        quote: 50n,
        evaluationTimeout: 10n,
        publicationTimeout: 10n,
      });
      await createOrder(f, 100n);
      await workerWrite(f, "requestEvaluation", [1n]);
      await f.testClient.increaseTime({ seconds: 11 });
      await f.testClient.mine({ blocks: 1 });
      await f.harness.write.expireEvaluation([1n]);
      assert.equal(Number(await f.harness.read.statusOf([1n])), STATUS.Open);

      await workerWrite(f, "requestEvaluation", [1n]);
      await workerWrite(f, "requestPublication", [1n, 2n]);
      await f.testClient.increaseTime({ seconds: 11 });
      await f.testClient.mine({ blocks: 1 });
      await f.harness.write.expirePublication([1n]);
      assert.equal(
        Number(await f.harness.read.statusOf([1n])),
        STATUS.DisclosedRefundable,
      );
    },
  );

  it(
    "rejects stale publication, late publication, and late finalization races",
    { timeout: 120_000 },
    async () => {
      const f = await deployFixture({
        quote: 50n,
        evaluationTimeout: 10n,
        publicationTimeout: 10n,
      });
      await createOrder(f, 100n);
      await workerWrite(f, "requestEvaluation", [1n]);
      await f.testClient.increaseTime({ seconds: 11 });
      await f.testClient.mine({ blocks: 1 });
      await assert.rejects(() => workerWrite(f, "requestPublication", [1n, 1n]));
      await f.harness.write.expireEvaluation([1n]);

      await workerWrite(f, "requestEvaluation", [1n]);
      await assert.rejects(() => workerWrite(f, "requestPublication", [1n, 1n]));
      await workerWrite(f, "requestPublication", [1n, 2n]);
      const candidate = await f.harness.read.candidateOf([1n]);
      const published = await publicDecrypt(f.handleClient, candidate);
      await f.testClient.increaseTime({ seconds: 11 });
      await f.testClient.mine({ blocks: 1 });
      await assert.rejects(() =>
        f.rescuer.writeContract({
          address: f.harness.address,
          abi: f.harness.abi,
          functionName: "finalize",
          args: [1n, 2n, published.decryptionProof],
        }),
      );
      await f.harness.write.expirePublication([1n]);
      assert.equal(
        Number(await f.harness.read.statusOf([1n])),
        STATUS.DisclosedRefundable,
      );
    },
  );

  it(
    "rejects a valid application proof submitted by the wrong owner",
    { timeout: 120_000 },
    async () => {
      const f = await deployFixture();
      const encrypted = await f.handleClient.encryptInput(
        100n,
        "uint256",
        f.harness.address,
      );
      const block = await f.publicClient.getBlock();
      await assert.rejects(() =>
        f.rescuer.writeContract({
          address: f.harness.address,
          abi: f.harness.abi,
          functionName: "createOrder",
          args: [encrypted.handle, encrypted.handleProof, block.timestamp + 3_600n],
        }),
      );
      await f.harness.write.createOrder([
        encrypted.handle,
        encrypted.handleProof,
        block.timestamp + 3_600n,
      ]);
      assert.equal(
        (await f.harness.read.ownerOf([1n])).toLowerCase(),
        f.owner.account.address.toLowerCase(),
      );
    },
  );

  it(
    "invalidates evaluation on owner cancellation and routes ordinary expiry separately",
    { timeout: 120_000 },
    async () => {
      const f = await deployFixture({ evaluationTimeout: 30n });
      await createOrder(f, 100n, 20n);
      await workerWrite(f, "requestEvaluation", [1n]);
      await assert.rejects(() =>
        f.rescuer.writeContract({
          address: f.harness.address,
          abi: f.harness.abi,
          functionName: "cancel",
          args: [1n],
        }),
      );
      await f.harness.write.cancel([1n]);
      assert.equal(Number(await f.harness.read.statusOf([1n])), STATUS.Cancelled);
      await assert.rejects(() => workerWrite(f, "requestPublication", [1n, 1n]));

      await createOrder(f, 100n, 5n);
      await f.testClient.increaseTime({ seconds: 6 });
      await f.testClient.mine({ blocks: 1 });
      await f.harness.write.expireOrder([2n]);
      assert.equal(Number(await f.harness.read.statusOf([2n])), STATUS.Expired);
    },
  );
});
