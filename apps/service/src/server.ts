import { createViemHandleClient } from "@iexec-nox/handle";
import type { CatalogManifest } from "@noxlimit/catalog";
import { healthViewSchema, type HealthView } from "@noxlimit/protocol";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { createApp } from "./api/app.js";
import type { FundingCoordinator } from "./api/ports.js";
import { loadCatalogManifest } from "./catalog/load.js";
import { verifyCatalogOnchain } from "./catalog/onchain-verifier.js";
import {
  buildCatalogProjectionRuntime,
  type CatalogProjectionRuntime,
} from "./catalog/projection-runtime.js";
import {
  CatalogReloadController,
  installCatalogReloadSignal,
} from "./catalog/reload-controller.js";
import {
  loadCatalogReloadPointer,
  resolveStartupCatalogPath,
} from "./catalog/reload-pointer.js";
import { assertStagedCatalogRuntimeAcceptable } from "./catalog/runtime-acceptance.js";
import { loadConfig } from "./config/env.js";
import { OnchainFundingCoordinator } from "./funding/coordinator.js";
import { FundingUnavailable } from "./funding/unavailable.js";
import {
  EvaluatorReadinessProbe,
  SEPOLIA_NOX_GATEWAY_URL,
} from "./nox/evaluator-readiness.js";
import { HandleCandidateGateway } from "./nox/handle-candidate-gateway.js";
import { safeErrorSummary } from "./observability/redaction.js";
import { SerializedWriter } from "./tx/serialized-writer.js";
import { WorkerRuntime } from "./worker/runtime.js";
import {
  ViemOrderRepository,
  ViemWorkerChainActions,
} from "./worker/viem-orderbook.js";

const config = loadConfig();
const publicClient = createPublicClient({ chain: sepolia, transport: http(config.SEPOLIA_RPC_URL) });
const typedPublicClient = publicClient as PublicClient;
const evaluatorConfigured = config.WORKER_PRIVATE_KEY !== undefined;
const writer = new SerializedWriter();
let funding: FundingCoordinator = new FundingUnavailable();
let fundingReady = false;
let candidateGateway: HandleCandidateGateway | undefined;
let workerActions: ViemWorkerChainActions | undefined;
let workerAddress: Address | undefined;
let evaluatorInitializationDetail = evaluatorConfigured
  ? "Evaluator readiness has not yet been verified."
  : "Worker credentials are not configured.";

if (config.WORKER_PRIVATE_KEY) {
  const account = privateKeyToAccount(config.WORKER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(config.SEPOLIA_RPC_URL),
  });
  workerAddress = account.address;
  workerActions = new ViemWorkerChainActions(typedPublicClient, walletClient);
  if (config.FUNDING_TREASURY_ADDRESS) {
    funding = new OnchainFundingCoordinator({
      publicClient: typedPublicClient,
      walletClient,
      treasury: config.FUNDING_TREASURY_ADDRESS,
      writer,
    });
    fundingReady = true;
  }

  const gatewayUrl = config.NOX_GATEWAY_URL ?? SEPOLIA_NOX_GATEWAY_URL;
  try {
    const handleClient = await createViemHandleClient(walletClient, {
      ...(config.NOX_COMPUTE_ADDRESS ? { smartContractAddress: config.NOX_COMPUTE_ADDRESS } : {}),
      gatewayUrl: gatewayUrl as `http://${string}` | `https://${string}`,
      ...(config.NOX_SUBGRAPH_URL
        ? { subgraphUrl: config.NOX_SUBGRAPH_URL as `http://${string}` | `https://${string}` }
        : {}),
    });
    candidateGateway = new HandleCandidateGateway(handleClient);
    evaluatorInitializationDetail = "Evaluator readiness has not yet been verified.";
  } catch {
    evaluatorInitializationDetail = "Nox evaluator initialization failed.";
  }
}

type ServiceCatalogRuntime = CatalogProjectionRuntime & {
  evaluatorState: { ready: boolean };
  evaluatorReady: boolean;
  evaluatorDetail?: string;
  worker?: WorkerRuntime;
  evaluatorProbe?: EvaluatorReadinessProbe;
  lastSafeBlock: bigint;
  lastSuccessfulAt?: string;
};

