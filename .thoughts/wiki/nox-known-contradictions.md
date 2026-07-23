# Nox known contradictions and resolutions

Last verified: **2026-07-23**

The Nox repositories are moving quickly. This page records contradictions that can cause build or
product errors and resolves them using live state and release-pinned source.

| Topic | Conflicting claims | Resolution for this build |
|---|---|---|
| Generated use-case corpus | `llms-full.txt` contains the Use Cases headings but no cards or category labels | The generator drops Vue-rendered content. Read the cloned `src/getting-started/use-cases.md`, which contains five product cards and ten official categories. |
| Use-case evidence level | The Use Cases section is titled “Demos & reference projects,” which can imply every card is implemented | Only Confidential Tokens and Encrypted Positions include demo/source links. Encrypted Strategy, Capital Allocator, and RWA are detailed concept pages without linked implementations. |
| Current primitives vs product categories | Official docs endorse lending, prediction markets, Identity, NFT, and other broad products, while the runtime accepts only five numeric/bool types | Numeric primitives can compose into real product logic. They do not provide arbitrary strings, files, metadata, addresses, or developer-defined TEE functions; test each exact operation graph. |
| Custom DeFi functions | The docs describe DeFi products and list optimized `swap`, `borrow`, and `repay` functions | Those custom functions are marked “Coming Soon.” Build only from current arithmetic, safe arithmetic, comparison, select, transfer, mint, and burn operations. |
| Encrypted Strategy auditor access | The concept page calls auditor access scoped and revocable | Current viewer/admin grants cannot be revoked. Rotating to a new handle changes future access but does not remove access to the old handle. |
| Strategy timing privacy | The Encrypted Strategy page says the timing and triggers of capital movements never appear on-chain | Nox hides selected values, not transaction timing, callers, targets, or metadata. Aggregation may reduce attribution but cannot make execution timing invisible. |
| cToken demo network | The Use Cases card says Arbitrum Sepolia; the detailed demo guide and current source config say Ethereum Sepolia | Treat the current source/config as authoritative for the app. Do not infer a network from the card alone. |
| cToken source link | The docs link `iExec-Nox/demo-ctoken` | That public repository does not resolve. Current source is under `iExec-Nox/nox-product-poc/demo-ctoken`. |
| ERC-7984 callback amount ACL | `IERC7984Receiver` says the callback `amount` is accessible to the receiver, and the guide invites the receiver to process it | The standard wrapper uses the optimized transfer path, which grants the recipient its new balance handle but not the separate `transferred` amount handle passed into the callback. The raw path explicitly grants it. Do not design amount-sensitive callbacks against an optimized/shared cToken without an executable ACL test. |
| cVault yield | The use-case page describes rewards/yield and the frontend labels APY as settler-reported | The backend returns a hard-coded `0.05` simulated target APY, and value can be raised by admin/direct token injection. This is not evidence of a live yield strategy. |
| cVault selective-disclosure UI | The product page and create flow imply initial viewer configuration | The creator UI contains a TODO saying viewers are not wired to the vault ACL. Verify contract-side grants independently. |
| Ethereum Sepolia SDK support | Advanced configuration lists Ethereum, then says it is upcoming and only Arbitrum auto-resolves | Published Handle SDK beta.13 includes complete Ethereum Sepolia Gateway, contract, and subgraph config. Ethereum Sepolia is supported. |
| Solidity version | Hello World uses `^0.8.27`; released plugin README says `0.8.29`; package `Nox.sol` requires `^0.8.35` | Compile with Solidity `0.8.35`. Lower exact compilers fail the import graph. |
| Package version vs source | Default branches still report `0.2.4`, beta.13, and `0.1.0` | Those branches are 29/5/2 commits ahead of the corresponding npm payloads. Use release/tag clones or npm gitHead, not the version string on `main`. |
| Live contract API | Contract `main` exposes `toTransientE*` and `persistTransientHandle` | Ethereum Sepolia is initializer v3/v0.2.3 and lacks that API. Use the released 0.2.4 `toE*` + `allowThis` interface. |
| Post-release hardening | `main` rejects public handles presented as private inputs, rejects future `createdAt`, and tightens KMS/public-value validation | Those checks are not in npm 0.2.4 or the live v0.2.3 runtime. Treat the Gateway as a trusted signer, do not hand-roll proofs, and do not describe `main` fixes as deployed. |
| Supported types | Enums, SDK unions, and examples mention all Solidity integer/bytes/string/address types | Runtime supports only `bool`, `uint16`, `uint256`, `int16`, and `int256`; arithmetic excludes `bool`. |
| Encrypted casts | Broad type surface can imply types can be mixed | No implemented encrypted `euint16 → euint256` cast exists; arithmetic operands must match. QuietRound uses `euint256` scores and totals. |
| Handle layout | Some SDK/glossary prose describes hash + chain + type + version without attributes | Released Solidity and SDK code implement version byte 0, chain bytes 1–4, type byte 5, attributes byte 6, hash bytes 7–31. Treat handles as opaque. |
| Deterministic outputs | Docs broadly say the same operation/inputs always produce the same handle; other prose mentions timestamps/senders | Release code hashes operator, operands, NoxCompute address, seed, and output index. Unique-operand operations are deterministic for that tuple; all-public operations increment a uniqueness counter; Gateway inputs are separate. |
| Who sees plaintext | Welcome/glossary wording says only Runner sees it | Browser sees the original; Gateway TEE receives input plaintext and public-decrypts; Runner TEE sees computation plaintext. KMS delegates secrets without receiving application plaintext. |
| Public decryption vs public handle | Some docs imply marking a handle public lets everyone compute on it | In the deployed ACL code, a unique handle's public-decryption flag enables decryption, not general compute access. A non-unique/public handle inherently bypasses ACL and can be used by everyone. |
| ACL revocation | `viewACL` prose suggests admins can revoke viewers | Deployed source has no viewer/admin revocation. Viewer/admin/public grants are permanent; only transient access can be cleared in the current transaction. |
| Transient viewer semantics | An ACL intro implies transient holders can decrypt | Transient permission disappears at end of transaction; off-chain decryption occurs later. Treat it as compute/delegation authority during the current call, not durable viewer access. |
| Result readiness | High-level docs show async execution but give no pending API or polling recipe; some test examples decrypt immediately | SDK beta.13 exports `NotYetComputedHandleError` after a short retry. Add durable application polling and retry states. |
| “On-chain computation” | Marketing copy can sound synchronous/on-chain | On-chain contracts validate and emit operations; Runner executes them off-chain in TDX, later storing encrypted results. |
| “Production-ready” | Welcome copy uses production language | Docs also disclose a single Runner, single full-key KMS, uncertified S3, and experimental disclaimer. Use testnet/experimental language. |
| Foundry support | Foundry appears in navigation/prerequisites | Its guide is “Coming Soon.” Use Hardhat 3 + Docker for the supported E2E path. |
| Hello World safety | Piggy Bank uses wrapping subtraction | It can underflow. The same tutorial later warns to use safe arithmetic/select for production logic. Do not copy the business logic. |
| Audit coverage | A Halborn scope is present; an AI review report is present | The mirror contains no Halborn findings/report. The Pashov-style report explicitly says it is AI-generated and covers v0.2.2. Do not claim full independent audit coverage. |

