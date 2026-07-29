# NoxLimit submission packet

Status: **DRAFT — do not submit yet.** The product, live deployments, seven fresh browser-off fills,
paired rotations, retired-pool liquidity closes, and one complete BTC browser-resolution/user-
redemption/LP-redemption vertical have evidence. ETH is a terminal no-write policy rejection, not a
second winner: its first post-deadline observation was 24 seconds outside the immutable one-hour
bound. Catalog revision `12` is current at
`packages/catalog/sepolia/markets-2026-07-29-btc-eth-horizons-eth-24h.json`, hash
`0x21083cbce01a121d253ff1114b77c9d12035e596ce89c9ad58411f3e06711a6e`. Six corrected/breadth
BTC/ETH 1h/4h/24h markets are active. The exercised single-writer service reported `READY` on
revision `12`; revision `8` previously reported `READY` at
`2026-07-29T15:33:41Z`; at the `2026-07-29T15:34:12Z` market snapshot, both were ordering-open and
dynamically tradeable. Those are time-bound observations. Public hosting, video, X post, and
organizer form/contact fields remain
explicitly pending.

## Submission copy

### Name

**NoxLimit**

### One-line pitch

Private resting limits for real onchain prediction markets, executed automatically through Nox and
an unchanged outcome-share AMM.

### Short description

NoxLimit is an Ethereum Sepolia prediction-market terminal where traders buy real YES/NO outcome
shares and leave a maximum average price encrypted while the order rests. The trader's wallet sends
the maximum directly to the Nox Gateway; a long-running worker evaluates it without receiving the
original plaintext from the NoxLimit API. When eligible, a public proof authorizes one atomic,
replay-protected FPMM buy with the limit-derived minimum output enforced onchain. The browser can be
closed while the order waits.

### Why it matters

Public resting orders reveal where a trader is willing to buy. A conventional hosted trigger can
hide that value from the chain, but the operator learns it and must be trusted with availability
and execution. NoxLimit keeps collateral in the OrderBook, sends the original maximum directly
from the browser to the Nox Gateway rather than through the NoxLimit API, and makes the
confidential comparison indispensable to the real state transition. The hosted worker can
privately learn whether the candidate is zero or the exact eligible limit-derived minimum output;
that derived value is economically related to the private threshold because the amount is public.

### What is original here

NoxLimit is not another generic private prediction market or encrypted wager pool. It is an
advanced-order layer over unmodified Gnosis Conditional Tokens/FPMM markets: public market, side,
amount, and expiry; one confidential resting maximum price; browser-off monitoring; and a
proof-bound atomic fill. The product combines a deterministic mobile Market Stream with a
DeepBook-inspired analysis terminal, durable orders/positions/activity, objective Chainlink
resolution, explicit refunds, and real redemption.

### Honest privacy boundary

Nox provides confidential computation, not anonymity. Wallet, market, side, amount, timestamps,
evaluation activity, and final trade are public. The initial maximum reaches the Nox Gateway TEE in
plaintext and stays encrypted while resting. The authorized evaluator can privately decrypt the
derived candidate. Publication—not fill—is when the eligible limit-derived minimum output becomes
publicly retrievable. Timing and non-action may support inference, and Gateway/Runner/KMS trust is
part of the system boundary.

### Network and stack

- Ethereum Sepolia (`11155111`);
- iExec Nox contracts `0.2.4`, Handle SDK `0.1.0-beta.13`, Hardhat plugin `0.1.0`;
- Gnosis Conditional Tokens and Fixed Product Market Maker;
- Chainlink BTC/USD and ETH/USD observations for objective settlement;
- Solidity, Hardhat, TypeScript, Fastify, Next.js, React, wagmi, viem, and Playwright.

## Existing-work and attribution disclosure

NoxLimit-specific OrderBook/resolver/testnet contracts, protocol types, catalog, operator, service,
web application, and tests are project-authored. The project integrates or depends on existing
third-party work and does not claim authorship of it:

