"use client";

import type { ActivityView, MarketHistoryView, MarketListPage, MarketListQuery, MarketSide, MarketStreamCardView, MarketView } from "@noxlimit/protocol";
import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PrivateOrderFlow } from "@/features/orders/private-order-flow";
import { formatUtc } from "@/features/markets/catalog-integrity";
import {
  terminalMarketFromDetail,
  terminalMarketFromStream,
  type TerminalMarket,
} from "@/features/markets/terminal-market";
import { useOnlineStatus } from "@/components/providers/online-status";
import type { DataResult } from "@/lib/api/result";
import { getActivity, getMarketDetail, getMarketHistory, getMarketStream, getQuote } from "@/lib/api/client";

function OutcomeGlyph({ side }: { side: MarketSide }) {
  return <span className={`outcome-glyph ${side.toLowerCase()}`} aria-hidden="true" />;
}

function indexedPolyline(values: readonly number[], low = Math.min(...values), high = Math.max(...values)): string {
  const span = Math.max(high - low, Math.max(Math.abs(high), 1) * 0.000001);
  return values.map((value, index) => `${(index / (values.length - 1)) * 100},${92 - ((value - low) / span) * 84}`).join(" ");
}

function MarketPreviewChart({ preview }: { preview: MarketStreamCardView["preview"] }) {
  if (preview.points.length < 2) return null;
  if (preview.mode === "UNDERLYING") {
    const values = preview.points.map((point) => Number(point.priceUsd));
    if (!values.every(Number.isFinite)) return null;
    const first = preview.points[0]!, latest = preview.points.at(-1)!;
    const label = `${preview.source} preview, ${preview.points.length} real observations, from ${first.priceUsd} to ${latest.priceUsd} USD`;
    return <div className="card-preview"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={label}><title>{label}</title><polyline className="underlying-series" points={indexedPolyline(values)} /></svg></div>;
  }
  const yes = preview.points.map((point) => Number(point.yesAveragePrice));
  const no = preview.points.map((point) => Number(point.noAveragePrice));
  if (![...yes, ...no].every(Number.isFinite)) return null;
  const low = Math.min(...yes, ...no), high = Math.max(...yes, ...no);
  const latest = preview.points.at(-1)!;
  const label = `FPMM preview, ${preview.points.length} real observations, latest YES ${latest.yesAveragePrice} and NO ${latest.noAveragePrice} Test USDC per share`;
  return <div className="card-preview"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={label}><title>{label}</title><polyline className="yes-series" points={indexedPolyline(yes, low, high)} /><polyline className="no-series" points={indexedPolyline(no, low, high)} /></svg></div>;
}

function MarketCard({ market, active, focused, onSelect, onTrade, onPrevious, onNext }: { market: MarketStreamCardView; active: boolean; focused: boolean; onSelect: () => void; onTrade: (side: MarketSide) => void; onPrevious?: () => void; onNext?: () => void }) {
  return (
    <article className={`market-card ${active ? "selected" : ""}`} data-market-id={market.marketId} data-complete-set-depth-atoms={market.completeSetDepthAtoms} data-focused={focused} tabIndex={-1} aria-label={`Market ${market.positionInFilteredStream} of ${market.filteredStreamCount}: ${market.question}`} aria-current={active ? "true" : undefined}>
      <div className="card-meta"><span>{market.asset} · {market.horizon}</span><span>{market.positionInFilteredStream} / {market.filteredStreamCount}</span></div>
      <h2>{market.question}</h2>
      <dl className="market-facts compact">
        <div><dt>Oracle / strike</dt><dd>{market.oraclePriceUsd} / {market.strikeUsd} USD</dd></div>
        <div><dt>NoxLimit orders close</dt><dd>{formatUtc(market.tradingClosesAt)}</dd></div>
      </dl>
      <MarketPreviewChart preview={market.preview} />
      <div className="quote-pair"><span><OutcomeGlyph side="YES" /> YES <b>{market.yesAveragePrice}</b></span><span><OutcomeGlyph side="NO" /> NO <b>{market.noAveragePrice}</b></span></div>
      <p className="provenance">Builder-seeded Testnet liquidity · <a href={`https://sepolia.etherscan.io/tx/${market.liquidityProvenance.seedTransactionHash}`} target="_blank" rel="noreferrer">verify seed</a>{market.oracleStale || market.poolStale ? " · stale data" : ""}</p>
      {market.tradeability !== "TRADEABLE" ? <p className="tradeability">Unavailable: {market.tradeabilityReasons.join(", ")}</p> : null}
      <div className="card-actions"><button type="button" onClick={onSelect}>Open market</button><button type="button" disabled={market.tradeability !== "TRADEABLE"} onClick={() => onTrade("YES")}>Trade YES</button><button type="button" disabled={market.tradeability !== "TRADEABLE"} onClick={() => onTrade("NO")}>Trade NO</button></div>
      <div className="card-pager" aria-label="Market Stream navigation"><button type="button" disabled={!onPrevious} onClick={onPrevious}>Previous</button><span aria-live="polite">{market.positionInFilteredStream} of {market.filteredStreamCount}</span><button type="button" disabled={!onNext} onClick={onNext}>Next</button></div>
    </article>
  );
}

