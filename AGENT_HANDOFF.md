# Agent Handoff: Verify and Build NoxLimit Deliberately

## Mission

Use this repository to verify and then build the selected iExec WTF Hackathon direction.
**NoxLimit is selected, the user approved its canonical architecture on 2026-07-28, and the bounded
Prompt 3 spike is `GO`: all local paths pass, and live Gate C completed the Nox privacy trace plus
one real Sepolia FPMM fill. The user explicitly authorized Codex to plan and build the polished
product on 2026-07-28; Prompt 4 is active. The root pnpm workspace and polished contracts,
protocol, catalog, service, and web are implemented. The fresh post-settlement `pnpm check` records
contracts `84`, protocol `14`, catalog `6`, service `69`, and web `62` passing (`235` package tests
total), with compile/type-check/test/build green. The fresh dedicated Playwright
snapshot records `45` passing, `21` intentional project/viewport skips, and zero failures; rerun it
at the submission commit. Phases 0–5 and bounded operator hardening are complete. On branch
`codex/noxlimit-polished-product`, atomic cutover commit `d28f307` published corrected-route catalog
revision `8` at `packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-corrected-rotated.json`,
hash `0x577593192efb7cf139267b3d076eb5e846fd15d1ab080611f9d504b716b4b427`. It hash-links previous
revision `7` (`0xe20fc416f695552619d5701ece6b4dd05ad934890387807551237b5fb424dcca`) and became effective at
safe Sepolia block `11,375,905`, timestamp `2026-07-29T13:53:36Z`, block hash
`0x2a37a64bd6e1c86dd4bbb80f67cf803be9f58d93427fc84d26f59861fcbf1c76`. The service adopted it
through a controlled stop → catalog-pointer update → single startup and reported `READY` on the
same hash; revisions `6` and `7` were never served. Corrected BTC market
`0x37a7b5826c9ba1209470b98cd38a38f4e3e6cb448c353333138bfced7fbaf0a2` and corrected ETH market
`0xa5219adaa2c86c0419cc7d9b05188784192ee023a7c3c27bab3f0cc8eaf8fc8a` remain catalog `ACTIVE`;
after their close/resolution boundary both report `RESOLVED_YES / ORDERING_CLOSED`. `spike/**`
remains unchanged. The retired original BTC
predecessor completed real browser resolution, winning-user redemption, and builder-LP redemption.
The retired original ETH predecessor is terminally unresolvable under
its immutable 3,600-second observation-delay policy: the exact first post-deadline observation
arrived at `+3,624s`, 24 seconds late, and the selector rejected before any write. No ETH payout or
winner exists, and its user/LP positions remain unredeemable. The former revision-5 BTC/ETH routes
are now retired. Their
[BTC](./.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-successor-liquidity-close.json) and
[ETH](./.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-successor-liquidity-close.json) closes
reduced LP shares to zero at blocks `11,375,985` and `11,375,990`; each unresolved removal leaves
50,000,000 YES and 50,000,000 NO position atoms with the builder. Both corrected OrderBooks now
return `nextOrderId = 3`. BTC NO/YES orders `1`/`2` and ETH YES/NO orders `1`/`2` were created in
the browser, filled by the browser-off worker, and confirmed in fresh browsers. The four records are
[BTC NO](./.thoughts/evidence/2026-07-29-r8-corrected-btc-no-order.json),
[BTC YES](./.thoughts/evidence/2026-07-29-r8-corrected-btc-yes-order.json),
[ETH YES](./.thoughts/evidence/2026-07-29-r8-corrected-eth-yes-order.json), and
[ETH NO](./.thoughts/evidence/2026-07-29-r8-corrected-eth-no-order.json). Both corrected routes then
resolved YES from the exact adjacent first post-deadline Chainlink round pair. The real browser
resolved and redeemed the winning user for
[BTC](./.thoughts/evidence/2026-07-29-r8-corrected-btc-resolution-redemption.json) and
[ETH](./.thoughts/evidence/2026-07-29-r8-corrected-eth-resolution-redemption.json), with exact Test
USDC payouts of 1,978,831 and 1,941,161 atoms respectively.
Their [BTC](./.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-liquidity-close.json)
and [ETH](./.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-liquidity-close.json)
LP-close transactions are confirmed with zero LP shares and no premature redemption. The later
[BTC](./.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-liquidity-redemption.json)
and [ETH](./.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-liquidity-redemption.json)
passes redeemed every retained resolved builder position without a second liquidity removal; both
builder YES/NO balances are zero. Each corrected route is now a complete browser-created order →
browser-off fill → objective resolution → winning-user redemption → builder-position redemption
vertical.
The approved BTC/ETH 1h and 24h bundles are now deployed, independently validated, seeded, and
active alongside the corrected 4h pair in current runtime revision `12` at
`packages/catalog/sepolia/markets-2026-07-29-btc-eth-horizons-eth-24h.json`, hash
`0x21083cbce01a121d253ff1114b77c9d12035e596ce89c9ad58411f3e06711a6e`. Its ten records contain
four retired and six active routes covering BTC/ETH 1h/4h/24h. The service adopted r9→r12
sequentially and reports `READY` on r12; the new routes correctly reported `UPCOMING` before their
shared `2026-07-29T17:30:00Z` start. Public hosting/submission assets remain pending, and billable
Cloud Run/public-resource creation
requires explicit user cost and provider authorization.** Do not reopen product discovery or inherit QuietRound, SLA Lock, Proofline,
AgentDispute, or another historical idea unless the user explicitly reopens selection or executable
evidence kills a load-bearing NoxLimit assumption.
The user controls pacing: historical submission dates, spike clocks, and reviewer estimates do not
route work or justify weakening the product. Protocol trading-close, resolution, order-expiry, and
recovery times remain distinct technical concepts.

