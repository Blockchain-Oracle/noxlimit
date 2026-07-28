# NoxLimit Product Stories

**Status:** Approved product direction; implementation input  
**Primary actor:** Prediction-market trader  
**Supporting actors:** Hosted evaluator/finalizer, curated-market operator, objective resolver  
**Canonical technical contract:**
[`../architecture/2026-07-25-noxlimit-system-architecture.md`](../architecture/2026-07-25-noxlimit-system-architecture.md)

## Product promise

NoxLimit lets a trader leave a maximum-price order against a real onchain YES/NO market without
giving that price to the application backend and without keeping a browser or personal bot online.
The market, side, amount, wallet, and timing remain public. The maximum price stays encrypted while
the order genuinely rests; it becomes public if the order is published for execution.

The first product combines a vertical Market Stream for fast discovery with a direct Ethereum
Sepolia trading terminal for curated BTC/USD and ETH/USD markets, with SOL/USD listed only after
its Pyth settlement path is verified. Markets use 1-hour, 4-hour, and 24-hour horizons. Each market
has real Conditional Tokens outcome shares, a seeded fixed-product market maker, an objective price
resolver, and a market-bound NoxLimit order contract.

## Product laws

These are acceptance rules, not design preferences:

1. Every first-time user's shortest journey needs one wallet, no local setup, no second wallet, and
   no external prediction-market account. This is the normal product experience, not a special
   evaluation shortcut.
2. Market discovery uses a TikTok-like vertical stream on mobile and a stream rail beside the
   terminal on desktop. The stream is deterministic, contains only real verified bundles, and
   always leads to analytical context and explicit order review—never one-tap execution.
3. Every live market shown in the stream or terminal maps to a deployed and seeded onchain bundle.
4. Oracle price and YES/NO share price are visibly different concepts.
5. The order side and collateral amount are public. Only the maximum average execution price is
   confidential while resting.
6. The browser sends the confidential input directly to the official Nox Handle Gateway. The
   NoxLimit application API, database, and analytics never receive the initial plaintext maximum
   price; the Gateway TEE is part of the disclosed trust boundary. During monitoring, the fixed
   evaluator learns only that a check failed when it sees zero, but learns the exact derived limit
   when a check is eligible.
7. A fill is a real atomic FPMM purchase. It either satisfies the protected minimum share output or
   does not trade.
8. Closing the browser does not stop monitoring. Returning users can reconstruct state from chain
   and indexed worker evidence.
9. Cancellation, expiry, and refund are distinct actions. Cancellation alone is never presented as
   collateral already returned.
10. Market horizon, NoxLimit order close, market resolution, order expiry, evaluation recovery, and
   publication recovery are different times and must not be collapsed into one “deadline.” The
   unmodified FPMM itself is not time-gated.
11. The interface never claims anonymity, FHE, invisible activity, guaranteed execution, mainnet
    readiness, organic liquidity, or a public order book.

## Trader stories

### S1 — Enter a usable market without setup friction

As a first-time trader, I want to connect one wallet and receive or verify usable test collateral
inside the product, so I can try the core flow without hunting for a faucet or configuring a local
environment.

Acceptance criteria:

- The app explains that trading occurs on Ethereum Sepolia before asking for a transaction.
- Disconnected, wrong-network, insufficient-gas, and insufficient-collateral states each have one
  obvious recovery action.
- The funding route is clearly labeled as testnet onboarding, not a deposit into a production
  account.
- If the wallet lacks funds, one gas-free signed funding request lets the NoxLimit sponsor service
  top it toward measured native Sepolia ETH and `NoxLimit Test USDC` starting targets.
- No separate NoxLimit account or external faucet is required. The funding surface handles
  cooldown, partial completion, treasury-low, service-down, and retry states honestly.
- Funds are never topped up automatically. A low-balance returning user can explicitly request a
  capped refill after the configured cooldown; balance checks, per-refill/lifetime caps, and the
  user's real insufficient-balance state remain visible.
- Returning users with sufficient gas and collateral do not see onboarding as a blocking wizard.
- The default live market is visible before wallet connection; connecting is required only for
  wallet-scoped data and writes.

### S2 — Discover a relevant live market

As a trader, I want to move quickly through a focused stream of curated markets and filter it by
tracked asset and horizon, so I can discover the question I want without losing the context needed
to trade responsibly.

Acceptance criteria:

- Asset filters support BTC and ETH; SOL appears only when the verified catalog marks it active.
- Horizon filters support 1h, 4h, and 24h.
- Mobile presents one real market at a time in a vertical snap-aligned `Discover` stream. Desktop
  presents the same catalog as a richer scrollable rail beside the full terminal.
