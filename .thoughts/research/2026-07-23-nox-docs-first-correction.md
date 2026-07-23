# Nox Documentation-First Use-Case Correction

**Research date:** 2026-07-23

**Status:** Complete source audit; corrected discovery completed

## Executive correction

The previous product search understood Nox's low-level runtime reasonably well but did not mine the
current documentation as a product corpus. That materially narrowed the search space.

The user was right about the central failure:

- Nox explicitly endorses DeFi/lending, vaults/yield, prediction markets, Identity, NFT,
  invoicing, payments, trading, RWA, and fundraising/VC.
- The docs contain dedicated product theses for an encrypted-strategy vault, a DeFi capital
  allocator, and RWA issuance.
- The organization already provides substantial ERC-7984, cToken, cVault, frontend, proof-retry,
  and local Hardhat boilerplate.

The precise cause is now verified. The generated `llms-full.txt` silently removes Vue-rendered
cards and grids. On the Use Cases page it leaves both product sections visually empty. The cloned
source contains all five product cards and all ten category labels.

One specific user hypothesis did not survive source verification: DarkOdds did not merely route
trades to Polymarket. It built a native Nox prediction-market protocol; Polymarket was a read-only
discovery/display side arm. A generic native confidential prediction market is therefore not an
unclaimed gap.

## Corpus actually read

This audit used:

