# Audit and Decision Gates

**Date:** 2026-07-25  
**Purpose:** Prevent old research, mismatched risk standards, or reviewer disagreement from silently
resetting the project.

## Authority Order

When artifacts conflict, use this order:

1. the user's latest explicit direction;
2. [`CURRENT.md`](./CURRENT.md);
3. the current canonical architecture/spec/plan named by `CURRENT.md`;
4. the newest verification memo for the exact gate being evaluated;
5. research, source manifests, and domain wiki;
6. historical audits, candidate reports, and prompts.

A newer file is not automatically authoritative merely because of its date. It must address the
same gate and be adopted by `CURRENT.md`. Historical artifacts remain evidence; their workflow
commands do not remain active after supersession.

## Mandatory Context-Reconciliation Gate

Before research, selection, architecture, planning, review, or implementation:

1. read `AGENTS.md`, `CURRENT.md`, this file, and the named canonical artifact;
2. inspect `git status`, relevant history, and the existing `.thoughts/` inventory;
3. write a short working snapshot:
   - objective;
   - canonical authority;
   - already established;
   - active decisions;
   - superseded/history;
   - genuine unknowns;
   - next authorized action;
4. search the corpus before claiming research or architecture is missing;
5. reconcile contradictory gates before mutating product state.

Do not re-research established facts or redesign an accepted direction unless new evidence attacks a
load-bearing assumption. Do not let an old `STOP`, `DROP`, or “do not build” instruction override a
newer adopted decision.

## Separate the Gates

| Gate | Question | Valid effect |
|---|---|---|
| Product direction | Is this the problem/product Abu wants to pursue? | Select, reshape, or graveyard a direction |
| Hackathon critical path | Can the smallest honest, real Sepolia loop work? | User architecture review authorizes the bounded spike; its verdict authorizes or blocks the polished build |
| Implementation readiness | Are architecture, scope, integrations, and tests concrete enough? | Authorize a phase or identify exact missing decisions |
| Submission readiness | Does the judged path work and satisfy the published rules? | Authorize submission work |
| Production hardening | Is this safe and economic for real mainnet capital? | Create a post-hackathon backlog; do not retroactively veto the hackathon unless the same issue obviously breaks or loses assets in the demo |

An audit must name the gate it is judging. It cannot turn lack of product-market-fit proof into a
smart-contract failure, or production-grade hardening into a hackathon selection veto.

## Current Hackathon Risk Standard

Before the polished build can begin, the disposable spike must prove:

- a real, non-mock Ethereum Sepolia state transition;
- immutable order/action/recipient binding;
- replay protection and one-shot consumption;
- atomic limit enforcement;
- cancel, expiry, refund, and no obvious asset loss;
- browser-off behavior;
- an evidence-backed privacy and trust-boundary statement.

Before submission, the built product must additionally prove:

- a self-serve judge path without local setup, faucet hunt, or a second human;
- real funding/onboarding or an honestly documented product-provided testnet path;
- a functional frontend and the current published submission requirements.

Record, but do not use as automatic pre-build vetoes:

- professional auditing or formal verification;
- production mainnet availability;
- decentralized workers;
- organic liquidity;
- production manipulation economics;
- latency SLA distributions;
- complete multi-market/order-type breadth.

## Reviewer Disagreement

An external reviewer contributes evidence and a recommendation. It does not silently replace the
user's selection or `CURRENT.md`.

When reviewers disagree:

1. list the exact disputed claims;
2. classify each as fact, inference, product preference, technical unknown, or risk-standard choice;
3. recheck only the load-bearing disputed evidence;
4. apply the current gate's standard;
5. update `CURRENT.md` once with the adopted result;
6. mark losing verdicts as historical at their top;
7. update routing files and prompts in the same change.

No repeated broad audit is allowed without new evidence or an explicit user request.

## Mutation Rule

Every decision-changing edit must update together:

- `CURRENT.md`;
- the canonical architecture/spec/plan link;
- `README.md` and `AGENT_HANDOFF.md` routing;
- `AGENTS.md` snapshot and gate language;
- `prompts/README.md` and the next authorized prompt;
- a dated verification/decision memo explaining the change.

Run a corpus search for stale active language such as `not selected`, `no product is selected`,
`remain blocked`, `pending user architecture review`, `Prompt 3 blocked`, `Prompt 3 disallowed`,
`do not design architecture`, and superseded verdict commands before committing. Dated history may
retain old facts only when a prominent current-authority note prevents it from routing new work.
