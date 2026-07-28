# Nox developer stack

Last verified: **2026-07-28**

> **Current use:** NoxLimit Prompt 3 is `GO`; the bounded recovered live Sepolia trace passed. The active
> route is the user's polished-build checkpoint.
> QuietRound references below are historical examples,
> not product routing. Current authority is [`../decisions/CURRENT.md`](../decisions/CURRENT.md) and
> the accepted technical contract is
> [`../architecture/2026-07-25-noxlimit-system-architecture.md`](../architecture/2026-07-25-noxlimit-system-architecture.md).

## Exact package pins

Use exact versions for the hackathon build:

```json
{
  "@iexec-nox/nox-protocol-contracts": "0.2.4",
  "@iexec-nox/handle": "0.1.0-beta.13",
  "@iexec-nox/nox-hardhat-plugin": "0.1.0"
}
```

Do not use caret ranges while the protocol and beta SDK are changing. The npm payload commit IDs
are:

| Package | npm gitHead |
|---|---|
| contracts `0.2.4` | `1a2ebd45e4af91797397961bcb0046fe1e5c1d03` |
| Handle SDK `0.1.0-beta.13` | `e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0` |
| Hardhat plugin `0.1.0` | `080264eb8066f0bebdaa9bc882acf12e48c6ec31` |

