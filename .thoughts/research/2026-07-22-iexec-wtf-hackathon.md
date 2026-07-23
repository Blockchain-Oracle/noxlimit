# Reality Research: iExec WTF Hackathon Summer Edition

> **2026-07-23 update:** The previous VIBE winners and exact ranks are now verified, and the visible
> July competitor scan has been refreshed. Use
> [the winner and opportunity audit](./2026-07-23-iexec-wtf-winners-and-opportunity-space.md) for
> current idea selection.

> **Audit addendum:** Live package, Sepolia, status, compiler, and caller-context findings from the adversarial passes are recorded in [the QuietRound concept audit](../verification/2026-07-22-quietround-concept-audit.md). The subsequent [full iExec-Nox organization deep dive](./2026-07-22-iexec-nox-org-deep-dive.md) mirrors all public repositories and exact release tags; it is authoritative for Nox implementation facts where this first-pass brief differs.

## Scope

Determine the current rules, technical constraints, Nox capabilities, prior-project collision risks, and open-source integration opportunities relevant to choosing an iExec WTF Hackathon project. This brief records current reality only; project recommendations are kept in the separate idea-scout artifact.

## Sources Checked

- User-provided hackathon brief; its relevant contents are incorporated into this research corpus.
- User-provided Nox documentation export; its relevant contents are incorporated here and checked
  against the canonical documentation links below.
