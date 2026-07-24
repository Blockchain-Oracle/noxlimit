# Reassessment of the NoxLimit `DROP` Verdict

**Date:** 2026-07-24

**Scope:** Re-audit the decisive claims in
[`2026-07-24-noxlimit-independent-audit.md`](./2026-07-24-noxlimit-independent-audit.md)
under the actual WTF hackathon standard.

**Decision effect:** The hard `DROP` is not supported. Restore NoxLimit to **`KEEP AND VERIFY`** as
an unselected candidate and authorize only a bounded critical-path spike.

## 1. Correct standard

This is an eight-day hackathon product. That does **not** permit mocks, fake execution, broken
contracts, or a slide-deck-only demo. It also does **not** require production-mainnet maturity,
audited economics, a decentralized keeper network, formal verification, organic liquidity, or a
statistically defensible production SLA before the idea may survive.

The correct split is:

### Product-invalidating or demo-breaking

- the released Nox flow cannot keep the submitted threshold out of the application operator's
  plaintext storage;
- every failed evaluation must be publicly decrypted, materially exposing the threshold before
  execution;
- the proof is not bound to one order and cannot safely cause one real trade;
- the worker can redirect funds, change the immutable order, replay a fill, or fill worse than the
  committed limit;
- the market, quote, Nox computation, trade, outcome shares, resolution, or redemption is mocked;
- the real Ethereum Sepolia path cannot be completed reliably by a judge.

### Post-hackathon hardening

- a professional audit and formal verification;
- production-mainnet deployment;
- organic liquidity and production LP economics;
- full manipulation-cost modelling or a production oracle/TWAP design;
- decentralized or redundant keepers;
- P50/P95 latency from a large sample;
- multiple markets, sells, partial fills, hidden side/size, and advanced order combinations;
- a production regulatory or market-operator launch plan.

A builder-seeded pool is acceptable only when it is a real onchain AMM with real state changes and
is described honestly. It is not acceptable to present seeded liquidity as organic adoption.

## 2. Revised verdict

# `KEEP AND VERIFY` — unselected hackathon candidate

This is not a product selection and not permission for a full implementation. It means the prior
audit's two hard vetoes and its decisive privacy-leakage claim do not withstand rechecking:

1. the evidence shows **privacy-specific demand is unvalidated**, not absent;
2. an ordinary backend can reproduce browser-off, same-chain, contract-custodied execution and the
   atomic fill, but it must receive or decrypt the raw threshold;
3. the released Nox stack has a plausible viewer path, so failed comparisons do not inherently
   need explicit public proofs, although timing/non-action inference remains;
4. prediction markets carry a serious originality burden, but are not rule-barred.

NoxLimit should survive only long enough to run the smallest experiments that can prove or kill
those claims. A failed live privacy path or a failed real-pool path returns the verdict to `DROP`.

## 3. Material corrections to the independent audit

### 3.1 Demand: `UNKNOWN`, not falsified

The independent audit did not contain trader interviews, support requests, issue threads, or other
evidence sufficient to conclude that few users want the feature. It found no direct validation that
traders will accept Nox latency and trust boundaries to hide only a fixed-size order's resting
threshold. That is a real product risk, but absence of that evidence is not evidence of no demand.

There is adjacent but limited positive evidence:

- prediction venues ship hands-off conditional and limit execution, proving demand for the workflow
  but not for Nox privacy;
- transparent onchain activity creates strategy-copying and front-running concerns, although much
  of the cited copy-trading evidence concerns post-fill activity that NoxLimit does not hide;
- broader private-trading products suggest that pre-trade intent can be valuable to conceal, but
  do not demonstrate demand for hiding only this threshold.

None of this proves product-market fit. The honest score is **plausible but unvalidated**, roughly
2–3/5. Use organizer feedback to test sponsor fit and a few targeted trader conversations to test
demand, without blocking the short technical spike.

### 3.2 The cited substitutes were misstated

