# Prompt 4 — Build the NoxLimit Product

> **ACTIVE — the user explicitly authorized the polished build on 2026-07-28.**

> **IMPLEMENTATION CHECKPOINT — Phases 0–5 and bounded operator hardening are complete. Phase 6 is
> committed through BTC/ETH deployment/funding, three browser-off real order/fill flows,
> predecessor LP close, and atomic paired successor activation at commit `c073643`. Runtime catalog
> revision `5` is
> `packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json`, hash
> `0x8aa65b0b5a91025ed1fd0e1487b9c9058b44ca05889632e9f85baf3bb3885899`; original routes are
> `RETIRED`, successors are `ACTIVE`, and the exercised service was `READY`. Fresh 2026-07-29
> 12:08Z `pnpm check` passes contracts `77`, protocol `14`, catalog `6`, service `65`, and web `61`
> (`223` total), including compile/type-check/test/build. The dedicated Playwright suite passes
> `45` journeys with `21` intentional skips and zero failures. Do not recreate these layers or modify
> `spike/**`. BTC now completes the real browser resolution, winning-user redemption, and builder-LP
> redemption path. ETH is terminally rejected: its unique first post-deadline observation arrived
> 24 seconds outside the immutable 3,600-second bound, the selector made no write, and no ETH winner
> exists. Both active revision-5 successors retain the same known liveness risk. Corrected BTC
> `0x37a7b5826c9ba1209470b98cd38a38f4e3e6cb448c353333138bfced7fbaf0a2`
> and ETH `0xa5219adaa2c86c0419cc7d9b05188784192ee023a7c3c27bab3f0cc8eaf8fc8a`
> successors are now resolver-first deployed, immutable-validated, seeded with 50,000,000 YES /
> 50,000,000 NO atoms, and staged `SUCCESSOR` in revisions `6`/`7`. Both use 14,400 seconds and
> share the revision-5 close / corrected-successor start boundary `2026-07-29T13:50:00Z`;
> quote freshness remains separately 3,600 seconds. Revision `5` stays current until one atomic
> revision-`8` cutover. Local service/web container build/smoke passes, but public hosting, video,
> X, and form/contact fields remain pending.**

You are implementing the selected iExec WTF Hackathon product in this repository. This is not a
new discovery, selection, or architecture exercise. Start by following `AGENTS.md` and the mandatory
context-reconciliation gate.

## Authority and required reading

Read, in order:

1. `.thoughts/decisions/CURRENT.md`
2. `.thoughts/decisions/AUDIT-GATES.md`
3. `.thoughts/decisions/2026-07-28-noxlimit-market-stream-experience.md`
4. `.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md`
5. `.thoughts/stories/2026-07-28-noxlimit-product-stories.md`
6. `.thoughts/design/2026-07-28-noxlimit-product-surface-map.md`
7. `.thoughts/plans/2026-07-28-noxlimit-polished-product-plan.md`
8. `DESIGNER_HANDOFF.md`
9. `.thoughts/verification/2026-07-28-noxlimit-product-surface-and-opus-reconciliation.md`
10. `.thoughts/research/2026-07-28-deepbook-patterns-for-noxlimit.md`
11. `.thoughts/verification/2026-07-28-noxlimit-critical-path.md`
12. `AGENT_HANDOFF.md`
13. the existing `spike/market` and `spike/nox` code and tests

Before editing, report the objective, canonical authority, established executable evidence,
historical/superseded instructions, genuine unknowns, and the next safe mutation. Inspect `git
status` and preserve unrelated user changes.

The user controls pacing. Do not use a historical submission date, old spike clock, or agent
estimate to force deployment, remove approved scope, or weaken correctness. Protocol times remain
necessary and distinct: market trading close, resolution time, order expiry, evaluation recovery,
and publication recovery.

## Product to build

Build NoxLimit as a hybrid Market Stream and multi-asset trading terminal over real Ethereum
Sepolia outcome-share markets:

- curated BTC/USD and ETH/USD markets, plus SOL/USD after its Pyth settlement adapter passes the
  dedicated live verification;
- 1h, 4h, and 24h market horizons;
- YES/NO outcome shares against real seeded Conditional Tokens + FPMM bundles;
- public variable collateral amount, immutable per order;
- private maximum average buy price converted to integer `minOut`, then sent directly by the
  browser to the official Nox Handle Gateway confidential-input path;
