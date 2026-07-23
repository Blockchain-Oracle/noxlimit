# iExec WTF Hackathon: Ranked Idea Shortlist

> **Superseded for product selection on 2026-07-23.** The canonical prior-winner audit and current
> crowd scan demoted QuietRound to a backup. Use
> [the revised product idea menu](./2026-07-23-iexec-wtf-product-ideas.md) for current ranking.
> This file remains a historical record and a source of technical concept detail.

> **Historical source-audit correction:** At the time of the 2026-07-22 audit, QuietRound remained
> the recommendation, but the audit reduced its score and reshaped the integration after verifying
> Nox's asynchronous execution, Allo's compiler constraints, and the encrypted-input caller path.
> The later [organization deep dive](../research/2026-07-22-iexec-nox-org-deep-dive.md) additionally
> required exact release pins, application replay guards, `euint256` scores/totals, and
> receipt-verified finalization. See
> [the concept audit](../verification/2026-07-22-quietround-concept-audit.md). This conclusion is
> superseded by the banner above.

## Decision Lens

The ranking uses a multiplicative win test:

`judge can try it with little friction × it obviously needs Nox × it feels like a real product`

Demand, originality against the visible project corpus, and delivery feasibility before the reported August 1 deadline then break ties. Scores are directional, not promises.

| Rank | Concept | Try /5 | Needs Nox /5 | Real product /5 | Multiplicative score /125 | Difficulty | Collision risk |
|---:|---|---:|---:|---:|---:|---|---|
| 1 | QuietRound | 4 | 5 | 4.5 | 90 | Medium–High | Low–Medium |
| 2 | VeilSub | 5 | 5 | 5 | 125 | Medium–High | Low |
| 3 | SealedGovernor | 4 | 5 | 5 | 100 | High | Medium |
| 4 | QuietProcure | 5 | 5 | 5 | 125 | Medium | High |
| 5 | RiskPilot | 4 | 4 | 5 | 80 | High | High |
| 6 | ShieldedBounty | 4 | 5 | 5 | 100 | Medium | High |
| 7 | VeilDCA | 4 | 5 | 4 | 80 | High | Very high |
| 8 | HiddenMatch | 5 | 5 | 5 | 125 | Medium | Very high |

The lower-ranked 125-point ideas fall because the visible competition/reuse risk is severe. The multiplicative score prevents a technically impressive but untryable concept from floating to the top; collision and feasibility still matter after that gate.

## 1. QuietRound — Confidential Allocation Panels

**It's like:** DoraHacks judging plus Gitcoin Allo, but each reviewer's rubric scores stay encrypted until a proof-verified winner is finalized and paid.

**The problem:** Public or prematurely shared scores let later reviewers anchor on earlier opinions, encourage strategic scoring, expose dissent, and create pressure on grant or procurement panels. Organizers also need more than a spreadsheet: the decision should end in a real, auditable payout.

**Why it needs Nox:** Each criterion score is an encrypted supported integer. Nox privately clamps and adds scores, compares totals, and selects a winner. Neither the organizer nor other reviewers sees the scores during the round. At close, only the winner index is made publicly decryptable. The returned decryption proof is verified on-chain before an Allo-compatible custom strategy distributes real Sepolia funds through the unchanged official Allo v2 contract.

**The low-friction try:** Connect a normal wallet, score three demo projects for Creativity, Technical Execution, and UX, then open the public view and see that the scores and totals are unreadable. Close the round, observe the explicit `Computing securely…` state while Nox resolves the winner asynchronously, then submit the proof and watch the official Allo v2 pool pay the winner.

**Who actually uses it:** Hackathon operators, ecosystem grant programs, venture committees, public-goods allocators, and DAO procurement panels.

**Trend and feasibility:** Gitcoin reports that GG24 distributed more than $1.8 million and used MACI private voting among its allocation mechanisms, proving current demand for private capital-allocation decisions. Stable Allo v2 is deployed on Ethereum Sepolia and explicitly supports custom strategies. Nox exposes the required numeric encryption, addition, comparison, ACL, public decryption, and on-chain proof verification. The main engineering caveat is that current Nox requires Solidity 0.8.35 while stable Allo's inherited `BaseStrategy` dependency graph pins one file to 0.8.19; the MVP should implement the Allo strategy ABI directly rather than inherit that base. Sources: [GG24](https://gitcoin.co/case-studies/gg24-first-funding-round-of-gitcoin-3-0), [Allo docs](https://docs.allo.gitcoin.co/), [Allo contracts](https://github.com/allo-protocol/allo-v2), [Nox contracts](https://github.com/iExec-Nox/nox-protocol-contracts).

