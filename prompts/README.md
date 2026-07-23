# Agent Prompt Sequence

Use these prompts in order. Each prompt has a stop condition so the agent does not jump from an
exciting idea into architecture or code before originality and feasibility are established.
Persisted workflow state lives in
[`.thoughts/decisions/CURRENT.md`](../.thoughts/decisions/CURRENT.md).

1. [Research winners and generate only feasible candidates](./00-feasibility-first-winner-research.md)
2. [Adversarially choose one concept](./02-adversarial-selection.md)
3. [Verify the chosen concept's critical path](./03-critical-path-verification.md)

Prompt 0 is the only current discovery prompt. It makes feasibility a veto, records the user's
rejected directions, and requires comparable-winner research before generating anything. Stop
after Prompt 0 so the user can inspect the evidence and survivors.

[`01-refresh-reality-and-ideas.md`](./01-refresh-reality-and-ideas.md) is preserved only as
historical context and must not be run. Run Prompt 2 only when the user asks to compare or select
one or more survivors. If Prompt 0 returns `NONE SURVIVE`, repeat discovery with new evidence rather
than running Prompt 2. Run Prompt 3 only after the user explicitly selects a concept or asks the
agent to validate a surviving front-runner.
