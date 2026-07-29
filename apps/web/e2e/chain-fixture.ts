import type { Page, Request, Route } from "@playwright/test";
import {
  erc20Abi,
  fixedProductMarketMakerAbi,
  noxLimitOrderBookAbi,
} from "@noxlimit/protocol";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  parseAbi,
  toFunctionSelector,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const FIXTURE_ACCOUNT = `0x${"7".repeat(40)}` as Address;
export const FIXTURE_ORDER_BOOK = `0x${"3".repeat(40)}` as Address;
export const FIXTURE_FPMM = `0x${"2".repeat(40)}` as Address;
export const FIXTURE_RESOLVER = `0x${"1".repeat(40)}` as Address;
export const FIXTURE_COLLATERAL = `0x${"8".repeat(40)}` as Address;
export const FIXTURE_CONDITIONAL_TOKENS = `0x${"9".repeat(40)}` as Address;
export const FIXTURE_ADAPTER = `0x${"a".repeat(40)}` as Address;
export const FIXTURE_FEED = `0x${"b".repeat(40)}` as Address;
export const FIXTURE_HANDLE = `0x0000aa36a72300${"ab".repeat(25)}` as Hex;
export const FIXTURE_HANDLE_PROOF = `0x${"cd".repeat(137)}` as Hex;

export const TX_APPROVAL = `0x${"8".repeat(64)}` as Hex;
export const TX_CREATE = `0x${"9".repeat(64)}` as Hex;
export const TX_REFUND = `0x${"6".repeat(64)}` as Hex;
export const TX_RESOLVE = `0x${"5".repeat(64)}` as Hex;
export const TX_REDEEM = `0x${"4".repeat(64)}` as Hex;

const gatewayAccount = privateKeyToAccount(`0x${"11".repeat(32)}`);
export const FIXTURE_GATEWAY_ADDRESS = gatewayAccount.address;

const resolverEvidenceAbi = parseAbi([
  "function settlementAdapter() view returns (address)",
  "function resolvesAt() view returns (uint64)",
  "function maximumObservationDelay() view returns (uint64)",
  "function resolved() view returns (bool)",
  "function resolvedYes() view returns (bool)",
  "function settlementPriceWad() view returns (int256)",
  "function settlementObservedAt() view returns (uint64)",
  "function settlementRoundId() view returns (uint80)",
  "function predecessorRoundId() view returns (uint80)",
]);

const adapterEvidenceAbi = parseAbi([
  "function feed() view returns (address)",
  "function feedDecimals() view returns (uint8)",
]);

const chainlinkEvidenceAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)",
  "function getRoundData(uint80 roundId) view returns (uint80 id,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)",
]);

const multicall3Abi = parseAbi([
  "function aggregate3((address target,bool allowFailure,bytes callData)[] calls) payable returns ((bool success,bytes returnData)[] returnData)",
  "function getEthBalance(address account) view returns (uint256 balance)",
]);

const MULTICALL3 = "0xca11bde05977b3631167028862be2a173976ca11";

type RpcFixtureOptions = Readonly<{
  resolution?: "READY" | "RESOLVED";
  allowance?: bigint;
  withholdReceipts?: readonly Hex[];
}>;

type JsonRpcRequest = Readonly<{
  id: number | string;
  jsonrpc: "2.0";
  method: string;
  params?: readonly unknown[];
}>;

export type WalletTransaction = Readonly<{
  from?: Address;
  to?: Address;
  data?: Hex;
  value?: Hex;
}>;

declare global {
  interface Window {
    __noxlimitWalletTransactions?: WalletTransaction[];
  }
}