function EmptyStream({ result }: { result: Exclude<DataResult<MarketListPage>, { state: "ready" }> }) {
  return <div className="stream-empty" role="status"><span className="status-mark barred" aria-hidden="true" /><h2>{result.state === "offline" ? "You appear to be offline" : "No live catalog data"}</h2><p>{result.message}</p><p className="small">NoxLimit never substitutes design fixtures or cached trust-critical quotes.</p></div>;
}

type HistoryMode = MarketHistoryView["mode"];
type HistoryRange = MarketHistoryView["range"];

function HistoryChart({ market, mode, range }: { market: TerminalMarket; mode: HistoryMode; range: HistoryRange }) {
  const query = useQuery({
    queryKey: ["history", market.marketId, mode, range, "TERMINAL_240_MAX"],
    queryFn: () => getMarketHistory({ marketId: market.marketId, mode, range }),
    retry: false,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
  const [olderPages, setOlderPages] = useState<MarketHistoryView[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const rootAsOf = query.data?.state === "ready" ? query.data.data.asOf : "";
  useEffect(() => { setOlderPages([]); setPaginationError(null); }, [rootAsOf]);
  if (query.isPending) return <div className="chart-empty" role="status"><p>Loading verified history…</p></div>;
  if (query.data?.state !== "ready") return <div className="chart-empty"><p>{query.data?.message ?? "History unavailable."}</p><button className="button secondary" type="button" onClick={() => void query.refetch()}>Retry history</button></div>;
  const history = query.data.data;
  const pages = [history, ...olderPages];
  const bySource = new Map(pages.flatMap((page) => page.points).map((point) => [point.sourceRef, point]));
  const observations = [...bySource.values()].sort((left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt));
  const primary = observations.flatMap((point) => {
    const value = Number(point.primaryValue), observedAt = Date.parse(point.observedAt);
    return Number.isFinite(value) && Number.isFinite(observedAt) ? [{ point, value, observedAt }] : [];
  });
  const secondary = observations.flatMap((point) => {
    if (point.secondaryValue === undefined) return [];
    const value = Number(point.secondaryValue), observedAt = Date.parse(point.observedAt);
    return Number.isFinite(value) && Number.isFinite(observedAt) ? [{ point, value, observedAt }] : [];
  });
  const allValues = mode === "UNDERLYING" ? [...primary.map((point) => point.value), Number(market.strikeUsd)] : [...primary.map((point) => point.value), ...secondary.map((point) => point.value), 0, 1];
  const yLow = Math.min(...allValues), yHigh = Math.max(...allValues);
  const ySpan = Math.max(yHigh - yLow, Math.max(Math.abs(yHigh), 1) * 0.000001);
  const xValues = primary.map((point) => point.observedAt);
  const xLow = Math.min(...xValues, Date.parse(history.asOf));
  const xHigh = Math.max(...xValues, Date.parse(history.asOf), Date.parse(market.tradingClosesAt), Date.parse(market.resolvesAt));
  const xSpan = Math.max(xHigh - xLow, 1);
  const x = (value: number) => ((value - xLow) / xSpan) * 100;
  const y = (value: number) => 92 - ((value - yLow) / ySpan) * 84;
  const line = (series: typeof primary) => series.map((entry) => `${x(entry.observedAt)},${y(entry.value)}`).join(" ");
  const enoughPrimary = primary.length >= 2;
  const enoughSecondary = secondary.length >= 2;
  const nextCursor = pages.at(-1)?.nextCursor;
  const loadOlder = async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true); setPaginationError(null);
    const result = await getMarketHistory({ marketId: market.marketId, mode, range, cursor: nextCursor });
    if (result.state !== "ready") setPaginationError(result.message);
    else if (result.data.mode !== mode || result.data.range !== range) setPaginationError("The history service returned a different analysis window. Existing evidence was preserved.");
    else setOlderPages((current) => [...current, result.data]);
    setLoadingOlder(false);
  };
  const stateCopy = history.stale ? "Stale at the service freshness boundary" : "Current at the indexed safe block";
  const limited = pages.some((page) => page.limitedHistory);
  const summary = mode === "UNDERLYING"
    ? `${observations.length} real ${history.source} observations in USD. Strike ${market.strikeUsd} USD.`
    : `${observations.length} real reconstructed FPMM observations in Test USDC per share. YES and NO are separate public series.`;
  return <div className="chart-real">
    {observations.length === 0 ? <div className="chart-empty"><p>No verified observations are available for this mode and range. No curve is drawn.</p></div> : <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={summary}>
        <title>{summary}</title>
        {mode === "UNDERLYING" ? <>
          <line className="strike-marker" x1="0" x2="100" y1={y(Number(market.strikeUsd))} y2={y(Number(market.strikeUsd))} />
          <line className="close-marker" x1={x(Date.parse(market.tradingClosesAt))} x2={x(Date.parse(market.tradingClosesAt))} y1="0" y2="100" />
          <line className="resolution-marker" x1={x(Date.parse(market.resolvesAt))} x2={x(Date.parse(market.resolvesAt))} y1="0" y2="100" />
        </> : null}
        {enoughPrimary ? <polyline className={mode === "UNDERLYING" ? "underlying-series" : "yes-series"} points={line(primary)} /> : null}
        {mode === "OUTCOME_PRICES" && enoughSecondary ? <polyline className="no-series" points={line(secondary)} /> : null}
      </svg>
      {(!enoughPrimary || (mode === "OUTCOME_PRICES" && !enoughSecondary)) ? <p className="chart-curve-note">Fewer than two real observations are available for {mode === "OUTCOME_PRICES" && enoughPrimary ? "the NO series" : "this series"}; no curve is invented.</p> : null}
    </>}
    <div className="chart-legend" aria-label="Chart legend">{mode === "UNDERLYING" ? <><span><i className="legend-line underlying" />Underlying · USD</span><span><i className="legend-line strike" />Strike · {market.strikeUsd} USD</span><span><i className="legend-line close" />NoxLimit orders close · {formatUtc(market.tradingClosesAt)}</span><span><i className="legend-line resolution" />Resolution · {formatUtc(market.resolvesAt)}</span></> : <><span><OutcomeGlyph side="YES" /> YES · Test USDC/share</span><span><OutcomeGlyph side="NO" /> NO · Test USDC/share</span></>}</div>
    <p className="chart-metadata">{summary} Source {history.source} · as of {formatUtc(history.asOf)} · {stateCopy}{limited ? " · Limited history" : " · Complete available range"}</p>
    {nextCursor ? <button className="chart-page button secondary" type="button" disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? "Loading earlier observations…" : "Load earlier observations"}</button> : null}
    {paginationError ? <p className="notice warning" role="alert">{paginationError}</p> : null}
    <details className="chart-data"><summary>View exact chart data ({observations.length})</summary><div className="chart-data-scroll"><table><thead><tr><th scope="col">Observed at (UTC)</th><th scope="col">{mode === "UNDERLYING" ? "Price (USD)" : "YES (Test USDC/share)"}</th>{mode === "OUTCOME_PRICES" ? <th scope="col">NO (Test USDC/share)</th> : null}<th scope="col">Source reference</th></tr></thead><tbody>{observations.map((point) => <tr key={point.sourceRef}><td>{formatUtc(point.observedAt)}</td><td>{point.primaryValue}</td>{mode === "OUTCOME_PRICES" ? <td>{point.secondaryValue ?? "Unavailable"}</td> : null}<td><code>{point.sourceRef}</code></td></tr>)}</tbody></table></div></details>
  </div>;
}

