import type { BrowserContext } from "@playwright/test";
import {
  erc20Abi,
  noxLimitOrderBookAbi,
  type MarketSide,
} from "@noxlimit/protocol";
import {
  createWalletClient,
  decodeFunctionData,
  getAddress,
  http,
  isAddress,
  isHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const BINDING = "__noxlimitLiveWalletRequest";

type ProviderRequest = Readonly<{ method: string; params?: readonly unknown[] }>;
type BrowserTransaction = Readonly<Record<string, unknown> & {
  from?: unknown;
  to?: unknown;
  data?: unknown;
  value?: unknown;
}>;

export type RecordedWalletWrite = Readonly<{
  kind: "COLLATERAL_APPROVAL" | "ORDER_CREATE";
  destination: Address;
  transactionHash: Hex;
}>;

export type LiveWalletInput = Readonly<{
  privateKey: Hex;
  rpcUrl: string;
  fundingTreasury: Address;
  orderBook: Address;
  collateral: Address;
  side: MarketSide;
  amountAtoms: bigint;
  tradingClosesAt: string;
}>;

/**
 * A deliberately narrow live wallet. The private key remains captured by this Node-side object;
 * only the public address, signatures, and transaction hashes cross the Playwright binding. The
 * signer refuses every action except one configured funding claim, one exact approval, and one
 * exact order creation.
 */
export function createLiveSepoliaWallet(input: LiveWalletInput) {
  const account = privateKeyToAccount(input.privateKey);
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(input.rpcUrl) });
  const writes: RecordedWalletWrite[] = [];
  let fundingSigned = false;

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
      // The released Handle client extends the injected WalletClient with public actions to read
      // the registered Gateway signer. Forward that one read-only method to Sepolia; never proxy
      // signing methods or arbitrary wallet capabilities.
      case "eth_call":
        return forwardReadOnlyRpc(input.rpcUrl, providerRequest);
      case "eth_signTypedData_v4": {
        if (fundingSigned) throw refused("duplicate funding signature");
        const signer = providerRequest.params?.[0];
        const serialized = providerRequest.params?.[1];
        if (typeof signer !== "string" || !isAddress(signer) || getAddress(signer) !== account.address) throw refused("typed-data signer");
        if (typeof serialized !== "string") throw refused("typed-data payload");
        const typedData = parseFundingTypedData(serialized, input.fundingTreasury, account.address);
        fundingSigned = true;
        return account.signTypedData(typedData);
      }
      case "eth_sendTransaction": {
        const transaction = asRecord(providerRequest.params?.[0]) as BrowserTransaction;
        const authorized = authorizeTransaction(transaction, input, account.address, writes);
        const hash = await walletClient.sendTransaction({
          account,
          chain: sepolia,
          to: authorized.destination,
          data: authorized.data,
          value: 0n,
        });
        writes.push({ kind: authorized.kind, destination: authorized.destination, transactionHash: hash });
        return hash;
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
        request: (request: ProviderRequest) => bridge(request),
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
    writes: () => [...writes] as readonly RecordedWalletWrite[],
  };
}

function parseProviderRequest(raw: unknown): ProviderRequest {
  const value = asRecord(raw);
  if (typeof value.method !== "string") throw refused("malformed provider request");
  if (value.params !== undefined && !Array.isArray(value.params)) throw refused("malformed provider params");
  return { method: value.method, params: value.params as readonly unknown[] | undefined };
}