export async function installInjectedSepoliaWallet(page: Page, transactionHashes: readonly Hex[], options: { rejectTransactionAt?: number } = {}) {
  const gatewayResult = encodeAbiParameters([{ type: "address" }], [FIXTURE_GATEWAY_ADDRESS]);
  await page.addInitScript(({ account, gateway, hashes, rejectTransactionAt }) => {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const stateKey = "__noxlimit_test_wallet_state__";
    let memoryState: { transactionIndex: number; transactions: WalletTransaction[] } = {
      transactionIndex: 0,
      transactions: [],
    };
    const readState = () => {
      try {
        const persisted = sessionStorage.getItem(stateKey);
        if (persisted) memoryState = JSON.parse(persisted) as typeof memoryState;
      } catch {
        // about:blank and opaque origins cannot expose sessionStorage. The in-memory
        // fallback still makes the injected provider deterministic for that document.
      }
      return memoryState;
    };
    const persistState = () => {
      try { sessionStorage.setItem(stateKey, JSON.stringify(memoryState)); } catch { /* See readState. */ }
      window.__noxlimitWalletTransactions = memoryState.transactions;
    };
    readState();
    persistState();
    const provider = {
      isMetaMask: true,
      async request({ method, params }: { method: string; params?: readonly unknown[] }) {
        if (method === "eth_requestAccounts" || method === "eth_accounts") return [account];
        if (method === "eth_chainId") return "0xaa36a7";
        if (method === "wallet_switchEthereumChain") return null;
        if (method === "wallet_requestPermissions") return [{ parentCapability: "eth_accounts" }];
        if (method === "eth_call") return gateway;
        if (method === "eth_sendTransaction") {
          const transaction = (params?.[0] ?? {}) as WalletTransaction;
          const state = readState();
          if (state.transactionIndex === rejectTransactionAt) throw Object.assign(new Error("User rejected the wallet transaction."), { code: 4001 });
          state.transactions.push(transaction);
          const hash = hashes[state.transactionIndex];
          state.transactionIndex += 1;
          persistState();
          if (!hash) throw Object.assign(new Error("No deterministic transaction hash remains in the test wallet."), { code: -32000 });
          return hash;
        }
        throw Object.assign(new Error(`Unsupported test wallet method: ${method}`), { code: 4200 });
      },
      on(event: string, listener: (...args: unknown[]) => void) {
        const current = listeners.get(event) ?? new Set();
        current.add(listener);
        listeners.set(event, current);
      },
      removeListener(event: string, listener: (...args: unknown[]) => void) {
        listeners.get(event)?.delete(listener);
      },
    };
    (window as unknown as { ethereum: typeof provider }).ethereum = provider;
  }, { account: FIXTURE_ACCOUNT, gateway: gatewayResult, hashes: transactionHashes, rejectTransactionAt: options.rejectTransactionAt });
}

export async function walletTransactions(page: Page): Promise<readonly WalletTransaction[]> {
  return page.evaluate(() => window.__noxlimitWalletTransactions ?? []);
}

export async function installGatewayFixture(page: Page) {
  const requests: Array<{ url: string; method: string; body: string }> = [];
  await page.route("https://gateway-testnets.noxprotocol.dev/**", async (route: Route, request: Request) => {
    requests.push({ url: request.url(), method: request.method(), body: request.postData() ?? "" });
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: gatewayCorsHeaders() });
      return;
    }
    const url = new URL(request.url());
    if (request.method() !== "POST" || url.pathname !== "/v0/secrets") {
      await route.fulfill({ status: 404, contentType: "application/json", headers: gatewayCorsHeaders(), body: JSON.stringify({ error: "NOT_FOUND" }) });
      return;
    }
    const salt = url.searchParams.get("salt") as Hex | null;
    if (!salt) throw new Error("The released Handle SDK did not bind the Gateway request to a salt.");
    const payload = { handle: FIXTURE_HANDLE, proof: FIXTURE_HANDLE_PROOF };
    const signature = await gatewayAccount.signTypedData({
      domain: { name: "Handle Gateway", version: "1", chainId: 11_155_111, salt },
      types: {
        HandleWithProof: [
          { name: "handle", type: "string" },
          { name: "proof", type: "string" },
        ],
      },
      primaryType: "HandleWithProof",
      message: payload,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: gatewayCorsHeaders(),
      body: JSON.stringify({ payload, signature }),
    });
  });
  return requests;
}

