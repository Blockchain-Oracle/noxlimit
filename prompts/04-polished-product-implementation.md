# Prompt 4 — Build the NoxLimit Product

> **Staged only. Do not run until the user explicitly authorizes the polished build.**

You are implementing the selected iExec WTF Hackathon product in this repository. This is not a
new discovery, selection, or architecture exercise. Start by following `AGENTS.md` and the mandatory
context-reconciliation gate.

## Authority and required reading

Read, in order:

1. `.thoughts/decisions/CURRENT.md`
2. `.thoughts/decisions/AUDIT-GATES.md`
3. `.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md`
4. `.thoughts/verification/2026-07-28-noxlimit-product-surface-and-opus-reconciliation.md`
5. `.thoughts/research/2026-07-28-deepbook-patterns-for-noxlimit.md`
6. `.thoughts/verification/2026-07-28-noxlimit-critical-path.md`
7. `AGENT_HANDOFF.md`
8. the existing `spike/market` and `spike/nox` code and tests

Before editing, report the objective, canonical authority, established executable evidence,
historical/superseded instructions, genuine unknowns, and the next safe mutation. Inspect `git
status` and preserve unrelated user changes.

The user controls pacing. Do not use a historical submission date, old spike clock, or agent
estimate to force deployment, remove approved scope, or weaken correctness. Protocol times remain
necessary and distinct: market trading close, resolution time, order expiry, evaluation recovery,
and publication recovery.

## Product to build

Build NoxLimit as a direct multi-asset trading terminal over real Ethereum Sepolia outcome-share
markets:

- curated BTC/USD and ETH/USD markets, plus SOL/USD after its Pyth settlement adapter passes the
  dedicated live verification;
- 1h, 4h, and 24h market horizons;
- YES/NO outcome shares against real seeded Conditional Tokens + FPMM bundles;
- public variable collateral amount, immutable per order;
- private maximum average buy price converted to integer `minOut` and encrypted in the browser;
- hosted browser-off evaluation with an explicit privacy/check budget;
- cancel, expiry, refund, fill, position, objective resolution, and redemption;
- durable status and self-serve onboarding.

Use DeepBook only as product inspiration: market catalog, trading-terminal layout, typed reads and
unsigned transaction builders, quote preview, transaction receipt, Orders, Positions, and Activity.
Do not implement or display a CLOB, public bid/ask depth, maker queue, or price-time priority. The
NoxLimit liquidity view is a real FPMM quote ladder for several public input sizes. Confidential
resting orders never appear as public depth.

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

Derive `marketId` and Conditional Tokens `questionId` from stable market content, never wall-clock
deployment time. Version deployed instances by `conditionId`, identify orders externally by
`(chainId, orderBook, orderId)`, and expose resolver/feed provenance, configuration, and
active/retired state in the committed catalog. Chainlink resolution must handle aggregator phase
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

### 4. Build the direct terminal

Implement:

- asset and horizon filters;
- real market/strike/trading-close/resolution details;
- oracle and YES/NO price history;
- FPMM liquidity and quote ladder, clearly labeled as AMM pricing;
- a private order ticket with side, public amount, private maximum price, and order expiry;
- exact pre-sign quote, threshold conversion, browser encryption, approval, and signing;
- transaction receipts and explorer links;
- `My Orders`, `Positions`, and `Activity`;
- durable `Resting privately`, `Evaluating`, `Publication pending`, `Filled`,
  `Monitoring exhausted`, `Cancelled`, `Expired`, `Refundable`, and `Redeemable` states.

The primary flow is a terminal, not chat. An API/agent interface is secondary.

### 5. Verify the judged product path

Run clean unit, property, adversarial, integration, recovery, and browser tests. Then verify a fresh
live path that includes real funding/onboarding, order creation, browser closure, worker evaluation,
one atomic FPMM fill, position display, objective resolution, and redemption. Use the final
cadence/check-budget guards, not the permissive Gate C deployment configuration.

The product may be builder-seeded on testnet, but label that honestly. Do not claim anonymity, FHE,
organic liquidity, production mainnet, professional auditing, or deterministic fill latency.

## Stop conditions

Stop and report exact evidence if a load-bearing approved assumption fails: Nox release/ABI
incompatibility, inability to bind/consume the result, failure of atomic `minOut`, unrecoverable
asset loss, or inability to resolve/redeem a real listed market. Do not reopen selection for ordinary
implementation bugs or post-hackathon hardening items.

When complete, update the canonical architecture only where executable evidence required a change,
then reconcile `CURRENT.md`, routing files, source manifest, verification memo, and handoff together.
