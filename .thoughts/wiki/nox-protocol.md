# Nox protocol reality

Last verified: **2026-07-22**

Nox is an event-driven confidential-computation protocol. Smart contracts hold 32-byte handles and
emit operations; off-chain services later resolve those operations inside Intel TDX and store
encrypted outputs. It provides confidentiality for selected values, not anonymity and not FHE.

## End-to-end data flow

1. The Handle SDK sends the input plaintext, type, wallet owner, and application-contract address
   to the Handle Gateway over the documented attested HTTPS path.
2. The Gateway TEE encrypts the value with the KMS public key, stores ciphertext in AWS S3, and
   returns a handle plus a 137-byte EIP-712 proof.
3. The user calls the target application with that handle/proof. `Nox.fromExternal` asks NoxCompute
   to verify chain, type, expiry, application, owner, and gateway signature.
4. NoxCompute emits one or more operation events and returns deterministic output identifiers. The
   transaction completes before the output ciphertext exists.
5. Ingestor groups every Nox event from that transaction and publishes the ordered group to NATS.
6. Runner decrypts operands inside TDX, executes the group in log order, re-encrypts results, stores
   them through the Gateway, and acknowledges the message.
7. An authorized user calls private `decrypt`, or anyone calls `publicDecrypt` after the application
   irreversibly marks a handle publicly decryptable.