function gatewayCorsHeaders() {
  return {
    "access-control-allow-origin": "http://127.0.0.1:4173",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

export async function installRpcFixture(page: Page, options: RpcFixtureOptions = {}) {
  const requests: JsonRpcRequest[] = [];
  const withheldReceipts = new Set((options.withholdReceipts ?? []).map((hash) => hash.toLowerCase()));
  await page.route("http://127.0.0.1:4174/rpc", async (route, request) => {
    const input = request.postDataJSON() as JsonRpcRequest | JsonRpcRequest[];
    const batch = Array.isArray(input) ? input : [input];
    requests.push(...batch);
    const output = batch.map((entry) => {
      try {
        return { jsonrpc: "2.0" as const, id: entry.id, result: rpcResult(entry, options, withheldReceipts) };
      } catch (reason) {
        return { jsonrpc: "2.0" as const, id: entry.id, error: { code: -32000, message: reason instanceof Error ? reason.message : "Unsupported fixture RPC request" } };
      }
    });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(Array.isArray(input) ? output : output[0]) });
  });
  return {
    requests,
    releaseReceipt(hash: Hex) { withheldReceipts.delete(hash.toLowerCase()); },
  };
}

function rpcResult(request: JsonRpcRequest, options: RpcFixtureOptions, withheldReceipts: ReadonlySet<string>): unknown {
  if (request.method === "eth_chainId") return "0xaa36a7";
  if (request.method === "eth_blockNumber") return "0x79";
  if (request.method === "eth_getBalance") return toHex(20_000_000_000_000_000n);
  if (request.method === "eth_getTransactionReceipt") {
    const hash = request.params?.[0] as Hex;
    return withheldReceipts.has(hash.toLowerCase()) ? null : transactionReceipt(hash);
  }
  if (request.method === "eth_getBlockByNumber") return fixtureBlock();
  if (request.method === "eth_call") {
    const call = (request.params?.[0] ?? {}) as { to?: Address; data?: Hex };
    return contractRead(call, options);
  }
  throw new Error(`Unsupported fixture RPC method: ${request.method}`);
}

