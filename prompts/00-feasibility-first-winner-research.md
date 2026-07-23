# Prompt 0: Feasibility-First Winner Research and Idea Discovery

You are a skeptical product researcher helping one builder choose an iExec WTF Hackathon project.
Do not behave like a brainstorming assistant. Do not begin with “what can Nox hide?” and work
backward into a use case. Begin with real products, recurring user behavior, comparable hackathon
winners, and a build scope that can actually ship.

The user has rejected the repository's previous front-runners. Do not defend, rename, or lightly
repackage them.

## Objective

Find a small number of product ideas that are all of the following:

- a real, self-serve product rather than a protocol pitch, benchmark, or staged demo;
- useful to one clear user without requiring institutions, committees, reviewers, or counterparties
  to adopt it first;
- buildable end to end by one builder within the remaining hackathon time;
- usable by a judge in one browser session without crypto setup choreography;
- based on real data and a real Ethereum Sepolia action, not mocks or invented participants;
- materially better because of Nox, with confidentiality used as a mechanism rather than the
  product thesis.

It is valid for **no idea to survive**. Do not lower the bar to fill a quota.

Do not write a product specification, architecture, implementation plan, user stories, or code.

## Read before browsing

Read these files in order:

1. `README.md`
2. `.thoughts/decisions/CURRENT.md`
3. `.thoughts/research/2026-07-22-iexec-wtf-hackathon.md`
4. `.thoughts/wiki/index.md`
5. `.thoughts/wiki/nox-protocol.md`
6. `.thoughts/wiki/nox-developer-stack.md`
7. `.thoughts/wiki/nox-integration-patterns.md`
8. `.thoughts/wiki/nox-known-contradictions.md`
9. `.thoughts/sources/source-manifest.md`

Do not read the historical handoff, winner conclusions, or idea files until after completing the
independent winner and product research below. They contain old recommendations that can anchor the
search.

## Research first; generate nothing yet

### 1. Re-verify this hackathon

Use current primary sources to verify:

- the WTF brief, judging language, required deliverables, deadline, and allowed integration shapes;
- the current public submission and repository landscape;
- the three previous iExec VIBE winners and why their product shapes were legible;
- which categories are already crowded or are obvious repeats.

Separate organizer facts from your inference. The organizer's wallet, DeFi, and treasury examples
are optional examples, not an instruction to copy them.

### 2. Study comparable winners

Research at least 12 substantive winners or finalists across at least four recent, comparable
hackathons. Prioritize:

- privacy-preserving computation;
- confidential computing and TEEs;
- FHE;
- zero knowledge;
- applied cryptography;
- Ethereum protocol-integration bounties.

Use general AI hackathons only when a winning project teaches a directly relevant product or
feasibility pattern. Prefer official winner pages, official project submissions, public
repositories, deployed applications, and demo videos over roundups or promotional summaries.

For each project, record:

- event, date, placement, and canonical sources;
- the real user and recurring problem;
- the single action that made it feel like a product;
- the existing product or workflow it resembled;
- what the sponsor technology made possible;
- what a judge could genuinely try;
- the apparent build surface and external dependencies;
- whether it still has a working app, active repository, or signs of use;
- the stated reason it won, if available;
- your inferred reason it won, clearly labelled as inference.

Do not turn this into a list of technologies or copy a winner's product category. Extract
repeatable **winner patterns** and **failure patterns**.

### 3. Research shipping products and current behavior

Look for current, named, shipping products with active user workflows—not market forecasts alone.
Use trends only as evidence that a behavior exists. A trend is not permission to invent a product
around it.

For each relevant workflow, verify:

- who already performs it;
- what they do repeatedly;
- the concrete cost or harm caused by public-chain visibility;
- the open-source protocol or deployed contract that could be integrated without modification;
- whether one user can complete the loop without waiting for an institution or another human;
- whether a small Nox integration improves the workflow without becoming the whole product.

Prefer primary product documentation, public repositories, protocol deployments, usage dashboards,
and direct user evidence. Label vendor-reported metrics as vendor-reported.

If an SDK, API, library, framework, or CLI becomes relevant, follow the repository's `AGENTS.md`
Context7 procedure before relying on API details.

### 4. Only now inspect historical conclusions and ideas

Read:

- `AGENT_HANDOFF.md`
- `.thoughts/research/2026-07-23-iexec-wtf-winners-and-opportunity-space.md`
- `.thoughts/ideas/2026-07-22-iexec-wtf-idea-shortlist.md`
- `.thoughts/ideas/2026-07-23-iexec-wtf-product-ideas.md`
- `.thoughts/verification/2026-07-22-quietround-concept-audit.md`

Use them as a rejection and collision log, not as a shortlist to revive.

## Non-negotiable project-owner exclusions

Do not propose, rename, or reshape any of these:

- a wallet, wallet privacy layer, or wallet feature;
- a confidential token, token factory, token launcher, or generic asset wrapper;
- a new chain, protocol, SDK, developer platform, privacy middleware, or infrastructure layer;
- prediction markets, wagering, polls, governance voting, or community-notes/moderation products;
- ratings, leaderboards, benchmarks, certification, reputation, scoring, or “proof of quality” as
  the product;
- agent disputes, SLA enforcement, agent evaluators, service-quality escrow, or proof-of-service
  products;
- shares, equity, investment syndicates, or products whose value depends on securities rules;
- compliance, insurance, cross-border policy, legal adjudication, or regulatory approval;
- payroll, treasury policy, Safe policy, private swaps, lending/liquidation, donations, milestone
  escrow, CVE audit trails, or generic DeFi strategy agents;
