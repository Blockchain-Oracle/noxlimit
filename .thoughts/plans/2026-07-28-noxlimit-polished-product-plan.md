# NoxLimit Polished Product — Research-Backed Implementation Plan

**Status:** Active  
**Authorized:** 2026-07-28  
**Authority:** Latest user build authorization →
[`../decisions/CURRENT.md`](../decisions/CURRENT.md) →
[`../architecture/2026-07-25-noxlimit-system-architecture.md`](../architecture/2026-07-25-noxlimit-system-architecture.md) →
[`../../prompts/04-polished-product-implementation.md`](../../prompts/04-polished-product-implementation.md)  
**Designer contract:** [`../../DESIGNER_HANDOFF.md`](../../DESIGNER_HANDOFF.md) and
[`../design/2026-07-28-noxlimit-product-surface-map.md`](../design/2026-07-28-noxlimit-product-surface-map.md)

## 1. Outcome

Build and verify a polished Ethereum Sepolia product in which one wallet can:

1. browse a deterministic vertical Market Stream and enter a real curated BTC/USD or ETH/USD
   YES/NO market without local setup or faucet hunting;
2. inspect real oracle history, outcome-share history, seeded liquidity, and size-aware FPMM quotes;
3. create an order with a public side and amount plus a maximum average price sent directly from
   the browser to the official Nox Gateway confidential-input path;
4. close the browser while a bounded hosted evaluator monitors the real pool;
5. receive one atomic minimum-output-protected buy when eligible, or safely cancel/expire/refund;
6. see the resulting real outcome-share position;
7. observe objective settlement and redeem a winning position.

The first fully verified vertical slice is one BTC/USD or ETH/USD market. Additional BTC/ETH
horizons follow through deterministic bundle deployment. SOL is excluded from the live catalog
until its separate Pyth gate passes.

## 2. Reconciled starting point

### Established and accepted

- Nox `0.2.4`, Handle SDK `0.1.0-beta.13`, and Nox Hardhat plugin `0.1.0` are the released stack.
- The exact confidential comparison, viewer-only failed-check path, honest nonzero publication, proof
  validation, nonce isolation, replay rejection, and real FPMM buy execute locally.
- A live Ethereum Sepolia trace completed one Nox-authorized FPMM buy, forwarded exact outcome
  shares, left zero adapter dust/allowance, and rejected replay.
- The unmodified FPMM natively enforces `minOutcomeTokensToBuy` atomically.
- The canonical contract topology and post-gate A1–A3/F1–F3/C1–C3 corrections are accepted.
- Product selection, architecture selection, and Prompt 3 are closed.

### Historical evidence, not product deployments

- `spike/market` and `spike/nox` remain immutable/reproducible evidence.
- The Gate C Sepolia bundle is disposable: it used a manual oracle/deployer, wall-clock question
  identity, permissive cadence, short recovery windows, and no objective resolver.
- Old `DROP`, `STOP`, checkpoint, and deadline-routing language does not control implementation.

### Genuine build unknowns

- exact deployed BTC/ETH strikes and times for the first committed catalog;
- measured final evaluation cadence, maximum checks, and recovery windows;
- self-serve Sepolia gas treasury balance and hosting credentials;
- live browser CORS/SDK behavior in the actual Next application;
- exact Chainlink proxy phase-transition behavior on the chosen Sepolia feeds;
- Pyth historical-update semantics for SOL;
- final visual system from the external designer.

These unknowns are bounded implementation tasks. Only a failure of a load-bearing Nox, atomicity,
asset-safety, or objective-settlement assumption reopens the architecture.

## 3. Chosen product topology

```mermaid
flowchart LR
    W["Next.js Market Stream + terminal"] -->|"public reads"| S["NoxLimit service"]
    W -->|"trust-critical direct reads/writes"| E["Ethereum Sepolia"]
    W -->|"confidential input, direct"| G["Official Nox Handle Gateway"]
    S -->|"replay logs + current state"| E
    S -->|"private candidate decrypt / selected publication"| G
    S -->|"evaluate, finalize, expire, resolve"| E
    C["Committed versioned market catalog"] --> W
    C --> S
    E --> O["Market bundle: resolver → CTF → FPMM → OrderBook"]
```

