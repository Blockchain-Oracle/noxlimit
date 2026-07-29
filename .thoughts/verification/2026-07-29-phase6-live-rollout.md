# NoxLimit Phase 6 live rollout

Status: **PARTIAL at the corrected-route settlement/redemption and public-release boundaries; BTC/ETH 1h/24h breadth is complete — one complete BTC user order → Nox → FPMM →
objective resolution → winning-user redemption path and builder-LP redemption are verified. ETH is
terminally rejected by its immutable one-hour observation-delay policy; no ETH write, payout, or
winner exists. Corrected 14,400-second BTC/ETH successors are deployed, validated, seeded, and
atomically `ACTIVE` in revision `8`. Health was revision-8 `READY` at
`2026-07-29T15:33:41Z`; the `2026-07-29T15:34:12Z` market snapshot reported both markets
ordering-open and `TRADEABLE`. Both corrected OrderBooks now
return `nextOrderId = 3`, and four corrected-route browser-created, browser-off fills are verified.
Objective settlement and user/builder redemption remain pending. Both revision-5 builder LP
balances are zero. Current revision `12` has ten records—four retired and six active—and covers
BTC/ETH 1h/4h/24h. The service is revision-12 `READY`; public hosting remains pending.**

This file is an operational verification log, not a new architecture or decision authority.
Current product authority remains `.thoughts/decisions/CURRENT.md` and the canonical architecture.

## Verified deployment state

The initial Phase 6 Ethereum Sepolia bundle was catalog revision `2`, published at
`packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h.json` with revision hash
`0x831ea1fb98bb8433af21ca54d6253b6649241c53081fe50aad983edb193e15f3`.
It hash-links revision `1`
(`0xed59599a3b777571a97733c24e793b3264f2f47cede79629640e3fc6d660c258`)
and the bootstrap catalog.

The historical paired cutover at commit `c073643` published revision `5` at
`packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json`, hash
`0x8aa65b0b5a91025ed1fd0e1487b9c9058b44ca05889632e9f85baf3bb3885899`.
It marked both original bundles below `RETIRED` and both first-generation successors `ACTIVE`.
Those successors used the now-known-risky immutable 3,600-second observation bound and are now
also `RETIRED`.

Commit `d2dbc39` records corrected successors deployed and staged without changing current routing:

- catalog revision `6` at
  `packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-btc-corrected-successor.json`, hash
  `0x1adb2085979fe9f9f94d5fad6793de7d808888e32cf5fa259d92a25b34b7693b`, stages corrected BTC
  market `0x37a7b5826c9ba1209470b98cd38a38f4e3e6cb448c353333138bfced7fbaf0a2` as
  `SUCCESSOR`;
- catalog revision `7` at
  `packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-corrected-successors.json`, hash
  `0xe20fc416f695552619d5701ece6b4dd05ad934890387807551237b5fb424dcca`, carries BTC forward and
  stages corrected ETH market
  `0xa5219adaa2c86c0419cc7d9b05188784192ee023a7c3c27bab3f0cc8eaf8fc8a` as `SUCCESSOR`;
- both corrected markets bind `maximumObservationDelaySeconds = 14400`, and independent validation
  records 50,000,000 YES atoms, 50,000,000 NO atoms, and 50,000,000 LP shares for each;
- both revision-5 routes closed, and both corrected successors started, at
  `2026-07-29T13:50:00Z`. Revisions `6` and `7` remain staging manifests only and were never
  served.

Commit `d28f307` completes the paired corrected cutover:

- catalog revision `8` is published at
  `packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-corrected-rotated.json`, hash
  `0x577593192efb7cf139267b3d076eb5e846fd15d1ab080611f9d504b716b4b427`, with
  `previousRevisionHash = 0xe20fc416f695552619d5701ece6b4dd05ad934890387807551237b5fb424dcca`;
- its consensus-safe effective point is block `11375905`, timestamp `2026-07-29T13:53:36Z`, block
  hash `0x2a37a64bd6e1c86dd4bbb80f67cf803be9f58d93427fc84d26f59861fcbf1c76`;
- the accountless operator validated the complete revision `0`–`8` chain and emitted zero onchain
  writes;
- corrected BTC market
  `0x37a7b5826c9ba1209470b98cd38a38f4e3e6cb448c353333138bfced7fbaf0a2` and corrected ETH market
  `0xa5219adaa2c86c0419cc7d9b05188784192ee023a7c3c27bab3f0cc8eaf8fc8a` are both `ACTIVE`;
