# NoxLimit Product and Market Reality

**Date:** 2026-07-24
**Status:** Historical reality brief for the product direction selected on 2026-07-25
**Technical maturity:** `KEEP AND VERIFY`

Current authority:
[`../decisions/CURRENT.md`](../decisions/CURRENT.md) and
[`../architecture/2026-07-25-noxlimit-system-architecture.md`](../architecture/2026-07-25-noxlimit-system-architecture.md).

## Executive conclusion

NoxLimit is not a new prediction-market factory, exchange, wallet, confidential token, or
Polymarket router. The narrow product hypothesis is:

> A prediction-market trader escrows a fixed order size and leaves a confidential buy limit
> against a real onchain outcome-share AMM. A worker evaluates the encrypted threshold through Nox
> and, when eligible, a one-shot proof executes the real trade with an atomic minimum-output bound.

This was the first direction found after the docs-first `NONE SURVIVE` pass that had a plausible
self-serve product loop, current feature-supply signals, and a testable reason for Nox to exist. It
has since been selected as the current direction. Its originality and user loop are plausible; its
demand remains unvalidated and its live implementation is unproven. Use the canonical architecture
for technical design and do not start the polished build until the critical-path gate passes.

The scope-minimized candidate surface would be one curated BTC binary market, one public fixed-size
buy order, one public outcome side, and one confidential maximum price. Cancellation, expiry,
refund, real outcome-share receipt, resolution, and redemption are product requirements. A true
two-threshold stop-limit order, hidden side, hidden size, multiple markets, sell orders, partial
fills, a market factory, and LP tooling are extensions.

## The product in plain English

Consider:

> Will BTC be at or above $120,000 at the market deadline?

The market creates two redeemable assets:

- `YES`
- `NO`

One collateral unit backs one complete `YES + NO` set. Under the intended binary payout vector,
one whole winning position redeems for one collateral unit and the losing position redeems for
zero. This does not mean that `YES` and `NO` are each separately backed by one unit. Before
resolution, the assets trade.

An onchain outcome-share pool is an automated market maker that holds inventory of the outcome
assets and quotes every trade from its reserves. The pool, rather than a matching seller, is the
mechanical counterparty. Its liquidity providers economically bear inventory risk and earn the
configured fees. Buying `YES` changes the pool balances and raises the next `YES` quote. The
displayed price is a market-implied estimate, not a guaranteed probability.

A NoxLimit order could behave as follows:

1. `YES` costs about `0.64` collateral units per share.
2. Alice escrows a fixed `10` units of the designated test collateral.
3. Alice encrypts “buy `YES` at no more than `0.55` collateral units per share.”
4. The evaluation-request transaction samples the bound pool's fee-inclusive fixed-input quote:
   “How many `YES` shares would 10 collateral units buy in this block?”
5. A public worker asks Nox to compare that public quote with Alice's confidential limit.
6. A false result leaves the order pending.
7. For the product to be valid, a successful proof must bind a threshold-derived minimum-share
   amount to exactly one pool purchase.
8. The pool call includes Alice's threshold-derived minimum number of outcome shares. That
   threshold-equivalent value may become public when the proof/finalization transaction is
   submitted, before confirmation. The pool recomputes against current reserves. If the quote has
   worsened during Nox's asynchronous delay, the transaction reverts instead of violating Alice's
   limit.
9. Alice can later sell or redeem actual outcome shares using the underlying market protocol.

No order book or matching engine is required in this model. The pool must nevertheless be real,
funded onchain, and able to settle and redeem. Seeded testnet liquidity is real chain state, but it
is not evidence of organic market demand.

## Two prices that must not be confused

NoxLimit involves two independent price mechanisms:

1. **Prediction settlement price.** A BTC/USD oracle observation at the market deadline determines
   whether `YES` or `NO` wins.
2. **Outcome-share trading price.** The market AMM quote determines whether Alice's limit order is
   currently executable.

Chainlink BTC/USD can resolve the prediction event. It does not decide whether an order limit has
been reached. The AMM quote does that.

## Why this may be a real product

### Verified feature-supply signals