### Database decision

The first product uses **no database**. Ethereum Sepolia is the durable event store; a committed
catalog identifies small, recent deployment ranges; one long-running service rebuilds an in-memory
read model from logs and authoritative current-state reads on every restart.

This is a deliberate product choice, not a mock shortcut:

- order and asset truth already lives onchain;
- a curated hackathon catalog keeps replay bounded;
- restarts are testable and do not depend on a hidden mutable database;
- it removes database deployment, migration, and split-brain failure from every user's path.

Add PostgreSQL only after the number/history of markets makes startup replay unacceptably slow, or
when multiple active service replicas need a shared cursor/cache. The database would remain a
rebuildable projection, never contract truth.

## 4. Integration Reality Matrix

| Surface | Current evidence | Product implementation | Verification / fallback |
|---|---|---|---|
| Nox contracts | Released `0.2.4`; local and live Gate C pass | Preserve exact contract primitives and typed proof wrapper | Clean Docker/Hardhat Nox tests; stop only on ABI/release failure |
| Handle Gateway | `beta.13` encrypt/decrypt/publicDecrypt path passed; source shows browser plaintext goes directly to `/v0/secrets` | Direct browser SDK call; worker sees zero or exact eligible limit, requests nonzero publication in the honest path, and never receives the initial input through the product API | Browser network test ensures no NoxLimit request/log contains the initial threshold; publication-state tests prove disclosure occurs before finalization; Gateway TEE/evaluator views are disclosed |
| FPMM/CTF | Exact pinned legacy packages; local lifecycle + live atomic buy pass | One seeded FPMM/condition per market; exact share-delta forwarding | Full local split/seed/buy/resolve/redeem; live vertical slice |
| Market close | Product OrderBook can time-gate; legacy FPMM cannot | Enforce close on every NoxLimit action; disable product quotes; remove builder LP before resolution | Boundary tests plus idempotent close-liquidity operator script; do not claim FPMM bytecode is time-gated |
| Chainlink BTC/ETH | Official Sepolia feeds previously verified | Phase-aware adapter + one-shot binary resolver using first valid chronological observation at/after resolution | Same-phase and phase-transition adversarial tests, then live feed read and resolve/redeem |
| Pyth SOL | Architecture/source candidate only | Separate historical-update adapter after BTC/ETH product works | SOL remains absent/verification-pending until fee, exponent, timestamp selection, and live redemption pass |
| Wallet | Official Nox POC uses wagmi/RainbowKit/viem | Ethereum Sepolia only; injected wallets plus WalletConnect when project ID exists; wallet signs all writes | Wrong-chain/account-change/rejection/duplicate-click browser tests |
| Charts | Oracle and FPMM events provide authentic observations | Client-only Lightweight Charts line series, strike/close/resolution markers, real fill markers | Never fabricate OHLC/depth/volume; show sparse/unavailable states; include required TradingView attribution |
| Worker | Gate C scripts prove orchestration | One always-on TypeScript service, one replica, serialized wallet nonce queue, restart reconstruction | Kill/restart tests at Open/Evaluating/PublicationPending and after mined receipts |
| Index/read model | Events and contract getters are sufficient for curated deployments | Replay from each catalog `deploymentBlock`, overlap blocks, dedupe `(blockHash, txHash, logIndex)`, re-read nonterminal orders | Chain remains authoritative; direct trust-critical reads bypass cache |
| Catalog | No polished catalog exists | Deterministic JSON manifest activated only after onchain invariant verification | Schema validation + chain verification on service startup and deployment CI |
| Test collateral | Gate C used explicit test assets/funding | Clearly named six-decimal Test USDC and bounded onchain claim path | Unit/integration tests; no production-value implication |
| Native gas | Actor/finalizer top-ups worked; current treasury balance unknown | Signed short-lived initial/refill request; service tops low wallets toward measured Sepolia ETH and Test USDC targets, never automatically | Onchain nonce/cooldown/per-refill/lifetime-cap idempotency; real balances and low-treasury health remain visible |
| Hosting/RPC | Not provisioned in corpus | One web deployment, one long-running service container, dedicated Sepolia RPC, fixed worker/finalizer key | External prerequisite; local product remains runnable without fake hosted success |

