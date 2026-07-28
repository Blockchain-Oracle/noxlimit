# Prompt 3 Nox and Combined-Adapter Evidence

Last run: **2026-07-28**

This directory is a disposable verification spike. It proves the released Nox path and a combined
Nox-authorized FPMM asset transition locally and on live Ethereum Sepolia. Prompt 3 is **GO**. This
is not a claim that the polished product, objective BTC/USD settlement, production security,
organic liquidity, or submission path is complete.

## Exact toolchain

- Node.js `22.22.3`
- pnpm `10.33.4`
- Docker/OrbStack server `29.4.0`
- Hardhat `3.9.0`
- Solidity `0.8.35`, optimizer enabled, 200 runs
- Solidity `0.5.17`, EVM target `istanbul`, for unchanged Gnosis sources
- `@iexec-nox/nox-protocol-contracts` `0.2.4`, npm gitHead
  `1a2ebd45e4af91797397961bcb0046fe1e5c1d03`
- `@iexec-nox/handle` `0.1.0-beta.13`, npm gitHead
  `e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0`
- `@iexec-nox/nox-hardhat-plugin` `0.1.0`, npm gitHead
  `080264eb8066f0bebdaa9bc882acf12e48c6ec31`
- Conditional Tokens `1.0.3`; FPMM `1.8.1`

The installed `Nox.sol` is byte-identical to the pinned v0.2.4 mirror. Its SHA-256 is:

```text
6379cbf2cb3dd16146a1b44663776837e356a1d263c8aeff6807ca4a66f50bda
```

## RED findings that changed the implementation

The spike preserved three useful failures rather than hiding them:

1. Before the harness existed, the released plugin started its real local services and Hardhat
   failed with `HHE1000 Artifact for contract "NoxLimitHarness" not found`.
2. The first curated-market constructor used an unbounded `staticcall` to prove there was no second
   FPMM condition. The old clone consumed the deployment gas on its out-of-bounds getter. Bounding
   that probe to `50,000` gas made the check executable without weakening it.
3. The first valid combined fill became `DisclosedRefundable` even though the pool quote was still
   valid. Cause: outer `try/catch` made a low-gas failed inner execution look successful to
   `eth_estimateGas`, so the sent transaction starved the self-call and caught its empty OOG
   revert. The adapter now requires a `1,650,000` gas floor and gives the inner action a fixed
   `1,500,000` gas budget while reserving `150,000` for the outer state transition. The same
   no-explicit-gas test then filled successfully.

Hardhat's Node test runner can also print `Test run failed` while exiting zero. `scripts/strict-test.mjs`
streams the real output and converts either that marker or a nonzero failing count into a nonzero
process exit.

## Reproduction

From `spike/nox`:

```bash
docker info
env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm install --frozen-lockfile
env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm hardhat clean
env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm compile
env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm build
env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm test
```

The final clean run compiled five Solidity `0.8.35` files and the pinned Gnosis graph at `0.5.17`,
then reported:

```text
NoxLimit released Nox path: 8 passing
NoxLimit combined Nox + FPMM adapter: 8 passing
16 passing (16 nodejs)
```

The optimized deployed sizes are:

| Contract | Runtime | Init code |
|---|---:|---:|
| `NoxLimitHarness` | 7,006 bytes | 7,393 bytes |
| `NoxLimitOrderBook` | 12,781 bytes | 14,861 bytes |

Both are below the 24,576-byte EIP-170 runtime limit, and the local network no longer enables
unlimited contract size. The final clean `NoxLimitOrderBook.sol` SHA-256 is
`7da1eb6f24c22b48cc33a34683e7be4816fdc957993d52c27fb1f2750e6087d4`; the regenerated artifact
JSON SHA-256 is `6f680b023ff10126100d41dcc19fd849f6b95795148e25d38ed6cc2511f44e6d`.

## Released Nox path proven locally

- SDK `encryptInput` and direct typed `Nox.fromExternal` bind owner and application.
- A proof encrypted for the correct application but submitted by the wrong owner is rejected.
- Reused input handles and wrong-application proofs are rejected.
- The encrypted threshold is persisted with `allowThis`.
- `freshZero = sub(publicNonce, publicNonce)` and `add(threshold, freshZero)` produce distinct
  candidate handles for identical private/public values across nonces.
