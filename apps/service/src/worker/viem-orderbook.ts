import { noxLimitOrderBookAbi, SOLIDITY_ORDER_STATUS } from "@noxlimit/protocol";
import {
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  zeroHash,
} from "viem";

import type {
  WorkerChainActions,
  WorkerOrder,
  WorkerOrderRepository,
} from "./runtime.js";

export type OrderBookTarget = Readonly<{
  chainId: 11_155_111;
  address: Address;
}>;

/**
 * Reconstruct actionable order state from contract getters. This deliberately treats chain state
 * as authoritative; a process restart needs no private database or browser session.
 */
export class ViemOrderRepository implements WorkerOrderRepository {
  readonly #client: PublicClient;
  readonly #targets: readonly OrderBookTarget[];

  constructor(client: PublicClient, targets: readonly OrderBookTarget[]) {
    this.#client = client;
    this.#targets = [...targets];
  }

  async listActionable(): Promise<readonly WorkerOrder[]> {
    const orders: WorkerOrder[] = [];
    for (const target of this.#targets) {
      const nextOrderId = await this.#client.readContract({
        address: target.address,
        abi: noxLimitOrderBookAbi,
        functionName: "nextOrderId",
      });
      for (let orderId = 1n; orderId < nextOrderId; orderId += 1n) {
        const order = await this.#read(target, orderId);
        if (order && !isTerminal(order.state)) orders.push(order);
      }
    }
    return orders;
  }

  async get(key: string): Promise<WorkerOrder | undefined> {
    const parsed = parseWorkerOrderKey(key);
    const target = this.#targets.find(
      (item) => item.chainId === parsed.chainId && item.address.toLowerCase() === parsed.orderBook.toLowerCase(),
    );
    return target ? this.#read(target, parsed.orderId) : undefined;
  }

  async #read(target: OrderBookTarget, orderId: bigint): Promise<WorkerOrder | undefined> {
    const block = await this.#client.getBlock({ blockTag: "latest" });
    const [
      status,
      expiresAt,
      tradingClosesAt,
      phaseDeadline,
      lastEvaluationAt,
      minimumEvaluationInterval,
      remainingEvaluations,
      nonce,
      candidate,
    ] = await Promise.all([
      this.#client.readContract({ address: target.address, abi: noxLimitOrderBookAbi, functionName: "statusOf", args: [orderId], blockNumber: block.number }),
      this.#client.readContract({ address: target.address, abi: noxLimitOrderBookAbi, functionName: "expiryOf", args: [orderId], blockNumber: block.number }),
      this.#client.readContract({ address: target.address, abi: noxLimitOrderBookAbi, functionName: "tradingClosesAt", blockNumber: block.number }),
      this.#client.readContract({ address: target.address, abi: noxLimitOrderBookAbi, functionName: "phaseDeadlineOf", args: [orderId], blockNumber: block.number }),
      this.#client.readContract({ address: target.address, abi: noxLimitOrderBookAbi, functionName: "lastEvaluationAtOf", args: [orderId], blockNumber: block.number }),
      this.#client.readContract({ address: target.address, abi: noxLimitOrderBookAbi, functionName: "minimumEvaluationInterval", blockNumber: block.number }),
      this.#client.readContract({ address: target.address, abi: noxLimitOrderBookAbi, functionName: "remainingEvaluations", args: [orderId], blockNumber: block.number }),
      this.#client.readContract({ address: target.address, abi: noxLimitOrderBookAbi, functionName: "nonceOf", args: [orderId], blockNumber: block.number }),
      this.#client.readContract({ address: target.address, abi: noxLimitOrderBookAbi, functionName: "candidateOf", args: [orderId], blockNumber: block.number }),
    ]);
    if (Number(status) === SOLIDITY_ORDER_STATUS.None) return undefined;
    return {
      key: workerOrderKey(target.chainId, target.address, orderId),
      chainId: target.chainId,
      orderBook: target.address,
      orderId,
      state: workerState(Number(status)),
      now: block.timestamp,
      expiresAt: BigInt(expiresAt),
      tradingClosesAt: BigInt(tradingClosesAt),
      phaseDeadline: BigInt(phaseDeadline),
      remainingEvaluations: Number(remainingEvaluations),
      nextEvaluationAt: BigInt(lastEvaluationAt) === 0n
        ? 0n
        : BigInt(lastEvaluationAt) + BigInt(minimumEvaluationInterval),
      nonce: Number(nonce),
      ...(candidate !== zeroHash ? { candidate } : {}),
    };
  }
}

