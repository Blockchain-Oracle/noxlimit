import type { Page } from "@playwright/test";
import { FUNDING_CLAIM_FIELDS, erc20Abi, noxLimitOrderBookAbi } from "@noxlimit/protocol";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionResult,
  parseAbi,
  toFunctionSelector,
  toHex,
  type Address,
  type Hex,
} from "viem";
import {
  FIXTURE_ACCOUNT,
  FIXTURE_COLLATERAL,
  FIXTURE_GATEWAY_ADDRESS,
  FIXTURE_ORDER_BOOK,
} from "./chain-fixture";

const FUNDING_TREASURY = `0x${"f".repeat(40)}` as Address;
const FUNDING_CHALLENGE_ID = `0x${"c".repeat(64)}` as Hex;
const FUNDING_SIGNATURE = `0x${"12".repeat(65)}` as Hex;
const FUNDING_TRANSACTION = `0x${"a".repeat(64)}` as Hex;
const MULTICALL3 = "0xca11bde05977b3631167028862be2a173976ca11";
const DEADLINE = "1893459000";
const EXPIRES_AT = "2030-01-01T00:50:00.000Z";

const noxGatewayAbi = parseAbi(["function gateway() view returns (address)"]);
const multicall3Abi = parseAbi([
  "function aggregate3((address target,bool allowFailure,bytes callData)[] calls) payable returns ((bool success,bytes returnData)[] returnData)",
  "function getEthBalance(address account) view returns (uint256 balance)",
]);

type JsonRpcRequest = Readonly<{
  id: number | string;
  jsonrpc: "2.0";
  method: string;
  params?: readonly unknown[];
}>;

export type FundingWalletRequest = Readonly<{
  method: string;
  params?: readonly unknown[];
}>;

export type FundingBalanceRead = Readonly<{
  kind: "NATIVE" | "COLLATERAL";
  funded: boolean;
}>;

type FundingFixtureOptions = Readonly<{
  challengeUnavailable?: boolean;
  rejectSignature?: boolean;
  claimStatus?: "COMPLETE" | "PARTIAL";
}>;

export type FundingFixture = Readonly<{
  walletRequests: FundingWalletRequest[];
  challengeRequests: unknown[];
  claimRequests: unknown[];
  balanceReads: FundingBalanceRead[];
}>;

export async function installFundingFixture(page: Page, options: FundingFixtureOptions = {}): Promise<FundingFixture> {
  const walletRequests: FundingWalletRequest[] = [];
  const challengeRequests: unknown[] = [];
  const claimRequests: unknown[] = [];
  const balanceReads: FundingBalanceRead[] = [];
  let funded = false;

  await page.exposeBinding("__recordNoxLimitFundingWalletRequest", (_source, request: FundingWalletRequest) => {
    walletRequests.push(request);
  });
  await page.addInitScript(({ account, gatewayResult, rejectSignature, signature }) => {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const provider = {
      isMetaMask: true,
      async request({ method, params }: { method: string; params?: readonly unknown[] }) {
        if (method === "eth_requestAccounts" || method === "eth_accounts") return [account];
        if (method === "eth_chainId") return "0xaa36a7";
        if (method === "wallet_switchEthereumChain") return null;
        if (method === "wallet_requestPermissions") return [{ parentCapability: "eth_accounts" }];
        if (method === "eth_call") return gatewayResult;
        if (method === "eth_signTypedData_v4") {
          await (window as unknown as {
            __recordNoxLimitFundingWalletRequest(request: FundingWalletRequest): Promise<void>;
          }).__recordNoxLimitFundingWalletRequest({ method, params });
          if (rejectSignature) {
            throw Object.assign(new Error("User rejected the funding signature."), { code: 4001 });
          }
          return signature;
        }
        throw Object.assign(new Error(`Unsupported funding fixture wallet method: ${method}`), { code: 4200 });
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
  }, {
    account: FIXTURE_ACCOUNT,
    gatewayResult: encodeAbiParameters([{ type: "address" }], [FIXTURE_GATEWAY_ADDRESS]),
    rejectSignature: options.rejectSignature ?? false,
    signature: FUNDING_SIGNATURE,
  });

  await page.route("http://127.0.0.1:4174/rpc", async (route, request) => {
    const input = request.postDataJSON() as JsonRpcRequest | JsonRpcRequest[];
    const batch = Array.isArray(input) ? input : [input];
    const output = batch.map((entry) => {
      try {
        return { jsonrpc: "2.0" as const, id: entry.id, result: fundingRpcResult(entry, funded, balanceReads) };
      } catch (reason) {
        return {
          jsonrpc: "2.0" as const,
          id: entry.id,
          error: { code: -32000, message: reason instanceof Error ? reason.message : "Unsupported funding fixture RPC request" },
        };
      }
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(Array.isArray(input) ? output : output[0]),
    });
  });

  await page.route("**/v1/funding/challenge", async (route, request) => {
    challengeRequests.push(request.postDataJSON());
    if (options.challengeUnavailable) {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "FUNDING_UNAVAILABLE" }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        challengeId: FUNDING_CHALLENGE_ID,
        address: FIXTURE_ACCOUNT,
        chainId: 11_155_111,
        treasury: FUNDING_TREASURY,
        nonce: "3",
        deadline: DEADLINE,
        expiresAt: EXPIRES_AT,
        typedData: {
          domain: {
            name: "NoxLimit Testnet Funding",
            version: "1",
            chainId: 11_155_111,
            verifyingContract: FUNDING_TREASURY,
          },
          types: { FundingClaim: FUNDING_CLAIM_FIELDS },
          primaryType: "FundingClaim",
          message: { recipient: FIXTURE_ACCOUNT, nonce: "3", deadline: DEADLINE },
        },
      }),
    });
  });

  await page.route("**/v1/funding/claim", async (route, request) => {
    claimRequests.push(request.postDataJSON());
    funded = true;
    const status = options.claimStatus ?? "COMPLETE";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status,
        address: FIXTURE_ACCOUNT,
        nativeAmount: "0.01",
        collateralAmount: status === "COMPLETE" ? "25" : "20",
        nextEligibleAt: "2030-01-01T01:00:00.000Z",
        transactionHash: FUNDING_TRANSACTION,
        asOf: "2030-01-01T00:12:00.000Z",
      }),
    });
  });

  return { walletRequests, challengeRequests, claimRequests, balanceReads };
}

