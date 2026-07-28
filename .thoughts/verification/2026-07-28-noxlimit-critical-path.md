# NoxLimit Prompt 3 Critical-Path Verification

**Date:** 2026-07-28
**Verdict:** **CONDITIONAL GO**
**Scope:** disposable hackathon verification, not a production security audit

## Bottom line

The architecture is no longer speculative at the local integration level. Released Nox
`0.2.4`/beta.13, the exact pinned Conditional Tokens/FPMM sources, real ERC-20 escrow, typed public
proof validation, native atomic `minOut`, ERC-1155 receipt/forwarding, permissionless finalization,
and refund failure paths execute together in one adapter. The strict clean suites report **16 Nox
and combined-adapter tests** plus **8 independent market/math tests**.

The remaining pre-polish gate is the one the local environment cannot manufacture: a funded live
Ethereum Sepolia run that repeats the privacy trace and mines the actual adapter transaction. Live
Sepolia RPC, Nox proxy, Gateway, subgraph, SDK encryption, and input-proof validation were
independently rechecked and are healthy. No funded signer was available. A dedicated Sepolia-only
signer now exists locally in a mode-`0600`,
gitignored file, but its address
`0xA03D26E19ee4061A06a9a097010Bc06028Bba60A` has zero balance. After clean local compilation, the
fail-closed runner stops before onchain mutation on that balance check.

Therefore:

- do **not** return to product discovery;
- do **not** call the product fully verified or start the polished build yet;
- fund the dedicated address with at least 0.03 Sepolia ETH and run the prepared Gate C command;
- promote to `GO` only if its receipt and postconditions pass.

## Authority and reconciliation

The user selected NoxLimit, approved the canonical architecture on 2026-07-28, and authorized
Prompt 3. The historical independent `DROP` remains evidence, not workflow authority. The Opus 5
review was reconciled before implementation. Its valid findings—deadline enforcement, honest
privacy wording, worker-triggered disclosure, nonce/ACL isolation, and schedule discipline—were
incorporated. Its claimed released typed-API mismatch was rejected from source and is now also
contradicted by executable tests.

## Claim classification

| Claim | Classification | Executable evidence |
|---|---|---|
| Released direct `encryptInput → fromExternal → allowThis` path | **Verified locally; partially verified live** | Local Docker stack executes it; live beta.13 encryption and proxy `validateInputProof` simulation pass |
| Fixed worker viewer can privately decrypt; owner cannot | **Verified locally** | Candidate decrypt succeeds only through worker-scoped client |
| False result requires no public proof or result-specific transaction | **Verified locally** | Zero candidate remains private and reopens through neutral timeout |
| Nonce-distinct candidates isolate ACLs and proofs | **Verified locally** | Same threshold/quote yields distinct handles; old proof fails; later candidate is not already public |
| Typed `Nox.publicDecrypt(euint256, proof)` executes | **Verified locally** | Harness and actual OrderBook both use the released wrapper |
| Permissionless rescue after publication | **Verified locally** | Non-worker retrieves public proof and finalizes once |
| Deadline, cancellation, expiry, cadence, and evaluation-count rules | **Verified locally** | Late/stale paths reject; configured cadence/count execute |
| Honest public-inference boundary | **Verified locally; live trace pending** | Two quiet real-pool checks, later success, and same-quote delayed-eligible control; no false plaintext/proof |
| Exact CTF/FPMM source and factory-created binary pool | **Verified locally** | Byte-identical provenance, factory clone, split/seed/buy/resolve/redeem |
| Independent FPMM quote and max-price conversion | **Verified locally** | Independent reserve/fee derivation and BigInt boundary/property suite |
| Atomic `minOut` protects escrow | **Verified locally** | Excessive direct buy reverts; quote-crossed adapter finalization rolls back and refunds |
| Actual adapter receives and forwards real ERC-1155 shares | **Verified locally** | Filled order forwards exact delta; adapter ends with zero shares/collateral/allowance |
| Nested pool/recipient failure persists `DisclosedRefundable` | **Verified locally** | Worsened pool, ordinary rejector, and oversized revert data all roll back; exact owner refund succeeds |
| Curated-market, callback, dust, and cross-order binding | **Verified locally** | Mismatched collateral/CT/condition and unsolicited real ERC-1155 transfer reject; simultaneous escrows stay isolated |
| Live Ethereum Sepolia Nox-authorized FPMM buy | **Not verified** | Runner prepared; dedicated signer balance is zero |
| Objective BTC resolution | **Not verified / out of minimal Gate C** | Manual payout proves only local CTF plumbing; no no-mock settlement claim is made |
| Production security, mainnet, organic liquidity, SLA | **Not verified / post-hackathon** | Explicitly outside the hackathon gate |

## Gate A result

The released package path compiles and runs under Node `22.22.3`, Hardhat `3.9.0`, Solidity
`0.8.35`, Docker server `29.4.0`, Nox contracts `0.2.4`, Handle SDK beta.13, and plugin `0.1.0`.

Eight primitive-path tests plus eight combined tests establish owner/application binding, private
viewer ACL, zero/nonzero publication behavior, typed proof validation, permissionless rescue,
nonce-distinct candidate generation, cross-handle proof rejection, lifecycle deadlines, and
evaluation bounds. A worker-scoped Viem client is required in the local multi-account fixture
because beta.13 reads `getAddresses()[0]` for its acting viewer; explicit live wallet clients expose
only their own address.

