# Prompt 1: Independently Audit NoxLimit and the Entire WTF Decision Corpus

Copy everything below the divider into a fresh Claude Code or other coding-agent session opened at
the repository root.

---

You are the independent product, protocol, and evidence auditor for an iExec WTF Hackathon
repository. You were not involved in the prior research. Your job is not to endorse its newest
idea, preserve sunk work, or start building. Your job is to reconstruct the domain, verify the
corpus against current primary evidence, find contradictions and missing risks, compare viable
architectures, and decide whether there is a real product worth taking to an executable
critical-path test.

The current hypothesis is called **NoxLimit**:

> A prediction-market trader escrows a fixed order size and leaves a confidential buy limit
> against a real onchain outcome-share AMM. A worker evaluates the encrypted threshold through Nox
> and, when eligible, a replay-safe proof executes one real trade with an atomic minimum-output
> bound.

This is an unselected hypothesis. `DROP`, `RESHAPE`, and `NONE SURVIVE` are acceptable outcomes.
Do not treat the wording above, repository conclusions, or user enthusiasm as facts.

## Operating constraints

1. Read the repository's root `AGENTS.md` and follow it.
2. Read `AGENT_HANDOFF.md` before any project work.
3. Read `.thoughts/wiki/nox-use-case-map.md`; the generated `llms-full.txt` omits Vue-rendered use
   cases and product cards.
4. Read the newest dated files before older history. Preserve the older files as a graveyard rather
   than silently replacing their conclusions.
5. Use current web research and primary sources. For every SDK, API, framework, library, CLI, or
   service question, follow the repository's Context7 workflow first. If Context7 is unavailable,
   record the failure and use exact official source, release, and chain evidence rather than memory.
6. Inspect source, manifests, package versions, contracts, transactions, and deployments wherever a
   material claim can be checked. Marketing pages and hackathon descriptions are claims, not
   executable proof.
7. Keep four ledgers throughout the audit:
   - `VERIFIED FACT`
   - `INFERENCE`
   - `CONTRADICTION`
   - `UNKNOWN / TEST REQUIRED`
8. Pin dates, URLs, repository commits, package versions, contract addresses, chain IDs, and
   transaction hashes. State exactly how each live-chain fact was reproduced.
9. Nox is confidential TEE computation. Do not describe it as anonymity, FHE, a private
   transaction network, or trustless computation. Name browser, Gateway TEE, Runner TEE, relayer,
   oracle, market, and worker trust boundaries.
10. Do not write product code, deploy contracts, send transactions, create an implementation plan,
    or modify application architecture in this task. You may use read-only RPC calls, compile
    existing pinned source in an ignored or temporary directory without changing it, and run small
    non-persistent calculations to verify claims. Every new state-changing falsification test must
    be specified for Prompt 3, not executed here.
11. Do not update `CLAUDE.md` with this one-time workflow. Persist research and the audit verdict in
    the dated files requested below.
12. Do not optimize for agreement. Issue the verdict before recommending improvements.
13. The repository normally forbids architecture before selection. This prompt authorizes only a
    read-only substrate and integration-feasibility matrix so the product can be judged. It does
    not authorize choosing or designing the product architecture.

## Required repository reading

At minimum, read:

1. `README.md`
2. `AGENTS.md`
3. `AGENT_HANDOFF.md`
4. `.thoughts/decisions/CURRENT.md`
5. `.thoughts/research/2026-07-24-noxlimit-product-and-market-reality.md`
6. `.thoughts/ideas/2026-07-24-noxlimit-product-hypothesis.md`
7. `.thoughts/research/2026-07-23-nox-docs-first-correction.md`
8. `.thoughts/research/2026-07-23-docs-first-product-research.md`
9. `.thoughts/ideas/2026-07-23-nox-docs-first-candidates.md`
10. `.thoughts/research/2026-07-23-iexec-wtf-winners-and-opportunity-space.md`
11. `.thoughts/wiki/nox-use-case-map.md`
12. `.thoughts/wiki/nox-protocol.md`
13. `.thoughts/wiki/nox-developer-stack.md`
14. `.thoughts/wiki/nox-integration-patterns.md`
15. `.thoughts/wiki/nox-known-contradictions.md`
16. `.thoughts/sources/source-manifest.md`
17. `prompts/02-adversarial-selection.md`
18. `prompts/03-critical-path-verification.md`