export class ViemWorkerChainActions implements WorkerChainActions {
  readonly #publicClient: PublicClient;
  readonly #walletClient: WalletClient;

  constructor(publicClient: PublicClient, walletClient: WalletClient) {
    if (!walletClient.account) throw new Error("worker wallet account is required");
    this.#publicClient = publicClient;
    this.#walletClient = walletClient;
  }

  requestEvaluation(order: WorkerOrder): Promise<Hex> {
    return this.#write(order, "requestEvaluation", [order.orderId]);
  }

  requestPublication(order: WorkerOrder): Promise<Hex> {
    return this.#write(order, "requestPublication", [order.orderId, order.nonce]);
  }

  finalize(order: WorkerOrder, proof: Hex): Promise<Hex> {
    return this.#write(order, "finalize", [order.orderId, order.nonce, proof]);
  }

  expireEvaluation(order: WorkerOrder): Promise<Hex> {
    return this.#write(order, "expireEvaluation", [order.orderId]);
  }

  expirePublication(order: WorkerOrder): Promise<Hex> {
    return this.#write(order, "expirePublication", [order.orderId]);
  }

  expireOrder(order: WorkerOrder): Promise<Hex> {
    return this.#write(order, "expireOrder", [order.orderId]);
  }

  async waitForSuccess(transactionHash: Hex): Promise<void> {
    const receipt = await this.#publicClient.waitForTransactionReceipt({ hash: transactionHash });
    if (receipt.status !== "success") throw new Error(`worker transaction reverted: ${transactionHash}`);
  }

  async #write(
    order: WorkerOrder,
    functionName:
      | "requestEvaluation"
      | "requestPublication"
      | "finalize"
      | "expireEvaluation"
      | "expirePublication"
      | "expireOrder",
    args: readonly unknown[],
  ): Promise<Hex> {
    return this.#walletClient.writeContract({
      address: order.orderBook,
      abi: noxLimitOrderBookAbi,
      functionName,
      args,
      account: this.#walletClient.account!,
      chain: this.#walletClient.chain,
    } as never);
  }
}

export function workerOrderKey(chainId: number, orderBook: Address, orderId: bigint): string {
  return `${chainId}:${orderBook.toLowerCase()}:${orderId}`;
}

function parseWorkerOrderKey(key: string): {
  chainId: 11_155_111;
  orderBook: Address;
  orderId: bigint;
} {
  const [chain, orderBook, orderId, extra] = key.split(":");
  if (extra !== undefined || chain !== "11155111" || !/^0x[0-9a-fA-F]{40}$/.test(orderBook ?? "")) {
    throw new Error("invalid worker order key");
  }
  if (!/^(0|[1-9][0-9]*)$/.test(orderId ?? "")) throw new Error("invalid worker order id");
  return { chainId: 11_155_111, orderBook: orderBook as Address, orderId: BigInt(orderId!) };
}

function workerState(status: number): WorkerOrder["state"] {
  switch (status) {
    case SOLIDITY_ORDER_STATUS.Open: return "RESTING_PRIVATE";
    case SOLIDITY_ORDER_STATUS.Evaluating: return "EVALUATING";
    case SOLIDITY_ORDER_STATUS.PublicationPending:
    case SOLIDITY_ORDER_STATUS.Executing: return "PUBLICATION_PENDING";
    case SOLIDITY_ORDER_STATUS.Filled: return "FILLED";
    case SOLIDITY_ORDER_STATUS.Cancelled: return "CANCELLED";
    case SOLIDITY_ORDER_STATUS.Expired: return "EXPIRED";
    case SOLIDITY_ORDER_STATUS.DisclosedRefundable: return "DISCLOSED_REFUNDABLE";
    case SOLIDITY_ORDER_STATUS.Refunded: return "REFUNDED";
    default: throw new Error(`unknown OrderBook status ${status}`);
  }
}

function isTerminal(state: WorkerOrder["state"]): boolean {
  return state === "FILLED" || state === "CANCELLED" || state === "EXPIRED" ||
    state === "DISCLOSED_REFUNDABLE" || state === "REFUNDED";
}
