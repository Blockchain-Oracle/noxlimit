# Nox Docs-First Candidate Report

**Research date:** 2026-07-23

**Status:** Complete; no product selected

**Input correction:** [Nox documentation-first use-case audit](../research/2026-07-23-nox-docs-first-correction.md)

## Verdict

**NONE SURVIVE. Do not begin architecture or implementation.**

The corrected pass started from all ten official Nox categories and evaluated both allowed
hackathon paths:

1. a standalone innovative Nox product; or
2. a privacy layer over an unchanged open-source protocol.

It did not impose a third-party integration on standalone products. Nine concrete product shapes
were then tested against current released primitives, prior submissions, the user's exclusions,
one-builder scope, a real state transition, and a judge path that demonstrates value without setup
theater.

Two initially looked strong: **Private Quote-to-Pay** and a **Confidential Closed-Loop Gift Card**.
Both failed under deeper review. The invoice product collides directly with PaySec and relies on an
ERC-7984 callback permission that the released optimized token path does not actually grant. The
gift-card product has a simpler trusted-database equivalent, requires the same merchant to issue
and honor the entitlement, and already overlaps previous confidential gift-card projects.

This is not a return to the old narrow search. DeFi, lending, prediction markets, NFT, Identity,
Invoicing, and the other official lanes were considered explicitly. No candidate currently clears
all hard gates.

## Candidate graveyard

| Candidate | Official lane | Exact useful action | Verdict | Hard failure |
|---|---|---|---|---|
| Private Quote-to-Pay | Invoicing / Payments | Open a seller quote, pay the confidential negotiated amount, receive a public paid receipt or entitlement | **FAIL** | Direct PaySec collision; released optimized cUSDC does not grant its receiver the callback amount handle; multi-step token/operator onboarding fails the 30-second path |
| Confidential Closed-Loop Gift Card | Payments / NFT | Redeem part of a confidential stored-value card for a real item while keeping its balance private | **FAIL** | A merchant database gives the same buyer outcome without TEE/onchain latency; real redemption still trusts the issuer; Sigill and FHE2P already occupy confidential gift-card checkout |
| Private Metered SaaS | Payments / DeFi | Consume a paid API while negotiated rate and remaining credits stay private | **FAIL** | The offchain service remains the enforcement boundary; Kairos already occupies confidential agent/API budgets; Nox latency is in the request hot path |
| Confidential Revolving Credit | DeFi & Lending | Borrow, view confidential debt, repay, and unlock collateral | **FAIL** | Noxus, Umbra, Skia, and Noxvault already occupy the lane; oracle, interest, liquidity, and liquidation exceed one-builder scope |
| Secret-Trigger Vault | Vaults & Yields | Set a hidden rebalance or exit trigger and execute it when a public price crosses the threshold | **FAIL** | Official concepts plus cVault, Occulta, iEx AI, and YOLDR crowd the lane; asynchronous computation makes price execution stale; downstream trades can reveal intent |
| Private Numeric Credential Gate | Identity | Prove a private age, income, or tenure threshold and receive access | **FAIL** | Nox can compare a number but cannot prove the issuer or truth of the input; a fixed threshold is usually simpler with an existing ZK credential |
| Sealed Collectible Pack | NFT | Mint a pack, privately inspect its trait, and later reveal or trade it | **FAIL** | NoxShadowNFT collision; current Nox has no confidential randomness or general encrypted metadata; seller-chosen traits make fairness trusted |
| Confidential Forecasting Tournament | Prediction Markets | Submit a hidden probability, score it after a real outcome, and award a fixed prize | **FAIL** | Needs multiple genuine users and a future outcome, makes scoring the product, and cannot close in the judge's first session |
| Generic Native Prediction Market | Prediction Markets | Place encrypted YES/NO bets and claim proportional private payouts | **FAIL** | This is the previous DarkOdds winner's native protocol, not an unbuilt gap left behind by a Polymarket router |