## 5. Stack and source basis

### Runtime and workspace

- Node `22.22.3` for product and contracts; it is installed locally at
  `/Users/abu/.nvm/versions/node/v22.22.3/bin/node`.
- pnpm workspace; use the available pnpm `10.33.0` under Node 22 while preserving the spike
  lockfiles/package-manager declarations untouched.
- TypeScript `5.8.3` for the verified contract toolchain; application packages remain compatible
  with that pin unless a framework declaration proves otherwise.

### Contracts

- Solidity `0.8.35` for NoxLimit contracts because released `Nox.sol` requires it.
- Solidity `0.5.17`, EVM Istanbul, for legacy Gnosis CTF/FPMM deployment wrappers.
- Hardhat `3.9.0`, Nox plugin `0.1.0`, viem `2.48.1`, and the exact Gnosis/OpenZeppelin pins already
  exercised by the spikes.

### Web

Use the current official Nox POC compatibility family:

- Next.js `16.2.4`, App Router;
- React/React DOM `19.2.4`;
- wagmi `2.19.5`, RainbowKit `2.2.10`, viem `2.48.4`, TanStack Query `5.99.2`;
- Handle SDK exactly `0.1.0-beta.13`;
- Tailwind CSS 4 with local primitives rather than a large generic dashboard kit;
- Lightweight Charts `5.2.0`, client-only;
- Zod 4 for runtime catalog/API validation;
- Vitest/React Testing Library for units/components and Playwright for the complete browser path.

The pinned official Nox application is
`.thoughts/raw/iexec-nox-org/nox-product-poc/cVault/front/package.json`. Current primary docs confirm
that Next App Router pages/layouts are Server Components by default, RainbowKit requires wagmi,
viem, and TanStack Query plus `ssr: true` for SSR apps, and Lightweight Charts is client-side and
requires TradingView attribution:

- <https://nextjs.org/docs/app>
- <https://rainbowkit.com/docs/installation>
- <https://tradingview.github.io/lightweight-charts/docs/5.0>

The mandated Context7 CLI was attempted first and failed with `ENOTFOUND registry.npmjs.org` in the
managed sandbox. It was retried through the already cached local `ctx7` executable, which also
returned `fetch failed` because the Context7 service is unreachable from the sandbox.
Out-of-sandbox escalation is unavailable in this session, so decisions are pinned to the
checked-out official Nox source and current primary documentation rather than silent memory.

### Service

- Node 22 + TypeScript;
- Fastify 5 for the read/health/funding API, using schemas at every external boundary;
- viem for logs, reads, writes, receipts, and serialized account actions;
- Handle SDK beta.13 for worker viewer decrypt and public proof retrieval;
- in-memory projections rebuilt from chain; no private limit fields in schemas or logs.

## 6. Target repository layout

```text
apps/
  web/
    src/app/
      page.tsx                         # canonical responsive shell
      discover/page.tsx                # optional alias/redirect; no duplicate interaction tree
      markets/[marketId]/page.tsx
      orders/[chainId]/[orderBook]/[orderId]/page.tsx
    src/components/
      discover/
      terminal/
      chart/
      liquidity/
      orders/
      positions/
      activity/
      onboarding/
      privacy/
      wallet/
    src/lib/
      api/
      contracts/
      nox/
      queries/
  service/
    src/api/
    src/catalog/
    src/indexer/
    src/read-model/
    src/worker/
    src/funding/
    src/resolver/

packages/
  contracts/
    contracts/
      NoxLimitOrderBook.sol
      market/
      oracle/
      testnet/
      interfaces/
      test/
    scripts/
    test/
  protocol/
    src/domain/
    src/contracts/
    src/markets.ts
    src/orders.ts
    src/positions.ts
    src/min-out.ts
    src/status.ts
  catalog/
    schema/
    sepolia/markets.json
    src/

spike/                    # preserved historical evidence; excluded from product workspace
```

## 7. Phased delivery plan

Each phase ends with executable evidence. A phase may expose an ordinary implementation bug; that
does not trigger a product reselection.

