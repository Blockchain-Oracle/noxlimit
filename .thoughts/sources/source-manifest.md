# Source Manifest

This manifest preserves the exact third-party sources used for the local research corpus. The source
trees themselves are intentionally excluded from Git; clone them again from these links when code
inspection is needed.

## Documentation captures

| Capture | Date | Size | SHA-256 | Note |
|---|---|---:|---|---|
| [`https://docs.noxprotocol.io/llms-full.txt`](https://docs.noxprotocol.io/llms-full.txt) | 2026-07-23 | 243,687 bytes / 7,090 lines | `706c4b861dfb79f396cdbe6d1661790ee126bd5ebe7b6390b8e45cd2d3c39f05` | Locally stored under ignored `.thoughts/raw/`; omits Vue-rendered Use Cases cards and category grid |
| User-supplied Nox documentation attachment | 2026-07-23 | 28,777 bytes / 358 lines | `fd4b6fc2b34ab7d603a2696a8afe53f7a9ad24a2948cd5b1e28f4746dcd13b63` | Table-of-contents/index-style extract, not the complete documentation body |

The current documentation source clone is pinned below at `ce4262e`. For component-rendered pages,
the source tree is more complete than the generated LLM capture.

## iExec-Nox organization snapshot

Snapshot created on 2026-07-22 from all 20 public repositories returned by the iExec-Nox
organization API.

| Repository | Snapshot commit | Role |
|---|---|---|
| [`.github`](https://github.com/iExec-Nox/.github) | [`4e0a00a`](https://github.com/iExec-Nox/.github/commit/4e0a00a07985f10d893b55d3dfcde2552a653087) | Organization profile |
| [`documentation`](https://github.com/iExec-Nox/documentation) | [`ce4262e`](https://github.com/iExec-Nox/documentation/commit/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7) | Documentation source |
| [`dstack`](https://github.com/iExec-Nox/dstack) | [`1c2c1ac`](https://github.com/iExec-Nox/dstack/commit/1c2c1ac723f668de89e5ebd37695f725dd010592) | Forked confidential-computing framework |
| [`dstack-quote-service`](https://github.com/iExec-Nox/dstack-quote-service) | [`410ac7b`](https://github.com/iExec-Nox/dstack-quote-service/commit/410ac7be55a5e9bf42c6ef8f3976b109d0b27f50) | TDX quote sidecar |
| [`nox-attestation-portal`](https://github.com/iExec-Nox/nox-attestation-portal) | [`2cf2c05`](https://github.com/iExec-Nox/nox-attestation-portal/commit/2cf2c05049ce3e3273e4c298b80e4c261678c544) | Chain-of-trust UI |
| [`nox-confidential-contracts`](https://github.com/iExec-Nox/nox-confidential-contracts) | [`e685645`](https://github.com/iExec-Nox/nox-confidential-contracts/commit/e685645986af394ab5507c0c67e611650f4e4d33) | ERC-7984 and wrappers |
| [`nox-cvms-exporter`](https://github.com/iExec-Nox/nox-cvms-exporter) | [`f844b92`](https://github.com/iExec-Nox/nox-cvms-exporter/commit/f844b920eba567a68464ee12490798648eaacad8) | CVM metadata |
| [`nox-cvms-exporter-aggregator`](https://github.com/iExec-Nox/nox-cvms-exporter-aggregator) | [`9e5c6f7`](https://github.com/iExec-Nox/nox-cvms-exporter-aggregator/commit/9e5c6f797f6e60b3d7ea9b0429684b1944e43785) | CVM quote/manifest aggregation |
| [`nox-handle-gateway`](https://github.com/iExec-Nox/nox-handle-gateway) | [`6bd20e6`](https://github.com/iExec-Nox/nox-handle-gateway/commit/6bd20e643f4a71210c7006ca52051b4a7d6da514) | Plaintext ingress, encrypted storage, proofs |
| [`nox-handle-sdk`](https://github.com/iExec-Nox/nox-handle-sdk) | [`b1cbfad`](https://github.com/iExec-Nox/nox-handle-sdk/commit/b1cbfade5ea51b1ce54b51f5d9ad8e49fa8c7f5e) | TypeScript Handle SDK |
| [`nox-hardhat-plugin`](https://github.com/iExec-Nox/nox-hardhat-plugin) | [`1adcb32`](https://github.com/iExec-Nox/nox-hardhat-plugin/commit/1adcb3268fdcc7136e33e03e163a4b11d1b5c431) | Local Nox stack |
| [`nox-ingestor`](https://github.com/iExec-Nox/nox-ingestor) | [`f8efe82`](https://github.com/iExec-Nox/nox-ingestor/commit/f8efe82946ee4032b10e5894eec6402353779391) | Event ingestion |
| [`nox-ingestor-replayer-fork`](https://github.com/iExec-Nox/nox-ingestor-replayer-fork) | [`1700158`](https://github.com/iExec-Nox/nox-ingestor-replayer-fork/commit/17001580cda741d68907e4c8cf7ff07a54c2ca58) | Event replay fork |
| [`nox-kms`](https://github.com/iExec-Nox/nox-kms) | [`5cf23f2`](https://github.com/iExec-Nox/nox-kms/commit/5cf23f2743033dafbe878db9342bd1da4d3341dc) | Protocol key service |
| [`nox-nexus`](https://github.com/iExec-Nox/nox-nexus) | [`936c850`](https://github.com/iExec-Nox/nox-nexus/commit/936c850886cdc0623c6722b13a63dde6880cab5a) | Handle/computation explorer |
| [`nox-observer`](https://github.com/iExec-Nox/nox-observer) | [`46116c3`](https://github.com/iExec-Nox/nox-observer/commit/46116c3054125995668ab2e92377ccda99813814) | Runtime observability |
| [`nox-product-poc`](https://github.com/iExec-Nox/nox-product-poc) | [`3dd5d49`](https://github.com/iExec-Nox/nox-product-poc/commit/3dd5d49a78d3fcda8879307e9e132ebe12502c71) | Official product patterns |
| [`nox-protocol-contracts`](https://github.com/iExec-Nox/nox-protocol-contracts) | [`688c965`](https://github.com/iExec-Nox/nox-protocol-contracts/commit/688c965dff38c1b86a1cf49ebc1263873b9d9645) | NoxCompute, ACL, primitives, Solidity SDK |
| [`nox-runner`](https://github.com/iExec-Nox/nox-runner) | [`c56433e`](https://github.com/iExec-Nox/nox-runner/commit/c56433e7d8f12c46e362d89f8304353c1f72c933) | TEE computation worker |
| [`nox-subgraph`](https://github.com/iExec-Nox/nox-subgraph) | [`477d85a`](https://github.com/iExec-Nox/nox-subgraph/commit/477d85a3c2690afacf7941aaf0eb738525e89021) | Operation/ACL index |

GitHub marked `dstack` and `nox-ingestor-replayer-fork` as forks. None of the 20 repositories was
archived at snapshot time.

## Release-pinned implementation sources

| Pin | Commit | Reason |
|---|---|---|
| `nox-protocol-contracts` v0.2.3 | [`6a4610b`](https://github.com/iExec-Nox/nox-protocol-contracts/commit/6a4610b730aa42540fba20a92920fc10d6b9957c) | Repository label for live Ethereum Sepolia implementation |
| `nox-protocol-contracts` v0.2.4 | [`1a2ebd4`](https://github.com/iExec-Nox/nox-protocol-contracts/commit/1a2ebd45e4af91797397961bcb0046fe1e5c1d03) | Current npm source; contract files match v0.2.3 |
| `nox-handle-sdk` v0.1.0-beta.13 | [`e552f6a`](https://github.com/iExec-Nox/nox-handle-sdk/commit/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0) | Current npm Handle SDK |
| `nox-hardhat-plugin` v0.1.0 | [`080264e`](https://github.com/iExec-Nox/nox-hardhat-plugin/commit/080264eb8066f0bebdaa9bc882acf12e48c6ec31) | Current npm Hardhat plugin |
| `nox-confidential-contracts` v0.2.2 | [`e685645`](https://github.com/iExec-Nox/nox-confidential-contracts/commit/e685645986af394ab5507c0c67e611650f4e4d33) | Current reference-contract package |

## Previous-winner snapshots

Cloned on 2026-07-23 from the repository URLs linked by each DoraHacks entry.

| Rank | Project | Repository | Snapshot commit |
|---:|---|---|---|
| 1 | Diam | [`PugarHuda/diam`](https://github.com/PugarHuda/diam) | [`a1b7bc3`](https://github.com/PugarHuda/diam/commit/a1b7bc3478b5f73231b1799d93f95f049af22ded) |
| 2 | RWAOS | [`pandu926/rwaOS-mvp`](https://github.com/pandu926/rwaOS-mvp) | [`a5162ad`](https://github.com/pandu926/rwaOS-mvp/commit/a5162ad03e36d9f0914ba52629290a90aff20691) |
| 3 | DarkOdds | [`winsznx/darkodds`](https://github.com/winsznx/darkodds) | [`b1833f8`](https://github.com/winsznx/darkodds/commit/b1833f81968626fbc1a02138dd4154d9b3e6fef8) |

The local winner clones were shallow. The commit counts observed locally are therefore not the full
repository histories.

## Relevant non-winning VIBE source snapshots

These repositories are not treated as winners. Their public source was inspected on 2026-07-23
because they occupy official docs-led categories and are material collision evidence for new idea
research.

| Product/category signal | Repository | Observed HEAD |
|---|---|---|
| Native confidential lending | [`aydi26/nox-hackathon` (Noxus)](https://github.com/aydi26/nox-hackathon) | [`15c9cd6`](https://github.com/aydi26/nox-hackathon/commit/15c9cd65678d09b5f2456991dd0e5d729a1e1b61) |
| Confidential NFT registry/marketplace | [`armsves/NoxShadowNFT`](https://github.com/armsves/NoxShadowNFT) | [`c6e6754`](https://github.com/armsves/NoxShadowNFT/commit/c6e675412b8bf9910d7c026eb86e498d77418140) |
| Confidential invoice factoring | [`uzochukwuV/Noxvault`](https://github.com/uzochukwuV/Noxvault) | [`32c89d2`](https://github.com/uzochukwuV/Noxvault/commit/32c89d20d6d13ff9c77a58bfcaf671b3466d3f05) |
| Confidential invoices/payment links | [`Bolexzy/paysec`](https://github.com/Bolexzy/paysec) | [`9cd1fd6`](https://github.com/Bolexzy/paysec/commit/9cd1fd6b58bed2597d072dfd410774d810223d10) |
| Confidential yield aggregator | [`maulana-tech/iEx-ai`](https://github.com/maulana-tech/iEx-ai) | [`55b55fe`](https://github.com/maulana-tech/iEx-ai/commit/55b55fe1bbe45637e7ac0cdf6b39d2fff617d907) |
| Principal/yield vault | [`TirthC27/yieldShield` (YOLDR)](https://github.com/TirthC27/yieldShield) | [`7f90fc4`](https://github.com/TirthC27/yieldShield/commit/7f90fc4193979490f0addb82af880a0c7df68345) |
| Confidential crowdfunding | [`Zifeng-Ma/FUNDME`](https://github.com/Zifeng-Ma/FUNDME) | [`22c1b78`](https://github.com/Zifeng-Ma/FUNDME/commit/22c1b7879c01e8383740547e576e48da3445e3ab) |
| Confidential grants | [`farouk-allani/private-grant`](https://github.com/farouk-allani/private-grant) | [`1541375`](https://github.com/farouk-allani/private-grant/commit/15413755fc6ce70d2c31b2ad284fcc9ce5d14ccf) |
| RWA impact lending vault | [`StephenSook/GroundVault`](https://github.com/StephenSook/GroundVault) | [`a90925a`](https://github.com/StephenSook/GroundVault/commit/a90925aef7c72b77e12be4003e8b072ade2850a4) |
| Private-credit deal room | [`karagozemin/Obscura`](https://github.com/karagozemin/Obscura) | [`a4699dc`](https://github.com/karagozemin/Obscura/commit/a4699dc5c748b002768523540994285ad192c855) |
| Confidential VC fund | [`Asyfdzaky/sea-equity-confidential-vc-fund`](https://github.com/Asyfdzaky/sea-equity-confidential-vc-fund) | [`46f748b`](https://github.com/Asyfdzaky/sea-equity-confidential-vc-fund/commit/46f748b2a8220170ab9408f012737d4257c53c9c) |

These snapshots show category occupancy, not implementation correctness, eligibility, or continued
operation. Re-audit the exact source and deployment before making a product claim.

## Comparable privacy-product snapshot

| Product/category signal | Repository | Observed HEAD |
|---|---|---|
| FHE private gift-card checkout with encrypted product, amount, cUSDC settlement, and Reloadly fulfillment | [`0xshubhs/sigill`](https://github.com/0xshubhs/sigill) | [`082fd91`](https://github.com/0xshubhs/sigill/commit/082fd91d98cb950aee3f8afa44be97afc9a746cd) |

Sigill was cloned on 2026-07-23 under ignored `.thoughts/raw/` to verify the gift-card collision.
The separate FHE2P, Raise, and UniVoucher evidence in the candidate report is linked to their public
project or product documentation rather than a local source snapshot.

## Relevant current WTF source snapshot

| Product/category signal | Repository | Observed HEAD |
|---|---|---|
| Confidential AI-agent budgets, per-call caps, x402/MCP execution, and live Nox settlement | [`Venkat5599/kairoszks`](https://github.com/Venkat5599/kairoszks) | [`33ef50e`](https://github.com/Venkat5599/kairoszks/commit/33ef50e752fe7e8d74b073cdd8a9a1337f921bcf) |
| Aave credit, sealed liquidation, and private hedging | [`Xconmax245/Skia`](https://github.com/Xconmax245/Skia) | [`14c75b6`](https://github.com/Xconmax245/Skia/commit/14c75b6f131f39e599688f16cc93c59852a20237) |
| Confidential strategy agent and vault | [`RaYYeR220/occulta`](https://github.com/RaYYeR220/occulta) | [`386dd88`](https://github.com/RaYYeR220/occulta/commit/386dd886d12d5b234a128f32fbd0f7820b2b7424) |

Kairos was created before July but pushed during the current WTF window, so the
`created:>=2026-07-01` snapshot below did not return it. It was cloned on 2026-07-23 under ignored
`.thoughts/raw/` and must be included in metered API, agent-budget, and x402 collision checks. Skia
and Occulta were pinned because they materially constrain the lending and strategy-vault lanes.

## Visible July 2026 competitor snapshot

Observed at `2026-07-23T15:16:47Z` with:

```bash
gh search repos 'iexec nox created:>=2026-07-01' --limit 100
```

The lane is a manual primary classification; some repositories span more than one lane. This dated
list preserves the exact 20-result audit rather than treating the mutable search as reproducible
history.

| Created (UTC) | Repository | Primary visible lane |
|---|---|---|
| 2026-07-08 | [`luongs3/wtf-escrow`](https://github.com/luongs3/wtf-escrow) | milestone escrow |
| 2026-07-09 | [`luongs3/wtf-audit-trail`](https://github.com/luongs3/wtf-audit-trail) | CVE audit trail |
| 2026-07-10 | [`Obiajulu-gif/shadowswap`](https://github.com/Obiajulu-gif/shadowswap) | private Uniswap routing |
| 2026-07-11 | [`Bsh54/payvault`](https://github.com/Bsh54/payvault) | payroll |
| 2026-07-12 | [`nonggde/privyroll`](https://github.com/nonggde/privyroll) | payroll |
| 2026-07-13 | [`FLUFFYWOLF12341/veilpay-nox`](https://github.com/FLUFFYWOLF12341/veilpay-nox) | payroll |
| 2026-07-14 | [`wcqqq1214/noxsafe`](https://github.com/wcqqq1214/noxsafe) | Safe/budget/policy |
| 2026-07-16 | [`RaYYeR220/occulta`](https://github.com/RaYYeR220/occulta) | DeFi strategy agents |
| 2026-07-16 | [`ZenWeb3/Nomos`](https://github.com/ZenWeb3/Nomos) | payroll |
| 2026-07-16 | [`raorla/CRYPTOWORDLE`](https://github.com/raorla/CRYPTOWORDLE) | word game |
| 2026-07-16 | [`juantzy7/wtf-nox-payroll`](https://github.com/juantzy7/wtf-nox-payroll) | payroll |
| 2026-07-17 | [`Usernames686/noxroll`](https://github.com/Usernames686/noxroll) | payroll |
| 2026-07-17 | [`nonggde/noxguard`](https://github.com/nonggde/noxguard) | Safe/budget/policy |
| 2026-07-18 | [`a252937166/veilguard`](https://github.com/a252937166/veilguard) | Safe/budget/policy |
| 2026-07-18 | [`Lukeknow0/ciphergate`](https://github.com/Lukeknow0/ciphergate) | Safe/budget/policy |
| 2026-07-18 | [`YingchenWang999/shadow-safe-payroll`](https://github.com/YingchenWang999/shadow-safe-payroll) | payroll |
| 2026-07-19 | [`ChiJian28/NoxRoll`](https://github.com/ChiJian28/NoxRoll) | payroll |
| 2026-07-20 | [`Xconmax245/Skia`](https://github.com/Xconmax245/Skia) | Aave credit/liquidation |
| 2026-07-21 | [`Yusasive/Sitr`](https://github.com/Yusasive/Sitr) | donation/treasury |
| 2026-07-23 | [`thesithunyein/cloak-router`](https://github.com/thesithunyein/cloak-router) | private Uniswap routing |

## Context7 documentation IDs

| Subject | Context7 ID |
|---|---|
| Nox documentation | `/iexec-nox/documentation` |
| Current iExec/DataProtector documentation | `/websites/iex_ec` |
| iExec documentation repository | `/iexecblockchaincomputing/documentation` |

## Evidence precedence

When sources disagree, use:

1. live chain state and successful live transactions;
2. exact installed release/tag source;
3. release-tied deployment manifests;
4. default-branch source as forward-looking context;
5. official documentation prose;
6. cached/indexed extracts;
7. third-party summaries.

Do not copy third-party application code merely because a public repository exists. Check the
license for the exact file/subtree first.