- because revisions `6`/`7` were deliberately skipped and must never be served, runtime adoption
  used controlled single-writer stop → catalog-pointer swap → one clean startup. The service
  reported revision-8 `READY` with both corrected markets ordering-open and dynamically
  `TRADEABLE` at the `2026-07-29T15:34:12Z` snapshot. Adjacent-revision SIGHUP adoption remains
  supported.

The approved horizon breadth then extended the immutable catalog sequentially:

- revision `9` adds BTC 1h market
  `0x0c552e5f150ec05e4ef39c4a7913ec4ac0a94b9fe71170538d452d3661e7b7ed`, catalog hash
  `0x3fdb8c17958a56f89b19b8ab491ba458629d2762c69eacf4ad2b436c92d561f3`;
- revision `10` adds ETH 1h market
  `0x47d1776ad85039be6705753f9aa6879ae7349a617540a3b0a0ef71e2915bee07`, catalog hash
  `0xe0f239053009afa5c78d21df58cd66cc2200aa93222529d989e231da2c5776bd`;
- revision `11` adds BTC 24h market
  `0x5fdb953c06530f97653d665624c576d2303e62a64c5fd40f4ccfa84276a4a4e5`, catalog hash
  `0x855f7b2de0298c831efc8510786d63bdfa062b8996c45fda3ed60037c72fb303`;
- revision `12` adds ETH 24h market
  `0xd171e879c281a1321dd37b9f2085554f155d717307477181fd3c42ac1231edbd`, catalog hash
  `0x21083cbce01a121d253ff1114b77c9d12035e596ce89c9ad58411f3e06711a6e`.

Current revision `12` is
[`../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-horizons-eth-24h.json`](../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-horizons-eth-24h.json),
effective at block `11376650` and `2026-07-29T16:27:00Z`. It has ten immutable records: four
retired and six `ACTIVE`, covering BTC/ETH 1h/4h/24h. Every new pool independently validates
50,000,000 YES atoms, 50,000,000 NO atoms, and 50,000,000 LP shares. Runtime adopted r9→r12
sequentially and reports `READY` on the exact r12 hash. At adoption, the four new routes correctly
reported `UPCOMING` until their shared `2026-07-29T17:30:00Z` start; catalog activation is not a
claim that a future-start market is already tradeable.

The breadth source and receipts are:

- [BTC/ETH 1h/24h strike plan](../evidence/2026-07-29-sepolia-btc-eth-1h-24h-strike-plan.json);
- [BTC 1h deployment](../evidence/2026-07-29-sepolia-btc-usd-1h-deployment.json);
- [ETH 1h deployment](../evidence/2026-07-29-sepolia-eth-usd-1h-deployment.json);
- [BTC 24h deployment](../evidence/2026-07-29-sepolia-btc-usd-24h-deployment.json);
- [ETH 24h deployment](../evidence/2026-07-29-sepolia-eth-usd-24h-deployment.json).

The synchronized inputs and deployment receipts are:

- [corrected successor strike plan](../evidence/2026-07-29-sepolia-corrected-successor-strike-plan.json);
- [corrected BTC deployment evidence](../evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-deployment.json);
- [corrected ETH deployment evidence](../evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-deployment.json).

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

Both original builder LP positions were removed after NoxLimit close before settlement. Revision
`5` then retired both original routes and activated both first-generation successors atomically.
After those successors closed and revision `8` activated the corrected routes, their builder LP
positions were also removed:

- BTC revision-5 successor close transaction
  `0xe811190d41186d666b5b90b7938edcdd974a1a8c48fad9fa7f18b8ebf9946b4b`, block `11375985`;
- ETH revision-5 successor close transaction
  `0xcfd96ad20aec7d2a6f82c30f908cfbb021d62a7118e7a861f0bf9b88a4ed52b5`, block `11375990`;
- both after-snapshots show zero LP shares and 50,000,000 YES plus 50,000,000 NO atoms retained by
  the owner. Both payout denominators remain zero, so these are unresolved positions, not
  redemptions.

The durable close records are
`.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-successor-liquidity-close.json` and
`.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-successor-liquidity-close.json`.

Subsequent live execution advanced both corrected OrderBooks to `nextOrderId = 3`. The verified
orders are:

- [BTC NO order `1`](../evidence/2026-07-29-r8-corrected-btc-no-order.json): one Test USDC,
  filled for 1,941,161 NO atoms;
- [BTC YES order `2`](../evidence/2026-07-29-r8-corrected-btc-yes-order.json): one Test USDC,
  filled for 1,978,831 YES atoms;