function MarketAnalysis({ market }: { market: TerminalMarket }) {
  const [mode, setMode] = useState<HistoryMode>("UNDERLYING");
  const [range, setRange] = useState<HistoryRange>(market.horizon);
  return <section className="chart-panel" aria-labelledby="chart-title">
    <div className="panel-title"><div><span className="eyebrow">Public analysis</span><h2 id="chart-title">{mode === "UNDERLYING" ? "Underlying price history" : "Outcome price history"}</h2></div></div>
    <div className="analysis-controls"><div className="panel-tabs" role="tablist" aria-label="Price history mode"><button type="button" role="tab" aria-selected={mode === "UNDERLYING"} onClick={() => setMode("UNDERLYING")}>Underlying</button><button type="button" role="tab" aria-selected={mode === "OUTCOME_PRICES"} onClick={() => setMode("OUTCOME_PRICES")}>Outcome prices</button></div><div className="range-controls" role="group" aria-label="History range">{(["1h", "4h", "24h", "ALL"] as const).map((value) => <button type="button" key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{value === "ALL" ? "All" : value}</button>)}</div></div>
    <HistoryChart key={`${market.marketId}:${mode}:${range}`} market={market} mode={mode} range={range} />
  </section>;
}

function QuoteLadder({ market }: { market: TerminalMarket }) {
  const amounts = ["1", "10", "25", "100"] as const;
  const queries = useQueries({ queries: amounts.flatMap((amount) => (["YES", "NO"] as const).map((side) => ({ queryKey: ["quote", market.marketId, side, amount], queryFn: () => getQuote({ marketId: market.marketId, side, amount }), retry: false, staleTime: 5_000, refetchInterval: 5_000, refetchIntervalInBackground: false }))) });
  return <div className="quote-ladder"><div className="ladder-row ladder-head"><span>Size</span><span>YES avg / shares</span><span>NO avg / shares</span></div>{amounts.map((amount, index) => { const yes = queries[index * 2], no = queries[index * 2 + 1]; const y = yes.data?.state === "ready" ? yes.data.data : null; const n = no.data?.state === "ready" ? no.data.data : null; return <div className="ladder-row" key={amount}><span>{amount} USDC</span><span>{yes.isPending ? "Loading…" : y ? `${y.averagePrice} / ${y.sharesOut}${y.stale ? " stale" : ""}` : "Unavailable"}</span><span>{no.isPending ? "Loading…" : n ? `${n.averagePrice} / ${n.sharesOut}${n.stale ? " stale" : ""}` : "Unavailable"}</span></div>; })}</div>;
}