- hosted browser-off evaluation with an explicit privacy/check budget;
- cancel, expiry, refund, fill, position, objective resolution, and redemption;
- durable status and self-serve onboarding.

The first-use experience is universal product behavior, not an evaluation-only mode. A wallet that
needs funds signs one short-lived request; the sponsor service tops it toward measured native
Sepolia ETH and clearly labeled six-decimal NoxLimit Test USDC starting targets without an external
faucet or separate account. Balances then decrease normally and are never auto-refilled. A
low-balance returning user may explicitly request a cooldown- and lifetime-capped refill that tops
toward the targets. This sponsored onboarding does not make normal writes gasless.

Use DeepBook only as product inspiration: market catalog, trading-terminal layout, typed reads and
unsigned transaction builders, quote preview, transaction receipt, Orders, Positions, and Activity.
Do not implement or display a CLOB, public bid/ask depth, maker queue, or price-time priority. The
NoxLimit liquidity view is a real FPMM quote ladder for several public input sizes. Confidential
resting orders never appear as public depth.

Use the user's TikTok reference only for discovery interaction: on mobile, a vertically
snap-aligned `Discover` Market Stream focuses on one real market at a time; on desktop, the same
catalog becomes a richer vertical stream rail beside the full terminal. Each card uses real catalog,
oracle, FPMM, liquidity, and compact chart data. The stream has visible deterministic sorting, no
personalized `For You`, social mechanics, autoplay media, fake popularity, or placeholder markets.
Sort modes are exactly `Closing soon` (`tradingClosesAt ASC`), `Recently opened` (`opensAt DESC`),
and `Liquidity` (numeric `completeSetDepthAtoms DESC`), each then `marketId ASC`; asset, horizon,
and lifecycle remain filters.
`Trade YES` / `Trade NO` preselects the market and side and opens a full-context Trade workspace,
not a bare form. It must include the full question, oracle-versus-outcome distinction, liquidity,
size-aware quote, close/resolution terms, and expandable full chart before the amount, private-limit,
expiry, disclosure, Gateway, and wallet flow. A dirty order draft must not be silently destroyed by
scrolling, switching cards, mobile dismissal, back navigation, or swipe-away. Public fields may be
kept only in volatile per-market state; a confirmed market/account/chain switch or explicit discard
clears the private maximum price, which is never persisted.

## Required implementation order

Steps 1–4 below are the retained implementation contract and regression boundary; they and bounded
operator hardening are implemented rather than a request to restart. Step 5 is partial/degraded:
live deployment/funding/fills/LP close/successor cutover and one complete BTC resolution/redemption
vertical are committed; ETH is a terminal immutable-policy rejection, and public release evidence
remains pending.

### 1. Harden the verified contract slice

- Preserve immutable pool/condition/collateral/outcome/recipient binding, nonce-distinct Nox
  candidates, proof validation, one-shot result consumption, restricted self-call execution,
  atomic FPMM `minOut`, exact share-delta forwarding, and refund safety.
- Make the deployment's `maximumEvaluations` an explicit privacy/check policy and expose each
  order's monotonic count and remaining budget.
- Add `remainingEvaluations(orderId)` and truthful `MonitoringExhausted` semantics.
- Make candidate reads status- and active-nonce-aware.
- Preserve nonce/count coupling: a timeout consumes the attempt and returns storage to `Open`; the
  next successful evaluation request increments the nonce. If no checks remain, expose the derived
  non-executable `MonitoringExhausted` state.
- Forbid owner cancellation or abandonment from `PublicationPending`; after disclosure is
  requested, only valid proof handling, publication/order timeout, or execution failure may advance
  the state.
- Add immutable `tradingClosesAt` to each market-bound OrderBook. Enforce
  `expiresAt <= tradingClosesAt` at creation and prevent evaluation, publication, or nonzero
  finalization after order expiry or market close, including direct contract calls.
- Replace product use of the spike runner's 45-second phase value with independently configurable,
  measured recovery windows.
- Keep user order creation wallet/application-bound. A backend or relayer must not receive the raw
  threshold or impersonate the user.

Add fault-injection tests for reentrancy, insufficient finalizer gas reserve, global result
consumption, stale candidate reads, exact exhaustion, timeout boundaries, late finalize, order
expiry precedence, degenerate timeout/budget configuration, publication disclosure,
cancel/expiry races, and restart recovery. Pin the intended custom error or selector in every
rejection test; bare rejection alone is insufficient.

