# Candidate: NoxLimit

**Date:** 2026-07-24
**Selection status:** Historical hypothesis adopted as the current product direction on 2026-07-25
**Technical maturity:** `KEEP AND VERIFY`
**Next gate:** User review of the canonical architecture, then bounded Prompt 3 verification

Current authority:
[`../decisions/CURRENT.md`](../decisions/CURRENT.md) and
[`../architecture/2026-07-25-noxlimit-system-architecture.md`](../architecture/2026-07-25-noxlimit-system-architecture.md).
This file preserves the product hypothesis and should not be used to reopen selection.

## One-line product

NoxLimit aims to let an active prediction-market trader leave a confidential fixed-size limit
order against a real onchain outcome-share pool, close the browser, and have an external worker
advance a proof-gated trade while the price condition remains hidden at rest.

## Exact user and problem

The initial user is a trader who already understands binary event contracts but cannot monitor
their market continuously.

Alternatives available to that trader include:

- publish a resting limit to an order book;
- store an automation trigger with an application bot or backend;
- operate an always-on local bot;
- use private transaction or threshold-encryption infrastructure;
- use another TEE or confidential-computation service;
- use a public range or conditional order;
- keep the browser open and trade manually;
- trust a centralized venue to keep the trigger private.

The audit must determine the exact visibility, trust, availability, cost, and execution guarantees
of each alternative. It must not assume that they are inadequate.

NoxLimit's proposed job is:

> “Buy a fixed amount of this outcome if its real executable quote reaches my price. Keep my price
> confidential while the order rests, tell me when a finalization attempt may disclose it, continue
> when my browser is closed, never fill worse than my limit, and let me cancel or recover my
> funds.”

## Why this is not a generic prediction market

The market protocol creates, trades, resolves, and redeems outcome shares. NoxLimit adds one missing
order-management surface. It does not create a general market factory, new exchange, token, wallet,
or liquidity protocol.

DarkOdds is not the same product: it implemented native pari-mutuel markets with encrypted wager
amounts. NoxLimit's proposed state transition is a confidential resting threshold causing a
secondary outcome-share AMM trade. That distinction must still be independently verified against
current source and other competitors.

## Smallest product hypothesis

One application-curated binary market:

> Will BTC/USD be at or above a fixed strike at a fixed UTC deadline?

One order mode:

> Spend a fixed public amount to buy public `YES` or `NO` shares when the exact AMM quote is at or
> below a confidential maximum price.

Required states:

- draft;
- encrypting;
- submitted and escrowed;
- waiting for evaluation;
- pending because the limit is not met;
- proof ready offchain, without a persistent public `executable` state;
- finalizing proof verification, one-shot state consumption, and pool buy atomically;
- filled;
- disclosed after a reverted finalization and refundable;
- cancelled;
- expired and refundable;
- execution failed safely because the quote moved;
- resolved;
- redeemed.

Required user actions:

- understand the market and pool quote;
- receive or acquire the real test collateral and gas through the product path;
- choose a public side;
- enter a private limit;
- approve and escrow one fixed amount;
- submit one encrypted order;
- close the browser if desired;
- see independent onchain proof of a real fill;
- cancel/refund if it does not fill;
- redeem a winning share after objective resolution.

## Provisional public/private boundary

### Public

- owner wallet;
- application;
- market;
- outcome side;
- fixed order size and escrow;
- submission and evaluation timing;
- likely a threshold-equivalent minimum-output value exposed by a submitted finalization, even if
  that transaction later reverts;
- eventual fill, outcome assets, resolution, and redemption.

### Confidential while resting

- maximum buy price, represented in the contract as an exact minimum number of outcome shares for
  the fixed input amount or another mathematically equivalent integer threshold.

This is intentionally narrow. Hidden side and hidden size would improve privacy but expand
confidential state, funding ambiguity, quote evaluation, leakage analysis, and UI complexity.

## Why Nox may be indispensable

The proposed confidential transition is:

`encrypt limit → validate for order contract → persist encrypted threshold → compare against real
quote → reveal minimal executable authorization → verify proof → consume it once → execute pool
buy`

Nox could avoid publishing the threshold or giving plaintext to the application operator while
preserving onchain proof composition. That is a plausible role, not proof of indispensability.
The audit must compare it with an application server, user-operated always-on bot, private
transaction system, threshold-encryption service, alternative TEE, and ordinary public limit. It
must identify which user outcome, trust boundary, liveness property, or composability guarantee
only the current Nox design preserves.

## Real outcome-share pool

