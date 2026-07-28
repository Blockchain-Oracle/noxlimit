# Prompt 3 Nox and Combined-Adapter Evidence

Last run: **2026-07-28**

This directory is a disposable verification spike. It proves the released local Nox path and a
combined local Nox-authorized FPMM asset transition. It does **not** yet claim a live Ethereum
Sepolia Gate C transaction; the final live privacy trace and fill are blocked only on funding the
dedicated Sepolia-only signer.

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

## Live Ethereum Sepolia evidence obtained without a signer

At block `11,365,008` on chain `11155111`:

- the public RPC returned live code at NoxCompute proxy
  `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF`;
- the Handle Gateway returned HTTP `200`;
- the Nox subgraph `_meta` block was `11,365,008`;
- beta.13 encrypted a live `uint256` input in `1,138 ms` and returned the expected 137-byte proof;
- a second run encrypted and successfully simulated live `validateInputProof` against the proxy in
  `1,660 ms`; the same proof with the wrong owner was rejected.

These are live read/encryption/proof-validation facts, not a substitute for a mined application
transaction, candidate computation, private decrypt, publication, or FPMM buy.

## Remaining Gate C blocker

`scripts/gate-c-sepolia.mjs` is a fail-closed end-to-end runner. It clean-compiles the current
sources, deploys real test collateral, the exact pinned CTF/FPMM factory and clone, and the actual
OrderBook, then funds separate fixed-worker and independent mover/rescuer accounts. It performs a
false evaluation, a same-quote eligible-but-withheld control, a second false evaluation after a
real reserve-moving buy, and a successful third evaluation after another real buy. The worker
publishes; the non-owner/non-worker rescuer obtains the public proof and finalizes. The runner
asserts emitter-bound events, exact recipient/pool/adapter balance deltas, ACL isolation,
cross-handle proof rejection, replay rejection, and zero adapter allowance/dust. It writes only
public evidence to `evidence/sepolia-gate-c.json`; generated actor keys stay in gitignored
mode-`0600` files.

`pnpm gate-c:prepare` created a dedicated mode-`0600`, gitignored deployer without printing its
private key. Its public address is `0xA03D26E19ee4061A06a9a097010Bc06028Bba60A`. After a clean
local compile, the current preflight stops before any onchain mutation with:

```text
deployer 0xA03D26E19ee4061A06a9a097010Bc06028Bba60A needs at least 0.03 Sepolia ETH; current balance is 0
```

Fund that address with at least 0.03 **Sepolia ETH only** (the official Nox demo links the
[Google Cloud Ethereum Sepolia faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)),
then run:

```bash
pnpm gate-c:sepolia
```

The runner also supports an existing Sepolia-only key through gitignored `.env.local`, but no key
needs to be shared. Until the dedicated address is funded and the runner succeeds, Gate C remains
**Not verified**.
