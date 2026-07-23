# iExec-Nox domain wiki

Last verified: **2026-07-23**

This wiki is the implementation-facing map of the local iExec-Nox research corpus. It separates
live/released behavior from forward-looking `main` code and from contradictory documentation.

## Current product-selection context

- [2026-07-23 docs-first correction](../research/2026-07-23-nox-docs-first-correction.md)
- [2026-07-23 docs-first product research](../research/2026-07-23-docs-first-product-research.md)
- [2026-07-23 docs-first candidate report](../ideas/2026-07-23-nox-docs-first-candidates.md)
- [2026-07-23 winner and opportunity audit](../research/2026-07-23-iexec-wtf-winners-and-opportunity-space.md)
- [Current product decision](../decisions/CURRENT.md)
- [Agent handoff](../../AGENT_HANDOFF.md)

No product is selected and no current candidate survives every gate. Some technical pages below
retain QuietRound examples because they are concrete illustrations of Nox integration constraints,
not because the product is a backup or recommendation.

## Start here

- [Repository map](./nox-repository-map.md) — what all 20 public repositories do and which ones matter to an application.
- [Product and use-case map](./nox-use-case-map.md) — the complete official category catalog,
  shipping references, concept-only pages, and current primitive boundaries.
- [Protocol reality](./nox-protocol.md) — data flow, trust boundary, handles, ACLs, and asynchronous execution.
- [Developer stack](./nox-developer-stack.md) — exact package pins, networks, tooling, and live deployment state.
- [Integration patterns](./nox-integration-patterns.md) — application patterns validated by source and official POCs, including QuietRound guidance.
- [Known contradictions](./nox-known-contradictions.md) — stale or conflicting claims and the evidence-based resolution for each.

## Source corpus

- [Exact organization, release-pin, and winner source manifest](../sources/source-manifest.md)
- [Deep current-reality research](../research/2026-07-22-iexec-nox-org-deep-dive.md)
- [QuietRound verification audit](../verification/2026-07-22-quietround-concept-audit.md)
- [Nox live Sepolia snapshot](../verification/2026-07-22-nox-live-snapshot.md)
- [Research log](./log.md)

## Evidence rule

For build decisions, prefer live chain state, then exact installed release source, then deployment
manifests, then `main`, then docs prose. Do not copy APIs from `main` into a project pinned to the
current npm packages without checking that the deployed NoxCompute proxy supports them.

For product discovery, inspect the cloned documentation source as well as `llms-full.txt`. The
generated LLM corpus omits Vue-rendered use-case cards and category grids.
