# Current Product Decision

- **Status:** **NoxLimit is selected, its canonical architecture is user-approved, Prompt 3 is
  `GO`, and the user explicitly authorized Codex to plan and build the polished product on
  2026-07-28.** Gates A and B pass locally, and Gate C completed the real Nox privacy trace plus one
  Nox-authorized FPMM fill on Ethereum Sepolia. Product selection is closed unless the user reopens
  it or new executable evidence invalidates a load-bearing assumption. Prompt 4 is now the active
  implementation contract. The polished workspace contains the hardened contracts, shared
  protocol, deterministic catalog, restart-safe service, and responsive web product. The fresh
  2026-07-29 12:08Z root `pnpm check` records contracts `77`, protocol `14`, catalog `6`, service
  `65`, and web `61` passing tests (`223` total), with compile/type-check/test/build green. The
  fresh dedicated Playwright snapshot records `45` passing journeys, `21` intentional project/
  viewport skips, and zero failures; it must be rerun at the submission commit. Phases 0–5 and
  bounded operator hardening are complete. Phase 6 is live and in progress: branch
  `codex/noxlimit-polished-product` contains the paired revision-5 cutover at commit `c073643`, the
  original BTC/ETH bundles are retired, both revision-5 successors are active, both predecessor LP
  removals and three real browser-off order/fill flows are committed, and the exercised service was
  `READY`. Phase 6 settlement is now partial/degraded: BTC completed real browser resolution,
  winning-user redemption, and builder-LP redemption; ETH cannot resolve under its immutable
  3,600-second observation-delay policy because the exact first post-deadline observation arrived
  3,624 seconds after `resolvesAt`, 24 seconds too late. The accountless selector rejected before
  any write, the ETH resolver/payout remain unset, and ETH user/LP positions remain unredeemable.
  Both active revision-5 successors carry the same known 3,600-second liveness risk. Public hosting
  and submission assets remain pending.
- **Canonical architecture:**
  [`../architecture/2026-07-25-noxlimit-system-architecture.md`](../architecture/2026-07-25-noxlimit-system-architecture.md)
- **Audit and authority policy:**
  [`AUDIT-GATES.md`](./AUDIT-GATES.md)
- **Selection and architecture-gate decision:**
  [`2026-07-25-noxlimit-direction-and-architecture-gate.md`](./2026-07-25-noxlimit-direction-and-architecture-gate.md)
- **Polished-build authorization:**
  [`2026-07-28-noxlimit-polished-build-authorization.md`](./2026-07-28-noxlimit-polished-build-authorization.md)
- **Market-discovery experience decision:**
  [`2026-07-28-noxlimit-market-stream-experience.md`](./2026-07-28-noxlimit-market-stream-experience.md)
- **Visual direction selection (adopted and delivered):**
  [`../design/2026-07-28-noxlimit-visual-direction-selection.md`](../design/2026-07-28-noxlimit-visual-direction-selection.md)
  — Direction `Complement` selected; palette inherited from Reclaim (`getreclaim.xyz`). `Vigil` and
  `Caliper` are rejected history.
- **Design system and batches (delivered 2026-07-28):**
  [`../design/2026-07-28-noxlimit-foundations.md`](../design/2026-07-28-noxlimit-foundations.md) and
  [`../design/2026-07-28-noxlimit-designer-handoff.md`](../design/2026-07-28-noxlimit-designer-handoff.md)
  — The six durable local HTML sources under `../design/html/` contain the three-direction record,
  `Complement` foundations, Batches A–C, responsive compositions, and the clickable prototype.
  They are design inputs with explicit sample data, not product deployment evidence. The web app
  now implements the accepted responsive direction; production data continues to come only from
  the validated service/catalog boundary.
- **Active implementation plan:**
  [`../plans/2026-07-28-noxlimit-polished-product-plan.md`](../plans/2026-07-28-noxlimit-polished-product-plan.md)
- **Context/gate/architecture verification:**
  [`../verification/2026-07-25-context-gate-and-architecture-audit.md`](../verification/2026-07-25-context-gate-and-architecture-audit.md)
- **Architecture approval and Opus 5 review reconciliation:**
  [`../verification/2026-07-28-opus-architecture-review-reconciliation.md`](../verification/2026-07-28-opus-architecture-review-reconciliation.md)
- **DeepBook product/API research:**
  [`../research/2026-07-28-deepbook-patterns-for-noxlimit.md`](../research/2026-07-28-deepbook-patterns-for-noxlimit.md)
- **Product-surface and post-gate review reconciliation:**
  [`../verification/2026-07-28-noxlimit-product-surface-and-opus-reconciliation.md`](../verification/2026-07-28-noxlimit-product-surface-and-opus-reconciliation.md)
- **Prompt 3 executable evidence and verdict:**
  [`../verification/2026-07-28-noxlimit-critical-path.md`](../verification/2026-07-28-noxlimit-critical-path.md)
