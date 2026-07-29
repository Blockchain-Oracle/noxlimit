import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { Address, Hash, TransactionReceipt } from "viem";

import {
  deploymentPlanHash,
  openDeploymentJournal,
  parseDeploymentRecoveryJson,
  type JsonObject,
  type OpenDeploymentJournalInput,
} from "../scripts/operator/deployment-journal.js";
import {
  deploymentStepManifest,
  runJournaledDeploymentStep,
} from "../scripts/operator/deployment-runner.js";
import { ETHEREUM_SEPOLIA_CHAIN_ID } from "../scripts/operator/lib.js";

function address(digit: string): Address {
  return `0x${digit.repeat(40)}` as Address;
}

function hash(digit: string): Hash {
  return `0x${digit.repeat(64)}` as Hash;
}

const EXPECTED_STEPS = [
  "deployCollateral",
  "deployResolver",
  "deployOrderBook",
] as const;

const PLAN: JsonObject = {
  schemaVersion: 1,
  deploymentPlanId: hash("a"),
  marketId: hash("b"),
  steps: EXPECTED_STEPS,
};

const FUNDING_PLAN: JsonObject = {
  schemaVersion: 1,
  operatorNativeTopUpWei: "30000000000000000",
  collateralMintAtoms: "250000000",
  poolSeedAtoms: "50000000",
  treasuryNativeTopUpWei: "100000000000000000",
};

function inputFor(
  root: string,
  overrides: Partial<OpenDeploymentJournalInput> = {},
): OpenDeploymentJournalInput {
  return {
    journalPath: join(root, "deployment-journal.json"),
    plan: PLAN,
    operator: address("1"),
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    catalogOutputPath: join(root, "catalog.json"),
    evidenceOutputPath: join(root, "evidence.json"),
    fundingPlan: FUNDING_PLAN,
    expectedSteps: EXPECTED_STEPS,
    ...overrides,
  };
}

