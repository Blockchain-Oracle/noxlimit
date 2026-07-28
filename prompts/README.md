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
multi-asset terminal and post-gate Opus corrections. The active route is the user's polished-build
checkpoint; Prompt 4 is staged but not authorized to run.

1. [Run docs-first product discovery](./00-docs-first-product-discovery.md)
2. [Independently audit NoxLimit and the full corpus](./01-independent-noxlimit-audit.md)
3. [Reassess the disputed `DROP` under the hackathon standard](./01a-hackathon-calibrated-noxlimit-reassessment.md)
4. [Adversarially choose one concept](./02-adversarial-selection.md)
5. [Verify the chosen concept's critical path](./03-critical-path-verification.md)
6. [Build the polished NoxLimit product](./04-polished-product-implementation.md)

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
research, or architecture redesign. A polished product build begins only after the user's current
checkpoint. When the user explicitly advances it, Prompt 4 is the active implementation handoff.
Historical project clocks and submission dates are not implementation authority; user direction
controls pacing.
