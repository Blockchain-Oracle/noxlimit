# Agent Prompt Sequence

Use these prompts in order. Each prompt has a stop condition so the agent does not jump from an
exciting idea into architecture or code before originality and feasibility are established.
Persisted workflow state lives in
[`.thoughts/decisions/CURRENT.md`](../.thoughts/decisions/CURRENT.md).

**Current-state exception:** if the user directs technical verification after Prompt 1A, the next
step is only the bounded verification slice of Prompt 3. Do not run Prompt 2 first unless the user
asks for a comparison or selection. This exception does not authorize a full implementation.

1. [Run docs-first product discovery](./00-docs-first-product-discovery.md)
2. [Independently audit NoxLimit and the full corpus](./01-independent-noxlimit-audit.md)
3. [Reassess the disputed `DROP` under the hackathon standard](./01a-hackathon-calibrated-noxlimit-reassessment.md)
4. [Adversarially choose one concept](./02-adversarial-selection.md)
5. [Verify the chosen concept's critical path](./03-critical-path-verification.md)

The docs-first Prompt 0 is the only current discovery prompt. It recovers the official Nox product
catalog that the generated `llms-full.txt` omits, distinguishes shipping references from concept
pages, evaluates both standalone and third-party-integration tracks, and retains feasibility as a
veto. This task has already run it; the canonical result is
[`NONE SURVIVE`](../.thoughts/ideas/2026-07-23-nox-docs-first-candidates.md). Keep the prompt for an
independent agent or a rerun with new evidence.

Prompt 1 has run. Its
[**`DROP`**](../.thoughts/verification/2026-07-24-noxlimit-independent-audit.md) verdict and
[research](../.thoughts/research/2026-07-24-noxlimit-independent-research.md) are preserved, but the
[hackathon-calibrated reassessment](../.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md)
found material errors in the decisive vetoes. Direct demand is unvalidated rather than disproved;
a normal backend can preserve the execution shape but must receive the raw threshold; released Nox
supports viewer-only private decrypt; and prediction markets face an originality burden rather
than a formal ban.

Prompt 1A has now run: an independent recheck re-derived the disputed claims from the pinned
sources, a compile of the contract-side Nox primitive skeleton against released v0.2.4, and live
rules/product documentation, and
[**reaffirmed `KEEP AND VERIFY`**](../.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
with a gate split separating demo blockers from post-hackathon hardening. The compile did not cover
the Handle SDK, real pool, adapter, asset forwarding, expiry, or refund. Current state is `KEEP AND
VERIFY`, not selected; the next step after user direction is only the bounded Prompt 3 spike defined
in that memo.

[`00-feasibility-first-winner-research.md`](./00-feasibility-first-winner-research.md) and the old
[`01-refresh-reality-and-ideas.md`](./01-refresh-reality-and-ideas.md) are preserved only as
historical context and must not be run. The older Prompt 0 excluded several official categories and
incorrectly required an unchanged third-party integration even for a standalone Nox product.

Run Prompt 2 only when the user asks to compare or select one or more genuine survivors. There are
zero technically verified survivors; NoxLimit is one unselected conditional candidate, so
comparison is currently optional rather than useful. Prompt 3 is allowed only as the 24–36-hour
disposable privacy + real-FPMM experiment defined by the reassessment. A full product build still
requires that spike to pass and the user to select the concept.
