# Nox product and use-case map

Last verified: **2026-07-23**

This page records what the current Nox documentation actually presents as buildable, how much
implementation evidence exists for each example, and which current runtime primitives can support
it. It corrects an important corpus-ingestion failure: the generated `llms-full.txt` drops the
Vue-rendered cards and category grid from the Use Cases page.

## Documentation trap

The downloaded `llms-full.txt` contains the headings “Demos & reference projects” and “What you can
build with Nox,” but no content beneath them. The current documentation source contains five product
cards and ten category labels in that exact gap.

Therefore:

- use `llms-full.txt` to search and read prose pages;
- use the cloned documentation source for Vue components, cards, grids, tabs, and other rendered
  content;
- do not infer that an empty generated section is an empty source page.

Primary source:
[`use-cases.md`](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases.md#L17-L114).
The dated local `llms-full.txt` capture and its checksum are recorded in the
[source manifest](../sources/source-manifest.md#documentation-captures).

## Complete official category catalog

The source explicitly names ten application areas:

1. Payments & Payroll
2. DeFi & Lending
3. Vaults & Yields
4. OTC & Trading
5. Prediction Markets
6. RWA & Real Estate
7. Fundraising / VC
8. Identity
9. NFT
10. Invoicing

The [Welcome page](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/welcome.md)
adds specific examples: hidden collateral ratios, private yield strategies, private investor
allocations, payments with hidden amounts, confidential tokenized equity, borrowing, and selective
audit access.

These labels are sponsor-endorsed opportunity areas. They are not evidence that every area has a
finished template, live product, or currently supported arbitrary-data operation.

## Evidence maturity

### Shipping demos and source-linked references

| Official reference | Evidence | What is reusable |
|---|---|---|
| Confidential Tokens / cToken | Public demo plus source-linked implementation | ERC-20 wrapping, ERC-7984 balances and transfers, unwrap proof flow, selective disclosure, activity UI, delegated-view UI |
| Confidential Vault: Encrypted Positions | Public demo plus source in `nox-product-poc` | ERC-7540-shaped asynchronous vault, ERC-7984 positions, request/claim UI, backend validation, encrypted balance patterns |

Sources:
[cToken demo guide](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/guides/build-confidential-tokens/demo.md),
[cVault page](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases/confidential-vault.md),
and [`nox-product-poc`](https://github.com/iExec-Nox/nox-product-poc/tree/3dd5d49a78d3fcda8879307e9e132ebe12502c71).

The cVault reference is not a ready production yield protocol. Its deposits and withdrawals depend
on backend validation, yield can be injected directly into encrypted balances, and the backend
returns a hard-coded `0.05` “simulated target APY.” The creator UI's initial-viewer controls are also
not wired to contract ACLs. It is valuable implementation evidence, but any hackathon product must
replace simulated/admin yield with a real economic action before claiming a real yield path.

### Executable building blocks

| Building block | Evidence level |
|---|---|
| Confidential Piggy Bank | Complete tutorial contract and live documentation widget; educational reference, not a product |
| Native ERC-7984 token | Complete library recipe for mint, burn, transfer, operators, callbacks, and ACL behavior |
| ERC-20 ↔ ERC-7984 wrapper | Complete public-wrap and proof-finalized unwrap reference |
| cToken-to-cToken swap | Complete 1:1 example using ERC-7984 transfer/callback mechanics; not a general AMM |
| Hardhat integration | Shipping Hardhat 3 plugin that starts the local Nox services in Docker |

Sources:
[Hello World](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/hello-world.md),
[ERC-7984 guide](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/guides/build-confidential-tokens/erc7984-token.md),
[wrapper guide](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/guides/build-confidential-tokens/erc20-to-erc7984-wrapper.md),
and [Hardhat guide](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/guides/build-confidential-smart-contracts/hardhat.md).

The callback surface has a material current limitation. `IERC7984Receiver` says the receiver can use
the transferred amount through ACL access. The optimized ERC-7984 implementation grants the
receiver access to its new balance handle, but not to the separate `transferred` amount handle
passed into the callback. The standard ERC-20 wrapper selects this optimized implementation; the
raw wrapper explicitly grants that amount. A receiver on the shared optimized cUSDC therefore
cannot safely compare or subtract the callback amount unless it already has another valid
permission route.

### Detailed product concepts without linked implementation

| Official concept | Documented thesis | Current evidence |
|---|---|---|
| Confidential Vault: Encrypted Strategy | Submit encrypted allocation weights, rebalance triggers, and per-vault intents; publish aggregate orders and performance | Detailed concept page; no demo or source link |
| DeFi Capital Allocator | Deploy treasury capital across lending, liquidity, and derivatives without broadcasting position size | Detailed concept page; no demo or source link |
| RWA Issuance & Distribution | Combine ERC-7540, ERC-3643, ERC-7984, and Nox for private allocations and distributions | Detailed concept page; no demo or source link |

Sources:
[encrypted strategy](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases/confidential-vault-encrypted-strategy.md),
[capital allocator](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases/defi-allocator.md),
and [RWA](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/getting-started/use-cases/rwa.md).

Prediction markets, Identity, NFT, Fundraising/VC, and Invoicing currently appear as category labels
rather than dedicated implementation guides.

## Current primitives versus product space

Current private input types are `bool`, `uint16`, `uint256`, `int16`, and `int256`. Current Runner
operations include wrapping, arithmetic, safe arithmetic, comparisons, conditional selection,
transfer, mint, and burn.

That is a small primitive set, not a small product set:

| Product shape | Current composable mechanism | Boundary |
|---|---|---|
| Payment or invoice | encrypted amount, transfer, equality/comparison, safe subtraction, minimal paid/remaining reveal | parties and timing remain public; off-chain invoice text is not a supported encrypted runtime value |
| Lending | encrypted collateral/debt balances, multiplication/division, health comparison, conditional state updates | `borrow` and `repay` custom primitives are not shipping; oracle, liquidity, and liquidation still need application logic |
| Vault or allocator | encrypted deposits/positions/weights, arithmetic, comparisons, selection, ERC-7984 transfer | a private per-vault strategy can still leak through its public downstream trades without real aggregation |
| Prediction market | encrypted wagers and pools, arithmetic, comparison, proportional payout | a generic native binary pari-mutuel market already collides with DarkOdds |
| Numeric eligibility or identity claim | encrypted attribute, threshold comparison, minimal boolean reveal | Nox does not verify the truth or issuer provenance of the input |
| NFT product | encrypted numeric trait, price, key fragment, or entitlement | arbitrary strings, metadata, files, and addresses are not current runtime types; public EVM metadata still leaks |

The [Solidity library reference](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/references/solidity-library.md)
marks optimized custom functions such as `swap`, `borrow`, and `repay` as “Coming Soon.” General
encrypted strings, addresses, bytes, NFT metadata, arbitrary developer functions, and a
permissionless custom-primitive marketplace belong to the future surface, not the current
hackathon API.

## Product-research rules

1. Use the ten categories to widen discovery; do not treat them as mandatory suggestions.
2. A category label proves Nox relevance, not user demand, novelty, or feasibility.
3. A concept page proves sponsor interest, not working boilerplate.
4. A source-linked POC proves patterns, not a complete no-mock economic loop.
5. Numeric primitives can compose into real finance and market products; test the exact operation
   graph instead of dismissing the category as “numeric only.”
6. Do not claim arbitrary TEE code, custom operators, general confidential metadata, revocable ACLs,
   or future distributed infrastructure.
7. Run collision research independently. The official Prediction Markets label does not erase the
   previous native DarkOdds winner, and official lending/NFT labels do not make those lanes empty.

## Documentation contradictions added by this audit

- The Encrypted Strategy page promises “revocable” auditor access, while current viewer grants have
  no revocation function. A new handle can exclude a viewer going forward, but the old handle remains
  decryptable by that viewer.
- The cToken use-case card says Arbitrum Sepolia, while the detailed demo page says Ethereum Sepolia.
- The cToken pages link `iExec-Nox/demo-ctoken`, which is not a public repository; the current
  source lives under `iExec-Nox/nox-product-poc/demo-ctoken`.
- The receiver interface says callback amounts are accessible to the recipient, but the optimized
  transfer path used by the standard wrapper does not grant the returned `transferred` handle to
  that recipient. Only the raw path does so explicitly.
- The cVault page implies a working yield and selective-disclosure product, while the source exposes
  a simulated 5% APY and an unwired viewer-configuration UI.
- The Encrypted Strategy page says rebalancing timing never appears on-chain, but Nox does not hide
  transaction timing, target contracts, or callers.
- The public type unions are broader than the five values accepted by the current end-to-end
  runtime.
- The vision describes custom primitives, multiple Runners, distributed KMS, omnichain execution,
  and additional cryptographic backends that are not current deployable features.

See [Known contradictions](./nox-known-contradictions.md) for the build-time resolution of each
conflict.