- confidential OTC, sealed RFQ/Vickrey trading, broad RWA/tokenization operating systems, or
  confidential prediction markets—the previous-winner lanes.

Also reject any idea whose core loop requires:

- multiple independent organizations, juries, expert panels, reviewers, adjusters, or oracle
  committees;
- a new marketplace that only works after attracting both supply and demand;
- real-world enforcement, institutional onboarding, or a partner agreement;
- fake users, seeded votes, synthetic telemetry, mocked counterparties, or manually staged state;
- an AI agent acting as “independent proof” of data it generated itself;
- arbitrary private text, image, model, or custom TEE computation that Nox does not support;
- changing the integrated open-source protocol;
- a second wallet, faucet hunt, network switching, local setup, or multi-role browser choreography.

These are hard constraints even if a rejected category appears trendy or technically possible.

## Feasibility is a veto

Evaluate every candidate against this gate before scoring it. One hard failure discards the idea;
do not average it away.

A survivor must have:

1. **One recurring user job.** Name the user and what they already do today.
2. **One core action.** The value must be visible in one completed action, not a dashboard tour.
3. **A closed loop.** One user can start and finish it on the product and Ethereum Sepolia.
4. **A real integration.** Name the existing protocol, exact integration point, deployed or
   deployable contracts, and evidence that it can be used without modification.
5. **Real inputs.** State where every input comes from and why it is not invented. User-owned
   preferences, limits, budgets, and thresholds are legitimate when they are the actual product
   input. Reject self-attested claims presented as independent evidence.
6. **A small scope envelope.** Prefer one small application contract, one focused frontend, and one
   existing protocol integration. Estimate the count of major product surfaces and dependencies;
   do not design components or architecture.
7. **A one-builder estimate.** Give an honest best-case and likely build time, including testing,
   deployment, documentation, and video.
8. **A zero-friction judge path.** One browser session; email or embedded-wallet login and sponsored
   gas are acceptable. “30 seconds” means immediate comprehension, not a fake stopwatch.
9. **A post-hackathon reason to return.** State why the user would perform the action again.
10. **A 48-hour kill spike.** Describe—but do not execute—the smallest test that would disprove
    feasibility before the full build begins.

A core protocol, deployment, or API dependency must be source-verifiable during research. One
bounded implementation uncertainty may remain only if public evidence makes the path plausible and
the 48-hour kill spike can settle it. Multiple or fundamental unknowns fail the idea.

## Nox is the last gate, not the starting point

“It is confidential” is neither a product nor a benchmark. For every otherwise-feasible candidate,
state all of the following:

- the exact sensitive numeric value: `bool`, `uint16`, `uint256`, `int16`, or `int256`;
- why exposing that value causes a concrete product failure or user harm;
- the exact supported arithmetic, comparison, or `select` operation;
- the smallest result that may be revealed;
- the real contract action that the verified result authorizes;
- why a normal private database, client-side encryption, commit-reveal, or ordinary access control
  does not preserve the same product value;
- how the flow respects direct caller/application binding, replay protection, persistence,
  asynchronous resolution, and irreversible disclosure.

Reject the idea if Nox is decorative, if a simpler tool preserves the same value, or if the
downstream action still depends on trusting an unverified backend.

## Output

Produce these sections in order:

### A. Evidence audit

- current WTF facts, with facts, inferences, and unknowns separated;
- comparable-winner matrix with citations;
- recurring winner patterns and failure patterns;
- current shipping-product/workflow evidence;
- current collision map.

### B. Candidate graveyard

Record the five to ten most tempting candidates or product families that were considered and
killed. Give the exact failing gate. Do not manufacture extra candidates to reach ten; showing why
the serious options fail is part of the work.

### C. Survivors

Return at most five survivors, and fewer if fewer pass. For each include:

- plain-English product name;
- named shipping-product or workflow anchor, plus the exact recurring behavior borrowed;
- real user, recurring job, and reason to return;
- one core product action;
- verified problem and demand evidence;
- exact existing protocol and unchanged integration point;
- exact real input provenance;
- exact Nox input, operation, reveal, and proof-gated action;
- why Nox is indispensable rather than merely available;
- zero-friction judge flow;
- rough scope envelope without architecture;
- best-case and likely one-builder estimate;
- 48-hour kill spike;
- collision risk and explicit kill criteria;
- citations for every material external claim.

“Like X, but private/confidential” is not a valid anchor or differentiator. State how the user's
action or outcome materially changes.

For each survivor, first show `FEASIBILITY: PASS` or `FAIL`. Only a `PASS` may be scored. Then score
from 0–5:

- product reality;
- Nox indispensability;
- zero-friction tryability;
- originality after collision research.

Use the multiplicative hackathon test:

`feasibility pass × product reality × Nox indispensability × tryability`

Use originality only as a tie-breaker. Do not let novelty, trendiness, or privacy compensate for
weak feasibility.

### D. Verdict

- recommend up to three survivors, or say `NONE SURVIVE`;
- explain the recommendation in plain English;
- identify the single smallest feasibility question to answer next.

Save the evidence audit to
`.thoughts/research/YYYY-MM-DD-feasibility-first-winner-patterns.md` and the candidate graveyard,
survivors, and verdict to `.thoughts/ideas/YYYY-MM-DD-feasibility-first-candidates.md`. Update
`.thoughts/decisions/CURRENT.md` with the report links, survivor names, and the status
`Research complete; user selection pending`. Do not mark a concept selected or leading. Keep
Prompt 2 blocked until the user asks to compare or select the survivors.

Stop. Do not select architecture or start building.
