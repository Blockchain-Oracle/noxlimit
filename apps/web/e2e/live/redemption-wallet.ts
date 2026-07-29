import type { BrowserContext } from "@playwright/test";
import {
  buildRedeemPositionsTransaction,
  buildResolveMarketTransaction,
} from "@noxlimit/protocol";
import {
  createWalletClient,
  getAddress,
  http,
  isAddress,
  isHex,
  keccak256,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import {
  verifyRedemptionPreparedTransaction,
  type LiveRedemptionJournal,
  type RedemptionActionKind,
  type RedemptionPreparedTransaction,
} from "./redemption-journal.ts";

const BINDING = "__noxlimitLiveRedemptionWalletRequest";
type ProviderRequest = Readonly<{ method: string; params?: readonly unknown[] }>;
type BrowserTransaction = Readonly<Record<string, unknown> & {
  from?: unknown;
  to?: unknown;
  data?: unknown;
  value?: unknown;
}>;

export type RecordedRedemptionWrite = Readonly<{
  kind: "MARKET_RESOLVE" | "POSITION_REDEEM";
  destination: Address;
  transactionHash: Hex;
}>;

export type LiveRedemptionWalletInput = Readonly<{
  privateKey: Hex;
  rpcUrl: string;
  resolver: Address;
  conditionalTokens: Address;
  collateral: Address;
  conditionId: Hex;
  selectedRoundId: bigint;
  predecessorRoundId: bigint;
  journal: LiveRedemptionJournal;
}>;

/**
 * A one-purpose signer for the final live product proof. It can submit exactly one configured
 * resolver call followed by exactly one configured CTF redemption. It rejects approvals, native
 * value, arbitrary destinations, alternate round evidence, duplicate calls, and redemption before
 * the resolution write.
 */
export function createLiveSepoliaRedemptionWallet(input: LiveRedemptionWalletInput) {
  const account = privateKeyToAccount(input.privateKey);
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(input.rpcUrl) });

  const request = async (raw: unknown): Promise<unknown> => {
    const providerRequest = parseProviderRequest(raw);
    switch (providerRequest.method) {
      case "eth_requestAccounts":
      case "eth_accounts":
        return [account.address];
      case "eth_chainId":
        return `0x${sepolia.id.toString(16)}`;
      case "wallet_requestPermissions":
        return [{ parentCapability: "eth_accounts" }];
      case "wallet_switchEthereumChain": {
        const requested = asRecord(providerRequest.params?.[0]);
        if (requested.chainId !== `0x${sepolia.id.toString(16)}`) throw refused("network switch");
        return null;
      }
      case "eth_call":
        return forwardReadOnlyRpc(input.rpcUrl, providerRequest);
      case "eth_sendTransaction": {
        const transaction = asRecord(providerRequest.params?.[0]) as BrowserTransaction;
        const authorized = authorizeTransaction(transaction, input, account.address);
        const journalKind = actionKind(authorized.kind);
        input.journal.assertCanReserve(journalKind);
        const current = input.journal.snapshot().actions[journalKind];
        let prepared: RedemptionPreparedTransaction | undefined = current.state === "RETRY_READY"
          ? undefined
          : await prepareSignedTransaction().catch(() => {
              throw refused("Sepolia transaction preparation");
            });
        prepared = await input.journal.reserve(journalKind, prepared);
        await verifyRedemptionPreparedTransaction(prepared, account.address);
        let hash: Hex;
        try {
          hash = await walletClient.sendRawTransaction({
            serializedTransaction: prepared.serializedTransaction,
          });
        } catch {
          throw refused("Sepolia transaction submission; the journal requires explicit recovery");
        }
        if (hash !== prepared.transactionHash) {
          throw refused("Sepolia transaction hash mismatch; the journal requires explicit recovery");
        }
        try {
          await input.journal.recordSubmitted(journalKind, hash);
        } catch {
          throw refused("transaction journal persistence; explicit recovery is required");
        }
        return hash;

        async function prepareSignedTransaction() {
          const request = await walletClient.prepareTransactionRequest({
            account,
            chain: sepolia,
            to: authorized.destination,
            data: authorized.data,
            value: 0n,
          });
          const serializedTransaction = await walletClient.signTransaction(request);
          return {
            transactionHash: keccak256(serializedTransaction),
            nonce: request.nonce.toString(),
            serializedTransaction,
            destination: authorized.destination,
            calldata: authorized.data,
          } as const;
        }
      }
      default:
        throw refused(`method ${providerRequest.method}`);
    }
  };

  const install = async (context: BrowserContext) => {
    await context.exposeBinding(BINDING, (_source, providerRequest: unknown) => request(providerRequest));
    await context.addInitScript(({ address, binding }) => {
      type Listener = (...args: unknown[]) => void;
      type Bridge = (request: ProviderRequest) => Promise<unknown>;
      const listeners = new Map<string, Set<Listener>>();
      const bridge = (window as unknown as Record<string, Bridge>)[binding]!;
      const provider = {
        isMetaMask: true,
        request: (providerRequest: ProviderRequest) => bridge(providerRequest),
        on(event: string, listener: Listener) {
          const current = listeners.get(event) ?? new Set<Listener>();
          current.add(listener);
          listeners.set(event, current);
          return provider;
        },
        removeListener(event: string, listener: Listener) {
          listeners.get(event)?.delete(listener);
          return provider;
        },
        selectedAddress: address,
        chainId: "0xaa36a7",
      };
      Object.defineProperty(window, "ethereum", { configurable: true, value: provider });
    }, { address: account.address, binding: BINDING });
  };

  return {
    address: account.address,
    install,
    writes: () => writesFromJournal(input),
  };
}