**Build difficulty:** Medium–High. The winning MVP is deliberately narrow: one Allo pool, three projects, a fixed three-criterion rubric, three reviewers, an asynchronous close/proof sequence, and one real native Sepolia ETH payout.

**Verified type shape:** Encrypt each rubric score as `uint256` and aggregate as `euint256`. Nox has no encrypted `euint16 → euint256` cast, so mixing small-width score handles with wide totals would fail type validation. The winner index may remain a separate `euint16` selected only against other `euint16` values.

**Kill risks:** “Private voting already exists” is the main product objection. The answer must be visible in the product: this is a reusable confidential rubric/decision engine with a minimal winner disclosure and an Allo payout, not a generic yes/no ballot. The main technical risks are implementing the Allo strategy ABI cleanly at Solidity 0.8.35, preserving the encrypted-input owner through the call path, and proving the asynchronous Nox result before distribution. Confirm eligibility in Discord and clear those gates before UI polish.

## 2. VeilSub — Private Subscription Aggregation

**It's like:** Stripe Billing plus Superfluid, but individual subscriber plan prices remain private while the merchant receives one aggregate public settlement stream.

**The problem:** Public recurring payments reveal a business's customer relationships, pricing tiers, churn events, and revenue concentration. A creator, SaaS company, or DAO may want verifiable recurring settlement without publishing each customer's rate.

**Why it needs Nox:** Subscriber balances, plan rates, and accrued obligations live as encrypted handles. Nox adds the current obligations into one aggregate settlement amount or rate. Only the aggregate is revealed to a settlement adapter, which funds an unchanged Superfluid stream; individual rates never become public protocol inputs.

**The low-friction try:** Subscribe to one of three plans, switch to the merchant view, and see the aggregate stream rise while the subscriber's plan and rate remain masked. Open the explorer link and see one merchant stream instead of an individual public stream.

**Who actually uses it:** On-chain SaaS companies, paid communities, creators, API providers, and DAOs selling memberships.

**Trend and feasibility:** Polygon launched wallet-level private USDC/USDT payments in 2026 and said payments, payroll, and treasury partners treated confidentiality as a prerequisite. Superfluid's open protocol is active and provides the recognizable settlement rail. Sources: [Polygon private payments](https://polygon.technology/blog/private-payments-are-live-on-polygon), [Superfluid protocol](https://github.com/superfluid-org/protocol-monorepo), [Nox ERC-7984 wrapper](https://docs.noxprotocol.io/guides/build-confidential-tokens/erc20-to-erc7984-wrapper).

**Build difficulty:** Medium–High. The hard part is a correct aggregate-settlement lifecycle and a crisp explanation of the privacy boundary.

**Kill risks:** Wrapping and the merchant's aggregate Superfluid rate are public, and Nox does not provide anonymity. The product must claim private plan/rate accounting—not hidden identities or a completely unlinkable cash flow. A single subscriber provides no aggregation privacy, so the demo needs multiple real subscriptions.

## 3. SealedGovernor — Private-Until-Close DAO Voting

**It's like:** Tally/OpenZeppelin Governor, but individual votes and running totals remain confidential until the voting period closes.

**The problem:** Live public voting creates bandwagon effects, exposes dissent, and makes vote-buying or pressure easier. DAOs still need the final result and execution to remain public and verifiable.

**Why it needs Nox:** Each vote is an encrypted boolean or numeric weight. Nox aggregates For/Against/Abstain without revealing individual choices, then publicly decrypts the final totals with proofs after the deadline. The adapter forwards the final result to an unchanged Governor execution flow.

**The low-friction try:** Cast a vote, switch accounts, and verify that neither the choice nor live tally is visible. End the short demo round and see the public result plus the executed proposal.

**Who actually uses it:** DAOs, investment committees, protocol councils, cooperatives, and token-holder communities.

