# Agent Prompt Sequence

Use these prompts in order. Each prompt has a stop condition so the agent does not jump from an
exciting idea into architecture or code before originality and feasibility are established.
Persisted workflow state lives in
[`.thoughts/decisions/CURRENT.md`](../.thoughts/decisions/CURRENT.md).

1. [Run docs-first product discovery](./00-docs-first-product-discovery.md)
2. [Independently audit NoxLimit and the full corpus](./01-independent-noxlimit-audit.md)
3. [Adversarially choose one concept](./02-adversarial-selection.md)
4. [Verify the chosen concept's critical path](./03-critical-path-verification.md)

The docs-first Prompt 0 is the only current discovery prompt. It recovers the official Nox product
catalog that the generated `llms-full.txt` omits, distinguishes shipping references from concept
pages, evaluates both standalone and third-party-integration tracks, and retains feasibility as a
veto. This task has already run it; the canonical result is
[`NONE SURVIVE`](../.thoughts/ideas/2026-07-23-nox-docs-first-candidates.md). Keep the prompt for an
independent agent or a rerun with new evidence.

The current task has since produced one unselected `KEEP AND VERIFY` hypothesis:
[`NoxLimit`](../.thoughts/ideas/2026-07-24-noxlimit-product-hypothesis.md). Run the new Prompt 1 in a
fresh Claude Code or other coding-agent session. It reconstructs outcome-share markets, refreshes
demand and competitor evidence, rechecks released Nox and network reality, compares market
substrates, audits security/performance/UX, and permits `KEEP`, `RESHAPE`, `DROP`, or
`NONE SURVIVE`. Its verdict still requires user review.

[`00-feasibility-first-winner-research.md`](./00-feasibility-first-winner-research.md) and the old
[`01-refresh-reality-and-ideas.md`](./01-refresh-reality-and-ideas.md) are preserved only as
historical context and must not be run. The older Prompt 0 excluded several official categories and
incorrectly required an unchanged third-party integration even for a standalone Nox product.

Run Prompt 2 only after the independent audit and when the user asks to compare or select one or
more genuine survivors. NoxLimit's present `KEEP AND VERIFY` label is not a survivor verdict.
Run Prompt 3 only after the user explicitly selects a concept or asks the agent to validate a
surviving front-runner.
