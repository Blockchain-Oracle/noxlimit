# Prompt 3 Gate B Evidence

This disposable fixture verifies only the local Conditional Tokens + Fixed Product Market Maker
lifecycle. It does not claim Gate A, Gate C, or a Sepolia deployment.

## Toolchain and exact dependencies

- Node.js `v22.22.3`
- pnpm `10.33.4`
- Hardhat `3.9.0`
- `@nomicfoundation/hardhat-toolbox-viem` `5.0.7`
- `@nomicfoundation/hardhat-node-test-runner` `3.0.17`
- Viem `2.48.1`
- solc `0.5.17`, EVM target `istanbul`
- `@gnosis.pm/conditional-tokens-contracts` `1.0.3`
- `@gnosis.pm/conditional-tokens-market-makers` `1.8.1`
- `@gnosis.pm/util-contracts` `3.0.0-alpha.3`
- `openzeppelin-solidity` `2.3.0`

The exact resolved dependency graph is in `pnpm-lock.yaml`. The two substrate package integrity
records are:

```text
@gnosis.pm/conditional-tokens-contracts@1.0.3
sha512-tsGh+tiCb06UCUg3F8N5Gpo/MTsdMLQ7Wbu2AiWGaj9bga9rWgnu2/QVtLY3hneFdrSAjzlu/eFmhQt+5b7kSA==

@gnosis.pm/conditional-tokens-market-makers@1.8.1
sha512-PJdFbqjlXz29JdxDNKcrdMMfGnZLLepvI0yyhRX2A1jwgYgNa8vwT2yixiHH2Oeyu5gza1KAxpoLw9r9yDCqrg==
```

## Source provenance

The installed npm contract trees are byte-for-byte identical to the repository's pinned mirrors:

```text
conditional-tokens-contracts commit eeefca66eb46c800a9aaab88db2064a99026fde5
conditional-tokens-market-makers commit 6814c0247c745680bb13298d4f0dd7f5b574d0db
```

Critical-file SHA-256 values:

```text
89f8ca9fd646044e22036c96fe04f7c5e78b7c4a628aa0bbf2abccacfcc84a08  ConditionalTokens.sol
3508b664e523c3f72d04678666c36b1b2f760b0852bf79a963a7686174e51815  CTHelpers.sol
f5de8a1ae2bb8d4ea2abb8cf932a7ebd05054349dbbf4c29c45198626ca31071  FixedProductMarketMaker.sol
6ae3a6505901f2df0adc346907d465e165e6d655eafdcb1321ca5423f5996bd6  FixedProductMarketMakerFactory.sol
```

Verification command and exact output:

```console
$ diff -qr node_modules/@gnosis.pm/conditional-tokens-contracts/contracts ../../.thoughts/raw/noxlimit-substrates/conditional-tokens-contracts/contracts
$ diff -qr node_modules/@gnosis.pm/conditional-tokens-market-makers/contracts ../../.thoughts/raw/noxlimit-substrates/conditional-tokens-market-makers/contracts
```

Both commands exited `0` with no output.

Hardhat compiled the npm dependency graph but did not emit a deployable artifact for an imported
contract name. The first attempt failed with:

```text
HardhatError: HHE1000: Artifact for contract "ConditionalTokens" not found.
```

`contracts/GateBTestContracts.sol` therefore declares no-override local subclasses solely to emit
Hardhat artifacts. The factory subclass still runs the imported factory constructor, which deploys
the imported `FixedProductMarketMaker` implementation master and creates its clone. The local
market subclass is used only for the inherited ABI at the clone address. No third-party source is
copied or modified.

## TDD transcript

Every test invocation used:

```console
$ env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm test
```

Initial RED, before the fixture existed:

```text
0 passing (20ms)
1 failing
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../helpers/market-fixture.js'
```

Factory/split/seed GREEN:

```text
1 passing (913ms)
```

Atomic-buy RED, before trader funding support:

```text
1 passing (919ms)
1 failing
TypeError: fixture.fundTrader is not a function
```

Atomic-buy GREEN:

```text
2 passing (906ms)
```

Resolution/redemption RED, before the buy setup helper:

```text
2 passing (1019ms)
1 failing
TypeError: fixture.buyForTrader is not a function
```

Final clean GREEN after the independent quote and price-bound additions:

```text
No contracts to compile

Running node:test tests

  Gate B real Conditional Tokens + FPMM lifecycle
    ✔ creates a factory clone and seeds both binary outcome pools after a real split
    ✔ rejects an excessive minOut and delivers the quoted ERC-1155 outcome on an exact-minimum buy
    ✔ resolves the condition and redeems the winning position back to collateral
    ✔ enforces an entered private max price against a real asymmetrically skewed pool

  private max-price to minOut conversion
    ✔ rounds upward at exact and non-exact boundaries without floating point
    ✔ uses the same unit-safe formula for 6- and 18-decimal collateral amounts
    ✔ handles tiny and uint256-boundary values and rejects invalid outputs
    ✔ guarantees every accepted fill has a fee-inclusive gross price within the cap

  8 passing
```

## Reproduction

From this directory:

```bash
env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm install --frozen-lockfile
env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm hardhat clean
env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm compile
env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm exec tsc --noEmit
env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm test
env PATH=/Users/abu/.nvm/versions/node/v22.22.3/bin:$PATH pnpm verify:provenance
```

Clean compilation output ended with:

```text
Compiled 1 Solidity file with solc 0.5.17 (evm target: istanbul)
```

TypeScript exited `0` with no output. The final test command exited `0` with all eight tests
above, and the automated provenance command exited `0` with no diff.

## Behaviors proven locally

1. A real binary condition is prepared and a real split mints both ERC-1155 positions.
2. The released factory deploys an implementation master and creates a distinct FPMM clone.
3. Initial FPMM funding pulls collateral, splits it, seeds both outcome pools, and mints LP shares.
4. `calcBuyAmount` produces the fixed-input quote.
5. `buy` with `minOut = quote + 1` reverts with `minimum buy amount not reached` and leaves both
   collateral and outcome balances unchanged.
6. `buy` with `minOut = quote` succeeds, emits `FPMMBuy`, and delivers the exact quoted ERC-1155
   outcome balance to the trader.
7. The designated oracle reports `[0, 1]`; the trader redeems the winning position, receives the
   exact collateral payout, and the redeemed ERC-1155 balance is burned to zero.
8. Factory event fields and clone getters bind creator, Conditional Tokens, collateral, the sole
   condition, and the `0.3%` fee to the expected deployment.
9. An independent binary reserve/fee implementation reproduces the FPMM quote exactly; post-buy
   reserve deltas and the worsened next quote match the expected state transition.
10. The BigInt-only max-price helper computes
    `ceilDiv(grossAmountIn * 1e18, maximumAveragePriceWad)`, handles 6- and 18-decimal units, exact
    boundaries, tiny values, and uint256 extremes, and rejects invalid/out-of-range outputs.
11. Property vectors prove that every fill at or above the derived `minOut` has a fee-inclusive
    gross average price no worse than the user's cap.
12. A real 90-collateral same-side buy skews the pool beyond a 3:1 reserve ratio. Against that
    asymmetric state, the entered price cap derives a `minOut` accepted by the real FPMM and the
    resulting gross average price respects the cap; a one-step tighter cap derives a bound above
    the real quote and reverts without moving collateral or shares.

The payout remains manually selected local lifecycle evidence. It is not described as objective
BTC resolution.