## Primary evidence

- [Published beta.13 network config](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/config/networks.ts#L8-L21)
- [Published contracts pragma](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/sdk/Nox.sol#L1-L7)
- [Published type validator](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/utils/TypeUtils.sol#L119-L186)
- [Published handle layout](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/modules/Compute.sol#L578-L637)
- [Published ACL implementation](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/modules/ACL.sol)
- [ERC-7984 optimized and raw update paths](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/ERC7984Base.sol#L355-L489)
- [Standard wrapper selects optimized update](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/extensions/ERC20ToERC7984Wrapper.sol#L21-L27)
- [Returned-handle ACL issue 35](https://github.com/iExec-Nox/nox-confidential-contracts/issues/35)
- [Input plaintext path](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/guides/accept-user-inputs.md#L67-L76)
- [Async architecture](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/global-architecture-overview.md#L78-L118)
- [SDK pending behavior](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/methods/publicDecrypt.ts#L65-L110)
- [Foundry placeholder](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/guides/build-confidential-smart-contracts/foundry.md)
- [AI audit response and scope](https://github.com/iExec-Nox/nox-protocol-contracts/tree/688c965dff38c1b86a1cf49ebc1263873b9d9645/audits)

## Working rule

If a new contradiction appears during implementation, record the observed package version, chain,
block, exact call, and source commit. Resolve it in favor of the live deployment and exact installed
payload—not a tutorial example.
