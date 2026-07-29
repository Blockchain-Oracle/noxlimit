import { randomBytes } from "node:crypto";

import {
  atomsToDecimal,
  fundingChallengeResponseSchema,
  fundingClaimResponseSchema,
  FUNDING_CLAIM_FIELDS,
  TEST_USDC_DECIMALS,
  type FundingChallengeRequest,
  type FundingChallengeResponse,
  type FundingClaimRequest,
  type FundingClaimResponse,
} from "@noxlimit/protocol";
import {
  decodeEventLog,
  verifyTypedData,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";

import type { FundingCoordinator } from "../api/ports.js";
import { SerializedWriter } from "../tx/serialized-writer.js";

const CHALLENGE_LIFETIME_SECONDS = 300n;

const fundingTreasuryAbi = [
  {
    type: "function",
    name: "preview",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [
      { name: "nativeAmount", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
      { name: "nextEligibleAt", type: "uint64" },
      { name: "nonce", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint64" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [
      { name: "nativeAmount", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "collateral",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "nativeTarget",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "collateralTarget",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "nativeLifetimeCap",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "collateralLifetimeCap",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "nativeGranted",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "collateralGranted",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "FundingClaimed",
    inputs: [
      { name: "recipient", type: "address", indexed: true },
      { name: "nonce", type: "uint256", indexed: true },
      { name: "nativeAmount", type: "uint256", indexed: false },
      { name: "collateralAmount", type: "uint256", indexed: false },
      { name: "nextEligibleAt", type: "uint64", indexed: false },
    ],
  },
] as const;

type Challenge = Readonly<{
  id: Hex;
  address: Address;
  nonce: bigint;
  deadline: bigint;
  expiresAtMs: number;
}>;

export class OnchainFundingCoordinator implements FundingCoordinator {
  readonly #publicClient: PublicClient;
  readonly #walletClient: WalletClient;
  readonly #treasury: Address;
  readonly #chainId: 11_155_111;
  readonly #writer: SerializedWriter;
  readonly #challenges = new Map<Hex, Challenge>();

  constructor(input: {
    publicClient: PublicClient;
    walletClient: WalletClient;
    treasury: Address;
    chainId?: 11_155_111;
    writer?: SerializedWriter;
  }) {
    if (!input.walletClient.account) throw new Error("funding relay wallet account is required");
    this.#publicClient = input.publicClient;
    this.#walletClient = input.walletClient;
    this.#treasury = input.treasury;
    this.#chainId = input.chainId ?? 11_155_111;
    this.#writer = input.writer ?? new SerializedWriter();
  }

  async challenge(input: FundingChallengeRequest): Promise<FundingChallengeResponse> {
    if (input.chainId !== this.#chainId) throw new FundingRequestError("WRONG_CHAIN", 409);
    const [, , nextEligibleAt, nonce] = await this.#publicClient.readContract({
      address: this.#treasury,
      abi: fundingTreasuryAbi,
      functionName: "preview",
      args: [input.address],
    });
    const block = await this.#publicClient.getBlock();
    if (nextEligibleAt > block.timestamp) throw new FundingRequestError("COOLDOWN", 409);

    const deadline = block.timestamp + CHALLENGE_LIFETIME_SECONDS;
    const id = `0x${randomBytes(32).toString("hex")}` as Hex;
    this.#challenges.set(id, {
      id,
      address: input.address,
      nonce,
      deadline,
      expiresAtMs: Date.now() + Number(CHALLENGE_LIFETIME_SECONDS) * 1_000,
    });
    this.#pruneChallenges();

    return fundingChallengeResponseSchema.parse({
      challengeId: id,
      address: input.address,
      chainId: this.#chainId,
      treasury: this.#treasury,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      expiresAt: new Date(Number(deadline) * 1_000).toISOString(),
      typedData: {
        domain: {
          name: "NoxLimit Testnet Funding",
          version: "1",
          chainId: this.#chainId,
          verifyingContract: this.#treasury,
        },
        types: { FundingClaim: FUNDING_CLAIM_FIELDS },
        primaryType: "FundingClaim",
        message: {
          recipient: input.address,
          nonce: nonce.toString(),
          deadline: deadline.toString(),
        },
      },
    });
  }

  async claim(input: FundingClaimRequest): Promise<FundingClaimResponse> {
    const challenge = this.#challenges.get(input.challengeId);
    if (!challenge || challenge.address.toLowerCase() !== input.address.toLowerCase()) {
      throw new FundingRequestError("UNKNOWN_CHALLENGE", 404);
    }
    if (challenge.expiresAtMs < Date.now()) {
      this.#challenges.delete(input.challengeId);
      throw new FundingRequestError("CHALLENGE_EXPIRED", 409);
    }

    const signatureValid = await verifyTypedData({
      address: input.address,
      domain: {
        name: "NoxLimit Testnet Funding",
        version: "1",
        chainId: this.#chainId,
        verifyingContract: this.#treasury,
      },
      types: { FundingClaim: FUNDING_CLAIM_FIELDS },
      primaryType: "FundingClaim",
      message: {
        recipient: input.address,
        nonce: challenge.nonce,
        deadline: challenge.deadline,
      },
      signature: input.signature,
    });
    if (!signatureValid) throw new FundingRequestError("INVALID_SIGNATURE", 401);

    return this.#writer.enqueue(async () => {
      const [nativePreview, collateralPreview, nextEligibleAt, currentNonce] =
        await this.#publicClient.readContract({
          address: this.#treasury,
          abi: fundingTreasuryAbi,
          functionName: "preview",
          args: [input.address],
        });
      const currentBlock = await this.#publicClient.getBlock();
      if (nextEligibleAt > currentBlock.timestamp) {
        return fundingClaimResponseSchema.parse({
          status: "COOLDOWN",
          address: input.address,
          nativeAmount: "0",
          collateralAmount: "0",
          nextEligibleAt: new Date(Number(nextEligibleAt) * 1_000).toISOString(),
          asOf: new Date(Number(currentBlock.timestamp) * 1_000).toISOString(),
        });
      }
      if (currentNonce !== challenge.nonce) {
        this.#challenges.delete(input.challengeId);
        throw new FundingRequestError("CHALLENGE_REPLAYED", 409);
      }
      if (this.#challenges.get(input.challengeId) !== challenge) {
        throw new FundingRequestError("CHALLENGE_REPLAYED", 409);
      }
      // Consume every valid signed challenge exactly once, including no-funding classifications.
      // A transient relay failure is retried with a fresh short-lived challenge for the same nonce.
      this.#challenges.delete(input.challengeId);
      if (nativePreview === 0n && collateralPreview === 0n) {
        const status = await this.#classifyNoFunding(input.address);
        return fundingClaimResponseSchema.parse({
          status,
          address: input.address,
          nativeAmount: "0",
          collateralAmount: "0",
          asOf: new Date(Number(currentBlock.timestamp) * 1_000).toISOString(),
        });
      }

      const transactionHash = await this.#walletClient.writeContract({
        address: this.#treasury,
        abi: fundingTreasuryAbi,
        functionName: "claim",
        args: [input.address, challenge.nonce, challenge.deadline, input.signature],
        account: this.#walletClient.account!,
        chain: this.#walletClient.chain,
      });
      const receipt = await this.#publicClient.waitForTransactionReceipt({ hash: transactionHash });
      if (receipt.status !== "success") throw new FundingRequestError("FUNDING_REVERTED", 502);

      const event = receipt.logs.flatMap((log) => {
        if (log.address.toLowerCase() !== this.#treasury.toLowerCase()) return [];
        try {
          const decoded = decodeEventLog({
            abi: fundingTreasuryAbi,
            eventName: "FundingClaimed",
            data: log.data,
            topics: log.topics,
          });
          return [decoded.args];
        } catch {
          return [];
        }
      }).find((args) =>
        args.recipient.toLowerCase() === input.address.toLowerCase() &&
        args.nonce === challenge.nonce
      );
      if (!event) {
        throw new FundingRequestError("FUNDING_EVENT_MISSING", 502);
      }
      const receiptBlock = await this.#publicClient.getBlock({ blockNumber: receipt.blockNumber });
      const [nativeTarget, collateralTarget, collateralAddress] = await Promise.all([
        this.#publicClient.readContract({
          address: this.#treasury,
          abi: fundingTreasuryAbi,
          functionName: "nativeTarget",
        }),
        this.#publicClient.readContract({
          address: this.#treasury,
          abi: fundingTreasuryAbi,
          functionName: "collateralTarget",
        }),
        this.#publicClient.readContract({
          address: this.#treasury,
          abi: fundingTreasuryAbi,
          functionName: "collateral",
        }),
      ]);
      const [nativeBalance, collateralBalance] = await Promise.all([
        this.#publicClient.getBalance({ address: input.address }),
        this.#publicClient.readContract({
          address: collateralAddress,
          abi: erc20BalanceAbi,
          functionName: "balanceOf",
          args: [input.address],
        }),
      ]);
      const complete = nativeBalance >= nativeTarget && collateralBalance >= collateralTarget;
      return fundingClaimResponseSchema.parse({
        status: complete ? "COMPLETE" : "PARTIAL",
        address: input.address,
        nativeAmount: atomsToDecimal(event.nativeAmount, 18, true),
        collateralAmount: atomsToDecimal(event.collateralAmount, TEST_USDC_DECIMALS, true),
        nextEligibleAt: new Date(Number(event.nextEligibleAt) * 1_000).toISOString(),
        transactionHash,
        asOf: new Date(Number(receiptBlock.timestamp) * 1_000).toISOString(),
      });
    });
  }

  #pruneChallenges(): void {
    const now = Date.now();
    for (const [id, challenge] of this.#challenges) {
      if (challenge.expiresAtMs < now) this.#challenges.delete(id);
    }
  }

  async #classifyNoFunding(address: Address): Promise<"COMPLETE" | "CAP_REACHED" | "TREASURY_LOW"> {
    const [
      collateralAddress,
      nativeTarget,
      collateralTarget,
      nativeLifetimeCap,
      collateralLifetimeCap,
      nativeGranted,
      collateralGranted,
      nativeBalance,
      treasuryNativeBalance,
    ] = await Promise.all([
      this.#publicClient.readContract({
        address: this.#treasury,
        abi: fundingTreasuryAbi,
        functionName: "collateral",
      }),
      this.#publicClient.readContract({
        address: this.#treasury,
        abi: fundingTreasuryAbi,
        functionName: "nativeTarget",
      }),
      this.#publicClient.readContract({
        address: this.#treasury,
        abi: fundingTreasuryAbi,
        functionName: "collateralTarget",
      }),
      this.#publicClient.readContract({
        address: this.#treasury,
        abi: fundingTreasuryAbi,
        functionName: "nativeLifetimeCap",
      }),
      this.#publicClient.readContract({
        address: this.#treasury,
        abi: fundingTreasuryAbi,
        functionName: "collateralLifetimeCap",
      }),
      this.#publicClient.readContract({
        address: this.#treasury,
        abi: fundingTreasuryAbi,
        functionName: "nativeGranted",
        args: [address],
      }),
      this.#publicClient.readContract({
        address: this.#treasury,
        abi: fundingTreasuryAbi,
        functionName: "collateralGranted",
        args: [address],
      }),
      this.#publicClient.getBalance({ address }),
      this.#publicClient.getBalance({ address: this.#treasury }),
    ]);
    const [collateralBalance, treasuryCollateralBalance] = await Promise.all([
      this.#publicClient.readContract({
        address: collateralAddress,
        abi: erc20BalanceAbi,
        functionName: "balanceOf",
        args: [address],
      }),
      this.#publicClient.readContract({
        address: collateralAddress,
        abi: erc20BalanceAbi,
        functionName: "balanceOf",
        args: [this.#treasury],
      }),
    ]);
    if (nativeBalance >= nativeTarget && collateralBalance >= collateralTarget) return "COMPLETE";
    const needsNative = nativeBalance < nativeTarget;
    const needsCollateral = collateralBalance < collateralTarget;
    if (
      (needsNative && nativeGranted >= nativeLifetimeCap) ||
      (needsCollateral && collateralGranted >= collateralLifetimeCap)
    ) return "CAP_REACHED";
    if (
      (needsNative && treasuryNativeBalance === 0n) ||
      (needsCollateral && treasuryCollateralBalance === 0n)
    ) return "TREASURY_LOW";
    // A zero preview with unmet targets and remaining caps means treasury policy cannot fund a
    // useful increment (for example, a balance below the configured per-claim floor).
    return "TREASURY_LOW";
  }
}

class FundingRequestError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "FundingRequestError";
    this.statusCode = statusCode;
  }
}

const erc20BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