The user has also adopted the UX structure: a TikTok-like vertical **Market Stream** for discovery
on mobile, the same stream as the desktop terminal rail, and a DeepBook-like full terminal for
analysis and explicit private-order review. This is not a social/personalized feed and cannot become
one-tap execution. Only verified/deployed/seeded bundles appear live. The governing decision is
[the Market Stream experience memo](./.thoughts/decisions/2026-07-28-noxlimit-market-stream-experience.md).

Start with the [current decision](./.thoughts/decisions/CURRENT.md),
[selection/adoption memo](./.thoughts/decisions/2026-07-25-noxlimit-direction-and-architecture-gate.md),
[audit and authority gates](./.thoughts/decisions/AUDIT-GATES.md), and
[canonical architecture](./.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md), then
the [Market Stream decision](./.thoughts/decisions/2026-07-28-noxlimit-market-stream-experience.md)
and [active implementation plan](./.thoughts/plans/2026-07-28-noxlimit-polished-product-plan.md).
The [independent `DROP` audit](./.thoughts/verification/2026-07-24-noxlimit-independent-audit.md)
is historical evidence. Its workflow verdict was superseded by the
[reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md) and
[independent reaffirmation](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md).

The corrected docs-first discovery is complete and historically returned `NONE SURVIVE`. It read the
component-rendered use-case catalog, allowed standalone products, researched nine candidates across
six major lanes, and adversarially killed its two initial near-survivors. Preserve both graveyards.
Keep [`prompts/00-docs-first-product-discovery.md`](./prompts/00-docs-first-product-discovery.md)
dormant unless the user explicitly reopens product selection; new contradictory evidence should be
reported and reconciled, not used to start a broad discovery loop automatically. Do not treat the
prompt's existence as evidence that discovery is unfinished. The Prompt 1A reassessment has run
and is retained as evidence.
Prompt 2 is waived by the user's selection. The architecture checkpoint and Prompt 3 passed on
2026-07-28. The DeepBook-informed product/API refinement, adopted Market Stream discovery layer,
and accepted post-gate Opus corrections are now part of the canonical architecture. Product
stories, the product surface map, and the designer handoff are accepted implementation inputs. The
six local HTML files under `.thoughts/design/html/` are the completed durable `Complement` design
source; their sample data is not deployment evidence. Phase 6 of
`prompts/04-polished-product-implementation.md` is active through deployed/funded BTC/ETH bundles,
seven real browser-off fills—three on predecessor routes and four on corrected routes—predecessor
LP close, paired successor activation, one complete predecessor BTC vertical, two complete
corrected 4h verticals, and one terminal predecessor ETH policy rejection. Preserve those split facts:
do not keep polling or write the retired ETH resolver, infer an ETH winner, or substitute a later
round. New official Sepolia BTC/ETH deployments enforce a 14,400-second observation-delay minimum
while retaining the unique first-observation rule; runtime quote freshness remains independently
3,600 seconds. The [corrected strike
plan](./.thoughts/evidence/2026-07-29-sepolia-corrected-successor-strike-plan.json),
[BTC deployment evidence](./.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-deployment.json),
and
[ETH deployment evidence](./.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-deployment.json)
prove the replacements activated together in revision `8`. Revisions `6`/`7` are historical
staging manifests and were never served; do not roll back to revision `5` or repeat the completed
cutover. Later revision-8 evidence proves both YES and NO browser-created, browser-off fills on
each corrected route, followed by objective resolution, winning-user redemption, and builder-
position redemption. Preserve these completed corrected-route verticals and the BTC/ETH 1h/24h
breadth evidence and current revision `12`; do not redeploy it. Public hosting and submission assets follow;
billable resource creation requires explicit user cost/provider authorization.

