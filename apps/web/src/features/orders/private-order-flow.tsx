"use client";

import {
  TEST_USDC_DECIMALS,
  atomsToDecimal,
  buildApproveCollateralTransaction,
  buildCreateOrderTransaction,
  decimalToAtoms,
  erc20Abi,
  maxPriceWadToMinOut,
  noxLimitOrderBookAbi,
  type MarketSide,
  type QuoteView,
  type UnsignedContractTransaction,
} from "@noxlimit/protocol";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { decodeEventLog, isAddress, type Address, type Hex, type TransactionReceipt } from "viem";
import { useRouter } from "next/navigation";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getMarketDetail, getQuote, publicApiConfigured } from "@/lib/api/client";
import { useHandleClient } from "@/lib/nox/use-handle-client";
import { walletRuntimeConfigured } from "@/lib/wallet/config";
import { useFundingBalanceReadiness } from "@/lib/wallet/use-funding-readiness";
import { sendAndConfirm, TerminalTransactionError, UnconfirmedTransactionError, type ReceiptProgress } from "@/lib/wallet/transaction";
import type { TerminalMarket } from "@/features/markets/terminal-market";
import { confirmedOrderReceiptQueryKey, type ConfirmedOrderReceipt } from "./confirmed-order-receipt";

type OrderStage = "EDITING" | "REVIEW" | "ENCRYPTING" | "APPROVING" | "CREATING" | "CONFIRMING" | "SUBMITTED_UNCONFIRMED" | "CONFIRMED" | "ERROR";
type Review = { quote: QuoteView; amountAtoms: bigint; minOut: bigint; expiresAt: bigint };
type PendingCreation = { hash: Hex; orderBook: Address; marketId: string; side: MarketSide; amountIn: string; account: Address; chainId: typeof sepolia.id };

function pendingCreationStorageKey(marketId: string) {
  return `noxlimit:submitted-create:${marketId.toLowerCase()}`;
}

function readPendingCreation(marketId: string): PendingCreation | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(pendingCreationStorageKey(marketId)) ?? "null") as Partial<PendingCreation> | null;
    if (!value || value.marketId?.toLowerCase() !== marketId.toLowerCase() || value.chainId !== sepolia.id) return null;
    if (!isAddress(value.orderBook ?? "") || !isAddress(value.account ?? "")) return null;
    if (!/^0x[0-9a-fA-F]{64}$/.test(value.hash ?? "") || (value.side !== "YES" && value.side !== "NO")) return null;
    if (!value.amountIn || decimalToAtoms(value.amountIn, TEST_USDC_DECIMALS) <= 0n) return null;
    return value as PendingCreation;
  } catch { return null; }
}

function storePendingCreation(value: PendingCreation) {
  if (typeof window !== "undefined") localStorage.setItem(pendingCreationStorageKey(value.marketId), JSON.stringify(value));
}

function clearPendingCreation(marketId: string) {
  if (typeof window !== "undefined") localStorage.removeItem(pendingCreationStorageKey(marketId));
}

function OutcomeGlyph({ side }: { side: MarketSide }) {
  return <span className={`outcome-glyph ${side.toLowerCase()}`} aria-hidden="true" />;
}