### Phase 0 — Workspace, contracts baseline, and quality harness

Deliver:

- root Node/pnpm workspace configuration that excludes `spike/**`;
- shared strict TypeScript/format/lint commands;
- a new `packages/contracts` copied from the verified OrderBook baseline, not an in-place spike
  conversion;
- dual Solidity compiler configuration and separate Nox local-network configuration;
- strict test runner that fails on Hardhat's misleading zero-exit test output;
- baseline Nox/FPMM tests ported and green before behavior changes.

Evidence:

- exact baseline test count and bytecode size recorded;
- spike hashes/evidence unchanged;
- clean offline install/build path documented.

### Phase 1 — Harden the product OrderBook (first mergeable slice)

Implement A1–A3/F1–F2/C1:

- immutable `tradingClosesAt` and `expiresAt <= tradingClosesAt`;
- no evaluation, publication request, or nonzero finalize after order/NoxLimit close;
- no owner cancellation/abandonment from `PublicationPending`;
- evaluation timeout consumes the current check/nonce; next request increments nonce;
- explicit count/remaining-budget getters;
- derived `MonitoringExhausted` and impossible further checks;
- status/nonce/time-aware candidate getter;
- independent nonzero cadence/evaluation/publication recovery configuration.

Preserve:

- immutable single-market bindings;
- wallet/application-bound encrypted inputs;
- nonce-distinct candidates and global replay guards;
- restricted self-call, outer gas reserve, atomic FPMM `minOut`, callback validation, balance-delta
  forwarding, and separate refund.

Test first:

- exact custom errors for every boundary;
- timeout/nonce/count mutation tests;
- final-check exhaustion;
- stale candidate, late proof, cancel/publication race, expiry/close precedence;
- low finalizer gas, recipient revert/reentrancy, adverse pool movement, replay, reused handle,
  multi-order isolation, exact refund/dust/allowance behavior;
- runtime/init-code size and measured gas report.

### Phase 2 — Objective market bundle, test assets, and deterministic catalog

Build in resolver-first order:

1. `ISettlementPriceAdapter` and phase-aware `ChainlinkRoundAdapter`;
2. one-shot `PriceBinaryResolver` with deterministic market/question identity;
3. Conditional Tokens condition;
4. seeded FPMM;
5. market-bound hardened OrderBook;
6. immutable market-record export plus a new versioned catalog activation revision.

Add:

- six-decimal `NoxLimit Test USDC` with bounded testnet claim behavior;
- product funding/sponsor contract or claim authorization needed for idempotent onboarding;
- deploy, seed, verify, close-liquidity, resolve, and export scripts;
- immutable market records with addresses, provenance, times, fee/policy, deployment block/txs, and
  verification evidence;
- versioned whole-manifest activation revisions with `catalogRevision`, previous-revision hash,
  effective time, and exactly one `ACTIVE` market ID per asset/horizon plus `SUCCESSOR`/`RETIRED`
  routing. Activation state is not mutated inside an immutable market record. The first revision
  that marks a market `ACTIVE` fixes its `opensAt` and `opensAtBlock`; later revisions preserve
  both, so `RECENTLY_OPENED` never falls back to deployment time.

Successor cutover is one operator workflow:

`deploy → seed → immutable verification → mark SUCCESSOR → predecessor NoxLimit close → publish one
new revision that retires predecessor and activates successor → remove predecessor LP before
resolution`

The new revision fails validation if an asset/horizon has two active IDs, if the predecessor is
still ordering-open at the cutover, if the successor is not seeded/tradeable, or if any contract
binding/provenance changed after verification.

Runtime adoption uses an operator-only reload command, never a public API. The service loads and
validates the new immutable records, revision hash chain, activation `opensAt`/`opensAtBlock`,
one-active invariant, seeding, and successor cutover; completes the new OrderBook recovery replay;
then atomically swaps one catalog pointer. Any failure keeps the previous revision active. The web
reads `catalogRevision` from the service instead of shipping a second mutable catalog copy.

Tests:

