# NoxLimit Independent Audit and Verdict

**Date:** 2026-07-24
**Auditor:** Independent (no prior NoxLimit involvement)
**Evidence:** [`../research/2026-07-24-noxlimit-independent-research.md`](../research/2026-07-24-noxlimit-independent-research.md)
**Prior corpus status audited:** `KEEP AND VERIFY`

---

## 1. Verdict

# `DROP`

NoxLimit — a confidential resting buy-limit whose hidden price threshold, when met, fires one real buy on
a prediction-market outcome-share AMM — should not proceed. It is **not** rule-barred, and its exact state
transition was **not** found already built. It is dropped on product grounds, not feasibility grounds:

- **No privacy-specific demand** for hiding *only* a resting threshold (Track B).
- **Ordinary-backend equivalence** — a centralized hidden stop, a backend trigger, or a local bot preserve
  the same end-user outcome (explicit veto).
- **Thin privacy boundary** — unchanged `FPMM.buy` needs a plaintext `minOutcomeTokensToBuy`, so the
  threshold is public at execution, and each worker evaluation brackets it beforehand.
- **Weak sponsor fit** — the WTF Innovative track explicitly names prediction markets as "already seen" and
  weights creativity highest.

I decline to force adjacent replacements. The audit surfaced no adjacent shape that simultaneously clears
collision (occulta already does confidential-trigger→real-execution on Nox), the sponsor's "what nobody has
shipped yet" bar, and a real privacy-specific demand. The disciplined next action is **not** a new product
pitch — it is to restart docs-first discovery against the sponsor's originality steer and validate any
candidate with the organizer before building.

This reverses the corpus's leading hypothesis. It is issued before any improvement suggestion, per the
audit's own rule against optimizing for agreement.

## 2. Fatal issues (the vetoes)

1. **Privacy-specific demand is absent (Track B).** Advanced order management is commoditized and shipped
   (Gemini, Kalshi, Polymarket, Robinhood). The only documented privacy demand is for hiding **size**
   (iceberg) or **everything** (Renegade-style dark pools). No source shows traders wanting to hide **only
   a resting price threshold** while leaving identity, side, and size public — let alone paying async TEE
   latency and extra transactions for it.
2. **Ordinary-backend equivalence.** Kalshi/Robinhood already keep stop/TP triggers server-side and private
   until they fire; a backend bot or a user-run local bot deliver the identical outcome. NoxLimit only
   differs for a user who refuses all operator/local-machine trust yet accepts a TEE trust boundary — an
   unevidenced segment. The audit prompt lists "ordinary-backend equivalence" as a standalone veto.
3. **Privacy integrity is thin under current Nox + unchanged FPMM.** To call unchanged
   `FixedProductMarketMaker.buy(investmentAmount, outcomeIndex, minOutcomeTokensToBuy)`, `minOut` must be a
   **plaintext** argument. So the threshold-equivalent is public at (or immediately before) the fill. And
   because the worker cannot privately read an encrypted eligibility result in the EVM, each evaluation it
   performs must be **publicly decrypted**, which brackets the hidden threshold against the public quote.
   The product can honestly claim "hidden while genuinely resting and un-probed," not "hidden until fill."
4. **Sponsor originality steer.** Not fatal alone, but compounding: the rubric weights creativity ⭐⭐⭐ and
   explicitly says "we've already seen … prediction markets … we want what nobody has shipped yet."

Any one of vetoes 1–2 is sufficient. They co-occur.

## 3. Scorecard and vetoes

Scored 0–5. **Vetoes override the total** — this is not an average.

