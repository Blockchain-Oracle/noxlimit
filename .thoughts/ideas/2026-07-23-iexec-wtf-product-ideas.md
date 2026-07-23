# iExec WTF Hackathon: Revised Product Idea Menu

> This report supersedes the 2026-07-22 shortlist for idea selection. The old QuietRound analysis
> remains useful technical evidence, but QuietRound is now a backup.

## Decision Lens

The ranking uses the Hackathon Idea Scout's multiplicative test:

`judge can try it with zero setup friction × it obviously needs Nox × it feels like a real product`

“Thirty seconds” is a product-onboarding target, not a false Nox latency guarantee. The ideal first
experience needs no local setup, faucet hunt, or second wallet and still executes against real
Sepolia state.

Every mechanism and judge path below is a proposal, not a deployed claim. Any eventual pre-positioned
input must have genuine, inspectable provenance; seeded or synthetic records do not satisfy the
hackathon's real end-to-end requirement.

The raw score measures hypothesis quality, not implementation progress. Collision risk and
critical-path feasibility can override it, so the strategic rank is intentionally not a strict sort
of the score column.

| Rank | Concept | Try /5 | Needs Nox /5 | Product reality /5 | Raw promise /125 | Difficulty | Collision risk |
|---:|---|---:|---:|---:|---:|---|---|
| 1 | SLA Lock | 4.5 | 5 | 4.5 | 101.25 | Medium | Low |
| 2 | QuietClaim | 4 | 5 | 4.5 | 90 | Medium | Low–Medium |
| 3 | VeilFeed | 4 | 5 | 4.5 | 90 | Medium | Low |
| 4 | VeilQuota | 3.5 | 5 | 4 | 70 | Medium–High | Low |
| 5 | JuryLock | 4 | 5 | 4 | 80 | Medium | Low–Medium |
| 6 | AttestGate | 4 | 4 | 4 | 64 | Medium | Low |
| 7 | ShadowRank | 4 | 4.5 | 3.5 | 63 | Medium | Medium–High |
| 8 | Carbon Escrow | 3 | 5 | 4.5 | 67.5 | Medium–High | High |

The lower-ranked high scores reflect integration uncertainty or winner-lane collision, not weak
privacy mechanics.

## Exclusion Zones

Do not select a concept whose main pitch is:

- confidential OTC, dark pools, sealed RFQs, private trade size, or Vickrey auctions;
- a broad confidential RWA/tokenization/compliance operating system;
- private prediction markets or encrypted wagering;
- payroll;
- generic Safe limits or treasury policies;
- private swaps or Uniswap routing;
- Aave credit/liquidation;
- grants, crowdfunding, fundraising, or donations;
- “ERC-7984, but the amount is hidden” without confidential decision logic.

## 1. SLA Lock — Confidential Agent-Job SLA Enforcement

**It is like:** ERC-8183 agent-job escrow, but the evaluator can enforce a service agreement without
publishing the provider's latency, error rate, cost, or benchmark results.

**Problem:** Buyers need an objective reason to release payment for autonomous-agent work. Providers
and enterprise buyers may not want operational telemetry, model economics, failure rates, or
negotiated thresholds broadcast to competitors.

**Why Nox is essential:** Approved monitors submit encrypted `uint256` metrics and the client stores
encrypted policy thresholds. Nox aggregates, compares, and selects a pass/fail result. Only that
boolean becomes public. Its verified proof authorizes the evaluator contract to call `complete` or
`reject` on an unchanged ERC-8183 job. An optional ERC-8004 validation record carries the minimal
result into agent reputation.

**Zero-friction try target:** The judge presses **Run a real agent job**. A sponsored session would
call a live agent, credible independent monitors would sign and submit real telemetry, and the
screen would show the Nox computation graph plus the real escrow release/refund. The judge would
need neither a faucet nor a second wallet.

**Who uses it:** Agent marketplaces, API vendors, autonomous businesses, buyers of MCP/A2A tools,
and enterprise agent-operations teams.

