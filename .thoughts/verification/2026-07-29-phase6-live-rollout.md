# NoxLimit Phase 6 live rollout

Status: **PARTIAL/DEGRADED — one complete BTC user order → Nox → FPMM → objective resolution →
winning-user redemption path and builder-LP redemption are verified. ETH is terminally rejected by
its immutable one-hour observation-delay policy; no ETH write, payout, or winner exists. Public
hosting remains pending.**

This file is an operational verification log, not a new architecture or decision authority.
Current product authority remains `.thoughts/decisions/CURRENT.md` and the canonical architecture.

## Verified deployment state

Ethereum Sepolia catalog revision `2` is published at
`packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h.json` with revision hash
`0x831ea1fb98bb8433af21ca54d6253b6649241c53081fe50aad983edb193e15f3`.
It hash-links revision `1`
(`0xed59599a3b777571a97733c24e793b3264f2f47cede79629640e3fc6d660c258`)
and the bootstrap catalog.

The later paired cutover at commit `c073643` publishes current runtime revision `5` at
`packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json`, hash
`0x8aa65b0b5a91025ed1fd0e1487b9c9058b44ca05889632e9f85baf3bb3885899`.
It marks both original bundles below `RETIRED` and both verified successors `ACTIVE`. Those active
successors also use the now-known-risky immutable 3,600-second observation bound.

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

## Browser-off fills, cutover, and settlement outcome

Three create-only artifacts prove direct-Gateway creation, browser closure, real browser-off Nox-
authorized FPMM fills, and fresh-browser reconstruction on the original bundles:

- `.thoughts/evidence/2026-07-29-phase6-btc-no-order.json`
- `.thoughts/evidence/2026-07-29-phase6-btc-yes-order.json`
- `.thoughts/evidence/2026-07-29-phase6-eth-yes-order.json`

Both builder LP positions were removed after NoxLimit close before settlement. Revision `5` then
retired both original routes and activated both successors atomically.

BTC completed the real settlement path:

- browser resolution and winning-user redemption:
  `.thoughts/evidence/2026-07-29-phase6-btc-resolution-redemption.json`;
- first post-deadline round `18446744073709584255` at `1785321636`, with adjacent predecessor
  `18446744073709584254` at `1785317952`;
- resolution transaction
  `0x339f8b71459255373925cd8b566887e2f346dd8be4cf93ed2b9efbb646ebd673`;
- user redemption transaction
  `0x8cec8d8147018d5f0cc68c83feed5e8f7fbb185724d71a61802303c5076bfa93`;
- builder-LP redemption:
  `.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-liquidity-redemption.json`, transaction
  `0x706c0c6f38518a8cd536eb4b177939a642434979153f5ee9c62f105f186c3f0c`,
  receipt block `11375232`.

ETH cannot complete settlement under the deployed resolver policy:

- evidence:
  `.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-resolution-policy-rejection.json`;
- `resolvesAt = 1785319200`, immutable maximum delay `3,600`, latest accepted timestamp
  `1785322800`;
- adjacent predecessor round `18446744073709586443` at `1785319188`;
- unique first post-deadline round `18446744073709586444` at `1785322824`, a delay of 3,624 seconds
  and an excess of 24 seconds;
- the accountless selector exited before the write operator; no resolution transaction was
  attempted, resolver settlement fields remain zero, the payout denominator remains zero, and ETH
  user/LP positions remain unredeemable.

A later observation cannot repair the immutable condition because it would be even later and would
violate the first-observation adjacency rule. No ETH winner is recorded or inferred.

The implementation now enforces `maximumObservationDelaySeconds >= 14,400` for all future official
Sepolia BTC/ETH deployments. This liveness floor preserves the same unique first-observation pair;
the separate runtime quote-freshness policy remains 3,600 seconds. Existing resolver identities,
including both active revision-5 successors, cannot be edited in place.

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
- Reproducible service and web container builds plus local smoke checks pass. This is local release
  evidence only; no public frontend or service URL is verified.

## Next required work

1. Preserve the completed BTC proof and terminal ETH rejection; do not poll or write the retired
   ETH resolver, infer an ETH winner, or substitute a later round.
2. Treat revision `5` as current routing with a disclosed liveness risk on both active successors.
   Any release replacement must be a new resolver-first deployment with at least 14,400 seconds,
   immutable verification, and a hash-linked successor cutover.
3. Provision exactly one durable public service replica and the public web deployment; require
   overall, evaluator, funding, and catalog health `READY` at the published URLs.
4. Run the final submission-commit root/browser gates and publish only evidence-backed repository,
   hosting, video, X, and organizer form/contact values.
