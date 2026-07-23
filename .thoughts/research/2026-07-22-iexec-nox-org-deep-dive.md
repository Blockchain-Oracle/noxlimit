# Reality Research: iExec-Nox Organization and Developer Surface

## Scope

Establish the implementation-relevant current reality of the entire public iExec-Nox organization:
repository roles, live deployment state, exact installable SDK/tooling versions, confidential data
flow, supported operations, access/proof semantics, reusable official product patterns, documented
limitations, security/audit posture, and contradictions that affect an Ethereum Sepolia hackathon
application. This is a facts-first research brief; it does not claim QuietRound has been implemented.

## Sources Checked

- All 20 public repositories returned by the iExec-Nox organization API, inspected locally at the
  explicit commit SHAs in the [source manifest](../sources/source-manifest.md).
- Exact release-tag snapshots for `nox-protocol-contracts` v0.2.3 and v0.2.4, Handle SDK
  v0.1.0-beta.13, Hardhat plugin v0.1.0, and confidential contracts v0.2.2, reproducible from the
  [release-pin manifest](../sources/source-manifest.md#release-pinned-implementation-sources).
- npm registry metadata, including each package's `gitHead` and current dist tag.
- Context7 resolution `/iexec-nox/documentation`, followed by the complete local documentation source
  at commit `ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7`.
- Ethereum Sepolia JSON-RPC at block `11,329,751` (`2026-07-22T22:57:00Z`): proxy storage,
  initializer storage, bytecode presence, Gateway, KMS key, and proof-expiration calls.
- The public Hasura source configured by Nox Nexus, plus Ethereum Sepolia transaction
  [`0x401c…53ef`](https://sepolia.etherscan.io/tx/0x401c94b8102df5056f8ce5f0a05a15771276f6a9e527ac9b0e214007fb1953ef).
- Official `nox-product-poc` Confidential Token and cVault contracts/frontends.
- Nox protocol, Handle SDK, Gateway, Runner, Ingestor, KMS, Subgraph, Observer, Nexus, attestation,
  and deployment sources.
- The repository's Pashov-style AI security review/response and Halborn scope document.
- Existing [hackathon research](./2026-07-22-iexec-wtf-hackathon.md) and
  [QuietRound concept audit](../verification/2026-07-22-quietround-concept-audit.md).

## Verified Facts

### 1. The local corpus is complete for the public organization snapshot

- GitHub returned 20 public repositories including `.github`; none were archived at snapshot time.
- GitHub marks `dstack` and `nox-ingestor-replayer-fork` as forks.
- Every repository was inspected locally at a recorded commit. The exact reproducible map is in the
  [source manifest](../sources/source-manifest.md#iexec-nox-organization-snapshot).
- The application-facing repositories are protocol contracts, Handle SDK, Hardhat plugin,
  confidential-contract references, documentation, and product POCs. Gateway/KMS/Runner/Ingestor
  and attestation repositories are operator/trust context, not dependencies that a hackathon frontend
  should deploy.

### 2. Default branches, published packages, and live contracts are three different states

- npm currently publishes:
  - `@iexec-nox/nox-protocol-contracts@0.2.4`, gitHead `1a2ebd45...`;
  - `@iexec-nox/handle@0.1.0-beta.13`, gitHead `e552f6a3...`;
  - `@iexec-nox/nox-hardhat-plugin@0.1.0`, gitHead `080264eb...`;
  - `@iexec-nox/nox-confidential-contracts@0.2.2`.
- The corresponding default branches are 29, 5, and 2 commits ahead of the first three npm payloads
  while their package manifests retain the released version number.
- Contract `main` introduces `toTransientE*`, `persistTransientHandle`, and initializer version 4.
  Those are forward-looking APIs, not part of the current npm payload or live Ethereum deployment.
- Ethereum Sepolia is explicitly labeled v0.2.3 by the repository. Contract files in release v0.2.3
  and v0.2.4 are identical; v0.2.4 changed deployment/upgrade tooling. The published 0.2.4 Solidity
  library is therefore the current compatible import, but it must not be conflated with `main`.

Sources: [v0.2.4 release](https://github.com/iExec-Nox/nox-protocol-contracts/releases/tag/v0.2.4),
[v0.2.3/v0.2.4 changelog](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/CHANGELOG.md),
and [deployment scope](https://github.com/iExec-Nox/nox-protocol-contracts/blob/688c965dff38c1b86a1cf49ebc1263873b9d9645/audits/halborn/scope.md#L43-L46).

### 3. Live Ethereum Sepolia Nox state was independently read

At block `11,329,751`:

| Item | Live value |
|---|---|
| NoxCompute proxy | `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF` |
| implementation slot | `0xc9B5D2e99e45dc652b3B90bA5FA79667ACFEb819` |
| initializer version | `3` |
| proof expiration | `3600` seconds |
| Gateway signer | `0xE13191F53671957C8a48A7A3Ff15E16450a1552F` |
| KMS public key | `0x0312e1b0794046ef04bfae49938c1293fabbd6614c04862a4059d5e8a0911635c2` |

The proxy and implementation returned bytecode. The storage values match the repository's Sepolia
deployment manifest/config. Gateway HTTP and the Ethereum Sepolia subgraph also responded during the
audit.

### 4. The computation lifecycle is asynchronous

- The browser/SDK sends input plaintext to the Handle Gateway. The Gateway TEE encrypts it with the
  KMS public key and stores ciphertext in AWS S3.
- NoxCompute validates proofs/types, derives output handles, grants transient access, and emits
  operation events. The on-chain transaction finishes before output ciphertext exists.
- Ingestor polls logs, groups same-transaction events in log order, and publishes a transaction
  message through NATS JetStream without waiting for confirmations.
- The current single Runner processes messages sequentially inside TDX, decrypts operands, executes
  operations, re-encrypts results, stores them through the Gateway, and acknowledges success.
- Failed Runner work remains unacknowledged and can be redelivered; the documented default maximum
  delivery count is ten.
- Handle SDK beta.13 retries a not-yet-computed public handle on a 1/2/4-second schedule, then throws
  the exported `NotYetComputedHandleError`. It does not provide a full durable product lifecycle.

Sources: [global architecture](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/global-architecture-overview.md#L78-L136),
[Runner](https://github.com/iExec-Nox/nox-runner/blob/c56433e7d8f12c46e362d89f8304353c1f72c933/README.md),
and [publicDecrypt retry](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/methods/publicDecrypt.ts#L65-L110).

### 5. A matching multi-operation computation resolved live on the required chain

- Nox Nexus config identifies its public Hasura source and Ethereum Sepolia chain.
- Querying that source for transaction `0x401c…53ef` returned 25 handles: two `Add`, one `Ge`, five
  `Select`, two `Div`, two `Mul`, two `Sub`, nine `Transfer`, and two source/empty-operator handles.
- The transaction succeeded with 47 logs.
- Computed handles share block timestamp `2026-07-22T19:06:48Z` and resolution timestamp
  `2026-07-22T19:07:00Z`, a 12-second observation for this transaction.
- This verifies that ordered Add/comparison/Select chaining works on Ethereum Sepolia. It does not
  establish a latency service-level guarantee.

Sources: [Nexus chain config](https://github.com/iExec-Nox/nox-nexus/blob/936c850886cdc0623c6722b13a63dde6880cab5a/src/lib/chains.ts#L1-L27),
[Nexus Hasura query](https://github.com/iExec-Nox/nox-nexus/blob/936c850886cdc0623c6722b13a63dde6880cab5a/src/lib/hasura.ts#L95-L101),
and [Etherscan transaction](https://sepolia.etherscan.io/tx/0x401c94b8102df5056f8ce5f0a05a15771276f6a9e527ac9b0e214007fb1953ef).

### 6. Input proofs bind both wallet owner and application contract

- `encryptInput` sends the connected wallet as `owner` and the supplied target address as
  `applicationContract`.
- The signed proof layout is owner (20 bytes), app (20), createdAt (32), signature (65): 137 bytes.
- `Nox.fromExternal` passes the current application function's `msg.sender` as expected owner.
- NoxCompute requires proof app = the NoxCompute caller (the application contract) and proof owner =
  the value passed by `fromExternal`.
- A direct `wallet → application → fromExternal` path is valid. A
  `wallet → Allo/router → application → fromExternal` path normally fails owner matching.
- Proof validation has no consumed nonce. Replaying a still-valid proof can repeat the application's
  state mutation even though Nox's validation grant is idempotent.

Sources: [beta.13 encryptInput](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/methods/encryptInput.ts#L122-L189),
[released Nox.fromExternal](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/sdk/Nox.sol#L155-L198),
and [released proof validation](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/modules/Compute.sol#L53-L94).

### 7. Runtime types are much narrower than declared type unions

- End-to-end runtime support is `bool`, `uint16`, `uint256`, `int16`, and `int256`.
- Arithmetic/comparison/select support the four integer types.
- The Handle SDK enforces this five-type subset even though its TypeScript union enumerates many
  future types.
- Arithmetic validates identical operand types. No encrypted integer-width cast is implemented.
- Custom/arbitrary TEE functions are not currently available.

Therefore an arithmetic path cannot accept `euint16` input and silently accumulate it into
`euint256`. One width must be used throughout that path.

Sources: [TypeUtils](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/utils/TypeUtils.sol#L119-L186)
and [Handle SDK guard](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/methods/encryptInput.ts#L36-L55).

### 8. ACL and public-proof authority are deliberately broad and mostly irreversible

- New results grant the calling application transient access only. Cross-transaction state requires
  `Nox.allowThis` before the transaction ends.
- Persistent admins can compute, privately decrypt, and delegate. Viewers can decrypt only.
- Transient access is intentionally the same trust level as persistent access during the transaction;
  a transient holder can add permanent admins/viewers or mark a handle public.
- The deployed source has no viewer/admin revocation method. Public decryption is irreversible.
- Marking a unique handle publicly decryptable does not grant arbitrary compute access; it enables
  public decryption. Inherently public/non-unique handles bypass ACL.
- A public decryption proof is Gateway signature + plaintext. On-chain validation binds the handle
  and plaintext hash but not caller, app, round, expiry, or nonce, and does not independently read the
  public flag. The Gateway enforces that flag by design.

Sources: [released ACL](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/modules/ACL.sol),
[released proof verifier](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/modules/Compute.sol#L96-L112),
and [team audit response](https://github.com/iExec-Nox/nox-protocol-contracts/blob/688c965dff38c1b86a1cf49ebc1263873b9d9645/audits/pashov-ai/response.md#L10-L54).

### 9. The supported local developer path is specific

- Node 22+ (plugin CI covers 22 and 24), Docker, Hardhat 3, Viem or Ethers, and Solidity `0.8.35`.
- The local EDR network needs `chainType: "op"`.
- The plugin starts KMS, Gateway, Ingestor, Runner, NATS, and S3; released service images are pinned
  to Nox `0.6.0`.
- The released plugin README's `0.8.29` example is stale; its actual example and package imports
  require `0.8.35`.
- Foundry documentation is only “Coming Soon.”
- The published plugin is for local stack chain `31337`. New `main` support for existing/per-network
  stacks is not in npm 0.1.0.

Sources: [Hardhat guide](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/guides/build-confidential-smart-contracts/hardhat.md),
[released plugin README](https://github.com/iExec-Nox/nox-hardhat-plugin/blob/080264eb8066f0bebdaa9bc882acf12e48c6ec31/packages/plugin/README.md),
and [Foundry placeholder](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/guides/build-confidential-smart-contracts/foundry.md).

### 10. Official POCs contain reusable patterns and known faults

- `demo-ctoken` caches one Handle client per account/chain, sends encrypted inputs directly to the
  consuming contract, models request/proof/finalize states, retries public decryption, and exposes a
  separate finalization retry.
- The wrapper reference stores a pending handle, marks it public, later verifies
  `Nox.publicDecrypt(handle, proof)`, then releases public assets.
- cVault demonstrates encrypted conditions with comparisons + `select`, a sequential step runner,
  and a plaintext hook that resets on handle change.
- The Confidential Token finalization hook does not wait for the final transaction receipt before
  marking confirmation. Its retry data lives only in a React ref.
- cVault targets Arbitrum Sepolia, pins older Nox code/compilers, and grants owner access in ways that
  are unsuitable for confidential judging.
- `nox-product-poc` has no root license; only `demo-ctoken` has a clear MIT file.
- A scan of the two configured official cToken addresses from Nox's Sepolia start block through
  block `11,329,762` found no `UnwrapRequested`/`UnwrapFinalized` events. The frontend is therefore
  source evidence for a pattern, not live evidence of that configured unwrap flow.

Sources: [`use-unwrap.ts`](https://github.com/iExec-Nox/nox-product-poc/blob/3dd5d49a78d3fcda8879307e9e132ebe12502c71/demo-ctoken/hooks/use-unwrap.ts),
[wrapper](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/extensions/ERC20ToERC7984WrapperBase.sol),
and [cVault state pattern](https://github.com/iExec-Nox/nox-product-poc/blob/3dd5d49a78d3fcda8879307e9e132ebe12502c71/cVault/contracts/contracts/vault/ConfidentialERC7540.sol#L280-L317).

### 11. The documented trust model is MVP/testnet-shaped

- Current deployment is described as a single Runner and a single KMS holding the complete private
  key; threshold KMS and multi-runner consensus are future directions.
- The S3 setup explicitly lacks finance-grade certification.
- Boot authorization uses an off-chain measurement whitelist; on-chain governance is planned.
- The docs describe two TDX nodes, only one with the Proof-of-Cloud seal at the snapshot.
- The protocol disclaimer calls the software experimental and gives no security/reliability warranty.
- The repository contains an AI-generated Pashov-style review for v0.2.2 and a team response. It
  contains a Halborn scope but no Halborn findings/report file.
- Default-branch source contains unreleased hardening: it rejects public handles presented through
  private-input proof validation and rejects signed `createdAt` values later than `block.timestamp`.
  The npm 0.2.4/live v0.2.3 validator lacks those checks while still requiring a valid Gateway
  signature. This is a deployment-hardening distinction, not evidence that arbitrary users can forge
  proofs.

These facts do not prevent a testnet hackathon demo. They do prevent an honest production-security or
“fully audited” claim.

### 12. Documentation contains implementation-dangerous contradictions

Verified contradictions include:

- Ethereum Sepolia described as both supported and upcoming; beta.13 source proves support.
- Solidity 0.8.27/0.8.29 examples versus the imported library's required 0.8.35.
- Broad type claims/examples versus the five-type runtime guard.
- Two incompatible handle layouts.
- “Only Runner sees plaintext” versus the documented Gateway input/public-decryption path.
- Claims that viewers can be revoked versus deployed source with no removal method.
- Ambiguous public-decryption versus public-handle compute rights.
- Async architecture without a complete readiness/polling guide.
- “Production-ready” language beside single KMS/Runner and uncertified S3 disclosures.
- Hello World wrapping subtraction that can underflow.

The resolved matrix is maintained in [Known contradictions](../wiki/nox-known-contradictions.md).

## Inferences

- The deeper source audit **strengthens QuietRound's feasibility**: the live chain has resolved the
  same Add/comparison/Select class of operation, and the official POCs show both direct encrypted
  submission and proof-finalization UX.
- QuietRound should use `euint256` for each encrypted rubric score and every total because Nox has no
  encrypted width conversion. A separate `euint16` winner index is viable because it is selected only
  against other `euint16` values.
- Reviewer score ingestion should be a direct function on the strategy/decision contract, with public
  replay guards. It should not be routed through `Allo.allocate()` before `fromExternal`.
- The organizer should never receive viewer/admin access to individual scores. Only the stored winner
  index should be made publicly decryptable.
- The round lifecycle should be contract-owned and reloadable:
  open → close submitted → computing → proof available → payout pending → distributed. The frontend
  must wait for a successful distribution receipt.
- The Nox subgraph/Nexus should be optional evidence, not a product-state dependency. QuietRound needs
  its own `ScoreSubmitted`, `RoundClosed`, and `AwardDistributed` events.
- Default-branch source is useful for anticipating upgrades but actively dangerous as a current API
  reference. Implementation and CI should be pinned to the npm gitHeads recorded above.
- Concept confidence is higher, but implementation status remains **conditional** until the exact
  wallet-input → encrypted aggregate → async public proof → stable Allo payout path runs end to end.

## Unknowns And Questions

- What practical p50/p95 result latency should be expected for QuietRound's exact close transaction
  under hackathon/judging load? The observed 12 seconds is one sample, not an SLA.
- What is the preferred sponsor-supported long-poll/backoff policy after SDK beta.13 exhausts its own
  short retry schedule?
- Can the Solidity 0.8.35 direct `IStrategy` implementation create/register a stable Allo v2 pool and
  complete a proof-gated native-token payout without inheriting the 0.8.19 base graph?
- How does the operator stack clean up or reconcile already-produced ciphertext after an optimistic
  chain event is removed by a reorganization?
- Is there a transaction-specific attestation path that proves which Runner processed one
  QuietRound close transaction? The inspected portal verifies fleet instances, not that binding.
- Will iExec explicitly confirm the QuietRound/Allo integration as eligible and distinct, and what is
  the exact August 1 submission cutoff time/timezone?
- Is a complete Halborn report available outside the public repository?

## Not Included

- QuietRound contracts, frontend, tests, deployment, Allo pool creation, or proof-gated payout.
- A claim that the current testnet protocol is production-secure or independently fully audited.
- Copying or modifying Nox operator infrastructure.
- Claims about private/unindexed competing hackathon submissions.
- Sponsor approval, deadline confirmation, or implementation verification that has not occurred.
