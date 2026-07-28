# DeepBook Patterns for NoxLimit

**Date:** 2026-07-28
**Purpose:** Extract useful product, UX, and API patterns from DeepBook and the user's DeepBookie
repository without importing mechanics that would misrepresent NoxLimit.

## Bottom line

DeepBook is useful in two different ways:

- **DeepBook V3 Spot** is a real onchain central-limit order book (CLOB). It provides the visual
  and interaction grammar of a serious trading terminal: market discovery, order tickets, depth,
  open orders, fills, positions, and typed transaction builders.
- **DeepBook Predict** is an expiry-based digital-options/prediction primitive backed by a pool and
  vault. It provides useful market-catalog, horizon, position, quote, settlement, and API patterns.
  It is not a prediction-market CLOB.

NoxLimit should borrow the terminal grammar from Spot and the catalog/lifecycle grammar from
Predict. It must keep its own truthful mechanic: a confidential resting execution condition against
an unmodified outcome-share FPMM. It must not display a fake public order book.

## Evidence and provenance

### Official DeepBook

- DeepBook V3 overview: <https://docs.sui.io/onchain-finance/deepbook/deepbookv3/deepbook>
- Official source snapshot inspected at
  [`2e0a88f`](https://github.com/MystenLabs/deepbookv3/tree/2e0a88f860f1ae64f709b3978f1e206a91771169)
- Predict overview at that snapshot:
  <https://github.com/MystenLabs/deepbookv3/blob/2e0a88f860f1ae64f709b3978f1e206a91771169/packages/predict/docs/overview.md>
- Predict SDK at that snapshot:
  <https://github.com/MystenLabs/deepbookv3/blob/2e0a88f860f1ae64f709b3978f1e206a91771169/packages/predict/sdk/README.md>

The current mainline Predict source defines expiry markets, a registry, strike ticks, a vault
counterparty, oracle-based pricing/settlement, and several cadence constants. Its current testnet
configuration is narrower than the reusable design. That current configuration is evidence about
DeepBook, not a limit on NoxLimit.

### User's DeepBookie repository

The mature local worktree is
`/Users/abu/dev/hackathon/sui-overflow/deepbook-predict-agent`, from
[`Blockchain-Oracle/deepbookie`](https://github.com/Blockchain-Oracle/deepbookie), branch
`feat/docs-site`, commit `4b9e918`. The sibling `deepbook-predict-agent-spot` worktree is an older,
unfinished Spot-planning branch and is not evidence that a unified terminal shipped.

The local repository contains reusable product patterns for:

- market discovery and lifecycle filtering;
- a market-detail trading surface;
- quote previews immediately before signing;
- open-order, position, and redemption states;
- proposed/signing/signed/failed transaction receipts;
- a typed transport-neutral tool registry;
- server-executed reads with browser-built, wallet-signed writes;
- separate cached public, wallet-scoped, and trust-critical read paths.

The installed `deepbookie` skill still exposes the vocabulary, but its prediction-market reader
called a legacy `/oracles` endpoint and returned `404`. The live official service currently answers
on `/markets`. Therefore the skill is a product reference, not current integration authority.

## Patterns to transfer

### 1. A direct trading terminal

The primary experience should be a terminal, not a chat prompt:

```text
┌──────────────┬────────────────────────────────────┬───────────────────────┐
│ Market list  │ Selected market                    │ Private order ticket  │
│ BTC/ETH/SOL  │ Oracle + YES/NO price history      │ Side: YES / NO        │
│ 1h/4h/24h    │ Liquidity + AMM quote ladder       │ Public amount         │
│ live/status  │ Public fills/activity              │ Private maximum price │
│              │                                    │ Order expiry + submit │
├──────────────┴────────────────────────────────────┴───────────────────────┤
│ My Orders                 │ Positions                 │ Activity            │
└──────────────────────────────────────────────────────────────────────────┘
```

The central liquidity visualization is an **AMM quote ladder**, derived from real
`calcBuyAmount` calls for several public sizes. It may show average execution price, price impact,
and available pool liquidity. It must not use bids, asks, depth, price-time priority, or resting
confidential limits as if they formed a public CLOB.

### 2. A curated multi-market catalog

The product catalog should support three tracked assets and three market horizons:

- tracked assets: BTC/USD, ETH/USD, and SOL/USD;
- horizons: 1 hour, 4 hours, and 24 hours;
- sides: YES or NO for a stated strike at a stated resolution time.

These are all Ethereum Sepolia markets. “SOL” means the market resolves from a SOL/USD oracle; it
does not mean the order executes on Solana. Each listed market must correspond to a real deployed,
seeded market bundle. Empty placeholders must not be presented as live markets.

The market horizon and an individual order's expiry are different:

- the **market horizon** determines trading close and resolution time;
- the **order expiry** determines how long one trader wants the private order monitored.

Product presets may include 10 minutes, 30 minutes, 1 hour, and “until market close,” provided the
chosen expiry is before trading closes. A two-minute order is mechanically possible only if the
live Nox evaluation/publication path has enough headroom; it should not be the default.

### 3. Quote, build, sign, and recover

The best DeepBook SDK pattern is to keep reads and unsigned transaction construction separate from
wallet signing. NoxLimit should expose a small client surface:

```ts
type OrderRef = { chainId: number; orderBook: Address; orderId: bigint }

markets.list({ asset, horizon })
markets.get(marketId)
markets.quote({ marketId, side, amount })

orders.preparePrivateLimit({
  marketId,
  side,
  amount,
  maxPrice,
  expiresAt,
  clientRequestId,
})
orders.get(orderRef)
orders.list(address)
orders.cancel(orderRef)
orders.expire(orderRef)
orders.refund(orderRef)

positions.list(address)
positions.redeem(positionId)
```

`preparePrivateLimit` must encrypt the threshold in the browser against the wallet-bound Nox
application. The backend must never receive the raw maximum price. Reads may be served from an
indexed API, but the trust-critical pre-sign quote must be refreshed from the contract/pool and the
write must be signed by the user's wallet. Worker-only decrypt, evaluation, and publication methods
remain internal operations, not public trading tools.

The caller-provided request ID correlates retries and receipts before an order exists onchain; the
durable order identity is `(chainId, orderBook, orderId)`. `cancel` and `refund` remain separate
transactions, matching the contract lifecycle. Public statuses are strings rather than enum
ordinals, so client behavior cannot accidentally depend on the disposable harness's different enum
layout.

### 4. Durable order and transaction states

The UI should make the asynchronous Nox path legible:

- `Awaiting signature`
- `Resting privately`
- `Evaluating`
- `Publication pending`
- `Filled`
- `Monitoring exhausted`
- `Cancelled`
- `Expired`
- `Refundable`
- `Redeemable`

An order receipt should include its public market, side, amount, expiry, transaction hash, current
pool quote, last check, checks remaining, and cancel/refund/redeem action. The private threshold is
masked while resting and disclosed as part of a successful fill, consistent with the NoxLimit
privacy boundary.

## Mechanics not to transfer

- DeepBook Spot's matching engine, maker/taker queue, public depth, post-only orders, and
  price-time priority.
- DeepBook Predict's pricing model, shared vault/LP economics, range positions, or Sui-specific
  object/capability model.
- The unfinished DeepBookie Spot terminal as if it were shipped evidence.
- Chat-first transaction routing or server/local-key signing for user orders.
- A broad tool catalogue before the core market/order/position loop works.
- Sub-second or synchronous-fill expectations for an asynchronous Nox workflow.

## Oracle implications

Verified official Ethereum Sepolia Chainlink feeds exist for BTC/USD and ETH/USD. An official
Chainlink SOL/USD Ethereum Sepolia feed was not found in the inspected directory. Pyth publishes an
Ethereum Sepolia contract and SOL/USD price feed, including a historical-update retrieval path.

The canonical architecture should therefore use a generic settlement-price adapter:

- Chainlink round adapter for the already-supported BTC/USD and ETH/USD markets;
- Pyth historical-price adapter for SOL/USD only after the exact first-valid-update selection and
  onchain timestamp-window rules pass a dedicated live test.

This is not permission to advertise an unverified SOL market as live. It is the smallest truthful
route to the user's multi-asset product requirement.

Primary Pyth sources:

- EVM contract addresses: <https://docs.pyth.network/price-feeds/core/contract-addresses/evm>
- Historical price data: <https://docs.pyth.network/price-feeds/core/use-historical-price-data>
- Timestamp update API:
  <https://docs.pyth.network/api-reference/pyth-core/hermes/timestamp_price_updates>

## Resulting product decision

DeepBook does not justify replacing NoxLimit with a CLOB or generic prediction market. It does
justify upgrading NoxLimit from a one-market proof into a credible, multi-asset trading product:

> Browse real BTC, ETH, and verified SOL outcome markets; inspect real pool liquidity; place a
> wallet-signed private maximum-price order; leave the browser; return to a durable order or
> position; and redeem after objective resolution.

The architecture remains one curated single-market OrderBook deployment per market bundle. A
catalog and API compose those deployments into one product, avoiding a new generalized market
factory while still presenting multiple assets and horizons.
