# NoxLimit submission packet

Status: **DRAFT — do not submit yet.** The product, live deployments, and fresh browser-off fills
have evidence. Public hosting, the final fresh resolution/redemption trace, video, X post, and
registration fields are still explicitly pending below.

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
- [x] Fresh successor bundles are deployed and validated as rotation candidates (activation is
  still pending below):
  `.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-successor-deployment.json` and
  `.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-successor-deployment.json`.
- [x] Local compile, type-check, package-test, build, responsive browser, privacy-boundary, and
  accessibility gates exist. Re-run `pnpm check` and the Playwright suite at the final commit.

### Pending before submission

- [ ] **PENDING — final fresh objective resolution and winning-position redemption evidence.**
- [ ] **PENDING — successor cutover/final active catalog revision reflected in public docs.**
- [ ] **PENDING — public hosted frontend URL:** `[HOSTED_FRONTEND_URL]`.
- [ ] **PENDING — public hosted service health URL:** `[HOSTED_SERVICE_URL]/v1/health`.
- [ ] **PENDING — final public repository/default-branch URL:** `[PUBLIC_REPOSITORY_URL]`.
- [ ] **PENDING — demo video URL (maximum 4 minutes):** `[DEMO_VIDEO_URL]`.
- [ ] **PENDING — published X post URL:** `[X_POST_URL]`.
- [ ] **PENDING — final clean-run output and exact test counts recorded at the submission commit.**
- [ ] **PENDING — verify no secrets, ignored raw mirrors, browser captures, or local journals are
  tracked.**

## Demo script (target 3:35)

Record this only after the pending resolution/redemption and hosted paths are verified. Use real
Sepolia state and transaction evidence; jump cuts may remove chain waiting, but must not replace it
with mock state.

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

Open the position's resolution evidence. Show the strike, resolution timestamp, first valid
post-deadline Chainlink observation and adjacent predecessor, resolved YES/NO outcome, then submit
the real redemption transaction. Show the winning shares decrease and Test USDC return. Use the
fresh final evidence transaction; do not substitute the earlier Gate C fill.

### 3:05–3:35 — Why Nox is indispensable

Show the architecture line:

`direct Gateway input → persisted encrypted handle → Nox compare/select → public proof → one-shot FPMM buy`

Close with: “NoxLimit adds a private resting order primitive to an unchanged public protocol. The
market, assets, liquidity, trades, oracle settlement, and redemption are all real on Ethereum
Sepolia.” Display repository, hosted app, and `@iEx_ec`.

## X post draft

> Built NoxLimit for @iEx_ec WTF: private resting limits for real YES/NO markets. Your max stays
> encrypted in Nox while resting, then proof-authorizes one atomic FPMM trade on Sepolia.
>
> App: [HOSTED_FRONTEND_URL] Demo: [DEMO_VIDEO_URL] Code: [PUBLIC_REPOSITORY_URL]

Before publishing, verify the final text and links fit X's current length/preview behavior, attach
the short demo, and retain the resulting post URL.

## DoraHacks and organizer form fields

- Project name: `NoxLimit`
- Tagline: `Private resting limits for real onchain prediction markets.`
- Repository: **PENDING** `[PUBLIC_REPOSITORY_URL]`
- Hosted frontend: **PENDING** `[HOSTED_FRONTEND_URL]`
- Demo video: **PENDING** `[DEMO_VIDEO_URL]`
- X post: **PENDING** `[X_POST_URL]`
- Ethereum Sepolia deployment/evidence index: **PENDING final resolution/redemption reconciliation**
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