function authorizeTransaction(
  transaction: BrowserTransaction,
  input: LiveRedemptionWalletInput,
  account: Address,
): Readonly<{ kind: RecordedRedemptionWrite["kind"]; destination: Address; data: Hex }> {
  if (typeof transaction.from !== "string" || !isAddress(transaction.from) || getAddress(transaction.from) !== account) throw refused("transaction sender");
  if (typeof transaction.to !== "string" || !isAddress(transaction.to)) throw refused("transaction destination");
  if (typeof transaction.data !== "string" || !isHex(transaction.data, { strict: true })) throw refused("transaction calldata");
  if (transaction.value !== undefined && toBigInt(transaction.value) !== 0n) throw refused("non-zero transaction value");
  const destination = getAddress(transaction.to);
  const data = transaction.data as Hex;

  const expectedResolution = buildResolveMarketTransaction({
    resolver: input.resolver,
    selectedRoundId: input.selectedRoundId,
    predecessorRoundId: input.predecessorRoundId,
  });
  if (destination === getAddress(expectedResolution.to)) {
    if (data.toLowerCase() !== expectedResolution.data.toLowerCase()) throw refused("resolution evidence");
    return { kind: "MARKET_RESOLVE", destination, data };
  }

  const expectedRedemption = buildRedeemPositionsTransaction({
    conditionalTokens: input.conditionalTokens,
    collateral: input.collateral,
    conditionId: input.conditionId,
  });
  if (destination === getAddress(expectedRedemption.to)) {
    if (data.toLowerCase() !== expectedRedemption.data.toLowerCase()) throw refused("redemption calldata");
    return { kind: "POSITION_REDEEM", destination, data };
  }

  throw refused("unknown contract destination");
}

function actionKind(kind: RecordedRedemptionWrite["kind"]): RedemptionActionKind {
  return kind === "MARKET_RESOLVE" ? "resolution" : "redemption";
}

function writesFromJournal(input: LiveRedemptionWalletInput): readonly RecordedRedemptionWrite[] {
  const snapshot = input.journal.snapshot();
  const writes: RecordedRedemptionWrite[] = [];
  if (snapshot.actions.resolution.transactionHash) {
    writes.push({
      kind: "MARKET_RESOLVE",
      destination: input.resolver,
      transactionHash: snapshot.actions.resolution.transactionHash,
    });
  }
  if (snapshot.actions.redemption.transactionHash) {
    writes.push({
      kind: "POSITION_REDEEM",
      destination: input.conditionalTokens,
      transactionHash: snapshot.actions.redemption.transactionHash,
    });
  }
  return writes;
}

function parseProviderRequest(raw: unknown): ProviderRequest {
  const value = asRecord(raw);
  if (typeof value.method !== "string") throw refused("malformed provider request");
  if (value.params !== undefined && !Array.isArray(value.params)) throw refused("malformed provider params");
  return { method: value.method, params: value.params as readonly unknown[] | undefined };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw refused("malformed request");
  return value as Record<string, unknown>;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && (/^[0-9]+$/.test(value) || /^0x[0-9a-fA-F]+$/.test(value))) return BigInt(value);
  throw refused("numeric value");
}

function refused(action: string): Error {
  return Object.assign(new Error(`Live redemption wallet refused ${action}.`), { code: 4_100 });
}

async function forwardReadOnlyRpc(rpcUrl: string, request: ProviderRequest): Promise<unknown> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: request.method, params: request.params ?? [] }),
    });
    if (!response.ok) throw refused("Sepolia read");
    const payload = await response.json() as { result?: unknown; error?: unknown };
    if (payload.error !== undefined || !("result" in payload)) throw refused("Sepolia read");
    return payload.result;
  } catch {
    throw refused("Sepolia read");
  }
}