The inference experiment used actual FPMM reserve-changing buys. Its quotes were
`1.984158034397061298`, `2.189635997915134484`, and `2.658083430133656270` shares around a private
threshold of `2.423859714024395377`. The two quiet checks emitted no public result or proof. A
separate eligible order deliberately timed out at the same first quote with the same normalized
result-dependent event and timeout shape, demonstrating that silence is not deterministic proof of
a false comparison. Raw receipts differ in identifiers, gas, and time and are not claimed
identical. Under an honest timely-publication assumption, the constructed final price bracket
remained roughly `0.080486` wide versus a configured `0.0001` tick. The worker learns
`quote < minOut` from a zero candidate and the exact `minOut` from any eligible candidate, even
before publication or when it withholds.

Live Sepolia beta.13 encryption returned a 137-byte proof in 1.1–1.7 seconds, live proof validation
against NoxCompute succeeded by `eth_call`, and wrong-owner validation failed. Live candidate
computation, worker decrypt, publication, and public proof remain part of Gate C.

## Gate B result

**Verified locally.** The suite uses exact CTF `1.0.3` and FPMM `1.8.1` source trees, which match
the pinned commits byte-for-byte. It proves factory clone creation, binding getters/events,
collateral split, balanced funding, independent fixed-input quote arithmetic including the 0.3%
fee, atomic excessive-`minOut` rejection, exact-bound fill, reserve deltas, real ERC-1155 receipt,
manual payout, and redemption.

The separate price helper uses only BigInt arithmetic:

`minOut = ceilDiv(grossAmountIn × 1e18, maximumAveragePriceWad)`

It is tested at exact/non-exact boundaries, 6- and 18-decimal units, tiny inputs, uint256 limits,
and multiple accepted-fill property vectors. Manual payout is not represented as objective BTC
resolution.

## Local combined adapter result

**Verified locally.** The actual `NoxLimitOrderBook` combines escrow, Nox evaluation, proof
consumption, and FPMM execution. A successful test starts from an owner-encrypted threshold and
ends with a real FPMM `buy`, the exact outcome-token delta at the immutable recipient, and zero
adapter collateral, position balance, and FPMM allowance.

Two implementation discoveries matter:

1. the FPMM clone's reverting out-of-bounds `conditionIds(1)` probe must be gas-bounded during
   constructor validation;
2. an outer `try/catch` can make `eth_estimateGas` accept too little gas because an inner OOG is
   caught as a normal execution failure. The adapter now enforces a pre-call floor, caps the inner
   execution gas, and reserves outer catch gas. A no-explicit-gas success test verifies the fix.

The expanded adversarial suite also proves exact expiry/refund with two simultaneous escrows,
unsolicited real-CTF dust rejection, complete pool/allowance rollback, and persistence of the
refund state against oversized revert data. Optimized OrderBook runtime is `12,781` bytes (init
code `14,861` bytes), below EIP-170 without an unlimited-size test bypass. The compiled source
SHA-256 is `7da1eb6f24c22b48cc33a34683e7be4816fdc957993d52c27fb1f2750e6087d4`.

## Exact remaining experiment

Fund `0xA03D26E19ee4061A06a9a097010Bc06028Bba60A` with at least 0.03 **Sepolia ETH only**, then from
`spike/nox` run:

```bash
pnpm gate-c:sepolia
```

The runner clean-compiles current sources, requires chain `11155111`, verifies live NoxCompute
code, and fails before onchain mutation when the key or minimum balance is absent. It then:

1. deploys builder-mintable test collateral, exact CTF, exact FPMM factory/master/clone, and the
   actual hard-bound OrderBook;
2. creates and funds one real binary pool;
3. creates and funds separate fixed-worker and independent market-mover/rescuer accounts;
4. escrows a target order plus a same-quote eligible control from different owners;
5. records a false and eligible-but-withheld evaluation at the same quote, then matches their
   normalized public evaluation and timeout shapes;
6. makes two real opposite-side FPMM buys and records a second quiet target check followed by a
   successful third check, including the honest-worker bracket and stronger worker knowledge;
7. stops the worker after publication, then has the non-owner/non-worker rescuer retrieve the
   public proof and permissionlessly finalize;
8. verifies emitter-bound `FPMMBuy`/`Filled` arguments, exact recipient and pool balance deltas,
   nonce-distinct candidates, earlier private ACLs, cross-handle proof rejection, zero adapter
   balances/allowance, and replay rejection;
9. writes public addresses, parameters, timings, and transaction hashes to
   `spike/nox/evidence/sepolia-gate-c.json` without writing the deployer key.

The deployer, generated worker, and mover/rescuer keys are kept only in gitignored mode-`0600`
files and are never printed. The runner currently exits before onchain mutation because the
deployer balance is zero. Its conservative balance preflight is `0.03` Sepolia ETH. An existing
Sepolia-only key can alternatively be supplied through gitignored `.env.local`; no key should be
posted in chat.

## Verdict rule

- If the runner produces a successful combined receipt and all postconditions pass: **GO**, stop
  for the user's polished-build checkpoint.
- If a released live Nox operation, proof, adapter deployment, or real buy contradicts the local
  result: **NO-GO**, record the exact transaction/error and stop.
- Until either outcome: **CONDITIONAL GO**, with only the funded live privacy trace + Gate C run
  outstanding.

Detailed reproduction and RED/GREEN evidence:

- [`../../spike/nox/EVIDENCE.md`](../../spike/nox/EVIDENCE.md)
- [`../../spike/market/EVIDENCE.md`](../../spike/market/EVIDENCE.md)