- iExec Nox protocol contracts, Handle SDK, Gateway, and testnet infrastructure;
- unchanged Gnosis Conditional Tokens and Fixed Product Market Maker contracts;
- Chainlink feeds and proxy interfaces;
- OpenZeppelin and the standard open-source application dependencies in `pnpm-lock.yaml`;
- Archivo and IBM Plex Mono under SIL Open Font License 1.1;
- DeepBook as product/terminal research inspiration, not copied market mechanics;
- the selected `Complement` direction uses a Reclaim-inspired palette, not Reclaim product code.

Third-party sources, exact commits, and license notes remain attributable to their original
projects. `spike/**` is reproduction/verification evidence; `.thoughts/raw/**` is ignored local
research material and is not part of the submission source release. See `LICENSE` and
`.thoughts/sources/source-manifest.md`.

## Evidence checklist

### Verified and committed

- [x] Released Nox confidential path plus one real proof-authorized FPMM fill on Sepolia:
  `spike/nox/evidence/sepolia-gate-c.json`.
- [x] Fresh BTC/USD 4h and ETH/USD 4h resolver/FPMM/OrderBook deployments with immutable-binding,
  bytecode, seed, and provenance checks:
  `.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-deployment.json` and
  `.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-deployment.json`.
- [x] Worker funding/provisioning evidence:
  `.thoughts/evidence/2026-07-29-sepolia-worker-provisioning.json`.
- [x] Fresh browser flows for BTC NO, BTC YES, and ETH YES. Each artifact records direct Gateway
  input, real order creation, browser closure, automatic FPMM fill, and a fresh browser observing
  `Filled`:
  `.thoughts/evidence/2026-07-29-phase6-btc-no-order.json`,
  `.thoughts/evidence/2026-07-29-phase6-btc-yes-order.json`, and
  `.thoughts/evidence/2026-07-29-phase6-eth-yes-order.json`.
- [x] Fresh successor bundles are deployed and validated:
  `.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-successor-deployment.json` and
  `.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-successor-deployment.json`.
- [x] Both predecessor LP positions were removed after NoxLimit close. The committed artifacts show
  the state at that earlier step, including `redeemed: false`; later BTC redemption is recorded
  separately, while ETH remains unredeemable:
  `.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-liquidity-close.json` and
  `.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-liquidity-close.json`.
- [x] Historical paired cutover commit `c073643` published intermediate runtime catalog revision `5` at
  `packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json`, hash
  `0x8aa65b0b5a91025ed1fd0e1487b9c9058b44ca05889632e9f85baf3bb3885899`; original BTC/ETH routes
  became `RETIRED` and both first successors became `ACTIVE`. This is immutable history, not current
  routing.
- [x] BTC completed objective browser resolution and winning-user redemption:
  `.thoughts/evidence/2026-07-29-phase6-btc-resolution-redemption.json`.
- [x] The builder's retained BTC position redeemed in transaction
  `0x706c0c6f38518a8cd536eb4b177939a642434979153f5ee9c62f105f186c3f0c`, receipt block `11375232`:
  `.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-liquidity-redemption.json`.
- [x] ETH produced a terminal, accountless policy-rejection trace. The adjacent first observation
  arrived at `+3,624s`, 24 seconds beyond the immutable 3,600-second bound; no write, payout, or
  winner exists, and ETH user/LP positions remain unredeemable:
  `.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-resolution-policy-rejection.json`.
- [x] Future official Sepolia BTC/ETH deployments enforce a 14,400-second minimum observation-
  delay bound while preserving unique first-observation adjacency. The retired revision-5
  successors predate this guard and retain their disclosed one-hour liveness risk as history.
- [x] Corrected BTC market
  `0x37a7b5826c9ba1209470b98cd38a38f4e3e6cb448c353333138bfced7fbaf0a2`
  and corrected ETH market
  `0xa5219adaa2c86c0419cc7d9b05188784192ee023a7c3c27bab3f0cc8eaf8fc8a`
  are distinct resolver-first deployments with the 14,400-second bound, immutable validation, and
  50,000,000 YES / 50,000,000 NO seed balances. The
  [corrected strike plan](./.thoughts/evidence/2026-07-29-sepolia-corrected-successor-strike-plan.json),
  [BTC deployment evidence](./.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-deployment.json),
  and
  [ETH deployment evidence](./.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-deployment.json)
  support immutable staging revisions `6`/`7`; neither staging revision was ever served.
