# Agent Handoff: Find the WTF Product Worth Building

## Mission

Use this repository to select an original, buildable iExec WTF Hackathon product. Do not assume the
organizer's wallet, DeFi, or treasury suggestions are mandatory. Do not inherit QuietRound as a
decision. Treat **SLA Lock** as the leading hypothesis that must survive adversarial comparison.

The outcome of the next agent pass should be a cited decision memo with:

1. a refreshed collision scan;
2. six to ten product candidates;
3. a ranked top three;
4. one recommended concept with explicit kill criteria;
5. the smallest technical feasibility question that must be answered before planning.

Stop before product specification, architecture, implementation planning, or code.

## Canonical facts to inherit

### What the hackathon wants

- A clean Nox integration with an impactful open-source protocol, or a truly innovative Nox
  integration.
- A product-shaped result, not a proof of concept.
- Privacy layered over public infrastructure without modifying the underlying protocol.
- A live end-to-end path without mock data.
- Ethereum Sepolia deployment, a functional frontend, a public repository, complete documentation,
  `feedback.md`, an X post, and a four-minute maximum video.
- The current DoraHacks page displayed a deadline of `2026/08/01 21:59`; verify the timezone before
  relying on it.
- On 2026-07-23, the page showed 13 submissions and 74 hackers, but the submission list was private.

### Previous winners

- [1st — Diam, Best Confidential DeFi](https://dorahacks.io/buidl/43636):
  confidential OTC, sealed RFQ/Vickrey pricing, ERC-7984 settlement.
- [2nd — RWAOS, Best Institutional Architecture](https://dorahacks.io/buidl/43431):
  confidential RWA issuance, transfer controls, selective disclosure, audit operations.
- [3rd — DarkOdds, Best Confidential Prediction Market](https://dorahacks.io/buidl/43656):
  encrypted wagers, TEE proportional payout math, selective-disclosure attestations.

Their canonical ranking is on the
[VIBE winners page](https://dorahacks.io/hackathon/vibe-coding-iexec/winner).

These are exclusion zones. Selective disclosure and “encrypted amounts” are now baseline mechanics,
not an original product thesis.

### Visible July 2026 crowd

The public GitHub scan found 20 July-created Nox repositories. Crowded lanes include:

- eight payroll projects;
- four Safe/budget/policy products;
- two private Uniswap routing products;
- milestone escrow and CVE audit trail;
- Aave credit/liquidation;
- private DeFi strategy agents;
- confidential donations/treasury.

No repository or code-search hit was found for Nox with ERC-8183, ERC-8004, agent-job SLA
evaluation, or service-quality escrow. The DoraHacks list is private, so absence from GitHub is not
proof of absence.

## Nox reality that constrains every idea

- Supported confidential values are `bool`, `uint16`, `uint256`, `int16`, and `int256`.
- Nox supports arithmetic, safe arithmetic, comparisons, and conditional selection.
- Inputs are bound to owner wallet and consuming application. The reliable route is:
  `wallet → application → Nox.fromExternal`.
- Router-first encrypted ingestion can fail because `msg.sender` no longer matches the proof owner.
- Computation is asynchronous. A live multi-operation Sepolia transaction resolved in roughly
  12 seconds, which proves the shape, not an SLA.
- Every cross-transaction handle must be persisted explicitly.
- Viewer and public disclosure grants are effectively irreversible on the live version.
- Input and public-decryption proofs need application-level replay guards.
- Nox is confidentiality, not anonymity. Browser, Gateway TEE, and Runner TEE trust boundaries must
  be described honestly.
- Use exact current pins from the wiki; default branches contain unreleased APIs.

The reusable product spine is:

`direct encrypted input → replay guard → persisted encrypted state → arithmetic/compare/select → reveal one minimal result → proof-gated real action`

## Current front-runner

**SLA Lock — confidential SLA enforcement for agent commerce**

It is like ERC-8183 agent-job escrow with an evaluator that can decide from sensitive operational
telemetry without publishing that telemetry. In the proposed, not-yet-verified flow, approved
monitors encrypt latency, cost, error rate, completion, and quality measurements. Nox evaluates the
policy and reveals only pass/fail. The proof-bound evaluator then completes or rejects the unchanged
ERC-8183 job, releasing payment or refund. An optional ERC-8004 validation record would make the
result composable with agent reputation.

Why it currently leads:

- Draft ERC-8183 was created in February 2026 for agent-job escrow and explicitly allows a
  smart-contract evaluator that aggregates off-chain signals.
- ERC-8004 explicitly includes TEE validation and currently models public metrics such as quality,
  uptime, response time, success rate, revenue, and trading yield.
- x402 and agent-service discovery make the user and market legible.
- Nox controls a real economic transition rather than hiding a decorative field.
- The judge path can be one sponsored “run a real agent job” action—no second wallet or manual faucet.
- It avoids every previous-winner lane and the visible current clusters.

Kill it if any of these becomes true:

- the agent telemetry is invented or self-reported rather than signed by a credible monitor;
- the ERC-8183 evaluator cannot complete/reject an unchanged job on Ethereum Sepolia;
- the organizer does not accept an integration with an unmodified draft ERC reference
  implementation as the required open-source protocol integration;
- the judge path requires local setup, multiple wallets, or manual funding;
- the Nox proof is not bound to one stored job evaluation and one terminal action;
- a hidden current submission already implements the same confidential agent-SLA evaluator.

## Required reading

- [Winner and opportunity research](./.thoughts/research/2026-07-23-iexec-wtf-winners-and-opportunity-space.md)
- [Revised product ideas](./.thoughts/ideas/2026-07-23-iexec-wtf-product-ideas.md)
- [Current product decision](./.thoughts/decisions/CURRENT.md)
- [Nox protocol reality](./.thoughts/wiki/nox-protocol.md)
- [Nox developer stack](./.thoughts/wiki/nox-developer-stack.md)
- [Nox integration patterns](./.thoughts/wiki/nox-integration-patterns.md)
- [Known contradictions](./.thoughts/wiki/nox-known-contradictions.md)
- [Source manifest](./.thoughts/sources/source-manifest.md)

Use [the staged prompts](./prompts/README.md) rather than improvising a broad “find an idea” prompt.