const buildRuntime = async (manifest: CatalogManifest): Promise<ServiceCatalogRuntime> => {
  const head = await typedPublicClient.getBlockNumber();
  const safeBlock = head > 6n ? head - 6n : 0n;
  const evaluatorState: { ready: boolean } = { ready: false };
  const initialHealth = healthFor({
    manifest,
    head,
    safeBlock,
    evaluatorReady: false,
    evaluatorDetail: evaluatorInitializationDetail,
    status: "STARTING",
  });
  const projection = await buildCatalogProjectionRuntime({
    client: typedPublicClient,
    manifest,
    initialHealth,
    evaluatorAvailable: () => evaluatorState.ready,
    ...(candidateGateway
      ? {
          publishedValueResolver: {
            publicValue: (candidate: `0x${string}`) =>
              candidateGateway!.publicDecrypt(candidate).then((result) => result.value),
          },
        }
      : {}),
  });
  const targets = manifest.markets.map((record) => ({
    chainId: 11_155_111 as const,
    address: record.contracts.orderBook,
  }));
  const worker = candidateGateway && workerActions
    ? new WorkerRuntime(
        new ViemOrderRepository(typedPublicClient, targets),
        workerActions,
        candidateGateway,
        writer,
      )
    : undefined;
  const gatewayUrl = config.NOX_GATEWAY_URL ?? SEPOLIA_NOX_GATEWAY_URL;
  const evaluatorProbe = workerAddress
    ? new EvaluatorReadinessProbe({
        client: typedPublicClient,
        worker: workerAddress,
        orderBooks: targets.map((target) => target.address),
        gatewayUrl,
      })
    : undefined;
  const readiness = evaluatorProbe
    ? await evaluatorProbe.check(projection.safeBlock)
    : { ready: false, detail: evaluatorInitializationDetail };
  evaluatorState.ready = readiness.ready;
  projection.store.replaceMarkets(
    manifest.catalogRevision,
    await projection.marketReader.hydrateAll(projection.safeBlock),
  );
  const lastSuccessfulAt = new Date().toISOString();
  projection.store.setHealth(healthFor({
    manifest,
    head,
    safeBlock: projection.safeBlock,
    evaluatorReady: readiness.ready,
    evaluatorDetail: readiness.detail,
    lastSuccessfulAt,
    status: readiness.ready ? "READY" : "DEGRADED",
  }));
  return {
    ...projection,
    evaluatorState,
    evaluatorReady: readiness.ready,
    ...(readiness.detail ? { evaluatorDetail: readiness.detail } : {}),
    ...(worker ? { worker } : {}),
    ...(evaluatorProbe ? { evaluatorProbe } : {}),
    lastSafeBlock: projection.safeBlock,
    lastSuccessfulAt,
  };
};

const initialCatalogPath = await resolveStartupCatalogPath(
  config.CATALOG_MANIFEST_PATH,
  config.CATALOG_RELOAD_POINTER_PATH,
);
const initialManifest = await loadCatalogManifest(initialCatalogPath);
await verifyCatalogOnchain(initialManifest, typedPublicClient);
const initialRuntime = await buildRuntime(initialManifest);
await assertStagedCatalogRuntimeAcceptable(initialRuntime);
const catalogs = new CatalogReloadController<ServiceCatalogRuntime>(initialRuntime, {
  load: loadCatalogManifest,
  verify: (manifest) => verifyCatalogOnchain(manifest, typedPublicClient),
  build: buildRuntime,
  acceptStaged: assertStagedCatalogRuntimeAcceptable,
});
const app = createApp({
  readModel: catalogs.readModel,
  funding,
  webOrigin: config.WEB_ORIGIN,
  logger: config.LOG_LEVEL !== "silent",
});