An independent or future discovery pass should produce a cited evidence and candidate report with:

1. patterns from comparable privacy, ZK, FHE, confidential-computing, and protocol-integration
   hackathon winners;
2. current shipping-product and user-workflow evidence;
3. a refreshed collision scan;
4. a candidate graveyard with exact reasons each tempting idea failed;
5. no more than five candidates that pass every feasibility gate;
6. up to three recommendations, or an explicit `NONE SURVIVE` verdict.

If discovery is explicitly reopened, recommendations are not selections. That historical discovery
rule does not prohibit maintaining the already-authorized canonical NoxLimit architecture.

### Current decision state

NoxLimit is selected and its bounded critical path is locally and live verified. The two strongest
docs-first near-misses still failed and remain in the graveyard:

- **Private Quote-to-Pay:** PaySec already exposes the same product surface; current shared
  optimized cUSDC does not grant a receiver the transferred-amount handle needed for
  amount-sensitive callback logic; workarounds add token fragmentation or broad operator authority;
  the honest fresh-user path needs funding, wrapping, authorization, Nox wait, and finalization.
- **Confidential Closed-Loop Gift Card:** current Nox can implement the balance math, but a merchant
  database preserves the same closed-loop user outcome; independent merchant settlement expands it
  into a payment network; Sigill and FHE2P already occupy confidential gift-card checkout; real
  consumer cards also restore policy scope.

Generic native prediction markets remain excluded because DarkOdds already built them.

Research identified a narrower product-shaped hypothesis, **NoxLimit**: a public amount immutable
per order plus a confidential maximum-price buy limit against a real onchain outcome-share AMM.

**Current outcome (2026-07-29): selected, architecture approved, local Gates A/B verified,
live Gate C verified; technical critical-path maturity `GO`; polished layers and bounded operator
hardening complete; Phase 6 deployed/funded through seven browser-off fills, LP close, the
verified atomic revision-8 corrected-successor cutover, and sequential revision-9→12 breadth
adoption; predecessor BTC browser/user/LP redemption complete; predecessor ETH terminally rejected
by its immutable one-hour bound; corrected 14,400-second BTC/ETH 4h routes each complete a real
browser order/browser-off fill/objective-resolution/user-redemption/builder-redemption vertical and
now report `RESOLVED_YES / ORDERING_CLOSED`. Both corrected OrderBooks return `nextOrderId = 3`, and
four corrected-route fills are verified. Public hosting remains pending. BTC/ETH
1h/24h breadth is complete in revision `12`.**