### 2. Build objective market bundles and catalog

For every market, deploy in this order:

`settlement adapter/resolver → CTF condition → seeded FPMM → bound OrderBook → catalog entry`

Use the official Ethereum Sepolia Chainlink BTC/USD and ETH/USD feeds. Implement SOL/USD through a
Pyth historical-price adapter only after a live test proves update verification, accepted
publish-time selection, fee handling, exponent normalization, and one-shot settlement. Never list
an undeployed, unseeded, or unverified placeholder as live.

Keep each OrderBook single-market. Compose the product with a versioned manifest/read model rather
than weakening the constructor bindings or building a permissionless market factory.

The unchanged FPMM has no trading-close guard. Enforce `tradingClosesAt` for every NoxLimit action,
stop presenting executable product quotes at close, and include an idempotent operator action that
removes builder-seeded LP liquidity before resolution. Do not describe the legacy pool itself as
time-gated.

Derive `marketId` and Conditional Tokens `questionId` from stable market content, never wall-clock
deployment time. Version deployed instances by `conditionId`, identify orders externally by
`(chainId, orderBook, orderId)`, and expose resolver/feed provenance, configuration, and immutable
verification in each market record. Publish hash-linked catalog revisions with exactly one
`ACTIVE` market per asset/horizon plus explicit `SUCCESSOR`/`RETIRED` routing; never mutate the
market record to change activation. Chainlink resolution must handle aggregator phase
boundaries and current round guidance; do not rely on deprecated `answeredInRound` checks. Prove
the selected observation is the first chronological one at or after resolution by validating its
timestamp and an adjacent predecessor before resolution, including phase transitions. Never let a
caller cherry-pick any later favorable round.

For every future official Sepolia BTC/USD or ETH/USD deployment, enforce
`maximumObservationDelaySeconds >= 14,400`. The first-observation/adjacent-predecessor rule remains
unchanged, so the larger liveness bound does not create later-round choice. Keep runtime oracle quote
freshness independently at 3,600 seconds. Existing 3,600-second market records are immutable
history; do not edit them in place.

Use the implemented deployment journal for every live bundle. It is created before the first
write, cross-process locked, and bound to the exact plan/operator/chain/output paths, ordered
expected steps, and frozen funding plan. Preserve `INTENT → SUBMITTED → CONFIRMED`; never blindly
replace a submitted transaction. A bare intent requires explicit per-step `ADOPT` with the exact
transaction hash or `RETRY`, both bound to `expectedAttempt`. Keep secrets out of the journal, and
publish only hash-verified create-only evidence/catalog outputs. Market duration and canonical
question must match the declared 1h/4h/24h horizon exactly. When reusing operator-owned shared Test
USDC, mint only the calculated pool/treasury shortfall.

### 3. Build the worker, indexer/read model, and typed client

- Evaluate after order creation, on material public quote movement, or a conservative heartbeat,
  always respecting the onchain minimum interval and remaining check budget.
- Reconstruct state after restart and record reconstruction provenance truthfully.
- Separate cached public market/history reads, wallet-scoped reads, and uncached trust-critical
  pre-sign quotes.
- Expose the small client surface defined in the canonical architecture. Keep decrypt/evaluate/
  publication capabilities internal to the worker.
- Use composite `(chainId, orderBook, orderId)` references for every single-order operation, and
  expose `cancel`, permissionless expiry advancement, and the separate `refund` transaction.
- Make writes unsigned until the connected wallet signs them.
- Use a caller correlation/idempotency key for transaction proposals and named status strings in
  APIs, not enum ordinals from either the disposable harness or OrderBook.
- Separate immutable verification, catalog activation, objective lifecycle, dynamic tradeability,
  the complete ordered `tradeabilityReasons`, and derived badges; `CLOSING_SOON` is only a badge.
- Implement the plan's snapshot/cursor market-list and source-provenanced history contracts. JSON
  uses decimal strings for unbounded integers. Card prices use the canonical 1-Test-USDC reference
  quote and liquidity sorting uses integer complete-set depth.
- Prefetch only adjacent public detail/compact history with abort/deduplication. Never prefetch the
  Gateway, wallet/funding data, writes, or uncached final quote.

### 4. Build the Market Stream and direct terminal

Implement:

- a mobile vertical Market Stream and desktop stream rail over only verified/deployed/seeded
  catalog entries;