- [x] Atomic cutover commit `d28f307` published corrected-cutover catalog revision `8` at
  `packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-corrected-rotated.json`, hash
  `0x577593192efb7cf139267b3d076eb5e846fd15d1ab080611f9d504b716b4b427`. It became effective at
  Sepolia block `11375905`
  (`0x2a37a64bd6e1c86dd4bbb80f67cf803be9f58d93427fc84d26f59861fcbf1c76`) at
  `2026-07-29T13:53:36Z`, retiring both revision-5 routes and activating corrected BTC
  `0x37a7b5826c9ba1209470b98cd38a38f4e3e6cb448c353333138bfced7fbaf0a2` and ETH
  `0xa5219adaa2c86c0419cc7d9b05188784192ee023a7c3c27bab3f0cc8eaf8fc8a` atomically.
- [x] Runtime adoption used a controlled stop → pointer update → single startup because revision
  `5` → `8` is non-adjacent. The exercised service reported `READY` on revision `8`, with both
  corrected markets ordering-open and dynamically tradeable at the post-cutover
  `2026-07-29T15:34:12Z` market snapshot. This time-bound runtime evidence is not proof of a durable
  public URL.
- [x] Sequential revisions `9`–`12` deploy and activate verified BTC/ETH 1h and 24h bundles beside
  the corrected 4h pair. Current revision `12` has ten records—four retired and six active—and the
  service is `READY` on catalog hash
  `0x21083cbce01a121d253ff1114b77c9d12035e596ce89c9ad58411f3e06711a6e`. Each new pool validates
  50,000,000 YES, 50,000,000 NO, and 50,000,000 LP atoms. At adoption the new routes correctly
  reported `UPCOMING` before their shared `2026-07-29T17:30:00Z` start. Evidence:
  [strike plan](./.thoughts/evidence/2026-07-29-sepolia-btc-eth-1h-24h-strike-plan.json),
  [BTC 1h](./.thoughts/evidence/2026-07-29-sepolia-btc-usd-1h-deployment.json),
  [ETH 1h](./.thoughts/evidence/2026-07-29-sepolia-eth-usd-1h-deployment.json),
  [BTC 24h](./.thoughts/evidence/2026-07-29-sepolia-btc-usd-24h-deployment.json), and
  [ETH 24h](./.thoughts/evidence/2026-07-29-sepolia-eth-usd-24h-deployment.json).
- [x] BTC 1h treasury-collateral attempt 1 reverted out of gas under an exact estimate. The journal
  retained the receipt and explicit attempt-bound `RETRY` succeeded after Hardhat
  `gasMultiplier = 1.2`; the
  [redacted recovery record](./.thoughts/evidence/2026-07-29-sepolia-btc-usd-1h-deployment-recovery.json)
  preserves both attempts.
- [x] Both corrected OrderBooks now return `nextOrderId = 3`. Four one-Test-USDC orders were
  created in the browser, filled by the browser-off worker, and confirmed in fresh browsers:
  [BTC NO order `1`](./.thoughts/evidence/2026-07-29-r8-corrected-btc-no-order.json),
  [BTC YES order `2`](./.thoughts/evidence/2026-07-29-r8-corrected-btc-yes-order.json),
  [ETH YES order `1`](./.thoughts/evidence/2026-07-29-r8-corrected-eth-yes-order.json), and
  [ETH NO order `2`](./.thoughts/evidence/2026-07-29-r8-corrected-eth-no-order.json). Their
  receipt-verified positions are 1,941,161, 1,978,831, 1,941,161, and 1,978,831 outcome atoms,
  respectively, and neither OrderBook retains matching outcome-token dust. Each record contains
  one direct Gateway post and no raw private maximum, key, signature, handle, or ciphertext.
