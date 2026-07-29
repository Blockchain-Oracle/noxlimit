# NoxLimit Phase 6 live rollout

Status: **IN PROGRESS — two market bundles are live and independently validated; the fresh user
order → Nox → FPMM → resolution → redemption proof is not complete yet.**

This file is an operational verification log, not a new architecture or decision authority.
Current product authority remains `.thoughts/decisions/CURRENT.md` and the canonical architecture.

## Verified deployment state

Ethereum Sepolia catalog revision `2` is published at
`packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h.json` with revision hash
`0x831ea1fb98bb8433af21ca54d6253b6649241c53081fe50aad983edb193e15f3`.
It hash-links revision `1`
(`0xed59599a3b777571a97733c24e793b3264f2f47cede79629640e3fc6d660c258`)
and the bootstrap catalog.

Shared product contracts:

- NoxLimit Test USDC: `0x2B0F8B156a2870E53621802A618C3d0427A163A6`
- Testnet funding treasury: `0x6b4Ce61906E7402e198Bd6D2bc73CEd24A721b78`
- Bound worker: `0x393b05351089dE5BBF6c85A21d72FC370bb19a09`

BTC/USD 4h:

- market ID: `0xb0380849b49402e9bfb22d89f9c4e7bd3fb9e096af12812aec047deebdc4d682`
- strike: `$64,000`; NoxLimit close: `2026-07-29T09:55:00Z`; resolution: `2026-07-29T10:00:00Z`
- FPMM: `0xe4F17F73A0A29BfDf66138ae43F8E2A77EeC29c3`
- OrderBook: `0x44d663aA3b613E98eBAD962e8C9BCffE8Acf4DfC`
- resolver: `0x0c208f1504cF22010e3Fa504BB680c4289dCc2B2`
- independent validation: 50,000,000 YES atoms, 50,000,000 NO atoms, 50,000,000 LP shares;
  immutable bindings and runtime hashes matched.

ETH/USD 4h:

- market ID: `0x430fec6ab7fe5cf24a07547615c11aad83bea4f4a7946ec7ad61e22b30d7a07d`
- strike: `$1,900`; NoxLimit close: `2026-07-29T09:55:00Z`; resolution: `2026-07-29T10:00:00Z`
- FPMM: `0xfB3BF7485c28aFB0beFD7Bb3cA83B53F41667F67`
- OrderBook: `0x89138173A993eaFa4d18b3E291b6DE1682d486Ac`
- resolver: `0xB42798FD7177954ca30f7eaE6FC9932069b9D66E`
- independent validation: 50,000,000 YES atoms, 50,000,000 NO atoms, 50,000,000 LP shares;
  immutable bindings and runtime hashes matched.

Canonical machine-readable deployment evidence is in:

- `.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-deployment.json`
- `.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-deployment.json`
- `.thoughts/evidence/2026-07-29-sepolia-seed-approvals.json` (supplemental receipt provenance;
  the create-only deployment evidence remains unchanged)

Both deployment journals reached `COMPLETE`. The journals are ignored operational state and are
not committed.

## Fail-closed recovery record

BTC OrderBook deployment transaction
`0x0c939de35c0f28db67c6ded2896c2ec3ce255c1c139bd05f89b913a78fd53d3e`
was mined successfully but the original RPC briefly failed to find it. The operator inspected two
independent RPCs, adopted that exact hash into attempt 1, and did not deploy a replacement.

The first two funding-treasury submission attempts failed before broadcast. Before each retry,
three RPC views, the deterministic nonce-25 contract address, pending-block contents, and an
independent explorer showed nonce 25 unused and no code. Attempt 3 used a different verified RPC
transport and confirmed as
`0x35aefe16a6a788331056a067daa7091288460ba0beb4a19c11c63f71c9dba348`.
Changing only the transport did not change the journal plan hash.

## Runtime provisioning state

- Treasury balance verified after deployment: `0.1` SepETH and `250` NLTUSDC.
- Worker was explicitly topped up once from `0.003923157828954289` SepETH to the measured `0.02`
  SepETH operating target. Evidence:
  `.thoughts/evidence/2026-07-29-sepolia-worker-provisioning.json`.
- The web production build succeeds with revision-2 API/RPC/collateral configuration and funding
  targets `0.02` SepETH / `25` NLTUSDC.
- A first service startup correctly rejected both markets as `UPCOMING`: their immutable start is
  `2026-07-29T06:00:00Z`. It did not serve a false tradeable state.
- The same startup exposed a separate coherent-snapshot defect: replay selected `head - 6`, then
  hydration sampled a newer head and transiently labeled the same safe projection lag 7. The
  bounded fix now carries one `{ headBlock, safeBlock }` snapshot through replay, hydration, and
  successful health reporting. The real max-lag policy remains 6; 65 service tests, service
  type-check, and service production build pass.

## Next required proof

1. Start exactly one service replica after the safe-block timestamp passes market start; require
   overall, evaluator, and funding health all `READY`.
2. Run the explicit signed user funding flow, then a real browser private order on each asset.
3. Close the browser and prove the hosted worker evaluates through Nox, publishes, and fills the
   unchanged FPMM atomically.
4. Close builder LP positions after NoxLimit close, resolve from the first valid post-deadline
   Chainlink observation plus adjacent predecessor, and redeem real user/LP positions.
5. Reconcile final evidence and status across the decision, plan, architecture, README, and
   handoff. Until then, Phase 6 is not marked complete.
