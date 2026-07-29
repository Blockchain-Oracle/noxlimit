# Agent Prompt Sequence

The historical prompt order is preserved below, but the active route comes only from
[`CURRENT.md`](../.thoughts/decisions/CURRENT.md) and
[`AUDIT-GATES.md`](../.thoughts/decisions/AUDIT-GATES.md).

**Active route:** NoxLimit is selected as the current direction. Prompts 0, 1, and 1A have run.
Prompt 2 is waived by explicit user selection. The user approved the
[canonical architecture](../.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md) on
2026-07-28. Prompt 3 is complete at `GO`: its local Nox, market, and combined-adapter paths pass,
and the bounded recovered Ethereum Sepolia trace/fill also passes. Do not restart discovery, comparison, or
architecture from scratch. The canonical architecture now includes the DeepBook-informed
multi-asset terminal, the adopted mobile Market Stream + desktop stream-rail discovery contract,
and post-gate Opus corrections. The user explicitly advanced the
polished-build checkpoint on 2026-07-28; Prompt 4 is authorized and active. Its contracts,
protocol, catalog, service, and web layers now exist, and bounded operator hardening is complete.
The latest snapshot records contracts `84`, protocol `14`, catalog `6`, service `69`, and web `62`
passing (`235` package tests total); the dedicated Playwright snapshot records `45` passing, `21`
intentional project/viewport skips, and zero failures. Both gates require a final submission-commit
rerun. Phase 6 has committed deployment, three
browser-off fills, the historical revision-5 activation, the corrected atomic revision-8
activation, and one full BTC browser/user/LP redemption vertical. ETH is a terminal no-write policy
rejection: its unique first post-deadline observation exceeded the immutable 3,600-second bound by
24 seconds. New official Sepolia BTC/ETH deployments enforce a 14,400-second minimum; revision `8`
activated the corrected deployments that exercise it, and current revision `12` keeps them active
beside verified 1h/24h routes. The
[corrected strike plan](../.thoughts/evidence/2026-07-29-sepolia-corrected-successor-strike-plan.json),
[BTC evidence](../.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-deployment.json),
and
[ETH evidence](../.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-deployment.json)
are retained deployment evidence. Commit `d28f307` publishes
`packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-corrected-rotated.json`, revision hash
`0x577593192efb7cf139267b3d076eb5e846fd15d1ab080611f9d504b716b4b427`; revisions `6`/`7` were
never served. The non-adjacent revision-5-to-8 runtime adoption used controlled stop → pointer →
single startup and reached `READY` at the post-cutover 2026-07-29 snapshot; the corrected markets'
ordering-open/tradeable result at that check is time-bound. Both retired revision-5 pools now have zero LP shares while
their unresolved 50,000,000 YES plus 50,000,000 NO atoms remain recorded for later settlement.
Both corrected OrderBooks now return `nextOrderId = 3`; four browser-created, browser-off fills are
recorded in [BTC NO](../.thoughts/evidence/2026-07-29-r8-corrected-btc-no-order.json),
[BTC YES](../.thoughts/evidence/2026-07-29-r8-corrected-btc-yes-order.json),
[ETH YES](../.thoughts/evidence/2026-07-29-r8-corrected-eth-yes-order.json), and
[ETH NO](../.thoughts/evidence/2026-07-29-r8-corrected-eth-no-order.json). Together with the three
predecessor records, seven browser-off fills are verified.
Sequential revisions `9`–`12` add verified BTC/ETH 1h/24h bundles beside the corrected 4h pair;
current r12 has four retired and six active records and the service is `READY`. The new routes were
truthfully `UPCOMING` before their shared start. BTC 1h deployment's failed exact-estimate treasury
top-up and successful attempt-bound retry are preserved in the
[recovery evidence](../.thoughts/evidence/2026-07-29-sepolia-btc-usd-1h-deployment-recovery.json).
Local container build/smoke passes, but public hosting requires explicit authorization for billable
resources. Corrected-route objective settlement, user/builder redemptions, and final default-branch
handoff remain pending. The public release work is on the
[`codex/noxlimit-polished-product` branch](https://github.com/Blockchain-Oracle/noxlimit/tree/codex/noxlimit-polished-product),
including [cutover commit `d28f307`](https://github.com/Blockchain-Oracle/noxlimit/commit/d28f307)
and [PR #2](https://github.com/Blockchain-Oracle/noxlimit/pull/2). Prompt 4 is the active route; do
not restart discovery.

1. [Run docs-first product discovery](./00-docs-first-product-discovery.md)
2. [Independently audit NoxLimit and the full corpus](./01-independent-noxlimit-audit.md)
3. [Reassess the disputed `DROP` under the hackathon standard](./01a-hackathon-calibrated-noxlimit-reassessment.md)
4. [Adversarially choose one concept](./02-adversarial-selection.md)
5. [Verify the chosen concept's critical path](./03-critical-path-verification.md)
6. [Build the polished NoxLimit product](./04-polished-product-implementation.md)
7. [Design NoxLimit from product truth to developer handoff](./05-designer-agent-handoff.md)

Prompt 0 is the canonical discovery prompt **only if the user and `CURRENT.md` explicitly reopen
discovery**. It recovers the official Nox product catalog that `llms-full.txt` omits, distinguishes
shipping references from concept pages, and evaluates both standalone and integration tracks. It
has already run; its historical result is
[`NONE SURVIVE`](../.thoughts/ideas/2026-07-23-nox-docs-first-candidates.md).

Prompt 1 has run. Its
[**`DROP`**](../.thoughts/verification/2026-07-24-noxlimit-independent-audit.md) verdict and
[research](../.thoughts/research/2026-07-24-noxlimit-independent-research.md) are preserved, but the
[hackathon-calibrated reassessment](../.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md)
found material errors in the decisive vetoes. Direct demand is unvalidated rather than disproved;
a normal backend can preserve the execution shape but must receive the raw threshold; released Nox
supports viewer-only private decrypt; and prediction markets face an originality burden rather
than a formal ban.

Prompt 1A has run: an independent recheck re-derived the disputed claims from the pinned
sources, a compile of the contract-side Nox primitive skeleton against released v0.2.4, and live
rules/product documentation, and
[**reaffirmed `KEEP AND VERIFY`**](../.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
with a gate split separating demo blockers from post-hackathon hardening. The later
[Prompt 3 evidence](../.thoughts/verification/2026-07-28-noxlimit-critical-path.md) now covers the
released Handle SDK, real pool, adapter, asset forwarding, expiry, refund, and privacy trace
locally plus the combined mined Sepolia path. Selection is closed; Prompt 3 is not an active prompt.

[`00-feasibility-first-winner-research.md`](./00-feasibility-first-winner-research.md) and the old
[`01-refresh-reality-and-ideas.md`](./01-refresh-reality-and-ideas.md) are preserved only as
historical context and must not be run. The older Prompt 0 excluded several official categories and
incorrectly required an unchanged third-party integration even for a standalone Nox product.

Run Prompt 2 only if the user explicitly reopens product comparison. Do not rerun Prompt 3, broad
research, or architecture redesign. Execute Prompt 4 from the canonical architecture, accepted
evidence, product stories, and surface map. Historical project clocks and submission dates are not
implementation authority; user direction controls pacing.

Prompt 5 is complete as a design handoff. The user selected visual direction **`Complement`** with a palette
inherited from Reclaim (`getreclaim.xyz`); see
[`../.thoughts/design/2026-07-28-noxlimit-visual-direction-selection.md`](../.thoughts/design/2026-07-28-noxlimit-visual-direction-selection.md).
`Vigil` and `Caliper` are rejected history. Do not re-run the three-direction exploration. The six
files in `../.thoughts/design/html/` now preserve directions, foundations, audited Batches A–C,
responsive compositions, and the prototype; their sample data is not live product evidence.

Prompt 5 was a parallel external-designer handoff, not a later product-selection gate. Its accepted
result preserves the Market Stream → terminal → explicit review interaction in the production
implementation; future refinements may not revive rejected directions or turn sample fixtures into
live inventory.
