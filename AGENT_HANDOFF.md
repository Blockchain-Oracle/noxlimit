# Agent Handoff: Find the WTF Product Worth Building

## Mission

Use this repository to select an original, buildable iExec WTF Hackathon product. Do not assume the
organizer's wallet, DeFi, or treasury suggestions are mandatory. There is currently no front-runner.
Do not inherit QuietRound, SLA Lock, Proofline, AgentDispute, or any historical idea as a decision.
Start with the
[current decision](./.thoughts/decisions/CURRENT.md) and
[docs-first candidate report](./.thoughts/ideas/2026-07-23-nox-docs-first-candidates.md).

The corrected docs-first discovery is complete and currently returns `NONE SURVIVE`. It read the
component-rendered use-case catalog, allowed standalone products, researched nine candidates across
six major lanes, and adversarially killed its two initial near-survivors. Preserve both graveyards.
Use [`prompts/00-docs-first-product-discovery.md`](./prompts/00-docs-first-product-discovery.md) for
an independent rerun or when new evidence appears; do not treat its existence as evidence that
discovery is still unfinished.

An independent or future discovery pass should produce a cited evidence and candidate report with:

1. patterns from comparable privacy, ZK, FHE, confidential-computing, and protocol-integration
   hackathon winners;
2. current shipping-product and user-workflow evidence;
3. a refreshed collision scan;
4. a candidate graveyard with exact reasons each tempting idea failed;
5. no more than five candidates that pass every feasibility gate;
6. up to three recommendations, or an explicit `NONE SURVIVE` verdict.

Recommendations are not selections. Stop for user review before Prompt 2, product specification,
architecture, implementation planning, or code.

### Current corrected verdict

No product has been selected. The two strongest docs-first near-misses failed:

- **Private Quote-to-Pay:** PaySec already exposes the same product surface; current shared
  optimized cUSDC does not grant a receiver the transferred-amount handle needed for
  amount-sensitive callback logic; workarounds add token fragmentation or broad operator authority;
  the honest fresh-user path needs funding, wrapping, authorization, Nox wait, and finalization.
- **Confidential Closed-Loop Gift Card:** current Nox can implement the balance math, but a merchant
  database preserves the same closed-loop user outcome; independent merchant settlement expands it
  into a payment network; Sigill and FHE2P already occupy confidential gift-card checkout; real
  consumer cards also restore policy scope.

Generic native prediction markets remain excluded because DarkOdds already built them. Do not
advance Prompt 2 unless a new candidate passes every hard gate.

## Canonical facts to inherit

### What the hackathon wants

- A clean Nox integration with an impactful open-source protocol, or a truly innovative Nox
  product/integration.
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
  native cloned markets, encrypted wagers/pools, oracle resolution, TEE proportional payout math,
  and selective-disclosure attestations. Its Polymarket integration was read-only; it did not proxy
  trades.

Their canonical ranking is on the
[VIBE winners page](https://dorahacks.io/hackathon/vibe-coding-iexec/winner).

These are exclusion zones. Selective disclosure and “encrypted amounts” are now baseline mechanics,
not an original product thesis.

### Official Nox product catalog

The cloned documentation source names:

- Payments & Payroll
- DeFi & Lending
- Vaults & Yields
- OTC & Trading
- Prediction Markets
- RWA & Real Estate
- Fundraising / VC
- Identity
- NFT
- Invoicing

The generated `llms-full.txt` omits this grid and the five product cards because they are Vue
components. Always read
`.thoughts/raw/iexec-nox-org/documentation/src/getting-started/use-cases.md`.

Evidence levels differ:

- cToken and encrypted-position cVault: linked demos/source;
- Piggy Bank, ERC-7984 token/wrapper/swap, Hardhat: executable building blocks;
- encrypted strategy, capital allocator, RWA: concept pages;
- prediction markets, Identity, NFT, fundraising/VC, invoicing: category labels.

Use these as research lanes, not as ready ideas or proof of current implementations.

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

The reusable confidential-computation spine is:

`direct encrypted input → replay guard → persisted encrypted state → arithmetic/compare/select → reveal one minimal result → proof-gated real action`

A standalone Nox product may own that final action itself; it does not need an artificial
third-party protocol call.

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

- [Docs-first correction](./.thoughts/research/2026-07-23-nox-docs-first-correction.md)
- [Docs-first product research](./.thoughts/research/2026-07-23-docs-first-product-research.md)
- [Docs-first candidate report](./.thoughts/ideas/2026-07-23-nox-docs-first-candidates.md)
- [Nox product/use-case map](./.thoughts/wiki/nox-use-case-map.md)
- [Feasibility-first winner research](./.thoughts/research/2026-07-23-feasibility-first-winner-patterns.md)
- [Feasibility-first candidate graveyard](./.thoughts/ideas/2026-07-23-feasibility-first-candidates.md)
- [Current product decision](./.thoughts/decisions/CURRENT.md)
- [Nox protocol reality](./.thoughts/wiki/nox-protocol.md)
- [Nox developer stack](./.thoughts/wiki/nox-developer-stack.md)
- [Nox integration patterns](./.thoughts/wiki/nox-integration-patterns.md)
- [Known contradictions](./.thoughts/wiki/nox-known-contradictions.md)
- [Source manifest](./.thoughts/sources/source-manifest.md)

Use [the staged prompts](./prompts/README.md) rather than improvising a broad “find an idea” prompt.