| Dimension | Score | Basis |
|---|---:|---|
| Urgent, concrete user problem | 2 | Order management is real; "hide my resting threshold onchain" is not urgent (centralized venues already keep stops private) |
| **Privacy-specific demand** | **1** | **VETO** — no evidence (Track B); demand is for hiding size/everything, not a threshold |
| Return-use potential | 2 | Testnet-only, single curated market |
| Originality | 3 | Exact mechanic not found, but sponsor de-prioritizes prediction markets and occulta already ships confidential-trigger→real-execution on Nox |
| **Nox indispensability** | **2** | **VETO risk** — ordinary backend / local bot / centralized hidden stop preserve the outcome |
| Current released-API feasibility | 4 | Nox live on Sepolia; publicDecrypt path real; packages exactly pinned |
| Same-chain protocol feasibility | 3 | FPMM.buy atomic minOut is native (de-risked); but self-deploy 0.5.1 stack + custody adapter, no official Gnosis Sepolia deployment |
| Security & economic safety | 2 | Small seeded pool is manipulable (push quote across hidden threshold, force fill, revert push); custody adapter risk; stale-quote itself is handled by atomic minOut |
| Automation credibility | 3 | Hosted/permissionless worker is honest; Chainlink Automation v2.1 sunsets 2026-07-31 (unusable); browser-off needs a live worker service |
| Real-data / real-action integrity | 4 | Real Chainlink feed, real FPMM buy, real ERC-1155 shares, real redemption |
| Fresh-user tryability | 2 | Collateral + gas + approvals + encrypt + async wait + seeded liquidity; inherent Nox wait defeats a genuine 30-second order |
| One-builder deadline scope | 2 | 8 days for two-compiler self-deploy + adapter + encrypted-order contract + worker + resolution/redemption + leakage-safe design + docs/video/adversarial tests |
| Post-hackathon extensibility | 2 | No Nox mainnet; migration is roadmap only |

**Overriding vetoes:** privacy-specific demand (1) and ordinary-backend equivalence (Nox indispensability 2).
Per the rubric, the strong feasibility/integrity scores (4s) **cannot compensate**.

## 4. Strongest case *for* the product

- The state transition is genuinely coherent and, on the narrow axis of "confidential *resting threshold*
  → *prediction* outcome-share buy," was **not found already built**.
- The technical substrate is *more* ready than the corpus feared: **`FPMM.buy` natively enforces the atomic
  minimum-output bound**, so a stale Nox result cannot force a worse-than-limit fill; Chainlink BTC/USD and
  ETH/USD are live on Sepolia; the released Nox stack is exactly pinned and its `encryptInput → fromExternal
  → persist → compare → publicDecrypt → verify → one-shot action` spine is real.
- For a hackathon *prize*, a clean, real, no-mock end-to-end Nox integration with objective resolution is a
  credible artifact even without mass-market demand.

This is the honest upside. It is not enough against the vetoes, and the sponsor's rubric rewards originality
over a polished build in an "already-seen" category.

## 5. Strongest case *against* the product

Sections 2–3. In one line: **it hides something few want hidden, in a way simpler tools already achieve,
with privacy that leaks at execution, in a category the sponsor has explicitly asked builders to leave.**

## 6. Privacy boundary (honest statement)

- **Confidential while genuinely resting and un-evaluated:** the maximum fee-inclusive average price (i.e.
  `minOut = ceil(grossInput / maxAvgPrice)`), held as an encrypted `uint256`.
- **Public throughout:** owner wallet, application contract, market, outcome side, fixed escrow/size,
  submission and evaluation timing, the eventual fill, resulting outcome-token holdings, resolution, and
  redemption.
- **Disclosed by the mechanism itself:** because unchanged `FPMM.buy` takes plaintext `minOutcomeTokensToBuy`,
  the threshold-equivalent becomes public at/just before the fill. If finalization reverts (reserves moved),
  the order is **terminally disclosed and refundable**, never confidential-pending again.
- **Eroded by evaluation:** each worker evaluation must publicDecrypt an eligibility result, letting an
  observer bracket the threshold between the highest "not yet" public quote and the successful quote.
- **Not provided:** anonymity, hidden positions, hidden size/side, FHE, trustless execution, invisible
  timing. Browser, Gateway TEE, Runner TEE, worker, oracle, and market are trust boundaries.

**Open question, answered negatively for the MVP:** current Nox cannot reveal *only* a successful
order-bound authorization without publishing failed comparisons, because the EVM-side actor must decrypt to
act. A Prompt-3 spike is the only way to falsify this, but the reasoning is adverse.

## 7. Security and economic threat model

- **Stale quote (TOCTOU):** mitigated natively — `FPMM.buy`'s `require(outcomeTokensToBuy >= minOut)`
  re-checks current reserves atomically. Good.
