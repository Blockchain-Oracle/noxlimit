# Nox repository map

The public organization contains 20 repositories, but a hackathon application should directly
depend on only three published packages. The rest are reference implementations, observability,
or operator infrastructure.

## Application-facing repositories

| Repository | Use it for | QuietRound decision |
|---|---|---|
| `nox-protocol-contracts` | Solidity types, `Nox` helpers, NoxCompute ABI | Install the published `0.2.4` package; do not import unreleased `main` APIs |
| `nox-handle-sdk` | Browser/server encryption, ACL decryption, public proof retrieval | Install and pin `0.1.0-beta.13` |
| `nox-hardhat-plugin` | Local Nox off-chain stack and end-to-end tests | Install and pin `0.1.0`; requires Hardhat 3, Node 22+, and Docker |
| `nox-confidential-contracts` | Canonical ERC-7984 and request/finalize examples | Read the `0.2.2` wrapper; do not add the token package unless the product needs tokens |
| `documentation` | Architecture and guides | Use as orientation, then verify claims against pinned source |
| `nox-product-poc` | Official frontend and contract patterns | Reuse ideas from `demo-ctoken`; treat cVault as reference-only where licensing/versioning is unclear |

## Runtime and trust infrastructure

| Repository | Responsibility | Application relationship |
|---|---|---|
| `nox-handle-gateway` | Receives input plaintext in TDX, encrypts/stores ciphertext, applies ACL checks, returns proofs | Accessed through the Handle SDK; do not self-host for the MVP |
| `nox-kms` | Holds the protocol EC key and delegates shared secrets to authorized enclave/user RSA keys | Trust-model dependency, not a code dependency |
| `nox-runner` | Executes ordered confidential operations inside TDX and publishes encrypted results | Explains supported types, latency, retries, and same-transaction chaining |
| `nox-ingestor` | Reads NoxCompute logs, groups a transaction's operations, and publishes to NATS | Explains why on-chain completion precedes result readiness |
| `nox-ingestor-replayer-fork` | Replays historical chain event batches into NATS | Operator recovery tooling only |
| `dstack` | Forked confidential-computing framework underneath the TEE deployment | Architecture reference; avoid application coupling |
| `dstack-quote-service` | Exposes TDX quote generation as an HTTP sidecar | Attestation infrastructure only |
| `nox-cvms-exporter` | Lists active CVMs and routing metadata per host | Attestation infrastructure only |
| `nox-cvms-exporter-aggregator` | Aggregates CVMs and fetches challenge-bound quotes/manifests | Supports trust portal; not an app backend |
| `nox-attestation-portal` | Verifies the visible Nox CVM fleet and compose/measurement chain | Link judges to the hosted portal; do not copy proprietary source |

## Indexing and observability

| Repository | Responsibility | Application relationship |
|---|---|---|
| `nox-subgraph` | Indexes low-level handles, operations, parents/children, and ACL events | Optional debug/activity source; it lacks product semantics |
| `nox-observer` | Correlates NATS, subgraph, and storage state for unresolved-handle monitoring | Operator tool; public API is not a supported per-handle app API |
| `nox-nexus` | Public explorer for a handle/transaction computation graph | Valuable demo/debug outbound link |

## Organization metadata

| Repository | Responsibility |
|---|---|
| `.github` | Organization profile, conceptual quick start, and links |

The exact commits and fork status are in the
[source manifest](../sources/source-manifest.md#iexec-nox-organization-snapshot).

## Licensing cautions

- The deployable `Nox.sol` library is MIT-licensed; the NoxCompute implementation and operator services use BUSL-1.1 in source.
- `nox-attestation-portal` declares proprietary licensing in its README.
- `nox-product-poc/demo-ctoken` has an MIT license; the repository root and cVault subtree do not provide the same clear repository-level grant. Transplant patterns, not unlicensed source.
- A public GitHub repository is not automatically permissively licensed.

## Sources

- [Organization source manifest](../sources/source-manifest.md#iexec-nox-organization-snapshot)
- [Nox organization profile](https://github.com/iExec-Nox/.github/blob/4e0a00a07985f10d893b55d3dfcde2552a653087/profile/README.md)
- [Gateway README](https://github.com/iExec-Nox/nox-handle-gateway/blob/6bd20e643f4a71210c7006ca52051b4a7d6da514/README.md)
- [Runner README](https://github.com/iExec-Nox/nox-runner/blob/c56433e7d8f12c46e362d89f8304353c1f72c933/README.md)
- [Nexus README](https://github.com/iExec-Nox/nox-nexus/blob/936c850886cdc0623c6722b13a63dde6880cab5a/README.md)
- [Attestation portal README](https://github.com/iExec-Nox/nox-attestation-portal/blob/2cf2c05049ce3e3273e4c298b80e4c261678c544/README.md)
