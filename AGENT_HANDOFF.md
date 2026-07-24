# Agent Handoff: Find the WTF Product Worth Building

## Mission

Use this repository to select an original, buildable iExec WTF Hackathon product. Do not assume the
organizer's wallet, DeFi, or treasury suggestions are mandatory. **No product is selected, and
there are zero technically verified survivors.** NoxLimit is one unselected conditional candidate
at **`KEEP AND VERIFY`**. An independent audit returned `DROP`; a hackathon-calibrated reassessment
found material errors in the decisive demand, substitute, leakage, and sponsor-fit claims, and an
independent same-day recheck **reaffirmed** `KEEP AND VERIFY` from primary source and live rules
evidence. Do not inherit QuietRound, SLA Lock, Proofline, AgentDispute, or any historical idea as a
decision, and do not inherit NoxLimit as already feasible or selected. Start with the
[current decision](./.thoughts/decisions/CURRENT.md), the
[independent audit](./.thoughts/verification/2026-07-24-noxlimit-independent-audit.md), the
[reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md), and the
[reaffirmation recheck](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md).

The corrected docs-first discovery is complete and currently returns `NONE SURVIVE`. It read the
component-rendered use-case catalog, allowed standalone products, researched nine candidates across
six major lanes, and adversarially killed its two initial near-survivors. Preserve both graveyards.
Use [`prompts/00-docs-first-product-discovery.md`](./prompts/00-docs-first-product-discovery.md) for
an independent rerun or when new evidence appears; do not treat its existence as evidence that
discovery is still unfinished. The Prompt 1A reassessment has run and is retained as history; after
user direction, only its bounded Prompt 3 verification slice is authorized.

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

### Current decision state

No product has been selected and no candidate is technically verified. NoxLimit is one conditional
candidate; the two strongest docs-first near-misses still failed:

- **Private Quote-to-Pay:** PaySec already exposes the same product surface; current shared
  optimized cUSDC does not grant a receiver the transferred-amount handle needed for
  amount-sensitive callback logic; workarounds add token fragmentation or broad operator authority;
  the honest fresh-user path needs funding, wrapping, authorization, Nox wait, and finalization.
- **Confidential Closed-Loop Gift Card:** current Nox can implement the balance math, but a merchant
  database preserves the same closed-loop user outcome; independent merchant settlement expands it
  into a payment network; Sigill and FHE2P already occupy confidential gift-card checkout; real
  consumer cards also restore policy scope.

Generic native prediction markets remain excluded because DarkOdds already built them.

Research identified a narrower product-shaped hypothesis, **NoxLimit**: one fixed-size confidential
buy limit against a real onchain outcome-share AMM.

**Current outcome (2026-07-24): `KEEP AND VERIFY`, unselected.**

- Conditional execution is a shipping workflow, and public onchain order flow has structural
  pre-trade exposure. Direct evidence that prediction traders specifically value hiding only this
  threshold is still unknown.
- A backend can reproduce browser-off, same-chain, contract-custodied execution, but it receives
  the raw threshold. A local bot can preserve threshold privacy but needs an always-on process and
  gas-paying signing path.
- Unchanged `FPMM.buy` takes plaintext `minOutcomeTokensToBuy`, so the limit-equivalent is public at
  fill. However, released Nox `select + addViewer` and Handle SDK private `decrypt` make a
  success-only publication flow plausible; failed evaluations do not inherently need explicit
  public proofs, although public timing/non-action inference remains.
- Prediction markets are “already seen,” creating a heavy originality burden, but are not banned.
  Creativity is tied with end-to-end/no-mock at the highest displayed weight.
- `FPMM.buy` natively enforces atomic minimum output. Nox is live only on Ethereum Sepolia and
  Arbitrum Sepolia; no production mainnet exists, but Ethereum Sepolia is the required hackathon
  chain.

Prompt 2 remains premature. Prompt 3 is allowed only as the 24–36-hour disposable privacy +
real-pool verification defined by the reassessment. Do not start the full product until it passes.

## Canonical facts to inherit

### What the hackathon wants

- A clean Nox integration with an impactful open-source protocol, or a truly innovative Nox
  product/integration.
- A product-shaped result, not a proof of concept.
- Privacy layered over public infrastructure without modifying the underlying protocol.
- A live end-to-end path without mock data.
- Ethereum Sepolia deployment, a functional frontend, a public repository, complete documentation,
  `feedback.md`, an X post, and a four-minute maximum video.
- Deadline verified 2026-07-24 from the DoraHacks API `end_time` epoch 1785621540 =
  **2026-08-01 21:59:00 UTC** (`is_extended:false`). Required chain: **Ethereum Sepolia** (⭐⭐
  criterion) — note prior winners were on Arbitrum Sepolia. Required: functional frontend, public
  repo + docs, `feedback.md`, X post tagging `@iEx_ec`, ≤4-min demo video, end-to-end without mock
  data.
