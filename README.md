# iExec WTF Hackathon Context Pack

This repository is the research brain for choosing and building an original iExec WTF Hackathon
product. It contains source-pinned Nox implementation research, a verified audit of the previous
three winners, a live competitor scan, a revised product-idea menu, and prompts that another coding
agent can inherit without restarting discovery.

**Current state:** idea discovery is complete enough to choose a direction, but no product has been
selected or implemented. **SLA Lock** is the current front-runner, not a locked decision.

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

## What changed in the second audit

The earlier research recommended **QuietRound**, a confidential rubric and Allo payout product.
After inspecting the actual previous winners and the current July build landscape, that concept is
now a backup:

- grant/funding adjacency creates avoidable reuse risk;
- a multi-reviewer round is weak as a zero-friction first experience;
- its Allo integration adds a compiler/interface gate;
- private voting is an immediate judge objection.

The new front-runner is **SLA Lock**, a proposed iExec Nox evaluator for ERC-8183 agent-job escrow.
The intended flow evaluates private latency, cost, failure-rate, and quality telemetry, reveals only
pass/fail, then uses the verified result to release or refund a real escrow. This flow is not yet
implementation-verified. It occupies none of the prior winner lanes and had no visible
Nox/ERC-8183 competitor in the dated GitHub scan.

## Read order for an agent

1. [Agent handoff](./AGENT_HANDOFF.md)
2. [Winner and opportunity research](./.thoughts/research/2026-07-23-iexec-wtf-winners-and-opportunity-space.md)
3. [Revised product idea menu](./.thoughts/ideas/2026-07-23-iexec-wtf-product-ideas.md)
4. [Current product decision](./.thoughts/decisions/CURRENT.md)
5. [Nox domain wiki](./.thoughts/wiki/index.md)
6. [Known contradictions](./.thoughts/wiki/nox-known-contradictions.md)
7. [Source manifest](./.thoughts/sources/source-manifest.md)
8. [Agent prompts](./prompts/README.md)

The 2026-07-22 QuietRound documents remain useful technical evidence, but their old recommendation
is superseded by the 2026-07-23 winner and opportunity audit.

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
