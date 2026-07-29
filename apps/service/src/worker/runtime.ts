import type { Hex } from "viem";

import { SerializedWriter } from "../tx/serialized-writer.js";
import {
  decideWorkerAction,
  type WorkerAction,
  type WorkerOrderSnapshot,
} from "./decision.js";

export type WorkerOrder = WorkerOrderSnapshot &
  Readonly<{
    key: string;
    chainId: 11_155_111;
    orderBook: `0x${string}`;
    orderId: bigint;
    nonce: number;
    candidate?: Hex;
  }>;

export interface WorkerOrderRepository {
  listActionable(): Promise<readonly WorkerOrder[]>;
  get(key: string): Promise<WorkerOrder | undefined>;
}

export interface WorkerChainActions {
  requestEvaluation(order: WorkerOrder): Promise<Hex>;
  requestPublication(order: WorkerOrder): Promise<Hex>;
  finalize(order: WorkerOrder, proof: Hex): Promise<Hex>;
  expireEvaluation(order: WorkerOrder): Promise<Hex>;
  expirePublication(order: WorkerOrder): Promise<Hex>;
  expireOrder(order: WorkerOrder): Promise<Hex>;
  waitForSuccess(transactionHash: Hex): Promise<void>;
}

export interface CandidateGateway {
  decrypt(candidate: Hex): Promise<bigint>;
  publicDecrypt(candidate: Hex): Promise<{ value: bigint; proof: Hex }>;
}

export type WorkerTick = Readonly<{
  orderKey: string;
  action: WorkerAction;
  transactionHash?: Hex;
  outcome: "NO_ACTION" | "MINED" | "INELIGIBLE" | "STALE" | "RETRYABLE_ERROR";
}>;

/// @notice One-replica orchestrator. Candidate plaintext is intentionally never returned or logged.
export class WorkerRuntime {
  readonly #orders: WorkerOrderRepository;
  readonly #chain: WorkerChainActions;
  readonly #gateway: CandidateGateway;
  readonly #writer: SerializedWriter;

  constructor(
    orders: WorkerOrderRepository,
    chain: WorkerChainActions,
    gateway: CandidateGateway,
    writer = new SerializedWriter(),
  ) {
    this.#orders = orders;
    this.#chain = chain;
    this.#gateway = gateway;
    this.#writer = writer;
  }

  async tick(): Promise<readonly WorkerTick[]> {
    const actionable = await this.#orders.listActionable();
    const results: WorkerTick[] = [];
    for (const order of actionable) {
      try {
        results.push(await this.#advance(order.key));
      } catch {
        // Isolate failures by order. The next reconciliation tick rereads authoritative chain
        // state and retries; neither Gateway errors nor transaction details enter the result.
        results.push({
          orderKey: order.key,
          action: decideWorkerAction(order),
          outcome: "RETRYABLE_ERROR",
        });
      }
    }
    return results;
  }

  async #advance(orderKey: string): Promise<WorkerTick> {
    const order = await this.#orders.get(orderKey);
    if (!order) return { orderKey, action: "NONE", outcome: "STALE" };
    const action = decideWorkerAction(order);
    if (action === "NONE") return { orderKey, action, outcome: "NO_ACTION" };

    if (action === "PRIVATE_DECRYPT") {
      if (!order.candidate) return { orderKey, action, outcome: "STALE" };
      const value = await this.#gateway.decrypt(order.candidate);
      if (value === 0n) return { orderKey, action, outcome: "INELIGIBLE" };
      return this.#submit(
        orderKey,
        action,
        (fresh) => this.#chain.requestPublication(fresh),
        order.candidate,
      );
    }

    if (action === "PUBLIC_DECRYPT_AND_FINALIZE") {
      if (!order.candidate) return { orderKey, action, outcome: "STALE" };
      const publication = await this.#gateway.publicDecrypt(order.candidate);
      // A zero publication is valid recovery input. The contract, not the worker, decides whether
      // it reopens or exhausts monitoring; the value itself is never emitted by this service.
      return this.#submit(
        orderKey,
        action,
        (fresh) => this.#chain.finalize(fresh, publication.proof),
        order.candidate,
      );
    }

    const submit = actionSubmitter(this.#chain, action);
    return this.#submit(orderKey, action, submit);
  }

  async #submit(
    orderKey: string,
    action: WorkerAction,
    submit: (fresh: WorkerOrder) => Promise<Hex>,
    expectedCandidate?: Hex,
  ): Promise<WorkerTick> {
    return this.#writer.enqueue(async () => {
      const fresh = await this.#orders.get(orderKey);
      if (
        !fresh ||
        decideWorkerAction(fresh) !== action ||
        (expectedCandidate !== undefined && fresh.candidate !== expectedCandidate)
      ) {
        return { orderKey, action, outcome: "STALE" } as const;
      }
      const transactionHash = await submit(fresh);
      await this.#chain.waitForSuccess(transactionHash);
      return { orderKey, action, transactionHash, outcome: "MINED" } as const;
    });
  }
}

function actionSubmitter(
  chain: WorkerChainActions,
  action: WorkerAction,
): (order: WorkerOrder) => Promise<Hex> {
  switch (action) {
    case "REQUEST_EVALUATION":
      return (order) => chain.requestEvaluation(order);
    case "RECOVER_EVALUATION":
      return (order) => chain.expireEvaluation(order);
    case "RECOVER_PUBLICATION":
      return (order) => chain.expirePublication(order);
    case "EXPIRE_ORDER":
      return (order) => chain.expireOrder(order);
    default:
      throw new Error(`no direct submitter for ${action}`);
  }
}
