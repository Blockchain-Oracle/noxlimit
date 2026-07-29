"use client";

import { TEST_USDC_DECIMALS, decimalToAtoms, erc20Abi } from "@noxlimit/protocol";
import { useCallback } from "react";
import { formatEther, formatUnits, isAddress } from "viem";
import { useAccount, useBalance, useChainId, useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { walletRuntimeConfigured } from "./config";

export type FundingBalanceStatus =
  | "DISCONNECTED"
  | "WRONG_NETWORK"
  | "CONFIGURATION_MISSING"
  | "CHECKING"
  | "UNAVAILABLE"
  | "INSUFFICIENT"
  | "READY";

export type FundingBalanceItem = {
  key: "NATIVE" | "COLLATERAL";
  label: string;
  copy: string;
  ready: boolean;
};

export type FundingBalanceSnapshot = {
  status: FundingBalanceStatus;
  ready: boolean;
  balancesMeasured: boolean;
  fundingNeeded: boolean;
  message: string;
  items: readonly [FundingBalanceItem, FundingBalanceItem];
  nativeBalanceAtoms: bigint | undefined;
  collateralBalanceAtoms: bigint | undefined;
};

type SnapshotInput = {
  addressPresent: boolean;
  isConnected: boolean;
  chainId: number;
  collateralAddressConfigured: boolean;
  nativeMinimum: string | undefined;
  collateralMinimum: string | undefined;
  nativeMinimumAtoms: bigint | null;
  collateralMinimumAtoms: bigint | null;
  nativeBalance: bigint | undefined;
  collateralBalance: bigint | undefined;
  checking: boolean;
  failed: boolean;
};

function minimumAtoms(value: string | undefined, decimals: number) {
  try {
    return value ? decimalToAtoms(value, decimals) : null;
  } catch {
    return null;
  }
}

function fundingBalanceSnapshot(input: SnapshotInput): FundingBalanceSnapshot {
  const nativeReady = input.nativeMinimumAtoms !== null
    && input.nativeBalance !== undefined
    && input.nativeBalance >= input.nativeMinimumAtoms;
  const collateralReady = input.collateralMinimumAtoms !== null
    && input.collateralBalance !== undefined
    && input.collateralBalance >= input.collateralMinimumAtoms;
  const balancesMeasured = input.nativeBalance !== undefined
    && input.collateralBalance !== undefined
    && input.nativeMinimumAtoms !== null
    && input.collateralMinimumAtoms !== null;
  const items = [
    {
      key: "NATIVE" as const,
      label: "Sepolia ETH",
      copy: input.nativeBalance !== undefined
        ? `${formatEther(input.nativeBalance)} ETH${input.nativeMinimum ? ` / trading minimum ${input.nativeMinimum}` : " / minimum not configured"}`
        : input.checking ? "Measuring onchain balance…" : "Balance unavailable",
      ready: nativeReady,
    },
    {
      key: "COLLATERAL" as const,
      label: "Test USDC",
      copy: input.collateralBalance !== undefined
        ? `${formatUnits(input.collateralBalance, TEST_USDC_DECIMALS)} USDC${input.collateralMinimum ? ` / trading minimum ${input.collateralMinimum}` : " / minimum not configured"}`
        : input.collateralAddressConfigured
          ? input.checking ? "Measuring onchain balance…" : "Balance unavailable"
          : "Token address not configured",
      ready: collateralReady,
    },
  ] as const;
  const measured = {
    nativeBalanceAtoms: input.nativeBalance,
    collateralBalanceAtoms: input.collateralBalance,
  };

  if (!input.isConnected || !input.addressPresent) {
    return { status: "DISCONNECTED", ready: false, balancesMeasured, fundingNeeded: false, message: "Connect one wallet to verify its real Sepolia ETH and Test USDC balances.", items, ...measured };
  }
  if (input.chainId !== sepolia.id) {
    return { status: "WRONG_NETWORK", ready: false, balancesMeasured, fundingNeeded: false, message: "Switch the connected wallet to Ethereum Sepolia before reviewing an order.", items, ...measured };
  }
  if (!walletRuntimeConfigured || !input.collateralAddressConfigured || input.nativeMinimumAtoms === null || input.collateralMinimumAtoms === null) {
    return { status: "CONFIGURATION_MISSING", ready: false, balancesMeasured, fundingNeeded: false, message: "This deployment cannot verify its Test ETH and Test USDC trading minimums. Trading remains disabled until test-funding configuration is available.", items, ...measured };
  }
  if (input.failed) {
    return { status: "UNAVAILABLE", ready: false, balancesMeasured, fundingNeeded: false, message: "The current onchain balances could not be verified. Retry from the test-funding page before trading.", items, ...measured };
  }
  if (input.checking || !balancesMeasured) {
    return { status: "CHECKING", ready: false, balancesMeasured, fundingNeeded: false, message: "Checking the wallet’s real Sepolia ETH and Test USDC balances before trading.", items, ...measured };
  }
  if (!nativeReady || !collateralReady) {
    const missing = [!nativeReady ? "Sepolia ETH" : null, !collateralReady ? "Test USDC" : null].filter(Boolean).join(" and ");
    const verb = !nativeReady && !collateralReady ? "are" : "is";
    return { status: "INSUFFICIENT", ready: false, balancesMeasured, fundingNeeded: true, message: `${missing} ${verb} below this deployment’s configured trading minimum. Request an explicit bounded top-up before reviewing the order.`, items, ...measured };
  }
  return { status: "READY", ready: true, balancesMeasured, fundingNeeded: false, message: "Sepolia gas and Test USDC are ready for the normal wallet-signed order flow.", items, ...measured };
}

export function useFundingBalanceReadiness() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const collateralAddressValue = process.env.NEXT_PUBLIC_TEST_USDC_ADDRESS?.trim();
  const collateralAddress = collateralAddressValue && isAddress(collateralAddressValue) ? collateralAddressValue : undefined;
  // These are readiness floors, not the treasury's larger top-up targets. Spending one normal
  // order must not immediately relabel a correctly funded wallet as underfunded.
  const nativeMinimum = process.env.NEXT_PUBLIC_TRADING_MIN_ETH?.trim();
  const collateralMinimum = process.env.NEXT_PUBLIC_TRADING_MIN_USDC?.trim();
  const nativeMinimumAtoms = minimumAtoms(nativeMinimum, 18);
  const collateralMinimumAtoms = minimumAtoms(collateralMinimum, TEST_USDC_DECIMALS);
  const nativeBalance = useBalance({
    address,
    chainId: sepolia.id,
    query: { enabled: Boolean(address && walletRuntimeConfigured) },
  });
  const collateralBalance = useReadContract({
    address: collateralAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: Boolean(address && collateralAddress && walletRuntimeConfigured) },
  });

  const snapshotFor = useCallback((input: {
    native: bigint | undefined;
    collateral: bigint | undefined;
    checking: boolean;
    failed: boolean;
  }) => fundingBalanceSnapshot({
    addressPresent: Boolean(address),
    isConnected,
    chainId,
    collateralAddressConfigured: Boolean(collateralAddress),
    nativeMinimum,
    collateralMinimum,
    nativeMinimumAtoms,
    collateralMinimumAtoms,
    nativeBalance: input.native,
    collateralBalance: input.collateral,
    checking: input.checking,
    failed: input.failed,
  }), [address, chainId, collateralAddress, collateralMinimum, collateralMinimumAtoms, isConnected, nativeMinimum, nativeMinimumAtoms]);

  const snapshot = snapshotFor({
    native: nativeBalance.data?.value,
    collateral: typeof collateralBalance.data === "bigint" ? collateralBalance.data : undefined,
    checking: nativeBalance.isLoading || nativeBalance.isFetching || collateralBalance.isLoading || collateralBalance.isFetching,
    failed: Boolean(nativeBalance.error || collateralBalance.error),
  });

  const refetchBalances = useCallback(async () => {
    if (!address || !collateralAddress || !walletRuntimeConfigured) return snapshot;
    const [nativeResult, collateralResult] = await Promise.all([
      nativeBalance.refetch(),
      collateralBalance.refetch(),
    ]);
    return snapshotFor({
      native: nativeResult.data?.value,
      collateral: typeof collateralResult.data === "bigint" ? collateralResult.data : undefined,
      checking: nativeResult.isFetching || collateralResult.isFetching,
      failed: Boolean(nativeResult.error || collateralResult.error),
    });
  }, [address, collateralAddress, collateralBalance, nativeBalance, snapshot, snapshotFor]);

  return {
    address,
    isConnected,
    chainId,
    collateralAddress,
    ...snapshot,
    refetchBalances,
  };
}