- [WTF Hackathon DoraHacks page](https://dorahacks.io/hackathon/wtf-hackathon/detail) (blocked by AWS WAF in automated requests)
- [VIBE Coding DoraHacks page](https://dorahacks.io/hackathon/vibe-coding-iexec/detail) (blocked by AWS WAF in automated requests)
- [WTF Hackathon mirror on CompeteHub](https://competehub.dev/en/competitions/dorahackswtf-hackathon)
- [Nox welcome documentation](https://docs.noxprotocol.io/getting-started/welcome)
- [Nox Hello World](https://docs.noxprotocol.io/getting-started/hello-world)
- [Nox networks](https://docs.noxprotocol.io/getting-started/networks)
- [Nox use cases](https://docs.noxprotocol.io/getting-started/use-cases)
- [Nox ERC-20 to ERC-7984 wrapper](https://docs.noxprotocol.io/guides/build-confidential-tokens/erc20-to-erc7984-wrapper)
- [Nox viewer ACL guide](https://docs.noxprotocol.io/guides/manage-handle-access/viewers)
- [iExec-Nox GitHub organization](https://github.com/iExec-Nox)
- [Nox protocol contracts](https://github.com/iExec-Nox/nox-protocol-contracts)
- [Nox Handle SDK](https://github.com/iExec-Nox/nox-handle-sdk)
- [Nox Hardhat plugin](https://github.com/iExec-Nox/nox-hardhat-plugin)
- [Nox live status](https://status.noxprotocol.io/)
- Context7 resolution and documentation lookup for Nox (`/iexec-nox/documentation`)
- GitHub repository and code searches for past and current Nox hackathon projects
- [Allo Protocol documentation](https://docs.allo.gitcoin.co/)
- [Allo v2 contracts](https://github.com/allo-protocol/allo-v2)
- [Gitcoin GG24 case study](https://gitcoin.co/case-studies/gg24-first-funding-round-of-gitcoin-3-0)
- [Superfluid protocol monorepo](https://github.com/superfluid-org/protocol-monorepo)
- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts)
- [Safe smart account](https://github.com/safe-fndn/safe-smart-account)
- [Polygon private payments announcement](https://polygon.technology/blog/private-payments-are-live-on-polygon)

## Verified Facts

### Competition shape

- The competition asks builders to add privacy to a real, impactful open-source protocol or create a genuinely innovative Nox integration. The stated target is a clean integration that could become a deployable product, not a proof of concept.
- The underlying public protocol should remain unmodified. The brief explicitly encourages batching, layering, or routing through Nox while preserving composability.
- Suggested targets include wallets such as MetaMask/Rabby/Rainbow; DeFi protocols such as Aave/Uniswap/Curve; and treasury/payment protocols such as Safe/Sablier/Superfluid. These are suggestions, not mandatory targets.
- The supplied brief says previous VIBE projects covered payments/payroll, lending, vaults/yield, OTC/trading, prediction markets/auctions, RWA/real estate, fundraising/VC, and invoicing. It warns that a builder reusing a previous VIBE project will be disqualified.
- Teams may have up to five members. The prize pool is $1,500: $750, $500, and $250.
- Required submission material includes a public open-source repository, working frontend, installation and deployment documentation, an X post tagging `@iEx_ec`, and a demo video no longer than four minutes.
- The supplied brief explicitly scores an accessible end-to-end path without mock data, deployment on Ethereum Sepolia, a repository-level `feedback.md`, technical use of Nox, creativity, and UX.
- The accessible competition mirror lists the event as July 1–August 1, 2026. The exact August 1 cutoff time and timezone were not visible because the canonical DoraHacks page triggered AWS WAF.

### Nox capabilities and boundaries

- Nox represents encrypted values as 32-byte handles. Plaintext is stored off-chain in encrypted form; contracts manipulate handles while TEE runners perform confidential computation.
- Handle access is controlled on-chain. Contracts can grant persistent compute access, viewer access for decryption, transient access, or public decryption.
- Nox is confidentiality, not anonymity. The official Hello World guide states that addresses and function calls remain visible; balances and amounts are what become encrypted.
- Current protocol code supports Ethereum Sepolia (`11155111`) and Arbitrum Sepolia (`421614`). The current `Nox.sol` resolves Ethereum Sepolia's `NoxCompute` contract to `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF`.
- A live Ethereum Sepolia RPC check at block `11,329,649` confirmed deployed bytecode at that NoxCompute address and at the official Allo v2 Proxy and Registry addresses.
- The current implemented encrypted input subset is `bool`, `uint16`, `uint256`, `int16`, and `int256`. The Handle SDK warns that other declared SDK types are not yet implemented by the protocol.
- Nox currently exposes encrypted arithmetic, safe arithmetic, comparisons, and conditional selection. This is sufficient for private score aggregation, thresholds, rankings, limits, and balance updates using supported numeric types.
- A frontend can call `publicDecrypt()` to obtain plaintext plus a decryption proof. A Solidity contract can then call `Nox.publicDecrypt(handle, proof)` to verify that result on-chain before executing a public action.
- A result handle must be granted the correct access before a transaction ends. The Hello World guide calls forgotten `allowThis`/`allow` grants the primary new-developer failure mode.
- Viewers are permanent in the current documented ACL model: the viewer guide warns that a viewer cannot be removed once added.
- ERC-20 to ERC-7984 wrapping is one public transaction because the wrap amount is public. Unwrapping is two-step because the encrypted burn amount must first be publicly decrypted with a proof. Therefore, products must not claim that shielding/unshielding hides every link or provides anonymity.
- Official documentation is marked as under development and the Nox repositories were changing during this research window. Package APIs and deployed addresses need to be pinned and reverified during implementation.
- Current published package pins are `@iexec-nox/nox-protocol-contracts@0.2.4`, `@iexec-nox/handle@0.1.0-beta.13`, and `@iexec-nox/nox-hardhat-plugin@0.1.0`. The plugin is available on npm and targets Hardhat 3; Foundry instructions remain incomplete.
- The default branches do not equal those published payloads even though they retain the same version strings: contracts, Handle SDK, and plugin are respectively 29, 5, and 2 commits ahead. Ethereum Sepolia remains on the repository's v0.2.3 implementation; v0.2.4 has identical contract files and is the compatible npm import. Current contract `main` exposes APIs the live proxy does not support.
- Nox arithmetic requires matching encrypted types and implements no `euint16` to `euint256` cast. A score-aggregation product should use `euint256` for both submitted scores and totals rather than mixing widths.
- Input and public-decryption proofs have no application-consumed nonce. QuietRound needs explicit replay guards for score submission and one-shot distribution state bound to its stored winner handle.
- A live Ethereum Sepolia transaction observed through Nox's own Nexus/Hasura source resolved an `Add`/comparison/multi-`Select` chain about 12 seconds after its block timestamp. This verifies the needed operation shape, not a general latency guarantee.
- The live Nox status page reported all systems operational during the second-pass audit, although historical short component outages mean clients still need pending, retry, and timeout states.

### Existing and competing project landscape

- A GitHub repository search for the exact phrase `"iExec Nox"` returned 34 repositories: 18 created in July 2026 and 16 created earlier. This is a lower bound, not a complete submission list.
- Seven of the 18 July repositories are plainly payroll-related. Other visible July clusters include Safe budget/policy controls, Uniswap batching, escrow, private DeFi strategy, Aave liquidation/credit, donations, and a CVE audit trail.
- Examples of current-crowd collision include:
  - [Nomos](https://github.com/ZenWeb3/Nomos), [Shadow Safe Payroll](https://github.com/YingchenWang999/shadow-safe-payroll), [PrivyRoll](https://github.com/nonggde/privyroll), [VeilPay](https://github.com/FLUFFYWOLF12341/veilpay-nox), and multiple NoxRoll variants for payroll.
  - [NoxGuard](https://github.com/nonggde/noxguard), [NoxSafe](https://github.com/wcqqq1214/noxsafe), [CipherGate](https://github.com/Lukeknow0/ciphergate), and [VeilGuard](https://github.com/a252937166/veilguard) for Safe/policy enforcement.
  - [ShadowSwap](https://github.com/Obiajulu-gif/shadowswap) for confidential batched Uniswap swaps.
  - [Skia](https://github.com/Xconmax245/Skia) for Aave credit and sealed-bid liquidations.
- GitHub code search found at least 35 repositories depending on `@iexec-nox/nox-protocol-contracts`; prior projects include confidential payroll, vaults, swaps, private grants, crowdfunding, VC/fundraising, OTC, RWA, and lending.
- Particularly relevant prior-project collision risks are:
  - [PrivateGrant Vault](https://github.com/farouk-allani/private-grant): confidential grant/bounty/payroll payout amounts.
  - [SeaFund](https://github.com/Asyfdzaky/seafund): confidential proposals and funding.
  - [SeaEquity](https://github.com/Asyfdzaky/sea-equity-confidential-vc-fund): private VC deal terms and settlement.
  - [FUNDME](https://github.com/Zifeng-Ma/FUNDME): confidential crowdfunding contributions and TEE-computed rankings.
- No GitHub repository or code-search hit was found for an iExec Nox integration with Allo Protocol, confidential hackathon/grant rubric scoring, confidential subscriptions, or Nox-based governance voting at the time of research.
- A fresh July-created repository scan during the second pass found 19 visible `iexec nox` repositories. Exact searches for `QuietRound`, Nox + Allo, confidential scoring, and code containing both `@iexec-nox` and Allo still returned no hit. This remains a lower-bound scan rather than a complete submission registry.
- The official announcement of prior VIBE winners was not discoverable through indexed web search, the canonical DoraHacks page was WAF-blocked, and the attachment does not name winners. The project corpus above is therefore a collision scan, not a verified winners list.

### Open-source integration evidence

- Stable Allo v2 is deployed on Ethereum Sepolia. Its core contract accepts custom strategies and exposes recipient registration, allocation, and distribution through the unchanged Allo contract.
- Current Nox `Nox.sol` requires Solidity `^0.8.35`. Stable Allo v2's inherited `BaseStrategy` graph imports `Transfer.sol`, which pins exactly Solidity `0.8.19`. A Nox-enabled custom strategy should therefore implement the Allo strategy ABI directly at 0.8.35 rather than inherit and patch the stable base source. This is a required implementation spike, not yet verified code.
- Allo repository-level and Solidity source licensing is AGPL-3.0 even though its `package.json` says MIT. Do not copy or vendor Allo source based on the package metadata alone.
- Gitcoin's March 2026 GG24 case study reports more than $1.8 million distributed across six domains and explicitly says the round combined multiple mechanisms including MACI private voting. This provides current evidence that private capital-allocation decisions are a real, used category rather than an invented hackathon problem.
- Superfluid's open protocol monorepo was active in July 2026. It is a viable integration target for a private subscription layer, but its public stream rate means a privacy layer must aggregate multiple subscribers rather than claim an individual public stream is private.
- OpenZeppelin Governor, Safe, Uniswap, and Superfluid all remain active open-source targets. Aave's `aave-v3-core` repository is archived, so a build would need to follow the currently maintained Aave deployment/contracts source instead of assuming that repository is the live integration authority.

## Inferences

- With roughly ten calendar days remaining on July 22, ideas requiring novel cryptography, a new wallet extension, complex keepers, or several external protocols have much higher delivery risk than a focused adapter with one confidential computation and one real settlement action.
- Payroll is strategically weak for this edition even though the sponsor lists it: it is both a prior VIBE category and the most visibly crowded July 2026 repository cluster.
- Safe policy enforcement and private swap routing are also crowded. A technically competent entry there would need exceptional UX and a sharply different mechanism to avoid looking derivative.
- Nox is strongest when sensitive numeric inputs remain encrypted through aggregation/comparison and only a minimal final result is publicly decrypted with a verifiable proof.
- A confidential decision layer that ends in a real Allo payout fits the challenge unusually cleanly: private inputs and computation are Nox-native, while recipient registration and fund distribution remain real Allo behavior on Sepolia.
- Nox input proofs bind an owner and application contract. Calling the standard `Nox.fromExternal` helper inside an Allo-routed strategy call would see Allo as `msg.sender`, not the original reviewer. A direct reviewer-to-strategy score-submission function is the lowest-risk MVP path; any explicit-owner validation through `Allo.allocate` must be proven separately.
- The exact package/live split means the implementation should pin all Nox versions without caret ranges and use release-tag source as the code authority. Default-branch code is forward-looking context only.
- The absence of a visible Nox/Allo competitor is only a search result, not proof that no private or unindexed team is building one.

## Unknowns And Questions

- What is the exact August 1 submission time and timezone?
- Will the sponsor explicitly confirm that a custom Allo `BaseStrategy` counts as a clean integration with an unmodified public protocol?
- Will the organizers freeze or recommend the currently published Nox package versions for judging week?
- Can a minimal Solidity 0.8.35 contract implement the stable Allo v2 strategy ABI, initialize through the official proxy, and complete a Nox-proof-authorized native ETH distribution end to end?
- Are there unpublished or private teams already building confidential allocation/judging or subscriptions?
- What are the 13 private current WTF submissions, and do any collide with the revised top three?

## Not Included

- Product specification, architecture, implementation plan, UI design, code, deployment, or submission assets.
- Claims that a concept has been approved by iExec. Originality and eligibility should be validated in the hackathon Discord before implementation.