- **Pool manipulation on a small seeded pool:** an attacker can push the quote across the hidden threshold,
  force a fill at the victim's limit, and revert the push. Requires depth measurement (cost to move 1/5/10%)
  and is a real economic risk on any demo-sized pool. **UNKNOWN / TEST REQUIRED.**
- **Custody:** FPMM sends ERC-1155 shares to `msg.sender`, so the order adapter receives them and must
  implement `onERC1155Received` and atomically forward to the immutable recipient (or hold with owner-only
  withdrawal). The **worker must receive no token approval or withdrawal authority.**
- **Replay:** Nox input proofs and public-decryption proofs are **not** consumed on-chain; the order contract
  must add a per-order replay guard and one-shot terminal state consumption. The proof carries no
  order/market/round/nonce — application state must supply it.
- **Worker powers:** can delay/censor and is exposed to public-mempool ordering (loses price improvement /
  can be sandwiched up to the limit) but **cannot** change owner/market/side/amount/limit/recipient or fill
  worse than the committed limit — provided the adapter is correct and the worker holds no approval.
- **Leakage:** as in §6, repeated evaluations bracket the threshold; timing and post-fill holdings further
  reveal intent.

## 8. Performance and transaction budget

- **Nox latency:** one ~12 s multi-op Sepolia sample. **P50/P95 UNKNOWN** — a distribution cannot be claimed
  from n=1, and generating more requires deployment (out of read-only scope). Do not promise "30-second"
  fills.
- **Fresh-user transaction path (each a signature/wait):** acquire test gas → acquire exact collateral →
  approve collateral to order contract → submit encrypted order (encrypt + `fromExternal`) → [browser may
  close] → worker requests evaluation → async Nox wait → worker finalizes (publicDecrypt + `FPMM.buy`) →
  outcome-share receipt → later resolution → redemption; plus cancel/expiry/refund branches. This is a
  multi-transaction, multi-minute path with an inherent async wait — **not** a genuine 30-second order.

## 9. Fresh-user / judge-path audit

The judge path must not depend on local setup, a second wallet, another human, manual contract calls, a
faucet hunt, a staged matcher, mock prices, a seeded "success" value, or self-reported execution. NoxLimit
can meet the *no-second-human / no-mock* bar (the AMM is the counterparty; Chainlink is real; the fill is
real). But it inherently requires collateral + gas + approvals + an async Nox wait + sponsor-seeded
liquidity, and the "hidden threshold" value is invisible to a judge except as an abstract claim — the demo's
most novel element is the least observable. "Try in 30 seconds" (comprehension + genuine order without
choreography) is not achievable given the async wait; the honest UX is a durable pending state.

## 10. Architecture comparison (read-only substrate feasibility, not a chosen design)

| | **A. Gnosis CTF + FPMM** | **B. Seer + Uniswap V3** | **C. Others** |
|---|---|---|---|
| Contracts/assets | CT v1.0.3 + FPMM v1.8.1 (ERC-1155) | Seer markets + wrapped ERC-20 outcomes | Polymarket CTF Exchange / CoW / 1inch |
| Chain | must self-deploy on ETH Sepolia | Seer live on ETH Sepolia (19 markets) | Polygon/Amoy-oriented; no clean Sepolia fit |
| Atomic minOut | **native `buy(...,minOutcomeTokensToBuy)`** | via Uniswap `amountOutMinimum` | varies |
| Outcome liquidity | sponsor-seeded (one pool/market) | **no ready Sepolia pool found**; app-owned LP work | n/a |
| Custody | adapter receives ERC-1155, must forward | ERC-20 simpler, but multi-pool parity/arbitrage | operator/matcher infra |
| Resolution | app-owned Chainlink oracle fits | RealityETH 302,400 s timeout — new resolver needed | n/a |
| Compiler | 0.5.1 + 0.8.35 dual stack | 0.8.20, modern | mixed |
| License | LGPL-3.0 | MIT | Polymarket BSL-1.1 (change date 2030) |
| Deadline risk | high (self-deploy + adapter) | high (build Sepolia liquidity + resolver) | very high |
| Verdict | smallest *if* the product were kept | larger scope | reject for this deadline |

