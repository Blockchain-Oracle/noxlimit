"use client";

import type { ActivityView, OrderView, PositionView } from "@noxlimit/protocol";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import Link from "next/link";
import { useAccount } from "wagmi";
import { getActivity, getOrders, getPositions } from "@/lib/api/client";
import type { DataResult } from "@/lib/api/result";

function Empty({ children }: { children: string }) {
  return <div className="empty-artifact"><span className="status-mark dashed" aria-hidden="true" /><p>{children}</p></div>;
}

function Frame({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="collection-page"><header><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>Validated service projections from confirmed Sepolia events. No demo records are substituted.</p></header>{children}</section>;
}

function Result<T>({ query, empty, children }: { query: UseQueryResult<DataResult<readonly T[]>>; empty: string; children: (items: readonly T[]) => React.ReactNode }) {
  if (query.isPending) return <div className="empty-artifact" role="status">Loading confirmed records…</div>;
  if (query.data?.state !== "ready") return <div className="notice warning" role="alert"><strong>{query.data?.state === "offline" ? "Offline" : "Records unavailable"}</strong><p>{query.data?.message ?? "Connect one wallet to scope this view."}</p></div>;
  const items = query.data.data;
  return items.length ? children(items) : <Empty>{empty}</Empty>;
}

export function OrdersCollection() {
  const { address } = useAccount();
  const query = useQuery({ queryKey: ["orders", address], queryFn: () => getOrders(address!), enabled: Boolean(address), retry: false, refetchInterval: 15_000 });
  return <Frame eyebrow="Wallet-scoped" title="My Orders">{!address ? <Empty>Connect one wallet to load its confirmed orders.</Empty> : <Result<OrderView> query={query} empty="No confirmed private orders for this wallet.">{(items) => <div className="record-list">{items.map((order) => <Link key={`${order.ref.orderBook}:${order.ref.orderId}`} href={`/orders/${order.ref.chainId}/${order.ref.orderBook}/${order.ref.orderId}`}><span><strong>{order.side} · {order.amountIn} Test USDC</strong><small>{order.status.replaceAll("_", " ")} · created {new Date(order.createdAt).toLocaleString()}</small></span><code>#{order.ref.orderId}</code></Link>)}</div>}</Result>}</Frame>;
}

export function PositionsCollection() {
  const { address } = useAccount();
  const query = useQuery({ queryKey: ["positions", address], queryFn: () => getPositions(address!), enabled: Boolean(address), retry: false, refetchInterval: 15_000 });
  return <Frame eyebrow="Owned outcomes" title="Positions">{!address ? <Empty>Connect one wallet to load its confirmed positions.</Empty> : <Result<PositionView> query={query} empty="No filled positions for this wallet.">{(items) => <div className="record-list">{items.map((position) => <Link key={position.positionId} href={`/positions/${position.positionId}`}><span><strong>{position.side} · {position.shares} shares</strong><small>{position.state.replaceAll("_", " ")} · maximum redemption {position.maximumRedemption}</small></span><code>{position.positionId.slice(0, 10)}…</code></Link>)}</div>}</Result>}</Frame>;
}

export function ActivityCollection() {
  const { address } = useAccount();
  const query = useQuery({ queryKey: ["activity", address], queryFn: () => getActivity({ owner: address! }), enabled: Boolean(address), retry: false, refetchInterval: 15_000 });
  return <Frame eyebrow="Indexed evidence" title="Activity">{!address ? <Empty>Connect one wallet to load its confirmed activity.</Empty> : <Result<ActivityView> query={query} empty="No confirmed activity for this wallet.">{(items) => <div className="record-list">{items.map((activity) => <a key={activity.activityId} href={`https://sepolia.etherscan.io/tx/${activity.transactionHash}`} target="_blank" rel="noreferrer"><span><strong>{activity.kind.replaceAll("_", " ")}</strong><small>{new Date(activity.occurredAt).toLocaleString()} · block {activity.blockNumber}</small></span><code>{activity.transactionHash.slice(0, 10)}…</code></a>)}</div>}</Result>}</Frame>;
}
