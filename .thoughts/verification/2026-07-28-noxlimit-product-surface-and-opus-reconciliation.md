# NoxLimit Product Surface and Post-Gate Review Reconciliation

**Date:** 2026-07-28
**Gate:** Architecture refinement after live critical-path `GO`, before polished implementation
**Outcome:** Keep NoxLimit; adopt the DeepBook-informed multi-market terminal and the valid Opus
corrections; do not reopen selection or invent a CLOB.

## User decisions being applied

- NoxLimit remains the selected product.
- The product must not remain a BTC-only proof. The intended catalog is BTC/USD, ETH/USD, and
  SOL/USD with multiple useful horizons such as 1h, 4h, and 24h.
- The product should take inspiration from DeepBook's trading UI and API discipline.
- The hackathon deadline is not an active architecture or quality constraint. The user controls
  pacing and authorization. Historical dates may be retained as evidence but must not route work,
  force deployment, or justify weakening correctness.
- Market close/resolution time, order expiry, and internal evaluation/publication timeouts remain
  necessary protocol concepts. They are not project schedules and must be named distinctly.

## Reconciliation snapshot

- **Objective:** turn the verified NoxLimit mechanism into a clear multi-asset prediction-trading
  product architecture and agent-ready build route.
- **Authority:** latest user direction, then `CURRENT.md`, `AUDIT-GATES.md`, and the one canonical
  architecture.
- **Already established:** product selected; architecture approved; local and live critical path
  passed; one real Nox-authorized FPMM fill occurred on Ethereum Sepolia.
- **Historical:** the independent `DROP`, pre-Gate-C stop language, and all project-clock pressure.
- **Genuine unknowns:** polished product implementation, objective resolver deployment, durable
  worker operation, live ETH/SOL market bundles, fresh-user onboarding, and submission readiness.
- **Next authorized action:** maintain the context/architecture corpus and stop at the user's
  polished-build checkpoint. Implementation begins only when the user advances it.

## DeepBook conclusion

DeepBook Spot is a real CLOB; DeepBook Predict is a separate pool/vault-backed digital-options
primitive. NoxLimit is neither. It uses a real outcome-share FPMM and adds a confidential resting
maximum-price condition. Therefore:

- transfer the market list, exchange-terminal layout, quote preview, typed read/build API,
  transaction receipts, open-order table, position table, and redemption lifecycle;
- replace public CLOB depth with a real FPMM quote ladder and price impact;
- never display confidential orders as public liquidity;
- keep encryption in the browser and writes wallet-signed;
- use indexed public reads for speed but direct contract/pool reads for trust-critical pre-sign
  data.

Full evidence is in
[`../research/2026-07-28-deepbook-patterns-for-noxlimit.md`](../research/2026-07-28-deepbook-patterns-for-noxlimit.md).

## Opus findings and adopted disposition

An exact `claude-opus-5` max-effort headless review completed successfully with exit code 0, no
fallback, no edits, and no schedule-pressure recommendation. Its verdict was: **Gate C remains
`GO`; proceed with the polished build after bounded architecture corrections.** These corrections
do not reverse product selection or executable evidence.

| ID | Finding | Disposition | Canonical response |
|---|---|---|---|
| F1 | `evaluationCount` can reach its cap while stored status still reads `Open` | Accept | Treat count as monotonic and the cap as an explicit privacy/check budget. Add `remainingEvaluations`; derive `MonitoringExhausted` for zero-budget `Open`; let the owner cancel and replace it. Never show it as actively monitored. Couple nonce/count in invariants and test the exact final check. |
| F2 | Evaluation and publication recovery windows need distinct product semantics; the runner's 45-second value is not product configuration | Accept | Configure both independently from measured Nox/chain behavior, show onchain-derived countdown/retry state, and reject degenerate configuration. These are technical recovery windows, not project schedules or latency promises. Once publication is requested, owner cancellation/abandonment is forbidden. |
| F3 | Resolver identity is baked into the Conditional Tokens condition and downstream bundle | Accept | Deploy resolver first, then condition, seeded FPMM, bound OrderBook, and versioned catalog entry. Use one immutable stack per asset/strike/horizon. |
| A1 | Canonical prose allowed owner abandonment from `PublicationPending`, but code correctly forbids it | Accept; highest priority | Remove that edge. Allowing the owner to walk away after disclosure creates a free option. Only valid proof handling, publication/order timeout, or execution failure may advance that state. |
| A2 | Canonical prose said evaluation timeout reopens “with a new nonce,” but code increments the nonce only on the next request | Accept | Timeout ends the active attempt and returns storage to `Open`; that nonce/check remains consumed. The next successful `requestEvaluation` increments the nonce. |
| A3 | `Evaluating → Open` omitted the zero-budget guard | Accept | Split the read-model transition into `Open` when checks remain and derived `MonitoringExhausted` when none remain. Exhausted `Open` is non-executable. |

Additional adopted findings:

- make `candidateOf` return an actionable candidate only for the current nonce and compatible
  status;
