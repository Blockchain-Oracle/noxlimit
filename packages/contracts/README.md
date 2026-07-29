# NoxLimit contracts

This package is the product contract workspace. Its initial baseline was copied byte-for-byte from
the verified `spike/nox` sources; the spike remains immutable historical evidence and is excluded
from the pnpm workspace.

## Historical baseline evidence

Recorded on 2026-07-28 under Node `22.22.3`, pnpm `10.33.4`, Hardhat `3.9.0`, Nox contracts
`0.2.4`, and the Nox Hardhat plugin `0.1.0`:

- `16 passing (16 nodejs)`: eight released-Nox tests and eight combined Nox/FPMM tests;
- `NoxLimitOrderBook.sol` SHA-256:
  `7da1eb6f24c22b48cc33a34683e7be4816fdc957993d52c27fb1f2750e6087d4`;
- optimized init code: `14,861` bytes;
- optimized runtime code: `12,781` bytes.

The initial contract, fixtures, and tests had matching SHA-256 hashes with their `spike/nox`
counterparts. That baseline remains reproducible in `spike/**`; the product package has since moved
through the authorized Phase 1 hardening and no longer claims byte identity with the spike.

## Phase 1 closure evidence

Recorded on 2026-07-28 with the same pinned runtime and compiler settings:

- the Phase 1 closure introduced its hardened OrderBook/FPMM behavior matrix; a later-phase
  timestamped package count is recorded separately below because later phases add tests without changing this
  historical evidence;
- failed collateral escrow rolls back Nox input use and the same encrypted input/proof succeeds on
  retry;
- the actual OrderBook rejects app-mismatched and owner-mismatched Nox proofs, rejects a reused
  valid handle with `InputAlreadyUsed`, and reaches `ResultAlreadyConsumed` through a derived
  test-only state-seeding harness with no production setter;
- every OrderBook integration uses a collateral token whose onchain `decimals()` value is `6`, and
  exact fill plus fractional `7.25` Test-USDC refund accounting passes;
- exact order-expiry cancellation resolves to `InvalidExpiry`; exact market-close cancellation
  resolves to `MarketClosed` before the equal order-expiry check;
- optimized `NoxLimitOrderBook` init code is `16,559` bytes and runtime code is `14,230` bytes,
  below the EIP-170 runtime limit.

`hardhat test --gas-stats` measured the following local simulated-network gas snapshot. These are
test evidence and sizing inputs, not Sepolia fee or latency promises.

| Operation | Minimum | Average | Maximum |
|---|---:|---:|---:|
| deployment | 3,267,864 | 3,267,889 | 3,267,900 |
| `createOrder` | 233,640 | 247,723 | 260,328 |
| `requestEvaluation` | 246,936 | 246,971 | 247,154 |
| `requestPublication` | 72,866 | 72,866 | 72,866 |
| `finalize` | 45,633 | 276,100 | 472,438 |
| `cancel` | 32,992 | 33,586 | 35,961 |
| `expireEvaluation` | 33,733 | 33,760 | 33,856 |
| `expireOrder` | 31,200 | 31,200 | 31,200 |
| `expirePublication` | 33,622 | 33,622 | 33,622 |
| `refund` | 57,611 | 64,600 | 71,561 |

## Phase 2 market-foundation evidence

The retained 2026-07-29 pre-hardening package snapshot passed `44/44`. This is timestamped
historical evidence; the current post-hardening count is recorded below. The resolver-first
foundation tests prove:

- first-observation selection within a Chainlink phase and across an adjacent proxy phase;
- rejection of skipped rounds and a cross-phase predecessor that is not the prior phase's terminal
  round;
- early resolution, invalid observations, observations outside the accepted delay, and zero or
  overflowing normalized WAD prices fail with their intended custom errors;
- 8- and 20-decimal feeds normalize exactly, equality at the strike resolves `YES`, payouts are
  reported to real Conditional Tokens, and a second resolution is rejected;
- the production-shaped collateral reports six decimals and preserves exact mint, transfer,
  allowance, and fractional-unit accounting;
- funding signatures use the recipient, nonce, deadline, chain, and treasury EIP-712 domain;
  executable tests reject replay, expiry, and a wrong signer;
- treasury-low partial fulfillment is recorded honestly, a later claim is explicit and subject to
  cooldown, and native/collateral refills stop independently at their lifetime caps.