- **Public live trace:** [`../../spike/nox/evidence/sepolia-gate-c.json`](../../spike/nox/evidence/sepolia-gate-c.json)
- **Phase 6 runtime catalog:** revision `5` at
  [`../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json`](../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json),
  catalog hash `0x8aa65b0b5a91025ed1fd0e1487b9c9058b44ca05889632e9f85baf3bb3885899`,
  committed by paired cutover `c073643`. It routes original BTC/ETH market IDs `RETIRED` and both
  verified successor IDs `ACTIVE` atomically.
- **Phase 6 committed execution evidence:**
  [`../evidence/2026-07-29-phase6-btc-no-order.json`](../evidence/2026-07-29-phase6-btc-no-order.json),
  [`../evidence/2026-07-29-phase6-btc-yes-order.json`](../evidence/2026-07-29-phase6-btc-yes-order.json),
  and [`../evidence/2026-07-29-phase6-eth-yes-order.json`](../evidence/2026-07-29-phase6-eth-yes-order.json)
  record direct-Gateway creation, browser closure, and real FPMM fills on the original bundles.
  [`../evidence/2026-07-29-phase6-btc-resolution-redemption.json`](../evidence/2026-07-29-phase6-btc-resolution-redemption.json)
  proves the retired BTC predecessor's browser resolution and winning-user redemption, and
  [`../evidence/2026-07-29-sepolia-btc-usd-4h-liquidity-redemption.json`](../evidence/2026-07-29-sepolia-btc-usd-4h-liquidity-redemption.json)
  proves builder-LP redemption in transaction
  `0x706c0c6f38518a8cd536eb4b177939a642434979153f5ee9c62f105f186c3f0c`, receipt block
  `11375232`. The ETH limitation is captured separately in
  [`../evidence/2026-07-29-sepolia-eth-usd-4h-resolution-policy-rejection.json`](../evidence/2026-07-29-sepolia-eth-usd-4h-resolution-policy-rejection.json):
  the unique first observation was 24 seconds outside the immutable bound, no resolution write was
  attempted, and no ETH winner exists.
- **Spike substrate:** pinned, unmodified Gnosis Conditional Tokens + FPMM. This is selected for
  the disposable verification slice, not asserted as an irreversible production-stack decision.
- **Survivors:** One selected direction; one locally and live-verified disposable adapter; one real
  Nox-authorized Sepolia FPMM fill.
- **Confidence:** High that the hackathon critical path is executable. Clean suites pass 8 released-Nox
  primitive tests, 8 combined adapter/adversarial tests, and 8 independent market/math tests. The
  exact typed wrapper, private viewer path, nonce isolation, real FPMM fill/refund behavior, ERC-1155
  forwarding, atomic limit, replay guard, and public-inference experiment all execute. The live
  Sepolia run then verified four confidential evaluations, success-only publication, independent
  proof rescue, exact share forwarding, zero adapter dust/allowance, and replay rejection. Product
  demand remains unvalidated rather than disproved.
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
- **Product surface:** A hybrid discovery-and-trading experience over curated, real Ethereum
  Sepolia market bundles: a TikTok-like vertical **Market Stream** for fast one-market-at-a-time
  discovery, followed by a DeepBook-like full terminal for analysis, private-order review, and
  durable ownership. Mobile opens into the snap-scroll stream; desktop keeps the terminal primary
  and turns its left rail into the stream. BTC/USD and ETH/USD, plus SOL/USD after its Pyth resolver
  test; 1h/4h/24h horizons; real FPMM quotes/liquidity; a Nox-encrypted private maximum-price
  order; durable Orders, Positions, and Activity. The stream is deterministic and contains only
  verified/deployed/seeded bundles—no personalized `For You`, fake inventory, social mechanics, or
  one-tap execution. DeepBook supplies terminal/API grammar, not CLOB mechanics.
- **UX/design contract:** [`../../DESIGNER_HANDOFF.md`](../../DESIGNER_HANDOFF.md),
  [`../stories/2026-07-28-noxlimit-product-stories.md`](../stories/2026-07-28-noxlimit-product-stories.md),
  and [`../design/2026-07-28-noxlimit-product-surface-map.md`](../design/2026-07-28-noxlimit-product-surface-map.md).
  The 30-second entry principle is the normal experience for every user, not an evaluation-only
  shortcut. One wallet receives sponsored Sepolia ETH plus NoxLimit Test USDC through the product;
  balances remain real, never auto-refill, and only explicit low-balance refills are capped by
  target/cooldown/lifetime policy. The central terminal includes real oracle/outcome charts and a
  real FPMM quote ladder over discrete rolling asset/horizon market bundles.
- **Privacy UX boundary:** the initial limit travels directly from the browser to the official Nox
  Gateway, bypassing the NoxLimit API/database/analytics. The evaluator sees zero on an ineligible
  check and the exact derived limit on an eligible one. `Publication pending`, not `Filled`, marks
  the point where the candidate is publicly retrievable.
- **Post-gate Opus 5 verdict:** Exact `claude-opus-5`, max effort, exit 0, no fallback: `GO` remains
  valid and the reviewer recommends building after the adopted A1–A3/F1–F3 corrections. These
  prohibit owner abandonment after publication, preserve nonce/check coupling, expose exhausted
  monitoring, require resolver-first versioned market bundles, and strengthen product tests/API
  semantics. The final consistency pass also requires onchain market-close enforcement, composite
  order references plus explicit refund, and non-cherry-pickable first-observation settlement.
  These do not reopen selection or Gate C.
