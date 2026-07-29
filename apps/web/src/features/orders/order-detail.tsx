"use client";

import {
  buildCancelOrderTransaction,
  buildExpireOrderTransaction,
  buildRefundOrderTransaction,
  noxLimitOrderBookAbi,
  type ActivityView,
  type OrderRef,
  type OrderView,
  type UnsignedContractTransaction,
} from "@noxlimit/protocol";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { zeroAddress, type Address, type Hex } from "viem";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getActivity, getMarketDetail, getOrder } from "@/lib/api/client";
import { sendAndConfirm, TerminalTransactionError, UnconfirmedTransactionError, type ReceiptProgress } from "@/lib/wallet/transaction";
import { usePendingWrite } from "@/lib/wallet/use-pending-write";
import { durableOrderActivity } from "@/features/activity/durable-evidence";
import { confirmedOrderReceiptQueryKey, type ConfirmedOrderReceipt } from "./confirmed-order-receipt";

type Action = "cancel" | "expire" | "refund";
const ORDER_ACTIONS = ["cancel", "expire", "refund"] as const;

const ACTION_LABEL: Readonly<Record<Action, string>> = {
  cancel: "Cancel order",
  expire: "Expire order",
  refund: "Claim refund",
};

function transactionFor(action: Action, ref: OrderRef): UnsignedContractTransaction {
  if (action === "cancel") return buildCancelOrderTransaction(ref);
  if (action === "expire") return buildExpireOrderTransaction(ref);
  return buildRefundOrderTransaction(ref);
}

function actions(order: OrderView): readonly Action[] {
  if (["RESTING_PRIVATELY", "EVALUATING", "MONITORING_EXHAUSTED"].includes(order.status)) return ["cancel"];
  if (order.status === "EXPIRY_READY") return ["expire"];
  if (["CANCELLED", "EXPIRED", "DISCLOSED_REFUNDABLE"].includes(order.status)) return ["refund"];
  return [];
}

