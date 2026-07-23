# Source Manifest

This manifest preserves the exact third-party sources used for the local research corpus. The source
trees themselves are intentionally excluded from Git; clone them again from these links when code
inspection is needed.

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