function contractRead(call: { to?: Address; data?: Hex }, options: RpcFixtureOptions): Hex {
  const to = call.to?.toLowerCase();
  const data = call.data;
  if (!to || !data) throw new Error("Fixture eth_call requires to and data.");
  const selector = data.slice(0, 10);

  if (to === MULTICALL3 && selector === toFunctionSelector("getEthBalance(address)")) {
    return encodeFunctionResult({ abi: multicall3Abi, functionName: "getEthBalance", result: 20_000_000_000_000_000n });
  }

  if (to === MULTICALL3 && selector === toFunctionSelector("aggregate3((address,bool,bytes)[])")) {
    const decoded = decodeFunctionData({ abi: multicall3Abi, data });
    const results = decoded.args[0].map((nestedCall) => ({
      success: true,
      returnData: contractRead(
        { to: nestedCall.target, data: nestedCall.callData },
        options,
      ),
    }));
    return encodeFunctionResult({
      abi: multicall3Abi,
      functionName: "aggregate3",
      result: results,
    });
  }

  if (to === FIXTURE_ORDER_BOOK.toLowerCase() && selector === toFunctionSelector("collateral()")) {
    return encodeFunctionResult({ abi: noxLimitOrderBookAbi, functionName: "collateral", result: FIXTURE_COLLATERAL });
  }
  if (to === FIXTURE_ORDER_BOOK.toLowerCase() && selector === toFunctionSelector("maximumEvaluations()")) {
    return encodeFunctionResult({ abi: noxLimitOrderBookAbi, functionName: "maximumEvaluations", result: 4 });
  }
  if (to === FIXTURE_ORDER_BOOK.toLowerCase() && selector === toFunctionSelector("minimumEvaluationInterval()")) {
    return encodeFunctionResult({ abi: noxLimitOrderBookAbi, functionName: "minimumEvaluationInterval", result: 60n });
  }
  if (to === FIXTURE_COLLATERAL.toLowerCase() && selector === toFunctionSelector("allowance(address,address)")) {
    return encodeFunctionResult({ abi: erc20Abi, functionName: "allowance", result: options.allowance ?? 0n });
  }
  if (to === FIXTURE_COLLATERAL.toLowerCase() && selector === toFunctionSelector("balanceOf(address)")) {
    return encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: 50_000_000n });
  }
  if (to === FIXTURE_FPMM.toLowerCase() && selector === toFunctionSelector("conditionalTokens()")) {
    return encodeFunctionResult({ abi: fixedProductMarketMakerAbi, functionName: "conditionalTokens", result: FIXTURE_CONDITIONAL_TOKENS });
  }
  if (to === FIXTURE_FPMM.toLowerCase() && selector === toFunctionSelector("collateralToken()")) {
    return encodeFunctionResult({ abi: fixedProductMarketMakerAbi, functionName: "collateralToken", result: FIXTURE_COLLATERAL });
  }

  const resolvesAt = BigInt(Math.floor(Date.parse("2030-01-01T01:05:00.000Z") / 1_000));
  const selectedRoundId = (1n << 64n) | 2n;
  const predecessorRoundId = selectedRoundId - 1n;
  if (to === FIXTURE_RESOLVER.toLowerCase()) {
    if (selector === toFunctionSelector("resolved()")) return encodeFunctionResult({ abi: resolverEvidenceAbi, functionName: "resolved", result: options.resolution === "RESOLVED" });
    if (selector === toFunctionSelector("resolvedYes()")) return encodeFunctionResult({ abi: resolverEvidenceAbi, functionName: "resolvedYes", result: true });
    if (selector === toFunctionSelector("settlementPriceWad()")) return encodeFunctionResult({ abi: resolverEvidenceAbi, functionName: "settlementPriceWad", result: 66_000n * 10n ** 18n });
    if (selector === toFunctionSelector("settlementObservedAt()")) return encodeFunctionResult({ abi: resolverEvidenceAbi, functionName: "settlementObservedAt", result: resolvesAt + 60n });
    if (selector === toFunctionSelector("settlementRoundId()")) return encodeFunctionResult({ abi: resolverEvidenceAbi, functionName: "settlementRoundId", result: selectedRoundId });
    if (selector === toFunctionSelector("predecessorRoundId()")) return encodeFunctionResult({ abi: resolverEvidenceAbi, functionName: "predecessorRoundId", result: predecessorRoundId });
    if (selector === toFunctionSelector("settlementAdapter()")) return encodeFunctionResult({ abi: resolverEvidenceAbi, functionName: "settlementAdapter", result: FIXTURE_ADAPTER });
    if (selector === toFunctionSelector("resolvesAt()")) return encodeFunctionResult({ abi: resolverEvidenceAbi, functionName: "resolvesAt", result: resolvesAt });
    if (selector === toFunctionSelector("maximumObservationDelay()")) return encodeFunctionResult({ abi: resolverEvidenceAbi, functionName: "maximumObservationDelay", result: 3_600n });
  }
  if (to === FIXTURE_ADAPTER.toLowerCase()) {
    if (selector === toFunctionSelector("feed()")) return encodeFunctionResult({ abi: adapterEvidenceAbi, functionName: "feed", result: FIXTURE_FEED });
    if (selector === toFunctionSelector("feedDecimals()")) return encodeFunctionResult({ abi: adapterEvidenceAbi, functionName: "feedDecimals", result: 8 });
  }
  if (to === FIXTURE_FEED.toLowerCase()) {
    if (selector === toFunctionSelector("latestRoundData()")) {
      return encodeFunctionResult({ abi: chainlinkEvidenceAbi, functionName: "latestRoundData", result: [selectedRoundId, 6_600_000_000_000n, 0n, resolvesAt + 60n, selectedRoundId] });
    }
    if (selector === toFunctionSelector("getRoundData(uint80)")) {
      const decoded = decodeFunctionData({ abi: chainlinkEvidenceAbi, data });
      const roundId = decoded.args[0];
      const selected = roundId === selectedRoundId;
      return encodeFunctionResult({
        abi: chainlinkEvidenceAbi,
        functionName: "getRoundData",
        result: selected
          ? [selectedRoundId, 6_600_000_000_000n, 0n, resolvesAt + 60n, selectedRoundId]
          : [predecessorRoundId, 6_400_000_000_000n, 0n, resolvesAt - 60n, predecessorRoundId],
      });
    }
  }
  throw new Error(`Unsupported fixture eth_call ${to} ${selector}`);
}