Inspect relevant ignored local mirrors under `.thoughts/raw/` when present, but do not commit,
publish, or copy third-party source trees into authored files.

## First: reconstruct and explain the product without jargon

Before judging feasibility, write a plain-language model that answers:

1. For “Will BTC/USD be at or above a strike at a deadline?”, what are `YES` and `NO` outcome
   shares?
2. How does one collateral unit back one complete `YES + NO` set, and what does each position
   redeem after binary resolution?
3. What is an outcome-share AMM pool?
4. How is the pool contract the mechanical counterparty while its LPs bear economic inventory risk
   and earn fees?
5. Who seeds liquidity, and what risks does that introduce?
6. How is a market-implied outcome price different from the BTC/USD oracle used for settlement?
7. What exactly is a fixed-gross-input buy limit expressed as a maximum fee-inclusive average
   collateral price per share, and how is its minimum output rounded?
8. What separate public or encrypted activation trigger makes a true stop-limit order different?
9. What does Nox keep confidential while the order rests, and when might proof/finalization
   submission disclose a threshold-equivalent value before confirmation?
10. What remains public or inferable during submission, repeated evaluation, execution, holding,
    resolution, and redemption?
11. Why does the order need a worker? Can a smart contract wake itself?
12. What fixed-input quote is sampled from the bound pool in the evaluation-request transaction,
    and what happens when reserves move before final execution?
13. If finalization reveals the minimum output but the AMM buy reverts, why can the order not return
    to a supposedly confidential pending state?

If the product cannot be explained clearly to a prediction trader without introducing a CLOB,
token factory, broad market factory, or Polymarket router, record that as a product-design failure.

## Audit track A: hackathon rules, date, and originality

Recheck the current official iExec WTF page, linked rules, submission requirements, deadline and
timezone, judging language, previous-project reuse rule, required chain, frontend, repository,
documentation, feedback file, social post, and video length.

Answer with direct sources:

- Are prediction markets prohibited? Do not infer a prohibition from optional example ideas.
- Can an entrant deploy an unchanged open-source outcome-share protocol on Sepolia and add Nox as a
  clean integration?
- Does self-deploying old protocol contracts count as protocol reuse, project reuse, or an allowed
  integration?
- What needs organizer confirmation?
- Is a live Ethereum Sepolia product sufficient, or is production mainnet deployment stated or
  implied as a judging requirement?

Re-audit the exact source and executable behavior of Diam, RWAOS, and DarkOdds. Be accurate:
DarkOdds created native Nox markets and used Polymarket only for read-only display/discovery. Do not
call it a router. Establish once whether NoxLimit's actual state transition is materially
different; do not spend the rest of the task trying to “beat DarkOdds.”

Search current DoraHacks entries, GitHub, and comparable privacy, ZK, FHE, confidential-computing,
and protocol-integration hackathons for:

- confidential triggers;
- hidden or sealed limit orders;
- automated conditional execution;
- private prediction intent;
- real outcome-share execution;
- private pre-trade order management.

Specifically verify, rather than repeat descriptions of, Iceberg, Veiled, DarkSwap, Wingman, Shadow
Orders, zkConfide, wthelly, MiroShark, and any July 2026 WTF project. Separate:

- working source plus deployment;
- source with no verified live path;
- project description or roadmap only;
- winner or non-winner;
- generic private trading from the exact confidential-trigger-to-outcome-share transition.

## Audit track B: demand and product truth

Do not substitute “prediction markets are trending” for product demand.

Verify whether current products actually ship advanced event-contract order management. At minimum,
check current primary evidence from:

- Gemini Prediction Markets;
- Kalshi and Kalshi Pro;
- Polymarket;
- Robinhood event contracts;
- Limitless and other onchain prediction venues that are materially relevant.

Then distinguish three propositions:

1. active traders use or request limit/stop orders;
2. public resting intent creates a meaningful problem on transparent onchain venues;
3. traders will accept Nox latency, transactions, and trust boundaries to hide only the resting
   threshold.