The environment-driven operator provides plan, deploy, verify, objective-resolve, and
LP-close/redeem paths against the catalog schema. Planning is the no-write default; network writes
require the explicit operator network plus an action-specific confirmation value. First deployment
creates the shared user funding treasury; later bundles reuse it. See
[OPERATOR.md](./OPERATOR.md) and the key-free `operator.env.example`. The tooling does not publish
hardcoded placeholder addresses as deployment evidence.

## Post-hardening operator evidence

The fresh 2026-07-29 12:08Z package snapshot passes `77` contract tests. Together with the workspace
verification it records protocol `14`, catalog `6`, service `65`, and web `61` passing (`223`
package tests total), with root compile/type-check/test/build green. The fresh dedicated
Playwright snapshot records `45` passing, `21` intentional project/viewport skips, and zero
failures; rerun it at the submission commit.

The deployment path is locally hardened around a resumable journal:

- it creates or resumes the journal before the first chain write and freezes the exact plan hash,
  operator, Sepolia chain, absolute catalog/evidence paths, ordered expected steps, and funding
  plan;
- a cross-process lock permits one journal writer, and each step advances through
  `INTENT → SUBMITTED → CONFIRMED`;
- submitted and confirmed transactions resume without blind replacement. A bare intent fails
  closed until an explicit per-step `ADOPT` with its exact transaction hash or `RETRY` is supplied;
  either action must match `expectedAttempt`;
- JSON validation rejects secret-bearing fields. Final payloads are staged and hash-checked before
  create-only evidence/catalog output, and a crash between output writes resumes idempotently;
- market duration must match its declared `1h`, `4h`, or `24h` horizon exactly, and its question
  must match the canonical asset/strike/resolution-UTC string;
- a reused NLTUSDC deployment must have the expected code, metadata, six decimals, and operator
  issuer. The deployer mints only the exact pool-seed/funding-treasury shortfall frozen in the
  journal.

## Live Phase 6 operator evidence

The operator guarantees above have now been exercised on branch
`codex/noxlimit-polished-product`. Paired cutover commit `c073643` publishes catalog revision `5` at
[`../catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json`](../catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json),
with catalog hash `0x8aa65b0b5a91025ed1fd0e1487b9c9058b44ca05889632e9f85baf3bb3885899`.
The original BTC/ETH 4h bundles are `RETIRED` and both verified successors are `ACTIVE`.

Three committed browser-off traces prove direct-Gateway order creation and real FPMM fills on the
original bundles. The earlier BTC/ETH liquidity-close artifacts prove builder LP removal after
NoxLimit close and honestly record the unresolved state at that step. BTC then completed objective
browser resolution plus winning-user redemption in
[`../../.thoughts/evidence/2026-07-29-phase6-btc-resolution-redemption.json`](../../.thoughts/evidence/2026-07-29-phase6-btc-resolution-redemption.json),
and builder-LP redemption in
[`../../.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-liquidity-redemption.json`](../../.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-liquidity-redemption.json),
transaction `0x706c0c6f38518a8cd536eb4b177939a642434979153f5ee9c62f105f186c3f0c`,
receipt block `11375232`.

ETH is a terminal immutable-policy rejection, not `WAITING`. Its unique first post-deadline
observation arrived after 3,624 seconds, 24 seconds outside the deployed 3,600-second bound. The
accountless selector rejected before any write; resolver settlement fields and the payout remain
unset, so ETH user/LP positions are unredeemable. Evidence is
[`../../.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-resolution-policy-rejection.json`](../../.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-resolution-policy-rejection.json).
Do not select a later round or claim an ETH winner.

The operator now rejects future official Sepolia BTC/ETH deployments with an observation-delay
value below 14,400 seconds while preserving unique first-observation adjacency. Runtime quote
freshness remains independently 3,600 seconds. Both active revision-5 successors predate the guard
and retain the known one-hour liveness risk. The exercised service reported `READY`, and local
service/web container build/smoke passes, but no public service/frontend URL is verified.

## Commands

From the repository root, after selecting the Node version in `.nvmrc`:

```bash
pnpm compile
pnpm typecheck
pnpm test
(cd packages/contracts && pnpm exec hardhat test --gas-stats)
# Safe, read-only operator default:
pnpm --filter @noxlimit/contracts operator
```

The test wrapper rejects Hardhat's misleading zero-exit failure mode and also rejects a zero-test
run.
