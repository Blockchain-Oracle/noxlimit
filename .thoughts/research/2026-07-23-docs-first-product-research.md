# Docs-First Product Research

**Research date:** 2026-07-23

**Status:** Complete

**Candidate verdict:** [No survivor](../ideas/2026-07-23-nox-docs-first-candidates.md)

## Research question

After recovering the official Nox use-case catalog that `llms-full.txt` omitted, is there a
category-led product that one builder can ship, a judge can understand in one focused browser
interaction, and current Nox makes indispensable?

Both hackathon shapes were allowed:

1. a standalone innovative Nox product; and
2. a confidentiality layer over an unchanged open-source protocol.

A standalone product was not required to manufacture a third-party protocol call. The search still
required a real state transition, current released primitives, a credible no-mock user path, and no
direct collision.

## Method and corpus

The pass used:

- the full source-level
  [official category page](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases.md);
- every detailed page under `src/getting-started/use-cases/`;
- the current cToken and cVault source at
  [`nox-product-poc@3dd5d49`](https://github.com/iExec-Nox/nox-product-poc/tree/3dd5d49a78d3fcda8879307e9e132ebe12502c71);
- ERC-7984/reference contracts at
  [`nox-confidential-contracts@e685645`](https://github.com/iExec-Nox/nox-confidential-contracts/tree/e685645986af394ab5507c0c67e611650f4e4d33);
- exact released protocol and SDK source recorded in the
  [manifest](../sources/source-manifest.md);
- all three previous winners and relevant public VIBE/current WTF repositories;
- current products or prior privacy-hackathon projects for the same user job.

The low-level docs were fetched through Context7's official `/iexec-nox/documentation` corpus as
required by the repository instructions. The local documentation source was still necessary
because generated LLM output drops Vue-rendered cards and grids.

## A. Docs-to-product evidence map

### Complete category coverage

| Official lane | Sponsor evidence | Current operation fit | Most reusable source | Research conclusion |
|---|---|---|---|---|
| Payments & Payroll | Category label; payment examples in Welcome; cToken demo | Encrypted amount/balance, transfer, arithmetic, boolean settlement proof | ERC-7984 token, wrapper, cToken UI | Payroll is heavily saturated; invoice and gift-card jobs were tested separately and failed |
| DeFi & Lending | Category label plus hidden collateral/debt examples | Arithmetic, ratios, comparison, select, transfer | ERC-7984 and cVault patterns | Primitive fit is real, but a safe product still needs liquidity, oracle, interest, and liquidation; prior projects collide |
| Vaults & Yields | Two vault cards plus encrypted-strategy and allocator concept pages | Persisted positions/weights, arithmetic, comparison, selection | cVault POC and proof UI | Official POC simulates yield; real downstream execution and stale-price behavior remain hard; field is crowded |
| OTC & Trading | Category label | Encrypted quote/amount, comparison, settlement | cToken and swap example | Previous winner Diam makes RFQ, dark-pool, auction, and private routing shapes exclusion zones |
| Prediction Markets | Category label | Encrypted wager/pools, arithmetic, comparison, proportional payout | General ERC-7984 patterns | DarkOdds already implemented the obvious native protocol; low-scope variants do not clear product gates |
| RWA & Real Estate | Detailed RWA concept page | Confidential allocations and balances; selective reveal | Standards-level concept only | RWAOS already won with the broad architecture; narrower ideas retain issuer/compliance/multi-role scope the user rejected |
| Fundraising / VC | Category label | Encrypted contribution/allocation, cap comparison, transfer | General ERC-7984 patterns | FUNDME, private-grant, and a confidential VC fund already occupy obvious forms; multi-party campaign choreography remains |
| Identity | Category label; no dedicated official implementation | Numeric attribute comparison and minimal boolean reveal | Piggy Bank-style input/proof pattern | Nox can compare an attribute but cannot prove issuer provenance; fake/self-reported input is not a real identity product |
| NFT | Category label; no dedicated official implementation | Numeric traits, numeric price, balance/key-fragment handles | General numeric/ACL patterns | No arbitrary encrypted metadata or current randomness; NoxShadowNFT already occupies confidential NFT/file/marketplace surfaces |
| Invoicing | Category label; no dedicated official implementation | Encrypted due/remaining, equality, safe subtraction, transfer, paid proof | cToken/wrapper patterns | Quote-to-Pay was the best surface but fails callback ACL, PaySec collision, privacy leakage, and onboarding |

Primary evidence:

- [Use Cases source](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases.md)
- [Welcome](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/welcome.md)
- [Encrypted Strategy](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases/confidential-vault-encrypted-strategy.md)
- [Capital Allocator](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases/defi-allocator.md)
- [RWA concept](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases/rwa.md)
- [Solidity operation reference](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/references/solidity-library.md)

### Evidence maturity

The official catalog contains four materially different evidence levels:

| Level | Items | What it proves | What it does not prove |
|---|---|---|---|
| Source-linked product POC | cToken, encrypted-position cVault | Full-stack patterns exist | Production economics or every marketed feature works |
| Executable building block | Piggy Bank, ERC-7984 token/wrapper/1:1 swap, Hardhat plugin | Current APIs can execute those mechanics | A durable user job or original product |
| Detailed concept | Encrypted Strategy, Capital Allocator, RWA | Sponsor interest and intended architecture | Shipping code, current custom operations, or a live economic loop |
| Category endorsement | Prediction, Identity, NFT, Invoicing, Fundraising/VC and other grid labels | The lane is in scope | Current template, white space, or feasibility |

The cVault source specifically returns a hard-coded `0.05` simulated target APY, accepts value
injection rather than executing a yield strategy, and does not wire its creator viewer list into
contract ACL calls. It is useful boilerplate, not a real yield product.

### Current reusable operation surface

The current released runtime supports:

- `bool`, `uint16`, `uint256`, `int16`, and `int256`;
- arithmetic and safe arithmetic;
- equality and ordered comparisons;
- encrypted `select`;
- confidential transfer, mint, and burn;
- persisted handles and ACL grants;
- proof-verified public decryption for a later public action.

It does not currently support arbitrary encrypted strings, addresses, files, NFT metadata,
confidential randomness, arbitrary Runner code, or shipping custom `swap`, `borrow`, and `repay`
operations. The
[Solidity reference](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/references/solidity-library.md)
labels those custom operations “Coming Soon.”

This operation set can express real finance and market state. It cannot remove each product's
oracle, fulfillment, issuer, liquidity, or user-acquisition boundary.

### Reusable source versus product work

| Reusable piece | Safe reuse |
|---|---|
| Handle client | Per-wallet/chain client caching and direct `encryptInput` |
| Piggy Bank | Direct external-input ingestion and persisted state |
| cToken | Confidential balance UI, transfer flow, private viewer grants |
| Wrapper | Public wrap and asynchronous proof-finalized unwrap |
| cVault | Request/claim state machine, pending UI, encrypted balance patterns |
| Proof UI | Polling, bounded retries, explicit retry/finalize states |
| Nox Nexus | Operation and handle diagnostics, not application state |

The official POCs reduce implementation scope but do not supply the product thesis.

## B. Collision map

| Lane | Previous winner | Previous/public Nox work | Current WTF signal | Comparable product or mechanism |
|---|---|---|---|---|
| Invoicing/payments | No winner with the exact checkout job | [PaySec](https://github.com/Bolexzy/paysec/tree/9cd1fd6b58bed2597d072dfd410774d810223d10) payment links; [Noxvault](https://github.com/uzochukwuV/Noxvault/tree/32c89d20d6d13ff9c77a58bfcaf671b3466d3f05) factoring | Eight payroll products; payment/escrow-adjacent work | [Stripe Quotes](https://docs.stripe.com/quotes) and [Request Finance invoices](https://docs.request.finance/invoices) document the ordinary workflow |
| Gift card/private checkout | No Nox winner | No official Nox reference | No exact public July Nox repository found | [Sigill](https://github.com/0xshubhs/sigill/tree/082fd91d98cb950aee3f8afa44be97afc9a746cd), [FHE2P](https://ethglobal.com/showcase/fhe2p-cnxhf), [Raise](https://raise.network/), [UniVoucher](https://docs.univoucher.com/technical/how-it-works/) |
| Metered API/agent budget | None | No previous source needed for the veto | [Kairos](https://github.com/Venkat5599/kairoszks/tree/33ef50e752fe7e8d74b073cdd8a9a1337f921bcf) implements the exact current Nox budget/cap/x402 graph | [x402](https://docs.x402.org/introduction) defines seller-enforced paid API/resource delivery, which preserves the trusted-service boundary |
| Lending | No top-three winner | [Noxus](https://github.com/aydi26/nox-hackathon/tree/15c9cd65678d09b5f2456991dd0e5d729a1e1b61), Noxvault credit | [Skia](https://github.com/Xconmax245/Skia/tree/14c75b6f131f39e599688f16cc93c59852a20237) Aave credit/liquidation | [Aave V3](https://aave.com/docs/developers/smart-contracts/pool) exposes the actual supply/borrow/repay/liquidation surface that a safe integration must preserve |
| Vault/yield | Diam overlaps private execution | Official cVault; [iEx AI](https://github.com/maulana-tech/iEx-ai/tree/55b55fe1bbe45637e7ac0cdf6b39d2fff617d907); [YOLDR](https://github.com/TirthC27/yieldShield/tree/7f90fc4193979490f0addb82af880a0c7df68345) | [Occulta](https://github.com/RaYYeR220/occulta/tree/386dd886d12d5b234a128f32fbd0f7820b2b7424) strategy agent | [Yearn V3 vault management](https://docs.yearn.fi/developers/v3/vault_management) documents strategies, debt, withdrawals, accounting, and reporting that a real allocator must preserve |
| OTC/trading | **Diam** already covers confidential OTC/RFQ/Vickrey execution | No additional project is needed for the generic-lane veto | Two private Uniswap routers in the dated public scan | [CoW Protocol](https://docs.cow.fi/) is a named shipping batch-auction trading benchmark; repeating it with encrypted intents overlaps Diam |
| Prediction | **DarkOdds** | [Native binary pari-mutuel protocol](https://github.com/winsznx/darkodds/tree/b1833f81968626fbc1a02138dd4154d9b3e6fef8) | Private current Dora list prevents a complete scan | DarkOdds's Polymarket side was display-only; the Nox-native market is already built |
| Forecasting | DarkOdds is adjacent but mechanically different | No source-visible Nox tournament found | Private current Dora list prevents a complete scan | [Metaculus scoring](https://www.metaculus.com/help/scores-faq/) and [Good Judgment Open](https://goodjudgment.com/services/good-judgment-open/) confirm that the real job uses cohorts, scorekeeping, many questions, and future resolution |
| RWA | **RWAOS** | [GroundVault](https://github.com/StephenSook/GroundVault/tree/a90925aef7c72b77e12be4003e8b072ade2850a4) and [Obscura](https://github.com/karagozemin/Obscura/tree/a4699dc5c748b002768523540994285ad192c855) | Private current Dora list | [ERC-3643](https://docs.erc3643.org/erc-3643) is the named issuance/identity/compliance benchmark and confirms the institutional surface |
| Fundraising/VC | RWAOS adjacent | [FUNDME](https://github.com/Zifeng-Ma/FUNDME/tree/22c1b7879c01e8383740547e576e48da3445e3ab), [private-grant](https://github.com/farouk-allani/private-grant/tree/15413755fc6ce70d2c31b2ad284fcc9ce5d14ccf), and [SEA Equity](https://github.com/Asyfdzaky/sea-equity-confidential-vc-fund/tree/46f748b2a8220170ab9408f012737d4257c53c9c) | Donation/treasury project in the dated public scan | [Gitcoin Grants](https://gitcoin.co/program) demonstrates that real rounds require funders, applicants, review, community contributors, and later distribution |
| Identity | None | No clear public Nox identity project found | Private current Dora list | [Self minimum-age disclosure](https://docs.self.xyz/use-self/disclosures) and [Privado ID conditional queries](https://docs.privado.id/docs/verifier/query-builder/) are named provenance-plus-minimal-disclosure benchmarks |
| NFT | None | [NoxShadowNFT](https://github.com/armsves/NoxShadowNFT/tree/c6e675412b8bf9910d7c026eb86e498d77418140) | Private current Dora list | [thirdweb DelayedReveal](https://portal.thirdweb.com/tokens/build/extensions/general/DelayedReveal) covers ordinary encrypted metadata/reveal; [Chainlink VRF](https://docs.chain.link/vrf) is the named fairness primitive absent from the Nox pack path |

Absence from the public July scan is not proof of white space. The DoraHacks submission list was
private at the time of research.

## Product-job evidence and exact failure tests

### Negotiated invoice payment

[Stripe Quotes](https://docs.stripe.com/quotes) and
[Request Finance invoices](https://docs.request.finance/invoices) document negotiated
quote-to-invoice and crypto-invoice workflows. The useful Nox job would be to verify confidential
settlement and publish only “paid.”

The exact shared-cUSDC path fails before product design:

- [`_transferAndCall`](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/ERC7984Base.sol#L302-L320)
  sends a returned transfer handle into the receiver.
- The
  [optimized update](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/ERC7984Base.sol#L355-L425)
  grants the recipient its new balance, not the separate transfer handle.
- The standard
  [ERC-20 wrapper uses that optimized implementation](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/extensions/ERC20ToERC7984Wrapper.sol#L21-L27).
- The
  [raw update](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/ERC7984Base.sol#L442-L490)
  explicitly grants that handle.

Therefore a shared optimized-token callback cannot safely compute invoice equality or remaining
balance from its callback amount. Operator or custom-raw-token workarounds add authority,
transactions, and token fragmentation. The honest fresh-user path also requires token/gas funding,
approval, wrapping, optional operator authorization, asynchronous computation, and finalization.

### Closed-loop stored value

Private partial redemption is mechanically possible inside a custom restricted token. It still
fails the product test:

- the issuer controls issue, acceptance, inventory, refunds, and fulfillment;
- its private database already hides balance and redemption history;
- visible wrapping reveals original card value;
- sender, recipient, merchant, timing, and fixed-price item remain public or inferable;
- multiple independent merchants require settlement and turn it into a payment network;
- a real consumer card introduces policy scope the owner explicitly wants to avoid.

Sigill demonstrates both the collision and the missing hard part: its encrypted checkout still
needs an observer, Reloadly credentials, product catalog, settlement, and protected code delivery.

### Lending and vaults

The arithmetic is feasible; the product is not reduced to arithmetic. A credible lending product
needs a real asset, liquidity, oracle, interest model, health computation, liquidation, and
recovery. A trigger vault needs timely oracle evaluation and downstream execution. Nox's
asynchronous path makes stale-price behavior explicit rather than eliminating it. Omitting these
parts yields a balance or strategy demo.

### Identity and NFT

Identity fails at provenance: encrypting a self-asserted number does not turn it into a credential.
NFT fails at data/randomness: current Nox can operate on numeric handles, not general metadata, and
does not supply confidential sampling. Both lanes could become viable with a named authoritative
issuer or randomness source and a differentiated user job, but neither was found.

### Prediction

DarkOdds's
[`MarketRegistry`](https://github.com/winsznx/darkodds/blob/b1833f81968626fbc1a02138dd4154d9b3e6fef8/contracts/src/MarketRegistry.sol)
and
[`Market`](https://github.com/winsznx/darkodds/blob/b1833f81968626fbc1a02138dd4154d9b3e6fef8/contracts/src/Market.sol)
make the correction decisive: it already built native encrypted wagering, pool accounting,
resolution, refunds, and proportional payout. Polymarket was
[display-only](https://github.com/winsznx/darkodds/blob/b1833f81968626fbc1a02138dd4154d9b3e6fef8/docs/POLYMARKET_INTEGRATION.md).

A private CLOB overlaps Diam and expands scope; LMSR requires unsupported math; scalar or
multi-outcome markets add accounting without removing liquidity/oracle problems; forecasting
tournaments need multiple users and future outcomes and make scoring the product.

## Candidate search result

Nine product shapes were investigated across Invoicing/Payments, DeFi/Lending, Vaults/Yield,
Identity, NFT, and Prediction Markets:

1. Private Quote-to-Pay
2. Confidential Closed-Loop Gift Card
3. Private Metered SaaS
4. Confidential Revolving Credit
5. Secret-Trigger Vault
6. Private Numeric Credential Gate
7. Sealed Collectible Pack
8. Confidential Forecasting Tournament
9. Generic Native Prediction Market

The two initial near-survivors were separately adversarially audited. Both moved from provisional
pass to fail. See the [candidate report](../ideas/2026-07-23-nox-docs-first-candidates.md) for the
full graveyard and exact verdict.

## Facts, inferences, and unknowns

### Verified facts

- All ten categories exist in the official source even though the LLM capture omits them.
- cToken and encrypted-position cVault are the only source-linked applications among the five
  official cards.
- Current operations can compose meaningful numeric products.
- Several docs-led lanes already contain prior Nox projects.
- DarkOdds is native rather than a Polymarket router.
- The optimized ERC-7984 callback amount ACL does not match the receiver-interface promise.

### Inferences

- Official categories are sponsor permission, not sponsor preference or product validation.
- Quote-to-Pay would look like a corrected PaySec rather than an original product.
- A closed-loop gift card introduces onchain complexity without removing the issuer's fulfillment
  trust.
- The obvious DeFi/NFT/prediction products are crowded enough that privacy alone cannot
  differentiate them.

### Unknowns

- Current private DoraHacks submissions may contain additional collisions.
- Organizers may have unreleased examples for the concept-only/category-only lanes.
- A future package may repair callback ACLs or add custom operations; current judging work must
  target released packages and live Ethereum Sepolia contracts.
- A source-verified, independently valuable Sepolia entitlement could change the gift-card
  analysis, but none was found.

## Conclusion

The docs correction materially widened the search and changed the research process. It did not
produce a selection-safe product.

No candidate currently combines a real recurring job, indispensable current Nox computation, a
complete one-user action, one-builder scope, a credible no-setup judge path, and sufficient
distance from previous work. Product selection remains blocked.