- Each card shows the complete or expandable question, original horizon, separate NoxLimit-order
  close countdown, current oracle versus strike, YES/NO FPMM prices, pool liquidity,
  freshness/lifecycle, and a compact truthful chart preview.
- `Trade YES` and `Trade NO` preselect market/side and open a full-context Trade workspace—not a
  bare form—with the full question, oracle-versus-outcome distinction, size-aware quote,
  liquidity/terms, expandable full chart, amount, private limit, expiry, privacy disclosure,
  Gateway input, and wallet authorization.
- Sorting is deterministic and visible: `Closing soon` by ascending close time, `Recently opened`
  by descending open time, or `Liquidity` by descending numeric `completeSetDepthAtoms`, each with
  stable `marketId` tie-breaking. Asset, horizon, and lifecycle are filters. Live values update in place,
  but background ranking cannot move the focused card until a deliberate refresh/filter/sort
  action. The first version has no personalized `For You`, social engagement, or fake popularity.
- Each asset/horizon maps to a discrete strike/resolution bundle. Several horizons can be live
  simultaneously; the horizon label is not the same as the remaining close countdown.
- The initial catalog prefers one active near-the-money bundle per asset/horizon and rolls a
  verified successor as it closes, avoiding needless liquidity fragmentation across many strikes.
- A compact desktop stream card may abbreviate the question or show its strike, but the complete
  question is available on focus/selection and always appears in the selected-market header.
  Strike, NoxLimit trading close, resolution time, current oracle price, YES/NO pool prices,
  liquidity, and lifecycle status remain easy to inspect.
- A market cannot be labeled `Live` if its pool is unseeded, its resolver is unverified, or trading
  has closed.
- The empty state explains whether filters removed all markets or the catalog has no live markets.
- Snap motion has an ordinary-scroll/reduced-motion alternative, cards expose their stream
  position, and keyboard/switch users can move explicitly to previous/next markets.
- Switching markets cannot silently discard an edited order draft. Public fields may remain only
  in volatile per-market state; the user confirms a dirty switch, and a confirmed market/account/
  chain switch clears the private maximum. Mobile dismissal/back/swipe uses the same keep-editing/
  discard protection, and the private value is never persisted.

### S3 — Understand what determines the outcome and what determines execution

As a trader, I want to see the underlying asset price beside the market's YES/NO prices, so I can
reason about the event without confusing the settlement oracle with the trading pool.

Acceptance criteria:

- The selected question is written in exact terms, for example: “Will BTC/USD be at or above
  $65,000 at 14:00 UTC?”
- The oracle chart is labeled as the underlying settlement reference.
- YES and NO prices are labeled as FPMM outcome-share quotes, not oracle prices or literal odds.
- The UI explains that the resolver chooses the winning outcome from the first valid price
  observation at or after resolution, while the FPMM quote determines whether a private limit can
  execute.
- Any stale oracle, unavailable quote, unresolved pool, or indexing delay is visible and disables
  unsafe actions where necessary.

### S4 — Preview real liquidity instead of fake market depth

As a trader, I want to see how the real pool quotes several trade sizes, so I understand likely
execution and price impact before creating an order.

Acceptance criteria:

- The quote ladder comes from real `calcBuyAmount` results for labeled collateral sizes.
- Each row can show input amount, expected shares, fee-inclusive average price, and price impact.
- The panel is labeled `AMM quotes` or `Liquidity`, never `Order book`, `Depth`, `Bids`, or `Asks`.
- Private resting orders never appear in the ladder.
- Only completed public fills may appear in recent activity.

### S5 — Compose a private maximum-price order

As a trader, I want to choose YES or NO, a public amount, a private maximum average price, and an
order expiry, so the product can buy only when the market reaches my acceptable price.

Acceptance criteria:

- Side is an explicit YES/NO control and amount is explicitly labeled public.
- Maximum price is visibly labeled private while resting and denominated per outcome share.
- The ticket shows a private preview of the derived minimum shares and minimum protected winning
  redemption if execution occurs exactly at the limit. A better fill can return more shares.
- The conversion uses exact integer arithmetic:
  `minOut = ceilDiv(amountIn × 1e18, maxAveragePriceWad)`.
- The expiry choices are separate from the market horizon and cannot extend beyond the NoxLimit
  order close.
- Invalid price, dust amount, insufficient balance, expired market, unavailable quote, or exhausted
  onboarding prerequisites block submission with a specific repair action.
- The current quote is informational; no UI claim implies that a limit order is guaranteed to
  execute.

### S6 — Encrypt, approve, and create the order with informed consent