- [x] Both retired revision-5 pools then closed with zero LP shares while preserving 50,000,000 YES
  plus 50,000,000 NO unresolved atoms per pool. BTC transaction
  `0xe811190d41186d666b5b90b7938edcdd974a1a8c48fad9fa7f18b8ebf9946b4b` is in block `11375985`;
  ETH transaction `0xcfd96ad20aec7d2a6f82c30f908cfbb021d62a7118e7a861f0bf9b88a4ed52b5` is in block `11375990`:
  `.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-successor-liquidity-close.json` and
  `.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-successor-liquidity-close.json`.
- [x] Service and web container builds plus local smoke checks pass. This is not public hosting.
- [x] The latest `pnpm check` passes contracts `84`, protocol `14`, catalog `6`, service `69`, and
  web `62` (`235` package tests total), including compile/type-check/test/build.
  The dedicated Playwright suite passes `45` journeys with `21` intentional skips and zero failures.

### Pending before submission

- [ ] **PENDING — explicit user authorization for billable hosting:** do not create the always-on
  service or other cloud resources until the user approves the target project, region, budget, and
  alerts.
- [ ] **PENDING — public hosted frontend URL:** `[HOSTED_FRONTEND_URL]`.
- [ ] **PENDING — public hosted service health URL:** `[HOSTED_SERVICE_URL]/v1/health`.
- [x] **VERIFIED — public repository URL:** `https://github.com/Blockchain-Oracle/noxlimit`. The
  current public release work is on
  [`codex/noxlimit-polished-product`](https://github.com/Blockchain-Oracle/noxlimit/tree/codex/noxlimit-polished-product),
  including [cutover commit `d28f307`](https://github.com/Blockchain-Oracle/noxlimit/commit/d28f307)
  and [PR #2](https://github.com/Blockchain-Oracle/noxlimit/pull/2).
- [ ] **PENDING — final default-branch release handoff:** `main` currently trails the public release
  branch. Merge/advance the default branch to the final submission commit, or use an explicitly
  accepted exact release-branch/commit URL in the organizer form.
- [ ] **PENDING — corrected-route settlement/redemption:** the revision-8 private order →
  browser-off fill segment is verified on both sides of both markets. Complete objective
  resolution, winning-user redemption, and builder-position redemption before claiming either
  corrected successor as a full vertical. Both corrected LP positions are already closed with zero
  shares and unresolved outcome balances preserved; no premature redemption occurred. The
  completed predecessor BTC vertical remains valid evidence.
- [ ] **PENDING — demo video URL (maximum 4 minutes):** `[DEMO_VIDEO_URL]`.
- [ ] **PENDING — published X post URL:** `[X_POST_URL]`.
- [ ] **PENDING — final submission-commit verification:** rerun root `pnpm check` and the dedicated
  Playwright suite at the exact submission commit and record the final counts/output.
- [ ] **PENDING — verify no secrets, ignored raw mirrors, browser captures, or local journals are
  tracked.**

## Demo script (target 3:35)

Record this only after the hosted paths and release routing are verified. Use the completed BTC
Sepolia resolution/redemption evidence and disclose the ETH terminal rejection; jump cuts may remove
chain waiting, but must not replace it with mock state or a fabricated paired success.

### 0:00–0:20 — The problem

“Prediction markets execute on public rails, so a normal resting limit exposes the price where I am
willing to buy. A hosted trigger can hide it from the chain, but then the operator knows the secret.
NoxLimit keeps the maximum encrypted and still executes a real onchain trade.”

Show the public URL and the deterministic mobile/desktop Market Stream.

### 0:20–0:50 — A real market, not a mock dashboard

Open a BTC or ETH card in the terminal. Point to the live Chainlink underlying chart, YES/NO FPMM
prices, pool liquidity, quote ladder, NoxLimit order close, resolution time, and verified contract
provenance. State that Test USDC liquidity is builder-seeded and not organic.

### 0:50–1:15 — One-wallet onboarding

Connect one wallet on Ethereum Sepolia. If low, request the explicit gas-free bounded top-up. Show
the resulting real Sepolia ETH and NoxLimit Test USDC balances. Explain that balances are not
silently refilled and ordinary actions remain wallet-signed.

### 1:15–1:55 — Create the private limit

Choose YES or NO, enter a public Test USDC amount and a private maximum average price, and open the
review. Highlight what is public, what stays encrypted while resting, and what becomes public at
publication. Submit the Gateway encryption, collateral approval if needed, and real OrderBook
transaction. Briefly show the browser network evidence: the private-input POST goes to the official
Nox Gateway, not the NoxLimit API.

### 1:55–2:25 — Browser-off execution

Close the browser. Show the hosted service/worker advancing the public order lifecycle without ever
displaying the raw resting maximum. Reopen the public URL in a fresh browser and show the durable
`Filled` order, explorer transaction, exact received outcome shares, and minimum-output protection.

### 2:25–3:05 — Objective settlement and redemption

Open the BTC position's resolution evidence. Show the strike, resolution timestamp, first valid
post-deadline Chainlink observation and adjacent predecessor, resolved YES outcome, real user
redemption, and builder-LP redemption. Show the winning shares decrease and Test USDC return. Then
show the ETH rejection artifact briefly: the unique first observation was 24 seconds outside its
immutable bound, so no transaction or winner exists. Do not substitute a later ETH round or imply a
paired successful vertical.

### 3:05–3:35 — Why Nox is indispensable

Show the architecture line:

`direct Gateway input → persisted encrypted handle → Nox compare/select → public proof → one-shot FPMM buy`

Close with: “NoxLimit adds a private resting order primitive to an unchanged public protocol. The
BTC market, assets, liquidity, trade, oracle settlement, and redemption are real on Ethereum
Sepolia; the ETH liveness failure is disclosed, and six BTC/ETH 1h/4h/24h routes are active together
in revision 12. Both corrected four-hour markets now have real private-order fills; objective
settlement/redemptions remain release work.”
Display repository, hosted app, and `@iEx_ec`.

## X post draft

> Built NoxLimit for @iEx_ec WTF: private resting limits for real YES/NO markets. Your max stays
> encrypted in Nox while resting, then proof-authorizes one atomic FPMM trade on Sepolia.
>
> App: [HOSTED_FRONTEND_URL] Demo: [DEMO_VIDEO_URL] Code: https://github.com/Blockchain-Oracle/noxlimit

Before publishing, verify the final text and links fit X's current length/preview behavior, attach
the short demo, and retain the resulting post URL.

## DoraHacks and organizer form fields

- Project name: `NoxLimit`
- Tagline: `Private resting limits for real onchain prediction markets.`
- Repository: **VERIFIED** `https://github.com/Blockchain-Oracle/noxlimit`
- Hosted frontend: **PENDING** `[HOSTED_FRONTEND_URL]`
- Demo video: **PENDING** `[DEMO_VIDEO_URL]`
- X post: **PENDING** `[X_POST_URL]`
- Ethereum Sepolia deployment/evidence index: **VERIFIED LOCALLY — publish with the hosted release**
- iExec Hello World wallet address used for registration: **PENDING** `[HELLO_WORLD_WALLET_ADDRESS]`
- Contact email: **PENDING** `[CONTACT_EMAIL]`
- Telegram handle: **PENDING** `[TELEGRAM_HANDLE]`
- X handle: **PENDING** `[X_HANDLE]`
- Team members (maximum five): **PENDING** `[TEAM_MEMBER_LIST]`

Do not replace a pending field with an assumption. Complete the registration/login-gated fields
from the organizer form immediately before submission in case its required schema changed.

## Known limitations to disclose

- Ethereum Sepolia testnet only; there is no claimed Nox production-mainnet deployment.
- Test collateral and builder-seeded liquidity have no production value and do not prove organic
  demand or liquidity.
- This release supports curated BTC/USD and ETH/USD binary markets and a public amount fixed when
  each private buy-limit order is created; no sell limits, partial fills, CLOB, permissionless
  factory, or production LP tooling.
- The service is a single hosted worker/funding relay. It can delay or censor progress, while
  contracts preserve bounded recovery/refund and asset-safety rules.
- Confidentiality is not anonymity, and an eligible limit-derived minimum output is public from
  publication. Evaluation timing/non-action can support inference.
- Professional audit, formal verification, decentralized workers, production economic modelling,
  and latency SLAs are post-hackathon hardening.