- [Gemini's prediction-market trading API](https://developer.gemini.com/prediction-markets-spec/trading)
  documents limit and stop-limit orders.
- [Kalshi Pro](https://news.kalshi.com/p/kalshi-pro-trading-terminal), announced on 2026-07-13,
  explicitly targets active event-contract traders managing open and resting orders.
- [Polymarket's CLOB documentation](https://docs.polymarket.com/trading/orders/overview) supports
  GTC and GTD resting limit orders.
- [Limitless](https://docs.limitless.exchange/) operates onchain prediction markets on Base.

These sources prove that prediction products invest in active-trading and advanced-order surfaces.
They do **not** prove usage of those features, demand for private onchain orders, or willingness to
accept Nox latency and extra transactions. Those remain research questions.

### The narrow user job

> “When I cannot watch a binary market continuously, buy a fixed amount for me if the odds reach my
> price, but do not publish that resting price before it can execute.”

This job is materially smaller than “build a better Polymarket.” It can be useful even with one
curated market if the order reliably executes while the browser is closed.

### What Nox protects—and what it does not

The proposed first version protects the order's threshold while the order rests. It does not hide:

- the wallet submitting the order;
- the application contract;
- transaction timing;
- a public market and outcome side;
- a fixed or public escrow amount;
- the eventual trade;
- resulting outcome-token holdings.

Post-fill behavior can reveal or strongly suggest the private intent. NoxLimit is therefore
pre-trade intent confidentiality, not anonymous trading, hidden positions, FHE, or invisibility.
The browser, Gateway TEE, and Runner TEE remain trust boundaries.

The independent audit must test whether repeated false evaluations, known public quotes, success
timing, cancellation, expiry, or the final minimum-output disclosure let an observer reconstruct
the threshold too early.

A decrypted `ready = true` boolean plus an ordinary unrelated slippage setting is not enough to
guarantee Alice's secret limit after an asynchronous delay. Exact semantics likely require the
proof to reveal a threshold-derived `minOutcomeTokensToBuy` at fill so the AMM can enforce it
atomically. If current Nox cannot produce and bind that value, or revealing it at fill is
unacceptable, the exact private-limit product has not been proven.

The economic limit should be defined as the maximum **fee-inclusive average collateral paid per
outcome share** for the fixed gross input. In consistently scaled integer units, the proof-bound
minimum output is the ceiling of `grossInput / maxAveragePrice`. The exact decimals, fee treatment,
and rounding direction must be proven against the pool's quote function. A marginal spot price or
UI probability is not equivalent.

If proof submission reveals the minimum output and the final pool call then reverts, funds can
remain safe while the threshold is already exposed. That order must not silently return to a
“confidential pending” state. It should become terminally disclosed and refundable, or require a
new encrypted order. Prefer proof verification, one-shot state consumption, and the AMM buy in the
same final transaction rather than persisting a public `executable` state.

## Current Nox boundary

### Verified from current released sources

- The released Handle SDK network configuration contains Ethereum Sepolia (`11155111`) and
  Arbitrum Sepolia (`421614`), not a public production mainnet:
  [`nox-handle-sdk` beta.13 network configuration](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/config/networks.ts).
- The released Ethereum Sepolia NoxCompute proxy is
  `0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf`; the released Arbitrum Sepolia proxy is
  `0xd464B198f06756a1d00be223634b85E0a731c229`.
- The current documentation shows the same two public deployments. Context7 was successfully
  refreshed on 2026-07-24 using `/iexec-nox/documentation`.
- `encryptInput` binds an encrypted value to the consuming application contract.
- `Nox.fromExternal` validates the input proof and converts the external handle into a typed
  confidential value.
- A handle needed across transactions must be stored and granted back to the application.
- `allowPublicDecryption` is irreversible. `publicDecrypt` returns a plaintext value and signed
  decryption proof for onchain verification.
- Computation and decryption are asynchronous. One observed live multi-operation Sepolia
  transaction resolved in about 12 seconds, but one observation is not a latency promise:
  [transaction](https://sepolia.etherscan.io/tx/0x401c94b8102df505f8ce5f0a05a15771276f6a9e527ac9b0e214007fb1953ef).
- A read-only 2026-07-24 check found code at both released proxies. The Arbitrum proxy implementation
  differed from the older repository deployment manifest, demonstrating live upgrade drift.
  Recheck the live Ethereum implementation and ABI before composing the product.

### Mainnet conclusion

No current official Nox production-mainnet deployment was found. Supplying custom gateway,
contract, or subgraph addresses does not create a supported mainnet network. A production
prediction venue on another chain cannot be composed atomically with Nox on Sepolia.

The honest product claim is:

> A live Ethereum Sepolia product using real Nox computation and real outcome shares, with a
> migration plan for a same-chain production deployment when official Nox mainnet support exists.

Do not say “mainnet-ready,” “works with Polymarket liquidity,” or “routes to production markets”
without new executable evidence.

## Candidate outcome-share substrates

These are comparison targets, not a selected architecture.

### Option A — Conditional Tokens plus Fixed Product Market Maker

Candidate source pins:

- [Gnosis Conditional Tokens, `eeefca66`](https://github.com/gnosis/conditional-tokens-contracts/tree/eeefca66eb46c800a9aaab88db2064a99026fde5),
  package `1.0.3`, Solidity `^0.5.1`, LGPL-3.0.
- [Gnosis Fixed Product Market Maker, `6814c024`](https://github.com/gnosis/conditional-tokens-market-makers/tree/6814c0247c745680bb13298d4f0dd7f5b574d0db),
  package `1.8.1`, Solidity `^0.5.1`, LGPL-3.0.

Why it is attractive:

- Conditional Tokens supplies complete-set outcome accounting and redemption.
- The FPMM is one pool per market, avoiding a matching engine and separate `YES` and `NO` DEX
  integrations.
- `buy(investmentAmount, outcomeIndex, minOutcomeTokensToBuy)` has the atomic minimum-output
  protection required after asynchronous Nox evaluation.
- The core lifecycle is small: prepare condition, seed funding, trade, report payouts, redeem.

Why it can still fail:

- It is an old Solidity and dependency stack.
- The Nox application side currently uses Solidity `0.8.x` while the pinned market sources require
  `0.5.1`; adapter calls are ordinary ABI calls, but self-deployment needs verified multi-compiler
  or pinned-artifact handling.
- No official Sepolia deployment manifest was found.
- The pinned `networks.json` files declare older production/test deployments, not Ethereum
  Sepolia.
- The exact pinned source must compile and deploy unchanged on current Sepolia.
- The adapter must solve custody correctly because the pool transfers outcome shares to its caller.
- Organizer acceptance of self-deploying unchanged protocol contracts is an inference until
  confirmed.

In the proposed composition, the user approves collateral to the order contract and the order
contract approves only the fixed pool. Because FPMM sends ERC-1155 outcome shares to `msg.sender`,
an adapter that calls `buy` receives them first. It must implement the ERC-1155 receiver interface
and atomically forward the exact shares to the immutable order recipient, or explicitly remain
custodian with owner-only withdrawal/redemption. The worker must receive no token approval or
withdrawal authority.

### Option B — Seer outcome tokens plus Uniswap V3

Candidate source pin:

- [Seer, `af50f523`](https://github.com/seer-pm/demo/tree/af50f523e6fd47bfc150f66b1db712ebd81d68d5),
  MIT, Solidity `0.8.20`, SDK `0.0.14`.

A preliminary read-only check at Ethereum Sepolia block `11,340,743` on 2026-07-24 found Seer
contracts including:

- MarketFactory: `0x221456ACFD185EE168052B3DA899939303775C7a`
- ConditionalTokens: `0x8bdC504dC3A05310059c1c67E0A2667309D27B93`
- Router: `0xdEB5dC052e55bf81C6d75CD47C961e0b280B3791`
- ConditionalRouter: `0x73f98977ba13ad71275ba5bBA0189E9dC2dc42B5`

The Sepolia factory returned 19 market clones in that check. Seer binary markets contain three
positions: `YES`, `NO`, and `INVALID`. Its fixed factory configuration uses RealityETH with a
302,400-second question timeout. A custom immediate Chainlink price resolver would be new
application/protocol work rather than an unchanged Seer integration.

[Official Uniswap V3 Sepolia deployments](https://developers.uniswap.org/docs/protocols/v3/deployments/v3-ethereum-deployments)
include:

- Factory: `0x0227628f3F023bb0B980b67D528571c95c6DaC1c`
- NonfungiblePositionManager: `0x1238536071E1c677A632429e3655c799b22cDA52`
- QuoterV2: `0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3`
- SwapRouter02: `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E`

Why it is attractive:

- Modern Solidity and an existing Sepolia market deployment.
- ERC-20 wrapped outcomes can use a current, familiar DEX.

Why it may be too large:

- Trading is external to the prediction protocol.
- Each wrapped outcome can require separate liquidity and introduce parity/arbitrage concerns.
- In a bounded 2026-07-24 sample, all six wrapped positions (`YES`, `NO`, and `INVALID`) across the
  first market (`0xb398fc521053818c2f13819E7af2D5C8B46723e1`) and last market
  (`0xeac39212aFa2213339ad42f7aAB4f87a48Bd69A3`) returned no Uniswap V3 pool at fee tiers
  100, 500, 3000, and 10000. This is evidence that no ready liquid pool was found for that sample,
  not exhaustive proof that no Seer Sepolia pool exists. The independent auditor must reproduce
  the query and preserve all six wrapper addresses and the observation block.
- Seer's public production configuration lists other networks, not Sepolia trading liquidity.
- Its current Uniswap subgraph/venue map has no Sepolia entry, so Sepolia pools, concentrated
  liquidity positions, and route handling would be application-owned work.

### Options that are currently poor fits

- **Polymarket CTF Exchange V2:** source is Polygon/Amoy-oriented, has a BSL-1.1 change date in 2030,
  and requires operator/matcher infrastructure.
- **CoW Protocol:** standard orders are ERC-20 based while raw Conditional Token outcomes are
  ERC-1155; wrappers, solver availability, and watchtower behavior expand scope.
- **1inch Limit Order Protocol:** no current Sepolia deployment was found, and resolver plus
  ERC-1155 incompatibility remain.
- **Uniswap range orders:** public and reversible; they do not implement a private durable
  conditional order.

The independent auditor must compare these options again. It must not assume FPMM merely because it
currently looks smallest.

## Oracle and automation reality

### Objective market resolution

The official Chainlink Ethereum Sepolia feed addresses include:

- BTC/USD: `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43`
- ETH/USD: `0x694AA1769357215DE4FAC081bf1f309aDC325306`

The BTC feed returned a live value in a preliminary 2026-07-24 read-only check. The independent
auditor must reproduce it with the block, round, answer, decimals, `updatedAt`, and configured
heartbeat. Deadline selection, stale-feed handling, who reports the payout, and permissionless
post-deadline resolution must all be specified and tested. This resolver shape fits an
application-owned Conditional Tokens oracle; it is not the unchanged Seer factory's RealityETH
lifecycle. Do not assume an equivalent SOL/USD feed without verification.

### Browser-off execution requirement

A contract cannot wake itself. At minimum, an external process must:

1. request or advance confidential evaluation;
2. wait for the asynchronous result;
3. retrieve or finalize a proof;
4. submit the proof-gated pool trade;
5. retry safely or leave the order cancellable when execution becomes stale.

The worker should be unable to alter the threshold, recipient, amount, or permitted action. Its
calls can be permissionless even if the initial implementation is application-hosted.

The worker can still delay or censor an order, and public-mempool ordering can consume favorable
price movement or sandwich execution up to the committed limit. The enforceable claim is that the
worker cannot fill worse than the committed limit or redirect proceeds—not that it always finds the
best available price.

[Chainlink Automation](https://docs.chain.link/chainlink-automation/overview/supported-networks)
displayed a v2.1 testnet sunset on 2026-06-24 and final sunset on 2026-07-31 when checked on
2026-07-24, overlapping the hackathon deadline. The independent auditor must recheck that mutable
notice. It is therefore not a safe default dependency. A small hosted worker is the current
implementation hypothesis; Gelato, CRE, or another service should be considered only after
verifying current support.

## Collision boundary

DarkOdds is not the product comparator that decides NoxLimit's value. Its implemented shape is
nevertheless important for truthful originality:

- DarkOdds created native Nox markets.
- The side was public and the wager amount was encrypted.
- Its market was pari-mutuel rather than a continuously traded outcome-share AMM.
- Its Polymarket connection was read-only display/discovery.
- It did not implement resting outcome-share limit orders, secondary AMM trading, or early exit.

NoxLimit should not waste scope trying to “beat DarkOdds.” The audit should instead search for
projects that already combine confidential triggers, automated execution, and real outcome shares,
including Iceberg, Veiled, DarkSwap, Wingman, zkConfide, wthelly, MiroShark, Shadow Orders, and any
new July 2026 WTF repository. Descriptions are claims until source and deployment prove them.

## Provisional product boundary

### Smallest complete first surface

- one curated BTC binary market;
- real collateral and sponsor-seeded outcome-share liquidity;
- public market identifier;
- public `YES` or `NO` side;
- fixed and public order size, such as `10` units of a named test collateral;
- one confidential maximum buy price or equivalent minimum-share threshold;
- one active order per wallet;
- cancel, expiry, refund, status, execution receipt, resolution, and redemption;
- application-hosted worker that continues after the browser closes;
- real Nox proof consumed exactly once by a real pool purchase.

### Explicit non-goals

- no general market factory;
- no CLOB or matching engine;
- no token factory;
- no wallet;
- no Polymarket trade routing;
- no hidden positions or anonymity claim;
- no sell orders, partial fills, leverage, portfolio dashboard, LP console, copy trading, or social
  layer in the first product;
- no unsupported mainnet claim;
- no mock pool, mock oracle, seeded result, or manually signed “proof.”

## Critical unknowns and kill gates

The hypothesis should be dropped or substantially reshaped if any central gate fails.

1. **Protocol gate:** exact unchanged Conditional Tokens/FPMM code cannot compile, deploy, seed,
   trade, resolve, and redeem cleanly on Sepolia.
2. **Nox gate:** the current released stack cannot execute
   `encrypt threshold → fromExternal → persist handle → compare with the fixed-input quote sampled
   in the evaluation-request transaction → reveal proof-bound minimum output → verify proof →
   consume once`.
3. **Atomicity gate:** the final trade cannot enforce Alice's limit again, allowing a stale Nox
   result to produce a worse fill.
4. **Custody gate:** escrow and adapter ownership cannot deliver the correct ERC-1155 shares and
   refunds without broad approvals or unsafe authority.
5. **Automation gate:** the order stops working when the browser closes or needs a human to advance
   it.
6. **Privacy gate:** public evaluation results let an observer learn the threshold materially
   before execution.
7. **Manipulation gate:** a small pool lets an attacker cheaply push the quote across the hidden
   threshold, force a fill, and reverse the manipulation profitably.
8. **Demand gate:** research shows that hiding a resting threshold is not valuable enough to offset
   Nox latency, extra transactions, and testnet-only operation.
9. **Tryability gate:** a new judge needs an external faucet, second wallet, manual contract call,
   or staged counterparty before experiencing the real action.
10. **Originality gate:** current source reveals an already-working product with substantially the
    same confidential trigger-to-outcome-share path.
11. **Rules gate:** the organizer rejects self-deploying unchanged open-source market contracts as
    a clean Nox integration.
12. **Deadline gate:** measured build scope, latency, or failure recovery cannot fit the remaining
    hackathon time.

## Evidence originally requested before selection

- Direct interviews, forum requests, or observable usage showing demand for private resting
  prediction-market intent, not only demand for prediction markets.
- Current source and deployment audit of all close competitors.
- Current package, ABI, and network verification against the live Nox deployment.
- An exact reproducible test of the candidate market substrate.
- Nox latency samples sufficient to report a distribution rather than one transaction.
- A fresh-wallet path that accounts for gas, collateral, approvals, encryption, waiting, and
  outcome-share receipt.
- Organizer clarification on unchanged protocol deployment and previous-project reuse.

Selection has since been made by the user. These items now distinguish technical verification and
post-hackathon validation; `KEEP AND VERIFY` does not mean “feasible,” “production-ready,” or
“winner.”
