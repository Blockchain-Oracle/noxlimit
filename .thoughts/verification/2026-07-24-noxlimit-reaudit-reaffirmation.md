# NoxLimit Verdict Recheck: Independent Reaffirmation

> **Adopted evidence; selection wording is historical.** This memo independently reaffirmed
> `KEEP AND VERIFY` on 2026-07-24. The user subsequently selected NoxLimit as the current direction
> and requested architecture review before the spike. Follow
> [`../decisions/CURRENT.md`](../decisions/CURRENT.md) for current workflow authority.

**Date:** 2026-07-24 (evening recheck)
**Task:** Reopen the `DROP` verdict in
[`2026-07-24-noxlimit-independent-audit.md`](./2026-07-24-noxlimit-independent-audit.md) and re-audit
its four decisive conclusions under the user's hackathon standard, without inheriting either the
original audit or the earlier
[reassessment](./2026-07-24-noxlimit-drop-verdict-reassessment.md) on authority.
**Method:** Decisive claims were rechecked against available primary evidence in this session: the
pinned local mirrors (commits verified against
[`source-manifest.md`](../sources/source-manifest.md)), a disposable compile of the contract-side Nox
primitive sequence against released `nox-protocol-contracts` v0.2.4, and live reads of the official
DoraHacks page/API and Kalshi/Robinhood/Gemini product documentation. DoraHacks challenged the
default command-line request, but its official API remained readable with a browser-like user agent;
a rendered browser was also used to inspect the page and registration flow.

---

## 1. Verdict

# `KEEP AND VERIFY` — reaffirmed, unselected candidate

The hard `DROP` remains unsupported. The evidence offered for the two claimed vetoes
(no privacy-specific demand; ordinary-backend equivalence) is insufficient, and the decisive
leakage claim (every failed evaluation must be publicly decrypted) is contradicted by the released
protocol source. The surviving demand, originality, leakage, binding, liveness, and integration
risks are real, but none is yet an established demo blocker under the user's hackathon standard.

This recheck **cannot** award `VERIFIED CANDIDATE`. Only executable evidence from the Prompt 3
spike (§6) can. A failed spike returns the verdict to `DROP`.

## 2. New evidence produced by this recheck

**VERIFIED (source, this session):**

- All five pinned mirrors match the manifest commits exactly (`1a2ebd4`, `e552f6a`, `080264e`,
  `6a4610b`, `e685645`; substrates `eeefca66`, `6814c024`).
- `ACL.sol` (v0.2.4): `addViewer` requires the caller to be allowed on the handle and sets a
  persistent viewer flag; `allowPublicDecryption` sets a persistent public flag; **the module
  contains no removal function for either** — grants are irreversible, as the corpus recorded.
  `isViewer` returns true for public handles, publicly-decryptable handles, viewers, and admins.
- Handle SDK beta.13 `decrypt.ts`: checks `isViewer` via an on-chain **view call**, then performs an
  off-chain ECIES/RSA private decryption against the Gateway API under an EIP-712 authorization.
  **No transaction and no public proof are produced.** `publicDecrypt.ts` is a separate path that
  requires on-chain `isPubliclyDecryptable` before the Gateway returns a `decryptionProof`.
  Therefore a viewer-only private read of a computed result exists in the released stack, and a
  failed evaluation does not inherently require an explicit public proof.
- `Compute.sol` `validateDecryptionProof`: a **view** function; the Gateway signature covers only
  `(handle, keccak256(decryptedResult))`. **The proof carries no order id, nonce, market, or
  expiry, and nothing is consumed on-chain.** All replay safety and order binding must live in
  application storage. `validateInputProof` binds owner + consuming application and expires after
  `proofExpirationDuration`, but is likewise not consumed.
- **Compile check:** a minimal contract exercising the contract-side primitive sequence —
  `fromExternal → allowThis(minOut) → ge(quote, minOut) → select(eligible, minOut, 0) →
  allowThis(candidate) → addViewer(candidate, fixedWorker) → allowPublicDecryption(stored
  candidate) → validateDecryptionProof` — **compiles cleanly against released v0.2.4 with solc
  0.8.35** in a disposable scratch project. This verifies a useful subset of the released
  contract-side API surface, not the proposed orchestration end to end. The fixture accepted a
  caller-supplied quote, declared its own proof-validation interface, omitted the Handle SDK,
  FPMM call, adapter, token forwarding/refund path, and did not check expiry in finalization. It
  proves nothing about live Gateway/worker behavior or the full product path.