- Only the fixed worker can privately decrypt the candidate or request publication.
- Candidate ACLs do not bleed between nonces; proof 1 fails against candidate 2.
- A zero candidate can remain private and reopen through a result-neutral timeout.
- A deliberately published zero safely reopens without an action.
- The released typed `Nox.publicDecrypt(candidate, proof)` path executes in both the harness and the
  actual adapter.
- Any account can retrieve a public proof and permissionlessly finalize; a repeat finalization is
  rejected.
- Stale, late-evaluation, late-publication, cancellation, and expiry races are rejected or routed
  terminally.

## Combined asset path proven locally

`NoxLimitOrderBook` hard-binds a single factory-created binary FPMM, Conditional Tokens instance,
collateral, condition, and two derived position IDs. The tests establish:

1. exact ERC-20 collateral escrow and immutable owner, recipient, side, amount, and expiry;
2. a real FPMM quote used inside the encrypted comparison;
3. worker-only private observation and publication, followed by non-worker proof submission;
4. native `FPMM.buy(amountIn, outcomeIndex, minOut)` enforcement;
5. strict ERC-1155 callback validation and forwarding of only the execution balance delta;
6. zero residual FPMM allowance, outcome dust, or adapter collateral after a fill;
7. a worsened real pool quote makes the nested buy revert while the outer call persists
   `DisclosedRefundable`, leaving all escrow owner-refundable;
8. a rejecting recipient rolls back the pool buy and preserves the same refund path;
9. cancellation and publication-timeout refunds return the exact escrow;
10. evaluation cadence and maximum-count bounds execute as configured;
11. two simultaneous escrows remain isolated when one expires/refunds and the other fills;
12. unsolicited real Conditional Tokens are rejected, preventing pre-existing outcome dust;
13. wrong collateral, Conditional Tokens, condition, and spoofed callbacks are rejected;
14. worsened-price and rejecting-recipient failures leave pool reserves, adapter balances, and
    allowance unchanged and emit no surviving `FPMMBuy`;
15. oversized recipient revert data cannot exhaust the outer refund-state transition.

## Public-inference measurement

The local real-pool experiment used a one-token target-side order and two opposite-side reserve
changes. The public quotes and private threshold were:

```text
q1        1.984158034397061298 shares
q2        2.189635997915134484 shares
threshold 2.423859714024395377 shares
q3        2.658083430133656270 shares
```

- `q1` and `q2` produced zero candidates and no public plaintext/proof.
- The opposite-side trades were actual FPMM buys, not quote mocks.
- A separate order at the same `q1` produced an eligible candidate, but the worker deliberately
  withheld publication. After normalizing order/nonce/handle/gas/time identifiers, its
  result-dependent event and timeout shape matched the false check, so silence did not
  deterministically disclose the result. Raw receipts were not asserted identical.
- Under the honest-worker inference model, the final `q2 < threshold <= q3` price range was about
  `0.080485997388797326` collateral/share wide, well above the configured `0.0001` UI tick.
- The worker learned `quote < minOut` from each zero candidate and learned the exact `minOut` from
  the eligible control and success candidate even before publication. The public learned the exact
  threshold only on successful publication. Product copy must preserve those caveats.

## Live preflight evidence obtained before the funded run

At block `11,365,008` on chain `11155111`:

- the public RPC returned live code at NoxCompute proxy
  `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF`;
- the Handle Gateway returned HTTP `200`;
- the Nox subgraph `_meta` block was `11,365,008`;
- beta.13 encrypted a live `uint256` input in `1,138 ms` and returned the expected 137-byte proof;
- a second run encrypted and successfully simulated live `validateInputProof` against the proxy in
  `1,660 ms`; the same proof with the wrong owner was rejected.

These facts were useful preflight evidence but were not treated as a substitute for the later mined
application trace.

## Live Ethereum Sepolia Gate C — GO

The bounded recovered Gate C trace finished at block `11,366,991` on chain `11155111`.

| Role or contract | Address |
|---|---|
| owner / recipient / initial LP | `0xA03D26E19ee4061A06a9a097010Bc06028Bba60A` |
| fixed worker | `0x393b05351089dE5BBF6c85A21d72FC370bb19a09` |
| independent control owner / mover / rescuer | `0xc160cE812cdDEe10CDe0BDE47a18396b2FcBbF6a` |
| live NoxCompute | `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF` |
| exact pinned FPMM clone | `0x1F27ab555663e7885fc0BABCc63a28539df717eB` |
| actual NoxLimitOrderBook | `0x5AfFd32C5e8Fc0B61d99a1a7AAD505cCC4947d28` |