- **Operator deployment boundary:** The locally verified Sepolia deployer creates or resumes a
  cross-process-locked journal before its first write. The journal freezes the plan/operator/chain/
  output binding, ordered expected steps, and exact funding plan; advances every write through
  `INTENT → SUBMITTED → CONFIRMED`; and requires attempt-bound explicit `ADOPT` or `RETRY` recovery
  for a bare intent. It rejects secret-bearing payloads, stages and verifies final payloads before
  create-only publication, and safely resumes submitted, confirmed, or partially published work.
  Market configuration also enforces the exact declared 1h/4h/24h duration and canonical question;
  reused operator-owned Test USDC is minted only by the computed seed/treasury shortfall. New
  official Sepolia BTC/ETH deployments now require
  `maximumObservationDelaySeconds >= 14,400`; this future-deployment liveness floor does not weaken
  the unique first-observation/adjacent-predecessor proof. Runtime quote freshness remains a
  separate 3,600-second policy.
- **Next workflow:** Preserve the completed BTC proof and the terminal ETH rejection. Do not keep
  polling the retired ETH resolver, submit an ETH resolution transaction, infer a winner from the
  rejected observation, or substitute a later round. Treat the two active revision-5 successors as
  current routing with a disclosed 3,600-second liveness risk; before relying on either axis for the
  public release, deploy and rotate through the existing resolver-first workflow with the enforced
  14,400-second minimum and verify its immutable bindings. Local service/web container builds and
  smoke checks pass, but public frontend/service URLs, video, X post, repository/form/contact fields,
  and the final submission run remain pending. Preserve `spike/**`; do not derive a competing plan,
  restart discovery, or repeat Prompt 3.
- **Prompt 4:** [`../../prompts/04-polished-product-implementation.md`](../../prompts/04-polished-product-implementation.md)
  is authorized and active as the implementation handoff.
- **Prompt 5:** [`../../prompts/05-designer-agent-handoff.md`](../../prompts/05-designer-agent-handoff.md)
  is the completed designer-agent workflow. `Complement` and the six local HTML deliverables are
  implementation inputs; `Vigil` and `Caliper` remain rejected history.
- **Prompt 2:** Waived by explicit user selection; do not run a new comparison loop.
- **Prompt 3 state:** **GO — LIVE GATE C VERIFIED.** Final transaction
  `0xbae85703bb59878fa63838e03c1bc57cdcdc46f6e2f74ac701b38fc85d088caa`
  succeeded at Sepolia block `11,366,991`. It is accepted evidence for the active polished build,
  not a gate to rerun.
- **Scheduling authority:** The user controls pacing and phase authorization. Historical project or
  spike dates do not route work, force deployment, or justify reducing correctness. Market trading
  close, market resolution, order expiry, and internal recovery timeouts are protocol concepts,
  not project schedules.

## Historical verified state at audit time (2026-07-24; not active routing)

- The then-published WTF submission date was re-verified through the official page/API. It is
  retained in the dated research, not as an active architecture or implementation constraint.
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

## Evidence behind the selected direction (`KEEP AND VERIFY` on 2026-07-24; live-verified now)

> The independent audit returned `DROP`, but the hackathon-calibrated reassessment found material
> factual and logical errors in the hard vetoes and their key supporting claims. The user later
> selected NoxLimit as the direction; Prompt 3 later verified combined live feasibility. See the top of
> this file, the
> [independent audit](../verification/2026-07-24-noxlimit-independent-audit.md), and the
> [reassessment](../verification/2026-07-24-noxlimit-drop-verdict-reassessment.md).

NoxLimit is a narrower prediction-market order-management hypothesis, not a reversal of the generic
market rejection. It proposes a public amount that is immutable per order plus a private buy limit
against an unchanged real
outcome-share AMM:

`encrypt threshold → persist → compare with the fixed-input quote sampled in the evaluation request
→ reveal threshold-derived minimum output → consume proof once → execute a
minimum-output-protected buy`

The research found feature-supply and product-investment signals for advanced prediction-market
orders, but no direct proof of privacy-specific demand. The released viewer/private-decrypt path,
real FPMM deployment, asynchronous orchestration, escrow/custody, and measured evaluation leakage
pass locally, and their combined live path passes on real builder-seeded Sepolia pools. Fresh-user
funding and product UX now also have committed integrated evidence: three orders filled browser-off,
the original pools closed, and verified successors activated in one catalog revision. The retired
BTC predecessor additionally completes objective resolution plus real winning-user and builder-LP
redemption. The retired ETH predecessor is a recorded terminal policy rejection, not a second
successful vertical: its first post-deadline observation was 24 seconds outside the immutable
one-hour bound, so no write or winner exists. No official Nox production mainnet exists, but that is
not a hackathon blocker because Ethereum Sepolia is the required chain.

`KEEP AND VERIFY` is the historical 2026-07-24 maturity label. The current status is
`GO`: local and live executable evidence exists. The polished implementation is user-authorized
and active.
