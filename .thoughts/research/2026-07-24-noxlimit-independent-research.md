# NoxLimit Independent Research

**Date:** 2026-07-24
**Author:** Independent auditor (no involvement in prior NoxLimit research)
**Companion verdict:** [`../verification/2026-07-24-noxlimit-independent-audit.md`](../verification/2026-07-24-noxlimit-independent-audit.md)
**Method:** Live Ethereum/Arbitrum Sepolia RPC reads via `cast`, GitHub raw + `gh` API, npm registry,
Context7 `/iexec-nox/documentation`, and current primary web sources. Every material claim is pinned
below. This file records evidence; the verdict and vetoes live in the companion audit.

## Executive finding

**NoxLimit should be `DROP`ped.** It is not rule-barred and its exact state transition (a confidential
*resting* price threshold that auto-fires *one real buy on a prediction-market outcome-share AMM*) was
not found already built. But it fails on evidence the prior corpus left open:

1. **No privacy-specific demand.** Advanced order management is commoditized and already shipped
   (Gemini, Kalshi, Polymarket, Robinhood). The demand that exists is for hiding **size** (iceberg) or
   **everything** (dark pools), not for hiding **only a resting price threshold** while identity, side,
   and size stay public.
2. **Ordinary-backend equivalence.** A centralized hidden stop (already shipped by Kalshi/Robinhood), a
   backend-held trigger, or a user-run local bot all preserve the same end-user outcome at lower latency
   and complexity. That is an explicit veto in the audit prompt.
3. **The privacy boundary is thin under current Nox + unchanged FPMM.** To call the unchanged
   `FixedProductMarketMaker.buy`, the threshold-derived `minOutcomeTokensToBuy` must be a **plaintext**
   argument, so the threshold is public at execution; and each confidential evaluation the worker
   performs must be publicly decrypted, which brackets the hidden threshold against the public quote.
4. **Sponsor originality steer.** The WTF "Innovative track" text explicitly names prediction markets
   among "what we've already seen … this time we want what nobody has shipped yet," and weights
   creativity highest. A prediction-market order layer swims against that, even though it is not banned.

The technical substrate is, notably, *more* feasible than the corpus feared: `FPMM.buy` natively
enforces the atomic minimum-output bound, Chainlink BTC/USD and ETH/USD feeds are live on Sepolia, and
the current released Nox stack is exactly as pinned. Feasibility is not the reason to drop it; product
demand, privacy integrity, and sponsor fit are.

---

## Plain-language domain model

- **`YES` / `NO` outcome shares.** For "Will BTC/USD be ≥ a strike at a deadline?", the market mints two
  redeemable ERC-1155 assets. One collateral unit splits into one complete `YES + NO` set. After binary
  resolution the winning share redeems for one collateral unit and the loser for zero. `YES` and `NO` are
  **not** each separately backed by a full unit; together they are.
- **Outcome-share AMM pool.** An automated market maker holds inventory of the outcome assets and quotes
  every trade from its reserves (Gnosis FPMM is one pool per market). The **pool contract is the
  mechanical counterparty**; its **liquidity providers bear inventory risk and earn fees**. Buying `YES`
  moves reserves and raises the next `YES` quote. The displayed price is a market-implied estimate, not a
  guaranteed probability.
- **Two prices that must not be confused.** (1) The **settlement price** — a Chainlink BTC/USD
  observation at the deadline decides which side wins. (2) The **trading price** — the AMM quote decides
  whether a resting limit is currently executable. Chainlink does not decide executability; the AMM does.
- **The confidential limit.** Expressed as the maximum **fee-inclusive average collateral paid per
  share** for a fixed gross input; in scaled integers, `minOut = ceil(grossInput / maxAvgPrice)`. This is
  a pure function of the user's private threshold, not of the live quote.
- **Why a worker is needed.** A contract cannot wake itself. An external process must request evaluation,
  wait for the asynchronous Nox result, finalize the proof, and submit the pool trade. Nox is confidential
  TEE computation, not anonymity/FHE: browser, Gateway TEE, Runner TEE, relayer/worker, oracle, and the
  market are all trust boundaries with public metadata (addresses, calls, timing).