- full/expandable question, asset/horizon, separate close countdown, oracle versus strike,
  YES/NO prices, liquidity, freshness/lifecycle, and truthful compact preview on each card;
- visible deterministic `Closing soon`, `Recently opened`, and `Liquidity` sorts plus asset,
  horizon, and lifecycle filters, with reduced-motion ordinary-scroll and explicit previous/next
  accessibility paths;
- `opensAt`/catalog-activation data, stable `marketId` tie-breaking, and focused-card ordering that
  does not jump until a deliberate filter/sort/refresh action;
- asset and horizon filters;
- real market/strike/trading-close/resolution details;
- oracle and YES/NO price history;
- bounded source/as-of/block/staleness provenance for card previews and an accessible real-point
  chart implementation in the selected terminal; do not add a chart dependency merely to replace
  the current verified SVG/line renderer;
- FPMM liquidity and quote ladder, clearly labeled as AMM pricing;
- a private order ticket with side, public amount, private maximum price, and order expiry;
- exact pre-sign quote, threshold conversion, direct browser-to-Gateway confidential input,
  approval, and signing;
- transaction receipts and explorer links;
- `My Orders`, `Positions`, and `Activity`;
- durable `Resting privately`, `Evaluating`, `Publication pending`, `Filled`,
  `Monitoring exhausted`, derived `Expiry ready`, `Cancelled`, `Expired`, `Refundable`, and
  `Redeemable` states. `Expiry ready` exposes the permissionless expiry transaction before the
  separate refund action is available.

The primary flow is `Market Stream → selected-market terminal/ticket → explicit review → wallet
authorization`, not chat and not one-tap wagering. An API/agent interface is secondary.

### 5. Verify the complete user path

**Current checkpoint:** the BTC NO, BTC YES, and ETH YES artifacts already prove signed funding
where needed, direct Gateway input, real order creation, browser closure, browser-off FPMM fill, and
fresh-browser `Filled` reconstruction on the original bundles. Both predecessor LP removals and the
paired revision-5 successor cutover are committed. BTC resolution plus winning-user and builder-LP
redemption are also committed. ETH's accountless selector proved its first observation was 24
seconds beyond the immutable one-hour bound and stopped before a write. Do not rerun those writes or
invent an ETH settlement merely to make the evidence symmetric.

The complete acceptance path spans real funding/onboarding, order creation, browser closure, worker
evaluation, atomic FPMM fill, position display, objective resolution, and redemption. BTC now covers
that entire path. ETH is terminally unavailable for this condition: do not poll or call the retired
resolver again, substitute a later round, or claim the rejected price as a winner. Revision `5`
remains the current routing, but both active successors carry the disclosed one-hour liveness risk.
The
[corrected strike plan](../.thoughts/evidence/2026-07-29-sepolia-corrected-successor-strike-plan.json),
[BTC deployment evidence](../.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-deployment.json),
and
[ETH deployment evidence](../.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-deployment.json)
prove the four-hour replacements are ready but staged only. Keep revisions `6`/`7` non-current;
at/after the shared close, publish and runtime-adopt one revision `8` that retires and activates
both axes atomically. Run the clean unit, property, adversarial, integration, recovery, browser,
and root checks again at the submission commit. Public hosting remains unverified despite passing
local container build/check/smoke.

Browser assertions must prove card Trade actions cause no Gateway/wallet request before explicit
review, design fixtures never ship as live responses, scroll changes focus without changing the
selected Trade market or destroying a draft, reduced-motion Prev/Next parity, one accessible
responsive interaction tree, and no page-level overflow at 390px.

The product may be builder-seeded on testnet, but label that honestly. Do not claim anonymity, FHE,
organic liquidity, production mainnet, professional auditing, or deterministic fill latency.

## Stop conditions

Stop and report exact evidence if a load-bearing approved assumption fails: Nox release/ABI
incompatibility, inability to bind/consume the result, failure of atomic `minOut`, unrecoverable
asset loss, or inability to resolve/redeem a real listed market. Do not reopen selection for ordinary
implementation bugs or post-hackathon hardening items.

When complete, update the canonical architecture only where executable evidence required a change,
then reconcile `CURRENT.md`, routing files, source manifest, verification memo, and handoff together.
Do not replace public frontend/service, repository, video, X, organizer-form, or contact placeholders
until each value is externally verified.