- On 2026-07-24 the API showed 13 BUIDLs and 80 hackers (81 at the evening recheck), but the
  submission list is private. DoraHacks challenged the default command-line request; a browser-like
  user agent reached the official API, and a rendered browser can inspect the page.
- Prediction markets are not prohibited, but the Innovative track lists them as "already seen … we
  want what nobody has shipped yet." Creativity and end-to-end/no-mock are tied at the highest
  displayed weight. The track's published `judging_criteria` API field is empty (verified live
  2026-07-24) — the steer is description prose, not a scoring formula.
- The current official API has `is_enabled_ask_hackers:true` and a required registration question
  instructing the hacker to complete iExec Hello World and submit the wallet address used.
  `register_form_url:null` and `has_onboarding:false` do not negate that question.

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

## NoxLimit verification boundary (`KEEP AND VERIFY`, 2026-07-24)

> The independent audit returned `DROP`, but its decisive privacy claim—that every failed
> evaluation must have an explicit public proof—is contradicted by released source: Handle SDK
> `decrypt` privately serves any `isViewer`-authorized address with no transaction and no public
> proof, and a contract-side Nox primitive skeleton compiles against released v0.2.4. The fixture
> did not cover the Handle SDK, real pool, adapter, asset forwarding, expiry, or refund. Public
> observers may still infer a failed evaluation from timing and non-action (each evaluation emits
> a public `ViewerAdded` event), so the complete live boundary remains spike-required. Demand
> remains unvalidated and the privacy boundary remains narrow. See the
> [independent audit](./.thoughts/verification/2026-07-24-noxlimit-independent-audit.md), the
> [reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md), and
> the [reaffirmation recheck](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md).

The audited product question was not “should we build a prediction market?” It was:

> Does an active outcome-share trader have a valuable need for a confidential resting threshold,
> and can the current released Nox stack turn that threshold into one safe, browser-off, real pool
> trade before the deadline?

An onchain outcome-share pool holds redeemable `YES` and `NO` assets and quotes trades from its
reserves. A prediction oracle resolves which asset wins; the AMM quote separately decides whether
the order's limit is executable. The first substrate candidates are unchanged Gnosis Conditional
Tokens/FPMM and Seer outcomes with Uniswap V3. Neither is selected.

The smallest credible version is one curated BTC market, one public fixed order size and side, one
confidential buy limit, cancellation, expiry, refund, resolution, and redemption. A genuine
two-threshold stop-limit, hidden side or size, sell orders, multiple markets, LP tooling, a CLOB,
and a market factory are out of first scope.

The final action must remain:

`encryptInput → fromExternal → persisted handle → confidential comparison with the fixed-input
quote sampled in the evaluation-request transaction → threshold-derived public minimum output →
application-bound proof → replay-guarded one-shot minimum-output-protected outcome-share buy`

The worker may advance the state and may learn one readiness bit per permitted evaluation plus the
successful `minOut`, but it must not receive the raw resting threshold, change immutable order
fields, fill worse than the committed limit, redirect proceeds, or steal collateral. It may still
delay or censor. If the browser must remain open, if the live viewer path forces failed
evaluations public, or if the proof cannot safely cause one real action, drop the hypothesis.

A decrypted `ready` boolean plus a generic slippage setting does not enforce the secret limit after
Nox's asynchronous delay. The likely exact design must reveal a threshold-derived minimum output at
fill and bind it to the one-shot AMM call. If that cannot be proven with the current release, exact
private-limit semantics fail.

FPMM sends ERC-1155 shares to its caller. An order adapter would therefore receive the shares
before forwarding them to the immutable recipient and must implement the receiver interface. The
worker gets no token approval. If a submitted proof reveals the minimum output but the AMM buy
reverts, the order is disclosed/refundable rather than confidential-pending again.

## Required reading

- [NoxLimit product and market reality](./.thoughts/research/2026-07-24-noxlimit-product-and-market-reality.md)
- [NoxLimit product hypothesis](./.thoughts/ideas/2026-07-24-noxlimit-product-hypothesis.md)
- [Independent NoxLimit audit](./.thoughts/verification/2026-07-24-noxlimit-independent-audit.md)
- [Hackathon-calibrated reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md)
- [Reaffirmation recheck](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
- [Reassessment prompt](./prompts/01a-hackathon-calibrated-noxlimit-reassessment.md)
- [Independent NoxLimit audit prompt](./prompts/01-independent-noxlimit-audit.md)
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