function authorizeTransaction(
  transaction: BrowserTransaction,
  input: LiveWalletInput,
  account: Address,
  writes: readonly RecordedWalletWrite[],
): Readonly<{ kind: RecordedWalletWrite["kind"]; destination: Address; data: Hex }> {
  if (typeof transaction.from !== "string" || !isAddress(transaction.from) || getAddress(transaction.from) !== account) throw refused("transaction sender");
  if (typeof transaction.to !== "string" || !isAddress(transaction.to)) throw refused("transaction destination");
  if (typeof transaction.data !== "string" || !isHex(transaction.data, { strict: true })) throw refused("transaction calldata");
  if (transaction.value !== undefined && toBigInt(transaction.value) !== 0n) throw refused("non-zero transaction value");
  const destination = getAddress(transaction.to);
  const data = transaction.data as Hex;

  if (destination === input.collateral) {
    if (writes.some((entry) => entry.kind === "COLLATERAL_APPROVAL")) throw refused("duplicate approval");
    const decoded = decodeFunctionData({ abi: erc20Abi, data });
    if (
      decoded.functionName !== "approve"
      || getAddress(decoded.args[0]) !== input.orderBook
      || decoded.args[1] !== input.amountAtoms
    ) throw refused("collateral approval");
    return { kind: "COLLATERAL_APPROVAL", destination, data };
  }

  if (destination === input.orderBook) {
    if (writes.some((entry) => entry.kind === "ORDER_CREATE")) throw refused("duplicate order creation");
    const decoded = decodeFunctionData({ abi: noxLimitOrderBookAbi, data });
    if (decoded.functionName !== "createOrder") throw refused("order creation");
    const args = decoded.args as readonly [Address, number, bigint, bigint, Hex, Hex];
    const expectedSide = input.side === "YES" ? 0 : 1;
    if (
      getAddress(args[0]) !== account
      || Number(args[1]) !== expectedSide
      || args[2] !== input.amountAtoms
      || args[3] <= BigInt(Math.floor(Date.now() / 1_000))
      || args[3] > BigInt(Math.floor(Date.parse(input.tradingClosesAt) / 1_000))
    ) throw refused("order creation");
    return { kind: "ORDER_CREATE", destination, data };
  }

  throw refused("unknown contract destination");
}

function parseFundingTypedData(serialized: string, treasury: Address, account: Address) {
  let raw: Record<string, unknown>;
  try { raw = asRecord(JSON.parse(serialized)); }
  catch { throw refused("funding typed data"); }
  const domain = asRecord(raw.domain);
  const message = asRecord(raw.message);
  const types = asRecord(raw.types);
  const fields = types.FundingClaim;
  if (
    raw.primaryType !== "FundingClaim"
    || domain.name !== "NoxLimit Testnet Funding"
    || domain.version !== "1"
    || toBigInt(domain.chainId) !== BigInt(sepolia.id)
    || typeof domain.verifyingContract !== "string"
    || !isAddress(domain.verifyingContract)
    || getAddress(domain.verifyingContract) !== treasury
    || typeof message.recipient !== "string"
    || !isAddress(message.recipient)
    || getAddress(message.recipient) !== account
    || !Array.isArray(fields)
    || JSON.stringify(fields) !== JSON.stringify([
      { name: "recipient", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint64" },
    ])
  ) throw refused("funding typed data");
  const nonce = toBigInt(message.nonce);
  const deadline = toBigInt(message.deadline);
  const now = BigInt(Math.floor(Date.now() / 1_000));
  if (nonce < 0n || deadline <= now || deadline > now + 600n) throw refused("funding deadline or nonce");
  return {
    domain: {
      name: "NoxLimit Testnet Funding",
      version: "1",
      chainId: sepolia.id,
      verifyingContract: treasury,
    },
    types: {
      FundingClaim: [
        { name: "recipient", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint64" },
      ],
    },
    primaryType: "FundingClaim" as const,
    message: { recipient: account, nonce, deadline },
  } as const;
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
  return Object.assign(new Error(`Live wallet refused ${action}.`), { code: 4_100 });
}

async function forwardReadOnlyRpc(rpcUrl: string, request: ProviderRequest): Promise<unknown> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: request.method, params: request.params ?? [] }),
  });
  if (!response.ok) throw refused("Sepolia read");
  const payload = await response.json() as { result?: unknown; error?: unknown };
  if (payload.error !== undefined || !("result" in payload)) throw refused("Sepolia read");
  return payload.result;
}
