"use client";

import {
  ETHEREUM_SEPOLIA_CHAIN_ID,
  FUNDING_CLAIM_FIELDS,
  type FundingChallengeResponse,
  type FundingClaimResponse,
} from "@noxlimit/protocol";
import { useRef, useState } from "react";
import { useSignTypedData, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { claimFunding, publicApiConfigured, requestFundingChallenge } from "@/lib/api/client";
import { useOnlineStatus } from "@/components/providers/online-status";
import { walletRuntimeConfigured } from "@/lib/wallet/config";
import { useFundingBalanceReadiness } from "@/lib/wallet/use-funding-readiness";

type FundingStage = "READINESS" | "CHALLENGE_READY" | "SIGNING" | "CLAIMING" | "RESULT" | "ERROR";

export function FundingReadiness() {
  const online = useOnlineStatus();
  const funding = useFundingBalanceReadiness();
  const { address, isConnected, chainId } = funding;
  const { switchChain, isPending: switching } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const [stage, setStage] = useState<FundingStage>("READINESS");
  const [challenge, setChallenge] = useState<FundingChallengeResponse | null>(null);
  const [claim, setClaim] = useState<FundingClaimResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actionInFlight = useRef(false);

  const loadChallenge = async () => {
    if (actionInFlight.current || !address || chainId !== ETHEREUM_SEPOLIA_CHAIN_ID) return;
    actionInFlight.current = true;
    setError(null);
    try {
      const result = await requestFundingChallenge({ address, chainId: ETHEREUM_SEPOLIA_CHAIN_ID });
      if (result.state !== "ready") { setError(result.message); setStage("ERROR"); return; }
      setChallenge(result.data);
      setStage("CHALLENGE_READY");
    } finally {
      actionInFlight.current = false;
    }
  };

  const signAndClaim = async () => {
    if (actionInFlight.current || !address || !challenge) return;
    actionInFlight.current = true;
    try {
      setStage("SIGNING");
      const signature = await signTypedDataAsync({
        domain: challenge.typedData.domain,
        types: { FundingClaim: FUNDING_CLAIM_FIELDS },
        primaryType: "FundingClaim",
        message: {
          recipient: challenge.typedData.message.recipient,
          nonce: BigInt(challenge.typedData.message.nonce),
          deadline: BigInt(challenge.typedData.message.deadline),
        },
      });
      setStage("CLAIMING");
      const result = await claimFunding({ challengeId: challenge.challengeId, address, signature });
      if (result.state !== "ready") { setError(result.message); setStage("ERROR"); return; }
      setClaim(result.data);
      setChallenge(null);
      setStage("RESULT");
      await funding.refetchBalances();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The funding signature or claim failed.");
      setStage("ERROR");
    } finally {
      actionInFlight.current = false;
    }
  };

  const prerequisites = [
    ["Wallet", isConnected ? "Connected" : "Connect one wallet", isConnected],
    ["Network", chainId === sepolia.id ? "Ethereum Sepolia" : "Switch to Ethereum Sepolia", chainId === sepolia.id],
    ["RPC", walletRuntimeConfigured ? "Configured" : "Unavailable", walletRuntimeConfigured],
    [
      "Funding API configuration",
      !publicApiConfigured
        ? "Origin unavailable"
        : online
          ? "Origin configured; relay readiness is checked when requested"
          : "Origin configured; browser offline",
      publicApiConfigured && online,
    ],
  ] as const;
  const balances = funding.items.map((item) => [item.label, item.copy, item.ready] as const);
  const readiness = [...prerequisites, ...balances] as const;
  const prerequisitesReady = prerequisites.every((item) => item[2]) && Boolean(address);
  const readyToRequest = prerequisitesReady && funding.status === "INSUFFICIENT";

  return <section className="funding-card">
    <span className="eyebrow">Testnet onboarding</span>
    <h1>One wallet. No faucet hunt.</h1>
    <p>A short-lived wallet signature requests a bounded top-up toward measured Sepolia ETH and NoxLimit Test USDC targets. The signature is not a trading transaction, and normal writes are not gasless.</p>
    <ol className="readiness-list">{readiness.map(([label, copy, ok]) => <li key={label}><span className={`status-mark ${ok ? "solid" : "ring"}`} aria-hidden="true" /><div><strong>{label}</strong><p>{copy}</p></div><span>{ok ? "Ready" : "Needs action"}</span></li>)}</ol>
    {chainId !== sepolia.id && isConnected ? <button className="button secondary" type="button" disabled={switching} onClick={() => switchChain({ chainId: sepolia.id })}>Switch to Ethereum Sepolia</button> : null}
    {stage === "CHALLENGE_READY" && challenge ? <div className="review-ticket"><span className="eyebrow">Review signed request</span><p>Recipient: <code>{challenge.address}</code></p><p>Expires: {challenge.expiresAt}</p><p>This request may be limited by cooldown, per-refill cap, lifetime cap, or treasury availability.</p></div> : null}
    {claim ? <div className="notice" role="status"><strong>{claim.status.replaceAll("_", " ")}</strong><p>Received {claim.nativeAmount} Sepolia ETH and {claim.collateralAmount} NoxLimit Test USDC.</p>{claim.transactionHash ? <p><a href={`https://sepolia.etherscan.io/tx/${claim.transactionHash}`} target="_blank" rel="noreferrer">View real funding transaction</a></p> : null}{claim.nextEligibleAt ? <p>Next eligible request: {claim.nextEligibleAt}</p> : null}</div> : null}
    {error ? <div className="notice warning" role="alert"><strong>Funding action unavailable</strong><p>{error}</p></div> : null}
    {stage === "CHALLENGE_READY" ? <button className="button primary" type="button" onClick={signAndClaim}>Sign and submit funding claim</button> : <button className="button primary" type="button" disabled={!readyToRequest || stage === "SIGNING" || stage === "CLAIMING"} onClick={loadChallenge}>{stage === "SIGNING" ? "Awaiting signature…" : stage === "CLAIMING" ? "Submitting claim…" : funding.status === "READY" ? "Funding not needed" : funding.status === "CHECKING" ? "Checking balances…" : "Request funding challenge"}</button>}
    <p className="small">No automatic refill. A real low-balance user explicitly requests a capped refill after the configured cooldown. Treasury-low and partial claims remain visible outcomes.</p>
  </section>;
}