function PublicFills({ marketId }: { marketId: string }) {
  const query = useQuery({
    queryKey: ["market-activity", marketId],
    queryFn: () => getActivity({ marketId }),
    retry: false,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
  if (query.isPending) return <p className="panel-empty" role="status">Loading confirmed public fills…</p>;
  if (query.data?.state !== "ready") return <p className="panel-empty">{query.data?.message ?? "Confirmed public activity is unavailable."}</p>;
  const fills = query.data.data.filter((activity): activity is ActivityView & { kind: "ORDER_FILLED" } => activity.kind === "ORDER_FILLED");
  if (fills.length === 0) return <p className="panel-empty">No confirmed public fills for this market yet.</p>;
  return <div className="public-fills" aria-label="Confirmed public fills">{fills.map((activity) => <a key={activity.activityId} href={`https://sepolia.etherscan.io/tx/${activity.transactionHash}`} target="_blank" rel="noreferrer"><span><strong>{activity.side ?? "Outcome"} · {activity.amount ?? "—"} shares</strong><small>{new Date(activity.occurredAt).toLocaleString()} · block {activity.blockNumber}</small></span><code>{activity.transactionHash.slice(0, 12)}…</code></a>)}</div>;
}

function MarketLiquidityPanel({ market }: { market: TerminalMarket }) {
  const [tab, setTab] = useState<"QUOTES" | "FILLS">("QUOTES");
  return <section className="quote-panel"><div className="panel-title"><div><span className="eyebrow">AMM liquidity</span><h2>Real pool evidence</h2></div><span>{formatUtc(market.poolQuotedAt)}</span></div><div className="panel-tabs" role="tablist" aria-label="Pool evidence"><button type="button" role="tab" aria-selected={tab === "QUOTES"} onClick={() => setTab("QUOTES")}>AMM quotes</button><button type="button" role="tab" aria-selected={tab === "FILLS"} onClick={() => setTab("FILLS")}>Recent public fills</button></div>{tab === "QUOTES" ? <QuoteLadder market={market} /> : <PublicFills marketId={market.marketId} />}</section>;
}

function SelectedTerminal({ market, side, initialPublicAmount, onDirtyChange, draftResetKey }: { market: TerminalMarket; side: MarketSide; initialPublicAmount?: string; onDirtyChange: (dirty: boolean) => void; draftResetKey: number }) {
  return <>
    <main className="selected-market" id="selected-market">
      <header className="market-heading"><div><span className="eyebrow">{market.asset} · {market.horizon}</span><h1>{market.question}</h1></div><span className="lifecycle">{market.lifecycle.replaceAll("_", " ")}</span></header>
      <section className="evidence-strip" aria-label="Market evidence">
        <div><span>Oracle price</span><strong>{market.oraclePriceUsd} USD</strong><small>{market.oracleSource} · {formatUtc(market.oracleObservedAt)}</small></div>
        <div><span>Strike</span><strong>{market.strikeUsd} USD</strong><small>Objective resolver threshold</small></div>
        <div><span>Complete-set liquidity</span><strong>{market.completeSetDepth}</strong><small>Builder-seeded on Testnet · <a href={`https://sepolia.etherscan.io/tx/${market.liquidityProvenance.seedTransactionHash}`} target="_blank" rel="noreferrer">seed receipt</a></small></div>
        <div><span>Objective resolution</span><strong>{formatUtc(market.resolvesAt)}</strong><small>NoxLimit orders close {formatUtc(market.tradingClosesAt)}</small></div>
      </section>
      {market.oracleStale || market.poolStale ? <div className="notice warning" role="status"><strong>Live market data is stale</strong><p>Oracle or FPMM freshness is outside policy. New order review remains disabled until a fresh exact preflight succeeds.</p></div> : null}
      <MarketAnalysis market={market} />
      <MarketLiquidityPanel market={market} />
    </main>
    <PrivateOrderFlow key={`${market.marketId}:${side}:${draftResetKey}`} market={market} initialSide={side} initialAmount={draftResetKey === 0 ? initialPublicAmount : undefined} onDirtyChange={onDirtyChange} />
  </>;
}

type StreamFilters = Readonly<{
  asset: NonNullable<MarketListQuery["asset"]> | "";
  horizon: NonNullable<MarketListQuery["horizon"]> | "";
  lifecycle: NonNullable<MarketListQuery["lifecycle"]>;
  sort: MarketListQuery["sort"];
}>;

type PendingChange =
  | { kind: "selection"; market: MarketStreamCardView; side?: MarketSide }
  | { kind: "filters"; filters: StreamFilters }
  | { kind: "dismiss"; href?: string };

type CommittedStream = Readonly<{
  signature: string;
  result: DataResult<MarketListPage>;
  loadedPages: number;
  refreshCandidate?: Extract<DataResult<MarketListPage>, { state: "ready" }>;
}>;

const DEFAULT_FILTERS: StreamFilters = {
  asset: "",
  horizon: "",
  lifecycle: "LIVE",
  sort: "CLOSING_SOON",
};

function streamSignature(filters: StreamFilters): string {
  return `${filters.asset}|${filters.horizon}|${filters.lifecycle}|${filters.sort}`;
}

function mergeInPlace(previous: DataResult<MarketListPage>, next: DataResult<MarketListPage>, preserveLoadedTail: boolean): DataResult<MarketListPage> {
  if (previous.state !== "ready" || next.state !== "ready") return next;
  const refreshed = new Map(next.data.items.map((market) => [market.marketId, market]));
  const stable = previous.data.items.flatMap((market) => {
    const current = refreshed.get(market.marketId);
    if (!current) return preserveLoadedTail ? [market] : [];
    refreshed.delete(market.marketId);
    return [current];
  });
  const items = [...stable, ...refreshed.values()];
  const nextCursor = preserveLoadedTail ? previous.data.nextCursor : next.data.nextCursor;
  return {
    ...next,
    data: {
      catalogRevision: next.data.catalogRevision,
      snapshot: next.data.snapshot,
      items,
      ...(nextCursor ? { nextCursor } : {}),
    },
  };
}

function FilterControls({ filters, open, onToggle, onChange }: { filters: StreamFilters; open: boolean; onToggle: () => void; onChange: (filters: StreamFilters) => void }) {
  return <div className="stream-toolbar filter-toolbar">
    <div><span className="eyebrow">Discover</span><h1>Market Stream</h1></div>
    <button className="mobile-filter-toggle" type="button" aria-expanded={open} aria-controls="stream-filter-controls" onClick={onToggle}>Filter &amp; sort</button>
    <div className="stream-filter-controls" id="stream-filter-controls" data-open={open}>
      <select aria-label="Asset filter" value={filters.asset} onChange={(event) => onChange({ ...filters, asset: event.target.value as StreamFilters["asset"] })}><option value="">All assets</option><option>BTC/USD</option><option>ETH/USD</option><option>SOL/USD</option></select>
      <select aria-label="Horizon filter" value={filters.horizon} onChange={(event) => onChange({ ...filters, horizon: event.target.value as StreamFilters["horizon"] })}><option value="">All horizons</option><option>1h</option><option>4h</option><option>24h</option></select>
      <select aria-label="Lifecycle filter" value={filters.lifecycle} onChange={(event) => onChange({ ...filters, lifecycle: event.target.value as StreamFilters["lifecycle"] })}><option value="LIVE">Live</option><option value="RESOLVING">Resolving</option><option value="RESOLVED">Resolved</option></select>
      <select aria-label="Sort markets" value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as StreamFilters["sort"] })}><option value="CLOSING_SOON">Closing soon</option><option value="RECENTLY_OPENED">Recently opened</option><option value="LIQUIDITY">Liquidity</option></select>
    </div>
  </div>;
}