- Conditional execution is a shipping workflow, and public onchain order flow has structural
  pre-trade exposure. Direct evidence that prediction traders specifically value hiding only this
  threshold is still unknown.
- A backend can reproduce browser-off, same-chain, contract-custodied execution, but it receives
  the raw threshold. A local bot can preserve threshold privacy but needs an always-on process and
  gas-paying signing path.
- Unchanged `FPMM.buy` takes plaintext `minOutcomeTokensToBuy`, so the limit-equivalent is public at
  fill. Released Nox `select + addViewer` and Handle SDK private `decrypt` now execute locally in
  the observed honest-worker nonzero-only publication flow; failed evaluations do not inherently
  need explicit public proofs, although the contract still handles a published zero safely and
  public timing/non-action inference remains.
- Prediction markets are “already seen,” creating a heavy originality burden, but are not banned.
  Creativity is tied with end-to-end/no-mock at the highest displayed weight.
- `FPMM.buy` natively enforces atomic minimum output. Nox is live only on Ethereum Sepolia and
  Arbitrum Sepolia; no production mainnet exists, but Ethereum Sepolia is the required hackathon
  chain.

Prompt 2 is waived. Prompt 3 passes: 16 released-Nox/combined-adapter tests, 8 independent
market/math tests, and the bounded recovered live Sepolia trace. Final transaction
[`0xbae857…88caa`](https://eth-sepolia.blockscout.com/tx/0xbae85703bb59878fa63838e03c1bc57cdcdc46f6e2f74ac701b38fc85d088caa)
filled the order and forwarded exact outcome shares with zero adapter dust/allowance. Public
evidence is in `spike/nox/evidence/sepolia-gate-c.json`. Do not rerun that gate; build the product
from the canonical architecture and active Prompt 4.

The post-gate exact Opus 5 review kept `GO` and recommended building, but found three canonical
corrections now adopted: no owner abandonment after publication is requested; an evaluation
timeout consumes the current nonce/check and the next request increments the nonce; and exhausted
`Open` must be exposed as non-executable `MonitoringExhausted`. It also requires resolver-first
per-market bundles, deterministic market identity, versioned catalog provenance, named API
statuses, status-aware candidate reads, and stronger boundary/mutation tests. Follow the latest
[reconciliation](./.thoughts/verification/2026-07-28-noxlimit-product-surface-and-opus-reconciliation.md),
not raw reviewer wording.

The final consistency pass also made three polished-build invariants explicit: bind and enforce
market trading close in the OrderBook; use composite order references and expose separate
cancel/expire/refund actions; and prove the selected Chainlink observation is the first one at or
after resolution so a caller cannot cherry-pick a later price.

The completed operator hardening is a resume protocol, not a best-effort script. Before any write,
the deployer creates or resumes a cross-process-locked journal bound to the exact plan hash,
operator, Sepolia chain, output paths, ordered expected steps, and frozen funding plan. Each write
advances through `INTENT → SUBMITTED → CONFIRMED`; a process finding a bare `INTENT` fails closed
unless the operator supplies attempt-bound `ADOPT` with the exact transaction hash or `RETRY` for
that attempt. Confirmed and pending/successful submitted work resumes without blind replacement. A
submitted transaction may enter one new attempt only under attempt-bound `RETRY` after its exact
persisted receipt is proven reverted at the configured confirmation depth and its sender is
verified; pending, successful, mismatched, and stale-attempt cases submit nothing. Secret-bearing
JSON is rejected, final evidence/catalog payloads are staged and hash-checked before create-only
publication, and partial output publication is safely recoverable. Market configuration must use
the exact declared 1h/4h/24h duration and canonical UTC question. A reused Test USDC contract must
be operator-issued, and only the computed pool/treasury collateral shortfall is minted.

That protocol has now produced committed live product evidence. The original BTC/ETH markets carry
three filled orders and are retired after committed LP removal. BTC subsequently resolved from the
exact first chronological pair; the winning user
and builder LP both redeemed real Test USDC. ETH did not: the exact adjacent pair proved the first
post-deadline observation was 24 seconds beyond the immutable 3,600-second bound. The accountless
selector stopped before a write, leaving the resolver, payout, and ETH positions unset/unredeemable.
Do not substitute a later round or present the rejected price as a winner. Revision `8` atomically
retired the two one-hour revision-5 routes and activated their resolver-first, verified, seeded
14,400-second replacements. Controlled stop → pointer update → single startup adoption was
`READY`; do not describe this as a `SIGHUP` reload. The retired revision-5 BTC liquidity close was
transaction `0xe811190d41186d666b5b90b7938edcdd974a1a8c48fad9fa7f18b8ebf9946b4b`
at block `11,375,985`; the ETH close was
`0xcfd96ad20aec7d2a6f82c30f908cfbb021d62a7118e7a861f0bf9b88a4ed52b5`
at block `11,375,990`. Both old LP balances are zero, but each builder still owns unresolved
50,000,000 YES and 50,000,000 NO position atoms. Revisions `6`/`7` were never served and revision
`5` must not be restored as current. Subsequent revision-8 evidence proves two browser-created,
browser-off fills per corrected market and advances both OrderBooks to `nextOrderId = 3`. That is
real corrected-route execution, but not yet objective settlement or redemption. Revisions `9`
through `12` then added verified BTC/ETH 1h and 24h routes without replacing the corrected 4h pair.
Current revision `12` has four retired and six active records and the service is `READY`. The BTC 1h
deployment's first treasury-collateral transfer reverted out of gas under an exact estimate; the
[recovery record](./.thoughts/evidence/2026-07-29-sepolia-btc-usd-1h-deployment-recovery.json)
preserves the failed attempt and attempt-bound `RETRY` succeeded after setting Hardhat
`gasMultiplier = 1.2`. Tested runtime acceptance classifies future catalog-`ACTIVE` routes as
`UPCOMING`, keeps open-market evaluator/liquidity gates strict, and permits post-close `ACTIVE`
routes to restart only as truthful non-tradeable history; the service suite passes `69` tests. The
[live r12 restart](./.thoughts/evidence/2026-07-29-r12-post-close-restart.json) proved zero-depth 4h
history beside four still-tradeable 1h/24h routes with service health `READY`. Public Cloud
Run/service hosting is billable and
requires explicit user cost/provider authorization before creation.

The detailed post-spike route is recorded in [`CURRENT.md`](./.thoughts/decisions/CURRENT.md).
Historical Gate C clock values remain in its dated evidence only and are not current planning
authority.

## Canonical facts to inherit

### What the hackathon wants

- A clean Nox integration with an impactful open-source protocol, or a truly innovative Nox
  product/integration.
- A product-shaped result, not a proof of concept.
- Privacy layered over public infrastructure without modifying the underlying protocol.
- A live end-to-end path without mock data.
- Ethereum Sepolia deployment, a functional frontend, a public repository, complete documentation,
  `feedback.md`, an X post, and a four-minute maximum video.
- Required chain: **Ethereum Sepolia** (⭐⭐ criterion) — note prior winners were on Arbitrum
  Sepolia. Required: functional frontend, public repo + docs, `feedback.md`, X post tagging
  `@iEx_ec`, ≤4-min demo video, end-to-end without mock data. Historical schedule evidence remains
  in the dated research and does not route implementation.
- On 2026-07-24 the API showed 13 BUIDLs and 80 hackers (81 at the evening recheck), but the
  submission list is private. DoraHacks challenged the default command-line request; a browser-like
  user agent reached the official API, and a rendered browser can inspect the page.
- Prediction markets are not prohibited, but the Innovative track lists them as "already seen … we
  want what nobody has shipped yet." Creativity and end-to-end/no-mock are tied at the highest
  displayed weight. The track's published `judging_criteria` API field is empty (verified live
  2026-07-24) — the steer is description prose, not a scoring formula.
