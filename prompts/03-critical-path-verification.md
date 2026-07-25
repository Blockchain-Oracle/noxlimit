# Prompt 3: Verify NoxLimit's Critical Path

Run this only after the user has reviewed
`.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md` and
`.thoughts/decisions/CURRENT.md` still marks Prompt 3 as allowed.

## Reconcile before acting

Read, in order:

1. `AGENTS.md`;
2. `.thoughts/decisions/CURRENT.md`;
3. `.thoughts/decisions/AUDIT-GATES.md`;
4. `.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md`;
5. `AGENT_HANDOFF.md`;
6. the Nox wiki, exact source manifest, reassessment, and reaffirmation.

Inspect `git status`, relevant history, and the existing corpus. Write a compact snapshot of what is
already established, what is historical, the genuine unknowns, and the next authorized action.
Do not invent a second architecture or restart product selection. Change the canonical
architecture only if executable evidence contradicts it.

## Task boundary

Determine whether NoxLimit's selected architecture is technically real enough to justify the
polished hackathon build. This is a 24–36-hour disposable verification spike, not the full product.
Resolve current SDK/library/API documentation through Context7. Prefer live chain state and exact
installed release source over default branches or prose.

## Gate A — released Nox privacy path

Verify:

`encryptInput → direct fromExternal → persist encryptedMinOut → fixed-input FPMM quote →
confidential ge → select(minOut, 0) → persist candidate by orderId + nonce → fixed viewer →
private decrypt`

Then prove both branches:

- zero: no result-specific transaction or explicit public-decryption proof, no asset movement, and
  a fixed result-neutral timeout can safely reopen the order;
- nonzero: publish only the stored candidate, obtain a public proof, reject caller-selected
  handles, and consume it once;
- malicious zero publication: a valid zero proof must reopen safely without trading or stranding
  escrow in `PublicationPending`.

Adversarial cases: reused encrypted input handle, repeated proof/result, cross-order reuse,
cancelled order, expired order, stale nonce, zero publication, evaluation timeout, and worker
abandonment after publication. Publication timeout must route to `DisclosedRefundable`.

## Gate B — real market lifecycle

Using the pinned, unmodified Conditional Tokens + FPMM source:

`split real collateral → seed pool → fixed-input quote → buy with atomic minOut → receive real
ERC-1155 shares → report payout → redeem`

First prove this reproducibly in the disposable local environment. No product claim may call a
manually selected payout an objective resolution.

Verify the private max-price conversion independently:

- one overflow-safe integer helper, no floating point;
- `minOut = ceilDiv(amountIn × PRICE_SCALE, maxAveragePriceWad)`;
- fee-inclusive rounding, collateral decimals, exact-boundary quotes, tiny inputs, and extreme
  reserves;
- every successful test fill has an average gross collateral price no worse than the entered
  private maximum.

## Gate C — combined Ethereum Sepolia action

Execute one live Nox-authorized FPMM buy through the actual `NoxLimitOrderBook` adapter:

- immutable owner, recipient, side, amount, and expiry;
- constructor-validated, hard-bound curated FPMM, Conditional Tokens contract, collateral,
  condition, outcome count, and position IDs; reject malicious or mismatched targets;
- exact collateral approval only to the bound FPMM;
- finalization accepts only `(orderId, nonce, proof)`, derives `minOut` from
  `Nox.publicDecrypt(storedCandidate, proof)`, and calls current-quote
  `FPMM.buy(amountIn, outcomeIndex, minOut)`;
- FPMM's native atomic minimum-output enforcement;
- ERC-1155 receiver support with validated token/operator/position/active context, pre/post
  balance-delta accounting, dust isolation, and atomic forwarding to the immutable recipient;
- outer `try/catch` state that persists `DisclosedRefundable` when the nested pool/forward action
  fails;
- cancel, expiry, evaluation/publication timeout, refund, and one-shot replay behavior.

If objective resolution is in the judge path, use the official live Chainlink BTC/USD feed and a
real resolver that validates deadline round, decimals, answer, freshness, and one-shot settlement.

## Evidence required

- exact package versions, source SHAs, chain IDs, addresses, and deployment transactions;
- caller/owner/application binding and ACL trace;
- contract topology, storage/state transitions, events, and authorization trace;
- worker key/role, gas payer, polling/retry/reorg/deduplication behavior;
- input-handle, candidate/result, nonce, cancellation, expiry, and finalization replay tests;
- malicious-target, mismatched-market, spoofed-callback, cross-order balance, pre-existing dust, and
  rejecting-recipient tests;
- max-price/`minOut` conversion vectors and boundary properties;
- receipt-confirmed terminal transactions and real asset balances;
- proof the downstream CTF/FPMM source was not modified;
- reproducible commands, tests, transaction hashes, and measured timings;
- exact public/private/worker-learned data at every phase.

Use the hackathon gate in `AUDIT-GATES.md`. Professional audits, formal verification, mainnet,
decentralized keepers, organic liquidity, production manipulation modelling, and latency SLAs are
post-hackathon hardening unless the same issue breaks the real judge path or obviously loses assets.

## Verdict

Classify every claim as `Verified`, `Partially verified`, `Not verified`, or `Contradicted`, then
return one:

- **GO** — all three gates have executable evidence; stop for the user's polished-build checkpoint;
- **CONDITIONAL GO** — name only the bounded remaining demo gates and their exact experiment;
- **NO-GO** — identify the contradicted load-bearing assumption and stop for the user; do not
  automatically restart discovery.

Save the evidence as
`.thoughts/verification/YYYY-MM-DD-noxlimit-critical-path.md`, update `CURRENT.md`, the canonical
architecture, routing files, and the handoff together, then stop. Do not turn the spike into a
polished frontend or full implementation plan.