The 0.1-collateral target order followed this real quote path:

```text
q1        0.198415803439706129 shares  -> private zero
control   0.198415803439706129 shares  -> eligible but publication withheld
q2        0.218963599791513448 shares  -> private zero
threshold 0.242385971402439537 shares
q3        0.265808343013365627 shares  -> eligible and published
```

The four candidate handles are nonce/order-distinct. At creation, none was public; the OrderBook
retained admin access and, among external role accounts, only the worker had viewer access. The
owner, mover, and unrelated account were not viewers. The first false, withheld-eligible control,
and second false candidates remain non-public after finalization; only the nonce-3 success candidate
became public. The same-`q1` false and withheld-eligible receipts have matching normalized
evaluation and timeout shapes, while raw receipts are honestly not claimed identical. The
interrupted runner asserted the
worker's private plaintext results before proceeding; those private-decrypt timings were lost when
the process later exited. The recovered public decrypt took `2,574 ms`, which is one observation,
not an SLA.

The worker published in transaction
[`0x1e9a6a…e2a7d`](https://eth-sepolia.blockscout.com/tx/0x1e9a6a7717d3c14024a1deb9c57bf7fc3a322be2cdf7417926bbdc2f429e2a7d).
The independent non-owner/non-worker mover then signed
[`finalize(1, 3, proof)`](https://eth-sepolia.blockscout.com/tx/0xbae85703bb59878fa63838e03c1bc57cdcdc46f6e2f74ac701b38fc85d088caa).
That receipt emitted exactly one OrderBook `Filled` and one bound-pool `FPMMBuy`:

- `minOut`: `242385971402439537`;
- outcome shares bought and forwarded: `265808343013365627`;
- recipient target-position delta: `265808343013365627`;
- adapter target shares, collateral escrow, and FPMM allowance after fill: all zero;
- pool collateral delta: `300000000000000`;
- pool position deltas: `+99700000000000000` and `-166108343013365627`;
- consumed result and terminal order status: `Filled`;
- exact-calldata replay: rejected.

Independent RPC audits verified all 33 recorded transaction receipts, historical/current Nox ACLs,
event emitters and arguments, contract bindings, pre/post state deltas, and replay behavior.

## Operational recovery disclosed

The live evidence is one continuous onchain state history recovered across three local processes,
not one uninterrupted CLI invocation:

1. The first process mined the real collateral, Conditional Tokens, FPMM factory/clone, condition,
   and 10/10 builder-seeded pool. It then supplied a `20,000,000` OrderBook deployment gas limit,
   above Sepolia's `16,777,216` transaction cap, so no OrderBook transaction was broadcast.
2. The checkpoint was reconstructed from the 11 successful public setup receipts and validated
   against code, roles, condition/position IDs, market bindings, and untouched reserves. Viem's
   live estimate then deployed the OrderBook using `2,970,180` gas.
3. The second process completed every confidential evaluation, publication, and public proof
   recovery, but the mover had insufficient ETH for Viem's padded explicit 3M-gas reservation.
   After target-order creation, the owner/deployer key's only further use was to fund mover gas
   twice (`0.005` ETH and
   `0.001034886706645132` ETH); no owner protocol authorization was required. The same independent
   mover then signed the terminal call, which used `363,532` gas.

Neither interruption was a contract revert or architecture contradiction. No order, candidate,
threshold, condition, or pool was recreated after it existed.

## Public artifacts and reproduction

- `evidence/sepolia-gate-c-setup.json` — public setup checkpoint and its 11 receipts;
- `evidence/sepolia-gate-c.json` — bounded public trace, recovery disclosure, transactions, and
  terminal assertions;
- `scripts/gate-c-sepolia.mjs` — fresh runner with guarded checkpoint reuse, deployment gas
  estimation, and a pre-funded finalizer gas reserve;
- `scripts/finish-gate-c-sepolia.mjs` — one-shot, deployment-bound recovery/finalization provenance
  preserved after the second interruption.

The final public evidence JSON SHA-256 is
`a3f15d7af84c797537a3909e74603ae3ff186405f6480a96f9f165bee12060a9`.

The generated deployer, worker, and mover keys remain only in gitignored mode-`0600` files and were
never printed or committed. Objective BTC/USD resolution is explicitly `false` in the live artifact
and remains polished-build work.