- **The unavoidable disclosure.** Because unchanged `FPMM.buy` takes `minOutcomeTokensToBuy` as a
  plaintext argument, the threshold-equivalent value becomes public at (or just before) the fill. If that
  finalization reverts because reserves moved, the order is **terminally disclosed and refundable**, not
  confidential-pending again.

This model can be explained to a prediction trader without a CLOB, token factory, market factory, or
Polymarket router — so it does **not** fail the prompt's "explainability" product-design test. It fails
elsewhere (demand, privacy integrity, sponsor fit).

---

## VERIFIED FACTS

### Hackathon rules, date, chain (Track A)

Source: DoraHacks backend JSON `https://dorahacks.io/api/hackathon/wtf-hackathon/`
(page `https://dorahacks.io/hackathon/wtf-hackathon/detail`), read 2026-07-24.

- Title "WTF !! hackathon summer edition", organizer iExec. **13 BUIDLs, 80 hackers**, prize pool
  **$1,500** (750/500/250), team size ≤ 5, single "Innovative track".
- **Deadline `end_time` epoch 1785621540 = 2026-08-01 21:59:00 UTC**, `is_extended:false`. From
  2026-07-24 that is **8 days**. (Whether the rendered header prints a literal "UTC/GMT" label beside
  "2026/08/01 21:59" is UNKNOWN — the SPA could not be rendered — but the epoch is unambiguously UTC.)
- **Required chain: Ethereum Sepolia** ("⭐⭐ Your project must be deployed on ETH Sepolia"). Note all
  three prior VIBE winners deployed on **Arbitrum** Sepolia.
- Required deliverables: public GitHub repo with README + setup/deploy/usage docs, **functional
  frontend**, **feedback.md** in the repo, **X post tagging @iEx_ec**, **demo video ≤ 4 min**, and the
  project must "work from end to end **without mock data**."
- Judging weights: creativity ⭐⭐⭐, works end-to-end without mock data ⭐⭐⭐, ETH Sepolia ⭐⭐,
  feedback.md ⭐⭐, 4-min video ⭐⭐, technical Nox use ⭐, UX ⭐.
- **Reuse rule:** "Any builder reusing a project from the previous Vibe Coding Hackathon will be
  disqualified." Self-deploying an unchanged *third-party* open-source protocol is **not addressed** —
  the page invites "you can validate your project idea with us anytime" (organizer confirmation required).
- **Prediction markets are NOT prohibited.** The only mentions are as an already-seen category: the
  Innovative-track text says "Don't rebuild what's already been built. We've already seen payments,
  lending, vaults, OTC, **prediction markets**, RWA, fundraising, and invoicing — this time we want what
  nobody has shipped yet. … The most original, boundary-pushing project wins."
- **Mainnet is NOT required.** ETH Sepolia (a testnet) is sufficient; no mainnet/production-network
  language appears.

### Prior winners re-audit (Track A)

From DoraHacks entries + repo source (`gh api`), read 2026-07-24:

- **Diam** (`PugarHuda/diam`, Arbitrum Sepolia): native confidential OTC desk — direct OTC + sealed-bid
  Vickrey RFQ, encrypted amounts, `Nox.gt/select/transfer` atomic settlement of ERC-7984 tokens.
- **RWAOS** (`pandu926/rwaOS-mvp`, Arbitrum Sepolia): confidential RWA issuance/transfer, selective
  disclosure, audit anchoring.
- **DarkOdds** (`winsznx/darkodds`, Arbitrum Sepolia): **native Nox pari-mutuel markets** (`Market.sol`
  holds `euint256` YES/NO batch + published pools, `placeBet`/`publishBatch`/`freezePool`/`claimWinnings`,
  proportional `bet × pool / winners`). `POLYMARKET_INTEGRATION.md`: "**Scope: read-only display layer …
  DarkOdds never writes back**"; `KNOWN_LIMITATIONS.md`: "**We do NOT execute trades on Polymarket … we
  never write**"; the "MIRROR ON DARKODDS" CTA spawns a **new native** market. **Confirmed: DarkOdds is
  not a Polymarket router.** The corpus's characterization was correct.

### Current Nox implementation reality (Track C)

Context7 `/iexec-nox/documentation` (refreshed 2026-07-24): "NOX Protocol … currently deployed on
**Ethereum Sepolia and Arbitrum Sepolia**"; SDK auto-resolves chain IDs **11155111** and **421614**. No
mainnet.

