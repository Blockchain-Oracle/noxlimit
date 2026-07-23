# Reality Research: WTF Winners, Current Crowd, and Opportunity Space

**Research date:** 2026-07-23

## Scope

Verify the current WTF Hackathon brief, inspect the canonical results and complete public artifacts
for the previous iExec VIBE Coding Challenge winners, refresh the visible July 2026 competitor
landscape, identify current product/standards signals, and record what those facts imply for idea
selection.

This is a facts-first brief. Product candidates are ranked separately in
[the revised idea report](../ideas/2026-07-23-iexec-wtf-product-ideas.md).

## Sources Checked

### Hackathon and winners

- [Current WTF Hackathon detail page](https://dorahacks.io/hackathon/wtf-hackathon/detail)
- [Current WTF BUIDL list](https://dorahacks.io/hackathon/wtf-hackathon/buidl)
- [Previous VIBE canonical winners page](https://dorahacks.io/hackathon/vibe-coding-iexec/winner)
- [Diam DoraHacks entry](https://dorahacks.io/buidl/43636),
  [repository](https://github.com/PugarHuda/diam), and
  [live product](https://private-otc.vercel.app)
- [RWAOS DoraHacks entry](https://dorahacks.io/buidl/43431),
  [entry-linked repository](https://github.com/pandu926/rwaOS-mvp), and
  [entry-linked product](https://rwaos.denkhultech.com)
- [DarkOdds DoraHacks entry](https://dorahacks.io/buidl/43656),
  [repository](https://github.com/winsznx/darkodds), and
  [live product](https://darkodds.site)
- Local shallow clones of all three entry-linked repositories at the commits in
  [the source manifest](../sources/source-manifest.md)

### Current competition and Nox

- GitHub repository and code searches for July 2026 `iExec Nox` projects
- The complete local iExec-Nox organization and release-pin corpus described in
  [the source manifest](../sources/source-manifest.md)
- [Nox organization deep dive](./2026-07-22-iexec-nox-org-deep-dive.md)
- [Nox domain wiki](../wiki/index.md)

### Current product and standards signals

- [ERC-8183: Agentic Commerce](https://eips.ethereum.org/EIPS/eip-8183)
- [ERC-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004)
- [Coinbase x402 Bazaar announcement](https://www.coinbase.com/developer-platform/discover/launches/x402-bazaar)
- [Etherisc](https://www.etherisc.com/) and
  [GIF contracts documentation](https://docs.etherisc.com/contracts/2.x/)
- [Ethereum Attestation Service](https://docs.attest.org/)
- Current iExec DataProtector documentation resolved through Context7 as `/websites/iex_ec`
- [EU Batteries Regulation 2023/1542](https://eur-lex.europa.eu/eli/reg/2023/1542/oj?locale=en)
- [EU CBAM overview](https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en)

## Verified Facts

### 1. The organizer explicitly invites ideas outside the suggested lanes

- The challenge asks builders to add privacy to a real, impactful open-source protocol or
  build/merge a genuinely innovative project with Nox.
- The page says not to build only a proof of concept. It asks for an integration clean enough to
  become a real product.
- The underlying transparent protocol should not need modification. The page explicitly names
  batching, layering, or routing as ways to preserve privacy while retaining composability.
- Wallets, Aave/Uniswap/Curve, and Safe/Sablier/Superfluid are marked as suggested targets, followed
  by the explicit warning that builders are not required to choose them.
- Reusing a previous VIBE project is disqualifying.
- Evaluation gives the most visible emphasis to creativity and a real accessible end-to-end path
  without mock data. It also requires Ethereum Sepolia, `feedback.md`, a four-minute maximum video,
  meaningful Nox use, and usable UX.
- The required submission includes a public open-source repository, functional frontend, complete
  setup/deployment/usage documentation, and a public X post linking the demo and repository.
- On 2026-07-23, DoraHacks displayed `13` BUIDLs and `74` hackers. The BUIDL list itself said
  submissions were private, so current projects cannot be completely audited.
- DoraHacks displayed the deadline as `2026/08/01 21:59`. The page snapshot did not expose an
  authoritative timezone label beside that timestamp.

### 2. The previous winners and their exact categories are now verified

| Rank | Winning category | Product | Core user problem | Nox-dependent action |
|---:|---|---|---|---|
| 1st | Best Confidential DeFi | [Diam](https://dorahacks.io/buidl/43636) | Large OTC traders leak trade size and pricing on public DEXs, while Telegram OTC is manual and trusted | Encrypted amounts, sealed bids, `safeSub`/`select` conditional no-op settlement, and ERC-7984 transfers |
| 2nd | Best Institutional Architecture | [RWAOS](https://dorahacks.io/buidl/43431) | RWA issuers and compliance teams cannot expose balances, cap tables, and transfer flows | `fromExternal` encrypted issuance/transfers, confidential balances, and selective disclosure |
| 3rd | Best Confidential Prediction Market | [DarkOdds](https://dorahacks.io/buidl/43656) | Bettors expose position size and trading edge | Encrypted wagers and balances plus TEE-computed proportional payouts |

The canonical ranking comes from the previous hackathon's
[Winners tab](https://dorahacks.io/hackathon/vibe-coding-iexec/winner), not inference from repository
popularity.

### 3. Winner-specific implementation evidence

#### Diam

- The entry links a live Vercel product, two demo-video URLs, a public repository, social posts, and
  verified Arbitrum Sepolia contracts.
- The product supports direct OTC and one-maker-to-many-taker RFQ modes.
- Its main privacy-specific design avoids reverting when a private minimum is not satisfied.
  `Nox.safeSub` and `Nox.select` choose real or zero encrypted transfer amounts while the public
  intent status becomes `Filled` in either case.
- The repository contains contract, frontend, agent, and MCP-server packages; Foundry and Vitest
  tests; `feedback.md`; a demo script; usage documentation; and an X-post draft.
- A real trade still needs wallet connection, faucet assets, token authorization, and another
  participant. The landing-page idea is immediately legible, but the full transaction path is not a
  30-second path.

#### RWAOS

- The entry links a hosted product, a public `rwaOS-mvp` repository, a demo video, and four deployed
  Arbitrum Sepolia contracts.
- It presents an issuer/investor/compliance operating surface spanning onboarding, issuance,
  transfers, disclosure, audit, reports, and settings.
- The entry-linked repository contains a Next.js frontend, Rust/Axum backend, PostgreSQL setup,
  Docker Compose, Hardhat contracts, contract tests, backend integration tests, and frontend
  Playwright tests.
- Its broad product territory includes confidential issuance, cap tables/balances, transfer policy,
  investor eligibility, selective disclosure, and audit anchoring.
- A repository or deployed-contract artifact does not by itself verify that every dashboard record
  is chain-derived or that every described off-chain TEE workflow is deployed. Those claims need
  flow-specific evidence if reused in analysis.

#### DarkOdds

- The entry links a live product, public repository, demo video, and 10 deployed contracts.
- The product uses email/social embedded wallets, sponsored gas, and an in-app faucet. The entry
  explicitly claims a fresh wallet can bet in 30 seconds; this research did not independently time
  that transaction path.
- DarkOdds keeps market/outcome public while encrypting the wager, cUSDC balance, and payout.
- Its technical wedge is proportional pari-mutuel payout computation using multiplication/division
  in the Nox TEE path, followed by encrypted payout state.
- The repository includes Foundry tests, live verification scripts, audit artifacts,
  `KNOWN_LIMITATIONS.md`, `feedback.md`, deployment documentation, a product requirements document,
  and legal/privacy pages.
- Its public material is explicit that the product is testnet-only and records accepted operational
  delegation and other limitations.

### 4. Cross-winner pattern

All three winners:

- begin with a familiar product category and one immediately understandable privacy failure;
- use Nox in the economic state transition rather than as decorative encrypted storage;
- present deployed contracts and transaction evidence;
- pair the contracts with a product-shaped interface and operational workflow;
- make selective disclosure part of the product;
- go beyond “wrap an ERC-20 and hide an amount.”

The strongest repositories additionally expose tests, proof scripts, limitations, deployment
artifacts, and judge-oriented documentation. DarkOdds provides the clearest no-faucet-hunt
onboarding pattern through embedded wallets and sponsored gas.

### 5. Visible July 2026 competition is concentrated

The refreshed GitHub search found 20 repositories created from July 8 through July 23 with explicit
`iExec Nox` descriptions:

| Visible lane | Repositories |
|---|---:|
| Payroll | 8 |
| Safe/budget/policy | 4 |
| Private Uniswap routing | 2 |
| Escrow | 1 |
| CVE audit trail | 1 |
| DeFi strategy agents | 1 |
| Word game | 1 |
| Aave credit/liquidation | 1 |
| Donation/treasury | 1 |

The exact public list captured for this audit is in the
[dated competitor snapshot](../sources/source-manifest.md#visible-july-2026-competitor-snapshot).
Refresh the mutable search with:

```bash
gh search repos 'iexec nox created:>=2026-07-01' --limit 100
```

No repository or code-search result was found for:

- Nox + ERC-8183;
- Nox + ERC-8004;
- confidential agent-job SLA evaluation;
- Nox-gated service-quality escrow.

This is a lower-bound public scan. The 13 DoraHacks submissions are private, and a team can use a
private or poorly indexed repository.

### 6. Agent commerce exposes a current privacy gap that Nox can fill

- Draft ERC-8183 was created on 2026-02-25. It defines an agent-job escrow with client, provider,
  and evaluator roles; Open, Funded, Submitted, Completed/Rejected/Expired states; and optional
  hooks.
- An ERC-8183 evaluator can be a smart contract and may aggregate off-chain signals before calling
  `complete` or `reject`.
- The standard keeps payments separate from reputation but recommends ERC-8004 integration and
  describes ERC-2771/x402-compatible gasless execution.
- ERC-8004 defines identity, reputation, and validation registries for agents. Its examples include
  public numeric feedback such as quality, uptime, response time, success rate, revenue, and trading
  yield.
- ERC-8004 explicitly lists TEE oracles as a validation model.
- Coinbase launched x402 Bazaar as a discovery layer where agents find, call, and pay for services.

Together, these sources verify a current agent-service and trust substrate. They do not prove that
buyers or providers will adopt one particular Nox evaluator.

### 7. Other current product anchors exist, but some have integration or collision caveats

- Etherisc describes itself as an open-source insurance protocol with oracle-driven automated claim
  payments. This is a real downstream anchor for confidential multi-adjuster claim calculation.
- EAS is open-source attestation infrastructure with schema and attestation contracts plus optional
  resolver contracts. It is a real action surface for confidential moderation or eligibility
  decisions.
- iExec DataProtector currently exposes `grantAccess` with `protectedData`, `authorizedApp`,
  `authorizedUser`, `pricePerAccess`, and `numberOfAccess`, and `processProtectedData` for running an
  iApp against protected data.
- `grantAccess` is an SDK/user action, not a documented atomic Solidity callback from a Nox proof.
  A confidential quota product therefore needs a concrete authorization design or an iApp that
  checks Nox state. It must not claim a direct atomic integration before that path is proven.
- EU battery-passport and CBAM rules provide current confidentiality-sensitive enterprise
  workflows, but products centered on tokenized batteries, asset compliance, or broad institutional
  control planes sit close to RWAOS's winning territory.

## Inferences

- **SLA Lock is the strongest current hypothesis.** It uses a new 2026 open standard, occupies an
  uncrowded lane, makes Nox the evaluator for a real escrow transition, and can present a one-action
  judge path.
- A credible SLA product needs signed monitor telemetry. Self-reported or synthetic metrics would
  turn the core decision into theater.
- **QuietRound should be a backup, not the default.** Its Nox mechanism is valid, but its
  grant/funding adjacency, multi-reviewer setup, private-voting objection, and Allo integration gate
  are strategically weaker after the winner audit.
- SafePlay and other gaming concepts should be demoted because DarkOdds already owns the strongest
  confidential-gaming story.
- Battery/RWA/compliance concepts should be demoted because RWAOS already won with an unusually broad
  institutional architecture.
- OTC, sealed bidding, dark pools, and private trade routing should be excluded because Diam won that
  lane and current private-swap projects add further crowding.
- “Selective disclosure” is no longer a differentiator by itself; all three previous winners used it.
- A judge should first see a live case/proof explorer without connecting a wallet. The optional
  participant path can use an embedded or pre-funded wallet and sponsored transactions.
- “Try in 30 seconds” should mean no setup friction and immediate comprehension. Nox's asynchronous
  resolution means the product must display a durable pending state rather than promise a universal
  sub-30-second settlement.

## Unknowns And Questions

- What is the authoritative timezone for the displayed August 1 `21:59` deadline?
- What are the 13 private DoraHacks submissions, and does one already target agent SLAs?
- Which Ethereum Sepolia ERC-8183 implementation/deployment should be treated as the integration
  anchor, or should the unchanged reference implementation be deployed by the project?
- Will the organizer accept an unmodified draft ERC reference implementation as the open-source
  protocol integration target?
- What monitor or evaluator can sign credible live agent telemetry for the minimal product?
- Can the complete Nox input → compute → public proof → ERC-8183 terminal-action path pass locally
  and on Ethereum Sepolia with current release pins?
- Can a DataProtector iApp consume Nox authorization state cleanly enough to keep VeilQuota viable?
- What practical p50/p95 Nox result latency should the product expect during judging week?

## Not Included

- Product specification, architecture, stories, implementation plan, code, deployment, or submission
  assets.
- Claims that the organizer has approved any new concept.
- Republishing the three winner repositories or the iExec-Nox organization mirrors.