export function ProductShell({ result, initialMarketId, initialMarket, initialSide, initialPublicAmount }: { result: DataResult<MarketListPage>; initialMarketId?: string; initialMarket?: MarketView; initialSide?: MarketSide; initialPublicAmount?: string }) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [filters, setFilters] = useState<StreamFilters>(DEFAULT_FILTERS);
  const signature = streamSignature(filters);
  const stream = useQuery({
    queryKey: ["market-stream", filters.asset, filters.horizon, filters.lifecycle, filters.sort],
    queryFn: () => getMarketStream({ asset: filters.asset || undefined, horizon: filters.horizon || undefined, lifecycle: filters.lifecycle, sort: filters.sort }),
    initialData: signature === streamSignature(DEFAULT_FILTERS) ? result : undefined,
    retry: false,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
  const [committed, setCommitted] = useState<CommittedStream>({ signature, result, loadedPages: 1 });
  const [paginationPending, setPaginationPending] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  useEffect(() => {
    if (!stream.data) return;
    setCommitted((current) => {
      const next = stream.data!;
      if (current.signature !== signature) return { signature, result: next, loadedPages: 1 };
      if (current.result.state === "ready" && next.state === "ready" && current.result.data.snapshot !== next.data.snapshot) {
        return { ...current, refreshCandidate: next };
      }
      return {
        ...current,
        result: mergeInPlace(current.result, next, current.loadedPages > 1),
        refreshCandidate: undefined,
      };
    });
    setPaginationError(null);
  }, [signature, stream.data]);
  const liveResult = committed.result;
  const items = liveResult.state === "ready" ? liveResult.data.items : [];
  const loadMore = async () => {
    if (paginationPending || liveResult.state !== "ready" || !liveResult.data.nextCursor) return;
    const expectedSnapshot = liveResult.data.snapshot;
    const expectedSignature = signature;
    setPaginationPending(true);
    setPaginationError(null);
    try {
      const next = await getMarketStream({
        asset: filters.asset || undefined,
        horizon: filters.horizon || undefined,
        lifecycle: filters.lifecycle,
        sort: filters.sort,
        cursor: liveResult.data.nextCursor,
        snapshot: expectedSnapshot,
      });
      if (next.state !== "ready") throw new Error(next.message);
      if (next.data.snapshot !== expectedSnapshot) throw new Error("The market snapshot changed while loading the next page. Refresh the ordering before continuing.");
      setCommitted((current) => {
        if (current.signature !== expectedSignature || current.result.state !== "ready" || current.result.data.snapshot !== expectedSnapshot) return current;
        const known = new Set(current.result.data.items.map((market) => market.marketId));
        const appended = next.data.items.filter((market) => !known.has(market.marketId));
        return {
          signature: current.signature,
          loadedPages: current.loadedPages + 1,
          result: {
            ...next,
            data: {
              catalogRevision: next.data.catalogRevision,
              snapshot: expectedSnapshot,
              items: [...current.result.data.items, ...appended],
              ...(next.data.nextCursor ? { nextCursor: next.data.nextCursor } : {}),
            },
          },
        };
      });
    } catch (reason) {
      setPaginationError(reason instanceof Error ? reason.message : "The next market page could not be loaded.");
    } finally {
      setPaginationPending(false);
    }
  };
  const applyRankingRefresh = () => {
    setCommitted((current) => current.refreshCandidate
      ? { signature: current.signature, result: current.refreshCandidate, loadedPages: 1 }
      : current);
    setPaginationError(null);
  };
  const initialSelectedId = initialMarket?.marketId ?? initialMarketId ?? items[0]?.marketId ?? "";
  const [selectedId, setSelectedId] = useState<string>(initialSelectedId);
  const [selectedFallback, setSelectedFallback] = useState<TerminalMarket | undefined>(() => {
    if (initialMarket) return terminalMarketFromDetail(initialMarket);
    const exact = items.find((item) => item.marketId === initialSelectedId);
    if (exact) return terminalMarketFromStream(exact);
    return initialMarketId ? undefined : items[0] ? terminalMarketFromStream(items[0]) : undefined;
  });
  const selectedDetail = useQuery({
    queryKey: ["market", selectedId],
    queryFn: () => getMarketDetail(selectedId),
    enabled: Boolean(selectedId),
    initialData: initialMarket && selectedId === initialMarket.marketId ? { state: "ready", data: initialMarket, asOf: initialMarket.asOf } as const : undefined,
    retry: false,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
  const selected = useMemo(() => {
    if (selectedDetail.data?.state === "ready") return terminalMarketFromDetail(selectedDetail.data.data);
    const card = items.find((item) => item.marketId === selectedId);
    return card ? terminalMarketFromStream(card) : selectedFallback;
  }, [items, selectedDetail.data, selectedFallback, selectedId]);
  const [focusedId, setFocusedId] = useState<string>(items[0]?.marketId ?? "");
  useEffect(() => {
    if (items.length && !items.some((item) => item.marketId === focusedId)) setFocusedId(items[0]!.marketId);
  }, [focusedId, items]);
  const [side, setSide] = useState<MarketSide>(initialSide ?? "YES");
  const [dirty, setDirty] = useState(false);
  const [draftResetKey, setDraftResetKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(Boolean(initialMarketId));
  const dialogRef = useRef<HTMLElement>(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const workspaceBackRef = useRef<HTMLButtonElement>(null);
  const workspaceTriggerRef = useRef<HTMLElement | null>(null);
  const workspaceOpenRef = useRef(workspaceOpen);
  const workspaceHistoryActiveRef = useRef(false);
  const dirtyRef = useRef(dirty);
  const swipeStartRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  useEffect(() => { workspaceOpenRef.current = workspaceOpen; }, [workspaceOpen]);

  const restoreWorkspaceTrigger = useCallback(() => {
    requestAnimationFrame(() => workspaceTriggerRef.current?.focus());
  }, []);
  const closeWorkspaceVisual = useCallback(() => {
    workspaceHistoryActiveRef.current = false;
    workspaceOpenRef.current = false;
    setWorkspaceOpen(false);
    setPendingChange(null);
    restoreWorkspaceTrigger();
  }, [restoreWorkspaceTrigger]);

  useEffect(() => {
    if (!workspaceOpen || workspaceHistoryActiveRef.current || !window.matchMedia("(max-width: 767px)").matches) return;
    window.history.pushState({ noxlimitTradeWorkspace: true }, "", window.location.href);
    workspaceHistoryActiveRef.current = true;
    requestAnimationFrame(() => workspaceBackRef.current?.focus());
  }, [workspaceOpen]);

  useEffect(() => {
    const onPopState = () => {
      if (!workspaceOpenRef.current) return;
      workspaceHistoryActiveRef.current = false;
      if (dirtyRef.current) {
        window.history.pushState({ noxlimitTradeWorkspace: true }, "", window.location.href);
        workspaceHistoryActiveRef.current = true;
        dialogTriggerRef.current = workspaceBackRef.current;
        setPendingChange({ kind: "dismiss" });
        return;
      }
      closeWorkspaceVisual();
      if (initialMarketId) router.replace("/");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [closeWorkspaceVisual, initialMarketId, router]);

  const rememberTrigger = () => {
    dialogTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };
  const applySelection = (market: MarketStreamCardView, nextSide?: MarketSide) => {
    setSelectedId(market.marketId);
    setSelectedFallback(terminalMarketFromStream(market));
    setFocusedId(market.marketId);
    if (nextSide) setSide(nextSide);
  };
  const requestSelection = (market: MarketStreamCardView, nextSide?: MarketSide) => {
    if (dirty && (market.marketId !== selectedId || (nextSide !== undefined && nextSide !== side))) {
      rememberTrigger();
      setPendingChange({ kind: "selection", market, side: nextSide });
      return false;
    }
    applySelection(market, nextSide);
    return true;
  };
  const requestFilters = (next: StreamFilters) => {
    if (streamSignature(next) === signature) return;
    if (dirty) {
      rememberTrigger();
      setPendingChange({ kind: "filters", filters: next });
      return;
    }
    setFilters(next);
    setFiltersOpen(false);
  };
  const openWorkspaceOrScroll = () => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      workspaceTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setWorkspaceOpen(true);
      return;
    }
    requestAnimationFrame(() => document.getElementById("selected-market")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };
  const requestWorkspaceDismiss = (href?: string) => {
    if (dirtyRef.current) {
      rememberTrigger();
      setPendingChange({ kind: "dismiss", ...(href ? { href } : {}) });
      return;
    }
    if (href) {
      closeWorkspaceVisual();
      router.push(href);
    } else if (workspaceHistoryActiveRef.current) window.history.back();
    else {
      closeWorkspaceVisual();
      if (initialMarketId) router.push("/");
    }
  };
  const closeDialog = () => {
    setPendingChange(null);
    requestAnimationFrame(() => dialogTriggerRef.current?.focus());
  };
  useEffect(() => {
    if (!pendingChange || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeDialog(); return; }
      if (event.key !== "Tab") return;
      const dialogItems = focusable();
      if (!dialogItems.length) return;
      const first = dialogItems[0], last = dialogItems[dialogItems.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [pendingChange]);
  useEffect(() => {
    if (!workspaceOpen || !window.matchMedia("(max-width: 767px)").matches) return;
    const shell = document.querySelector<HTMLElement>(".app-header-shell");
    const wasInert = shell?.inert ?? false;
    document.body.dataset.tradeWorkspaceOpen = "true";
    if (shell) shell.inert = true;
    const interceptPrimaryNavigation = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(".app-nav a") : null;
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      dialogTriggerRef.current = workspaceBackRef.current;
      requestWorkspaceDismiss(target.getAttribute("href") ?? "/");
    };
    document.addEventListener("click", interceptPrimaryNavigation, true);
    return () => {
      delete document.body.dataset.tradeWorkspaceOpen;
      if (shell) shell.inert = wasInert;
      document.removeEventListener("click", interceptPrimaryNavigation, true);
    };
  }, [workspaceOpen]);
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspaceOpen || pendingChange || !workspace || !window.matchMedia("(max-width: 767px)").matches) return;
    const focusable = () => [...workspace.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')].filter((element) => element.getClientRects().length > 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0]!, last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Node) || workspace.contains(event.target)) return;
      workspaceBackRef.current?.focus();
    };
    workspace.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      workspace.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [pendingChange, workspaceOpen]);
  const discardAndApply = () => {
    if (!pendingChange) return;
    dirtyRef.current = false;
    setDirty(false);
    setDraftResetKey((value) => value + 1);
    if (pendingChange.kind === "selection") applySelection(pendingChange.market, pendingChange.side);
    else if (pendingChange.kind === "filters") { setFilters(pendingChange.filters); setFiltersOpen(false); }
    else if (pendingChange.href) {
      closeWorkspaceVisual();
      router.push(pendingChange.href);
    } else if (workspaceHistoryActiveRef.current) window.history.back();
    else {
      closeWorkspaceVisual();
      if (initialMarketId) router.push("/");
    }
    setPendingChange(null);
  };
  const onWorkspacePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch" || event.clientX > 48) return;
    swipeStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onWorkspacePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;
    const horizontal = event.clientX - start.x;
    const vertical = Math.abs(event.clientY - start.y);
    if (horizontal >= 80 && horizontal > vertical * 1.5) requestWorkspaceDismiss();
  };
  const moveFocus = (marketId: string) => {
    setFocusedId(marketId);
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-market-id="${marketId}"]`);
      target?.scrollIntoView({ behavior: "auto", block: "start" });
      target?.focus({ preventScroll: true });
    });
  };
  const effectiveResult = !online && liveResult.state !== "ready"
    ? { state: "offline", message: "Your browser is offline. Public context remains readable when a verified snapshot is already loaded; all writes are disabled." } as const
    : liveResult;

  return <div className={`product-grid ${workspaceOpen ? "trade-workspace-active" : ""}`}>
    <aside className="market-stream" aria-label="Market Stream" aria-busy={stream.isFetching}>
      <FilterControls filters={filters} open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} onChange={requestFilters} />
      <p className="stream-runtime-status" role="status">{!online ? "Offline · showing the last verified snapshot" : committed.refreshCandidate ? "A new deterministic ordering is ready" : stream.isFetching ? "Refreshing verified market data…" : `Snapshot current · ${items.length} market${items.length === 1 ? "" : "s"}`}{committed.refreshCandidate ? <button type="button" onClick={applyRankingRefresh}>Refresh order</button> : null}</p>
      {effectiveResult.state === "ready" ? effectiveResult.data.items.map((market, index) => <MarketCard
        key={market.marketId}
        market={market}
        active={market.marketId === selected?.marketId}
        focused={market.marketId === focusedId}
        onPrevious={index > 0 ? () => moveFocus(effectiveResult.data.items[index - 1]!.marketId) : undefined}
        onNext={index + 1 < effectiveResult.data.items.length ? () => moveFocus(effectiveResult.data.items[index + 1]!.marketId) : undefined}
        onSelect={() => { if (requestSelection(market)) openWorkspaceOrScroll(); }}
        onTrade={(nextSide) => { if (requestSelection(market, nextSide)) openWorkspaceOrScroll(); }}
      />) : <EmptyStream result={effectiveResult} />}
      {effectiveResult.state === "ready" && effectiveResult.data.nextCursor ? <div className="stream-pagination"><button type="button" disabled={paginationPending || !online} onClick={() => void loadMore()}>{paginationPending ? "Loading more markets…" : "Load more markets"}</button><span>Continues snapshot {effectiveResult.data.snapshot}</span></div> : null}
      {paginationError ? <p className="stream-pagination-error" role="alert">{paginationError}</p> : null}
      <div className="stream-footer"><Link href="/privacy">How the private limit works</Link><span>Deterministic catalog · no personalization</span></div>
    </aside>
    <section ref={workspaceRef} className="trade-workspace" data-open={workspaceOpen} aria-label="Trade workspace" onPointerDown={onWorkspacePointerDown} onPointerUp={onWorkspacePointerUp} onPointerCancel={() => { swipeStartRef.current = null; }}>
      <header className="trade-workspace-header"><button ref={workspaceBackRef} type="button" onClick={() => requestWorkspaceDismiss()}>Back to Discover</button><span>Full market context</span><small>Swipe right from the edge to dismiss</small></header>
      {selected ? <SelectedTerminal market={selected} side={side} initialPublicAmount={selected.marketId === initialMarketId ? initialPublicAmount : undefined} onDirtyChange={setDirty} draftResetKey={draftResetKey} /> : <section className="terminal-unavailable" role="status"><span className="eyebrow">Requested market</span><h1>{selectedDetail.isPending ? "Loading the exact verified market" : "Verified market unavailable"}</h1><p>{selectedDetail.data && selectedDetail.data.state !== "ready" ? selectedDetail.data.message : "The requested durable market is never replaced with another bundle or a design fixture."}</p><div className="next-actions"><Link className="button primary" href="/">Return to Market Stream</Link><Link className="button secondary" href="/privacy">Understand privacy</Link></div></section>}
    </section>
    {pendingChange ? <div className="dialog-scrim" role="presentation"><section ref={dialogRef} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="discard-title" aria-describedby="discard-copy"><span className="eyebrow">Private draft protection</span><h2 id="discard-title">Discard this private draft?</h2><p id="discard-copy">{pendingChange.kind === "filters" ? "Changing the Market Stream filter or sort clears this in-memory draft." : pendingChange.kind === "dismiss" ? "Leaving the Trade workspace clears this in-memory draft." : "Switching markets or sides clears this in-memory draft."} The private maximum cannot be restored.</p><div><button className="button secondary" type="button" onClick={closeDialog}>Keep editing</button><button className="button primary" type="button" onClick={discardAndApply}>Discard and continue</button></div></section></div> : null}
  </div>;
}