export function OrderDetail({ refValue }: { refValue: OrderRef }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const { data: walletClient } = useWalletClient({ chainId: sepolia.id });
  const [progress, setProgress] = useState<ReceiptProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmedAction, setConfirmedAction] = useState<{ action: Action; hash: Hex } | null>(null);
  const queryClient = useQueryClient();
  const receiptHint = queryClient.getQueryData<ConfirmedOrderReceipt>(confirmedOrderReceiptQueryKey(refValue));
  const indexingWindowStartedAt = useRef(Date.now());
  const withinIndexingWindow = () => Date.now() - indexingWindowStartedAt.current < 60_000;
  const query = useQuery({
    queryKey: ["order", refValue],
    queryFn: () => getOrder(refValue),
    retry: false,
    refetchInterval: (entry) => entry.state.data?.state === "ready" ? 10_000 : withinIndexingWindow() ? 2_000 : false,
  });
  const pendingWrite = usePendingWrite({
    storageKey: `noxlimit:pending-order-action:${refValue.chainId}:${refValue.orderBook.toLowerCase()}:${refValue.orderId}`,
    kinds: ORDER_ACTIONS,
    publicClient,
    poll: !busy,
  });
  const market = useQuery({
    queryKey: ["market", query.data?.state === "ready" ? query.data.data.marketId : undefined],
    enabled: query.data?.state === "ready",
    retry: false,
    queryFn: () => getMarketDetail(query.data!.state === "ready" ? query.data!.data.marketId : ""),
  });
  const indexedActivity = useQuery({
    queryKey: ["order-activity", query.data?.state === "ready" ? query.data.data.marketId : undefined, refValue],
    enabled: query.data?.state === "ready",
    retry: false,
    refetchInterval: 12_000,
    queryFn: () => getActivity({ marketId: query.data!.state === "ready" ? query.data!.data.marketId : "" }),
  });
  const onchain = useQuery({
    queryKey: ["order-onchain-existence", refValue],
    enabled: Boolean(publicClient && query.data?.state !== "ready"),
    retry: false,
    queryFn: async () => {
      if (!publicClient) return null;
      const orderId = BigInt(refValue.orderId);
      const [onchainOwner, status] = await Promise.all([
        publicClient.readContract({ address: refValue.orderBook, abi: noxLimitOrderBookAbi, functionName: "ownerOf", args: [orderId] }),
        publicClient.readContract({ address: refValue.orderBook, abi: noxLimitOrderBookAbi, functionName: "statusOf", args: [orderId] }),
      ]);
      return onchainOwner === zeroAddress ? null : { owner: onchainOwner as Address, status: Number(status) };
    },
    refetchInterval: () => withinIndexingWindow() ? 4_000 : false,
  });
  useEffect(() => {
    const receipt = pendingWrite.receipt.data;
    const pending = pendingWrite.pending;
    if (!receipt || !pending) return;
    if (receipt.status === "success") {
      setConfirmedAction({ action: pending.kind, hash: pending.hash });
      setProgress(null);
      setError(null);
      pendingWrite.clear();
      void Promise.all([query.refetch(), indexedActivity.refetch()]);
      return;
    }
    pendingWrite.clear();
    setProgress(null);
    setError("The submitted recovery transaction reverted onchain. Its receipt is final, so this exact action may be reviewed again safely.");
  }, [pendingWrite.receipt.data, pendingWrite.pending]);
  if (query.isPending && !receiptHint && onchain.isPending) return <section className="data-state" role="status">Loading durable order from the indexer and OrderBook…</section>;
  if (query.data?.state !== "ready") {
    const confirmedOnchain = receiptHint || onchain.data;
    const unavailableMessage = query.data?.message ?? (onchain.error instanceof Error ? onchain.error.message : "The order projection could not be loaded.");
    return <section className="data-state">
      <span className="eyebrow">Composite order · Sepolia / {refValue.orderBook} / {refValue.orderId}</span>
      <h1>{confirmedOnchain ? "Order confirmed; indexer catching up" : "Order unavailable"}</h1>
      {confirmedOnchain ? <>
        <p>The OrderBook confirms this public order identity, but the full service projection is not ready. NoxLimit will not infer a missing lifecycle or ask you to submit the escrow transaction again.</p>
        {receiptHint ? <div className="notice"><strong>{receiptHint.side} · {receiptHint.amountIn} Test USDC</strong><p>Creation receipt <a href={`https://sepolia.etherscan.io/tx/${receiptHint.transactionHash}`} target="_blank" rel="noreferrer">{receiptHint.transactionHash.slice(0, 12)}…</a></p></div> : null}
        {onchain.data ? <div className="notice"><strong>Onchain order exists</strong><p>Owner {onchain.data.owner}. Raw contract status {onchain.data.status}; the product label waits for the canonical projection.</p></div> : null}
      </> : <p>{unavailableMessage}</p>}
      <div className="next-actions"><button className="button primary" type="button" onClick={() => void query.refetch()}>Check indexer again</button><Link className="button secondary" href="/orders">Back to orders</Link></div>
    </section>;
  }
  const order = query.data.data;
  const owner = Boolean(address && order.owner.toLowerCase() === address.toLowerCase());
  const replacementQuery = new URLSearchParams({ side: order.side, amount: order.amountIn });
  const replacementHref = `/markets/${order.marketId}?${replacementQuery}`;
  const submit = async (action: Action) => {
    if (!pendingWrite.hydrated || pendingWrite.pending || !address || !owner || !walletClient || !publicClient || chainId !== sepolia.id) return;
    setBusy(true); setError(null); setProgress(null);
    let broadcasted = false;
    try {
      const confirmation = await sendAndConfirm({ walletClient, publicClient, account: address, transaction: transactionFor(action, order.ref), onProgress(nextProgress) {
        setProgress(nextProgress);
        if (nextProgress.state === "SUBMITTED" || nextProgress.state === "REPLACED") {
          broadcasted = true;
          pendingWrite.record(action, nextProgress);
        }
      } });
      pendingWrite.clear();
      setConfirmedAction({ action, hash: confirmation.hash });
      await Promise.all([query.refetch(), indexedActivity.refetch()]);
    } catch (reason) {
      if (reason instanceof UnconfirmedTransactionError || (broadcasted && !(reason instanceof TerminalTransactionError))) {
        setError(null);
        return;
      }
      if (reason instanceof TerminalTransactionError) pendingWrite.clear();
      setError(reason instanceof Error ? reason.message : "The transaction failed.");
    }
    finally { setBusy(false); }
  };
  const orderActivity = durableOrderActivity(
    indexedActivity.data?.state === "ready" ? indexedActivity.data.data : [],
    order.ref,
  );
  return <section className="data-state detail-page">
    <span className="eyebrow">Composite order · Sepolia / {order.ref.orderBook} / {order.ref.orderId}</span>
    <h1>{order.side} private order</h1>
    <p><Link href={`/markets/${order.marketId}`}>{market.data?.state === "ready" ? market.data.data.question : "Open the exact market"}</Link></p>
    <div className="status-banner"><strong>{order.status.replaceAll("_", " ")}</strong><span>{order.disclosureState === "ENCRYPTED" ? "Derived minimum-share bound remains encrypted" : "Derived minimum-share bound has been disclosed"}</span></div>
    {["RESTING_PRIVATELY", "EVALUATING", "MONITORING_EXHAUSTED"].includes(order.status) ? <div className="notice"><strong>Monitoring continues after this browser closes</strong><p>The hosted evaluator resumes from the public OrderBook state and bounded monitoring budget. Return to this composite order for confirmed lifecycle and recovery actions.</p></div> : null}
    {order.status === "PUBLICATION_PENDING" ? <div className="notice warning"><strong>Publication is in progress</strong><p>The candidate may become publicly retrievable. Owner cancellation is intentionally unavailable in this state.</p></div> : null}
    {order.status === "MONITORING_EXHAUSTED" ? <div className="notice warning"><strong>Private monitoring is exhausted</strong><p>Replace safely in stages: cancel this escrow first, then claim its refund as a separate confirmed transaction. Only after refund should you reopen this exact market with the same public side and amount; the private maximum is never copied.</p></div> : null}
    {order.disclosureState === "PUBLISHED" ? <div className="notice warning"><strong>Threshold disclosure is permanent</strong><p>Material: {order.publicationMaterialState.replaceAll("_", " ")}. {order.publishedMinShares ? `Published minimum shares: ${order.publishedMinShares}.` : "The public value is not yet available from the indexer."}</p></div> : null}
    <dl className="detail-grid"><div><dt>Public collateral</dt><dd>{order.amountIn} Test USDC</dd></div><div><dt>Immutable recipient</dt><dd>{order.recipient}</dd></div><div><dt>Market bundle version</dt><dd>{market.data?.state === "ready" ? market.data.data.contracts.version : "Loading verified bundle…"}</dd></div><div><dt>Checks used / remaining</dt><dd>{order.evaluationCount} used · {order.remainingEvaluations} remaining · {order.maximumEvaluations} maximum</dd></div><div><dt>Last evaluation</dt><dd>{order.lastEvaluationAt ? new Date(order.lastEvaluationAt).toLocaleString() : "No completed check yet"}</dd></div><div><dt>Next evaluation eligible</dt><dd>{order.nextEvaluationEligibleAt ? new Date(order.nextEvaluationEligibleAt).toLocaleString() : "Not currently scheduled"}</dd></div><div><dt>Expires</dt><dd>{new Date(order.expiresAt).toLocaleString()}</dd></div><div><dt>NoxLimit orders close</dt><dd>{new Date(order.tradingClosesAt).toLocaleString()}</dd></div><div><dt>Created</dt><dd>{new Date(order.createdAt).toLocaleString()}</dd></div><div><dt>Creation receipt</dt><dd><a href={`https://sepolia.etherscan.io/tx/${order.transactionHash}`} target="_blank" rel="noreferrer">{order.transactionHash.slice(0, 12)}…</a></dd></div></dl>
    <ol className="order-timeline" aria-label="Order lifecycle evidence">{orderActivity.map((activity: ActivityView) => <li key={activity.activityId}><strong>{activity.kind.replaceAll("_", " ")}</strong><span>{new Date(activity.occurredAt).toLocaleString()} · block {activity.blockNumber} · log {activity.logIndex} · <a href={`https://sepolia.etherscan.io/tx/${activity.transactionHash}`} target="_blank" rel="noreferrer">transaction {activity.transactionHash.slice(0, 12)}…</a>{activity.amount ? ` · ${activity.amount}${activity.kind === "ORDER_FILLED" ? " shares" : " Test USDC"}` : ""}</span></li>)}</ol>
    {indexedActivity.isPending ? <div className="notice" role="status">Loading indexed order history…</div> : null}
    {indexedActivity.data?.state !== "ready" && !indexedActivity.isPending ? <div className="notice warning" role="status">Indexed event history is temporarily unavailable. The current order snapshot and direct creation receipt remain visible.</div> : null}
    {indexedActivity.data?.state === "ready" && orderActivity.length === 0 ? <div className="notice" role="status">The safe-block indexer has not reached this order’s event history yet.</div> : null}
    {!address ? <p className="notice">Connect the owner wallet to recover or refund this order.</p> : !owner ? <p className="notice warning">Connected wallet is not the order owner. Actions are read-only.</p> : chainId !== sepolia.id ? <p className="notice warning">Switch to Ethereum Sepolia to act.</p> : null}
    {pendingWrite.pending ? <div className="notice warning" role="status"><strong>{ACTION_LABEL[pendingWrite.pending.kind]} transaction remains locked</strong><p>This exact transaction may still confirm. NoxLimit is checking <a href={`https://sepolia.etherscan.io/tx/${pendingWrite.pending.hash}`} target="_blank" rel="noreferrer">{pendingWrite.pending.hash.slice(0, 12)}…</a> and will not expose another {ACTION_LABEL[pendingWrite.pending.kind].toLowerCase()} action.</p><button className="button secondary" type="button" disabled={pendingWrite.receipt.isFetching} onClick={() => void pendingWrite.receipt.refetch()}>{pendingWrite.receipt.isFetching ? "Checking exact receipt…" : "Check exact receipt"}</button></div> : null}
    <div className="detail-actions">{actions(order).map((action) => <button key={action} className="button primary" disabled={!pendingWrite.hydrated || Boolean(pendingWrite.pending) || busy || !owner || chainId !== sepolia.id} onClick={() => submit(action)}>{busy ? "Confirming wallet transaction…" : ACTION_LABEL[action]}</button>)}</div>
    {order.status === "FILLED" ? <p><Link className="button secondary" href="/positions">Open confirmed positions</Link></p> : null}
    {order.status === "EXPIRY_READY" ? <p className="small">Expire order is available after the order expiry or market close. Once expiry is confirmed, claim the refund as a separate transaction.</p> : null}
    {confirmedAction ? <div className="notice" role="status"><strong>{ACTION_LABEL[confirmedAction.action]} transaction confirmed</strong><p><a href={`https://sepolia.etherscan.io/tx/${confirmedAction.hash}`} target="_blank" rel="noreferrer">View transaction {confirmedAction.hash.slice(0, 12)}…</a>. The indexed lifecycle will update from chain evidence.</p>{confirmedAction.action === "cancel" ? <p>Claim refund remains a separate transaction and becomes available after the confirmed cancellation is indexed.</p> : null}{confirmedAction.action === "refund" ? <p><Link href={replacementHref}>Reopen exact market with public side and amount</Link>. Review the prefilled public values and enter a new private maximum.</p> : null}</div> : null}
    {progress?.state === "REPLACED" ? <div className="notice">Wallet replacement tracked ({progress.reason}): <a href={`https://sepolia.etherscan.io/tx/${progress.hash}`}>view transaction</a>.</div> : null}
    {progress?.state === "UNCONFIRMED" && !pendingWrite.pending ? <div className="notice warning">Receipt is unconfirmed. The exact submitted hash remains the only action NoxLimit will check.</div> : null}
    {error ? <div className="notice warning" role="alert">{error}</div> : null}
  </section>;
}
