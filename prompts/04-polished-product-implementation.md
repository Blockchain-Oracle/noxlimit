# Prompt 4 — Build the NoxLimit Product

> **ACTIVE — the user explicitly authorized the polished build on 2026-07-28.**

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
- bounded source/as-of/block/staleness provenance for card previews; use an accessible SVG sparkline
  for cards and Lightweight Charts only in the selected terminal;
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

Run clean unit, property, adversarial, integration, recovery, and browser tests. Then verify a fresh
live path that includes real funding/onboarding, order creation, browser closure, worker evaluation,
one atomic FPMM fill, position display, objective resolution, and redemption. Use the final
cadence/check-budget guards, not the permissive Gate C deployment configuration.

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