Find evidence for or against each. Search product documentation, developer documentation,
changelogs, support requests, issue trackers, trader discussions, research, and observed product
behavior. Use current direct sources where possible. Treat company growth numbers as category
evidence, not privacy evidence.

Compare the real user outcome with:

- ordinary centralized hidden stops;
- application-server encrypted storage;
- commit-reveal;
- private transaction submission;
- a user-operated local bot;
- a public limit order;
- an ordinary onchain automation service.

For each alternative, state what user value, trust assumption, availability, or composability
changes. If a simpler alternative preserves the product outcome well enough, say so and downgrade
or drop NoxLimit.

Distinguish a hackathon testnet protocol module from launching a consumer prediction venue. Identify
material jurisdiction, eligibility, market-operator, and venue restrictions at a high level, with
current primary sources, only to decide whether there is a credible post-hackathon product path.
Do not turn the project into a policy/compliance product or invent a legal architecture. If the
only launch path is policy-heavy, record the conflict with the user's product constraints.

## Audit track C: current Nox implementation reality

Use current release and live-chain evidence, not unreleased `main` APIs.

Verify:

- current published Handle SDK, protocol-contract, confidential-contract, and Hardhat-plugin
  versions;
- exact released ABI used by the public deployment;
- supported chains and chain IDs;
- Nox contract, ACL, gateway, runner, subgraph, and verifier addresses or configuration;
- whether any official production mainnet Nox deployment exists;
- whether a custom network override creates an actually supported network or merely accepts custom
  addresses;
- `encryptInput` application binding and proof lifetime;
- the reliable `wallet → application → Nox.fromExternal` ingestion path;
- cross-contract and router implications;
- supported encrypted types and operations;
- persisted-handle requirements across transactions;
- `allowThis`, owner/viewer grants, transient access, and public decryption;
- whether disclosure grants are irreversible;
- current public-decryption proof format and onchain verification;
- application-level replay protection;
- asynchronous computation and decryption lifecycle;
- failure, retry, timeout, and pending-job behavior.

Independently recheck the repository's “only Ethereum Sepolia and Arbitrum Sepolia” conclusion. If
you find a production network, prove it with current official configuration, live contracts, and a
working client path. If you do not, state plainly:

- there is no current same-chain production integration;
- NoxLimit can honestly be live on Ethereum Sepolia;
- a future-mainnet migration is a roadmap, not a delivered feature.

Measure or find enough live Nox operations to estimate at least P50 and P95 evaluation time. If the
sample is too small, report it as unknown. Do not turn one roughly 12-second transaction into a
service-level claim or promise that every trade finishes in 30 seconds.

## Audit track D: market substrate comparison

Do not assume an architecture in advance. Compare at least:

### Candidate 1: Gnosis Conditional Tokens plus Fixed Product Market Maker

Start from the exact pins in the source manifest/research. Verify:

- licenses and change restrictions;
- compiler and dependency compatibility;
- official versus self-deployed network support;
- condition creation and payout reporting;
- complete-set splitting/merging and redemption;
- fixed-product pricing and fee behavior;
- fee-inclusive fixed-input buy quote, decimals, and rounding rather than marginal spot price;
- `minOutcomeTokensToBuy`;
- buy, sell, resolution, and redemption;
- the fact that FPMM transfers ERC-1155 shares to `msg.sender`, plus the adapter's receiver and
  atomic-forwarding or explicit owner-custody behavior;
- whether the unchanged source compiles in temporary current local tooling, and what exact Prompt 3
  experiment would be required to prove unchanged Sepolia deployment.

### Candidate 2: Seer outcome assets plus Uniswap V3

Verify:

- exact current source and license;
- Sepolia market contracts and whether they are official/current;
- market creation and oracle lifecycle;
- wrapped outcome-token behavior;
- actual Uniswap pools and liquidity for Sepolia outcome assets;
- one coherent multi-outcome pool versus separate per-outcome pools, including Seer's `INVALID`
  position;
- parity and arbitrage assumptions;
- exact quote and slippage enforcement;
- production-network versus Sepolia differences.

### Candidate 3: credible alternative or explicit none

