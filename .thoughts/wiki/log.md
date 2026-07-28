# iExec-Nox wiki log

This file is chronological history. Current workflow authority is
[`../decisions/CURRENT.md`](../decisions/CURRENT.md); older statements such as “remain blocked”
describe their dated checkpoint and do not route new work.

## 2026-07-28 — DeepBook-informed product architecture adopted

- Kept NoxLimit's verified FPMM/confidential-order mechanic and borrowed only truthful DeepBook
  product patterns: direct terminal, market catalog, quote preview, typed unsigned-transaction
  client, durable receipts, Orders, Positions, and Activity.
- Expanded the intended catalog from a BTC-only verification slice to BTC/USD and ETH/USD plus
  SOL/USD after a dedicated Pyth settlement-adapter test, with 1h/4h/24h horizons.
- Kept one immutable single-market OrderBook per deployed bundle and prohibited fake CLOB depth;
  the liquidity view is a real FPMM quote ladder.
- Adopted post-gate Opus corrections for an explicit check budget, `MonitoringExhausted`,
  status-aware candidate reads, resolver-first deployment, stronger mutation/error tests, truthful
  recovery provenance, and final cadence guards.
- Recorded the user's scheduling correction: historical hackathon/spike clocks do not route work,
  force deployment, or justify lowering correctness. Prompt 4 is staged but awaits explicit build
  authorization.

## 2026-07-28 — live Gate C passed on Ethereum Sepolia

- Completed the false/withheld/two-quiet privacy trace against the live Nox release with four
  nonce-distinct candidates. The three earlier/withheld candidates remain private; only the
  successful candidate became public.
- Deployed the actual OrderBook at `0x5AfFd32C5e8Fc0B61d99a1a7AAD505cCC4947d28` and finalized one
  real Nox-authorized FPMM buy in transaction
  `0xbae85703bb59878fa63838e03c1bc57cdcdc46f6e2f74ac701b38fc85d088caa`.
- Verified exact recipient share delivery, pool deltas, result consumption, zero adapter
  collateral/shares/allowance, and replay rejection. Independent audits found all 33 recorded
  transactions successful.
- Preserved two operational interruptions honestly: an invalid 20M deployment gas override before
  OrderBook broadcast, then insufficient mover gas reservation after publication. The validated
  setup and same order were resumed; neither interruption was a contract or architecture failure.
- Prompt 3 is `GO`. Objective BTC/USD resolution, polished UX, onboarding, and submission readiness
  remain build work. The active route is the user's polished-build checkpoint.

## 2026-07-28 — Prompt 3 local critical path passed

- Verified the released Nox path and combined `NoxLimitOrderBook` locally with 16 tests, including
  nonce/ACL isolation, permissionless rescue, real FPMM execution, multi-order escrow isolation,
  rollback/refund behavior, unsolicited ERC-1155 rejection, and oversized-revert handling.
- Independently verified the exact Conditional Tokens/FPMM lifecycle and price-cap conversion with
  8 clean tests and byte-identical pinned-source provenance.
- Verified live Ethereum Sepolia RPC/Nox/Gateway/subgraph availability plus SDK input encryption
  and proof validation without a signer.
- Prepared a fail-closed live runner that reproduces the false/withheld/two-quiet inference trace,
  uses real reserve-moving buys, and attempts the combined permissionless fill. Prompt 3 remains
  `CONDITIONAL GO` only because the dedicated signer has zero Sepolia ETH.

## 2026-07-28 — architecture approved and Prompt 3 activated

- Recorded the user's approval of the canonical NoxLimit architecture and activation of the
  bounded disposable Prompt 3 spike.
- Reconciled an independent Claude Opus 5 review: accepted the worker-triggered disclosure/DoS and
  evaluation-metadata risks, rejected the claimed released-API mismatch, and added exact Gate A
  evidence for permissionless rescue, nonce-distinct handles, proof/ACL isolation, and public
  inference measurement.
- Product selection remains closed; polished implementation remains blocked until Prompt 3 passes
  and the user reviews its verdict.

## 2026-07-23 — docs-first candidate audit completed

- Investigated nine concrete products across Invoicing/Payments, DeFi/Lending, Vaults/Yield,
  Identity, NFT, and Prediction Markets.
- Separately pressure-tested the two initial near-survivors: Private Quote-to-Pay and a
  Confidential Closed-Loop Gift Card.
- Rejected Quote-to-Pay after finding a direct PaySec collision, a current optimized ERC-7984
  callback-amount ACL mismatch, public wrap/relationship leakage, and a failed fresh-user path.
- Rejected the gift card after verifying ordinary issuer-database equivalence, visible or trusted
  funding, weak independent-entitlement demand, Sigill/FHE2P collision, and consumer-card policy
  scope.
- Recorded the then-current `NONE SURVIVE` verdict. At this 2026-07-23 checkpoint, product
  selection, Prompt 2, architecture, and implementation were blocked pending genuinely new
  evidence; that workflow state was superseded by the later NoxLimit selection.

## 2026-07-23 — complete documentation and use-case correction

- Read the complete 7,090-line `llms-full.txt` capture, the supplied attachment, and the current
  documentation source at commit `ce4262e`.
- Found that `llms-full.txt` silently omits the Vue-rendered Use Cases product cards and ten-category
  application grid.
- Added an evidence-tiered product map covering shipping references, executable building blocks,
  detailed concept pages, and all ten official application categories.
- Reopened lending, invoicing, identity-shaped, NFT, and other docs-led directions for research
  while preserving current runtime limits and collision checks.
- Reverified from contract source and live chain state that DarkOdds was a native Nox prediction
  market; its Polymarket integration was display-only.

## 2026-07-23 — feasibility-first product reset

- Retired every historical front-runner; no product was selected or leading at this checkpoint.
- Recorded the user's rejected product families as exclusions rather than candidates to rename.
- Added a winner-pattern and shipping-product research prompt that makes feasibility a veto.
- Preserved old idea reports as historical collision and rejection evidence only.

## 2026-07-23 — winner and opportunity audit

- Verified the previous VIBE winner ranking: Diam first, RWAOS second, and DarkOdds third.
- Cloned and inspected each entry-linked winner repository at an explicit commit SHA.
- Confirmed the current WTF suggested targets are optional and the 13-submission DoraHacks list is private.
- Refreshed the public July competitor scan to 20 repositories and recorded the crowded lanes.
- Demoted QuietRound to a backup and made SLA Lock the current front-runner hypothesis.
- Added a revised product menu, durable decision pointer, agent handoff, staged prompts, and an
  export-safe source manifest.
- Preserved the exact 20-repository competitor snapshot and corrected the payroll lane to eight.

## 2026-07-22 — organization-wide source audit

- Mirrored all 20 public iExec-Nox repositories at explicit commit SHAs.
- Added exact release/tag mirrors for the deployable contracts, Handle SDK, Hardhat plugin, and confidential-contract examples.
- Verified the Ethereum Sepolia proxy implementation, initializer version, gateway, KMS public key, and proof TTL directly over RPC.
- Reconciled documentation against release source and identified material contradictions in network support, compiler version, type support, handle layout, plaintext exposure, ACL semantics, readiness, and security language.
- Audited official Confidential Token and cVault POCs for reusable frontend and proof-finalization patterns.
- Updated the QuietRound direction: direct reviewer calls, release-pinned APIs, async proof/finalize UX, contract-owned lifecycle state, and minimal winner disclosure.
