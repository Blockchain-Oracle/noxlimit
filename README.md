# iExec WTF Hackathon Context Pack

This repository is the research brain for choosing and building an original iExec WTF Hackathon
product. It contains source-pinned Nox implementation research, a verified audit of the previous
three winners, a live competitor scan, a revised product-idea menu, and prompts that another coding
agent can inherit without restarting discovery.

**Current state:** **NoxLimit is selected, the user approved its canonical architecture on
2026-07-28, Prompt 3 is `GO`, and the user has authorized the polished build.** The released Nox path, real FPMM lifecycle, and combined
adapter pass locally, and the bounded recovered Gate C trace passes on Ethereum Sepolia. The final transaction
[`0xbae857…88caa`](https://eth-sepolia.blockscout.com/tx/0xbae85703bb59878fa63838e03c1bc57cdcdc46f6e2f74ac701b38fc85d088caa)
filled the encrypted order and forwarded real outcome shares with zero adapter dust or allowance.
Prompt 4 is active. The polished workspace now contains the hardened contracts, shared protocol,
deterministic catalog, restart-safe Fastify service, and responsive Next product while `spike/**`
remains immutable evidence. On branch `codex/noxlimit-polished-product`, paired cutover commit
`c073643` publishes runtime catalog revision `5` at
[`packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json`](./packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json),
hash `0x8aa65b0b5a91025ed1fd0e1487b9c9058b44ca05889632e9f85baf3bb3885899`.
The original BTC/ETH bundles are retired, their verified revision-5 successors are active, LP close
evidence for both predecessors is committed, and three real browser-off order/fill flows are
committed. The retired BTC predecessor then completed real browser resolution, winning-user
redemption, and builder-LP redemption. The retired ETH predecessor cannot resolve: its unique first
post-deadline Chainlink observation arrived after 3,624 seconds, 24 seconds beyond the immutable
3,600-second bound. The accountless selector rejected before any write, no ETH winner/payout exists,
and its user/LP positions remain unredeemable. Both active successors carry the same known one-hour
liveness risk. Corrected 14,400-second replacements are deployed, immutable-validated, and seeded
with 50,000,000 YES / 50,000,000 NO atoms each: BTC market
`0x37a7b5826c9ba1209470b98cd38a38f4e3e6cb448c353333138bfced7fbaf0a2` is staged
`SUCCESSOR` in catalog revision `6`, and ETH market
`0xa5219adaa2c86c0419cc7d9b05188784192ee023a7c3c27bab3f0cc8eaf8fc8a` is added as
`SUCCESSOR` in revision `7`; commit `d2dbc39` records both staging revisions. See the
[corrected strike plan](./.thoughts/evidence/2026-07-29-sepolia-corrected-successor-strike-plan.json),
[BTC deployment evidence](./.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-deployment.json),
and
[ETH deployment evidence](./.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-deployment.json).
Both current revision-5 routes close and both corrected successors start at
`2026-07-29T13:50:00Z`; revision `5` remains current until one atomic revision `8` cutover. The
exercised service reported `READY`; that local/live runtime is not a public hosting claim.

The fresh 2026-07-29 12:08Z root `pnpm check` passes contracts `77`, protocol `14`, catalog `6`,
service `65`, and web `61` tests (`223` total), including compile, type-check, test, and build. The
fresh dedicated Playwright baseline records `45` passing journeys, `21` intentional skips, and
zero failures; both gates still need a final submission-commit rerun. New official Sepolia BTC/ETH
deployments now enforce a 14,400-second minimum observation-delay bound without changing the unique
first-observation rule; runtime quote freshness remains separately 3,600 seconds. Reproducible
service/web container builds and local smoke checks pass. Public frontend/service URLs, video, X
post, and form/contact fields are pending. No live inventory is fabricated. Product stories, the exhaustive
screen/state map, and the designer handoff form the UX contract, and the
[research-backed implementation plan](./.thoughts/plans/2026-07-28-noxlimit-polished-product-plan.md)
is the active execution contract. The architecture that was previously
scattered across several reports is now consolidated in the
[canonical system architecture](./.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md).
It now includes the user's DeepBook-inspired terminal direction: real BTC/USD and ETH/USD market
bundles, SOL/USD after a dedicated Pyth adapter test, 1h/4h/24h horizons, a truthful FPMM quote
ladder, private order ticket, Orders, Positions, Activity, and a typed wallet-signed client path.
Discovery uses the separately adopted hybrid: a TikTok-like vertical Market Stream on mobile and
as the desktop terminal rail, followed by the complete analytical/review flow before signing. See
the [Market Stream decision](./.thoughts/decisions/2026-07-28-noxlimit-market-stream-experience.md).
See the [current decision](./.thoughts/decisions/CURRENT.md) and
[adoption memo](./.thoughts/decisions/2026-07-25-noxlimit-direction-and-architecture-gate.md), plus
the [audit/authority gates](./.thoughts/decisions/AUDIT-GATES.md). The original `DROP` audit remains
historical evidence; the [reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md)
and [independent reaffirmation](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
superseded its workflow verdict. The completed
[context/gate/architecture audit](./.thoughts/verification/2026-07-25-context-gate-and-architecture-audit.md)
records the original consistency checks; the later
[Opus 5 review reconciliation](./.thoughts/verification/2026-07-28-opus-architecture-review-reconciliation.md)
records the user's approval and first accepted corrections. The
[DeepBook research](./.thoughts/research/2026-07-28-deepbook-patterns-for-noxlimit.md) and
[product-surface/post-gate reconciliation](./.thoughts/verification/2026-07-28-noxlimit-product-surface-and-opus-reconciliation.md)
record the latest refinement. The current executable result is in the
[Prompt 3 critical-path memo](./.thoughts/verification/2026-07-28-noxlimit-critical-path.md).
The shareable product/UX brief is [`DESIGNER_HANDOFF.md`](./DESIGNER_HANDOFF.md).
The parallel AI-designer workflow is
[`prompts/05-designer-agent-handoff.md`](./prompts/05-designer-agent-handoff.md).
Its Stage 1 is closed: the user selected visual direction **`Complement`**, recorded in the
[visual direction decision](./.thoughts/design/2026-07-28-noxlimit-visual-direction-selection.md).
The palette is inherited from Reclaim (`getreclaim.xyz`). `Vigil` and `Caliper` are rejected
history. All six local HTML deliverables—directions, foundations, Batches A–C, and the interactive
prototype—are durable design inputs under `.thoughts/design/html/`; their sample data is not live
product evidence.

The local product now includes atomic verified catalog adoption at startup/SIGHUP, phase-aware
oracle history, real underlying/outcome chart modes, one-wallet funding preflight, and durable
exact-hash transaction locks for create, cancel, expire, refund, resolve, and redeem. Refreshing or
an uncertain receipt cannot expose a blind duplicate write; only a definitive terminal receipt
unlocks the action.

The live deployer is locally hardened around a plan-bound, cross-process-locked journal. It freezes
the ordered expected steps and exact funding plan, persists every transaction as
`INTENT → SUBMITTED → CONFIRMED`, requires attempt-bound explicit `ADOPT`/`RETRY` recovery after an
ambiguous intent, rejects secret-bearing payloads, and hash-verifies create-only evidence/catalog
outputs across crashes. Market plans must use the exact declared 1h/4h/24h duration and canonical
question. Reused operator-owned NLTUSDC is minted only by the calculated pool/treasury shortfall.
See [`packages/contracts/OPERATOR.md`](./packages/contracts/OPERATOR.md).

## WTF in one minute

The challenge is to add Nox confidentiality to a real open-source protocol, or create a genuinely
innovative Nox integration. The organizer explicitly says the wallet, DeFi, and treasury examples
are optional. The result must feel like a deployable product rather than a proof of concept:

- real end-to-end behavior without mock data;
- a functional frontend and public open-source repository;
- deployment on Ethereum Sepolia;
- clear install, deploy, and usage documentation;
- `feedback.md`;
- an X post tagging `@iEx_ec`;
- a demo video no longer than four minutes.

The most important product test is:

`easy to try × Nox is indispensable × a real user would keep using it`

“Try in 30 seconds” means the value should be understandable without a faucet hunt, local setup, or
multiple wallets. Nox computation is asynchronous, so it is not an honest hard latency promise.

## What the Nox docs actually open up

The current source explicitly names Payments & Payroll, DeFi & Lending, Vaults & Yields, OTC &
Trading, Prediction Markets, RWA & Real Estate, Fundraising/VC, Identity, NFT, and Invoicing. It
also contains detailed concept pages for encrypted vault strategies, DeFi capital allocation, and
RWA issuance.

The evidence is not uniform:

- Confidential Tokens and Encrypted Positions have source-linked demos.
- Piggy Bank, ERC-7984 token/wrapper/swap, and Hardhat are executable building blocks.
- Encrypted Strategy, Capital Allocator, and RWA are detailed concepts without linked
  implementations.
- Prediction Markets, Identity, NFT, Fundraising/VC, and Invoicing are category endorsements.

See the [docs-first correction](./.thoughts/research/2026-07-23-nox-docs-first-correction.md) and
[product/use-case map](./.thoughts/wiki/nox-use-case-map.md). Do not read `llms-full.txt` alone; it
drops the Vue-rendered catalog.

## What changed in the feasibility reset

The historical research produced QuietRound, SLA Lock, Proofline, and related policy, evaluation,
polling, and multi-party concepts. The user rejected that entire direction because it started from
confidentiality and forced a product around it.

The repository now records these as exclusions rather than front-runners. It also excludes wallets,
confidential-token factories, new chains/platforms, shares, regulatory workflows, benchmarks,
ratings, and any product that needs panels, institutions, fake participants, or multi-role demo
choreography.

The replacement discovery workflow combines the recovered docs catalog with comparable-winner,
shipping-product, and collision research. It evaluates both allowed paths: an unchanged-protocol
integration or a standalone innovative Nox product. A standalone product does not need a
third-party protocol call, but it still needs a complete real state transition, one-builder scope,
and a reason for a user to return. Nox is tested last; confidentiality alone is not a product.

The strongest corrected near-misses were Private Quote-to-Pay and a Confidential Closed-Loop Gift
Card. Quote-to-Pay fails a released optimized ERC-7984 callback permission assumption, directly
collides with PaySec, and has a poor fresh-user path. The gift card is mechanically possible but a
merchant database preserves the same user outcome, while Sigill and FHE2P already occupy private
gift-card checkout. See the
[docs-first candidate report](./.thoughts/ideas/2026-07-23-nox-docs-first-candidates.md).

## Selected direction: NoxLimit

> **Current maturity: selected direction, `GO` on the bounded technical gate.** The original independent
> audit returned `DROP`; the reassessment showed that direct
> demand is unknown rather than disproved, ordinary backends do not keep the raw threshold from
> their operator, viewer-only decrypt avoids explicit public proofs for failed evaluations (the
> contract-side Nox primitive subset compiles against released v0.2.4), and no formal
> prediction-market prohibition was found. The local released-Nox, real-pool, and adapter paths
> execute, and the combined live Sepolia trace/fill now passes. The empty
> `judging_criteria` API field does not erase
> the track's explicit prediction-market originality warning. Timing and non-action may still leak
> a failed-evaluation inference.

NoxLimit is not a generic prediction market. It proposed one private advanced-order layer over a
real onchain outcome-share AMM:

`encrypted resting limit → evaluation-block fixed-input pool quote → confidential comparison →
application-bound proof → one-shot state transition → real minimum-output-protected outcome-share
buy`

The locally implemented product combines a deterministic vertical Market Stream with a direct trading terminal over
curated BTC/USD and ETH/USD bundles plus SOL/USD after its Pyth adapter passes a live test, across
1h/4h/24h horizons. Each order has a public side
and variable amount that becomes immutable at creation, plus a maximum price that is confidential
while resting and becomes publicly retrievable as a minimum-output bound when public decryption is
granted at `Publication pending`, before final pool execution.
The central liquidity view is a real FPMM quote ladder, not a fake order book. A zero candidate
tells the worker `quote < minOut`; an
eligible candidate gives it the exact `minOut` even before publication. It must work after the
browser closes and include cancellation, expiry, refund,
objective resolution, positions, and redemption. Current official Nox support was found on Ethereum Sepolia
and Arbitrum Sepolia, not production mainnet, so any delivered claim must remain testnet-honest.

Start with the
[canonical architecture](./.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md), then
use the [product-reality brief](./.thoughts/research/2026-07-24-noxlimit-product-and-market-reality.md),
[candidate hypothesis](./.thoughts/ideas/2026-07-24-noxlimit-product-hypothesis.md),
[hackathon-calibrated reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md),
and [reaffirmation recheck](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
as evidence. The public live record is
[`spike/nox/evidence/sepolia-gate-c.json`](./spike/nox/evidence/sepolia-gate-c.json). The active
implementation must inherit the canonical architecture rather than reopening discovery.
The authorized implementation handoff is
[`prompts/04-polished-product-implementation.md`](./prompts/04-polished-product-implementation.md);
the user advanced its checkpoint on 2026-07-28. Deployment, funding, real browser-off fills,
predecessor LP close, paired successor activation, and one complete BTC browser/user/LP redemption
vertical are now committed. ETH is a terminal policy rejection, not `WAITING`: do not keep polling
or write its retired resolver, infer a winner, or substitute a later round. Revision `5` remains
current routing, but both active successors have the disclosed one-hour risk. Their corrected
four-hour replacements are already verified/seeded and staged in revisions `6`/`7`; keep both
staged until the shared close, then publish and runtime-adopt one revision `8` that retires and
activates both axes atomically. Public hosting and submission assets remain pending. The user
controls pacing; historical project clocks and submission dates are not implementation authority.

## Read order for an agent

1. [Current product decision](./.thoughts/decisions/CURRENT.md)
2. [Selection and architecture-gate memo](./.thoughts/decisions/2026-07-25-noxlimit-direction-and-architecture-gate.md)
3. [Audit and authority gates](./.thoughts/decisions/AUDIT-GATES.md)
4. [Canonical NoxLimit architecture](./.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md)
5. [Market Stream experience decision](./.thoughts/decisions/2026-07-28-noxlimit-market-stream-experience.md)
6. [Active implementation plan](./.thoughts/plans/2026-07-28-noxlimit-polished-product-plan.md)
7. [Agent handoff](./AGENT_HANDOFF.md)
8. [Prompt 3 critical-path evidence](./.thoughts/verification/2026-07-28-noxlimit-critical-path.md)
9. [DeepBook patterns for NoxLimit](./.thoughts/research/2026-07-28-deepbook-patterns-for-noxlimit.md)
10. [Product-surface and post-gate review reconciliation](./.thoughts/verification/2026-07-28-noxlimit-product-surface-and-opus-reconciliation.md)
11. [Context/gate/architecture verification](./.thoughts/verification/2026-07-25-context-gate-and-architecture-audit.md)
12. [NoxLimit reaffirmation recheck](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
13. [NoxLimit `DROP` reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md)
14. [NoxLimit product-reality brief](./.thoughts/research/2026-07-24-noxlimit-product-and-market-reality.md)
15. [NoxLimit candidate hypothesis](./.thoughts/ideas/2026-07-24-noxlimit-product-hypothesis.md)
16. [NoxLimit independent audit — historical](./.thoughts/verification/2026-07-24-noxlimit-independent-audit.md)
17. [Docs-first correction](./.thoughts/research/2026-07-23-nox-docs-first-correction.md)
18. [Docs-first product research](./.thoughts/research/2026-07-23-docs-first-product-research.md)
19. [Docs-first candidate report](./.thoughts/ideas/2026-07-23-nox-docs-first-candidates.md)
20. [Nox product/use-case map](./.thoughts/wiki/nox-use-case-map.md)
21. [Winner and opportunity research](./.thoughts/research/2026-07-23-iexec-wtf-winners-and-opportunity-space.md)
22. [Nox domain wiki](./.thoughts/wiki/index.md)
23. [Known contradictions](./.thoughts/wiki/nox-known-contradictions.md)
24. [Source manifest](./.thoughts/sources/source-manifest.md)
25. [Prompt sequence](./prompts/README.md)

The historical idea files remain useful only as collision and rejection evidence. Their
recommendations are superseded by the current decision record.

## Previous winners: explicit exclusion zones

| Place | Product | Winning category | Do not repeat |
|---|---|---|---|
| 1st | [Diam](https://dorahacks.io/buidl/43636) | Best Confidential DeFi | OTC, dark pools, sealed RFQs, Vickrey auctions, private trade routing |
| 2nd | [RWAOS](https://dorahacks.io/buidl/43431) | Best Institutional Architecture | broad RWA operating systems, confidential issuance/cap tables, KYC/disclosure control planes |
| 3rd | [DarkOdds](https://dorahacks.io/buidl/43656) | Best Confidential Prediction Market | native market factory, encrypted wagering/pools, resolution, private pari-mutuel payouts |

DarkOdds's Polymarket connection was read-only discovery/display. It did not route Polymarket
trades. A generic native Nox prediction market is therefore still a direct repeat. NoxLimit remains
selected—with its critical path verified—as a narrower outcome-share advanced-execution product
rather than a new native market. Its non-empty BTC/ETH catalog, fresh live browser-off fills, and
one complete BTC create-to-redeem vertical are committed. ETH is an honestly recorded immutable-
policy failure, not a second completed vertical; the publicly hosted release remains pending.

## Source policy

All 20 public repositories in the iExec-Nox organization, five exact release pins, and the three
winner repositories were cloned locally for research. Those third-party source trees are excluded
from Git. The authored [source manifest](./.thoughts/sources/source-manifest.md) records exact commit
SHAs and links, so another agent can reproduce the corpus without republishing other projects.

No claim in this repository means Nox is anonymous, FHE, finance-grade, or fully trustless. Nox
provides confidential computation inside attested TEEs while addresses, calls, timing, and other
metadata remain public.
