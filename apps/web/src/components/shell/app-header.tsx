"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { walletRuntimeConfigured } from "@/lib/wallet/config";
import { getHealth, publicApiConfigured } from "@/lib/api/client";

export function AppHeader() {
  return (
    <div className="app-header-shell">
      <div className="app-header-backdrop" aria-hidden="true" />
      <header className="app-header">
        <Link className="wordmark" href="/" aria-label="NoxLimit home">Nox<span>Limit</span></Link>
        <SystemStatus />
        <div className="wallet-actions">
          {!walletRuntimeConfigured ? <span className="runtime-warning">RPC not configured</span> : null}
          <WalletButton />
          <Link className="funds-action" href="/funding">Test funds</Link>
        </div>
      </header>
      <nav className="app-nav" aria-label="Primary navigation">
        <Link href="/orders">Orders</Link>
        <Link href="/positions">Positions</Link>
        <Link href="/activity">Activity</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
    </div>
  );
}

function SystemStatus() {
  const health = useQuery({ queryKey: ["service-health"], queryFn: getHealth, enabled: publicApiConfigured, refetchInterval: 30_000, retry: false });
  const label = !publicApiConfigured ? "API not configured" : health.data?.state === "ready" ? health.data.data.status : health.isPending ? "Checking system" : "System unavailable";
  return <div className="chain-pill" title={label}><span aria-hidden="true" data-ready={health.data?.state === "ready" && health.data.data.status === "READY"} /> Ethereum Sepolia · {label}</div>;
}

function NetworkSwitch() {
  const { switchChain, isPending } = useSwitchChain();
  return <button className="wallet-button warning" type="button" disabled={isPending} onClick={() => switchChain({ chainId: sepolia.id })}>{isPending ? "Switching…" : "Switch to Sepolia"}</button>;
}

function WalletButton() {
  const { address, chainId, isConnected, status } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  if (status === "reconnecting") {
    return <button className="wallet-button" type="button" disabled>Reconnecting…</button>;
  }
  if (!isConnected || !address) {
    const connector = connectors[0];
    return <button
      className="wallet-button"
      type="button"
      disabled={!walletRuntimeConfigured || !connector || connecting}
      onClick={() => connector && connect({ connector })}
    >{connecting ? "Connecting…" : "Connect browser wallet"}</button>;
  }
  if (chainId !== sepolia.id) return <NetworkSwitch />;
  return <button
    className="wallet-button"
    type="button"
    title="Disconnect wallet"
    onClick={() => disconnect()}
  >{address.slice(0, 6)}…{address.slice(-4)}</button>;
}
