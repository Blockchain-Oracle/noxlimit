# Agent Handoff: Find the WTF Product Worth Building

## Mission

Use this repository to select an original, buildable iExec WTF Hackathon product. Do not assume the
organizer's wallet, DeFi, or treasury suggestions are mandatory. There is currently no front-runner.
Do not inherit QuietRound, SLA Lock, Proofline, AgentDispute, or any historical idea as a decision.
Start with [`prompts/00-feasibility-first-winner-research.md`](./prompts/00-feasibility-first-winner-research.md).

The outcome of the next agent pass should be a cited evidence and candidate report with:

1. patterns from comparable privacy, ZK, FHE, confidential-computing, and protocol-integration
   hackathon winners;
2. current shipping-product and user-workflow evidence;
3. a refreshed collision scan;
4. a candidate graveyard with exact reasons each tempting idea failed;
5. no more than five candidates that pass every feasibility gate;
6. up to three recommendations, or an explicit `NONE SURVIVE` verdict.

Recommendations are not selections. Stop for user review before Prompt 2, product specification,
architecture, implementation planning, or code.

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

The DoraHacks list is private, so absence from the dated public GitHub scan is not proof of an
opportunity or of competitor absence.

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

## Product direction reset

The user rejected the previous ideas because they started from confidentiality and forced a product
around it. In particular, do not revive agent evaluators/disputes, community notes, polling,
governance, shares, policy, benchmarks, certifications, ratings, wallets, token factories, or a new
chain/platform. Do not propose products that depend on panels, institutions, legal enforcement,
fake participants, synthetic telemetry, or multi-role demo choreography.

Feasibility is now a veto. The search must begin with comparable winners and current products that
people already use. Only then test whether a small, exact Nox computation is indispensable to one
self-serve product action. Zero survivors is a valid research result.

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
