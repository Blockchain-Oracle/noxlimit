# Prompt 0: Docs-First Nox Product Discovery

> **Completed and inactive.** Do not run this prompt while `CURRENT.md` keeps NoxLimit selected.
> Run it only if the user explicitly reopens product discovery and the decision record is updated.

You are a skeptical product researcher helping one builder choose an iExec WTF Hackathon product.
The previous search was incomplete because it read Nox mainly as a technical constraint and missed
the official component-rendered use-case catalog. Correct that failure without swinging to the
opposite mistake of treating every documentation label as a ready or original product.

Do not write code, architecture, a product specification, or an implementation plan. Zero survivors
is valid.

## Objective

Find at most three products that simultaneously:

- solve a named, recurring problem through one legible user action;
- use current Nox primitives indispensably in a real state transition;
- can be built end to end by one builder during the remaining hackathon;
- feel like a product rather than a primitive showcase;
- can be understood and tried in one browser session;
- avoid previous winners, previous VIBE submissions, and visible current WTF projects.

Evaluate both allowed shapes:

1. a clean Nox confidentiality layer over an unchanged open-source protocol; or
2. a standalone, innovative Nox product.

Do **not** require a third-party protocol action from a standalone Nox product.

## Read first

Read these files in order:

1. `README.md`
2. `AGENT_HANDOFF.md`
3. `.thoughts/decisions/CURRENT.md`
4. `.thoughts/research/2026-07-23-nox-docs-first-correction.md`
5. `.thoughts/wiki/nox-use-case-map.md`
6. `.thoughts/wiki/nox-protocol.md`
7. `.thoughts/wiki/nox-developer-stack.md`
8. `.thoughts/wiki/nox-integration-patterns.md`
9. `.thoughts/wiki/nox-known-contradictions.md`
10. `.thoughts/sources/source-manifest.md`
11. `.thoughts/research/2026-07-23-feasibility-first-winner-patterns.md`
12. `.thoughts/ideas/2026-07-23-feasibility-first-candidates.md`

Then read the current local documentation source:

- `.thoughts/raw/iexec-nox-org/documentation/src/getting-started/use-cases.md`
- every page under
  `.thoughts/raw/iexec-nox-org/documentation/src/getting-started/use-cases/`
- the relevant guide/reference pages for any shortlisted mechanism;
- the relevant source under
  `.thoughts/raw/iexec-nox-org/nox-product-poc/` and
  `.thoughts/raw/iexec-nox-org/nox-confidential-contracts/`.

Do not use `llms-full.txt` alone. It drops the Vue-rendered product cards and category grid.

For any SDK, API, library, framework, CLI, or cloud-service question, follow `AGENTS.md` and fetch
current documentation through Context7 before relying on API details.

## Official search space

The source explicitly endorses:

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

It also contains detailed product theses for an encrypted-strategy vault, DeFi capital allocator,
and RWA issuance, plus shipping cToken and encrypted-position cVault references.

Use this catalog to widen research. It is not a list of ideas to copy.

For every docs-led direction, classify the supporting evidence:

- shipping demo and source;
- executable building block;
- detailed concept page only;
- one-line category endorsement;
- future/“Coming Soon” capability.

## Known collision facts

Do not repeat these previous winners:

- Diam: confidential OTC/RFQ/Vickrey trading.
- RWAOS: broad RWA issuance/compliance/operating system.
- DarkOdds: a **native** Nox prediction market with its own factory, markets, encrypted wagers,
  resolution, and proportional payouts. Its Polymarket integration was display-only.

A generic native prediction market on Ethereum Sepolia is not a gap. Only consider a
prediction-related candidate if the user, recurring job, mechanism, state transition, and product
outcome are all materially different. Changing chain, UI, number of outcomes, or removing the
Polymarket display layer is not differentiation.

Previous source-visible VIBE projects also occupy native private lending, confidential NFTs and NFT
marketplaces, invoice factoring, yield vaults, crowdfunding, grants, VC, RWA lending, payroll,
hedging, dark pools, and private-credit deal rooms. Recheck them rather than assuming a broad
category is empty.

Refresh the current July WTF collision scan before generating finalists. The public DoraHacks list
is private, so no-result searches are evidence, not proof.

## Project-owner exclusions

Do not revive, rename, or lightly repackage:

- wallets, wallet features, confidential-token factories, launchers, or generic wrappers;
- payroll clones;
- new chains, protocols, SDKs, platforms, or broad infrastructure;
- shares/equity, compliance operating systems, insurance, policy, legal, or regulatory workflows;
- benchmarks, certifications, ratings, scores, reputation, agent evaluation, or disputes;
- polling, governance, community notes, or moderation;
- generic Safe policy, generic treasury policy, generic swaps, generic escrow, or generic
  confidential prediction markets;
- products that require panels, institutions, fake users, synthetic telemetry, staged
  counterparties, or multi-role browser choreography to demonstrate value.