For a binary question, the underlying protocol produces `YES` and `NO` shares backed by collateral.
At resolution, a winning share redeems one unit and a losing share redeems zero. Before resolution,
an AMM holds shares and quotes a buy based on its reserves.

The AMM is the counterparty, so NoxLimit does not need a matching seller or central limit-order
book. A sponsor must seed genuine onchain liquidity. The first candidate is the unchanged Gnosis
Conditional Tokens plus Fixed Product Market Maker stack; Seer outcomes plus Uniswap V3 is an
alternative that the independent audit must compare.

See
[`2026-07-24-noxlimit-product-and-market-reality.md`](../research/2026-07-24-noxlimit-product-and-market-reality.md)
for sources, deployments, and known trade-offs.

## Limit order versus stop-limit order

The recommended first order is a private **buy limit**:

> “Buy `YES` only if my fixed input receives at least this many shares.”

A true **stop-limit** has two conditions:

- a stop trigger activates the order;
- a separate limit prevents a worse fill.

That adds a separate activation threshold—which may itself be public or encrypted—and another state
transition. It is a credible extension only after the single-threshold limit order works. Marketing
the first version as “stop-limit” would be incorrect.

## Non-negotiable product guarantees

- The user's limit is the maximum fee-inclusive average collateral paid per share for the fixed
  gross input. In consistently scaled integer units, `minOut = ceil(grossInput / maxAveragePrice)`;
  decimals, fees, and rounding must match the pool exactly.
- The quote used for evaluation is the exact quote for the fixed input amount, not a reserve ratio
  presented as a price. More precisely, it is the fee-inclusive fixed-input quote sampled from the
  bound pool in the evaluation-request transaction; it will be stale by the time Nox finishes.
- The final AMM call enforces a minimum output derived from the user's private limit—not a separate
  generic slippage setting. A proof based on an old quote cannot force a bad fill.
- A proof authorizes one order and one action only; replay fails.
- A worker can advance the order but cannot change the owner, market, side, amount, limit, or
  recipient.
- Cancellation, expiry, execution, and refund races cannot double-spend.
- A browser may be closed after submission.
- A failed or stale execution leaves funds safe and the order recoverable.
- The product never calls seeded data, a mock oracle, or a manually staged result “live.”
- The privacy copy names the exact metadata and post-fill leakage that remain.
- A reverted finalization after threshold-equivalent disclosure leaves the order disclosed and
  refundable; it does not pretend to become confidential again.
- The order adapter, not the worker, receives FPMM's ERC-1155 shares as `msg.sender`, implements the
  receiver interface, and forwards them atomically to the immutable recipient or exposes an
  explicit owner-only custody path. The worker has no token approval or withdrawal authority.
- The worker may delay or censor, but it cannot fill worse than the committed limit or redirect
  proceeds.

## What must be measured

- Nox evaluation time across enough runs for at least P50 and P95;
- total time and transaction count from fresh user to submitted order;
- time from an eligible quote to a confirmed fill;
- gas for submit, evaluate, execute, cancel, resolve, and redeem;
- pool depth and cost to move the quote by 1%, 5%, and 10%;
- execution failures caused by quote movement;
- information leaked by false evaluations;
- worker retry behavior with the browser off;
- collateral and gas acquisition friction.

“Try in 30 seconds” is a comprehension and onboarding target, not a promise that asynchronous Nox
evaluation and trade confirmation always finish in 30 seconds.

## Hard gates

These were the original selection gates. Selection is now a user decision recorded in `CURRENT.md`;
the unresolved technical items below route into the bounded critical-path verification rather than
another broad selection audit:

1. current rules and originality;
2. evidence for the user problem and privacy-specific value;
3. a compatible same-chain market substrate;
4. a current released Nox proof path;
5. safe stale-quote handling;
6. honest and useful privacy after leakage analysis;
7. browser-off automation;
8. safe escrow, custody, cancel, expiry, and refund behavior;
9. real objective resolution and redemption;
10. a fresh-judge journey with no second wallet, local setup, or external faucet hunt;
11. one-builder scope before the deadline.

The allowed audit verdicts are:

- `KEEP`: preserve the product and proceed to a bounded critical-path spike;
- `RESHAPE`: retain the user problem but change product or substrate, then re-audit;
- `DROP`: reject NoxLimit;
- `NONE SURVIVE`: reject it and any adjacent alternatives found in the audit.

No technical verdict should be biased toward preserving work already done, but it must apply the
current hackathon gate and cannot silently reverse the user's product selection.