- The current official API has `is_enabled_ask_hackers:true` and a required registration question
  instructing the hacker to complete iExec Hello World and submit the wallet address used.
  `register_form_url:null` and `has_onboarding:false` do not negate that question.

### Previous winners

- [1st — Diam, Best Confidential DeFi](https://dorahacks.io/buidl/43636):
  confidential OTC, sealed RFQ/Vickrey pricing, ERC-7984 settlement.
- [2nd — RWAOS, Best Institutional Architecture](https://dorahacks.io/buidl/43431):
  confidential RWA issuance, transfer controls, selective disclosure, audit operations.
- [3rd — DarkOdds, Best Confidential Prediction Market](https://dorahacks.io/buidl/43656):
  native cloned markets, encrypted wagers/pools, oracle resolution, TEE proportional payout math,
  and selective-disclosure attestations. Its Polymarket integration was read-only; it did not proxy
  trades.

Their canonical ranking is on the
[VIBE winners page](https://dorahacks.io/hackathon/vibe-coding-iexec/winner).

These are exclusion zones. Selective disclosure and “encrypted amounts” are now baseline mechanics,
not an original product thesis.

### Official Nox product catalog

The cloned documentation source names:

- Payments & Payroll
- DeFi & Lending
- Vaults & Yields
- OTC & Trading
- Prediction Markets
- RWA & Real Estate
- Fundraising / VC
- Identity
- NFT
- Invoicing

The generated `llms-full.txt` omits this grid and the five product cards because they are Vue
components. Always read
`.thoughts/raw/iexec-nox-org/documentation/src/getting-started/use-cases.md`.

Evidence levels differ:

- cToken and encrypted-position cVault: linked demos/source;
- Piggy Bank, ERC-7984 token/wrapper/swap, Hardhat: executable building blocks;
- encrypted strategy, capital allocator, RWA: concept pages;
- prediction markets, Identity, NFT, fundraising/VC, invoicing: category labels.

Use these as research lanes, not as ready ideas or proof of current implementations.

### Visible July 2026 crowd

The public GitHub scan found 20 July-created Nox repositories. Crowded lanes include:

- eight payroll projects;
- four Safe/budget/policy products;
- two private Uniswap routing products;
- milestone escrow and CVE audit trail;
- Aave credit/liquidation;
- private DeFi strategy agents;
- confidential donations/treasury.

The DoraHacks list is private, so absence from the dated public GitHub scan is not proof of an
opportunity or of competitor absence.

## Nox reality that constrains every idea

- Supported confidential values are `bool`, `uint16`, `uint256`, `int16`, and `int256`.
- Nox supports arithmetic, safe arithmetic, comparisons, and conditional selection.
- Inputs are bound to owner wallet and consuming application. The reliable route is:
  `wallet → application → Nox.fromExternal`.
- Router-first encrypted ingestion can fail because `msg.sender` no longer matches the proof owner.
- Computation is asynchronous. A live multi-operation Sepolia transaction resolved in roughly
  12 seconds, which proves the shape, not an SLA.
- Every cross-transaction handle must be persisted explicitly.
- Viewer and public disclosure grants are effectively irreversible on the live version.
- Input and public-decryption proofs need application-level replay guards.
- Nox is confidentiality, not anonymity. Browser, Gateway TEE, and Runner TEE trust boundaries must
  be described honestly.
- Use exact current pins from the wiki; default branches contain unreleased APIs.

The reusable confidential-computation spine is:

`direct encrypted input → replay guard → persisted encrypted state → arithmetic/compare/select → reveal one minimal result → proof-gated real action`

A standalone Nox product may own that final action itself; it does not need an artificial
third-party protocol call.

## Product direction reset

The user rejected the previous ideas because they started from confidentiality and forced a product
around it. In particular, do not revive agent evaluators/disputes, community notes, polling,
governance, shares, policy, benchmarks, certifications, ratings, wallets, token factories, or a new
chain/platform. Do not propose products that depend on panels, institutions, legal enforcement,
fake participants, synthetic telemetry, or multi-role demo choreography.

Feasibility is now a veto. The search must begin with comparable winners and current products that
people already use. Only then test whether a small, exact Nox computation is indispensable to one
self-serve product action. Zero survivors is a valid research result.

## NoxLimit verification boundary (`KEEP AND VERIFY`, historical 2026-07-24 checkpoint)

> **Current correction:** the Handle SDK, real pool, adapter, asset forwarding, expiry, refund,
> and local inference experiment pass, and the combined live Sepolia path also passes. See the
> [Prompt 3 memo](./.thoughts/verification/2026-07-28-noxlimit-critical-path.md) and public
> `spike/nox/evidence/sepolia-gate-c.json`.

> The independent audit returned `DROP`, but its decisive privacy claim—that every failed
> evaluation must have an explicit public proof—is contradicted by released source: Handle SDK
> `decrypt` privately serves any `isViewer`-authorized address with no transaction and no public
> proof, and a contract-side Nox primitive skeleton compiles against released v0.2.4. The fixture
> did not cover the Handle SDK, real pool, adapter, asset forwarding, expiry, or refund. Public
> observers may still infer a failed evaluation from timing and non-action (each evaluation emits
> a public `ViewerAdded` event), which is why the live boundary required the now-completed
> Prompt 3 measurement. Demand
> remains unvalidated and the privacy boundary remains narrow. See the
> [independent audit](./.thoughts/verification/2026-07-24-noxlimit-independent-audit.md), the
> [reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md), and
> the [reaffirmation recheck](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md).

The audited product question was not “should we build a prediction market?” It was:

> Does an active outcome-share trader have a valuable need for a confidential resting threshold,
> and can the current released Nox stack turn that threshold into one safe, browser-off, real pool
> trade while the order rests and before its user-selected expiry?

An onchain outcome-share pool holds redeemable `YES` and `NO` assets and quotes trades from its
reserves. A prediction oracle resolves which asset wins; the AMM quote separately decides whether
the order's limit is executable. The bounded spike uses unchanged Gnosis Conditional Tokens/FPMM.
Seer outcomes with Uniswap V3 remain historical comparison evidence, not a competing branch.

The historical verification slice used one curated BTC market. The approved product surface is a
deterministic Market Stream feeding a terminal over real BTC/USD and ETH/USD bundles plus SOL/USD
after its Pyth adapter passes a live test, with 1h/4h/24h horizons. Every order has a public variable
amount that becomes immutable when created, a public side, and one confidential buy limit, plus
cancellation, expiry, refund, resolution, positions, and redemption. A genuine two-threshold
stop-limit, hidden side or size,
sell orders, LP tooling, a CLOB, and a permissionless market factory remain out of first scope.

The final action must remain:

`encryptInput → fromExternal → persisted handle → confidential comparison with the fixed-input
quote sampled in the evaluation-request transaction → threshold-derived public minimum output →
application-bound proof → replay-guarded one-shot minimum-output-protected outcome-share buy`

The worker may advance the state. A zero candidate tells it `quote < minOut`; an eligible candidate
reveals the exact `minOut` even before publication. Public viewers see evaluation timing and the
corresponding pool quote; quiet checks are assumption-dependent evidence, not proof, of
ineligibility because worker delay/failure has the same normalized result-dependent public shape.
The worker must not receive the raw resting threshold before an eligible evaluation, change
immutable order fields, fill worse than the committed limit, redirect proceeds, or steal
collateral. It may delay, censor,
or request irreversible publication for the wrong candidate and thereby force disclosure and,
absent permissionless rescue, a terminal refund. Gate C verified browser-off evaluation,
private failed candidates, nonce-distinct isolation, and one safe proof-authorized real action;
those properties remain regression requirements for the polished build.

A decrypted `ready` boolean plus a generic slippage setting does not enforce the secret limit after
Nox's asynchronous delay. The likely exact design must reveal a threshold-derived minimum output at
fill and bind it to the one-shot AMM call. If that cannot be proven with the current release, exact
private-limit semantics fail.

FPMM sends ERC-1155 shares to its caller. An order adapter would therefore receive the shares
before forwarding them to the immutable recipient and must implement the receiver interface. The
worker gets no token approval. If a submitted proof reveals the minimum output but the AMM buy
reverts, the order is disclosed/refundable rather than confidential-pending again.

## Required reading

- [Current product decision](./.thoughts/decisions/CURRENT.md)
- [Selection and architecture-gate memo](./.thoughts/decisions/2026-07-25-noxlimit-direction-and-architecture-gate.md)
- [Audit and authority gates](./.thoughts/decisions/AUDIT-GATES.md)
- [Canonical NoxLimit architecture](./.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md)
- [Market Stream experience decision](./.thoughts/decisions/2026-07-28-noxlimit-market-stream-experience.md)
- [Designer handoff](./DESIGNER_HANDOFF.md)
- [Visual direction decision — `Complement` adopted, Reclaim palette](./.thoughts/design/2026-07-28-noxlimit-visual-direction-selection.md)
- [Product surface map](./.thoughts/design/2026-07-28-noxlimit-product-surface-map.md)
- [Prompt 3 critical-path evidence](./.thoughts/verification/2026-07-28-noxlimit-critical-path.md)
- [Context/gate/architecture verification](./.thoughts/verification/2026-07-25-context-gate-and-architecture-audit.md)
- [Architecture approval and Opus 5 review reconciliation](./.thoughts/verification/2026-07-28-opus-architecture-review-reconciliation.md)
- [DeepBook patterns for NoxLimit](./.thoughts/research/2026-07-28-deepbook-patterns-for-noxlimit.md)
- [Product surface and post-gate review reconciliation](./.thoughts/verification/2026-07-28-noxlimit-product-surface-and-opus-reconciliation.md)
- [NoxLimit product and market reality](./.thoughts/research/2026-07-24-noxlimit-product-and-market-reality.md)
- [NoxLimit product hypothesis](./.thoughts/ideas/2026-07-24-noxlimit-product-hypothesis.md)
- [Independent NoxLimit audit](./.thoughts/verification/2026-07-24-noxlimit-independent-audit.md)
- [Hackathon-calibrated reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md)
- [Reaffirmation recheck](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
- [Reassessment prompt](./prompts/01a-hackathon-calibrated-noxlimit-reassessment.md)
- [Independent NoxLimit audit prompt](./prompts/01-independent-noxlimit-audit.md)
- [Docs-first correction](./.thoughts/research/2026-07-23-nox-docs-first-correction.md)
- [Docs-first product research](./.thoughts/research/2026-07-23-docs-first-product-research.md)
- [Docs-first candidate report](./.thoughts/ideas/2026-07-23-nox-docs-first-candidates.md)
- [Nox product/use-case map](./.thoughts/wiki/nox-use-case-map.md)
- [Feasibility-first winner research](./.thoughts/research/2026-07-23-feasibility-first-winner-patterns.md)
- [Feasibility-first candidate graveyard](./.thoughts/ideas/2026-07-23-feasibility-first-candidates.md)
- [Nox protocol reality](./.thoughts/wiki/nox-protocol.md)
- [Nox developer stack](./.thoughts/wiki/nox-developer-stack.md)
- [Nox integration patterns](./.thoughts/wiki/nox-integration-patterns.md)
- [Known contradictions](./.thoughts/wiki/nox-known-contradictions.md)
- [Source manifest](./.thoughts/sources/source-manifest.md)

Use [the staged prompts](./prompts/README.md) rather than improvising a broad “find an idea” prompt.
Prompt 4 is now the active implementation handoff.