Investigate current Polymarket CTF Exchange, another native prediction AMM, a CLOB, or another
unchanged open-source protocol only if it is legally and technically credible within the deadline.
Account for operator/matcher, solver, resolver, token standard, liquidity, licensing, deployment,
and maintenance requirements.

For each candidate, produce a read-only substrate and integration-feasibility row—not a product
architecture or build plan—with:

- exact contracts and assets;
- chain;
- collateral flow;
- outcome creation, trading, resolution, and redemption flow;
- Nox integration boundary;
- worker responsibility;
- custody and approvals;
- proof consumer;
- replay and race controls;
- price/quote protection;
- oracle;
- external services;
- licensing;
- estimated new contract and frontend surface;
- deadline risk;
- reasons to choose or reject.

Recommend no substrate if the product gate fails. A hypothetical integration boundary must not
become evidence that the product deserves to exist.

## Audit track E: oracle, liquidity, and automation

For an objective BTC or ETH market, verify the current official oracle address, chain, decimals,
heartbeat/freshness behavior, latest live answer, and failure handling. Explain:

- how the strike and cutoff timestamp are defined;
- which eligible round determines the result;
- what happens if the feed is stale;
- who may report payouts;
- whether anyone can advance resolution after the deadline;
- how the result leads to real redemption.

Do not assume a SOL feed exists on the required network.

Audit the worker path:

- A contract cannot wake itself.
- Identify the transaction that requests/advances evaluation.
- Identify the transaction that retrieves or proves the result.
- Identify the transaction that executes the AMM trade.
- Determine whether calls can be permissionless.
- Prove the worker cannot change order terms, fill worse than the committed limit, redirect
  proceeds, or steal funds. Separately state its ability to delay/censor and the public-mempool risk
  of losing price improvement or being sandwiched up to the limit.
- Check current support and sunset dates before suggesting Chainlink Automation, Gelato, CRE, or
  another service.
- Prefer an honest application-hosted worker over a decorative decentralization claim when it is
  the lowest-dependency option that current evidence supports.

Turn the user's browser off after order submission in your threat model. If the product then stops,
the browser-off execution criterion fails.

Audit liquidity:

- Who supplies the initial collateral and outcome inventory?
- How much pool depth is required for the demo order not to dominate the quote?
- What does it cost to move the price by 1%, 5%, and 10%?
- Can an attacker manipulate the pool across a hidden order, force execution, and reverse the
  manipulation profitably?
- Does using a small seeded testnet pool prove mechanics only, or a usable product?
- Is there any actual organic Sepolia outcome liquidity? State “not found” rather than “none” when
  the search is not exhaustive.

## Audit track F: exact state machine and security

Reconstruct the smallest credible state machine and attack it.

At minimum analyze:

- owner and order identity;
- market and outcome side;
- fixed input amount;
- encrypted threshold;
- escrow;
- expiry;
- stored confidential handles;
- pending evaluation;
- repeated false evaluations;
- ready proof;
- stale result;
- threshold-equivalent disclosure before confirmation;
- disclosed/refundable state after a reverted finalization;
- execution;
- cancellation;
- refund;
- resolution;
- redemption.

Test or reason precisely about:

- input-proof replay;
- public-decryption-proof replay;
- proof reuse across orders, users, chains, markets, or applications;
- duplicate worker calls;
- cancel versus evaluate race;
- cancel versus execute race;
- expiry versus execute race;
- reentrancy;
- allowance and custody failures;
- ERC-1155 receiver/caller behavior;
- user-to-order-contract collateral approval, order-contract-to-fixed-pool approval, and the
  requirement that the worker receive no token approval or withdrawal authority;
- quote rounding, decimals, fees, and exact-boundary values;
- stale-price time-of-check/time-of-use;
- front-running of proof submission;
- worker censorship and downtime;
- oracle staleness and manipulation;
- pool manipulation and sandwiching;
- refund liveness;
- failed evaluation leakage;
- threshold inference from a sequence of public booleans and known quotes;
- timing correlation;
- post-fill position inference;
- admin and upgrade authority;
- Nox/Gateway/Runner compromise;
- cross-chain and chain-replay assumptions.