- add mutation-strength tests for reentrancy, insufficient finalizer gas reserve, and global result
  consumption, plus phase-boundary, late-finalize, order-expiry-precedence, zero configuration,
  publication-disclosure, and exact exhaustion cases;
- pin the intended custom error or selector instead of using bare rejection assertions;
- record restart reconstruction provenance truthfully;
- use status strings in public APIs rather than enum ordinals because the disposable harness and
  OrderBook intentionally have different enums and late-finalize behavior;
- keep Gate C's permissive cadence deployment as bounded evidence only and use intended
  cadence/check-budget guards in the product deployment;
- keep user encryption/order creation wallet-bound; sponsored testnet gas may support the wallet
  but must not impersonate it or receive the plaintext threshold;
- derive `questionId` and `marketId` deterministically from stable market content rather than wall
  clock time;
- identify orders externally by `(chainId, orderBook, orderId)` and version market instances by
  `conditionId`;
- expose resolver/feed provenance, configuration version, active/retired status, and contract
  addresses in the committed catalog;
- use current Chainlink round-selection guidance with phase-boundary awareness; do not rely on the
  deprecated `answeredInRound` check.

A final architecture-to-code consistency pass added three required corrections:

- **C1 — enforce market close onchain:** the current spike OrderBook has no immutable market-close
  field. The polished contract must bind `tradingClosesAt`, require
  `expiresAt <= tradingClosesAt`, and forbid evaluation/publication/nonzero finalization after
  either boundary. UI/catalog filtering alone is insufficient.
- **C2 — complete and unambiguous order API:** single-order calls use
  `(chainId, orderBook, orderId)`, not a scalar ID that collides across market deployments. The
  client exposes expiry advancement and the separate `refund` transaction; `cancel` does not by
  itself return collateral.
- **C3 — prevent Chainlink round cherry-picking:** the resolver verifies that the selected
  observation is the first chronological feed observation at or after resolution by proving a
  phase-aware adjacent predecessor before resolution. Accepting an arbitrary later valid round is
  forbidden.

The existing contract already supports a variable public `amountIn` per order. “Fixed amount” means
immutable for that specific resting order, not one globally fixed size. Product copy and UI must use
that wording.

## Multi-market architecture decision

NoxLimit remains a set of curated, independently secured market bundles:

```text
settlement adapter → binary resolver → CTF condition → seeded FPMM → bound OrderBook
                                      ↘ catalog/read model ↗
```

The catalog composes those bundles into one application. It does not weaken the current
single-market OrderBook bindings and is not a permissionless factory. Stable identity is
content-derived from chain, asset/feed, strike, trading close, resolution time, collateral, and
resolver policy; a deployed instance is versioned by `conditionId`, and an order is identified by
`(chainId, orderBook, orderId)`.

- BTC/USD and ETH/USD use verified official Ethereum Sepolia Chainlink feeds.
- SOL/USD uses a Pyth adapter only after its historical-update selection rule passes a live test.
- The UI supports 1h, 4h, and 24h horizons, but lists only actually deployed and seeded bundles.
- All execution remains on Ethereum Sepolia. The asset label identifies the oracle reference, not
  another execution chain.
- The committed catalog exposes addresses, resolver/feed provenance, timeout/check-budget policy,
  version, and active/retired state; trust-critical reads still go to chain.

## Product surface decision

The direct judge/user path is:

1. Open the market terminal and filter by asset/horizon.
2. Select a real market and inspect strike, time to close/resolution, oracle price, YES/NO pool
   prices, liquidity, and real-size quote ladder.
3. Choose YES or NO, enter a public amount, enter a private maximum average price, and choose an
   order expiry.
4. Refresh the exact pool quote, encrypt the derived `minOut` in the browser, approve collateral,
   and sign the order transaction.
5. Leave the browser. The worker evaluates within the explicit check budget and exposes durable
   status without learning custody permissions.
6. If eligible, publication and permissionless finalization execute one atomic FPMM buy and deliver
   outcome shares to the bound recipient. Otherwise the order remains private, expires, exhausts
   monitoring, or can be cancelled/refunded.
7. Return to `Positions`; after objective resolution, redeem the winning shares.

This is a product loop, not a mocked dashboard. A public API/SDK may expose reads and unsigned
transaction builders, but it is secondary to the direct terminal.

## Remaining implementation gate

The critical mechanism is verified, but the following are still implementation work:

- terminal frontend and indexed public read model;
- market catalog and deployment manifests;
- BTC/ETH resolver path, SOL/Pyth adapter test, and objective redemption UI;
- explicit check-budget and status-aware getter changes;
- immutable trading-close enforcement, composite order references, and complete cancel/expire/
  refund client actions;
- durable worker configuration, recovery, and gas path;
- product-strength adversarial tests and a fresh final deployment;
- self-serve onboarding and submission evidence.

None of these unknowns reopens product selection. They become the implementation plan only after
the user authorizes the polished build.
