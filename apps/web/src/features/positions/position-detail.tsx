"use client";

import {
  buildRedeemPositionsTransaction,
  buildResolveMarketTransaction,
  fixedProductMarketMakerAbi,
  type PositionView,
} from "@noxlimit/protocol";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Address, Hex } from "viem";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getActivity, getMarketDetail, getPositions } from "@/lib/api/client";
import { sendAndConfirm, TerminalTransactionError, UnconfirmedTransactionError, type ReceiptProgress } from "@/lib/wallet/transaction";
import { usePendingWrite } from "@/lib/wallet/use-pending-write";
import { findResolutionEvidence } from "./resolution-evidence";

type PositionAction = "RESOLVE" | "REDEEM";
const POSITION_ACTIONS = ["RESOLVE", "REDEEM"] as const;
const POSITION_ACTION_LABEL: Readonly<Record<PositionAction, string>> = {
  RESOLVE: "Objective resolution",
  REDEEM: "Redemption",
};

export function PositionDetail({ positionId }: { positionId: string }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const { data: walletClient } = useWalletClient({ chainId: sepolia.id });
  const [progress, setProgress] = useState<ReceiptProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"RESOLVE" | "REDEEM" | null>(null);
  const [resolutionReceiptHash, setResolutionReceiptHash] = useState<Hex | null>(null);
  const [redemptionReceiptHash, setRedemptionReceiptHash] = useState<Hex | null>(null);
  const pendingWrite = usePendingWrite({
    storageKey: `noxlimit:pending-position-action:${positionId}`,
    kinds: POSITION_ACTIONS,
    publicClient,
    poll: busy === null,
  });
  const positions = useQuery({ queryKey: ["positions", address], queryFn: () => getPositions(address!), enabled: Boolean(address), retry: false, refetchInterval: 12_000 });
  const position: PositionView | undefined = positions.data?.state === "ready" ? positions.data.data.find((item) => item.positionId === positionId) : undefined;
  const market = useQuery({ queryKey: ["market", position?.marketId], queryFn: () => getMarketDetail(position!.marketId), enabled: Boolean(position), retry: false, refetchInterval: 8_000 });
  const marketActivity = useQuery({ queryKey: ["market-activity", position?.marketId], queryFn: () => getActivity({ marketId: position!.marketId }), enabled: Boolean(position), retry: false, refetchInterval: 12_000 });
  const resolution = useQuery({
    queryKey: ["resolution-evidence", market.data?.state === "ready" ? market.data.data.contracts.resolver : undefined],
    enabled: Boolean(publicClient && market.data?.state === "ready"),
    retry: false,
    refetchInterval: (entry) => entry.state.data?.state === "NOT_READY" ? 15_000 : false,
    queryFn: async () => {
      if (!publicClient || market.data?.state !== "ready") throw new Error("The verified resolver binding is unavailable.");
      return findResolutionEvidence({
        client: publicClient,
        resolver: market.data.data.contracts.resolver,
        strikeUsd: market.data.data.strikeUsd,
        oracleSource: market.data.data.oracle.source,
      });
    },
  });
  useEffect(() => {
    const receipt = pendingWrite.receipt.data;
    const pending = pendingWrite.pending;
    if (!receipt || !pending) return;
    if (receipt.status === "success") {
      if (pending.kind === "RESOLVE") setResolutionReceiptHash(pending.hash);
      else setRedemptionReceiptHash(pending.hash);
      setProgress(null);
      setError(null);
      void Promise.all([positions.refetch(), market.refetch(), marketActivity.refetch(), resolution.refetch()]);
      return;
    }
    pendingWrite.clear();
    setProgress(null);
    setError("The submitted position transaction reverted onchain. Its receipt is final, so this exact action may be reviewed again safely.");
  }, [pendingWrite.receipt.data, pendingWrite.pending]);
  useEffect(() => {
    const pending = pendingWrite.pending;
    if (!pending || !position) return;
    const canonicalProjectionAdvanced = pending.kind === "RESOLVE"
      ? position.state !== "OPEN" && position.state !== "AWAITING_RESOLUTION"
      : position.state === "REDEEMED";
    if (canonicalProjectionAdvanced) pendingWrite.clear();
  }, [pendingWrite.pending, position?.state]);

  if (!address) return <section className="data-state"><h1>Connect the owning wallet</h1><p>Positions are wallet-scoped confirmed projections.</p></section>;
  if (positions.isPending) return <section className="data-state" role="status">Loading position evidence…</section>;
  if (!position) return <section className="data-state"><h1>Position unavailable</h1><p>{positions.data?.state !== "ready" ? positions.data?.message : "This wallet does not own the requested projected position."}</p><Link className="button secondary" href="/positions">Back to positions</Link></section>;

  const resolveMarket = async () => {
    if (!pendingWrite.hydrated || pendingWrite.pending || resolution.data?.state !== "READY" || market.data?.state !== "ready" || !walletClient || !publicClient || chainId !== sepolia.id) return;
    setBusy("RESOLVE"); setError(null); setProgress(null);
    let broadcasted = false;
    try {
      const confirmation = await sendAndConfirm({
        walletClient,
        publicClient,
        account: address,
        transaction: buildResolveMarketTransaction({
          resolver: market.data.data.contracts.resolver,
          selectedRoundId: resolution.data.selectedRoundId,
          predecessorRoundId: resolution.data.predecessorRoundId,
        }),
        onProgress(nextProgress) {
          setProgress(nextProgress);
          if (nextProgress.state === "SUBMITTED" || nextProgress.state === "REPLACED") {
            broadcasted = true;
            pendingWrite.record("RESOLVE", nextProgress);
          }
        },
      });
      setResolutionReceiptHash(confirmation.hash);
      await Promise.all([resolution.refetch(), market.refetch(), marketActivity.refetch(), positions.refetch()]);
    } catch (reason) {
      if (reason instanceof UnconfirmedTransactionError || (broadcasted && !(reason instanceof TerminalTransactionError))) {
        setError(null);
        return;
      }
      if (reason instanceof TerminalTransactionError) pendingWrite.clear();
      setError(reason instanceof Error ? reason.message : "Objective resolution failed.");
    } finally {
      setBusy(null);
    }
  };

  const redeem = async () => {
    if (!pendingWrite.hydrated || pendingWrite.pending || position.state !== "REDEEMABLE" || market.data?.state !== "ready" || !walletClient || !publicClient || chainId !== sepolia.id) return;
    setBusy("REDEEM"); setError(null); setProgress(null);
    let broadcasted = false;
    try {
      const fpmm = market.data.data.contracts.fpmm;
      const [conditionalTokens, collateral] = await Promise.all([
        publicClient.readContract({ address: fpmm, abi: fixedProductMarketMakerAbi, functionName: "conditionalTokens" }),
        publicClient.readContract({ address: fpmm, abi: fixedProductMarketMakerAbi, functionName: "collateralToken" }),
      ]);
      const confirmation = await sendAndConfirm({ walletClient, publicClient, account: address, transaction: buildRedeemPositionsTransaction({ conditionalTokens: conditionalTokens as Address, collateral: collateral as Address, conditionId: market.data.data.contracts.conditionId }), onProgress(nextProgress) {
        setProgress(nextProgress);
        if (nextProgress.state === "SUBMITTED" || nextProgress.state === "REPLACED") {
          broadcasted = true;
          pendingWrite.record("REDEEM", nextProgress);
        }
      } });
      setRedemptionReceiptHash(confirmation.hash);
      await Promise.all([positions.refetch(), marketActivity.refetch()]);
    } catch (reason) {
      if (reason instanceof UnconfirmedTransactionError || (broadcasted && !(reason instanceof TerminalTransactionError))) {
        setError(null);
        return;
      }
      if (reason instanceof TerminalTransactionError) pendingWrite.clear();
      setError(reason instanceof Error ? reason.message : "Redemption failed.");
    } finally {
      setBusy(null);
    }
  };

  const evidence = resolution.data;
  const indexedActivity = marketActivity.data?.state === "ready" ? marketActivity.data.data : [];
  const resolutionActivity = indexedActivity.find((activity) => activity.kind === "MARKET_RESOLVED");
  const redemptionActivity = indexedActivity.find((activity) => activity.kind === "POSITION_REDEEMED" && activity.actor?.toLowerCase() === address.toLowerCase());
  return <section className="data-state detail-page">
    <span className="eyebrow">Owned outcome · {position.positionId}</span>
    <h1>{position.side} position</h1>
    <div className="status-banner"><strong>{position.state.replaceAll("_", " ")}</strong><span>{position.shares} shares</span></div>
    {market.data?.state === "ready" ? <div className="notice"><strong><Link href={`/markets/${market.data.data.marketId}`}>{market.data.data.question}</Link></strong><p>Strike {market.data.data.strikeUsd} USD · objective resolution {new Date(market.data.data.resolvesAt).toLocaleString()}.</p></div> : null}
    <dl className="detail-grid"><div><dt>Collateral spent</dt><dd>{position.collateralSpent}</dd></div><div><dt>Realized average</dt><dd>{position.realizedAveragePrice}</dd></div><div><dt>Maximum redemption</dt><dd>{position.maximumRedemption}</dd></div><div><dt>Fill transaction</dt><dd><a href={`https://sepolia.etherscan.io/tx/${position.fillTransactionHash}`} target="_blank" rel="noreferrer">{position.fillTransactionHash.slice(0, 12)}…</a></dd></div></dl>

    {resolutionActivity ? <div className="notice indexed-lifecycle-evidence"><strong>Indexed resolution receipt · {resolutionActivity.side ?? "Outcome"} won</strong><p><a href={`https://sepolia.etherscan.io/tx/${resolutionActivity.transactionHash}`} target="_blank" rel="noreferrer">View transaction {resolutionActivity.transactionHash.slice(0, 12)}…</a> · Sepolia block {resolutionActivity.blockNumber} · {new Date(resolutionActivity.occurredAt).toLocaleString()}.</p></div> : null}
    {position.state === "REDEEMED" && redemptionActivity ? <div className="notice indexed-lifecycle-evidence"><strong>{redemptionActivity.amount ? `Indexed redemption payout · ${redemptionActivity.amount} Test USDC` : "Indexed redemption payout · amount unavailable"}</strong><p>This is the wallet’s market-level Conditional Tokens payout for this condition; if it held multiple outcome positions, the receipt covers their combined winning collateral.</p><p><a href={`https://sepolia.etherscan.io/tx/${redemptionActivity.transactionHash}`} target="_blank" rel="noreferrer">View transaction {redemptionActivity.transactionHash.slice(0, 12)}…</a> · Sepolia block {redemptionActivity.blockNumber} · {new Date(redemptionActivity.occurredAt).toLocaleString()}.</p></div> : position.state === "REDEEMED" ? <div className="notice warning" role="status"><strong>Redemption projection is catching up</strong><p>The position is consumed onchain, but its market-level payout receipt is not yet in the current safe-block Activity projection.</p></div> : null}

    {pendingWrite.pending ? <div className="notice warning" role="status"><strong>{POSITION_ACTION_LABEL[pendingWrite.pending.kind]} {pendingWrite.receipt.data?.status === "success" ? "confirmed; projection catching up" : "transaction remains locked"}</strong><p>{pendingWrite.receipt.data?.status === "success" ? "The receipt is final. NoxLimit keeps this action locked until the canonical safe-block position projection advances." : "This exact transaction may still confirm."} NoxLimit is checking <a href={`https://sepolia.etherscan.io/tx/${pendingWrite.pending.hash}`} target="_blank" rel="noreferrer">{pendingWrite.pending.hash.slice(0, 12)}…</a> and will not expose another {pendingWrite.pending.kind.toLowerCase()} action.</p><button className="button secondary" type="button" disabled={pendingWrite.receipt.isFetching} onClick={() => void pendingWrite.receipt.refetch()}>{pendingWrite.receipt.isFetching ? "Checking exact receipt…" : "Check exact receipt"}</button></div> : null}
    {resolution.isPending ? <div className="notice" role="status"><strong>Checking objective resolver evidence…</strong></div> : null}
    {resolution.error instanceof Error ? <div className="notice warning" role="alert"><strong>Resolver evidence unavailable</strong><p>{resolution.error.message}</p></div> : null}
    {evidence?.state === "READY" ? <div className="resolution-evidence" data-safe-block-number={evidence.safeBlockNumber.toString()} data-safe-block-hash={evidence.safeBlockHash}><span className="eyebrow">Resolver ready</span><h2>First valid observation: {evidence.settlementPriceUsd} USD</h2><p>Expected winner: <strong>{evidence.expectedWinner}</strong>. Selected round {evidence.selectedRoundId.toString()} at {new Date(Number(evidence.selectedObservedAt) * 1_000).toLocaleString()}; adjacent predecessor {evidence.predecessorRoundId.toString()} at {new Date(Number(evidence.predecessorObservedAt) * 1_000).toLocaleString()}.</p><p>Evidence snapshot: Sepolia safe block {evidence.safeBlockNumber.toString()} ({evidence.safeBlockHash.slice(0, 12)}…) at {new Date(Number(evidence.safeBlockTimestamp) * 1_000).toLocaleString()}.</p><p>The resolver contract rechecks adjacency, chronology, and the immutable observation-delay bound before reporting payouts.</p><button className="button primary" type="button" disabled={!pendingWrite.hydrated || Boolean(pendingWrite.pending) || busy !== null || chainId !== sepolia.id} onClick={resolveMarket}>{busy === "RESOLVE" ? "Confirming objective resolution…" : "Resolve market with this evidence"}</button></div> : null}
    {resolutionReceiptHash ? <div className="notice" role="status"><strong>Objective resolution receipt confirmed</strong><p><a href={`https://sepolia.etherscan.io/tx/${resolutionReceiptHash}`} target="_blank" rel="noreferrer">View transaction {resolutionReceiptHash.slice(0, 12)}…</a></p></div> : null}
    {evidence?.state === "RESOLVED" ? <div className="resolution-evidence" data-safe-block-number={evidence.safeBlockNumber.toString()} data-safe-block-hash={evidence.safeBlockHash}><span className="eyebrow">Objectively resolved</span><h2>{evidence.winner} won at {evidence.settlementPriceUsd} USD</h2><p>Accepted Chainlink round {evidence.selectedRoundId.toString()} at {new Date(Number(evidence.selectedObservedAt) * 1_000).toLocaleString()}, with predecessor {evidence.predecessorRoundId.toString()}.</p><p>Confirmed from Sepolia safe block {evidence.safeBlockNumber.toString()} ({evidence.safeBlockHash.slice(0, 12)}…).</p></div> : null}
    {evidence && (evidence.state === "NOT_READY" || evidence.state === "NO_ACCEPTED_OBSERVATION" || evidence.state === "UNAVAILABLE") ? <div className={`notice ${evidence.state === "NOT_READY" ? "" : "warning"}`}><strong>{evidence.state.replaceAll("_", " ")}</strong><p>{evidence.detail}</p></div> : null}
    {position.state === "AWAITING_RESOLUTION" && !evidence ? <div className="notice"><strong>Awaiting objective resolution</strong><p>NoxLimit will not invent oracle round IDs. The browser is checking the bound resolver and public feed directly.</p></div> : null}
    {position.state === "SETTLED_ZERO" ? <div className="notice"><strong>This side did not win</strong><p>The objective resolver reported the opposite outcome, so these shares redeem for zero.</p></div> : null}
    {position.state === "REDEEMABLE" ? <button className="button primary" disabled={!pendingWrite.hydrated || Boolean(pendingWrite.pending) || redemptionReceiptHash !== null || busy !== null || market.data?.state !== "ready" || chainId !== sepolia.id} onClick={redeem}>{busy === "REDEEM" ? "Confirming redemption…" : "Redeem winning shares"}</button> : null}
    {redemptionReceiptHash && !redemptionActivity ? <div className="notice" role="status"><strong>Redemption receipt confirmed</strong><p><a href={`https://sepolia.etherscan.io/tx/${redemptionReceiptHash}`} target="_blank" rel="noreferrer">View transaction {redemptionReceiptHash.slice(0, 12)}…</a>. Final collateral movement remains tied to the indexed onchain receipt.</p></div> : null}
    {progress?.state === "REPLACED" ? <div className="notice">Tracking replacement transaction ({progress.reason}).</div> : null}
    {progress?.state === "UNCONFIRMED" && !pendingWrite.pending ? <div className="notice warning">Receipt is unconfirmed. The exact submitted hash remains the only action NoxLimit will check.</div> : null}
    {error ? <div className="notice warning" role="alert">{error}</div> : null}
  </section>;
}