The final pool call must independently enforce the user's worst acceptable fill. A stale Nox
authorization alone is insufficient. A decrypted `ready = true` boolean combined with an unrelated
generic slippage setting also fails this guarantee. Determine whether a threshold-derived
`minOutcomeTokensToBuy`, `amountOutMinimum`, or equivalent can be revealed, bound to the order, and
enforced atomically at fill. If not, mark exact private-limit semantics unproven.

For a fixed gross input, derive and test the scaled-integer equivalent of
`minOut = ceil(grossInput / maxFeeInclusiveAveragePrice)`. Account for collateral/share decimals,
pool fees, and ceiling direction. A displayed probability, marginal reserve price, or quote for a
different amount is not the user's limit.

Prefer proof verification, terminal one-shot state consumption, and the AMM call in one
finalization transaction. Do not assume a persistent public `executable` state. If the proof or
calldata reveals the threshold-derived bound and the AMM call reverts, require a disclosed and
refundable terminal path or a newly encrypted order.

Investigate whether current Nox can reveal only a successful, order-bound authorization without
publishing every failed comparison. If not, calculate what an observer learns from repeated
evaluations and narrow or reject the privacy claim.

## Audit track G: performance, UX, and “product, not demo”

Design no screens yet. First audit the complete fresh-user path:

1. open the product;
2. understand one real BTC market;
3. obtain or receive test gas;
4. obtain the exact collateral;
5. approve or escrow it;
6. choose a side;
7. encrypt a limit;
8. sign and submit;
9. understand the asynchronous status;
10. close the browser;
11. see the worker advance and complete the proof-gated trade when eligible;
12. verify the transaction and outcome shares;
13. cancel or recover funds if not filled;
14. resolve and redeem.

Enumerate every wallet signature, transaction, approval, wait, external site, faucet, role, and
failure state. The judge path must not depend on:

- local setup;
- a second wallet;
- another human participant;
- manual contract calls;
- an external faucet hunt;
- a staged matcher;
- mock prices;
- a seeded “success” value;
- self-reported execution.

Assess embedded wallet, sponsored transaction, and collateral-distribution options only if they are
compatible with Nox proof ownership and application binding. “Try in 30 seconds” means a fresh
person can understand the value and place a genuine order without choreography. It is not
permission to hide the real Nox wait or fake a fill.

Produce a transaction and latency budget. Mark every estimate and every measured value. State
whether the smallest product can be delivered by one builder before the verified deadline with
time for adversarial tests, documentation, feedback, and video.

## Required falsification-test ledger

Inspect existing evidence for every test below. If the test would require a deployment,
transaction, funded account, or new code, do not run it in this audit. Specify the smallest
disposable Prompt 3 experiment with prerequisites, evidence, pass condition, and kill condition.
Treat each failure as a possible product kill.

1. **Pinned protocol test:** unchanged source compiles, deploys, creates a binary condition, seeds a
   pool, buys, sells, resolves, and redeems locally and on Sepolia.
2. **Released Nox test:**
   `encrypt threshold → fromExternal → persist → compare with the fixed-input quote sampled in the
   evaluation-request transaction → reveal proof-bound minimum output → obtain and verify proof →
   consume once`
   works with current published packages and live ABI.
3. **Real execution test:** a successful Nox proof causes one actual pool buy and receipt of real
   outcome shares; replay fails.
4. **Stale-price test:** after evaluation, move the pool favorably and unfavorably. The bad fill
   must revert because the pool enforces the threshold-derived minimum output. If a reverted
   finalization disclosed that value, the order must not resume as confidential.
5. **Leakage test:** observe false evaluations, successful timing, known quotes, expiry,
   cancellation, and final disclosure. Determine how tightly an outsider can bound the threshold.
6. **Automation test:** browser closed; worker requests, waits, proves, executes, retries, and
   recovers without a manual click.
7. **Escrow test:** deposit, failed allowance, cancel at every stage, expiry, refund, successful
   outcome receipt, duplicate execution, and worker/front-runner race.
8. **Quote-math test:** fuzz decimals, fees, rounding, tiny orders, extreme imbalance, and exact
   threshold boundaries. UI and contract must agree.