function resumeInput(
  input: OpenDeploymentJournalInput,
): OpenDeploymentJournalInput {
  const {
    fundingPlan: _frozenAtCreation,
    expectedSteps: _frozenAtCreationToo,
    ...resume
  } = input;
  return resume;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function isAbsent(path: string): Promise<boolean> {
  try {
    await access(path);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT";
  }
}

async function withTemporaryRoot(
  run: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "noxlimit-deployment-journal-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("deployment journal", () => {
  it("creates the journal before any deployment write and freezes its binding and funding plan", async () => {
    await withTemporaryRoot(async (root) => {
      const input = inputFor(root);
      const journal = await openDeploymentJournal(input);
      const snapshot = journal.snapshot();

      assert.equal(await isAbsent(input.journalPath), false);
      assert.equal(await isAbsent(input.catalogOutputPath), true);
      assert.equal(await isAbsent(input.evidenceOutputPath), true);
      assert.equal(snapshot.state, "IN_PROGRESS");
      assert.equal(snapshot.revision, "0");
      assert.equal(snapshot.binding.planHash, deploymentPlanHash(PLAN));
      assert.equal(snapshot.binding.operator, address("1"));
      assert.equal(snapshot.binding.chainId, ETHEREUM_SEPOLIA_CHAIN_ID);
      assert.equal(snapshot.binding.catalogOutputPath, input.catalogOutputPath);
      assert.equal(snapshot.binding.evidenceOutputPath, input.evidenceOutputPath);
      assert.deepEqual(snapshot.fundingPlan, FUNDING_PLAN);
      assert.deepEqual(snapshot.expectedSteps, EXPECTED_STEPS);
      assert.deepEqual(snapshot.steps, {});

      const persisted = await readJson(input.journalPath);
      assert.deepEqual(persisted, snapshot);
      assert.equal(JSON.stringify(persisted).includes("privateKey"), false);
    });
  });

  it("requires funding on creation, but resumes from the frozen plan without recomputing it", async () => {
    await withTemporaryRoot(async (root) => {
      const input = inputFor(root);
      await assert.rejects(
        openDeploymentJournal(resumeInput(input)),
        /funding plan is required when creating a fresh journal/,
      );
      const { expectedSteps: _missingManifest, ...missingManifest } = input;
      await assert.rejects(
        openDeploymentJournal(missingManifest),
        /expected steps are required when creating a fresh journal/,
      );

      const created = await openDeploymentJournal(input);
      const frozenFunding = created.snapshot().fundingPlan;
      const resumed = await openDeploymentJournal(resumeInput(input));
      assert.deepEqual(resumed.snapshot().fundingPlan, frozenFunding);

      await assert.rejects(
        openDeploymentJournal({
          ...input,
          fundingPlan: { ...FUNDING_PLAN, poolSeedAtoms: "50000001" },
        }),
        /funding plan mismatch/,
      );
      await assert.rejects(
        openDeploymentJournal({
          ...input,
          expectedSteps: ["deployCollateral", "deployOrderBook"],
        }),
        /expected step manifest mismatch/,
      );
    });
  });

  it("rejects plan, operator, chain, and output-path binding drift on resume", async () => {
    await withTemporaryRoot(async (root) => {
      const input = inputFor(root);
      await openDeploymentJournal(input);

      await assert.rejects(
        openDeploymentJournal({
          ...input,
          plan: { ...PLAN, marketId: hash("c") },
        }),
        /binding mismatch/,
      );
      await assert.rejects(
        openDeploymentJournal({ ...input, operator: address("2") }),
        /binding mismatch/,
      );
      await assert.rejects(
        openDeploymentJournal({ ...input, chainId: 1 }),
        /chainId must be Ethereum Sepolia/,
      );
      await assert.rejects(
        openDeploymentJournal({
          ...input,
          catalogOutputPath: join(root, "other-catalog.json"),
        }),
        /binding mismatch/,
      );
    });
  });

  it("allows only one pre-opened operator instance to persist a submission intent", async () => {
    await withTemporaryRoot(async (root) => {
      const input = inputFor(root);
      const first = await openDeploymentJournal(input);
      const second = await openDeploymentJournal(resumeInput(input));
      const results = await Promise.allSettled([
        first.prepareStep("deployCollateral"),
        second.prepareStep("deployCollateral"),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");
      assert.equal(fulfilled.length, 1);
      assert.equal(rejected.length, 1);
      assert.match(
        String((rejected[0] as PromiseRejectedResult).reason),
        /locked by another operator process|changed outside this operator process/,
      );
      const persisted = await readJson(input.journalPath) as {
        steps: Record<string, {
          state: string;
          attempt: number;
          intentAt: string;
          recoveries: unknown[];
        }>;
      };
      assert.equal(persisted.steps.deployCollateral?.state, "INTENT");
      assert.equal(persisted.steps.deployCollateral?.attempt, 1);
      assert.match(persisted.steps.deployCollateral?.intentAt ?? "", /^\d{4}-\d{2}-\d{2}T/);
      assert.deepEqual(persisted.steps.deployCollateral?.recoveries, []);
      assert.equal(await isAbsent(`${input.journalPath}.lock`), true);
    });
  });

  it("resumes submitted and confirmed transactions without sending a replacement", async () => {
    await withTemporaryRoot(async (root) => {
      const input = inputFor(root);
      const first = await openDeploymentJournal(input);
      assert.deepEqual(await first.prepareStep("deployCollateral"), {
        action: "SUBMIT",
        attempt: 1,
      });
      await first.recordSubmitted("deployCollateral", hash("1"));

      const submitted = await openDeploymentJournal(resumeInput(input));
      assert.deepEqual(await submitted.prepareStep("deployCollateral"), {
        action: "RESUME_SUBMITTED",
        attempt: 1,
        transactionHash: hash("1"),
      });
      await submitted.recordConfirmed("deployCollateral", {
        transactionHash: hash("1"),
        blockNumber: 1234n,
        blockHash: hash("2"),
        contractAddress: address("3"),
        result: { deployedCodeHash: hash("4") },
      });

      const confirmed = await openDeploymentJournal(resumeInput(input));
      const disposition = await confirmed.prepareStep("deployCollateral");
      assert.equal(disposition.action, "RESUME_CONFIRMED");
      if (disposition.action !== "RESUME_CONFIRMED") return;
      assert.equal(disposition.transactionHash, hash("1"));
      assert.equal(disposition.confirmation.blockNumber, "1234");
      assert.equal(disposition.confirmation.contractAddress, address("3"));
      assert.deepEqual(disposition.confirmation.result, { deployedCodeHash: hash("4") });
    });
  });

  it("fails closed on a bare intent and requires an explicit per-step ADOPT or RETRY", async () => {
    await withTemporaryRoot(async (root) => {
      const input = inputFor(root);
      const initial = await openDeploymentJournal(input);
      await initial.prepareStep("deployCollateral");

      const unresolved = await openDeploymentJournal(resumeInput(input));
      await assert.rejects(
        unresolved.prepareStep("deployCollateral"),
        /unresolved INTENT.*provide explicit ADOPT or RETRY/,
      );

      const adopted = await openDeploymentJournal({
        ...resumeInput(input),
        recoveryJson: JSON.stringify({
          deployCollateral: {
            action: "ADOPT",
            expectedAttempt: 1,
            transactionHash: hash("5"),
          },
        }),
      });
      assert.deepEqual(await adopted.prepareStep("deployCollateral"), {
        action: "RESUME_SUBMITTED",
        attempt: 1,
        transactionHash: hash("5"),
      });
      assert.deepEqual(adopted.snapshot().steps.deployCollateral?.recoveries, [
        {
          action: "ADOPT",
          expectedAttempt: 1,
          transactionHash: hash("5"),
          recordedAt: adopted.snapshot().steps.deployCollateral?.recoveries[0]?.recordedAt,
        },
      ]);

      await adopted.recordConfirmed("deployCollateral", {
        transactionHash: hash("5"),
        blockNumber: 99n,
      });
      await adopted.prepareStep("deployResolver");
      const retried = await openDeploymentJournal({
        ...resumeInput(input),
        recoveryJson: JSON.stringify({
          deployResolver: { action: "RETRY", expectedAttempt: 1 },
        }),
      });
      assert.deepEqual(await retried.prepareStep("deployResolver"), {
        action: "SUBMIT",
        attempt: 2,
      });
      const retryStep = retried.snapshot().steps.deployResolver;
      assert.equal(retryStep?.state, "INTENT");
      assert.equal(retryStep?.attempt, 2);
      assert.equal(retryStep?.recoveries.at(-1)?.action, "RETRY");
      await assert.rejects(
        retried.prepareStep("deployResolver"),
        /recovery expected attempt 1, but current attempt is 2/,
      );
      await assert.rejects(
        openDeploymentJournal({
          ...resumeInput(input),
          recoveryJson: JSON.stringify({
            deployResolver: { action: "RETRY", expectedAttempt: 1 },
          }),
        }),
        /expected attempt 1, but current attempt is 2/,
      );
    });
  });

  it("rejects submitted and confirmation hash mismatches", async () => {
    await withTemporaryRoot(async (root) => {
      const journal = await openDeploymentJournal(inputFor(root));
      await journal.prepareStep("deployCollateral");
      await journal.recordSubmitted("deployCollateral", hash("6"));

      await assert.rejects(
        journal.recordSubmitted("deployCollateral", hash("7")),
        /transaction hash mismatch/,
      );
      await assert.rejects(
        journal.recordConfirmed("deployCollateral", {
          transactionHash: hash("7"),
          blockNumber: 100n,
        }),
        /confirmation hash mismatch/,
      );

      await journal.recordConfirmed("deployCollateral", {
        transactionHash: hash("6"),
        blockNumber: 100n,
      });
      await assert.rejects(
        journal.recordConfirmed("deployCollateral", {
          transactionHash: hash("6"),
          blockNumber: 101n,
        }),
        /confirmation payload mismatch/,
      );
    });
  });

  it("cannot stage final outputs while an expected deployment step is missing", async () => {
    await withTemporaryRoot(async (root) => {
      const journal = await openDeploymentJournal(inputFor(root));
      await journal.prepareStep("deployCollateral");
      await journal.recordSubmitted("deployCollateral", hash("c"));
      await journal.recordConfirmed("deployCollateral", {
        transactionHash: hash("c"),
        blockNumber: 150n,
      });

      await assert.rejects(
        journal.prepareStep("deployOrderBook"),
        /cannot start before expected step deployResolver is CONFIRMED/,
      );
      await assert.rejects(
        journal.stageFinalPayloads({
          catalog: { schemaVersion: 1 },
          evidence: { schemaVersion: 1 },
        }),
        /expected deployment step deployResolver must be CONFIRMED before outputs/,
      );
      assert.equal(journal.snapshot().state, "IN_PROGRESS");
    });
  });

  it("stages final payloads durably before create-only outputs and reaches COMPLETE atomically", async () => {
    await withTemporaryRoot(async (root) => {
      const input = inputFor(root, { expectedSteps: ["deployCollateral"] });
      const journal = await openDeploymentJournal(input);
      await journal.prepareStep("deployCollateral");
      await journal.recordSubmitted("deployCollateral", hash("8"));
      await journal.recordConfirmed("deployCollateral", {
        transactionHash: hash("8"),
        blockNumber: 200n,
      });

      const catalog: JsonObject = {
        schemaVersion: 1,
        revision: "btc-usd-1h-v1",
        marketIds: [hash("9")],
      };
      const evidence: JsonObject = {
        schemaVersion: 1,
        chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
        transactions: [{ step: "deployCollateral", transactionHash: hash("8") }],
      };
      await journal.stageFinalPayloads({ catalog, evidence });

      assert.equal(await isAbsent(input.catalogOutputPath), true);
      assert.equal(await isAbsent(input.evidenceOutputPath), true);
      const stagedOnDisk = await readJson(input.journalPath) as {
        state: string;
        finalPayloads: { catalog: unknown; evidence: unknown };
      };
      assert.equal(stagedOnDisk.state, "OUTPUTS_STAGED");
      assert.deepEqual(stagedOnDisk.finalPayloads.catalog, catalog);
      assert.deepEqual(stagedOnDisk.finalPayloads.evidence, evidence);

      // Simulate a crash after the create-only evidence write but before its journal flag update.
      await writeFile(input.evidenceOutputPath, `${JSON.stringify(evidence, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      const resumed = await openDeploymentJournal(resumeInput(input));
      const published = await resumed.publishFinalOutputs();
      assert.deepEqual(published, {
        catalogPath: input.catalogOutputPath,
        evidencePath: input.evidenceOutputPath,
        state: "COMPLETE",
      });
      assert.deepEqual(await readJson(input.evidenceOutputPath), evidence);
      assert.deepEqual(await readJson(input.catalogOutputPath), catalog);
      assert.equal(resumed.snapshot().state, "COMPLETE");
      assert.equal(resumed.snapshot().finalPayloads?.evidencePublished, true);
      assert.equal(resumed.snapshot().finalPayloads?.catalogPublished, true);

      assert.deepEqual(await resumed.publishFinalOutputs(), published);
      const reopened = await openDeploymentJournal(resumeInput(input));
      assert.equal(reopened.snapshot().state, "COMPLETE");
    });
  });

  it("strictly validates recovery and refuses to persist secret-bearing payloads", async () => {
    assert.throws(
      () => parseDeploymentRecoveryJson(JSON.stringify({
        deployCollateral: { action: "RETRY", expectedAttempt: 1, hash: hash("1") },
      })),
      /unsupported fields: hash/,
    );
    assert.throws(
      () => parseDeploymentRecoveryJson(JSON.stringify({
        deployCollateral: { action: "ADOPT", expectedAttempt: 1 },
      })),
      /missing transactionHash/,
    );

    await withTemporaryRoot(async (root) => {
      const secretInput = inputFor(root, {
        fundingPlan: { ...FUNDING_PLAN, operatorPrivateKeyBackup: hash("f") },
      });
      await assert.rejects(
        openDeploymentJournal(secretInput),
        /forbidden secret field operatorPrivateKeyBackup/,
      );
      assert.equal(await isAbsent(secretInput.journalPath), true);

      const journal = await openDeploymentJournal(inputFor(root));
      await journal.prepareStep("deployCollateral");
      await journal.recordSubmitted("deployCollateral", hash("a"));
      await journal.recordConfirmed("deployCollateral", {
        transactionHash: hash("a"),
        blockNumber: 300n,
      });
      await assert.rejects(
        journal.stageFinalPayloads({
          catalog: { schemaVersion: 1 },
          evidence: { nested: { walletSecretBackup: hash("b") } },
        }),
        /forbidden secret field walletSecretBackup/,
      );
      assert.equal(journal.snapshot().state, "IN_PROGRESS");
    });
  });
});

describe("complete deployment orchestration rehearsal", () => {
  it("freezes the exact first-bundle and shared-substrate transaction order", () => {
    assert.deepEqual(
      deploymentStepManifest({
        deployCollateral: true,
        mintCollateral: true,
        deployFundingTreasury: true,
        topUpFundingCollateral: true,
        topUpFundingNative: true,
      }),
      [
        "collateralDeployment",
        "settlementAdapterDeployment",
        "resolverDeployment",
        "prepareCondition",
        "fpmmCreation",
        "operatorCollateralMint",
        "fpmmSeedApproval",
        "fpmmSeed",
        "orderBookDeployment",
        "fundingTreasuryDeployment",
        "fundingTreasuryCollateralTopUp",
        "fundingTreasuryNativeTopUp",
      ],
    );
    assert.deepEqual(
      deploymentStepManifest({
        deployCollateral: false,
        mintCollateral: false,
        deployFundingTreasury: false,
        topUpFundingCollateral: false,
        topUpFundingNative: false,
      }),
      [
        "settlementAdapterDeployment",
        "resolverDeployment",
        "prepareCondition",
        "fpmmCreation",
        "fpmmSeedApproval",
        "fpmmSeed",
        "orderBookDeployment",
      ],
    );
  });

  it("restarts the exact full bundle after a submitted transaction without duplicating any write", async () => {
    await withTemporaryRoot(async (root) => {
      const operator = address("1");
      const expectedSteps = deploymentStepManifest({
        deployCollateral: true,
        mintCollateral: true,
        deployFundingTreasury: true,
        topUpFundingCollateral: true,
        topUpFundingNative: true,
      });
      const input = inputFor(root, { expectedSteps });
      let journal = await openDeploymentJournal(input);
      const transactionByStep = new Map<string, Hash>();
      const stepByTransaction = new Map<Hash, string>();
      const submissionCount = new Map<string, number>();
      const receiptAttempts = new Map<Hash, number>();

      function transactionFor(stepId: string): Hash {
        const existing = transactionByStep.get(stepId);
        if (existing) return existing;
        const transactionHash = `0x${(transactionByStep.size + 1).toString(16).padStart(64, "0")}` as Hash;
        transactionByStep.set(stepId, transactionHash);
        stepByTransaction.set(transactionHash, stepId);
        return transactionHash;
      }

      const client = {
        async waitForTransactionReceipt({ hash: transactionHash }: { hash: Hash }) {
          const attempts = (receiptAttempts.get(transactionHash) ?? 0) + 1;
          receiptAttempts.set(transactionHash, attempts);
          const stepId = stepByTransaction.get(transactionHash);
          if (stepId === "resolverDeployment" && attempts === 1) {
            throw new Error("simulated process exit after SUBMITTED");
          }
          const ordinal = [...transactionByStep.values()].indexOf(transactionHash) + 1;
          return {
            transactionHash,
            blockNumber: BigInt(10_000 + ordinal),
            blockHash: `0x${(20_000 + ordinal).toString(16).padStart(64, "0")}` as Hash,
            contractAddress: null,
            status: "success",
            logs: [],
          } as unknown as TransactionReceipt;
        },
        async getTransaction(_input: { hash: Hash }) {
          return { from: operator };
        },
      };

      async function runStep(stepId: string): Promise<void> {
        await runJournaledDeploymentStep({
          journal,
          client,
          operator,
          confirmations: 2,
          stepId,
          label: stepId,
          submit: async () => {
            submissionCount.set(stepId, (submissionCount.get(stepId) ?? 0) + 1);
            return transactionFor(stepId);
          },
        });
      }

      for (const stepId of expectedSteps) {
        if (stepId === "resolverDeployment") {
          await assert.rejects(runStep(stepId), /simulated process exit after SUBMITTED/);
          const persisted = journal.snapshot().steps[stepId];
          assert.equal(persisted?.state, "SUBMITTED");
          journal = await openDeploymentJournal(resumeInput(input));
        }
        await runStep(stepId);
      }

      assert.equal(
        expectedSteps.every((stepId) => journal.snapshot().steps[stepId]?.state === "CONFIRMED"),
        true,
      );
      for (const stepId of expectedSteps) assert.equal(submissionCount.get(stepId), 1);

      // Rehearse a second complete process invocation before output publication. Every transaction
      // must be recovered from CONFIRMED and checked against chain receipts, never resubmitted.
      journal = await openDeploymentJournal(resumeInput(input));
      for (const stepId of expectedSteps) await runStep(stepId);
      for (const stepId of expectedSteps) assert.equal(submissionCount.get(stepId), 1);

      const catalog = { schemaVersion: 1, revision: "1" } as const;
      const evidence = {
        schemaVersion: 1,
        transactions: Object.fromEntries(transactionByStep),
      } as const;
      await journal.stageFinalPayloads({ catalog, evidence });
      await journal.publishFinalOutputs();

      const complete = await openDeploymentJournal(resumeInput(input));
      assert.equal(complete.snapshot().state, "COMPLETE");
      assert.deepEqual(complete.snapshot().expectedSteps, expectedSteps);
      assert.deepEqual(await readJson(input.catalogOutputPath), catalog);
      assert.deepEqual(await readJson(input.evidenceOutputPath), evidence);
      for (const stepId of expectedSteps) assert.equal(submissionCount.get(stepId), 1);
    });
  });
});