**Recommended substrate: none — the product gate fails.** If (counterfactually) the product survived,
**Candidate A (CTF+FPMM)** is the smallest because FPMM's native atomic minOut matches the requirement, but
its old dual-compiler self-deploy and custody adapter keep it high-risk for 8 solo days. A hypothetical
integration boundary must not become evidence the product deserves to exist.

## 11. Exact claims corrected from the existing corpus

- **Atomicity gate is largely de-risked, not open.** Primary source: unchanged `FPMM.buy` enforces
  `require(outcomeTokensToBuy >= minOutcomeTokensToBuy)`. The corpus listed the atomicity gate among top kill
  risks; it is passable at the substrate. (Privacy of the revealed minOut is the real residual issue.)
- **Demand gate resolves *against*, not "unproven."** The corpus's `KEEP AND VERIFY` treated demand as worth
  auditing; the audit found commoditized features (category evidence), no privacy-specific demand, and
  ordinary-backend equivalence — a veto.
- **No Ethereum-side Nox drift.** The live Ethereum implementation is still `0xc9B5…b819`, identical to the
  2026-07-22 record. Only the Arbitrum proxy differs (`0x4773…19ce`) — the required chain is stable.
- **Release pins still current.** npm confirms 0.2.4 / beta.13 / 0.1.0 with matching gitHeads on 2026-07-24.
- **Deadline pinned:** 2026-08-01 21:59 **UTC** (epoch 1785621540), 8 days out; required chain **Ethereum**
  Sepolia (prior winners were on Arbitrum Sepolia — do not inherit their chain).
- **Prediction markets are not prohibited**, but are explicitly listed by the sponsor as "already seen."
- **DarkOdds re-confirmed** as native Nox markets + read-only Polymarket display — not a router.

## 12. Minimal Prompt-3 spike

**None authorized.** The verdict is `DROP`; Prompt 2 and Prompt 3 remain disallowed. Had the verdict been
`KEEP`, the single smallest disposable spike would have been the privacy-integrity question (§6): can a
worker advance evaluation and finalize a real `FPMM.buy` on Sepolia **without** publicly disclosing the
threshold before the intended fill, and how tightly do repeated evaluations bracket it? That is the gate the
product most needs and the one the reasoning says it fails.

## 13. Explicit stop condition

Stop here. Do not write product code, deploy contracts, send transactions, choose or design an architecture,
or advance Prompt 2 / Prompt 3. Selection is the user's call: `DROP` is the auditor's verdict, not a
selection event. Preserve the rejection graveyard. If the user wants to continue on Nox at all, the next
step is a fresh docs-first discovery pass aimed at the sponsor's "what nobody has shipped yet" bar, with
organizer idea-validation *before* any build — not a NoxLimit rework.

---

## Four ledgers (consolidated)

**VERIFIED FACT** — WTF deadline 2026-08-01 21:59 UTC, ETH Sepolia required, prediction markets "already
seen" not banned, reuse rule bars only prior VIBE projects; DarkOdds native+read-only; Nox live only on
Sepolia testnets (impl `0xc9B5…b819` stable), packages pinned; `FPMM.buy` atomic minOut native (v1.8.1
LGPL-3.0 ^0.5.1); Chainlink BTC/USD ($64,069.05) + ETH/USD live 8dp on Sepolia; Chainlink Automation v2.1
sunset 2026-07-31; Seer live Sepolia (19 markets) with INVALID position + RealityETH; advanced orders
commoditized across venues.

**INFERENCE** — originality is narrow (adjacent occulta/fhe-market already occupy confidential-trigger→real-
execution); dominant onchain venues are CLOBs not AMMs; privacy holds only while un-probed; sponsor fit is
weak; CTF+FPMM is the smallest substrate *if* kept.

**CONTRADICTION** — atomicity gate is de-risked (corpus over-weighted it); demand gate resolves against
(corpus left it open); "no drift" for Ethereum Nox (corpus warned of possible drift).

**UNKNOWN / TEST REQUIRED** — Nox P50/P95 latency (n=1); whether Nox can reveal only successful
authorizations without leaking failures; pool-manipulation cost on a seeded pool; organizer stance on
self-deploying unchanged third-party protocol; contents of the 13 private WTF submissions; literal timezone
label in the DoraHacks header.