9. **Manipulation test:** measure the capital and potential profit of pushing a small pool through a
   hidden order.
10. **Oracle test:** live feed, exact eligible round, stale behavior, permissionless resolution, and
    winning-share redemption.
11. **Fresh-judge test:** a new browser and wallet can place a genuine encrypted order without
    local setup, second wallet, manual calls, or an external faucet hunt.
12. **Originality and rules test:** current source and organizer evidence support a clean,
    non-reused integration.

Do not weaken an unexecuted test into an inferred pass. It remains `UNKNOWN / TEST REQUIRED`.

## Decision rubric

Score each dimension from 0 to 5, cite the evidence, and make every veto explicit:

- urgent and concrete user problem;
- privacy-specific demand;
- return-use potential;
- originality;
- Nox indispensability;
- current released-API feasibility;
- same-chain protocol feasibility;
- security and economic safety;
- automation credibility;
- real-data and real-action integrity;
- fresh-user tryability;
- one-builder deadline scope;
- product extensibility after the hackathon.

Use vetoes, not averages. A high category score cannot compensate for a failed critical path,
ordinary-backend equivalence, unsafe custody, fake automatic execution, or a choreographed judge
path.

Issue one verdict:

- `KEEP` — product survives and should enter one bounded Prompt 3 integration spike;
- `RESHAPE` — user problem survives, but product, privacy boundary, or substrate must change;
- `DROP` — NoxLimit should not proceed;
- `NONE SURVIVE` — NoxLimit and any adjacent alternatives found in this pass should not proceed.

If `RESHAPE`, name one precise replacement shape. If `DROP` or `NONE SURVIVE`, you may include at
most two genuinely stronger adjacent opportunities discovered from new evidence. Do not generate a
generic idea list.

## Required outputs

Use the current date in the filenames.

### 1. Independent research

Create:

`.thoughts/research/<YYYY-MM-DD>-noxlimit-independent-research.md`

Include:

- executive finding;
- plain-language domain model;
- verified facts;
- inferences;
- contradictions;
- unknowns;
- demand evidence;
- current competitors;
- Nox network/release reality;
- market-substrate comparison;
- oracle, liquidity, and automation evidence;
- source ledger with direct links, pins, deployments, and reproduction commands.

### 2. Independent audit and verdict

Create:

`.thoughts/verification/<YYYY-MM-DD>-noxlimit-independent-audit.md`

Include, in this order:

1. verdict;
2. fatal issues;
3. scorecard and vetoes;
4. strongest case for the product;
5. strongest case against it;
6. privacy boundary;
7. security and economic threat model;
8. performance and transaction budget;
9. fresh-user/judge-path audit;
10. architecture comparison;
11. exact claims corrected from the existing corpus;
12. minimal Prompt 3 spike, if and only if the verdict permits one;
13. explicit stop condition.

### 3. Durable decision update

Update `.thoughts/decisions/CURRENT.md` to record:

- the audit verdict;
- whether NoxLimit is selected, still a hypothesis, reshaped, or dropped;
- exact evidence files;
- whether Prompt 2 or Prompt 3 is allowed;
- the one next action.

Do not mark the product selected merely because the audit says `KEEP`. Selection still requires
user review. Do not erase the rejection graveyard.

### 4. Handoff correction

Update `AGENT_HANDOFF.md`, `README.md`, `AGENTS.md`, and `prompts/README.md` only where the new
evidence changes the durable state. Keep each entry point concise. Do not paste the whole audit into
them.

## Final response

Return a concise report to the user containing:

- the verdict first;
- what NoxLimit actually is in one paragraph;
- what an outcome-share pool means in one paragraph;
- whether Nox has a current official mainnet deployment;
- the recommended test substrate, unresolved substrate comparison, or absence of a credible
  substrate;
- the three most dangerous unresolved risks;
- the exact next experiment, if allowed;
- links to the two authored audit files and updated decision record.

Do not say “solid,” “winning,” “production-ready,” “trustless,” “MEV-proof,” “mainnet-ready,” or
“automatic” unless the evidence in your audit directly earns the word.

Stop after persisting the audit and returning the verdict. Do not write application code.