The [architecture source](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/global-architecture-overview.md#L78-L136)
documents this three-phase input/compute/output sequence. The key implementation consequence is that
an application transaction can succeed while its result remains unresolved.

## Trust boundary

- The user's browser sees the original plaintext.
- The Gateway TEE receives input plaintext before encrypting it. Encryption does **not** happen in
  browser JavaScript.
- Runner TDX memory sees operand/result plaintext during computation.
- The current KMS is a single node holding the complete protocol private key; threshold KMS is a
  planned architecture.
- The current production-shaped testnet uses one Runner, so work is sequential at that layer.
- Ciphertext is stored in an AWS S3 setup that the docs explicitly say lacks finance-grade
  certifications.
- Nox's chain-of-trust portal verifies visible CVM measurements/manifests, but the inspected code does
  not bind a particular application transaction to one particular attested Runner.

Product language should say “computed confidentially inside an attested TEE.” Do not say “nobody
ever sees plaintext,” “FHE,” “anonymous,” or “fully trustless.” Addresses, method calls, timing, and
application metadata remain public.

Sources: [Gateway](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/handle-gateway.md),
[Runner](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/runner.md),
[KMS](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/kms.md),
[input guide](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/guides/accept-user-inputs.md#L67-L76).

## Implemented handle format

The release-source layout is:

| Bytes | Meaning |
|---|---|
| `0` | version |
| `1–4` | 32-bit chain ID |
| `5` | TEE type code |
| `6` | attributes; bit 0 marks a unique/confidential handle |
| `7–31` | truncated pre-handle hash |

Public handles have bit 0 clear and bypass ACL checks because their plaintext is derivable. Unique
handles have bit 0 set. Output generation hashes operator, operands, NoxCompute address, uniqueness
seed, and output index. Operations involving at least one unique operand reuse seed zero and are
deterministic for that exact tuple; all-public operations increment a counter to ensure unique
outputs. Gateway-created user-input handles are not governed by this on-chain derivation.

Use the SDK helpers and Solidity types; treat handles as opaque in application code. Several docs
pages describe a different layout, so handwritten parsing is unnecessary risk.

Source: [`HandleUtils.sol`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/utils/HandleUtils.sol#L6-L46)
and [`Compute.sol`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/modules/Compute.sol#L578-L637).

## Runtime-supported types

Only these five types are currently supported end to end:

- `bool`
- `uint16`
- `uint256`
- `int16`
- `int256`

The enums and TypeScript unions list many future types; `encryptInput` deliberately rejects them.
Arithmetic and comparisons operate only on the four integer types. Custom/arbitrary TEE functions
are not available.

Sources: [`TypeUtils.sol`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/utils/TypeUtils.sol#L119-L163)
and [`encryptInput.ts`](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/methods/encryptInput.ts#L36-L55).

## Input-proof binding

The gateway proof covers `handle`, `owner`, `app`, and `createdAt`. The current on-chain TTL is
3,600 seconds. `Nox.fromExternal` passes its application function's current `msg.sender` as the
expected owner, while NoxCompute requires the signed `app` to equal the application contract that
called NoxCompute.

Therefore the normal valid route is:

`wallet → application function → Nox.fromExternal`

Routing the call through Allo or another contract changes the application's `msg.sender` and causes
the owner check to fail. For composition, validate once in the direct entry contract, grant the
downstream contract transient access, and pass the typed validated handle—not the external proof.

Proof validation itself has no consumed nonce. Replaying a proof can repeat the application's state
mutation within the proof window. Every application must implement its own submission/replay guard.

Sources: [`Nox.fromExternal`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/sdk/Nox.sol#L155-L198),
[`Compute.validateInputProof`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/modules/Compute.sol#L53-L94),
and the [direct-caller guide](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/references/solidity-library/methods/core-primitives/fromExternal.md#L49-L81).

## ACL model

| Permission | Compute | Private decrypt | Delegate | Duration |
|---|---:|---:|---:|---|
| persistent admin (`allow`) | yes | yes | yes | permanent in the deployed version |
| transient admin (`allowTransient`) | yes, same transaction | operationally unusable after tx | yes, during tx | current transaction |
| viewer (`addViewer`) | no | yes | no | permanent |
| publicly decryptable flag | no additional compute right for a unique handle | anyone through public endpoint | no | irreversible |
| public/non-unique handle | everyone | everyone | not applicable | inherent |

New computation results initially grant only transient access to the calling application. Any result
stored across transactions needs `Nox.allowThis(result)` before the transaction ends.

In the deployed version, transient access is intentionally the same trust level as persistent access:
a transient holder can add admins/viewers or make the value public. Admin, viewer, and public grants
have no normal revocation path. Do not grant individual-score access to organizers or helpers.

Source: [`ACL.sol`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/modules/ACL.sol)
and the [audit response](https://github.com/iExec-Nox/nox-protocol-contracts/blob/688c965dff38c1b86a1cf49ebc1263873b9d9645/audits/pashov-ai/response.md#L10-L54).

## Public proof model

`publicDecrypt(handle)` first checks the public flag through NoxCompute, then calls the Gateway. The
returned proof is `65-byte gateway signature || encoded plaintext`. On-chain
`Nox.publicDecrypt(storedHandle, proof)` checks the Gateway signature over handle + plaintext hash
and validates the typed result length.

The on-chain proof verifier itself does not check the public flag, caller, application, round, expiry,
or nonce. Those constraints belong in application state. A finalizer must always use the handle
already stored for the round, enforce the round phase, and make distribution one-shot.

Source: [`publicDecrypt.ts`](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/methods/publicDecrypt.ts#L25-L126)
and [`Nox.publicDecrypt`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/sdk/Nox.sol#L1184-L1260).

## Operational behavior

- Ingestor begins from the latest observed blocks without a confirmation-depth buffer and groups all
  logs from a transaction.
- Runner executes the transaction group in log order, so a single transaction can chain intermediate
  `Add`, comparison, and `Select` outputs.
- Failed Runner messages remain unacknowledged and can be redelivered; its documented default maximum
  delivery count is ten.
- Handle SDK beta.13 makes four public-proof attempts total with 1/2/4-second waits, then exports a
  `NotYetComputedHandleError`. The application needs longer durable polling/retry UX.
- Nox Nexus and the subgraph are good diagnostics. Product state must come from the application's
  contract events and storage.

On 2026-07-22, public Nox observer data showed Ethereum Sepolia transaction
[`0x401c…53ef`](https://sepolia.etherscan.io/tx/0x401c94b8102df5056f8ce5f0a05a15771276f6a9e527ac9b0e214007fb1953ef)
executing `Add`, `Ge`, and multiple `Select` operations, with its results stored about 12 seconds after
the block timestamp. This is direct evidence for QuietRound's aggregate/compare/select computation
shape, not a general latency guarantee.