Recreate the exact release snapshots from the
[release-pin source manifest](../sources/source-manifest.md#release-pinned-implementation-sources).

## Why `main` is not the installable API

The default-branch clones retain the released version number in `package.json` while containing
unreleased commits:

| Repository | Snapshot vs published tag |
|---|---|
| protocol contracts | 29 commits ahead of v0.2.4 |
| Handle SDK | 5 commits ahead of beta.13 |
| Hardhat plugin | 2 commits ahead of 0.1.0 |

Contract `main` introduces `toTransientE*`, `persistTransientHandle`, and reinitializer version 4.
The live Ethereum Sepolia implementation does not expose that ABI. The released `0.2.4` library
uses the compatible `toE*` and `Nox.allowThis` model. Use `main` to anticipate change—not as code to
copy into the current build.

## Live Ethereum Sepolia state

RPC reads at block **11,329,751** (`2026-07-22T22:57:00Z`) established:

| Field | Value |
|---|---|
| chain ID | `11155111` |
| NoxCompute proxy | `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF` |
| EIP-1967 implementation | `0xc9B5D2e99e45dc652b3B90bA5FA79667ACFEb819` |
| initializer version | `3` |
| repository deployment label | `v0.2.3` |
| input-proof TTL | `3600` seconds |
| Gateway signer | `0xE13191F53671957C8a48A7A3Ff15E16450a1552F` |
| KMS compressed public key | `0x0312e1b0794046ef04bfae49938c1293fabbd6614c04862a4059d5e8a0911635c2` |
| Handle Gateway | `https://gateway-testnets.noxprotocol.dev` |
| Ethereum Sepolia subgraph | `https://thegraph.ethereum-sepolia-testnet.noxprotocol.io/api/subgraphs/id/9CsccKwvgYFo72zZeU4k4wj2NEBLdWhVE3EUandgmzgo` |

The repository's v0.2.3 and v0.2.4 contract source trees are identical; v0.2.4 changed upgrade and
deployment tooling. Therefore installing the v0.2.4 Solidity library is compatible with the live
v0.2.3 ABI, but the version distinction must remain explicit.

Sources: [v0.2.3 deployment manifest](https://github.com/iExec-Nox/nox-protocol-contracts/blob/6a4610b730aa42540fba20a92920fc10d6b9957c/ignition/deployments/sepolia/deployed_addresses.json),
[deployment scope](https://github.com/iExec-Nox/nox-protocol-contracts/blob/688c965dff38c1b86a1cf49ebc1263873b9d9645/audits/halborn/scope.md#L43-L46),
and [beta.13 network config](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/config/networks.ts#L8-L21).

## Supported networks

The published Handle SDK beta.13 auto-resolves both:

| Network | Chain ID | NoxCompute |
|---|---:|---|
| Ethereum Sepolia | `11155111` | `0x24Ef…77bF` |
| Arbitrum Sepolia | `421614` | `0xd464…c229` |

The docs warning that Ethereum Sepolia support is “upcoming” is stale. NoxLimit uses Ethereum
Sepolia because the hackathon requires it and the published SDK already contains its full
Gateway/contract/subgraph configuration.

## Local testing baseline

- Node.js 22 or 24.
- Docker running.
- Hardhat 3 with either the Viem toolbox or Hardhat Ethers plugin.
- Solidity `0.8.35`.
- Solidity `0.5.17` in a separate compiler profile for the unchanged Gnosis contracts whose pragma
  is `^0.5.1`; the published `solc@0.5.1` payload omits `smtchecker.js` and is not a usable CLI.
- Local EDR network with `chainType: "op"`.
- The first Nox test run pulls KMS, Gateway, Ingestor, Runner, NATS, and S3 images.
- The released plugin pins its Nox service images to `0.6.0`.
- Pin `@nomicfoundation/hardhat-node-test-runner >= 3.0.14`; the official example uses `3.0.17` to
  avoid a known hang.

At Prompt 3 activation, Node `22.22.3` and the Docker CLI were installed while OrbStack was not yet
available. OrbStack was subsequently started; `docker info`, the released plugin stack, clean
compilation, and all 16 Nox/adapter tests pass. Gate B remains independently reproducible without
Docker and passes all 8 market/math tests.

The released plugin README says Solidity `0.8.29`; that cannot compile `Nox.sol`, whose pragma is
`^0.8.35`. Its own example and the current docs correctly use `0.8.35`.

Sources: [released plugin README](https://github.com/iExec-Nox/nox-hardhat-plugin/blob/080264eb8066f0bebdaa9bc882acf12e48c6ec31/packages/plugin/README.md#L14-L32),
[released example config](https://github.com/iExec-Nox/nox-hardhat-plugin/blob/080264eb8066f0bebdaa9bc882acf12e48c6ec31/packages/example-project/hardhat.config.ts),
and [plugin package](https://github.com/iExec-Nox/nox-hardhat-plugin/blob/080264eb8066f0bebdaa9bc882acf12e48c6ec31/packages/plugin/package.json).

Foundry is not the supported E2E path yet; the official Foundry guide is only “Coming Soon.”

## Local versus live tests

Use the plugin only for local end-to-end testing on chain `31337`. The published plugin provisions
its own local stack. New “existing stack”/per-network behavior visible on `main` is unreleased.

For Ethereum Sepolia:

- configure Hardhat/Viem normally;
- construct `createViemHandleClient(walletClient)` directly;
- let beta.13 auto-resolve the Ethereum Sepolia endpoints;
- surface `NotYetComputedHandleError` as a pending state rather than a fatal failure;
- wait for and check every transaction receipt's success status.

## Minimum critical-path spike

The organization examples do not contain one test covering the entire application path. Before UI
polish, prove this sequence locally and then on Sepolia:

`encryptInput → direct fromExternal → encrypted update → allowThis → Nox.allowPublicDecryption → async resolution → publicDecrypt proof → application proof verification → one-shot external action`

For NoxLimit, the external action is one replay-safe, minimum-output-protected buy against the bound
unmodified FPMM, followed by real ERC-1155 share forwarding. This sequence now passes locally and
on Ethereum Sepolia; the final receipt is
[`0xbae857…88caa`](https://eth-sepolia.blockscout.com/tx/0xbae85703bb59878fa63838e03c1bc57cdcdc46f6e2f74ac701b38fc85d088caa).
The historical Gate A/B/C requirements remain reproducible in
[`../../prompts/03-critical-path-verification.md`](../../prompts/03-critical-path-verification.md),
and exact public evidence is in
[`../../spike/nox/evidence/sepolia-gate-c.json`](../../spike/nox/evidence/sepolia-gate-c.json).

## Audit and security state

- The repository contains a Pashov-style **AI** review of v0.2.2 plus the team's response. It is not
  proof that current deployed code has no vulnerabilities.
- The repository contains a Halborn scope document, but no Halborn findings/report artifact. Do not
  advertise a completed Halborn audit based only on this mirror.
- The team explicitly treats transient and persistent ACL authority as equal trust and accepts
  irreversible viewers/public flags by design.
- `main` includes post-release hardening checks that are not in npm 0.2.4 or the live v0.2.3 runtime.
- Specifically, `main` now rejects public handles passed through private-input proof validation and
  proofs whose `createdAt` is in the future; the released/live validator lacks those two checks while
  still requiring a valid Gateway signature. Applications should use the official SDK/Gateway path
  and must not claim those hardening changes are deployed.
- The project disclaimer calls the software experimental and disclaims security/reliability warranty.

This is acceptable for a testnet hackathon. Do not describe the submission as production-secure or
fully audited.