- the complete 7,090-line `https://docs.noxprotocol.io/llms-full.txt` capture;
- the current [`iExec-Nox/documentation`](https://github.com/iExec-Nox/documentation) source at
  commit [`ce4262e`](https://github.com/iExec-Nox/documentation/commit/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7);
- the user-supplied 358-line attachment;
- Context7's current official `/iexec-nox/documentation` corpus;
- all 20 public iExec-Nox repositories, especially
  [`nox-product-poc`](https://github.com/iExec-Nox/nox-product-poc/tree/3dd5d49a78d3fcda8879307e9e132ebe12502c71),
  [`nox-confidential-contracts`](https://github.com/iExec-Nox/nox-confidential-contracts/tree/e685645986af394ab5507c0c67e611650f4e4d33),
  and the exact released protocol/SDK sources;
- the previous-winner repositories, especially
  [`winsznx/darkodds`](https://github.com/winsznx/darkodds/tree/b1833f81968626fbc1a02138dd4154d9b3e6fef8).

The attachment is an index/table-of-contents-style extract repeated several times rather than the
complete body. The URL supplied by the user did provide the complete generated body, and the cloned
source recovered the missing component-rendered content.

Checksums and exact source pins are in the [source manifest](../sources/source-manifest.md).

## What the source page contains

The official
[`src/getting-started/use-cases.md`](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases.md)
contains five cards:

1. Confidential Vault: Encrypted Strategy
2. Confidential Vault: Encrypted Positions
3. Confidential Tokens
4. DeFi Capital Allocator
5. RWA Issuance & Distribution

It then names ten build categories:

1. Payments & Payroll
2. DeFi & Lending
3. Vaults & Yields
4. OTC & Trading
5. Prediction Markets
6. RWA & Real Estate
7. Fundraising / VC
8. Identity
9. NFT
10. Invoicing

The generated capture has only the headings and introduction at lines 431–447; every card and
category is absent. Any product audit based only on that capture will miss the page's most important
content.

## Evidence maturity

The phrase “Demos & reference projects” should not be applied uniformly.

| Item | Honest status |
|---|---|
| Confidential Tokens / cToken | Public demo and open-source implementation |
| Confidential Vault: Encrypted Positions | Live/source-linked working POC |
| Confidential Piggy Bank | Executable tutorial |
| ERC-7984 token, wrapper, and 1:1 swap | Complete reusable library/example surfaces |
| Hardhat plugin | Shipping local integration tool |
| Confidential Vault: Encrypted Strategy | Detailed product concept without linked app or source |
| DeFi Capital Allocator | Detailed product concept without linked app or source |
| RWA Issuance & Distribution | Detailed integration concept without linked app or source |
| Prediction Markets, Identity, NFT, Fundraising/VC, Invoicing | Official category labels without dedicated official implementations |

The cVault POC also needs qualification. Its source uses backend validation, reports a hard-coded
5% simulated target APY, permits value injection rather than executing a real yield strategy, and
does not wire the creator UI's viewer list into ACL calls. It is implementation boilerplate, not
evidence of a complete production vault.

The evidence-tiered map is now durable in
[the Nox product and use-case wiki](../wiki/nox-use-case-map.md).

## Current capability does support broad products

The current runtime supports only `bool`, `uint16`, `uint256`, `int16`, and `int256`, but those
values can be composed through:

- arithmetic and safe arithmetic;
- equality and ordered comparisons;
- encrypted conditional selection;
- confidential transfer, mint, and burn;
- persisted handles and ACL operations;
- minimal public-decryption proofs that authorize a later public state transition.

That is enough to express encrypted amounts, balances, collateral/debt ratios, allocation weights,
prediction pools, proportional payouts, invoice totals, numeric eligibility thresholds, and
one-shot outcome gates.

It is not enough to claim:

- arbitrary developer code inside the Runner;
- shipping custom `swap`, `borrow`, or `repay` operators;
- general encrypted strings, addresses, files, documents, or NFT metadata;
- drop-in Aave or Uniswap interoperability with ERC-7984 handles;
- anonymity, invisible transaction timing, or revocable historical access.

The right test is now “can the exact product state transition be composed from current operations?”
rather than “is the product category numeric?”

## Prediction-market correction

DarkOdds's own source establishes a native protocol:

- [`MarketRegistry.sol`](https://github.com/winsznx/darkodds/blob/b1833f81968626fbc1a02138dd4154d9b3e6fef8/contracts/src/MarketRegistry.sol)
  deploys market clones.
- [`Market.sol`](https://github.com/winsznx/darkodds/blob/b1833f81968626fbc1a02138dd4154d9b3e6fef8/contracts/src/Market.sol)
  accepts encrypted cUSDC bets, updates encrypted YES/NO pools, freezes resolved pools, refunds
  invalid markets, and computes proportional confidential payouts.
- Its
  [`POLYMARKET_INTEGRATION.md`](https://github.com/winsznx/darkodds/blob/b1833f81968626fbc1a02138dd4154d9b3e6fef8/docs/POLYMARKET_INTEGRATION.md)
  describes a read-only display layer.
- Its
  [`KNOWN_LIMITATIONS.md`](https://github.com/winsznx/darkodds/blob/b1833f81968626fbc1a02138dd4154d9b3e6fef8/KNOWN_LIMITATIONS.md)
  says it performs no proxied Polymarket trades; a future mirror would create a separate DarkOdds
  market.

Therefore:

- **Fact:** Prediction Markets is an official Nox category.
- **Fact:** DarkOdds was already a native Nox prediction market, not a Polymarket router.
- **Inference:** moving the same binary pari-mutuel product to Ethereum Sepolia or removing its
  display API is not meaningful differentiation.
- **Unknown:** whether organizers would accept a radically different prediction product. That
  needs an explicit rules/Discord check before selection.

No obvious low-scope variant currently clears collision and feasibility together. A private CLOB
overlaps Diam and expands scope; an LMSR requires unsupported logarithm/exponential math;
multi-outcome/scalar markets mostly add complexity; Polymarket routing is the non-native direction
the user does not want.

## The categories are not empty lanes

The docs should widen ideation, but they do not reset competitor history. Source-visible prior VIBE
projects already include:

- native private lending in [`Noxus`](https://github.com/aydi26/nox-hackathon);
- confidential NFT ownership/metadata/marketplace in
  [`NoxShadowNFT`](https://github.com/armsves/NoxShadowNFT);
- confidential invoice factoring in [`Noxvault`](https://github.com/uzochukwuV/Noxvault);
- several vault/yield products including
  [`iEx AI`](https://github.com/maulana-tech/iEx-ai) and
  [`YOLDR`](https://github.com/TirthC27/yieldShield);
- crowdfunding, grants, RWA lending, VC, OTC, payroll, hedging, and private-credit deal rooms.

This does not prohibit every adjacent product. It means “lending,” “NFT,” “invoicing,” or
“prediction market” is a research category, not yet a differentiated idea.

## Corrected discovery frame

The next product pass should:

1. Begin with the full official use-case catalog and the available cToken/cVault boilerplate.
2. Allow either hackathon path:
   - a clean confidentiality layer over an unchanged open-source protocol; or
   - a standalone, innovative Nox product.
3. Stop requiring a third-party protocol action when evaluating the standalone-product path.
4. Preserve the user's rejections: no wallet, token factory, generic wrapper, payroll clone,
   shares/compliance operating system, policy/evaluator product, benchmark/score product, new chain,
   or staged multi-role theater.
5. For every candidate, name:
   - one recurring user and one exact action;
   - the public-chain harm;
   - the exact Nox operation graph;
   - the real final state transition;
   - the 30-second judge path;
   - the closest prior winner/submission/current competitor;
   - the smallest fact that would kill it.
6. Treat implementation boilerplate as a scope reducer, not the product itself.

## Facts, inferences, and unknowns

### Verified facts

- The docs officially name all ten product areas.
- The generated LLM corpus omits the component-rendered catalog.
- Only cToken and encrypted-position cVault have linked official apps/source among the five cards.
- Current arithmetic/comparison/selection/transfer primitives can compose broader numeric products.
- Custom `swap`, `borrow`, and `repay` functions are not shipping.
- DarkOdds implemented its own markets and used Polymarket only as a read-only data side arm.

### Inferences

- The previous “numeric-only” framing artificially narrowed ideation.
- Generic versions of the docs examples remain poor originality bets because previous entrants and
  current projects already occupy most obvious forms.
- The best opportunity is likely a narrow job inside one endorsed category, built from existing
  cToken/proof boilerplate, with a result that is visibly useful before the privacy explanation.

### Unknowns

- Whether the organizer has private or unreleased reference implementations for the concept-only
  strategy, allocator, RWA, Identity, NFT, or Invoicing directions.
- Which of the current 13 private WTF submissions occupy docs-led lanes.
- Whether the current cVault can be ported cleanly from its older Arbitrum package stack to the
  required Ethereum Sepolia release.
- Whether a materially different prediction mechanism would be considered original enough after
  DarkOdds.

## Decision consequence

The previous `NONE SURVIVE` report is not a complete search result because it did not use the full
official category map and imposed an unchanged-third-party-protocol gate even on a standalone Nox
product. It remains useful as a graveyard and winner-pattern audit.

The corrected discovery subsequently investigated nine candidates across Invoicing/Payments,
DeFi/Lending, Vaults/Yield, Identity, NFT, and Prediction Markets. Private Quote-to-Pay and a
Confidential Closed-Loop Gift Card were the initial near-survivors; deeper audits killed both on
released-contract, collision, simpler-equivalent, scope, and judge-path evidence.

Product selection remains blocked. See the
[docs-first product research](./2026-07-23-docs-first-product-research.md) and
[candidate report](../ideas/2026-07-23-nox-docs-first-candidates.md).
