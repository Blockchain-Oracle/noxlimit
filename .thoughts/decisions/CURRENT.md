# Current Product Decision

- **Status:** **NoxLimit is the user-selected product direction and its canonical architecture was
  approved by the user on 2026-07-28. Prompt 3 is now `CONDITIONAL GO`: Gates A and B and the
  combined adapter pass locally, while the final live Ethereum Sepolia trace/receipt waits only on
  funding the dedicated local signer.** Product selection is closed unless the user reopens it or new executable
  evidence invalidates a load-bearing assumption. No polished/full implementation is authorized
  until that live gate passes and the user reviews the verdict.
- **Canonical architecture:**
  [`../architecture/2026-07-25-noxlimit-system-architecture.md`](../architecture/2026-07-25-noxlimit-system-architecture.md)
- **Audit and authority policy:**
  [`AUDIT-GATES.md`](./AUDIT-GATES.md)
- **Selection and architecture-gate decision:**
  [`2026-07-25-noxlimit-direction-and-architecture-gate.md`](./2026-07-25-noxlimit-direction-and-architecture-gate.md)
- **Context/gate/architecture verification:**
  [`../verification/2026-07-25-context-gate-and-architecture-audit.md`](../verification/2026-07-25-context-gate-and-architecture-audit.md)
- **Architecture approval and Opus 5 review reconciliation:**
  [`../verification/2026-07-28-opus-architecture-review-reconciliation.md`](../verification/2026-07-28-opus-architecture-review-reconciliation.md)
- **Prompt 3 executable evidence and verdict:**
  [`../verification/2026-07-28-noxlimit-critical-path.md`](../verification/2026-07-28-noxlimit-critical-path.md)
- **Spike substrate:** pinned, unmodified Gnosis Conditional Tokens + FPMM. This is selected for
  the disposable verification slice, not asserted as an irreversible production-stack decision.
- **Survivors:** One selected direction; one locally verified disposable adapter; zero live
  Sepolia fills.
- **Confidence:** High that the local architecture is executable. Clean suites pass 8 released-Nox
  primitive tests, 8 combined adapter/adversarial tests, and 8 independent market/math tests. The
  exact typed wrapper, private viewer path, nonce isolation, real FPMM fill/refund behavior, ERC-1155
  forwarding, atomic limit, replay guard, and public-inference experiment all execute. Live
  Sepolia SDK encryption and input-proof validation also pass. Final cross-service integration and
  privacy behavior remain conditional until the prepared live trace mines. Product demand remains
  unvalidated rather than disproved.
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
- **Independent recheck and reaffirmation (source + live evidence, gate split, spike spec):**
  [`../verification/2026-07-24-noxlimit-reaudit-reaffirmation.md`](../verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
- **NoxLimit hypothesis (historical candidate framing):**
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
- **Next workflow:** Fund `0xA03D26E19ee4061A06a9a097010Bc06028Bba60A` with at least 0.03
  **Sepolia ETH only**, then run `cd spike/nox && pnpm gate-c:sepolia`. Its private key is already
  local, mode-`0600`, and gitignored; never paste it in chat. The runner compiles clean, reproduces
  the live false/withheld/two-quiet privacy trace, and attempts the real combined fill.
  Do not restart discovery or build a polished frontend before that receipt passes and the user
  reviews the verdict.
- **Prompt 2:** Waived by explicit user selection; do not run a new comparison loop.
- **Prompt 3 state:** **CONDITIONAL GO — LIVE GATE C WAITING FOR SEPOLIA ETH.** Gates A and B
  and the combined local adapter are verified. The only authorized mutation is the prepared live
  Gate C run and its evidence/verdict update; this is not authorization for the polished build.
- **Clock:** Activated **2026-07-27 23:40 UTC**. Target verdict by **2026-07-28 23:40 UTC**;
  absolute spike stop **2026-07-29 11:40 UTC**. A missing live Gate C transaction at the hard stop
  is not permission to keep polishing the spike. If it passes at the hard stop, the remaining
  approximately 82 hours are reserved for 30h core build, 20h worker/frontend/judge path, 14h
  deployment/stabilization, 10h submission artifacts, and at least 8h final buffer.

## Verified state at audit time (2026-07-24)

- WTF deadline: **2026-08-01 21:59 UTC** (8 days out; re-verified through the official page/API).
  DoraHacks challenged a default command-line request, but a browser-like user agent reached the
  official API. Required chain: **Ethereum Sepolia** (prior winners were on
  Arbitrum Sepolia — do not inherit their chain). 13 BUIDLs, 81 hackers at the evening recheck. The
  Innovative track's published `judging_criteria` field is **empty** — the "already seen …
  prediction markets" steer is track-description prose, not a separate scoring formula; the empty
  field does not negate that originality risk. The official API's required registration-question
  payload instructs hackers to complete iExec Hello World and submit the wallet address used.
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

## Evidence behind the selected direction (`KEEP AND VERIFY` on 2026-07-24; locally verified now)

> The independent audit returned `DROP`, but the hackathon-calibrated reassessment found material
> factual and logical errors in the hard vetoes and their key supporting claims. The user later
> selected NoxLimit as the direction; combined live feasibility remains bounded by Prompt 3. See the top of
> this file, the
> [independent audit](../verification/2026-07-24-noxlimit-independent-audit.md), and the
> [reassessment](../verification/2026-07-24-noxlimit-drop-verdict-reassessment.md).

NoxLimit is a narrower prediction-market order-management hypothesis, not a reversal of the generic
market rejection. It proposes a fixed-size private buy limit against an unchanged real
outcome-share AMM:

`encrypt threshold → persist → compare with the fixed-input quote sampled in the evaluation request
→ reveal threshold-derived minimum output → consume proof once → execute a
minimum-output-protected buy`

The research found feature-supply and product-investment signals for advanced prediction-market
orders, but no direct proof of privacy-specific demand. The released viewer/private-decrypt path,
real FPMM deployment, asynchronous orchestration, escrow/custody, and measured evaluation leakage
now pass locally. Their combined live run, seeded-liquidity presentation, and fresh-user funding
remain. No official Nox production mainnet exists, but that is not a hackathon blocker because
Ethereum Sepolia is the required chain.

`KEEP AND VERIFY` is the historical 2026-07-24 maturity label. The current status is
`CONDITIONAL GO`: local executable evidence exists, and the funded live receipt plus user checkpoint
remain before polished implementation.
