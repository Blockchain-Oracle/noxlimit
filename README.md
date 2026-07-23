# iExec WTF Hackathon Context Pack

This repository is the research brain for choosing and building an original iExec WTF Hackathon
product. It contains source-pinned Nox implementation research, a verified audit of the previous
three winners, a live competitor scan, a revised product-idea menu, and prompts that another coding
agent can inherit without restarting discovery.

**Current state:** the previous idea menu failed the user's feasibility bar. No product has been
selected or implemented, and there is no current front-runner. The next pass must begin with
comparable-winner and shipping-product research, using feasibility as a veto.

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

## What changed in the feasibility reset

The historical research produced QuietRound, SLA Lock, Proofline, and related policy, evaluation,
polling, and multi-party concepts. The user rejected that entire direction because it started from
confidentiality and forced a product around it.

The repository now records these as exclusions rather than front-runners. It also excludes wallets,
confidential-token factories, new chains/platforms, shares, regulatory workflows, benchmarks,
ratings, and any product that needs panels, institutions, fake participants, or multi-role demo
choreography.

The replacement discovery workflow studies comparable privacy, ZK, FHE, confidential-computing,
and protocol-integration winners before generating candidates. An idea survives only if one builder
can ship a self-serve, real-data, unchanged-protocol integration with a reason for a user to return.
Nox is tested last; confidentiality alone is not a product.

## Read order for an agent

1. [Feasibility-first research prompt](./prompts/00-feasibility-first-winner-research.md)
2. [Agent handoff](./AGENT_HANDOFF.md)
3. [Current product decision](./.thoughts/decisions/CURRENT.md)
4. [Winner and opportunity research](./.thoughts/research/2026-07-23-iexec-wtf-winners-and-opportunity-space.md)
5. [Nox domain wiki](./.thoughts/wiki/index.md)
6. [Known contradictions](./.thoughts/wiki/nox-known-contradictions.md)
7. [Source manifest](./.thoughts/sources/source-manifest.md)
8. [Prompt sequence](./prompts/README.md)

The historical idea files remain useful only as collision and rejection evidence. Their
recommendations are superseded by the current decision record.

## Previous winners: explicit exclusion zones

| Place | Product | Winning category | Do not repeat |
|---|---|---|---|
| 1st | [Diam](https://dorahacks.io/buidl/43636) | Best Confidential DeFi | OTC, dark pools, sealed RFQs, Vickrey auctions, private trade routing |
| 2nd | [RWAOS](https://dorahacks.io/buidl/43431) | Best Institutional Architecture | broad RWA operating systems, confidential issuance/cap tables, KYC/disclosure control planes |
| 3rd | [DarkOdds](https://dorahacks.io/buidl/43656) | Best Confidential Prediction Market | prediction markets, encrypted wagering, private pari-mutuel payouts |

## Source policy

All 20 public repositories in the iExec-Nox organization, five exact release pins, and the three
winner repositories were cloned locally for research. Those third-party source trees are excluded
from Git. The authored [source manifest](./.thoughts/sources/source-manifest.md) records exact commit
SHAs and links, so another agent can reproduce the corpus without republishing other projects.

No claim in this repository means Nox is anonymous, FHE, finance-grade, or fully trustless. Nox
provides confidential computation inside attested TEEs while addresses, calls, timing, and other
metadata remain public.
