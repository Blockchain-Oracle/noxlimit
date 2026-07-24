# Current Product Decision

- **Status:** NoxLimit `DROP` verdict reassessed → **`KEEP AND VERIFY`** as an unselected hackathon
  candidate.
- **Leading hypothesis:** NoxLimit, but only as a candidate for a 24–36-hour disposable
  critical-path spike. It is not selected and no full implementation is authorized.
- **Survivors:** Zero technically verified survivors. NoxLimit is one unselected conditional
  candidate.
- **Confidence:** High that the hard `DROP` is unsupported; medium that the released Nox primitives
  permit a success-only evaluation path; low-to-medium on privacy-specific demand and final
  eight-day integration feasibility until the bounded spike runs.
- **Independent audit (2026-07-24):** returned `DROP` and remains preserved as evidence. Its useful
  feasibility findings stand, but its decisive claims do not: the demand search proves
  *unvalidated*, not *absent*; a normal backend can preserve the execution shape but must receive
  the raw threshold; released Nox has viewer-only private decryption; and prediction markets are an
  originality burden, not a documented prohibition.
- **Hackathon-calibrated reassessment (2026-07-24):** `KEEP AND VERIFY`. A real non-mock Sepolia
  state transition, immutable order binding, atomic `minOut`, replay protection, cancel/expiry/refund,
  and an honest privacy boundary are demo gates. Mainnet, a professional audit, decentralized
  keepers, organic liquidity, production manipulation economics, and latency SLAs are
  post-hackathon hardening rather than selection vetoes.
- **Independent audit + verdict:**
  [`../verification/2026-07-24-noxlimit-independent-audit.md`](../verification/2026-07-24-noxlimit-independent-audit.md)
- **Independent research (evidence, pins, reproduction commands):**
  [`../research/2026-07-24-noxlimit-independent-research.md`](../research/2026-07-24-noxlimit-independent-research.md)
- **Reassessment of the `DROP` verdict:**
  [`../verification/2026-07-24-noxlimit-drop-verdict-reassessment.md`](../verification/2026-07-24-noxlimit-drop-verdict-reassessment.md)
- **NoxLimit hypothesis (conditional candidate, not selected):**
  [`2026-07-24-noxlimit-product-hypothesis.md`](../ideas/2026-07-24-noxlimit-product-hypothesis.md)
- **NoxLimit product-reality brief:**
  [`2026-07-24-noxlimit-product-and-market-reality.md`](../research/2026-07-24-noxlimit-product-and-market-reality.md)
- **Independent audit prompt:**
  [`01-independent-noxlimit-audit.md`](../../prompts/01-independent-noxlimit-audit.md)
- **Hackathon-calibrated reassessment prompt:**
  [`01a-hackathon-calibrated-noxlimit-reassessment.md`](../../prompts/01a-hackathon-calibrated-noxlimit-reassessment.md)
- **Correction audit:**
  [`2026-07-23-nox-docs-first-correction.md`](../research/2026-07-23-nox-docs-first-correction.md)
- **Product research:**
  [`2026-07-23-docs-first-product-research.md`](../research/2026-07-23-docs-first-product-research.md)
- **Candidate report:**
  [`2026-07-23-nox-docs-first-candidates.md`](../ideas/2026-07-23-nox-docs-first-candidates.md)
- **Next workflow:** Run the reassessment prompt in the external agent and, after user direction,
  run only the bounded privacy-path + real-FPMM critical-path spike. Ask the organizer to validate
  the exact confidential advanced-order distinction in parallel. Do not build a polished frontend
  until the spike passes.
- **Prompt 2 allowed:** Not yet — there is only one conditional candidate and it has not passed the
  critical technical gate.
- **Prompt 3 allowed:** Yes, but only as the 24–36-hour disposable experiment in the reassessment,
  not as a full product implementation.

## Verified state at audit time (2026-07-24)

- WTF deadline: **2026-08-01 21:59 UTC** (8 days out). Required chain: **Ethereum Sepolia** (prior
  winners were on Arbitrum Sepolia — do not inherit their chain).
