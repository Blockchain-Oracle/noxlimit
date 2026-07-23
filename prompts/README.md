# Agent Prompt Sequence

Use these prompts in order. Each prompt has a stop condition so the agent does not jump from an
exciting idea into architecture or code before originality and feasibility are established.
Persisted workflow state lives in
[`.thoughts/decisions/CURRENT.md`](../.thoughts/decisions/CURRENT.md).

1. [Refresh reality and generate candidates](./01-refresh-reality-and-ideas.md)
2. [Adversarially choose one concept](./02-adversarial-selection.md)
3. [Verify the chosen concept's critical path](./03-critical-path-verification.md)

The first two prompts are safe to run now. Run the third only after the user explicitly selects a
concept or asks the agent to validate the current front-runner.
