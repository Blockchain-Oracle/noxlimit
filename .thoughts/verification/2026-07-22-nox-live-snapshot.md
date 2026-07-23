# Nox Ethereum Sepolia live verification snapshot

Verified: `2026-07-22T22:57:00Z` at block `11,329,751` unless otherwise stated.

## Chain state

| Check | Result |
|---|---|
| Proxy bytecode | Present at `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF` |
| EIP-1967 implementation | `0xc9B5D2e99e45dc652b3B90bA5FA79667ACFEb819` |
| Initializable storage version | `3` |
| `proofExpirationDuration()` | `3600` |
| `gateway()` | `0xE13191F53671957C8a48A7A3Ff15E16450a1552F` |
| `kmsPublicKey()` | `0x0312e1b0794046ef04bfae49938c1293fabbd6614c04862a4059d5e8a0911635c2` |

The implementation and proxy addresses match the release/deployment manifests. The repository labels
Ethereum Sepolia as v0.2.3. A directory comparison of release v0.2.3 and v0.2.4 found no changed
contract source files; v0.2.4 changes are tooling/deployment artifacts.

The live proxy does not expose `main`-only `persistTransientHandle`. Its initializer version 3 also
confirms that default-branch reinitializer 4 has not run.

## Package state

Registry reads returned:

| Package | Version | npm gitHead |
|---|---|---|
| `@iexec-nox/nox-protocol-contracts` | `0.2.4` | `1a2ebd45e4af91797397961bcb0046fe1e5c1d03` |
| `@iexec-nox/handle` | `0.1.0-beta.13` | `e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0` |
| `@iexec-nox/nox-hardhat-plugin` | `0.1.0` | `080264eb8066f0bebdaa9bc882acf12e48c6ec31` |

These exact commits are recorded in the
[release-pin source manifest](../sources/source-manifest.md#release-pinned-implementation-sources).
The local mirrors used during the audit are intentionally excluded from Git.

## Live operation-chain evidence

The public Hasura endpoint encoded by Nox Nexus was queried for Ethereum Sepolia transaction
[`0x401c94…53ef`](https://sepolia.etherscan.io/tx/0x401c94b8102df5056f8ce5f0a05a15771276f6a9e527ac9b0e214007fb1953ef).

- Transaction receipt status: success.
- Receipt logs: 47.
- Indexed handles: 25.
- Operators: 2 Add, 1 Ge, 5 Select, 2 Div, 2 Mul, 2 Sub, 9 Transfer, and 2 source handles.
- Block timestamp: `2026-07-22T19:06:48Z`.
- Computed-result timestamp: `2026-07-22T19:07:00Z`.

This is direct evidence that an ordered Add/comparison/Select computation graph resolved on Ethereum
Sepolia. The 12-second interval is one observed transaction, not an SLA.

## Reproduction notes

The proxy implementation was read from EIP-1967 slot:

```text
0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
```

Initializer version was read from the OpenZeppelin Initializable storage slot:

```text
0xf0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00
```

RPC endpoint used: `https://ethereum-sepolia-rpc.publicnode.com`.

Nox Nexus Hasura endpoint used:
`https://hasura-testnets.aks-infra-cluster.iex.ec/v1/graphql`.

The Hasura URL and query fields are source-controlled in
[`nox-nexus/src/lib`](https://github.com/iExec-Nox/nox-nexus/tree/936c850886cdc0623c6722b13a63dde6880cab5a/src/lib).

## Scope limits

- This verifies availability and selected state, not absence of vulnerabilities.
- The live operation is not a QuietRound or Allo transaction.
- Gateway/subgraph responsiveness at audit time is not a future availability guarantee.
- No complete QuietRound input-to-Allo-payout implementation exists yet.