**Current anchor:** Draft [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183) was created in
February 2026 for agent-job escrow and explicitly permits a smart-contract evaluator that aggregates
off-chain signals. [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) defines agent reputation/validation,
names TEE validation, and models metrics including quality, uptime, response time, and success rate.
[x402 Bazaar](https://www.coinbase.com/developer-platform/discover/launches/x402-bazaar) is a
shipping discovery/payment surface for agent services.

**Difficulty:** Medium.

**Kill risks:** Synthetic or self-reported telemetry destroys the product. The core must bind one
stored result handle to one ERC-8183 job and one terminal action. Reject the concept if a hidden
competitor already implements the same evaluator or if an unchanged ERC-8183 flow cannot be
completed on Ethereum Sepolia. Confirm that the organizer accepts an integration with an unmodified
draft ERC reference implementation.

## 2. QuietClaim — Confidential Multi-Adjuster Claims

**It is like:** an Etherisc-style claim product, but the requested loss, every adjuster's valuation,
and the policy cap remain private while only the approved payout is revealed.

**Problem:** Public loss estimates expose sensitive business or household information and let later
adjusters anchor on earlier opinions. A claimant still needs a transparent rule and a real payout.

**Why Nox is essential:** The claimant and three allowlisted adjusters submit encrypted amounts.
Nox computes a median assessment and selects `min(claim, median, cap)`. Only the final payable amount
is publicly decrypted; the application verifies its proof before releasing a one-shot policy payout.

**Zero-friction try target:** A real signed claim and two independently signed encrypted assessments
would already be inspectable on Sepolia. The judge would trigger the final participating adjuster's
signed assessment and watch the proof release a test policy payout without exposing any individual
valuation.

**Who uses it:** Parametric and specialty insurers, mutual-aid pools, protocol insurance products,
claims administrators, and commercial policyholders.

**Current anchor:** [Etherisc](https://www.etherisc.com/) describes an open-source insurance
protocol with oracle-driven automated claims and
[documented product contracts](https://docs.etherisc.com/contracts/2.x/). The integration must use a
real product/payout surface rather than a standalone “insurance-looking” escrow.

**Difficulty:** Medium.

**Kill risks:** Adjuster data provenance must be credible. A public final payout can still permit
inference, especially with only one claim. Do not claim anonymity. If integrating the insurance
framework becomes a multi-week dependency, use a narrowly defined policy contract and accept the
weaker open-source-integration score only with organizer approval.

## 3. VeilFeed — Confidential Committee Oracle

**It is like:** a low-frequency `AggregatorV3Interface` feed, but each reporter's observation is not
publicly disclosed by the workflow and only the median is published.

**Problem:** Small risk councils, private-index publishers, and slow NAV/benchmark committees expose
reporter observations to copying, coercion, strategic submission, and commercial leakage.

**Why Nox is essential:** Three or five allowlisted reporters submit encrypted values. A fixed
comparison/select network computes the median. Only the median handle becomes public, and the proof
updates an unchanged consumer-compatible feed adapter. Input plaintext is still visible inside the
Nox Gateway/Runner TEE boundary and to any explicitly granted viewer.

**Zero-friction try target:** Two independently signed real measurements would already be
inspectable as encrypted submissions. The judge would trigger the final live report and watch a real
consumer contract react to the public median without publicly disclosing the individual reports.

**Who uses it:** DAO risk councils, private-index publishers, fund administrators, collateral
committees, and low-frequency oracle networks.

**Current anchor:** Chainlink's
[Off-Chain Reporting protocol](https://research.chain.link/ocr.pdf) verifies that multi-reporter
aggregation is a real oracle architecture. VeilFeed must differentiate itself as confidential,
on-chain-verifiable aggregation for low-frequency committee feeds—not claim to replace high-frequency
OCR.

**Difficulty:** Medium.

**Kill risks:** “Chainlink already aggregates off-chain” is the main objection. The product needs a
specific feed whose individual reports must remain confidential and one real consumer action. Nox's
single-runner testnet and asynchronous results make spot-price or latency-sensitive feeds a bad fit.

## 4. VeilQuota — Confidential Data-Usage Budget

**It is like:** iExec DataProtector plus an enterprise quota manager, but negotiated limits, request
costs, and remaining usage stay confidential.

**Problem:** Data owners selling access to AI, research, or medical datasets need cumulative usage
controls without revealing commercial quotas or each customer's consumption.

**Why Nox is essential:** A buyer's remaining budget and each approved request cost are encrypted.
Nox uses `safeSub` and `select` to update state only when capacity remains and reveals only an
allow/deny result.

**Zero-friction try target:** The judge would request one real computation against a protected test
dataset and receive a genuine result/access receipt while the remaining quota stays encrypted.

**Who uses it:** Data marketplaces, model-training vendors, healthcare data collaborations, API
providers, and research consortia.

**Current anchor:** Current DataProtector documentation exposes `grantAccess` and
`processProtectedData`, including a maximum `numberOfAccess`.

**Difficulty:** Medium–High.

**Kill risks:** DataProtector `grantAccess` is currently an SDK/user action, not a documented atomic
Solidity callback from a Nox proof. The candidate survives only if a real iApp can check Nox
authorization state or another clean access path is proven. Do not simulate the protected-data
action.

## 5. JuryLock — Confidential Moderation Verdicts

**It is like:** Community Notes or a moderation jury, but juror severity/confidence scores remain
private and only the enforceable label is published.

**Problem:** Public juror ratings expose dissent, invite retaliation, and anchor later reviewers on
earlier decisions.

**Why Nox is essential:** Jurors submit encrypted numeric ratings. Nox aggregates and applies a
threshold; only the final label is revealed. Its proof creates a real EAS attestation that another
application can consume.

**Zero-friction try target:** The judge would open a live content case with inspectable source and
reviewer signatures, add the final confidential rating, and see a real EAS verdict appear without
any individual score.

**Who uses it:** Decentralized social clients, protocol forums, community moderation teams,
marketplace trust-and-safety groups, and content-curation networks.

**Current anchor:** [EAS](https://docs.attest.org/) is open-source attestation infrastructure with
schema, attestation, and resolver contracts.

**Difficulty:** Medium.

**Kill risks:** It can look like generic private voting. The product must include an actual moderation
queue, appeal state, and protocol-consumable enforcement result—not a three-button poll.

## 6. AttestGate — Multi-Issuer Private Eligibility

**It is like:** Guild, Unlock, or EAS access credentials, but several issuers can contribute
confidential attributes and only the final eligibility result becomes public.

**Problem:** A user may need to satisfy a combined income, tenure, participation, or risk policy
without publishing every source attribute.

**Why Nox is essential:** Approved issuers submit encrypted numeric claims for one beneficiary. Nox
combines them under a changing policy and reveals only pass/fail; the proof mints an access key,
role, or EAS credential.

**Zero-friction try target:** Two independently issued, verifiable claims would already be present.
The judge would supply the final real attestation and receive a live membership credential without
exposing the numbers.

**Who uses it:** Professional communities, gated data cooperatives, insurance pools, member-owned
networks, and cross-organization credential programs.

**Current anchor:** EAS supports open schemas, on-chain/off-chain attestations, and resolver
contracts; delegated attestations allow a service to cover gas.

**Difficulty:** Medium.

**Kill risks:** A one-person fixed-threshold proof is usually better served by zero knowledge. Nox is
justified only when multiple issuers contribute confidential values or policies must change without
regenerating circuits.

## 7. ShadowRank — Confidential Matchmaking Ratings

**It is like:** chess Elo matchmaking for an on-chain game, but exact ratings remain encrypted while
the system selects compatible opponents.

**Problem:** Public ratings enable opponent avoidance, targeting, and smurf optimization.

**Why Nox is essential:** Ratings persist as encrypted signed integers. Nox compares hidden rating
distances, selects a match, and updates ratings from public match outcomes without revealing exact
values.

**Zero-friction try target:** The judge would join a live queue against project-operated test
players whose prior matches are on-chain and receive a real match while no exact rating is visible.

**Who uses it:** On-chain games, competitive communities, wagering-free tournaments, and reputation
systems.

**Current anchor:** The mechanism is feasible with Nox `int256`, comparisons, subtraction, and
selection; it does not need a token wrapper.

**Difficulty:** Medium.

**Kill risks:** DarkOdds already won the broad confidential-gaming lane, and repeated matches reveal
approximate skill bands. The product must stay clearly outside wagering and prediction markets.

## 8. Carbon Escrow — Confidential Supplier-Compliance Settlement

**It is like:** CarbonChain-style CBAM reporting, but a supplier can satisfy a confidential emissions
policy and unlock an on-chain purchase escrow without publishing factory data.

**Problem:** Importers need verified embedded-emissions information while manufacturers treat
process and production data as commercially sensitive.

**Why Nox is essential:** An accredited verifier submits encrypted activity and emissions values.
Nox computes intensity/compliance bands; only the necessary result becomes public and authorizes a
supplier deposit or purchase-order settlement.

**Zero-friction try target:** The judge would choose a real test purchase order, submit a verifier's
signed emissions package, and see escrow release while raw production values remain hidden.

**Who uses it:** Importers, manufacturers, supply-chain finance providers, carbon-accounting vendors,
and procurement platforms.

**Current anchor:** The [EU CBAM definitive regime](https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en)
began in 2026 and its reporting framework recognizes commercially sensitive operator data.

**Difficulty:** Medium–High.

**Kill risks:** This sits close to RWAOS's institutional architecture and requires a credible verifier.
The chain action must be a real purchase/escrow event; official CBAM certificates remain in the EU
system.

## Top Three

### 1. SLA Lock

Best combination of current relevance, clean unmodified-protocol integration, indispensable Nox
logic, uncrowded territory, and a one-action product experience.

### 2. QuietClaim

The clearest human problem and most satisfying proof-gated economic consequence, with a tractable
fixed-size confidential calculation.

### 3. VeilFeed

The safest infrastructure-shaped build: simple confidential math, strong composability, low visible
collision, and no dependence on token wrapping or multi-step DeFi.