**Trend and feasibility:** Gitcoin's recent GG24 round used MACI private voting, showing concrete demand. OpenZeppelin Governor remains the standard open-source reference implementation, and Nox supports the arithmetic/comparison/proof path. Sources: [GG24](https://gitcoin.co/case-studies/gg24-first-funding-round-of-gitcoin-3-0), [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts), [Nox public-decryption API](https://docs.noxprotocol.io/references/js-sdk/methods/publicDecrypt).

**Build difficulty:** High. An honest integration must solve voting-power custody/delegation and translate a confidential multi-option tally into valid Governor actions without leaking each choice through delegation.

**Kill risks:** Private voting is not novel by itself. If the integration degrades to a standalone poll or simulated Governor action, it fails the sponsor's clean-integration test.

## 4. QuietProcure — Sealed DAO Procurement

**It's like:** Coupa procurement plus Safe, but vendor bids and the buyer's reserve budget remain confidential until Nox selects a winner.

**The problem:** Public bids encourage undercutting, leak supplier pricing, and expose a DAO's maximum budget. The final supplier and payment still need transparent treasury approval.

**Why it needs Nox:** Vendors submit encrypted bids; the buyer submits an encrypted ceiling. Nox compares values and selects the lowest eligible bid. Only the winner and final payable amount are revealed with a proof, then an unchanged Safe executes payment.

**The low-friction try:** Submit two bids from separate wallets, observe that neither bidder nor Safe owners can read the competing price, then close bidding and see the winner's real Safe payment.

**Who actually uses it:** DAOs, foundations, grant operators, protocol teams, and on-chain companies buying services.

