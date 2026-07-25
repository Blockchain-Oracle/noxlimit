# iExec WTF Hackathon Context Pack

This repository is the research brain for choosing and building an original iExec WTF Hackathon
product. It contains source-pinned Nox implementation research, a verified audit of the previous
three winners, a live competitor scan, a revised product-idea menu, and prompts that another coding
agent can inherit without restarting discovery.

**Current state:** **NoxLimit is the selected product direction for architecture review and bounded
critical-path verification.** It is not yet technically verified, and no polished/full
implementation has started. The architecture that was previously scattered across several reports
is now consolidated in the
[canonical system architecture](./.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md).
See the [current decision](./.thoughts/decisions/CURRENT.md) and
[adoption memo](./.thoughts/decisions/2026-07-25-noxlimit-direction-and-architecture-gate.md), plus
the [audit/authority gates](./.thoughts/decisions/AUDIT-GATES.md). The original `DROP` audit remains
historical evidence; the [reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md)
and [independent reaffirmation](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
superseded its workflow verdict. The completed
[context/gate/architecture audit](./.thoughts/verification/2026-07-25-context-gate-and-architecture-audit.md)
records the consistency checks.

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

> **Current maturity: selected direction, `KEEP AND VERIFY` technically.** The original independent
> audit returned `DROP`; the reassessment showed that direct
> demand is unknown rather than disproved, ordinary backends do not keep the raw threshold from
> their operator, viewer-only decrypt avoids explicit public proofs for failed evaluations (the
> contract-side Nox primitive subset compiles against released v0.2.4), and no formal
> prediction-market prohibition was found. The empty `judging_criteria` API field does not erase
> the track's explicit prediction-market originality warning. Timing and non-action may still leak
> a failed-evaluation inference. The live released-API and real-pool path still has to pass a
> time-boxed spike.

NoxLimit is not a generic prediction market. It proposed one private advanced-order layer over a
real onchain outcome-share AMM:

`encrypted resting limit → evaluation-block fixed-input pool quote → confidential comparison →
application-bound proof → one-shot state transition → real minimum-output-protected outcome-share
buy`

The smallest product is one curated BTC binary market, a public fixed-size buy and outcome side,
and a maximum price that is confidential while resting and revealed as a minimum-output bound when
a successful finalization is submitted. The worker may learn an eligibility bit at each permitted
evaluation. It must work after the browser closes and include cancellation, expiry, refund,
objective resolution, and redemption. Current official Nox support was found on Ethereum Sepolia
and Arbitrum Sepolia, not production mainnet, so any delivered claim must remain testnet-honest.

Start with the
[canonical architecture](./.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md), then
use the [product-reality brief](./.thoughts/research/2026-07-24-noxlimit-product-and-market-reality.md),
[candidate hypothesis](./.thoughts/ideas/2026-07-24-noxlimit-product-hypothesis.md),
[hackathon-calibrated reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md),
and [reaffirmation recheck](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
as evidence. The only authorized next technical work, after architecture review, is the bounded
Prompt 3 spike.

## Read order for an agent

1. [Current product decision](./.thoughts/decisions/CURRENT.md)
2. [Selection and architecture-gate memo](./.thoughts/decisions/2026-07-25-noxlimit-direction-and-architecture-gate.md)
3. [Audit and authority gates](./.thoughts/decisions/AUDIT-GATES.md)
4. [Canonical NoxLimit architecture](./.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md)
5. [Agent handoff](./AGENT_HANDOFF.md)
6. [Context/gate/architecture verification](./.thoughts/verification/2026-07-25-context-gate-and-architecture-audit.md)
7. [NoxLimit reaffirmation recheck](./.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
8. [NoxLimit `DROP` reassessment](./.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md)
9. [NoxLimit product-reality brief](./.thoughts/research/2026-07-24-noxlimit-product-and-market-reality.md)
10. [NoxLimit candidate hypothesis](./.thoughts/ideas/2026-07-24-noxlimit-product-hypothesis.md)
11. [NoxLimit independent audit — historical](./.thoughts/verification/2026-07-24-noxlimit-independent-audit.md)
12. [Docs-first correction](./.thoughts/research/2026-07-23-nox-docs-first-correction.md)
13. [Docs-first product research](./.thoughts/research/2026-07-23-docs-first-product-research.md)
14. [Docs-first candidate report](./.thoughts/ideas/2026-07-23-nox-docs-first-candidates.md)
15. [Nox product/use-case map](./.thoughts/wiki/nox-use-case-map.md)
16. [Winner and opportunity research](./.thoughts/research/2026-07-23-iexec-wtf-winners-and-opportunity-space.md)
17. [Nox domain wiki](./.thoughts/wiki/index.md)
18. [Known contradictions](./.thoughts/wiki/nox-known-contradictions.md)
19. [Source manifest](./.thoughts/sources/source-manifest.md)
20. [Prompt sequence](./prompts/README.md)

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
under verification only as a narrower outcome-share advanced-execution product rather than a new
native market.

## Source policy

All 20 public repositories in the iExec-Nox organization, five exact release pins, and the three
winner repositories were cloned locally for research. Those third-party source trees are excluded
from Git. The authored [source manifest](./.thoughts/sources/source-manifest.md) records exact commit
SHAs and links, so another agent can reproduce the corpus without republishing other projects.

No claim in this repository means Nox is anonymous, FHE, finance-grade, or fully trustless. Nox
provides confidential computation inside attested TEEs while addresses, calls, timing, and other
metadata remain public.