function transactionReceipt(hash: Hex) {
  const orderCreated = hash.toLowerCase() === TX_CREATE.toLowerCase();
  const blockHash = `0x${"f".repeat(64)}` as Hex;
  const to = hash.toLowerCase() === TX_APPROVAL.toLowerCase()
    ? FIXTURE_COLLATERAL
    : hash.toLowerCase() === TX_RESOLVE.toLowerCase()
      ? FIXTURE_RESOLVER
      : hash.toLowerCase() === TX_REDEEM.toLowerCase()
        ? FIXTURE_CONDITIONAL_TOKENS
        : FIXTURE_ORDER_BOOK;
  return {
    blockHash,
    blockNumber: "0x79",
    contractAddress: null,
    cumulativeGasUsed: "0x5208",
    effectiveGasPrice: "0x1",
    from: FIXTURE_ACCOUNT,
    gasUsed: "0x5208",
    logs: orderCreated ? [orderCreatedLog(hash, blockHash)] : [],
    logsBloom: `0x${"0".repeat(512)}`,
    status: "0x1",
    to,
    transactionHash: hash,
    transactionIndex: "0x0",
    type: "0x2",
  };
}

function orderCreatedLog(transactionHash: Hex, blockHash: Hex) {
  const expiresAt = BigInt(Math.floor(Date.parse("2030-01-01T00:41:00.000Z") / 1_000));
  return {
    address: FIXTURE_ORDER_BOOK,
    blockHash,
    blockNumber: "0x79",
    data: encodeAbiParameters(
      [{ type: "uint8" }, { type: "uint256" }, { type: "uint64" }, { type: "bytes32" }],
      [0, 10_000_000n, expiresAt, FIXTURE_HANDLE],
    ),
    logIndex: "0x0",
    removed: false,
    topics: encodeEventTopics({
      abi: noxLimitOrderBookAbi,
      eventName: "OrderCreated",
      args: { orderId: 1n, owner: FIXTURE_ACCOUNT, recipient: FIXTURE_ACCOUNT },
    }),
    transactionHash,
    transactionIndex: "0x0",
  };
}

function fixtureBlock() {
  const resolvesAt = BigInt(Math.floor(Date.parse("2030-01-01T01:05:00.000Z") / 1_000));
  return {
    baseFeePerGas: "0x1",
    blobGasUsed: "0x0",
    difficulty: "0x0",
    excessBlobGas: "0x0",
    extraData: "0x",
    gasLimit: "0x1c9c380",
    gasUsed: "0x5208",
    hash: `0x${"f".repeat(64)}`,
    logsBloom: `0x${"0".repeat(512)}`,
    miner: `0x${"0".repeat(40)}`,
    mixHash: `0x${"0".repeat(64)}`,
    nonce: "0x0000000000000000",
    number: "0x79",
    parentBeaconBlockRoot: `0x${"0".repeat(64)}`,
    parentHash: `0x${"e".repeat(64)}`,
    receiptsRoot: `0x${"0".repeat(64)}`,
    sha3Uncles: `0x${"0".repeat(64)}`,
    size: "0x1",
    stateRoot: `0x${"0".repeat(64)}`,
    timestamp: toHex(resolvesAt + 600n),
    totalDifficulty: "0x0",
    transactions: [],
    transactionsRoot: `0x${"0".repeat(64)}`,
    uncles: [],
    withdrawals: [],
    withdrawalsRoot: `0x${"0".repeat(64)}`,
  };
}