- same-phase and cross-phase Chainlink adjacency;
- skipped/cherry-picked/early/invalid rounds;
- exact normalization, equality at strike, one-shot resolution, YES/NO payout and CTF redemption;
- unseeded/mismatched/duplicate/overwrite catalog rejection;
- manifest hash-chain/revision validation and atomic one-active-per-asset/horizon successor cutover;
- drained active pool becomes dynamically untradeable without invalidating immutable verification;
  intentional LP removal from a closed/resolved market remains valid retained history;
- full local resolver → condition → FPMM → OrderBook → fill → LP close → resolve → redeem.

### Phase 3 — Shared protocol/client package

Implement one typed source of truth for web and service:

- `MarketView`, `MarketStreamCardView`, `MarketHistoryView`, `OrderRef`, `OrderView`, `PositionView`,
  named statuses, event types;
- separate market `verification`, catalog `activation`, objective `lifecycle`, dynamic
  `tradeability`, ordered `tradeabilityReasons`, and derived badges; `CLOSING_SOON` is never a
  lifecycle;
- overflow-safe BigInt `maxPrice → minOut` conversion and formatting;
- catalog validation and contract ABI exports;
- direct market/quote reads;
- unsigned transaction builders for create, cancel, expire, refund, finalize, resolve, redeem;
- order/position reconstruction helpers;
- explicit cached-public, wallet-scoped, and trust-critical-live read boundaries.
- JSON wire schemas encode block numbers, order IDs, atom amounts, and other unbounded integers as
  decimal strings; domain adapters validate and convert to `bigint` without floating point.

Tests:

- decimal/rounding/extreme-price properties;
- named status derivation including `MonitoringExhausted` and `ExpiryReady`;
- composite order reference isolation;
- stale quote/market-close rejection;
- market verification/lifecycle/tradeability mapping and exact close-boundary properties;
- schema rejects placeholders or non-Sepolia live entries.

### Phase 4 — Restart-safe worker, indexer, API, and funding service

Startup algorithm:

1. load and validate the current catalog revision plus immutable market records;
2. verify active/successor immutable code, bindings, resolver policy, and provenance; compute
   liquidity/oracle/indexer/evaluator tradeability separately because it changes over time;
3. replay the lightweight OrderBook lifecycle log for **every** catalog record from its
   `deploymentBlock` in bounded chunks, then re-read every discovered nonterminal order; this
   complete recovery scan is what identifies `Evaluating`, `PublicationPending`, expiry-ready, and
   refundable work after a restart;
4. eagerly replay full market/oracle/FPMM data only for active, successor, ordering-closed/
   unresolved, and wallet-requested bundles; resolved archive chart/detail history loads lazily and
   uses a bounded in-memory cache;
5. start overlapped block polling with deterministic deduplication;
6. start one serialized writer queue.

Worker behavior:

- `Open`: evaluate after creation, material quote movement, or heartbeat when cadence/budget/time
  allow;
- `Evaluating`: retrieve stored candidate and privately decrypt; zero produces no result-specific
  action, nonzero starts publication;
- `PublicationPending`: retrieve proof and permissionlessly finalize after restart;
- timeouts/expiry/close: advance only the valid recovery path;
- every write re-reads state, waits for receipt, and treats already-completed state as idempotent.

Public API:

```text
GET  /v1/markets?asset=&horizon=&lifecycle=&sort=&limit=&cursor=&snapshot=
GET  /v1/markets/:marketId
GET  /v1/markets/:marketId/history?mode=&range=&sampling=&limit=&cursor=
GET  /v1/markets/:marketId/quote?side=&amount=
GET  /v1/orders/:chainId/:orderBook/:orderId
GET  /v1/orders?owner=
GET  /v1/positions?owner=
GET  /v1/activity?marketId=&owner=
GET  /v1/health
POST /v1/funding/challenge
POST /v1/funding/claim
```

`GET /v1/markets` returns `{ catalogRevision, snapshot, items, nextCursor }`. `snapshot` binds the
stable cursor order to one catalog revision, filter/sort tuple, as-of time, and indexer safe block;
default `limit` is 20 and maximum is 50. Sorts are exactly:

- `CLOSING_SOON`: `tradingClosesAt ASC`, then `marketId ASC`;
- `RECENTLY_OPENED`: `opensAt DESC`, then `marketId ASC`;
- `LIQUIDITY`: integer `completeSetDepthAtoms DESC`, then `marketId ASC`.