- [ETH YES order `1`](../evidence/2026-07-29-r8-corrected-eth-yes-order.json): one Test USDC,
  filled for 1,941,161 YES atoms;
- [ETH NO order `2`](../evidence/2026-07-29-r8-corrected-eth-no-order.json): one Test USDC,
  filled for 1,978,831 NO atoms.

Each record proves one direct Gateway post, browser closure, API fill projection, and fresh-browser
confirmation. All create/fill receipts succeeded. The four `Filled` events use nonce `1` and the
public post-publication `minOut = 1,666,667`; ERC-1155 reads match the four user positions exactly,
with zero matching balance left in either OrderBook. The evidence stores no raw private maximum,
key, signature, candidate handle, or ciphertext. Objective resolution, winning-user redemption,
and builder-LP redemption remain pending for the corrected routes. The later revision-12 manifest
adds the accepted BTC/ETH 1h and 24h breadth without changing those settlement obligations.

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
including both retired revision-5 successors, cannot be edited in place.
The corrected BTC/ETH successor deployments exercise this rule with distinct immutable identities;
revision `8` made them active without rewriting either identity, and revision `12` keeps them active
beside the new 1h/24h routes.

## Fail-closed recovery record

During BTC 1h deployment, treasury-collateral top-up attempt 1
`0x5eed0a5e4b8d9b94ba9eb1bc7ca5fe45b7f98897a33fbbc85d706c89bfcea884`
reverted out of gas because the transaction used the exact estimate. The journal retained the
failed receipt and attempt number. The operator supplied the explicit attempt-bound `RETRY`, raised
Hardhat `gasMultiplier` to `1.2`, and attempt 2 succeeded as
`0x833e083daee5321be9499112697c138e411c03a9ab2b69dd571a1c7f386e1de0`.
The journal reached `COMPLETE`; it was never deleted or rewritten. Durable redacted evidence is
[the BTC 1h deployment recovery record](../evidence/2026-07-29-sepolia-btc-usd-1h-deployment-recovery.json).

The first runtime acceptance of future-start catalog-`ACTIVE` markets exposed a separate service
bug: acceptance required immediate tradeability and rejected a valid `UPCOMING` route. The fix
accepts immutable verified active routing while preserving dynamic `UPCOMING` lifecycle state. A
controlled restart loaded that code once; adjacent revision adoption then continued sequentially
through r12. The service suite now passes `69` tests.

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
- The current web production build succeeds with the current API/RPC/collateral configuration and
  funding targets `0.02` SepETH / `25` NLTUSDC`; catalog revision remains service-owned rather than
  embedded in the web build.
- A first service startup correctly rejected both markets as `UPCOMING`: their immutable start is
  `2026-07-29T06:00:00Z`. It did not serve a false tradeable state.
- The same startup exposed a separate coherent-snapshot defect: replay selected `head - 6`, then
  hydration sampled a newer head and transiently labeled the same safe projection lag 7. The
  bounded fix now carries one `{ headBlock, safeBlock }` snapshot through replay, hydration, and
  successful health reporting. The real max-lag policy remains 6; 69 service tests, service
  type-check, and service production build pass.
- Reproducible service and web container builds plus local smoke checks pass. This is local release
  evidence only; no public frontend or service URL is verified.
- The fresh post-breadth root gate passes `84` contract, `14` protocol, `6` catalog, `69` service,
  and `62` web tests (`235` total). The dedicated Playwright snapshot records `45` passing journeys, `21`
  intentional project/viewport skips, and zero failures.

## Next required work

1. Preserve the completed BTC proof and terminal ETH rejection; do not poll or write the retired
   ETH resolver, infer an ETH winner, or substitute a later round.
2. Preserve revision `12` as the only current routing manifest. Keep revisions `6`/`7` as unserved
   staging history, revision `8` as immutable corrected-cutover history, revision-5 routes retired,
   and the retained unresolved LP outcome positions described honestly.
3. Preserve the four corrected-route order/fill records and complete objective resolution,
   winning-user redemption, and builder-LP redemption. Do not call either corrected route a full
   vertical before those proofs exist.
4. Preserve the completed BTC/ETH 1h/24h deployment and sequential revision-9→12 adoption evidence.
5. After explicit user cost/provider authorization, provision exactly one durable public service
   replica and the public web deployment. Cloud Run/public resource creation is billable. Require
   overall, evaluator, funding, and catalog health `READY` at the published URLs.
6. Run the final submission-commit root/browser gates and publish only evidence-backed repository,
   hosting, video, X, and organizer form/contact values.