export function PrivateOrderFlow({ market, initialSide, initialAmount = "", onDirtyChange }: { market: TerminalMarket; initialSide: MarketSide; initialAmount?: string; onDirtyChange: (dirty: boolean) => void }) {
  const [side, setSide] = useState<MarketSide>(initialSide);
  const [amount, setAmount] = useState(initialAmount);
  const [privateMaximum, setPrivateMaximum] = useState("");
  const [expiryPreset, setExpiryPreset] = useState("30m");
  const [stage, setStage] = useState<OrderStage>("EDITING");
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<Hex | null>(null);
  const [pendingCreation, setPendingCreation] = useState<PendingCreation | null>(null);
  const [pendingCreationHydrated, setPendingCreationHydrated] = useState(false);
  const [receiptProgress, setReceiptProgress] = useState<ReceiptProgress | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const { data: walletClient } = useWalletClient({ chainId: sepolia.id });
  const funding = useFundingBalanceReadiness();
  const { handleClient, isPending: handlePending, error: handleError } = useHandleClient();
  const detail = useQuery({
    queryKey: ["market", market.marketId],
    queryFn: () => getMarketDetail(market.marketId),
    staleTime: 15_000,
    refetchInterval: stage === "REVIEW" ? 2_000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const monitoringPolicy = useQuery({
    queryKey: ["orderbook-monitoring-policy", detail.data?.state === "ready" ? detail.data.data.contracts.orderBook : undefined],
    enabled: Boolean(publicClient && detail.data?.state === "ready"),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      if (!publicClient || detail.data?.state !== "ready") throw new Error("OrderBook monitoring policy is unavailable.");
      const orderBook = detail.data.data.contracts.orderBook;
      const [maximumEvaluations, minimumEvaluationInterval] = await Promise.all([
        publicClient.readContract({ address: orderBook, abi: noxLimitOrderBookAbi, functionName: "maximumEvaluations" }),
        publicClient.readContract({ address: orderBook, abi: noxLimitOrderBookAbi, functionName: "minimumEvaluationInterval" }),
      ]);
      return { maximumEvaluations: Number(maximumEvaluations), minimumEvaluationInterval: Number(minimumEvaluationInterval) };
    },
  });
  const marketReadyForReview = market.tradeability === "TRADEABLE"
    && detail.data?.state === "ready"
    && detail.data.data.tradeability === "TRADEABLE"
    && !detail.data.data.oracle.stale
    && !detail.data.data.pool.stale;
  const marketReadinessMessage = detail.isPending
    ? "Verifying the exact market, evaluator, oracle, pool, and indexer state before review."
    : detail.data?.state !== "ready"
      ? detail.data?.message ?? "Verified market state is unavailable."
      : detail.data.data.tradeability !== "TRADEABLE"
        ? `New order review is unavailable: ${detail.data.data.tradeabilityReasons.map((reason) => reason.replaceAll("_", " ").toLowerCase()).join(", ") || detail.data.data.tradeability.toLowerCase()}.`
        : detail.data.data.oracle.stale || detail.data.data.pool.stale
          ? "New order review is unavailable until the oracle and pool quote are fresh."
          : null;
  let requestedAmountAtoms: bigint | null = null;
  try { if (amount) requestedAmountAtoms = decimalToAtoms(amount, TEST_USDC_DECIMALS); } catch { /* Input validation owns the user-facing error. */ }
  const orderCollateralInsufficient = requestedAmountAtoms !== null
    && funding.collateralBalanceAtoms !== undefined
    && requestedAmountAtoms > funding.collateralBalanceAtoms;
  const dirty = amount.length > 0 || privateMaximum.length > 0;
  const walletIdentity = `${address ?? "disconnected"}:${chainId}`;
  const previousWalletIdentity = useRef<string | null>(null);
  const submissionInFlight = useRef(false);
  useEffect(() => {
    const restored = readPendingCreation(market.marketId);
    if (restored) {
      setPendingCreation(restored);
      setTransactionHash(restored.hash);
      setSide(restored.side);
      setAmount(restored.amountIn);
      setPrivateMaximum("");
      setReview(null);
      setReceiptProgress({ state: "UNCONFIRMED", hash: restored.hash });
      setStage("SUBMITTED_UNCONFIRMED");
    }
    setPendingCreationHydrated(true);
  }, [market.marketId]);
  useEffect(() => {
    if (!pendingCreationHydrated || typeof window === "undefined") return;
    const key = pendingCreationStorageKey(market.marketId);
    if (pendingCreation) localStorage.setItem(key, JSON.stringify(pendingCreation));
    else localStorage.removeItem(key);
  }, [market.marketId, pendingCreation, pendingCreationHydrated]);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => {
    if (previousWalletIdentity.current !== null && previousWalletIdentity.current !== walletIdentity && pendingCreation) {
      setError("The wallet identity changed, but the submitted order is still locked to its original transaction hash. NoxLimit will not submit it again.");
    } else if (previousWalletIdentity.current !== null && previousWalletIdentity.current !== walletIdentity) {
      setAmount("");
      setPrivateMaximum("");
      setReview(null);
      setTransactionHash(null);
      setError(null);
      setStage("EDITING");
    }
    previousWalletIdentity.current = walletIdentity;
  }, [pendingCreation, walletIdentity]);

  const resetReview = () => {
    if (pendingCreation) return;
    setReview(null);
    setTransactionHash(null);
    setError(null);
    setStage("EDITING");
  };

  const createReview = async () => {
    setError(null);
    if (!publicApiConfigured) return setError("The public API is not configured. A fresh executable quote cannot be obtained.");
    if (!walletRuntimeConfigured) return setError("The Sepolia RPC is not configured. Wallet reads and writes remain disabled.");
    if (!isConnected || !address) return setError("Connect one wallet before reviewing the order.");
    if (chainId !== sepolia.id) return setError("Switch the connected wallet to Ethereum Sepolia.");
    if (!funding.ready) return setError(funding.message);
    if (detail.data?.state !== "ready") return setError(detail.data?.message ?? "Verified market deployment details are unavailable.");
    if (detail.data.data.tradeability !== "TRADEABLE") return setError(`Trading is disabled: ${detail.data.data.tradeabilityReasons.join(", ") || detail.data.data.tradeability}.`);

    try {
      const currentFunding = await funding.refetchBalances();
      if (!currentFunding.ready) return setError(currentFunding.message);
      const amountAtoms = decimalToAtoms(amount, TEST_USDC_DECIMALS);
      if (currentFunding.collateralBalanceAtoms === undefined || currentFunding.collateralBalanceAtoms < amountAtoms) return setError("The measured Test USDC balance is below this order’s public collateral amount. Request test funds or reduce the amount before review.");
      const maximumWad = decimalToAtoms(privateMaximum, 18);
      const minOut = maxPriceWadToMinOut(amountAtoms, maximumWad);
      const quoteResult = await getQuote({ marketId: market.marketId, side, amount });
      if (quoteResult.state !== "ready") return setError(quoteResult.message);
      if (quoteResult.data.stale) return setError("The exact quote is stale. Refresh and review again.");
      const close = BigInt(Math.floor(Date.parse(detail.data.data.tradingClosesAt) / 1000));
      const now = BigInt(Math.floor(Date.now() / 1000));
      const duration = expiryPreset === "10m" ? 600n : expiryPreset === "1h" ? 3_600n : 1_800n;
      const expiresAt = now + duration < close ? now + duration : close;
      if (expiresAt <= now) return setError("NoxLimit orders are closed for this market.");
      setReview({ quote: quoteResult.data, amountAtoms, minOut, expiresAt });
      setStage("REVIEW");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The order inputs are invalid.");
    }
  };

  const sendUnsigned = async (transaction: UnsignedContractTransaction, onProgress: (progress: ReceiptProgress) => void = setReceiptProgress) => {
    if (!walletClient || !address || !publicClient) throw new Error("Wallet or Sepolia client is unavailable.");
    if (transaction.chainId !== sepolia.id || chainId !== sepolia.id) throw new Error("Wallet network changed. Switch back to Ethereum Sepolia.");
    return sendAndConfirm({ walletClient, publicClient, account: address, transaction, onProgress });
  };

  const createdOrderId = (receipt: TransactionReceipt, orderBook: Address): bigint | null => {
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== orderBook.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: noxLimitOrderBookAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === "OrderCreated") return decoded.args.orderId;
      } catch { /* unrelated OrderBook event */ }
    }
    return null;
  };

  const completeCreation = (hash: Hex, receipt: TransactionReceipt, context: Omit<PendingCreation, "hash">) => {
    setTransactionHash(hash);
    const orderId = createdOrderId(receipt, context.orderBook);
    if (orderId === null) {
      setPendingCreation({ ...context, hash });
      setError("The creation receipt confirmed, but its OrderCreated identity could not be decoded. The draft remains locked to this hash; inspect the explorer and do not submit again.");
      setStage("SUBMITTED_UNCONFIRMED");
      return;
    }
    clearPendingCreation(context.marketId);
    setPendingCreation(null);
    setPrivateMaximum("");
    setAmount("");
    setReview(null);
    setStage("CONFIRMED");
    const ref = { chainId: context.chainId, orderBook: context.orderBook, orderId: orderId.toString() } as const;
    const receiptHint: ConfirmedOrderReceipt = {
      ref,
      marketId: market.marketId,
      side: context.side,
      amountIn: context.amountIn,
      transactionHash: hash,
      confirmedAt: new Date().toISOString(),
    };
    queryClient.setQueryData(confirmedOrderReceiptQueryKey(ref), receiptHint);
    router.push(`/orders/${ref.chainId}/${ref.orderBook}/${ref.orderId}`);
  };

  const pendingReceipt = useQuery({
    queryKey: ["submitted-order-receipt", pendingCreation?.hash],
    enabled: Boolean(publicClient && pendingCreation && stage === "SUBMITTED_UNCONFIRMED"),
    retry: false,
    refetchInterval: (entry) => entry.state.data ? false : 3_000,
    queryFn: async () => {
      if (!publicClient || !pendingCreation) return null;
      try { return await publicClient.getTransactionReceipt({ hash: pendingCreation.hash }); }
      catch { return null; }
    },
  });
  useEffect(() => {
    if (!pendingCreation || !pendingReceipt.data) return;
    if (pendingReceipt.data.status !== "success") {
      setPendingCreation(null);
      setReceiptProgress(null);
      setError("The submitted creation transaction reverted onchain. Its receipt is final, so the draft may be reviewed again safely.");
      setStage("ERROR");
      return;
    }
    completeCreation(pendingCreation.hash, pendingReceipt.data, pendingCreation);
  }, [pendingCreation, pendingReceipt.data]);

  const createOrder = async () => {
    if (submissionInFlight.current || !review || detail.data?.state !== "ready" || !address || !publicClient || !handleClient) return;
    submissionInFlight.current = true;
    setError(null);
    let submittedContext: Omit<PendingCreation, "hash"> | null = null;
    const broadcastedCreation: { current: PendingCreation | null } = { current: null };
    try {
      const currentFunding = await funding.refetchBalances();
      if (!currentFunding.ready) throw new Error(currentFunding.message);
      if (currentFunding.collateralBalanceAtoms === undefined || currentFunding.collateralBalanceAtoms < review.amountAtoms) throw new Error("The measured Test USDC balance no longer covers this order’s public collateral. No value was sent to the Nox Gateway; request test funds or reduce the amount.");
      const freshDetail = await getMarketDetail(market.marketId);
      if (freshDetail.state !== "ready") throw new Error(freshDetail.message);
      if (freshDetail.data.tradeability !== "TRADEABLE") throw new Error(`Trading is disabled: ${freshDetail.data.tradeabilityReasons.join(", ") || freshDetail.data.tradeability}.`);
      if (review.expiresAt <= BigInt(Math.floor(Date.now() / 1000))) throw new Error("The reviewed order expiry has passed. Review again.");
      const finalQuote = await getQuote({ marketId: market.marketId, side, amount });
      if (finalQuote.state !== "ready") throw new Error(finalQuote.message);
      if (finalQuote.data.stale) throw new Error("The final quote is stale. Review again before encryption.");
      setReview({ ...review, quote: finalQuote.data });
      const orderBook = freshDetail.data.contracts.orderBook;
      setStage("ENCRYPTING");
      const { handle, handleProof } = await handleClient.encryptInput(review.minOut, "uint256", orderBook);
      const collateral = await publicClient.readContract({ address: orderBook, abi: noxLimitOrderBookAbi, functionName: "collateral" }) as Address;
      const allowance = await publicClient.readContract({ address: collateral, abi: erc20Abi, functionName: "allowance", args: [address, orderBook] });
      if (allowance < review.amountAtoms) {
        setStage("APPROVING");
        await sendUnsigned(buildApproveCollateralTransaction({ collateral, spender: orderBook, amount: review.amountAtoms }));
      }
      setStage("CREATING");
      const createTransaction = buildCreateOrderTransaction({
        orderBook,
        recipient: address,
        side,
        amountIn: review.amountAtoms,
        expiresAt: review.expiresAt,
        encryptedMinOut: handle as Hex,
        inputProof: handleProof as Hex,
      });
      submittedContext = { orderBook, marketId: market.marketId, side, amountIn: atomsToDecimal(review.amountAtoms, TEST_USDC_DECIMALS), account: address, chainId: sepolia.id };
      setStage("CONFIRMING");
      const confirmed = await sendUnsigned(createTransaction, (progress) => {
        setReceiptProgress(progress);
        if ((progress.state === "SUBMITTED" || progress.state === "REPLACED") && submittedContext) {
          const pending = { ...submittedContext, hash: progress.hash };
          broadcastedCreation.current = pending;
          storePendingCreation(pending);
          setPendingCreation(pending);
          setTransactionHash(progress.hash);
        }
      });
      completeCreation(confirmed.hash, confirmed.receipt, submittedContext);
    } catch (reason) {
      if (reason instanceof UnconfirmedTransactionError && submittedContext) {
        const pending = { ...submittedContext, hash: reason.hash };
        storePendingCreation(pending);
        setTransactionHash(reason.hash);
        setPendingCreation(pending);
        setReceiptProgress({ state: "UNCONFIRMED", hash: reason.hash });
        setError(null);
        setStage("SUBMITTED_UNCONFIRMED");
        return;
      }
      if (broadcastedCreation.current && !(reason instanceof TerminalTransactionError)) {
        storePendingCreation(broadcastedCreation.current);
        setTransactionHash(broadcastedCreation.current.hash);
        setPendingCreation(broadcastedCreation.current);
        setReceiptProgress({ state: "UNCONFIRMED", hash: broadcastedCreation.current.hash });
        setError(null);
        setStage("SUBMITTED_UNCONFIRMED");
        return;
      }
      if (reason instanceof Error && /rejected|UserRejectedRequestError/i.test(`${reason.name} ${reason.message}`)) {
        setError("The wallet request was rejected. Nothing was treated as submitted, and your in-memory draft remains available for review.");
        setStage(review ? "REVIEW" : "EDITING");
        return;
      }
      if (submittedContext && reason instanceof TerminalTransactionError) {
        clearPendingCreation(submittedContext.marketId);
        setPendingCreation(null);
      }
      setError(reason instanceof Error ? reason.message : "The private order could not be created.");
      setStage("ERROR");
    } finally {
      submissionInFlight.current = false;
    }
  };

  const busy = stage === "ENCRYPTING" || stage === "APPROVING" || stage === "CREATING" || stage === "CONFIRMING" || stage === "SUBMITTED_UNCONFIRMED";

  return (
    <aside className="private-ticket" aria-label="Private order ticket" data-dirty={dirty}>
      <div className="ticket-heading"><span className="eyebrow">Private order</span><span className="priv-chip">React memory only</span></div>
      <h2>{stage === "REVIEW" ? "Review the protected order" : stage === "SUBMITTED_UNCONFIRMED" ? "Order submitted; waiting for its receipt" : stage === "CONFIRMED" ? "Order transaction confirmed" : "Set a limit, then review"}</h2>
      {stage !== "CONFIRMED" && (!funding.ready || orderCollateralInsufficient) ? <div className="notice warning" role={funding.status === "CHECKING" ? "status" : "alert"}><strong>{orderCollateralInsufficient ? "Order collateral required" : funding.status === "INSUFFICIENT" ? "Test funds required" : "Test-fund readiness required"}</strong><p>{orderCollateralInsufficient ? `This order requests ${amount} Test USDC, above the wallet’s measured ${funding.items[1].copy.split(" / target")[0]}. Reduce the public amount or request a bounded top-up.` : funding.message}</p>{funding.items.map((item) => <p key={item.key}><strong>{item.label}:</strong> {item.copy}</p>)}<p><Link className="button secondary" href="/funding">Open test funding</Link></p></div> : null}
      {stage === "CONFIRMED" && transactionHash ? <div className="notice"><strong>Creation receipt confirmed</strong><p>Transaction <a href={`https://sepolia.etherscan.io/tx/${transactionHash}`} target="_blank" rel="noreferrer">{transactionHash.slice(0, 12)}…</a>. Durable order identity is reconstructed from the confirmed event.</p></div> : null}
      {receiptProgress?.state === "REPLACED" ? <div className="notice" role="status"><strong>Transaction {receiptProgress.reason}</strong><p>Tracking replacement <a href={`https://sepolia.etherscan.io/tx/${receiptProgress.hash}`} target="_blank" rel="noreferrer">{receiptProgress.hash.slice(0, 12)}…</a>.</p></div> : null}
      {receiptProgress?.state === "UNCONFIRMED" ? <div className="notice warning" role="alert"><strong>Submitted transaction remains locked</strong><p>This exact transaction may still confirm. NoxLimit is checking <a href={`https://sepolia.etherscan.io/tx/${receiptProgress.hash}`} target="_blank" rel="noreferrer">{receiptProgress.hash.slice(0, 12)}…</a> and will not expose another create action.</p></div> : null}
      {stage !== "CONFIRMED" && !marketReadyForReview && marketReadinessMessage ? <div className="notice warning" role="status"><strong>Market preflight</strong><p>{marketReadinessMessage}</p></div> : null}
      {stage !== "CONFIRMED" ? <>
        <div className="side-control" role="group" aria-label="Outcome side">{(["YES", "NO"] as const).map((value) => <button key={value} type="button" disabled={busy || stage === "REVIEW"} aria-pressed={side === value} onClick={() => { setSide(value); resetReview(); }}><OutcomeGlyph side={value} /> Buy {value}</button>)}</div>
        <label>Public amount <span>Test USDC</span><input inputMode="decimal" disabled={busy || stage === "REVIEW"} value={amount} onChange={(event) => { setAmount(event.target.value); resetReview(); }} placeholder="0.000000" /></label>
        <label className="private-field">Private maximum price <span>Test USDC / share</span><input inputMode="decimal" autoComplete="off" disabled={busy || stage === "REVIEW"} value={privateMaximum} onChange={(event) => { setPrivateMaximum(event.target.value); resetReview(); }} placeholder="Derives encrypted minimum shares" /></label>
        <p className="privacy-short">The raw maximum stays in this browser’s memory. Its locally derived minimum-share bound is encrypted for Nox while the order rests—not invisible—and neither value reaches the NoxLimit API.</p>
        <label>Order expiry<select disabled={busy || stage === "REVIEW"} value={expiryPreset} onChange={(event) => { setExpiryPreset(event.target.value); resetReview(); }}><option value="10m">10 minutes</option><option value="30m">30 minutes</option><option value="1h">1 hour</option></select></label>
        <dl className="ticket-summary"><div><dt>Current pool quote</dt><dd>{side === "YES" ? market.yesAveragePrice : market.noAveragePrice}</dd></div><div><dt>Minimum shares</dt><dd>{review ? `${atomsToDecimal(review.minOut, TEST_USDC_DECIMALS)} ${side}` : "Calculated at review"}</dd></div><div><dt>Minimum protected winning redemption</dt><dd>{review ? `${atomsToDecimal(review.minOut, TEST_USDC_DECIMALS)} Test USDC` : "Calculated at review"}<small>If this side wins; a better fill can redeem more.</small></dd></div><div><dt>Fresh size-aware quote</dt><dd>{review ? `${review.quote.sharesOut} ${side}` : "Required before encryption"}</dd></div></dl>
        {review ? <div className="review-ticket"><span className="eyebrow">Direct route</span><p>The raw maximum remains in browser memory. Browser → official Nox Gateway sends only its locally derived minimum-share bound for encryption. The application API receives neither value. If publication succeeds, the derived minimum-share bound becomes public before any fill.</p><p><strong>Market:</strong> {market.question}</p><p><strong>Owner and immutable recipient:</strong> <code>{address}</code></p><p><strong>Public order:</strong> {side} · {amount} Test USDC · expires {new Date(Number(review.expiresAt) * 1_000).toLocaleString()}</p><p><strong>Pool fee:</strong> {detail.data?.state === "ready" ? `${detail.data.data.pool.feeBps} bps` : "Unavailable"}</p><p><strong>Monitoring budget:</strong> {monitoringPolicy.data ? `${monitoringPolicy.data.maximumEvaluations} confidential checks, at least ${monitoringPolicy.data.minimumEvaluationInterval} seconds apart` : monitoringPolicy.isPending ? "Reading the bound OrderBook…" : "Unavailable—final submission remains disabled"}</p></div> : null}
        {error || handleError ? <div className="notice warning" role="alert"><strong>Action unavailable</strong><p>{error ?? handleError}</p></div> : null}
        {stage === "REVIEW" ? <div className="ticket-actions"><button className="button secondary" type="button" onClick={resetReview}>Edit</button><button className="button primary" type="button" disabled={!marketReadyForReview || !funding.ready || orderCollateralInsufficient || !monitoringPolicy.data || !handleClient || handlePending} onClick={createOrder}>{handlePending ? "Preparing Nox Gateway…" : "Send to Nox and continue"}</button></div> : stage === "SUBMITTED_UNCONFIRMED" ? <button className="button secondary" type="button" disabled={pendingReceipt.isFetching} onClick={() => void pendingReceipt.refetch()}>{pendingReceipt.isFetching ? "Checking exact receipt…" : "Check exact receipt"}</button> : <button className="button primary" type="button" disabled={busy || !marketReadyForReview || !funding.ready || orderCollateralInsufficient || !amount || !privateMaximum} title={!marketReadyForReview ? "Waiting for a verified, fresh, tradeable market preflight" : undefined} onClick={createReview}>{busy ? stage.toLowerCase() + "…" : "Review private order"}</button>}
        <p className="small">Approval and order creation are separate wallet transactions when allowance is insufficient. No success appears before a mined receipt.</p>
      </> : <button className="button secondary" type="button" onClick={resetReview}>Create another order</button>}
    </aside>
  );
}