As a trader, I want a clear transaction sequence, so I know what is being kept private, what is
public, and which wallet actions I am approving.

Acceptance criteria:

- The final quote is refreshed before encryption and signing.
- The maximum price is converted in browser memory and sent directly through the released Handle
  SDK to the official Nox Gateway confidential-input endpoint.
- The NoxLimit backend receives handles and public fields, never the raw maximum price; no NoxLimit
  route proxies the Gateway request.
- Collateral approval and order creation are shown as distinct wallet steps when both are needed.
- Before the final signature, the confirmation names the public fields: wallet, recipient, market,
  side, amount, and expiry.
- It also names the confidential field and caveat: the maximum price rests encrypted until public
  decryption is granted. At `Publication pending`, the candidate becomes publicly retrievable even
  if the later pool execution fails and the order becomes refundable.
- Rejection, dropped/replaced transaction, RPC failure, reverted creation, and retry states preserve
  user input when safe and never create duplicate proposals silently.

### S7 — Receive a durable order receipt

As a trader, I want immediate proof that my order exists and can be monitored without my browser,
so I can safely leave the app.

Acceptance criteria:

- A confirmed receipt shows the composite order reference, creation transaction, market, side,
  amount, order expiry, NoxLimit order close, and monitoring budget.
- Durable views show `Encrypted private limit` only in pre-publication `Resting privately` or
  `Evaluating` states. From `Publication pending` onward they show the publicly retrievable
  `Published minimum shares` and effective limit when available, including filled or
  disclosed-refundable history.
- The receipt says that the hosted evaluator continues after the browser closes.
- An explorer link points to the real transaction.
- The order appears in `My Orders` without requiring a page reload.

### S8 — Follow the background execution lifecycle

As a trader, I want plain-language status and remaining monitoring budget, so I understand whether
the system is waiting, checking, publishing, filled, or needs my action.

Acceptance criteria:

- Named states include `Resting privately`, `Evaluating`, `Publication pending`, `Expiry ready`,
  `Filled`, `Monitoring exhausted`, `Cancelled`, `Expired`, `Refundable`, `Refunded`, and
  failure/recovery variants where applicable.
- `Evaluating` and `Publication pending` are separate because their recovery and privacy
  consequences differ.
- Remaining checks, last check time, next eligible check, order expiry, and NoxLimit order close are shown
  without promising a fill-time SLA.
- A result-neutral timeout consumes the current check; the next evaluation uses a new nonce.
- `Monitoring exhausted` never appears as an indefinitely healthy open order. It offers the valid
  next action, normally cancel/refund or replace if time remains.
- Reopening the application reconstructs the same state from durable evidence.

### S9 — Cancel, expire, and reclaim safely

As a trader, I want to reclaim unused collateral when an order no longer can or should execute, so
funds are not stranded.

Acceptance criteria:

- An owner can cancel an eligible open, evaluating, or monitoring-exhausted order.
- The owner cannot cancel during `Publication pending`; the UI explains that publication has
  crossed an irreversible privacy boundary and resolution/recovery must complete.
- When the order expiry or NoxLimit trading close has passed but the permissionless state-advance
  transaction has not, the UI derives `Expiry ready` and offers `Expire order`.
- After that transaction confirms, the order is `Expired` and offers `Claim refund`.
- Cancelled, expired, and disclosed-refundable orders expose a separate `Claim refund` action.
- The balance is not shown as returned until the refund transaction confirms.
- Stale proofs or worker retries cannot revive a cancelled, expired, refunded, or otherwise
  terminal order.

### S10 — See the filled outcome-share position

As a trader, I want a successful order to become a real position, so I can understand its current
value and settlement path.

Acceptance criteria:

- A fill shows collateral spent, shares received, realized average price, outcome, transaction,
  and immutable recipient.
- Received shares equal the execution-specific balance delta forwarded from the adapter; existing
  adapter dust is never attributed to the user.
- If the position shows a current indicative FPMM reference value, it is explicitly non-executable
  because the first version has no sell/cash-out path. Eventual redemption value is separate.
- A winning share's terminal redemption value is one collateral unit and a losing share's is zero,
  subject to the displayed market terms.

### S11 — Resolve and redeem an objective market

As a position holder, I want the market to resolve from its documented oracle rule and then redeem
winning shares, so the journey ends in a real onchain outcome rather than a mocked result.

Acceptance criteria:

- Before resolution, the UI shows `Awaiting oracle observation` and the configured feed/resolver
  provenance.
- After the configured resolution time, a permissionless resolver transaction submits the required
  round evidence; the outcome is not presented as resolving automatically at the timestamp.