Live Ethereum Sepolia RPC (`publicnode.com`, block 11,341,136, 2026-07-24):

- NoxCompute proxy `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF` has code; EIP-1967 implementation slot
  `= 0xc9B5D2e99e45dc652b3B90bA5FA79667ACFEb819` — **identical to the address the wiki recorded on
  2026-07-22**. No Ethereum-side implementation drift.
- Arbitrum Sepolia (chain 421614) proxy `0xd464B198f06756a1d00be223634b85E0a731c229` has code; impl
  `= 0x4773dbe9ab49278315bf4feabed9d1870df819ce` — **distinct from Ethereum's**, confirming the corpus's
  cross-chain upgrade-drift note. Use the Ethereum implementation as authoritative for the required chain.

npm registry (2026-07-24) — pins are still head:

- `@iexec-nox/nox-protocol-contracts` **0.2.4**, gitHead `1a2ebd45…` ✓
- `@iexec-nox/handle` **0.1.0-beta.13** (dist-tag `latest`), gitHead `e552f6a3…` ✓
- `@iexec-nox/nox-hardhat-plugin` **0.1.0** ✓

The wiki facts on binding, ACL, and proofs are consistent with released source and were not contradicted:
inputs bind to owner wallet + consuming app (`wallet → app → Nox.fromExternal`); router-first ingestion
breaks the owner check; handles must be persisted with `allowThis`; viewer/public grants are irreversible;
input and public-decryption proofs are **not** replay-consumed and need application-level guards; only
`bool/uint16/uint256/int16/int256` are supported end to end; computation/decryption is asynchronous.

### Market substrate (Track D)

Gnosis pins (GitHub raw, 2026-07-24):

- `@gnosis.pm/conditional-tokens-contracts` **v1.0.3**, **LGPL-3.0**, `pragma solidity ^0.5.1`.
- `@gnosis.pm/conditional-tokens-market-makers` **v1.8.1**, **LGPL-3.0**, `pragma solidity ^0.5.1`.
- **`FixedProductMarketMaker.buy(uint investmentAmount, uint outcomeIndex, uint minOutcomeTokensToBuy)`**
  computes `outcomeTokensToBuy = calcBuyAmount(investmentAmount, outcomeIndex)` and enforces
  `require(outcomeTokensToBuy >= minOutcomeTokensToBuy, "minimum buy amount not reached")`. The FPMM
  references `onERC1155Received` (it holds ERC-1155 shares and sends bought shares to `msg.sender`).
  **This is the exact atomic minimum-output protection NoxLimit's design depends on, native to the
  unchanged pool.** No official Gnosis Sepolia deployment was found; self-deployment on Sepolia would be
  required and needs multi-compiler/pinned-artifact handling for the 0.5.1 stack alongside a 0.8.35 Nox
  order contract.

Seer (live Ethereum Sepolia, 2026-07-24):

