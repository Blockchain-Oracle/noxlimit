import { FUNDING_CLAIM_FIELDS } from "@noxlimit/protocol";
import { describe, expect, it } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiItem,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { OnchainFundingCoordinator } from "../src/funding/coordinator.js";
import { testAddress, testHash } from "./fixtures.js";

const account = privateKeyToAccount(`0x${"01".repeat(32)}`);
const treasury = testAddress("9");
const collateral = testAddress("2");
const transactionHash = testHash("7");

describe("testnet funding coordinator", () => {
  it("returns human ETH/Test-USDC units and validates the exact treasury event", async () => {
    const chain = fundingChain({ nativePreview: 10n ** 16n, collateralPreview: 12_500_000n });
    const coordinator = new OnchainFundingCoordinator({
      publicClient: chain.publicClient,
      walletClient: chain.walletClient,
      treasury,
    });
    const challenge = await coordinator.challenge({ address: account.address, chainId: 11_155_111 });
    const signature = await signChallenge(challenge.nonce, challenge.deadline);
    const result = await coordinator.claim({
      challengeId: challenge.challengeId,
      address: account.address,
      signature,
    });
    expect(result).toMatchObject({
      status: "COMPLETE",
      nativeAmount: "0.01",
      collateralAmount: "12.5",
      transactionHash,
    });
  });

  it("serializes concurrent claims and rejects the second signed replay", async () => {
    const chain = fundingChain({ nativePreview: 1n, collateralPreview: 1n });
    const coordinator = new OnchainFundingCoordinator({
      publicClient: chain.publicClient,
      walletClient: chain.walletClient,
      treasury,
    });
    const challenge = await coordinator.challenge({ address: account.address, chainId: 11_155_111 });
    const signature = await signChallenge(challenge.nonce, challenge.deadline);
    const claim = {
      challengeId: challenge.challengeId,
      address: account.address,
      signature,
    } as const;
    const results = await Promise.allSettled([coordinator.claim(claim), coordinator.claim(claim)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejection = results.find((result) => result.status === "rejected");
    expect(rejection).toMatchObject({ reason: { message: "CHALLENGE_REPLAYED", statusCode: 409 } });
  });

  it("enforces cooldown before issuing a signing challenge", async () => {
    const chain = fundingChain({ nextEligibleAt: 1_001n });
    const coordinator = new OnchainFundingCoordinator({
      publicClient: chain.publicClient,
      walletClient: chain.walletClient,
      treasury,
    });
    await expect(coordinator.challenge({
      address: account.address,
      chainId: 11_155_111,
    })).rejects.toMatchObject({ message: "COOLDOWN", statusCode: 409 });
  });

  it("distinguishes lifetime-cap exhaustion from an empty required treasury asset", async () => {
    const cappedChain = fundingChain({
      nativePreview: 0n,
      collateralPreview: 0n,
      nativeTarget: 100n,
      nativeBalance: 0n,
      nativeGranted: 100n,
      nativeLifetimeCap: 100n,
      treasuryNativeBalance: 1_000n,
    });
    const capped = new OnchainFundingCoordinator({
      publicClient: cappedChain.publicClient,
      walletClient: cappedChain.walletClient,
      treasury,
    });
    const capChallenge = await capped.challenge({ address: account.address, chainId: 11_155_111 });
    const capResult = await capped.claim({
      challengeId: capChallenge.challengeId,
      address: account.address,
      signature: await signChallenge(capChallenge.nonce, capChallenge.deadline),
    });
    expect(capResult.status).toBe("CAP_REACHED");

    const lowChain = fundingChain({
      nativePreview: 0n,
      collateralPreview: 0n,
      nativeTarget: 100n,
      nativeBalance: 0n,
      treasuryNativeBalance: 0n,
      treasuryCollateralBalance: 1_000n,
    });
    const low = new OnchainFundingCoordinator({
      publicClient: lowChain.publicClient,
      walletClient: lowChain.walletClient,
      treasury,
    });
    const lowChallenge = await low.challenge({ address: account.address, chainId: 11_155_111 });
    const lowResult = await low.claim({
      challengeId: lowChallenge.challengeId,
      address: account.address,
      signature: await signChallenge(lowChallenge.nonce, lowChallenge.deadline),
    });
    expect(lowResult.status).toBe("TREASURY_LOW");
  });
});

type FundingChainOptions = Partial<{
  nativePreview: bigint;
  collateralPreview: bigint;
  nextEligibleAt: bigint;
  nativeTarget: bigint;
  collateralTarget: bigint;
  nativeLifetimeCap: bigint;
  collateralLifetimeCap: bigint;
  nativeGranted: bigint;
  collateralGranted: bigint;
  nativeBalance: bigint;
  collateralBalance: bigint;
  treasuryNativeBalance: bigint;
  treasuryCollateralBalance: bigint;
}>;

function fundingChain(options: FundingChainOptions = {}): {
  publicClient: PublicClient;
  walletClient: WalletClient;
} {
  let nonce = 0n;
  let claimedNonce = 0n;
  const values = {
    nativePreview: options.nativePreview ?? 10n,
    collateralPreview: options.collateralPreview ?? 10n,
    nextEligibleAt: options.nextEligibleAt ?? 0n,
    nativeTarget: options.nativeTarget ?? 10n,
    collateralTarget: options.collateralTarget ?? 10n,
    nativeLifetimeCap: options.nativeLifetimeCap ?? 1_000n,
    collateralLifetimeCap: options.collateralLifetimeCap ?? 1_000n,
    nativeGranted: options.nativeGranted ?? 0n,
    collateralGranted: options.collateralGranted ?? 0n,
    nativeBalance: options.nativeBalance ?? 10n,
    collateralBalance: options.collateralBalance ?? 10n,
    treasuryNativeBalance: options.treasuryNativeBalance ?? 1_000n,
    treasuryCollateralBalance: options.treasuryCollateralBalance ?? 1_000n,
  };
  const publicClient = {
    readContract: async (input: { functionName: string; args?: readonly unknown[] }) => {
      if (input.functionName === "preview") {
        return [values.nativePreview, values.collateralPreview, values.nextEligibleAt, nonce];
      }
      if (input.functionName === "collateral") return collateral;
      if (input.functionName === "nativeTarget") return values.nativeTarget;
      if (input.functionName === "collateralTarget") return values.collateralTarget;
      if (input.functionName === "nativeLifetimeCap") return values.nativeLifetimeCap;
      if (input.functionName === "collateralLifetimeCap") return values.collateralLifetimeCap;
      if (input.functionName === "nativeGranted") return values.nativeGranted;
      if (input.functionName === "collateralGranted") return values.collateralGranted;
      if (input.functionName === "balanceOf") {
        return (input.args?.[0] as string).toLowerCase() === treasury.toLowerCase()
          ? values.treasuryCollateralBalance
          : values.collateralBalance;
      }
      throw new Error(`unexpected read ${input.functionName}`);
    },
    getBlock: async (input?: { blockNumber?: bigint }) => ({
      number: input?.blockNumber ?? 100n,
      timestamp: input?.blockNumber ? 1_001n : 1_000n,
    }),
    getBalance: async (input: { address: Address }) =>
      input.address.toLowerCase() === treasury.toLowerCase()
        ? values.treasuryNativeBalance
        : values.nativeBalance,
    waitForTransactionReceipt: async () => ({
      status: "success",
      blockNumber: 101n,
      logs: [fundingLog(account.address, claimedNonce, values.nativePreview, values.collateralPreview)],
    }),
  } as unknown as PublicClient;
  const walletClient = {
    account,
    chain: undefined,
    writeContract: async (input: { args: readonly unknown[] }) => {
      claimedNonce = input.args[1] as bigint;
      nonce += 1n;
      return transactionHash;
    },
  } as unknown as WalletClient;
  return { publicClient, walletClient };
}

const fundingClaimedEvent = parseAbiItem(
  "event FundingClaimed(address indexed recipient, uint256 indexed nonce, uint256 nativeAmount, uint256 collateralAmount, uint64 nextEligibleAt)",
);

function fundingLog(
  recipient: Address,
  nonce: bigint,
  nativeAmount: bigint,
  collateralAmount: bigint,
) {
  return {
    address: treasury,
    topics: encodeEventTopics({
      abi: [fundingClaimedEvent],
      eventName: "FundingClaimed",
      args: { recipient, nonce },
    }),
    data: encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint64" },
      ],
      [nativeAmount, collateralAmount, 1_300n],
    ),
  };
}

async function signChallenge(nonce: string, deadline: string): Promise<Hex> {
  return account.signTypedData({
    domain: {
      name: "NoxLimit Testnet Funding",
      version: "1",
      chainId: 11_155_111,
      verifyingContract: treasury,
    },
    types: { FundingClaim: FUNDING_CLAIM_FIELDS },
    primaryType: "FundingClaim",
    message: {
      recipient: account.address,
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
    },
  });
}