Asset, horizon, and lifecycle are filters. `LIVE` maps to immutable `VERIFIED`, catalog `ACTIVE`,
lifecycle `ORDERING_OPEN`, and absence of the `NO_LIQUIDITY` reason; dynamic tradeability is
returned separately and only `TRADEABLE` enables entry. This keeps a temporarily stale,
indexer-unsafe, or evaluator-down active market visible with its exact disabled reasons, while a
drained/unseeded market leaves live discovery but remains available by deep link and in history.
`RESOLVING` maps to `ORDERING_CLOSED` or
`AWAITING_RESOLUTION`; `RESOLVED` maps to `RESOLVED_YES` or `RESOLVED_NO`. An intentionally drained
closed/resolved market remains valid history. Card prices are exact fee-inclusive average prices
for a canonical `1.000000 Test USDC` `calcBuyAmount` quote. `completeSetDepthAtoms` is the numeric
minimum of the FPMM's YES and NO reserves in six-decimal complete-set units and is the only
liquidity-sort key.

Card previews contain at most 24 deterministic points. Terminal history contains at most 240 per
page/range and preserves endpoints, settlement markers, and real fill markers when downsampling.
Underlying history walks Chainlink proxy phases/aggregator rounds (or the verified Pyth path) rather
than assuming oracle events contain the series; outcome history deterministically replays FPMM
funding/reserve/fill changes. Every response exposes source, from/to safe block, as-of time,
staleness, limited-history state, and cursor. Fewer than two real points produces no curve.

Dynamic reasons use one deterministic precedence—`UNVERIFIED`, `NOT_ACTIVE`, `ORDERING_CLOSED`,
`INDEXER_UNSAFE`, `ORACLE_STALE`, `NO_LIQUIDITY`, `EVALUATOR_UNAVAILABLE`—and expose the complete
ordered array plus the first reason as primary `tradeability`; an empty array means `TRADEABLE`.
Indexer safety is an unresolved reorg or more than six blocks of safe-head lag. Oracle staleness
uses the verified per-feed `oracleMaxAgeSeconds`; pool quote and evaluator heartbeat maximum ages
are 60 seconds. `NO_LIQUIDITY` means either reserve is zero or either canonical 1-Test-USDC quote
fails/returns zero. Badges use the response `asOf`: `NEW` for age below
`min(3600 seconds, horizon/4)`, `CLOSING_SOON` for positive remaining time at or below that same
threshold, `LOW_LIQUIDITY` for `0 < completeSetDepthAtoms < 50_000_000`, and `STALE` for a stale
oracle or pool snapshot. The first release versions these values with the shared domain contract.

The web may prefetch only public detail and compact history for the previous and next market in the
frozen ordered-ID snapshot. Prefetch uses deduplicated query keys, aborts on focus/filter/sort/
snapshot changes, and may fail without disturbing the current card. It never calls the Nox Gateway,
wallet/account endpoints, funding, writes, or the uncached final quote endpoint.

There is no API accepting `maxPrice`, `minOut`, ciphertext creation, decrypt, evaluation, or
publication from a public caller. Exact pre-sign quotes remain uncached.

Service readiness waits for the lightweight all-OrderBook recovery scan plus eager active/
unresolved market state, never the entire resolved oracle/FPMM chart archive. The release records
restart time for every catalogued OrderBook, six live bundles, and the retained unresolved set;
resolved-history pagination/lazy load must not delay `/v1/health`. If that bounded recovery scan
becomes unacceptably slow under the selected RPC, the documented escape hatch is a rebuildable,
chain-verified recovery checkpoint or PostgreSQL projection—not silently dropping history.

Tests:

- replay/reorg overlap and dedupe;
- restart in every active order state;
- worker zero/nonzero/Gateway timeout/receipt retry paths;
- serialized nonce writes and insufficient finalizer balance;
- API schema/status/privacy log audit;
- comparator permutation invariance, stable cursor pagination, exact close boundaries, lifecycle
  filter mapping, immutable-verification versus dynamic-tradeability transitions, and per-market
  verification isolation;