- MarketFactory `0x221456ACFD185EE168052B3DA899939303775C7a`, ConditionalTokens
  `0x8bdC504dC3A05310059c1c67E0A2667309D27B93`, Router `0xdEB5dC052e55bf81C6d75CD47C961e0b280B3791` — all
  have substantial code. **`marketCount()` = 19** (reproduces the corpus's "19 clones").
- market[0] `= 0xb398fc521053818c2f13819E7af2D5C8B46723e1` (matches the corpus's "first market");
  `numOutcomes()` = 2 with a separate `INVALID` wrapped position; wrapped `YES`
  `= 0x1Bb85e42a35fedD95c8d272d8B677ba63b9d7afe`. Seer's fixed factory uses RealityETH (302,400-second
  timeout), so an immediate Chainlink resolver would be new application work, not an unchanged Seer path.
- Uniswap V3 factory `0x0227628f3F023bb0B980b67D528571c95c6DaC1c` is live on Sepolia. No ready liquid
  outcome-share pool was found in the sampled market (consistent with the corpus). **"Not found," not an
  exhaustive "none exists."**

### Oracle and automation (Track E)

Live Ethereum Sepolia (2026-07-24, block ts 1784901480):

- **Chainlink BTC/USD `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43`**: `description "BTC / USD"`,
  `decimals 8`, `latestRoundData.answer = 6406905295993` → **$64,069.05**, `updatedAt 1784901156`
  (~5.4 min old — fresh). Note the Sepolia feed value differs from real BTC; strikes must be set against
  the feed's live value, not mainnet BTC.
- **Chainlink ETH/USD `0x694AA1769357215DE4FAC081bf1f309aDC325306`**: `"ETH / USD"`, answer
  `185133000000` → **$1,851.33**, `updatedAt 1784901228` (~4.2 min old).
- **Chainlink Automation v2.1 sunsets 2026-07-31 (testnet 2026-06-24)**, migrating to CRE — it
  **overlaps the WTF deadline and is not a safe worker dependency**. A hosted/permissionless worker is the
  honest automation choice.

---

## INFERENCES

- The NoxLimit mechanic's originality is **narrow, not broad**. The exact "confidential resting threshold →
  auto-fired real prediction-AMM buy" was not found, but the adjacent mechanic is already occupied:
  `RaYYeR220/occulta` (live on Nox, Ethereum Sepolia) seals a trading policy with "entry/exit triggers …
  executes for real on unmodified Aave V3 and Uniswap V3", and `joymadhu49/fhe-market` (Zama FHEVM Sepolia)
  runs "public CPMM, private positions … encrypted buyIntent → relayer decrypt → executeBuy applies CPMM"
  — a confidential intent firing a real outcome-share buy, minus the *resting-threshold* twist.
- The dominant onchain prediction venues are **CLOBs, not AMMs** (Limitless is a central limit order book;
  Polymarket/Kalshi are order books). A resting limit *against an AMM* is an atypical market structure;
  resting limits normally live on books. NoxLimit's AMM framing is a convenience for Nox composition, not
  where traders actually rest orders.
- Sponsor fit is weak: the judging rubric weights creativity ⭐⭐⭐ and explicitly lists prediction markets
  as already-seen. Even a novel sub-mechanic must overcome "we've already seen prediction markets."
- With unchanged FPMM, "hide the threshold while resting" holds only until the first genuine finalization
  attempt, and erodes with each worker evaluation. The honest privacy claim is "threshold hidden while
  genuinely resting and un-probed; bracketed by evaluations; fully disclosed at fill."
- FPMM's native atomic `minOutcomeTokensToBuy` means the **atomicity gate the corpus feared is passable**;
  the corpus over-weighted implementation risk relative to demand/privacy risk.

## CONTRADICTIONS (vs prior corpus)

- The corpus framed the **atomicity gate** (safe stale-quote handling) as a top kill risk. Primary source
  shows unchanged `FPMM.buy` already enforces `minOutcomeTokensToBuy` atomically against current reserves —
  this gate is **substantially de-risked**, not open.
- The corpus's `KEEP AND VERIFY` implicitly treated the demand gate as merely "unproven / worth auditing."
  The demand audit resolves it **against** the product: advanced orders are commoditized, no privacy-
  specific demand was found, and simpler tools preserve the outcome (ordinary-backend equivalence). This is
  a veto, not an open question.
- The corpus said mainnet migration is "a roadmap, not a delivered feature." Confirmed and strengthened:
  Context7 + live RPC show **only** the two testnets; there is **no** same-chain production integration.

## UNKNOWN / TEST REQUIRED

- **Nox latency P50/P95.** Only one ~12-second multi-op Sepolia sample exists; a distribution cannot be
  claimed without many live operations, which would require deploying (out of scope for this read-only
  audit). **P50/P95 remain UNKNOWN.**
- Whether the DoraHacks header prints a literal timezone label beside the deadline (epoch = UTC is known).
- Organizer's stance on self-deploying an unchanged third-party protocol as one's base (rules silent).
- Whether current Nox can reveal *only* a successful, order-bound authorization without publishing each
  failed comparison — reasoning below says no with unchanged FPMM, but a spike is the only proof.
- The 13 private WTF submissions cannot be fully audited (list is private); the public GitHub scan is a
  lower bound, so "not found" ≠ "does not exist."

---

## Demand evidence (Track B)

**Advanced order management is commoditized (VERIFIED, category evidence only):**

- Gemini prediction-markets spec ships **limit + stop-limit** with GTC/IOC/FOK and maker-or-cancel.
- Kalshi Pro ships resting limit orders, GTC/expiring, **take-profit/stop-loss**, reduce-only, drag-to-
  reprice, batch cancel, order-group auto-cancel.
- Polymarket CLOB ships GTC/GTD resting limits + FOK/FAK, open-order listing, order heartbeats.
- Robinhood event contracts ship limit (GTD) + IOC, routed as IOC limit orders into Kalshi's book.
- Limitless (onchain, Base) is a **CLOB** with limit + market orders.

**The three propositions that actually matter:**

1. *Traders use/request limit & stop orders* — strong (vendors shipped them; iceberg/size-hiding is
   documented). But this is **feature/category evidence, not privacy-demand evidence.**
2. *Public resting intent is a cited, measured harm on transparent onchain venues* — **mostly
   speculative.** Front-running/MEV/copy-trading of *visible* flow is real and cited on Polymarket, but
   the leading survey (SoK: DePM microstructure, arXiv 2510.15612) marks MEV on DePMs **unmeasured** and
   order-flow privacy **unexplored**; documented harm is about hiding **size**, not a **price threshold**.
3. *Traders will accept Nox latency + extra txns + TEE trust to hide only the threshold* — **no supporting
   evidence.** Observed privacy demand is for hiding **size** (iceberg) or **everything** (Renegade dark
   pool), not a threshold-only product with public identity/side/size.

**Simpler alternatives that preserve the outcome:**

| Alternative | Same end-user outcome? | Trust / cost change |
|---|---|---|
| Centralized hidden stop (Kalshi/Robinhood TP-SL) | **Yes**, already shipped | trust the operator (already accepted to trade there) |
| Application-server encrypted trigger (backend bot) | **Yes** | trust the server; no chain latency/txn overhead |
| Commit–reveal | Partial | trustless pre-reveal, but adds a reveal tx; no hands-off auto-execute without revealing |
| Private tx submission (Flashbots-style) | No | hides only in-flight, not a *resting* threshold |
| User-operated local bot | **Yes**, max trust-minimization | must keep a machine/keys online; zero third-party trust |
| Public limit order | No (threshold public) | the baseline being beaten |
| Ordinary onchain automation (Gelato/CRE) | Execution yes; privacy only if condition held off-chain | same operator-trust NoxLimit's TEE claims to remove |

For most users a centralized hidden stop, a backend trigger, or a local bot deliver the same outcome at
lower complexity/latency. NoxLimit's differentiated value collapses to a user who insists on a transparent
onchain venue, refuses operator/local-machine trust, yet accepts a TEE boundary + seconds of latency +
extra transactions, to hide **only** the threshold. No evidence that this segment exists or asks for it.

## Current competitors / prior art (Track A2)

- **Exact mechanic not found** in a GitHub + web scan (winner or not, hackathon or product).
- **Adjacent, on Nox, live:** `RaYYeR220/occulta` (sealed policy + triggers → real execution on unmodified
  Aave/Uniswap, Ethereum Sepolia); `nonggde/noxguard` (encrypted policy → gateway finalization → WETH
  execution).
- **Adjacent, prediction domain:** `joymadhu49/fhe-market` (Zama, confidential intent → real CPMM
  outcome-share buy — fires immediately, no resting threshold); `0x-pankaj/shadowstate` (Solana/Arcium,
  sealed limit orders in a prediction dark pool, batch-auction matched); `winsznx/darkodds` (native Nox
  pari-mutuel). `wthelly` (HackMoney; Uniswap v4 hook monitors price, auto-resolves; private positions).
- **General prior art:** onchain hidden orders are established (Renegade dark pool). So the general concept
  is not novel; only the narrow prediction-AMM-resting-threshold framing is unclaimed in this scan.
- **July WTF cohort:** 36 `iexec nox` repos (21 created ≥ 2026-07-01), dominated by payroll/treasury/
  Safe-policy/private-swap; **no** prediction/limit-order project besides darkodds. DoraHacks's 13
  submissions are private — scan is a lower bound.

## Nox network / release reality (Track C, summarized)

Live on Ethereum Sepolia (11155111) and Arbitrum Sepolia (421614) only; **no official production mainnet**.
Ethereum implementation stable at `0xc9B5…b819`; released packages exactly as pinned (0.2.4 / beta.13 /
0.1.0). Async compute; irreversible public-decryption; application-level replay guards required; five
supported encrypted types. Honest claim: "a live Ethereum Sepolia product using real Nox computation and
real outcome shares, with a future same-chain mainnet migration when official Nox mainnet support exists."

## Oracle, liquidity, automation reality (Track E, summarized)

Chainlink BTC/USD and ETH/USD are live and fresh on Ethereum Sepolia (8 decimals). Chainlink Automation
v2.1 sunsets 2026-07-31 → use a hosted/permissionless worker, not Automation. Liquidity must be
sponsor-seeded (no organic Sepolia outcome-share liquidity found); a small seeded pool proves mechanics
but is manipulable — an attacker can push the quote across a hidden threshold, force a fill, and revert the
push, which is a real economic concern the audit weighs.

---

## Source ledger

**Live chain reads (Ethereum Sepolia RPC `https://ethereum-sepolia-rpc.publicnode.com`, 2026-07-24, block 11,341,136):**

```bash
cast code 0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF                       # NoxCompute proxy: has code
cast storage 0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF \
  0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc        # impl = 0xc9B5…b819
cast call 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43 "latestRoundData()(uint80,int256,uint256,uint256,uint80)"  # BTC/USD $64,069.05, 8dp
cast call 0x694AA1769357215DE4FAC081bf1f309aDC325306 "latestRoundData()(uint80,int256,uint256,uint256,uint80)"  # ETH/USD $1,851.33
cast call 0x221456ACFD185EE168052B3DA899939303775C7a "marketCount()(uint256)"                                    # Seer = 19
# Arbitrum Sepolia RPC https://sepolia-rollup.arbitrum.io/rpc:
cast storage 0xd464B198f06756a1d00be223634b85E0a731c229 \
  0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc        # impl = 0x4773…19ce (differs from Ethereum)
```

**GitHub raw / npm:**

- FPMM `buy` + pragma + license: `https://raw.githubusercontent.com/gnosis/conditional-tokens-market-makers/6814c0247c745680bb13298d4f0dd7f5b574d0db/contracts/FixedProductMarketMaker.sol`
- CT package: `https://raw.githubusercontent.com/gnosis/conditional-tokens-contracts/eeefca66eb46c800a9aaab88db2064a99026fde5/package.json` (v1.0.3, LGPL-3.0, ^0.5.1)
- `npm view @iexec-nox/handle version` → 0.1.0-beta.13; `@iexec-nox/nox-protocol-contracts` → 0.2.4

**Web / API (2026-07-24):**

- WTF rules JSON: `https://dorahacks.io/api/hackathon/wtf-hackathon/` (page `/hackathon/wtf-hackathon/detail`) — deadline 2026-08-01 21:59 UTC, ETH Sepolia required, prediction markets listed as "already seen."
- DarkOdds: `github.com/winsznx/darkodds` — `README.md`, `docs/POLYMARKET_INTEGRATION.md`, `KNOWN_LIMITATIONS.md`, `contracts/src/Market.sol` (native markets; Polymarket read-only).
- Gemini `https://developer.gemini.com/prediction-markets-spec/trading`; Kalshi `https://news.kalshi.com/p/kalshi-pro-trading-terminal` + `https://help.kalshi.com/en/articles/15357637`; Polymarket `https://docs.polymarket.com/trading/orders/overview`; Robinhood `https://robinhood.com/us/en/support/articles/trading-event-contracts/`; Limitless `https://docs.limitless.exchange/`.
- SoK DePM microstructure `https://arxiv.org/html/2510.15612`; Renegade `https://docs.renegade.fi/`.
- Chainlink Automation supported networks `https://docs.chain.link/chainlink-automation/overview/supported-networks` — v2.1 sunset 2026-07-31.
- Context7 `/iexec-nox/documentation` — Ethereum Sepolia + Arbitrum Sepolia only.
- Adjacent projects: `github.com/RaYYeR220/occulta`, `github.com/joymadhu49/fhe-market`, `github.com/0x-pankaj/shadowstate`, `github.com/nonggde/noxguard`.

**Corpus pins reused:** `.thoughts/sources/source-manifest.md`, `.thoughts/wiki/nox-protocol.md`,
`.thoughts/wiki/nox-developer-stack.md`, `.thoughts/wiki/nox-integration-patterns.md`,
`.thoughts/wiki/nox-known-contradictions.md`.