let polling = false;
const poll = async (): Promise<void> => {
  if (polling) return;
  polling = true;
  try {
    await catalogs.withActive(async (runtime) => {
      const result = await runtime.replay.poll();
      const currentHead = await typedPublicClient.getBlockNumber();
      if (runtime.evaluatorProbe) {
        const readiness = await runtime.evaluatorProbe.check(result.safeBlock);
        runtime.evaluatorState.ready = readiness.ready;
        runtime.evaluatorReady = readiness.ready;
        runtime.evaluatorDetail = readiness.detail;
      }
      runtime.store.replaceMarkets(
        runtime.manifest.catalogRevision,
        await runtime.marketReader.hydrateAll(result.safeBlock),
      );
      const workerTicks = runtime.worker && runtime.evaluatorReady
        ? await runtime.worker.tick()
        : [];
      const retryableOrderCount = workerTicks.filter(
        (tick) => tick.outcome === "RETRYABLE_ERROR",
      ).length;
      if (retryableOrderCount > 0) {
        app.log.warn({ retryableOrderCount }, "evaluator orders will retry on the next tick");
      }
      runtime.lastSafeBlock = result.safeBlock;
      runtime.lastSuccessfulAt = new Date().toISOString();
      runtime.store.setHealth(healthFor({
        manifest: runtime.manifest,
        head: currentHead,
        safeBlock: result.safeBlock,
        evaluatorReady: runtime.evaluatorReady,
        evaluatorDetail: retryableOrderCount > 0
          ? "Evaluator order retries are pending."
          : runtime.evaluatorDetail,
        lastSuccessfulAt: runtime.lastSuccessfulAt,
        status: runtime.evaluatorReady && retryableOrderCount === 0 ? "READY" : "DEGRADED",
      }));
    });
  } catch (error) {
    app.log.error({ error: safeErrorSummary(error) }, "background reconciliation failed");
    const runtime = catalogs.active;
    const currentHead = await typedPublicClient.getBlockNumber().catch(() => runtime.lastSafeBlock);
    runtime.store.setHealth(healthFor({
      manifest: runtime.manifest,
      head: currentHead,
      safeBlock: runtime.lastSafeBlock,
      evaluatorReady: runtime.evaluatorReady,
      evaluatorDetail: "Background reconciliation failed; retrying.",
      lastSuccessfulAt: runtime.lastSuccessfulAt,
      status: "DEGRADED",
    }));
  } finally {
    polling = false;
  }
};

const removeReloadSignal = installCatalogReloadSignal(
  async () => {
    if (!config.CATALOG_RELOAD_POINTER_PATH) {
      throw new Error("CATALOG_RELOAD_POINTER_PATH is not configured");
    }
    const candidatePath = await loadCatalogReloadPointer(config.CATALOG_RELOAD_POINTER_PATH);
    return catalogs.reload(candidatePath);
  },
  {
    onComplete: (result) => app.log.info({
      changed: result.changed,
      previousRevision: result.previousRevision,
      catalogRevision: result.catalogRevision,
    }, "catalog reload completed"),
    onError: (error) => app.log.error(
      { error: safeErrorSummary(error) },
      "catalog reload rejected; previous revision remains active",
    ),
  },
);

const timer = setInterval(() => void poll(), config.POLL_INTERVAL_MS);
timer.unref();

const shutdown = async (signal: string): Promise<void> => {
  clearInterval(timer);
  removeReloadSignal();
  app.log.info({ signal }, "shutting down");
  await catalogs.withActive(async () => undefined);
  await writer.idle();
  await app.close();
};
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ host: config.HOST, port: config.PORT });

function healthFor(input: {
  manifest: CatalogManifest;
  head: bigint;
  safeBlock: bigint;
  evaluatorReady: boolean;
  evaluatorDetail?: string;
  lastSuccessfulAt?: string;
  status: "READY" | "DEGRADED" | "STARTING";
}): HealthView {
  const asOf = new Date().toISOString();
  return healthViewSchema.parse({
    status: input.status,
    chainId: 11_155_111,
    catalogRevision: input.manifest.catalogRevision,
    headBlock: input.head.toString(),
    safeBlock: input.safeBlock.toString(),
    indexerLagBlocks: (
      input.head > input.safeBlock ? input.head - input.safeBlock : 0n
    ).toString(),
    evaluator: {
      status: input.evaluatorReady && !input.evaluatorDetail
        ? "READY"
        : evaluatorConfigured
          ? "DEGRADED"
          : "UNAVAILABLE",
      ...(input.lastSuccessfulAt && input.evaluatorReady
        ? { lastSuccessfulAt: input.lastSuccessfulAt }
        : {}),
      ...(input.evaluatorDetail ? { detail: input.evaluatorDetail } : {}),
    },
    funding: {
      status: fundingReady ? "READY" : "UNAVAILABLE",
      ...(input.lastSuccessfulAt && fundingReady
        ? { lastSuccessfulAt: input.lastSuccessfulAt }
        : {}),
      ...(!fundingReady
        ? { detail: "Funding treasury or relay credentials are not configured." }
        : {}),
    },
    asOf,
  });
}