- drained-active versus intentionally drained resolved pools, successor cutover, card quote/depth
  formulas, phase-aware oracle history, FPMM replay/reorg determinism, sparse-history honesty, and
  six-live-plus-archive restart measurement;
- atomic catalog reload success/failure, stable first-activation `opensAt`/`opensAtBlock`, complete
  all-OrderBook recovery discovery, tradeability-reason precedence, and exact badge boundaries;
- signed short-lived funding request, no automatic refill, target/cooldown/cap enforcement,
  replay/partial-funding/service-down states.

### Phase 5 — Polished terminal

Implement the surface map in vertical slices:

1. shell, mobile vertical Market Stream, desktop stream rail, selected-market facts,
   oracle/outcome chart, and quote ladder;
2. wallet/funding readiness and one-wallet Sepolia onboarding;
3. private ticket with exact live preflight, in-memory limit, direct Handle Gateway request,
   allowance, order signature, receipt;
4. My Orders and order detail timeline with durable browser-off reconstruction;
5. Positions, resolution/redemption, Activity, and privacy explainer;
6. responsive stream-to-terminal transitions and all loading/empty/error/stale/recovery states.

Interaction invariants:

- `/` is one canonical responsive shell: CSS/client composition presents the desktop terminal or
  mobile Discover without viewport-dependent server branching or two hidden interactive trees;
  `/discover` may only alias/redirect that shell, while `/markets/:marketId` is the durable market
  route. Sort/filter state may use query parameters; private drafts never do;
- keep `focusedMarketId` (the browsed Discover card) separate from `selectedMarketId` (the market
  loaded into the Trade workspace); only explicit Open/Trade/desktop activation or a confirmed
  dirty switch changes selection;
- maximum price never enters URL, local storage, analytics, NoxLimit API, server logs, or error
  reporting;
- public fields may remain in volatile per-market state, but a dirty market switch requires
  confirmation; clear the private in-memory value after a confirmed account/chain/market change,
  explicit discard, rejection, or finished flow, and never persist it;
- mobile ticket dismissal/back/swipe uses the same keep-editing/discard protection;
- `Trade YES` / `Trade NO` from a discovery card preselects market/side and opens a full-context
  Trade workspace containing the full question, oracle-versus-outcome distinction, liquidity,
  size-aware quote, terms, expandable full chart, private-limit/expiry/disclosure review, Gateway,
  and wallet steps—never a bare form;
- live cards come only from verified deployed/seeded catalog entries and use deterministic visible
  sorting—not fake personalization, engagement, or popularity;
- card values update in place, but a background ranking update cannot move the focused card; apply
  stable `marketId`-tied ordering only on a deliberate filter/sort/refresh action;
- one synchronous guard prevents duplicate wallet prompts;
- stale successful preflight cannot survive a later read error;
- no optimistic `Filled`; receipts and chain state control lifecycle;
- charts and activity contain real data only;
- Market Stream previews use bounded accessible SVG/sparklines from public card data; the selected
  terminal alone mounts Lightweight Charts;
- TradingView attribution is present.
- Fastify JSON emits block numbers, order IDs, and other unbounded integers as decimal strings;
  validated client/domain adapters convert them to `bigint` where contract calls require it.

Tests:

- component states from the surface map;
- catalog filter/sort stability, `marketId` tie-breaking, adjacent-card prefetch, and no unverified
  live card;
- dirty desktop switch and mobile dismiss/back/swipe clear private values only after explicit
  discard/confirmed navigation, while no browser persistence contains them;
- wallet/chain/query-cache isolation;
- approval/order rejection and replacement;
- browser network/log assertion proving only the direct expected Gateway request contains the
  confidential input;
- responsive 390px/1440px paths, keyboard/focus/reduced-motion/contrast checks;
- mobile snap/ordinary-scroll parity, explicit previous/next navigation, and stream-position
  announcements;
- close/reopen reconstructs order without local private data.
- `Trade YES/NO` opens the full-context Trade workspace and causes no Gateway request, approval, or
  transaction until the explicit review action;
- production bundles/API responses contain no design-sample fixture values;
- touch/wheel/keyboard browsing changes focus only, not selected Trade state, and cannot destroy a
  draft; reduced motion disables snap/smooth scrolling while explicit previous/next remains usable;
