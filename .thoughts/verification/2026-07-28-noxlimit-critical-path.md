# NoxLimit Prompt 3 Critical-Path Verification

**Date:** 2026-07-28
**Verdict:** **GO**
**Scope:** disposable hackathon verification, not a production security audit

## Bottom line

The architecture is no longer speculative at the local integration level. Released Nox
`0.2.4`/beta.13, the exact pinned Conditional Tokens/FPMM sources, real ERC-20 escrow, typed public
proof validation, native atomic `minOut`, ERC-1155 receipt/forwarding, permissionless finalization,
and refund failure paths execute together in one adapter. The strict clean suites report **16 Nox
and combined-adapter tests** plus **8 independent market/math tests**.

The final pre-polish technical gate now passes on Ethereum Sepolia. The live run deployed the actual
`NoxLimitOrderBook`, created encrypted orders through Handle beta.13, privately evaluated four
nonce-distinct candidates through Nox, kept the three earlier/withheld candidates non-public,
published only the successful candidate, and let an independent non-owner/non-worker finalize one
real FPMM buy. The terminal transaction is
[`0xbae857…88caa`](https://eth-sepolia.blockscout.com/tx/0xbae85703bb59878fa63838e03c1bc57cdcdc46f6e2f74ac701b38fc85d088caa);
the OrderBook is
[`0x5AfFd3…7d28`](https://eth-sepolia.blockscout.com/address/0x5AfFd32C5e8Fc0B61d99a1a7AAD505cCC4947d28).
An independent RPC re-query found all 33 recorded transactions successful.

Therefore:

- do **not** return to product discovery;
- treat the bounded hackathon critical path as technically verified at `GO`;
- preserve the testnet, TEE, worker-knowledge, and timing-inference caveats;
- stop for the user's polished-build checkpoint rather than reopening discovery or silently
  beginning the full product build.

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
| Released direct `encryptInput → fromExternal → allowThis` path | **Verified locally and live** | Four live application-bound encrypted evaluations completed through released Nox/Handle |
| Fixed worker viewer can privately decrypt; owner cannot | **Verified locally; worker path live** | Local ACL tests prove worker access and owner denial; the live fixed worker observed zero/nonzero candidates |
| False result requires no public proof or result-specific transaction | **Verified locally and live** | Two live zero candidates stayed private and reopened through neutral timeouts |
| Nonce-distinct candidates isolate ACLs and proofs | **Verified locally and live** | Four live handles were distinct; three remain private; cross-handle proof validation rejects |
| Typed `Nox.publicDecrypt(euint256, proof)` executes | **Verified locally and live** | The published success proof validated inside the actual OrderBook |
| Permissionless rescue after publication | **Verified locally and live** | The independent mover/rescuer retrieved the public proof and finalized once |
| Deadline, cancellation, expiry, cadence, and evaluation-count rules | **Verified locally** | Late/stale paths reject; configured cadence/count execute |
| Honest public-inference boundary | **Verified locally and live** | Two quiet live-pool checks, later success, and same-quote delayed-eligible control; normalized evaluation/timeout shapes match |
| Exact CTF/FPMM source and factory-created binary pool | **Verified locally and deployed live** | Byte-identical provenance locally; exact pinned factory/clone sources deployed and exercised on Sepolia |
| Independent FPMM quote and max-price conversion | **Verified locally** | Independent reserve/fee derivation and BigInt boundary/property suite |
| Atomic `minOut` protects escrow | **Successful bound propagation/satisfaction live; adverse bound verified locally** | The live fill enforced threshold `0.242385971402439537` and bought `0.265808343013365627` shares; excessive-bound rollback is covered locally |
| Actual adapter receives and forwards real ERC-1155 shares | **Verified locally and live** | Live recipient delta equals both fill events; adapter ends with zero shares/collateral/allowance |
| Nested pool/recipient failure persists `DisclosedRefundable` | **Verified locally** | Worsened pool, ordinary rejector, and oversized revert data all roll back; exact owner refund succeeds |
| Curated-market, callback, dust, and cross-order binding | **Verified locally** | Mismatched collateral/CT/condition and unsolicited real ERC-1155 transfer reject; simultaneous escrows stay isolated |
| Live Ethereum Sepolia Nox-authorized FPMM buy | **Verified** | Final receipt `0xbae857…88caa`, block `11,366,991`, status success |
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

Live Sepolia beta.13 encryption returned a 137-byte proof in 1.1–1.7 seconds, and the final run then
completed candidate computation, worker-private decrypt, success-only publication, public proof
recovery, typed application validation, and the external action. The recovery public decrypt took
`2,574 ms`; this is one observation, not an SLA.

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

## Live Gate C result

**Verified on Ethereum Sepolia.** The live execution:

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
9. wrote public addresses, parameters, and transaction hashes to
   `spike/nox/evidence/sepolia-gate-c.json` without writing the deployer key.

The exact live quotes were `0.198415803439706129`, `0.218963599791513448`, and
`0.265808343013365627` shares around a threshold of `0.242385971402439537`. The final FPMM bought
and forwarded `0.265808343013365627` outcome shares for `0.1` collateral. The order is `Filled`;
stored output and recipient delta match; adapter collateral, target shares, and pool allowance are
zero; pool deltas match FPMM math; and replay is rejected.

Two runner/preflight failures were preserved rather than misclassified. The first attempt supplied
a `20,000,000` deployment gas limit above Sepolia's `16,777,216` transaction cap and stopped before
broadcasting the OrderBook. The validated setup checkpoint was reused, and RPC estimation deployed
the OrderBook with `2,970,180` gas. The second process reached publication and public proof recovery
but the mover lacked Viem's padded `3,000,000`-gas upfront reservation. A public top-up completed
the same order; no contract, threshold, candidate, or pool was recreated. The durable runner now
uses gas estimation for deployment and pre-funds the independent finalizer before the terminal
call. The owner/deployer key was operationally used for those gas top-ups, but no owner protocol
authorization was required after order creation; the independent mover signed `finalize`.

### Independent post-run audit

Two read-only audits plus a separate RPC re-query found no Gate C contradiction:

- all 33 transaction hashes in the evidence have successful canonical receipts;
- the four OrderBook candidates match the live Nox `Select` events and are distinct;
- historical ACL reads show every candidate private at creation, worker-viewable, and not viewable
  by an unrelated address; only nonce 3 became public at publication;
- the final proof validates to exactly `242385971402439537`; the same proof against an earlier
  handle reverts;
- pre/post-block reads show `PublicationPending → Filled`, consumed result, exact recipient and pool
  deltas, zero adapter collateral/shares/allowance, and exact-calldata replay rejection;
- deployed OrderBook runtime is `12,781` bytes and all bound Nox/FPMM/CTF/collateral addresses have
  code.

The worker-private plaintext assertions and the two pre-broadcast/process interruption causes are
not independently derivable from public RPC alone. The artifact labels those as runner observations
and preserves the public transactions/state that followed. Private-decrypt timings were not
retained; no live private-decrypt latency claim is made.

## Verdict and next gate

Prompt 3 is **GO**. The bounded technical gate authorizes a polished build in principle, but the
repository stops here for the user's explicit build checkpoint. Objective BTC/USD resolution,
redemption in the finished UI, fresh-user gas onboarding, and the 30-second judge path remain
product-build/submission work, not retroactive Gate C failures. Production security, mainnet,
organic liquidity, decentralized workers, and SLA claims remain post-hackathon hardening.

Detailed reproduction and RED/GREEN evidence:

- [`../../spike/nox/EVIDENCE.md`](../../spike/nox/EVIDENCE.md)
- [`../../spike/market/EVIDENCE.md`](../../spike/market/EVIDENCE.md)