- Resolution identifies the accepted observation, timestamp, strike comparison, and winning side.
- The first chronological valid observation at or after the configured resolution time is used;
  a caller cannot choose a later favorable observation.
- Winning positions become `Redeemable`; losing positions are labeled resolved with zero payout.
- Redemption is a wallet-signed onchain transaction with a receipt and final collateral delta.

### S12 — Understand the privacy boundary without reading documentation

As a skeptical user, I want a concise explanation of what Nox protects and what remains
public, so I can evaluate the product honestly.

Acceptance criteria:

- Contextual copy beside the private field states:
  “Your maximum price is encrypted while the order rests—not invisible.”
- A details view states that wallet, market, side, amount, timing, evaluation metadata, and public
  pool quotes remain observable.
- It states that the fixed evaluator sees zero for an ineligible check and learns the exact derived
  limit for an eligible check. Granting public decryption ends the resting privacy phase: the
  candidate is publicly retrievable before pool execution, including if execution later fails.
- It explains the benefit in user terms: no plaintext limit at the app backend, no browser kept
  online, and atomic enforcement by the unchanged pool.
- It never describes Nox as anonymity or FHE.

## System and operator stories

### S13 — Publish only deterministic, real market bundles

As the curated-market operator, I want a versioned manifest assembled resolver-first, so the app
cannot accidentally show a placeholder or mismatched contract stack.

Acceptance criteria:

- Deployment order is settlement adapter/resolver → Conditional Tokens condition → seeded FPMM →
  market-bound OrderBook → committed catalog entry.
- Stable market content determines `marketId` and `questionId`; wall-clock deployment time does not.
- The catalog records chain, feed/resolver provenance, condition, pool, OrderBook, collateral,
  position IDs, strike, trading close, resolution, status, and deployment version.
- Retired instances remain traceable but cannot masquerade as the active bundle.

### S14 — Monitor within an explicit privacy/check budget

As the hosted evaluator, I want deterministic scheduling and restart recovery, so orders continue
without silently overspending their observable check budget.

Acceptance criteria:

- Checks may be triggered after creation, on material quote movement, or a conservative heartbeat,
  subject to the onchain minimum interval and remaining budget.
- Each evaluation creates and persists a nonce-distinct candidate.
- Failed eligibility remains privately decrypted and does not trigger result-specific onchain
  publication.
- In the honest path, the worker requests public decryption only after privately observing a
  nonzero candidate; permissionless finalization proves the value, and a zero publication recovers
  without a trade.
- Restarts reconstruct active orders, nonce, timeouts, budget, and receipt provenance before taking
  action.
- Publication timeout, zero proof, execution failure, and already-finalized retries each converge to
  a defined safe state.

## End-to-end product scenarios

### E1 — Private order in under 30 seconds of understanding

Given a funded wallet and a live Market Stream, when a first-time user discovers a real market,
selects YES, enters an amount and maximum price, chooses an expiry, sends the confidential input
directly to the Nox Gateway, and confirms the wallet steps, then a real encrypted order is created
and a durable receipt appears.
“Thirty seconds” describes comprehensibility and entry into the loop, not guaranteed TEE or block
latency.

### E2 — Browser-off execution

Given a resting order whose real FPMM quote later meets its encrypted bound, when the browser is
closed, then the honest hosted evaluator privately identifies a nonzero candidate, requests public
decryption, and any finalizer proves the result and completes one real atomic purchase. A malicious
or mistaken zero publication safely returns to a resting/exhausted state without trading.
Reopening the app after the normal path shows `Filled` and the resulting position.

### E3 — Objective outcome and redemption

Given a resolved market and winning shares, when the holder opens `Positions` and redeems, then the
real Conditional Tokens position is burned/redeemed and test collateral returns to the wallet with
a linked transaction receipt.

## Traceability

| Story group | Canonical architecture sections | Primary product surfaces |
|---|---|---|
| S1–S4 | Product Boundary; Market Stream and DeepBook-Informed Product Surface | Onboarding, Market Stream, terminal, chart, liquidity |
| S5–S7 | Price-to-`minOut`; Order Creation and Evaluation | Order ticket, transaction flow, receipt |
| S8–S10 | State Model; Replay, Race, and Failure Rules | Orders, status detail, positions, activity |
| S11 | Resolver and settlement adapters | Resolution detail, positions, redemption receipt |
| S12 | Public and Confidential Data | Privacy explainer, contextual disclosures |
| S13–S14 | Contract Topology; Hosted Worker | Catalog diagnostics, worker/read model |
| E1–E3 | Performance and Product Experience | Complete first-use and returning-user journey |