- at 390px there is no page-level horizontal overflow and assistive technology sees only one
  responsive interaction tree.

### Phase 6 — Fresh live BTC/ETH vertical slice

Before adding breadth:

- verify current Chainlink proxy/phase behavior;
- deploy one fresh deterministic BTC or ETH bundle with production product policy values;
- seed real Test USDC liquidity;
- activate the catalog only after invariant verification;
- deploy/fund worker/finalizer and a universal self-serve user funding path;
- run browser confidential input → order → browser closure → evaluation → publication → atomic fill
  → position → LP close → objective resolve → redeem;
- record contract addresses, blocks, transactions, balances, shares, status transitions, worker
  logs, and screenshots/video evidence.

No permissive Gate C cadence, 45-second recovery value, manual oracle, or disposable question ID is
allowed in this run.

### Phase 7 — Market breadth, design integration, and submission verification

- deploy additional BTC/ETH 1h/4h/24h bundles through the same deterministic process;
- keep one active near-the-money bundle per asset/horizon initially, pre-verify its rolling
  successor, and expose the resulting BTC/ETH cards in the adopted Market Stream with visible
  `Closing soon`, `Recently opened`, and `Liquidity` sorts plus asset/horizon/lifecycle filters,
  without fragmenting seeded liquidity across unnecessary strikes;
- merge external design batches without weakening product laws or inventing data;
- measure startup replay, quote freshness, Nox timings, gas reserve, and funding amounts;
- run clean unit/property/adversarial/integration/restart/browser suites;
- audit all privacy, testnet, liquidity, security, and latency claims against evidence;
- prepare README, deployment/use docs, feedback, short demo script/video assets, and submission facts.

SOL remains a separate post-core work item and activates only after the Pyth adapter's live gate.

## 8. Universal user journey and success criteria

The final test is one uninterrupted product story:

```text
open the real Market Stream
→ select a market and enter its full terminal/ticket
→ connect one wallet
→ obtain Test ETH + Test USDC in-product
→ inspect a real market and real charts/quotes
→ enter public amount + private maximum price
→ send confidential input directly to Nox Gateway
→ approve and create a real escrowed order
→ close browser
→ worker fills against the real FPMM
→ reopen into durable Filled state and position
→ resolve from the documented oracle observation
→ redeem winning shares
```

Pass conditions:

- no local setup, external faucet hunt, second wallet, mock data, manual database edit, or hidden
  operator impersonation;
- Nox is indispensable to the real order authorization;
- maximum price is absent from NoxLimit-owned network requests/logs/storage while resting;
- public/confidential boundary is described exactly;
- atomic limit, replay, state, refund, settlement, and redemption invariants pass;
- a fresh reviewer can understand and enter the flow in roughly 30 seconds, without claiming the
  asynchronous fill itself completes in 30 seconds.

## 9. Hackathon risk standard

### Pre-submission blockers

- released Nox/Handle incompatibility in the actual browser/worker;
- inability to bind or one-shot-consume the real result;
- worse-than-limit fill or broken rollback;
- obvious escrow/share loss;
- non-objective or caller-cherry-pickable settlement;
- shipped mock/placeholder market data;
- the normal user path still requires local setup, external faucet hunting, or a second human.

### Important, but not pre-build vetoes

- production mainnet;
- professional audit or formal verification;
- decentralized/multi-replica workers;
- organic liquidity;
- production manipulation economics;
- latency SLA distribution;
- permissionless market creation, sells, partial fills, LP tooling, or CLOB breadth.

## 10. Immediate next implementation slice

Begin Phase 0/1 only:

1. scaffold the root workspace and `packages/contracts` with exact verified pins;
2. copy the verified OrderBook as a product baseline without modifying `spike/**`;
3. port baseline tests and make them green;
4. add failing tests for A1–A3/F1–F2/C1;
5. implement close/budget/status/candidate/timeout corrections;
6. run full local Nox/FPMM suites and record gas/size evidence.

Do not mix Chainlink, Pyth, catalog, faucet, service, or frontend into this first regression
boundary. The designer can work from the completed surface contract in parallel.