- The Nox library hardcodes the Ethereum Sepolia NoxCompute proxy `0x24Ef…77bF` for chain
  11155111 — matching the live proxy the research verified on-chain.
- FPMM (`6814c024`): `buy` atomically enforces `minOutcomeTokensToBuy` and sends shares to
  `msg.sender`; `calcBuyAmount` is `public view`, so **the evaluation transaction can bind the real
  pool quote on-chain** rather than trusting a caller-supplied number.
- **Live rules ([official page](https://dorahacks.io/hackathon/wtf-hackathon/detail) and
  [official API](https://dorahacks.io/api/hackathon/wtf-hackathon/), 2026-07-24):** deadline
  2026-08-01 21:59 UTC (epoch 1785621540,
  `is_extended:false`); 13 BUIDLs, **81** hackers; creativity ⭐⭐⭐ and end-to-end-no-mock ⭐⭐⭐ tied
  highest; ETH Sepolia ⭐⭐. The Innovative track's published **`judging_criteria` field is empty**
  — no separate formula is exposed in that field. This does **not** negate the "already seen … we
  want what nobody has shipped yet … Surprise us" track-description steer or prove that judges will
  apply no category penalty. The only explicit disqualification rule found is reusing a prior VIBE
  project.
- **Live product docs:** [Kalshi Pro](https://news.kalshi.com/p/kalshi-pro-trading-terminal)'s
  take-profit/stop-loss appears **only under perpetual futures**;
  [Robinhood event contracts](https://robinhood.com/us/en/support/articles/trading-event-contracts/)
  document **limit-only IOC/GTD** with no stop or private trigger; and
  [Gemini prediction markets](https://developer.gemini.com/prediction-markets-spec/trading) ship
  stop-limit orders with the **venue receiving the trigger**.
- **Registration requirement:** the official API has `is_enabled_ask_hackers:true` and a required
  registration question instructing the hacker to complete iExec's Hello World and submit the
  wallet address used. `register_form_url:null` and `has_onboarding:false` are separate fields and
  do not remove that required question.

**NEW public-metadata observation:** each evaluation that grants the worker viewer access emits a
public `ViewerAdded` event (and success publication emits `MarkedAsPubliclyDecryptable`). Even with
no public decryption of failures, **the number and timing of evaluations are public on-chain
breadcrumbs**. Assuming the live Gateway path works, worker behavior is observable enough, and an
honest worker publishes successes within a bounded time, an observer may infer "not yet eligible"
from an evaluation followed by no publication and bracket the threshold against public quotes.
That is an inference to test, not a source-level fact.

## 3. The four disputed conclusions, rechecked

### 3.1 Demand — `UNKNOWN`, not falsified

The original audit's own research marks DePM order-flow privacy "unexplored" and MEV on DePMs
"unmeasured" in the cited SoK, and contains no trader interviews, support threads, or feature
requests establishing that users do *not* want a hidden resting threshold. An unsuccessful search
for direct evidence is not evidence of absence. Adjacent evidence exists: transparent order flow
has structural pre-trade exposure, private-trading prior art signals a recognized problem, and
venues ship conditional orders. However, the copy-trading evidence is primarily post-fill—which
NoxLimit does not hide—and shipping a feature proves availability, not usage. **This is problem
evidence, not product-market-fit proof.** Demand for hiding *only this threshold* under Nox's
latency and trust model remains directly unvalidated. Class: product-demand unknown.

### 3.2 Ordinary-backend equivalence — not established as a veto

Comparing complete user outcomes, not just the mechanical fill:

| Substitute | Custody | Hands-off availability | Who learns the threshold | Same-chain composability |
|---|---|---|---|---|
| Centralized venue (Gemini stop-limit) | venue | yes | **venue operator** | no |
| Application backend | contract possible | yes | **application operator (raw)** | yes |
| User-run local bot | user | yes while the process runs (self-managed uptime + gas-only key) | nobody else | yes |
| Public onchain limit | contract | yes | **everyone** | yes |
| Nox (proposed) | contract, immutable recipient | targeted; live-worker spike required | fixed worker: 1 readiness bit/evaluation + `minOut` on success; public at fill | yes |

The audit's centralized examples were misstated: Kalshi's TP/SL is perps-only and Robinhood event
contracts are limit-only (both re-verified live today). Gemini is the only centralized
prediction-market stop-limit example verified in this audit—not necessarily the only one that
exists—and it surrenders the trigger to the venue. A local bot can preserve custody, threshold
secrecy, and composability while it runs, but shifts uptime, maintenance, and gas-signing
responsibility to the user. Nox's honest delta is managed browser-off execution without giving the
raw threshold to the application backend, subject to TEE and worker liveness/censorship assumptions.
No substitute with clearly acceptable trade-offs was established, but a simpler substitute can
still invalidate the product if users do not value that delta. This folds back into §3.1.

### 3.3 Leakage — the decisive claim was wrong; the honest boundary is narrow but real

The original audit's veto-supporting claim — "each evaluation … must be publicly decrypted" — is
**contradicted by released source** (§2: viewer-only private decrypt exists and produces no public
proof). Source inspection supports the intended path, and the contract-side primitive subset
compiles. The full path—ingest → persist → on-chain-bound quote → confidential compare →
`select(eligible, minOut, 0)` → persist candidate → viewer grant → private decrypt → worker-gated
publication of the stored candidate only → application-bound proof → one-shot state transition →
one real FPMM buy—remains uncompiled and unverified end to end.

Honest boundary and residual risks, stated fully:

- **Worker knowledge:** one readiness bit per permitted evaluation; the successful `minOut` value.
- **Chosen-query / cadence risk:** the worker chooses *when* evaluations happen; each evaluation at
  a known public quote is a comparison oracle. Cadence limits bound but do not eliminate this.
- **Censorship and malicious publication:** the worker can delay or refuse evaluation/publication,
  and can request publication of a **zero** candidate. Success-only publication is honest-worker
  *policy*, not confidential protocol enforcement — the application cannot know why the viewer
  asked to publish. A published zero leaks one failed comparison publicly and **must never trade**;
  the contract must reject zero and leave the order safe.
- **Proof binding:** the Gateway proof signs only the handle and result — it does **not** contain
  an order id or nonce. The application must load the stored candidate for
  `(orderId, evaluationNonce)`, reject caller-selected handles, enforce quote-source, cadence,
  cancel/expiry phase, and consume the order exactly once. Because deterministic computations may
  produce the same candidate handle for reused inputs and quotes, the spike must attempt
  cross-order proof reuse, not merely replay against one order.
- **Irreversible grants:** viewer/public grants cannot be revoked. The resting threshold handle
  itself must **never** receive a viewer or public grant — only per-evaluation candidate handles.
- **Plaintext at fill:** unchanged `FPMM.buy` consumes plaintext `minOutcomeTokensToBuy`; the
  threshold-derived value is public at a successful fill, and a reverted finalization leaves the
  order disclosed-and-refundable, not confidential-pending.
- **Public inference:** evaluation timing (`ViewerAdded` events, worker transactions) and
  non-action may let observers bracket the threshold between a quiet quote and the publishing
  quote if the worker is known, success publication is reliable, and latency is bounded. The claim
  "nobody can infer anything while resting" would be false; the honest claim is "the application
  operator never stores the raw threshold; the fixed worker learns readiness bits; the value
  becomes public at fill."

Judged against the user's standard these are: an honest narrow privacy boundary (plaintext-at-fill
and worker readiness bits), bounded technical unknowns (live Gateway viewer-decrypt, application
binding, worker liveness, and the full real-pool path), a timing-inference risk to measure, and
post-hackathon hardening (cadence economics, decoy evaluations, worker decentralization). **None is
yet a proven demo blocker.** Source inspection alone cannot verify the live path; the smallest live
spike is defined in §6.

### 3.4 Sponsor fit — originality burden, not a ban

Live rules today: no category prohibition was found; the track `judging_criteria` field is empty;
creativity is tied with end-to-end/no-mock at the highest displayed weight; the only explicit
disqualification found is prior-VIBE reuse; the organizer invites idea validation "anytime." The
prediction-market fatigue
line ("we've already seen … prediction markets … we want what nobody has shipped yet") is a real
judge-risk and demands the framing *"confidential advanced-execution layer over an unchanged public
outcome-share AMM,"* never "another prediction market."

Two points the original audit underweighted:

1. The challenge text prefers taking an impactful open-source protocol, adding privacy, and
   preserving the underlying protocol. Unchanged Gnosis CTF/FPMM + a Nox confidentiality layer
   matches that preferred pattern **if** the integration and user impact survive the spike.
2. The exact transition — `confidential resting threshold → success-only release →
   application-bound proof → real outcome-share AMM buy` — was not found in the dated public scan,
   including DarkOdds, which is a native Nox pari-mutuel market with a **read-only** Polymarket
   display, not a router and not an execution layer over an external AMM. Private submissions and
   undiscovered projects remain unknown.

The residual risk is that judges collapse the distinction anyway. That is an originality/judge
risk to be tested with the organizer, not a rule failure.

## 4. Gate split

| # | Risk | Primary class | Conditional secondary |
|---|---|---|---|
| 1 | Live viewer private-decrypt of a computed candidate + full async orchestration unproven | `BOUNDED SPIKE REQUIRED` | `DEMO/PRODUCT BLOCKER` if the spike fails |
| 2 | Proof carries no order binding; app-side `(orderId, nonce)` binding, one-shot consumption, zero-rejection | `BOUNDED SPIKE REQUIRED` (adversarial cases in Spike A) | `DEMO/PRODUCT BLOCKER` if unenforceable |
| 3 | Self-deploy 0.5.1 CTF/FPMM + 0.8.35 adapter (approval, ERC-1155 receiver, atomic forward, refund) in 8 days | `BOUNDED SPIKE REQUIRED` | `DEMO/PRODUCT BLOCKER` if Spike B misses the time box |
| 4 | `minOut` plaintext at successful fill; disclosed-terminal on revert | honest boundary — disclose | `DEMO/PRODUCT BLOCKER` only if misrepresented |
| 5 | Worker readiness bits, chosen evaluation cadence, censorship, malicious zero publication | honest boundary + `POST-HACKATHON HARDENING` | `DEMO/PRODUCT BLOCKER` if zero can trade or funds can move |
| 6 | Public evaluation-timing inference (`ViewerAdded` breadcrumbs, non-action) | honest boundary + `POST-HACKATHON HARDENING` | — |
| 7 | Irreversible viewer/public grants | design rule (never grant on the threshold handle) | `DEMO/PRODUCT BLOCKER` if violated |
| 8 | Seeded-pool manipulation economics | `POST-HACKATHON HARDENING` (label liquidity honestly) | `DEMO/PRODUCT BLOCKER` if an obvious cheap push can force asset loss |
| 9 | Nox latency distribution unknown (n=1) | `POST-HACKATHON HARDENING` (no SLA claims) | `DEMO/PRODUCT BLOCKER` if the judge path is unreliable |
| 10 | Privacy-specific demand unvalidated | `PRODUCT-DEMAND UNKNOWN` | may justify user-level `DROP` on product grounds |
| 11 | Prediction-market category fatigue | `ORIGINALITY / JUDGE RISK` (validate with organizer) | may justify user-level `DROP` |
| 12 | Chainlink Automation v2.1 sunset 2026-07-31 | dependency removed; use a hosted/permissionless worker | hosted-worker liveness remains spike-required |
| 13 | Hello-World registration requirement | required by the live registration-question payload | complete it and submit the wallet used |

Rows 10–11 are legitimate grounds on which the **user** may still choose `DROP`; the original
audit's veto-level conclusions were insufficiently evidenced, rather than "security failures."
Rows 4–9 do not become pre-build vetoes without demo-breaking evidence, but rows 8–9 can still fail
the candidate if the bounded experiment exposes obvious asset loss or an unreliable judge path.

## 5. What the original audit still gets credit for

Unchanged from the reassessment §4: no Nox production mainnet (irrelevant here — ETH Sepolia is the
required chain); plaintext `minOut` at fill; demand unvalidated; category fatigue; seeded-pool
manipulability; unknown latency distribution; custody/replay/cancel obligations; and the discipline
of keeping the first scope to one market, one side, one fixed size, one confidential buy limit.

## 6. Required 24–36-hour disposable critical-path spike (Prompt 3 boundary)

One time box, three gates, no polished frontend, all artifacts disposable:

1. **Honest-worker privacy path on the current released Nox stack:** direct
   `fromExternal` ingestion → persisted `encryptedMinOut` → on-chain-bound pool quote →
   confidential compare → `select` candidate → persist → fixed-worker viewer grant → **private
   decrypt via Handle SDK `decrypt`** → zero: no explicit public proof; nonzero: worker-gated
   publication of the stored candidate → public proof → one-shot consumption. Record contracts, tx
   hashes, handles, timing, and who learned what. Adversarial cases: one false evaluation, one true
   evaluation, malicious publication of a zero candidate (must not trade, order must stay safe), a
   caller-selected-handle attempt, a same-order repeated-proof attempt, a cross-order proof-reuse
   attempt, cancel, and expiry.
2. **Real market substrate:** pinned unchanged Conditional Tokens + FPMM in a disposable local
   environment: `split collateral → seed real pool → quote → buy with minOut → real ERC-1155
   outcome shares → report payout → redeem`.
3. **Combined Ethereum Sepolia gate:** one live Nox-authorized FPMM buy through the **actual
   adapter** (not a direct EOA buy) with immutable recipient and atomic `minOut` that cannot be
   worsened or replayed. The adapter must exercise collateral approval, ERC-1155 receiver support,
   atomic forwarding to the immutable owner, and safe cancel/expiry/refund state. If resolution is
   included in the no-mock claim, use the live Chainlink feed plus a real resolver contract — a
   manually selected payout proves only Conditional Tokens plumbing and must be labeled as such.

Stop conditions (return to `DROP`): the reassessment §5 list, unchanged — viewer cannot privately
decrypt a computed candidate live; a false evaluation must be public for the worker to continue;
the operator receives the raw threshold while resting; a worker can redirect assets, alter the
immutable order, replay, or bypass cancel/expiry; the combined Sepolia path misses the time box; or
the flow needs mock prices, mock shares, fake execution, or a second human.

## 7. Ledgers

**VERIFIED FACT:** pinned commits and released ACL/proof APIs; compilation of the contract-side Nox
primitive skeleton; current DoraHacks API fields and required registration question; current
Kalshi/Robinhood/Gemini product documentation.
**INFERENCE:** the narrow differentiation versus backends and local bots (§3.2); possible timing
bracketing from public `ViewerAdded` events (§2); sponsor-fit alignment of the unchanged-protocol
shape (§3.4).
**CONTRADICTION:** the original audit's "each evaluation must be publicly decrypted" claim (versus
the released viewer path), and its Kalshi/Robinhood substitute claims (versus current product docs).
**UNKNOWN / TEST REQUIRED:** live end-to-end orchestration (§6.1); combined Sepolia adapter path
(§6.3); Nox latency distribution; seeded-pool manipulation cost; organizer stance on the
category-versus-execution-layer distinction; and private or undiscovered competing submissions.

## 8. Compile reproduction note

The independent compile was re-run with:

```bash
forge --version
forge clean
forge build --force
```

It succeeded with Forge 1.7.1 and solc 0.8.35, with two `block.timestamp` lint warnings. SHA-256
checks confirmed the scratch copies of `Nox.sol` and `INoxCompute.sol` match the pinned v0.2.4
source. The scratch fixture is disposable and is not part of this repository; Prompt 3 must build a
durable fixture that imports the released proof interface and exercises the Handle SDK, real pool
quote, adapter, asset forwarding, expiry, and refund path.