The table covers seven of the ten named categories directly. OTC/trading, RWA, and fundraising/VC
remain excluded by Diam/RWAOS and by the user's rejection of shares, compliance systems,
institutional workflows, and large multi-role products. Historical payroll, treasury policy,
escrow, routing, benchmarking, panel, and dispute ideas remain rejected rather than being renamed.

## Deep audit 1: Private Quote-to-Pay

**FEASIBILITY: FAIL**

### Why it initially looked product-shaped

The job is familiar and narrow: a seller sends a buyer-specific invoice, the buyer privately pays
the negotiated amount in cUSDC, and the application reveals only that the invoice is paid. Nox
would be material because a public contract cannot compare a confidential payment with a
confidential outstanding amount using ordinary EVM state.

The intended graph was:

`encrypted due amount → confidential transfer callback → exact/partial-payment arithmetic → persisted remaining handle → encrypted paid boolean → allowPublicDecryption → proof-finalized receipt or entitlement`

This uses only supported numeric inputs, comparison, safe arithmetic, selection, token transfer,
handle persistence, and public decryption. It requires no future custom Runner operation.

### Fatal released-contract mismatch

The official ERC-7984 receiver interface and guide imply that a callback receiver can compute over
the transferred amount. The current shared optimized implementation does not grant that separate
amount handle to the receiver:

- [`_transferAndCall`](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/ERC7984Base.sol#L302-L320)
  passes the returned `sent` handle into the callback.
- The
  [optimized update path](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/ERC7984Base.sol#L355-L425)
  grants the recipient its new balance handle, but does not grant it the `transferred` handle.
- The standard
  [ERC-20 wrapper selects that optimized path](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/extensions/ERC20ToERC7984Wrapper.sol#L21-L27).
- The
  [raw update path](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/ERC7984Base.sol#L442-L490)
  explicitly grants `transferred` to sender, recipient, and token.
- [`Compute`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/modules/Compute.sol#L540-L566)
  initially grants a new operation result only to the direct calling contract.
- [Issue 35](https://github.com/iExec-Nox/nox-confidential-contracts/issues/35) records a related
  returned-handle ACL asymmetry.

Therefore an invoice receiver using the shared optimized cUSDC cannot safely assume it can call
`Nox.eq`, `safeSub`, or `add` on the callback amount. That breaks the clean exact-payment and
partial-payment path.

The available workarounds make the product worse:

- ask the payer to authorize an invoice hub as an ERC-7984 operator, which adds a transaction and
  grants balance-wide authority until expiry;
- deploy an application-specific raw token/wrapper, which fragments cUSDC and adds
  approve/wrap/onboarding steps;
- embed invoice logic in a custom token, which turns the product into a token fork and increases
  collision risk.

All require a live integration spike before they can be trusted.

### Collision and privacy reality

The previous VIBE project
[`PaySec`](https://github.com/Bolexzy/paysec/tree/9cd1fd6b58bed2597d072dfd410774d810223d10)
already presents confidential invoices, encrypted references, shareable payment links, and invoice
payments. Its own implementation exposes more than its claims imply, but rebuilding that product
correctly on Nox would still look like “PaySec fixed,” not a fresh category-level insight.

[`Noxvault`](https://github.com/uzochukwuV/Noxvault/tree/32c89d20d6d13ff9c77a58bfcaf671b3466d3f05)
is an adjacent invoice-factoring product.

Even a correct Nox implementation would keep buyer and seller addresses, contract calls,
timestamps, payment attempts, and relationship graphs public. Wrapping or unwrapping the exact
invoice amount also creates a simple public correlation leak.

### Judge path

The honest fresh-account path is:

`obtain Sepolia ETH and test token → approve wrapper → wrap → optionally set operator → pay → wait for Nox → submit proof-finalization transaction`

An embedded prefunded wallet can hide some of those steps, but then the no-setup story depends on
custodial or sponsorship infrastructure rather than the product's native path. The useful loop also
has two economic roles. The candidate fails collision, integration, and 30-second feasibility
together.

## Deep audit 2: Confidential Closed-Loop Gift Card

**FEASIBILITY: FAIL**

### Why it initially looked product-shaped

The proposed product was a single merchant's programmable card, not a wallet or token factory. A
holder would privately view a stored balance and redeem only part of it for an actual digital item.
The contract would keep the remaining value confidential while proving that each debit was valid.

The safest current-Nox graph would live inside a restricted ERC-7984-derived application rather
than depend on an amount-sensitive callback:

`confidential funding → persisted card balance → compare requested/public price → all-or-nothing confidential transfer → encrypted paid boolean → public proof → one-shot item delivery`

The current
[token-operation semantics](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/references/solidity-library/methods/advanced/token-operations.md)
support this mechanically: an insufficient transfer returns encrypted failure and leaves balances
unchanged instead of exposing the balance through a revert. Passing this graph would prove
mechanical feasibility, not the product thesis.

### Why Nox is not indispensable

The same merchant that issues the card must also accept it and deliver the item. A conventional
private balance database already hides the card value and redemption history, rejects overspending,
updates the remaining balance instantly, and lets that merchant deliver the same item. Putting the
balance in a TEE-backed contract does not remove the core fulfillment trust.

The product becomes meaningfully trust-reduced only if an independent, already-deployed protocol
must honor the private debit. No narrow Ethereum Sepolia entitlement was found that:

- can be purchased or granted by the Nox result without issuer/admin authority;
- delivers a real useful item in the judge session;
- does not require a second participant or mock inventory; and
- cannot already use a normal voucher, allowlist, or private backend.

Unlock membership was the closest known entitlement, but it still requires the application or
merchant to hold key-granter authority and does not make confidential stored value necessary.
An ENS wrapped subname is the strongest fully onchain item found: a finalizer could use official
Sepolia
[NameWrapper deployments](https://docs.ens.domains/learn/deployments/) and
[`setSubnodeRecord`](https://docs.ens.domains/wrapper/creating-subname-registrar/) after verifying
the stored paid handle. The subname, recipient, and fixed public price would remain visible, and no
evidence showed demand for prepaid confidential subname credits.

### Collision and judge path

Confidential gift cards are not clean white space:

- [`Sigill`](https://github.com/0xshubhs/sigill/tree/082fd91d98cb950aee3f8afa44be97afc9a746cd)
  already implements a private gift-card checkout on Base Sepolia with encrypted product ID,
  amount, cUSDC settlement, observer fulfillment through Reloadly, and buyer-only code delivery.
- [`FHE2P`](https://ethglobal.com/showcase/fhe2p-cnxhf), built for ETHOnline 2024, is an encrypted
  voucher marketplace explicitly aimed at gift cards and confidential coupons.
- [`Raise`](https://raise.network/) markets programmable, transferable onchain SmartCards, while
  [`UniVoucher`](https://docs.univoucher.com/technical/how-it-works/) provides EVM voucher
  creation and redemption using cryptographic secrets.

A Nox implementation would need a new user job beyond “the balance is encrypted.”

The real path also repeats the token onboarding and asynchronous proof steps from the invoice
candidate. If the judge receives a pre-seeded card and redeems a developer-controlled download,
the demo hides issuance and replaces a real merchant network with staged inventory. If the judge
issues the card to themselves, the economic loop is self-authored. Neither proves a durable
standalone product.

Issuance creates another privacy fork: the official
[wrapper](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/extensions/ERC20ToERC7984WrapperBase.sol#L81-L85)
publicly exposes the funding amount, sender, and recipient, while a private mint requires a
privileged issuer and has no trustless link to buyer funding. A multi-merchant version then needs
public unwrap settlement or a new private payment network—the broad wallet/token shape the user
rejected.

A real consumer gift card is also not policy-free.
[U.S. Regulation E §1005.20](https://www.consumerfinance.gov/rules-policy/regulations/1005/20/)
covers qualifying cards, codes, devices, and electronic promises with rules for fees, disclosures,
expiration, and partial balances. Restricting the product to nontransferable promotional credit
reduces its usefulness and further weakens the blockchain justification.

## Why the remaining seven fail

### Private Metered SaaS

**Action:** A developer invokes a paid API while their negotiated unit price, spending cap, and
remaining credits stay confidential.

**Initial promise:** This is recurring and self-serve, and a single **Run task** action could return
a real API result. The current
[x402 standard](https://docs.x402.org/introduction) explicitly targets pay-per-request APIs and
autonomous agents, so it fits a shipping user behavior better than a synthetic benchmark.

**Exact Nox path:** Store prepaid credit and negotiated per-call cost as `euint256` handles owned by
the application and viewable by the customer. For each public request nonce, compute
`safeSub(credit, cost)`, use `select` to retain the old balance on failure, persist the next balance,
and persist an `ebool authorized` handle viewable only by the caller and service gateway. The
contract consumes the nonce before emitting the operation; the gateway privately decrypts the flag
and releases the response only on success. Account, endpoint, and call timing remain public even if
the authorization result does not.

**Hard failure:** The offchain API remains the actual enforcement and fulfillment boundary. That
same trusted service can keep pricing and credit in its ordinary private database, reply
synchronously, and deliver the identical user outcome. Nox adds an asynchronous proof step in the
request hot path without removing service trust.

**Closest collision:**
[`Kairos`](https://github.com/Venkat5599/kairoszks/tree/33ef50e752fe7e8d74b073cdd8a9a1337f921bcf)
already implements confidential agent budgets, per-call caps, branchless Nox authorization,
encrypted debits, and x402/MCP execution on Ethereum Sepolia. It is the same user surface and
substantially the same operation graph.

**Smallest revival fact:** A named permissionless onchain resource would need to consume the
Nox-verified authorization directly and deliver a valuable result without a trusted service,
second wallet, or current competitor. None was found.

### Confidential Revolving Credit

**Action:** A borrower deposits collateral, borrows confidential stablecoins, privately tracks
debt, repays, and unlocks collateral.

**Initial promise:** Borrowing is a recurring financial job explicitly endorsed by the docs.
Collateral and debt amounts are numeric, and keeping them private can reduce position targeting.

**Exact Nox path:** Persist collateral and debt as `euint256`; turn the public oracle price and
protocol parameters into compatible handles; use multiplication/division and comparison to derive
an encrypted health condition; use `safeAdd` or `safeSub` plus `select` for borrow and repayment;
persist the resulting balances. Publicly decrypt only `canBorrow`, `liquidatable`, or `debtCleared`
booleans, bind each proof to a position/nonce, and finalize a one-shot cToken transfer, liquidation,
or collateral release. Asset contracts, borrower, calls, timing, oracle observations, and final
action stay public.

**Hard failure:** The operation graph is feasible, but a product still requires real liquidity,
collateral custody, oracle selection, interest accrual, health rules, liquidation incentives, bad
debt handling, and recovery. One builder cannot safely replace those with mock balances; deleting
them creates a confidential debt-token demo.

**Closest collision:** [`Noxus`](https://github.com/aydi26/nox-hackathon/tree/15c9cd65678d09b5f2456991dd0e5d729a1e1b61)
already built native confidential lending; Noxvault covers invoice credit, and the current Skia
project at
[`14c75b6`](https://github.com/Xconmax245/Skia/tree/14c75b6f131f39e599688f16cc93c59852a20237)
occupies Aave credit/liquidation. The official
[Aave borrowing](https://aave.com/help/aave-101/introduction-to-aave) and
[liquidation](https://aave.com/help/borrowing/liquidations) descriptions confirm that collateral,
interest, health factor, repayment, and liquidation are the real loop rather than optional polish.

**Smallest revival fact:** A live Ethereum Sepolia lending protocol would need an unchanged hook
that accepts a delayed Nox proof for a complete borrow/repay/release action while retaining its own
oracle, liquidity, and liquidation safety. No such path was verified.

### Secret-Trigger Vault

**Action:** A depositor sets a hidden stop-loss, take-profit, or rebalance threshold and lets the
vault execute when a public price crosses it.

**Initial promise:** This is a familiar recurring vault job, maps directly to the official Encrypted
Strategy and Capital Allocator theses, and can reuse the official cVault request/pending/finalize UI.

**Exact Nox path:** Store a trigger, allocation weight, and maximum execution amount as `euint256`;
convert a public oracle snapshot to the same type; compare price with the trigger; use `select` to
derive an encrypted execution amount or next allocation; persist the next strategy handles and a
one-shot order nonce. Either publicly decrypt a minimal `execute` boolean and amount for a public
DEX action, or transfer a confidential token inside an application-owned vault. The vault, oracle,
call timing, downstream target, and any public trade remain visible.

**Hard failure:** Nox computation and proof finalization are asynchronous, so the price can change
between the observed snapshot and execution. Sending the selected amount to an unchanged public DEX
requires revealing or publicly unwrapping it, undermining the strategy privacy. Keeping settlement
inside an app-specific cToken vault avoids that leak but no longer delivers the advertised real
strategy.

**Closest collision:** The official
[Encrypted Strategy](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases/confidential-vault-encrypted-strategy.md)
and
[Capital Allocator](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases/defi-allocator.md)
already define this lane; iEx AI and YOLDR are source-visible yield/vault projects, and Occulta is a
current
[strategy-agent project](https://github.com/RaYYeR220/occulta/tree/386dd886d12d5b234a128f32fbd0f7820b2b7424).
[Yearn V3 vault management](https://docs.yearn.fi/developers/v3/vault_management) is the named
public benchmark for attached strategies, debt limits, accounting, withdrawals, and profit/loss
reporting that a real allocator must preserve.

**Smallest revival fact:** A real batch-execution protocol would need to tolerate delayed proofs,
aggregate multiple private intents, and expose an unchanged Sepolia settlement hook without
revealing individual amounts. That exact integration was not found.

### Private Numeric Credential Gate

**Action:** A person proves that a private age, income, employment-tenure, or membership value
crosses a threshold and receives access.

**Initial promise:** The judge interaction is legible—present a credential and unlock something—and
Nox can reveal one boolean instead of the private attribute.

**Exact Nox path:** An authoritative issuer would have to place a signed numeric claim into an
application-owned `euint256` handle and grant the claimant viewer access. The application compares
it with a public threshold, persists an `ebool eligible` handle under a credential ID and recipient,
marks only that boolean public, and consumes the verified proof once to issue a membership,
subname, or other access right. Claimant address, issuer, target entitlement, timing, and final
membership remain public.

**Hard failure:** The current input path proves that the Nox Gateway accepted a number; it does not
prove who issued that number or whether it is true. A claimant-supplied input is a private
self-assertion. Adding a real issuer and secure claim-to-handle binding is the missing product, and
for a fixed issuer-signed threshold existing ZK credential systems can reveal the same boolean more
directly.

**Closest collision:** No source-visible Nox identity product was found. The closer shipping
mechanisms are
[Self's real-document minimum-age disclosure](https://docs.self.xyz/use-self/disclosures) and
[Privado ID's issuer-backed conditional queries](https://docs.privado.id/docs/verifier/query-builder/).
They solve provenance plus minimal disclosure, so this is a simpler-equivalent warning rather than
proof of a direct Nox submission collision.

**Smallest revival fact:** A real issuer must expose a current, source-verifiable Nox-compatible
numeric claim on Ethereum Sepolia and a useful protocol must consume the resulting proof. A mock
issuer or self-entered age does not revive it.

### Sealed Collectible Pack

**Action:** A buyer mints a collectible pack, privately inspects the hidden rarity or trait, and may
later reveal or trade it.

**Initial promise:** The privacy effect is visual and easy to understand, the pack is a
self-contained product, and buyer-only decryption maps cleanly to Nox ACLs.

**Exact Nox path:** Store a numeric trait or rarity as `euint16` or `euint256` under the token ID,
persist it, and grant the buyer viewer access. A reveal request marks that same handle publicly
decryptable; a proof-bound finalizer writes the conventional public trait or metadata pointer once.
Payment can use an ERC-7984 transfer, while token owner, mint/reveal timing, public NFT contract, and
eventual metadata stay public.

**Hard failure:** Current Nox has no confidential randomness or arbitrary sampling primitive. If
the seller chooses and encrypts the trait, fairness is trusted; if the client chooses it, rarity is
meaningless. General encrypted metadata and files are also outside the current runtime, so the
remaining product is encrypted numeric storage plus reveal.

**Closest collision:** [`NoxShadowNFT`](https://github.com/armsves/NoxShadowNFT/tree/c6e675412b8bf9910d7c026eb86e498d77418140)
already covers confidential NFT ownership, metadata pointers, encrypted file keys, selective
disclosure, and a marketplace.
[thirdweb DelayedReveal](https://portal.thirdweb.com/tokens/build/extensions/general/DelayedReveal)
also covers the ordinary encrypted-metadata placeholder/reveal workflow without Nox; it does not
solve fair randomness, which is precisely the remaining missing mechanism.

**Smallest revival fact:** A source-verifiable unpredictable randomness source would have to bind a
fair trait to the persisted Nox handle without revealing it, and the product would still need a user
job materially different from NoxShadowNFT.

### Confidential Forecasting Tournament

**Action:** A forecaster submits a hidden probability; after a real event resolves, the protocol
scores forecasts and awards a fixed prize to the most accurate participant.

**Initial promise:** It is materially different from wagering—there is no trading, liquidity pool,
or market price—and current arithmetic can compute a proper numeric accuracy score.

**Exact Nox path:** Accept probability as `eint256`, constrain it to a fixed 0–10,000 range using
comparisons and `select`, persist it under participant/round, and replay-guard one entry per wallet.
After a public oracle produces 0 or 10,000, subtract outcome from each forecast, multiply the
difference by itself for a Brier-style squared error, and use `lt`/`select` to maintain an encrypted
best score and separate `euint16` winner index. Publicly decrypt only the winner index, then
proof-finalize a one-shot prize. Participants, submission timing, round, outcome, and winner remain
public; probabilities and scores stay private.

**Hard failure:** A meaningful tournament needs multiple independent forecasters and a genuine
future outcome. It cannot complete in the judge's first session without staged users or a
pre-resolved event. It also makes scoring/ranking the product, which the user explicitly rejected.

**Closest collision:** DarkOdds owns confidential outcome markets, while
[Metaculus scoring](https://www.metaculus.com/help/scores-faq/) and
[Good Judgment Open](https://goodjudgment.com/services/good-judgment-open/) show that credible
forecasting tournaments use cohorts, multiple questions, scoring, and later resolution. The
mechanism is distinct, but the demo and user constraints kill it before originality can help.

**Smallest revival fact:** It would require a real, short-horizon outcome and multiple genuine
already-present forecasters in one session, plus an explicit reversal of the user's score-product
rejection. That is not a bounded technical spike.

### Generic Native Prediction Market

**Action:** A bettor chooses YES or NO, places an encrypted cUSDC wager, and claims a proportional
private payout after oracle resolution.

**Initial promise:** Prediction Markets is an official category, privacy protects individual
positions and pool totals, and the full economic loop can live natively inside a Nox application.

**Exact Nox path:** Convert each encrypted `uint256` stake to `euint256`, use `safeAdd`/`select` to
update persisted YES or NO pool and user-position handles, freeze them at close, convert the public
oracle outcome to an encrypted condition, and use multiplication/division to derive each
proportional payout. A claim nonce prevents replay and a confidential token transfer performs the
final action. Bettor address, market, side-selection call pattern unless deliberately obscured,
timing, oracle, resolution, and claim remain public.

**Hard failure and closest collision:** DarkOdds already contains a
[`MarketRegistry`](https://github.com/winsznx/darkodds/blob/b1833f81968626fbc1a02138dd4154d9b3e6fef8/contracts/src/MarketRegistry.sol)
and native
[`Market`](https://github.com/winsznx/darkodds/blob/b1833f81968626fbc1a02138dd4154d9b3e6fef8/contracts/src/Market.sol)
contracts with encrypted cUSDC betting, private pools, oracle resolution, invalid-market refunds,
and proportional payouts. Its Polymarket integration is explicitly
[display-only](https://github.com/winsznx/darkodds/blob/b1833f81968626fbc1a02138dd4154d9b3e6fef8/docs/POLYMARKET_INTEGRATION.md).
A new binary pari-mutuel market on Ethereum Sepolia is a direct repeat, not the missing native build
the user suspected.

Technically distinct variants also fail:

- a private order book overlaps Diam and expands scope;
- an LMSR needs unsupported logarithm/exponential operations;
- scalar or multi-outcome markets add accounting and UX without removing the oracle, liquidity,
  or collision problem;
- a forecasting tournament fails the user and judge-path gates above.

**Smallest revival fact:** The organizer would have to confirm that a named, materially different
user job and mechanism is original after DarkOdds, and that mechanism would still need its own real
liquidity/oracle/judge path. Changing chain, UI, or outcome count is not enough.

## Facts, inferences, and unknowns

### Verified facts

- The official source names all ten product categories.
- Current released Nox supports numeric/bool inputs, arithmetic, comparisons, selection, transfer,
  persistence, ACL grants, and proof-finalized public decryption.
- Custom `swap`, `borrow`, and `repay` Runner functions are not shipping.
- The optimized ERC-7984 update path does not grant the callback's separate transferred-amount
  handle to the receiver.
- PaySec already exposes a confidential invoice/payment-link product surface.
- DarkOdds already implemented native Nox markets; Polymarket was read-only.

### Inferences

- Fixing PaySec's confidentiality on Nox would still be judged as a close product repeat.
- A closed-loop merchant gift card does not remove enough trust to justify Nox over a normal private
  database.
- Each of the seven remaining candidates tested in this report fails at least one hard gate
  documented above; none reaches `FEASIBILITY: PASS`.

### Unknowns

- Thirteen current DoraHacks submissions are private, so absence from public GitHub is not proof of
  white space.
- The organizers may have unreleased Identity, NFT, Invoicing, allocator, or RWA reference
  implementations.
- A future Nox release may repair the optimized callback ACL or ship custom operations; the
  hackathon must target the current released package and live ABI.
- A genuinely independent redeemable Sepolia entitlement could change the gift-card verdict, but
  none has been source-verified.

## Decision consequence

The corrected docs-first pass is complete, but no candidate reaches `FEASIBILITY: PASS`. The next
agent should not choose Quote-to-Pay or the gift card from the earlier shortlist, and should not
return to a generic prediction market.

The smallest productive next research question is:

> Which recurring product action lets the application compute directly on confidential handles it
> already owns, ends in an independently valuable real state transition, needs no custom token
> callback or broad operator authorization, and has not already appeared in the VIBE winners or
> public Nox project field?

Until a named workflow answers that with executable evidence, Prompt 2, product specification, and
implementation remain blocked.