**Trend and feasibility:** Safe remains a widely recognized open-source treasury product, and encrypted comparisons are directly supported by Nox. Source: [Safe smart account](https://github.com/safe-fndn/safe-smart-account).

**Build difficulty:** Medium.

**Kill risks:** Prior Nox projects already include OTC desks and sealed-bid mechanisms, while this WTF cohort has several Safe integrations. It is feasible but likely to look derivative unless the procurement workflow and deployable Safe adapter are unusually polished.

## 5. RiskPilot — Confidential Aave Safety Automation

**It's like:** DeFi Saver for Aave, but a user's emergency health threshold and maximum top-up amount stay private until protection is needed.

**The problem:** Public automation thresholds announce exactly when and how a position will be defended, which can reveal strategy and invite adversarial timing.

**Why it needs Nox:** The user's risk threshold and reserve cap are encrypted. Nox compares live public health data against the private threshold and reveals only an authorized execute/no-execute result and the minimal action needed. The adapter performs a real Aave repay or collateral top-up.

**The low-friction try:** Configure a hidden threshold, move a demo position toward risk, and watch one real protection transaction execute without the configured limit ever appearing on-chain.

**Who actually uses it:** Leveraged DeFi users, funds, and treasury managers.

**Trend and feasibility:** Institutional privacy and MEV protection are explicit Nox use cases. Source: [Nox use cases](https://docs.noxprotocol.io/getting-started/use-cases).

**Build difficulty:** High.

**Kill risks:** Aave positions and health factors are already public, so the incremental privacy must be explained precisely. The current Skia project already targets Aave credit/liquidations, and the older `aave-v3-core` repository is archived. Integration and originality risk are both high.

## 6. ShieldedBounty — Confidential Security Bounties

**It's like:** Immunefi plus Safe, but vulnerability severity, negotiated reward, and researcher payout amount remain selectively disclosed.

**The problem:** Publishing severity before a patch increases exploit risk; publishing reward amounts and researcher compensation can expose security posture and negotiation leverage.

**Why it needs Nox:** Severity and reward are encrypted numeric handles. Only the triage committee and researcher receive viewer access. A Safe-funded confidential token pool pays the accepted bounty while the public record shows only status and a later disclosure receipt.

**The low-friction try:** File a demo report, triage it with an encrypted severity/reward, accept it as the researcher, and receive a real confidential-token payout while public viewers see only handles.

**Who actually uses it:** Protocol security teams, audit collectives, DAOs, and independent researchers.

**Trend and feasibility:** Nox ACLs and ERC-7984 transfers directly support the privacy boundary. Sources: [Nox viewer ACL](https://docs.noxprotocol.io/guides/manage-handle-access/viewers), [Nox ERC-7984](https://docs.noxprotocol.io/guides/build-confidential-tokens/erc7984-token).

**Build difficulty:** Medium.

**Kill risks:** A current WTF repository already presents an encrypted CVE audit trail, and the prior PrivateGrant project covers bounty payouts. The real-world judgment of whether a vulnerability is valid remains a trusted committee action.

## 7. VeilDCA — Confidential Batched Dollar-Cost Averaging

**It's like:** CoW Swap recurring orders routed to Uniswap, but each user's total size, schedule, and slippage limit remain private while only aggregate child swaps hit the public pool.

**The problem:** Public recurring orders reveal future demand and make large strategies easy to copy or trade against.

**Why it needs Nox:** Nox maintains encrypted schedules, remaining balances, and limits, then nets due orders into one public execution amount. An unchanged Uniswap pool receives only the aggregate trade.

**The low-friction try:** Create two hidden recurring orders, trigger a batch, and compare encrypted per-user state with the single real Uniswap transaction.

**Who actually uses it:** Funds, DAOs, token treasuries, and long-term retail accumulators.

**Trend and feasibility:** Confidential intents and private swaps are a visible 2026 product trend, and Nox explicitly supports encrypted DeFi intents. Source: [Nox use cases](https://docs.noxprotocol.io/getting-started/use-cases).

**Build difficulty:** High.

**Kill risks:** ShadowSwap is already a current WTF entry, and multiple prior Nox projects implement swaps, hooks, or private trading. A batch with too few users also leaks strategy through timing and amount inference.

## 8. HiddenMatch — Confidential Donor Allocation

**It's like:** Gitcoin Grants, but individual donor allocations remain private until a round closes and Allo receives only the final funding distribution.

**The problem:** Public donations can expose wealth, invite social pressure, and let later donors copy early allocation signals.

**Why it needs Nox:** Contributions and per-project allocations are encrypted and privately summed. Only final project totals are publicly decrypted and passed to an unchanged Allo distribution strategy.

**The low-friction try:** Donate to two real Sepolia projects, verify that the public UI and explorer cannot read the split, then close the round and watch Allo distribute the pool.

**Who actually uses it:** Public-goods communities, foundations, mutual-aid groups, and ecosystem funds.

**Trend and feasibility:** Allo is explicitly built for novel capital allocation and Gitcoin continues to operate large funding rounds. Sources: [Allo docs](https://docs.allo.gitcoin.co/), [GG24](https://gitcoin.co/case-studies/gg24-first-funding-round-of-gitcoin-3-0).

**Build difficulty:** Medium.

**Kill risks:** This is too close to previous confidential crowdfunding/funding projects and the current Sitr donation project. It is technically clean but strategically the weakest choice.

## Top Three

### 1. QuietRound

It has the cleanest sponsor story: encrypted user inputs, real TEE computation, deliberate ACLs, public proof verification, and an actual payout through an unchanged open-source protocol. The demo has one obvious privacy reveal, the current competitor scan found no Nox/Allo or private-rubric entry, and the MVP can be narrow enough to finish.

### 2. VeilSub

It looks most like a new product category and benefits from strong private-payments momentum. It ranks second because aggregation and settlement semantics create more technical and privacy-claim risk than QuietRound.

### 3. SealedGovernor

It solves an obvious, proven problem and makes Nox indispensable. It ranks third because a real unmodified-Governor integration is substantially harder than the superficially simple “private voting” pitch suggests.

## Historical Recommendation (2026-07-22; Superseded)

The 2026-07-22 recommendation was to choose **QuietRound** and validate this one sentence with iExec
in Discord before implementation:

> We are building a confidential rubric and capital-allocation strategy for hackathons, grants, and review panels: Nox keeps every reviewer's numeric scores and intermediate totals encrypted, then an on-chain verified decryption proof authorizes a real payout through an unmodified Allo Protocol pool on Ethereum Sepolia. Is this sufficiently distinct from prior VIBE projects and aligned with the required open-source integration pattern?

Do not start with payroll, a generic Safe spending limit, a generic private swap, crowdfunding, or a standalone encrypted poll.