- Nox is live **only** on Ethereum Sepolia (11155111) and Arbitrum Sepolia (421614); **no production
  mainnet**. Ethereum NoxCompute impl `0xc9B5…b819` unchanged since 2026-07-22. Packages still
  0.2.4 / beta.13 / 0.1.0.
- Chainlink BTC/USD + ETH/USD are live and fresh on Ethereum Sepolia (8 decimals). Chainlink Automation
  v2.1 sunsets 2026-07-31 — use a hosted/permissionless worker, not Automation.

## User-locked rejection record

Do not revive, rename, or lightly repackage:

- SLA Lock, agent disputes/evaluators, service-quality escrow, or proof-of-service;
- Proofline, community notes, moderation, polling, voting, or governance;
- benchmarks, certification, ratings, reputation, or scores as the product;
- shares, equity, policy, compliance, insurance, legal, or international-rule workflows;
- a new chain, protocol, SDK, platform, or broad infrastructure product;
- wallets, confidential tokens, token factories, or generic wrappers;
- products that require multiple organizations, panels, reviewers, or fake participants to work.

Any new discovery pass must research winners from comparable privacy, ZK, FHE, confidential
computing, and protocol-integration hackathons before generating candidates. Feasibility is a veto:
one builder, one self-serve user loop, a real standalone or unchanged-protocol action, real inputs,
and no mock choreography.

## Current research boundary

The prior feasibility-first `NONE SURVIVE` report remains a valid historical graveyard, but was not
a complete discovery result. The corrected pass read the component-rendered Nox product catalog,
allowed standalone innovative products, and investigated nine candidates across Invoicing,
Payments, DeFi/Lending, Vaults/Yield, Identity, NFT, and Prediction Markets.

The corrected docs-first pass originally produced no survivor. Its two strongest near-misses still
failed exact gates:

- **Private Quote-to-Pay:** direct PaySec collision, current optimized ERC-7984 callback-amount ACL
  mismatch, amount-correlation leakage, two-role/token onboarding, and a failed 30-second path.
- **Confidential Closed-Loop Gift Card:** ordinary issuer-database equivalence, visible or trusted
  funding, weak independent entitlement demand, Sigill/FHE2P collision, and policy scope.

DarkOdds also remains a native prediction-market collision; Polymarket was display-only. Generic
lending, NFT, vault, fundraising, RWA, trading, payroll, treasury, swap/routing, and escrow products
remain crowded or user-excluded.

## New hypothesis since the docs-first verdict (`KEEP AND VERIFY`, reassessed 2026-07-24)

> The independent audit returned `DROP`, but the hackathon-calibrated reassessment found material
> factual and logical errors in the hard vetoes and their key supporting claims. The hypothesis is
> reopened only for a bounded live verification. See the top of this file, the
> [independent audit](../verification/2026-07-24-noxlimit-independent-audit.md), and the
> [reassessment](../verification/2026-07-24-noxlimit-drop-verdict-reassessment.md).

NoxLimit is a narrower prediction-market order-management hypothesis, not a reversal of the generic
market rejection. It proposes a fixed-size private buy limit against an unchanged real
outcome-share AMM:

`encrypt threshold → persist → compare with the fixed-input quote sampled in the evaluation request
→ reveal threshold-derived minimum output → consume proof once → execute a
minimum-output-protected buy`

The current research found feature-supply and product-investment signals for advanced
prediction-market orders, but no direct proof of privacy-specific demand. It also found a plausible
difference from DarkOdds and unresolved gates: live validation of the plausible
viewer/private-decrypt path, real FPMM deployment, asynchronous orchestration, worker dependence,
escrow/custody, evaluation leakage, manipulation of seeded liquidity, and fresh-user funding. No
official Nox production mainnet exists, but that is not a hackathon blocker because Ethereum
Sepolia is the required chain.

`KEEP AND VERIFY` is a research-routing label, not a selection or feasibility pass. No full product
specification, polished architecture, or implementation should begin until the bounded critical
path produces executable evidence and the user reviews it.