- [Kalshi Pro](https://news.kalshi.com/p/kalshi-pro-trading-terminal) places the cited
  take-profit/stop-loss interface under perpetual futures, not its prediction-market order flow.
- [Robinhood event contracts](https://robinhood.com/us/en/support/articles/trading-event-contracts/)
  document IOC and GTD limit orders, not hidden stop or take-profit triggers.
- [Gemini Prediction Markets](https://developer.gemini.com/prediction-markets-spec/trading) is a
  valid centralized stop-limit comparison, but the venue still receives the trigger.

A centralized venue changes custody, eligibility, assets, settlement, and composability. An
application backend can preserve browser-off, same-chain, contract-custodied execution and atomic
`minOut`, but it must receive or decrypt the threshold and can leak, censor, or misuse it. A local
bot can preserve threshold privacy but requires an always-on process and a gas-paying signing path;
that key need not control the escrowed funds.

That narrower distinction does not prove users care enough. It does show that
“ordinary-backend equivalence” is not established as a hard veto.

### 3.3 Failed evaluations do not inherently require public decryption

The released source pins in
[`../sources/source-manifest.md`](../sources/source-manifest.md) provide the necessary primitives:

- `nox-protocol-contracts` v0.2.4
  [`Nox.select(ebool,euint256,euint256)`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/sdk/Nox.sol#L501-L513);
- `Nox.toEuint256(0)`;
- [`Nox.allowThis(euint256)`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/sdk/Nox.sol#L901-L907);
- [`Nox.addViewer(euint256,address)`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/sdk/Nox.sol#L1057-L1061);
- protocol
  [`allowPublicDecryption`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/modules/ACL.sol#L87-L112);
- Handle SDK beta.13
  [`decrypt(handle)`](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/methods/decrypt.ts#L37-L75),
  which checks `isViewer` and privately decrypts for an authorized address;
- the separate Handle SDK
  [`publicDecrypt(handle)`](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/methods/publicDecrypt.ts#L37-L75)
  proof path.

A plausible released-API flow is:

1. at direct wallet-to-application order submission, ingest `encryptedMinOut` with
   `Nox.fromExternal(...)`, persist it with `Nox.allowThis(encryptedMinOut)`, and store the handle
   against immutable order state; `fromExternal` access is otherwise transient and its proof is
   bound to the wallet and consuming application;
2. in a later evaluation transaction, read the bound pool's fixed-input quote;
3. compute `eligible` confidentially;
4. compute and persist
   `candidate = Nox.select(eligible, encryptedMinOut, Nox.toEuint256(0))`;
5. make the application an admin and a fixed worker a viewer of `candidate`;
6. let the worker privately decrypt `candidate`;
7. on zero, do nothing and publish no explicit failed-comparison proof;
8. on nonzero, ask the application to mark only the stored candidate publicly decryptable;
9. obtain a public proof and finalize one replay-safe
   `FPMM.buy(investmentAmount, outcomeIndex, minOutcomeTokensToBuy)`.

This is a **plausible design inferred from released APIs**, not a verified end-to-end deployment.
It needs a disposable live spike. Important caveats remain:

- the worker learns one readiness bit per permitted evaluation and learns `minOut` on success;
- a malicious or compromised worker can censor, probe within whatever evaluation cadence the
  contract permits, or request publication of a zero candidate;
- success-only publication is honest-worker policy rather than a confidential protocol check: the
  application cannot know why the viewer asked it to publish, but a public zero proof must never
  trade;
- the public-decryption proof signs the handle and decrypted result; it does **not** intrinsically
  bind an order, application, expiry, or nonce;
- the application must load the stored candidate for `(orderId, evaluationNonce)` rather than
  accept a caller-selected handle, and enforce the quote source, cadence, immutable worker,
  cancel/expiry phase, and one-shot state transition;
- viewer/public grants are effectively irreversible;
- `minOut` is necessarily plaintext at fill because unchanged FPMM consumes it.

Those caveats narrow the privacy claim to:

> The exact maximum price is not stored in plaintext by the application while the order rests.
> The fixed worker learns readiness during permitted evaluations, and the threshold-derived
> `minOut` becomes public when a successful fill is finalized.

That is thinner than “nobody can infer anything,” but it can still be a real Nox feature. The
original claim that *every* failure must be publicly decrypted is not established; the live spike
must prove the complete orchestration.

### 3.4 Sponsor fit: penalty, not prohibition

The current WTF material says prediction markets have already been seen and asks for what nobody
has shipped. That creates a high creativity burden. It does not prohibit the category; the
documented project-reuse disqualification concerns reuse of a prior VIBE submission.

NoxLimit must therefore be presented as:

> a confidential advanced-execution layer for real outcome shares

and not as:

> another prediction market.

Its exact transition was not found in DarkOdds:

`confidential resting threshold → success-only release → replay-safe proof → real AMM trade`

DarkOdds remains a native Nox pari-mutuel market with encrypted wagers/pools. Its Polymarket
connection was read-only. The distinction is necessary but still must be made obvious in the
30-second judge explanation.

## 4. What the independent audit still got right

- Nox has no verified production-mainnet deployment; Ethereum Sepolia is sufficient for this
  hackathon and any future-mainnet claim is a roadmap.
- `FPMM.buy` requires plaintext `minOutcomeTokensToBuy`, so the limit-equivalent becomes public at
  the successful fill.
- direct privacy-specific demand has not been validated.
- prediction-market category fatigue is a genuine creativity risk.
- a small seeded pool can be manipulated and must not be sold as production-safe liquidity.
- the Nox latency distribution is unknown.
- custody forwarding, cancel/expiry/refund, replay protection, and atomic limit enforcement must
  work; these are not optional because otherwise the demo itself is broken.
- a full stop-limit with two thresholds, sell orders, partial fills, multiple markets, and a broad
  dashboard is too large for the first slice.

## 5. Exact next experiment

Time-box the total verification to **24–36 hours**, with no polished frontend and no full product
build.

### Spike A — privacy and authorization path

On the current released Nox stack, prove:

`direct fromExternal → persist encryptedMinOut → bound quote → eligible → select(minOut,0) →
persist candidate → viewer-only private decrypt → no explicit public failure proof →
honest-worker-gated success publication → one-shot state`

Record contracts, transaction hashes, handles, timing, and which party can learn each value. Test
at least one false evaluation, one true evaluation, malicious publication of zero, a
caller-selected-handle attempt, one repeated-proof attempt, cancel, and expiry.

### Spike B — real market action

Using the pinned unchanged Conditional Tokens + FPMM source in a disposable local environment,
first prove:

`split collateral → seed real pool → quote → buy with minOut → receive real ERC-1155 outcome
shares → report payout → redeem`

That local result is preliminary. The final combined gate is one successful **Ethereum Sepolia**
Nox-authorized FPMM buy whose pool-enforced `minOut` cannot be worsened or replayed and whose
outcome shares reach the immutable owner. It must exercise the adapter's collateral approval,
ERC-1155 receiver support, atomic forwarding to the immutable owner, and safe refund/withdrawal
state—not a direct EOA buy. If resolution is included in the no-mock claim, use the live official
price feed plus a real resolver; manually choosing the payout proves only Conditional Tokens
plumbing.

### Stop conditions

Return to `DROP` if:

- the viewer cannot privately decrypt a computed candidate on the live released stack;
- a false evaluation must be public for the worker to continue;
- the application operator receives the exact threshold while the order is still
  pending/ineligible, beyond the fixed worker's disclosed readiness bit;
- a worker can alter recipient, market, side, amount, or limit, redirect assets, replay a fill, or
  bypass cancel/expiry;
- unchanged FPMM cannot pass the preliminary local path and the combined Ethereum Sepolia path in
  the time box;
- the combined flow requires mock prices, mock shares, fake execution, or a second human.

If Prompt 3 actually executes every combined Ethereum Sepolia gate, report `VERIFIED CANDIDATE` and
stop for the user's product-selection decision. This reassessment alone cannot award that status.

## 6. Security calibration after the spike

For the hackathon, require:

- no obvious loss or redirection of funds;
- immutable order binding and one-shot replay protection;
- atomic `minOut` enforcement;
- cancel, expiry, and refund;
- honest disclosure of worker/TEE/metadata/leakage boundaries;
- a repeatable end-to-end Sepolia path.

Defer the professional audit, production manipulation model, keeper decentralization, mainnet
migration, SLA, and broad feature set. Record them in a production-hardening backlog; do not use
them to kill a working, honest hackathon product.