function fundingRpcResult(request: JsonRpcRequest, funded: boolean, balanceReads: FundingBalanceRead[]): unknown {
  if (request.method === "eth_chainId") return "0xaa36a7";
  if (request.method === "eth_blockNumber") return "0x79";
  if (request.method === "eth_getBalance") {
    balanceReads.push({ kind: "NATIVE", funded });
    return toHex(funded ? 10_000_000_000_000_000n : 0n);
  }
  if (request.method === "eth_call") {
    const call = (request.params?.[0] ?? {}) as { to?: Address; data?: Hex };
    return fundingContractRead(call, funded, balanceReads);
  }
  throw new Error(`Unsupported funding fixture RPC method: ${request.method}`);
}

function fundingContractRead(
  call: { to?: Address; data?: Hex },
  funded: boolean,
  balanceReads: FundingBalanceRead[],
): Hex {
  const to = call.to?.toLowerCase();
  const data = call.data;
  if (!to || !data) throw new Error("Funding fixture eth_call requires to and data.");
  const selector = data.slice(0, 10);

  if (to === MULTICALL3 && selector === toFunctionSelector("aggregate3((address,bool,bytes)[])")) {
    const decoded = decodeFunctionData({ abi: multicall3Abi, data });
    return encodeFunctionResult({
      abi: multicall3Abi,
      functionName: "aggregate3",
      result: decoded.args[0].map((nestedCall) => ({
        success: true,
        returnData: fundingContractRead({ to: nestedCall.target, data: nestedCall.callData }, funded, balanceReads),
      })),
    });
  }
  if (to === MULTICALL3 && selector === toFunctionSelector("getEthBalance(address)")) {
    balanceReads.push({ kind: "NATIVE", funded });
    return encodeFunctionResult({
      abi: multicall3Abi,
      functionName: "getEthBalance",
      result: funded ? 10_000_000_000_000_000n : 0n,
    });
  }
  if (to === FIXTURE_ORDER_BOOK.toLowerCase() && selector === toFunctionSelector("maximumEvaluations()")) {
    return encodeFunctionResult({
      abi: noxLimitOrderBookAbi,
      functionName: "maximumEvaluations",
      result: 4,
    });
  }
  if (to === FIXTURE_ORDER_BOOK.toLowerCase() && selector === toFunctionSelector("minimumEvaluationInterval()")) {
    return encodeFunctionResult({
      abi: noxLimitOrderBookAbi,
      functionName: "minimumEvaluationInterval",
      result: 60n,
    });
  }
  if (to === FIXTURE_COLLATERAL.toLowerCase() && selector === toFunctionSelector("balanceOf(address)")) {
    balanceReads.push({ kind: "COLLATERAL", funded });
    return encodeFunctionResult({
      abi: erc20Abi,
      functionName: "balanceOf",
      result: funded ? 25_000_000n : 0n,
    });
  }
  if (selector === toFunctionSelector("gateway()")) {
    return encodeFunctionResult({ abi: noxGatewayAbi, functionName: "gateway", result: FIXTURE_GATEWAY_ADDRESS });
  }
  throw new Error(`Unsupported funding fixture eth_call ${to} ${selector}`);
}

export const fundingFixtureValues = {
  account: FIXTURE_ACCOUNT,
  treasury: FUNDING_TREASURY,
  challengeId: FUNDING_CHALLENGE_ID,
  signature: FUNDING_SIGNATURE,
  deadline: DEADLINE,
} as const;
