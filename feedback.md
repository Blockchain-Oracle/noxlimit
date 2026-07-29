# Nox builder feedback from NoxLimit

This is feedback from building and live-testing **NoxLimit** for the iExec WTF Hackathon. It is
based on the released packages and Ethereum Sepolia behavior we actually used, not on APIs visible
only on unreleased branches.

## What we built

NoxLimit adds private resting buy limits to real onchain prediction-market pools. A trader chooses
a public market, YES/NO side, amount, expiry, and a private maximum average price. The browser sends
that maximum directly to the Nox Handle Gateway. The OrderBook persists the encrypted handle, and a
long-running worker asks Nox to compare it with a fixed-input quote from an unchanged Gnosis FPMM. An
eligible public-decryption proof authorizes one replay-protected, minimum-output-protected pool buy.
The trader can close the browser while the order rests.

Released stack used:

- `@iexec-nox/nox-protocol-contracts@0.2.4`;
- `@iexec-nox/handle@0.1.0-beta.13`;
- `@iexec-nox/nox-hardhat-plugin@0.1.0`;
- Solidity `0.8.35`, Hardhat `3.9.0`, and Ethereum Sepolia (`11155111`).

## What worked well

### Small, composable confidential primitives

`Nox.fromExternal`, comparisons, `Nox.select`, `Nox.addViewer`, and public decryption were enough to
implement a real conditional trade without changing the public market protocol. The confidential
program is intentionally small: compare a sampled quote with the encrypted limit, then select the
limit-derived minimum output or zero. That result can be carried across transactions as a handle.

### Input ownership and application binding

Binding the encrypted input to both the wallet and consuming OrderBook gives the contract a useful
security boundary. It prevented us from treating an encrypted blob as a bearer token. The direct
wallet-to-application ingestion rule also made the correct browser architecture clear once we had
identified it.

### Viewer-only decryption is a useful middle state

The worker can be granted viewer access and privately decrypt a candidate without making it public.
That enabled an honest nonzero-only publication policy: an ineligible zero does not inherently need
a public-decryption transaction, while an eligible minimum output can later be published with a
proof and consumed by the contract.

### The Handle SDK is compact

The browser and server clients expose the important operations without making applications
implement encryption or ECIES themselves. Once the versions and network configuration were pinned,
the integration surface was small enough to wrap behind typed application boundaries.

## Friction we hit

### Documentation output can omit rendered content

The generated `llms-full.txt` did not contain the Vue-rendered use-case cards and category grid that
exist in the documentation source. That matters for both humans and coding agents: a docs-first
review can still miss official product guidance. Publishing the fully rendered content in the LLM
export, or labeling omitted component sections, would make the export dependable.

### Released packages, default branches, and live contracts need a compatibility table

The default repositories contain APIs ahead of the published packages and live Sepolia ABI. We had
to pin the three released packages, inspect their exact source, and avoid attractive APIs visible on
`main`. A single per-network matrix—package versions, Solidity compiler, plugin version, deployed
contract version, Gateway, and subgraph—would prevent subtle compile-success/live-failure mistakes.

### The compiler and Hardhat requirements should be impossible to miss

The released `Nox.sol` graph requires Solidity `0.8.35`, and the released plugin is for Hardhat 3.
These constraints cascade into the rest of a workspace. A maintained starter with an exact lockfile
and a preflight error for unsupported Hardhat/Solidity versions would be more useful than partial
snippets that leave dependency resolution to each builder.

### Asynchronous readiness needs an application-level recipe

Confidential results are not necessarily ready when the transaction that creates them is mined.
The SDK's short retry window is useful, but a product worker still needs durable polling, bounded
timeouts, recovery states, and idempotent retries. We implemented these separately for private
viewer decryption and public-proof retrieval. An official long-running worker example should show
`pending`, retryable Gateway failure, publication requested, proof ready, and transaction recovery
as distinct states.

### ACL and publication are effectively irreversible product events

Granting a viewer and requesting public decryption are not temporary UI details. They affect what
can be learned later and must be represented in product state. A lifecycle-oriented ACL guide would
help: who can compute, who can privately decrypt, when a handle becomes publicly retrievable, and
which grants cannot be undone.

### Proofs still need application replay and context guards

The public proof authenticates the handle/result pair, but the application must bind that result to
the correct order, evaluation nonce, sampled quote, expiry, market close, and one-shot action. This
is reasonable, but security guidance should make it explicit so builders do not mistake proof
validity for complete business-action authorization.

### Error classes are too easy to flatten

Not-yet-computed, not-a-viewer, Gateway unavailable, invalid public proof, and a reverted onchain
action need different recovery behavior. A stable structured error taxonomy across the Handle SDK
and Gateway would reduce broad `catch` loops and make honest user-facing states easier to build.

## Suggested improvements

1. Publish one versioned Ethereum Sepolia starter containing the exact Nox packages, Hardhat,
   Solidity version, network addresses, browser encryption, contract ingestion, private viewer
   decryption, and public-proof verification.
2. Generate `llms-full.txt` from rendered documentation, including component-backed use-case pages.
3. Add an official durable-worker example with backoff, restart recovery, idempotency, and separate
   private-decrypt/publication phases.
4. Add a concise ACL matrix and a warning wherever viewer/public grants are introduced that the
   current grants are effectively irreversible.
5. Document the application-binding checklist for public proofs: app, owner, handle, action/order,
   nonce, freshness window, and one-shot consumption.
6. Standardize Gateway/SDK error codes for pending computation, ACL denial, transient service
   failure, invalid handle, and invalid proof.
7. Publish observed latency and gas distributions by primitive count and chain. Builders can then
   choose honest polling and recovery defaults without turning one successful sample into an SLA.

## Time to first confidential transaction

We did not record a trustworthy clone-to-first-transaction timer, so we will not invent one. A
separate live multi-operation Sepolia sample in our research resolved in roughly 12 seconds, but
that is one observation, not a latency guarantee. Most integration time went into reconciling the
released/live version boundary and building durable asynchronous orchestration rather than writing
the confidential comparison itself.

## Would we use Nox in production?

For a workflow that genuinely requires a contract-controlled confidential value and a verifiable
public action, yes—after production-network availability and hardening. The programming model is
small and composable, and it keeps the original threshold out of the application API while it
rests. The authorized worker can privately learn zero or the exact eligible limit-derived minimum
output, which is economically related to the threshold because the amount is public. Before
production value, we would require a supported mainnet, professional contract review, documented
service/latency behavior, operational redundancy, and a clearer version-support policy. Those are
maturity requirements, not a rejection of the model.

## Privacy boundary we would keep in the documentation

Nox provides confidential computation, not anonymity. Wallet, market, side, amount, order timing,
evaluation timing, and final trade remain public. The initial maximum enters the Nox Gateway TEE in
plaintext and remains encrypted while resting; the authorized viewer can learn the candidate. When
publication is requested successfully, the limit-derived minimum output becomes publicly
retrievable before the fill. Timing and non-action may support inference, and Gateway/Runner/KMS
trust remains part of the model.
