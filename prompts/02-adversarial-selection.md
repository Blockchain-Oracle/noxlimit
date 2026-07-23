# Prompt 2: Adversarially Select One Concept

Act as a skeptical hackathon product council. Use the repository's refreshed idea report and source
corpus to choose one concept worth spending the remaining hackathon time on.

Read:

- `AGENT_HANDOFF.md`
- the newest file in `.thoughts/research/`
- the newest file in `.thoughts/ideas/`
- `.thoughts/wiki/nox-protocol.md`
- `.thoughts/wiki/nox-developer-stack.md`
- `.thoughts/wiki/nox-integration-patterns.md`
- `.thoughts/wiki/nox-known-contradictions.md`

Re-check the current DoraHacks brief, previous winners, and public competitor landscape. Do not trust
an old “no competitor found” result.

For each top-three idea, try to kill it on:

1. prior-winner or current-project collision;
2. fake Nox necessity;
3. a simpler non-Nox solution such as a normal private database, commit-reveal, or zero knowledge;
4. missing input provenance;
5. underlying-protocol modification rather than clean composition;
6. unsupported Nox types or operations;
7. owner/app caller-binding failure;
8. asynchronous finalization and replay risk;
9. inability to produce a real proof-gated action on Ethereum Sepolia;
10. a judge path requiring setup, multiple wallets, or mock data;
11. scope too large for the remaining time;
12. product theater: many pages but no user who would return.

Pay special attention to the current front-runner, SLA Lock:

- Can a credible monitor sign real telemetry?
- Can a Nox evaluator contract control exactly one ERC-8183 terminal action?
- Can an unchanged ERC-8183 implementation run on Ethereum Sepolia?
- Is pass/fail disclosure sufficient and honest?
- Can a sponsored one-action experience stay real?
- Has a new competitor entered this lane?

Output a decision memo with:

- evidence table for the three finalists;
- strongest objection and response for each;
- explicit kill criteria;
- one selected concept or a “none survive” verdict;
- confidence level;
- exactly one smallest feasibility question to answer next.

Save the memo as `.thoughts/decisions/YYYY-MM-DD-concept-selection.md`. Then update
`.thoughts/decisions/CURRENT.md` with the status, selected concept or “none survive,” confidence,
memo link, exact feasibility question, and whether Prompt 3 is allowed. Do not rely on chat history
as the handoff.

Stop there. Do not produce a full spec, plan, UI, or code.