Natural two-party products such as payment or invoicing are not automatically banned. They must
still offer a pre-existing, self-serve judge action that does not require coordinating a second live
person or wallet.

## Research before ideation

### 1. Recheck the challenge

Verify the current rules, judging criteria, required artifacts, deadline/timezone, Ethereum Sepolia
requirement, and both allowed product shapes from organizer sources. Separate facts, inferences, and
unknowns.

### 2. Refresh collisions

Inspect:

- the three previous winners at their pinned commits;
- prior VIBE repositories relevant to every category you investigate;
- current public WTF repositories and package-import/code searches;
- current shipping competitors that already solve the same job.

Record the closest collision for every candidate.

### 3. Find narrow jobs inside the official categories

Research real products and current user behavior before naming ideas. A candidate must begin with:

- a specific recurring user;
- something they already do;
- one public-chain visibility failure that harms the result;
- one action that completes visibly.

Do not begin with “hide X” or “make X confidential.”

### 4. Test exact Nox feasibility

Current private values are `bool`, `uint16`, `uint256`, `int16`, and `int256`. Current operations
are arithmetic, safe arithmetic, comparisons, `select`, transfer, mint, and burn.

For each candidate, write the exact path:

`real input → encryptInput → direct fromExternal → confidential operations → persisted state → minimal reveal if needed → one-shot real action`

State:

- the exact sensitive value and type;
- every Nox operation;
- which handles cross transactions;
- who can decrypt each handle;
- the minimal revealed output;
- replay protection;
- the public final action;
- what remains public;
- why a database, ordinary encryption, commit–reveal, access control, or a random secret does not
  preserve the same user outcome.

Kill any idea that requires arbitrary Runner code, arbitrary encrypted text/files/metadata, current
custom `swap`/`borrow`/`repay` primitives, revocable historical ACLs, anonymity, invisible timing,
or unchanged Aave/Uniswap contracts consuming encrypted handles directly.

## Feasibility gate

One hard failure kills the idea; do not average it away.

A survivor needs:

1. **Real user and recurring job**
2. **One core action**
3. **Concrete public-visibility harm**
4. **Current-operation feasibility**
5. **Nox indispensability**
6. **Real input provenance**
7. **A real final state transition**
8. **One-builder scope**
9. **A judge path with no local setup, faucet hunt, network switch, or second wallet**
10. **A reason to return after the hackathon**
11. **No direct winner/current-project collision**
12. **At most one bounded unknown that a 48-hour disposable spike can resolve**

For a standalone product, “real final state transition” means its own deployed Nox application does
something economically or functionally complete. It need not call a third-party protocol.

“Try in 30 seconds” means immediate comprehension and a single focused interaction. Do not promise a
hard 30-second settlement SLA; Nox is asynchronous.

## Required candidate breadth

Seriously investigate six to ten concrete candidates across at least four of:

- invoicing/payments;
- lending/DeFi;
- vaults/yield;
- Identity;
- NFT;
- a materially differentiated prediction product.

This is a research breadth requirement, not a survivor quota. Put failed concepts in the graveyard.

## Output

### A. Docs-to-product evidence map

Summarize the relevant official category, evidence maturity, current operations, and reference code
for every lane investigated.

### B. Collision map

List the closest previous winner, previous submission, current WTF project, and shipping product for
each lane.

### C. Candidate graveyard

For every serious failed candidate include:

- product and exact user action;
- why it initially looked promising;
- exact Nox mechanism;
- exact failing gate;
- closest collision;
- smallest fact that would revive it, if any.

### D. Survivors

Return at most five, preferably fewer. Start each with `FEASIBILITY: PASS` or `FAIL`; only a `PASS`
is a survivor.

For each `PASS`, include:

- plain-English name and one-sentence pitch;
- recurring user/job and product anchor;
- exact 30-second judge action;
- real problem/demand evidence;
- exact input → operation → reveal → action path;
- why Nox is indispensable;
- current reference code reused;
- what stays public;
- best-case and likely one-builder estimate;
- closest collision and material differentiation;
- 48-hour kill spike;
- explicit kill criteria;
- citations.

Score each survivor 0–5 on:

- product reality;
- current-operation feasibility;
- Nox indispensability;
- 30-second tryability;
- originality after collision research.

Use the multiplicative test:

`feasibility pass × product reality × Nox indispensability × tryability`

Originality is a tie-breaker, not compensation for weak feasibility.

### E. Verdict

Recommend at most three or say `NONE SURVIVE`. Identify the single smallest uncertainty to test
next. Recommendations are not selections.

Save:

- research to `.thoughts/research/YYYY-MM-DD-docs-first-product-research.md`;
- candidates to `.thoughts/ideas/YYYY-MM-DD-docs-first-candidates.md`;
- the durable state to `.thoughts/decisions/CURRENT.md`.

Stop for user review. Do not start Prompt 2, architecture, or implementation.
