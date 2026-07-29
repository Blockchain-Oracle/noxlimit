# Deploying NoxLimit

NoxLimit is a Node/pnpm monorepo with Solidity contracts, a shared protocol package, a versioned
Ethereum Sepolia catalog, one long-running Fastify service, and a Next.js web application. It is
testnet software and must not be used with production-value assets.

The commands below describe the implemented product. Current public release URLs and the manifest
chosen for the final hosted release belong in `SUBMISSION.md` once verified.

Current routing is catalog revision `5`. Corrected BTC
`0x37a7b5826c9ba1209470b98cd38a38f4e3e6cb448c353333138bfced7fbaf0a2` and ETH
`0xa5219adaa2c86c0419cc7d9b05188784192ee023a7c3c27bab3f0cc8eaf8fc8a`
successors are already deployed, validated, 50,000,000 YES / 50,000,000 NO seeded, and staged as
`SUCCESSOR` in revisions `6`/`7`. Their shared start, and both revision-5 routes' close, is
`2026-07-29T13:50:00Z`. Do not configure a hosted service to use either staging manifest. The next
catalog action is one atomic revision `8` cutover after the boundary.

## Prerequisites

- Node.js `22.22.3` through `nvm` (also recorded in `.nvmrc` and `package.json`);
- pnpm `10.33.4` through Corepack;
- Git;
- Docker for the Nox-enabled contract test environment;
- an Ethereum Sepolia RPC endpoint for live reads or writes;
- Chromium/Chrome for Playwright browser tests.

Install exactly the locked dependency graph:

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
```

Run the complete local gate:

```bash
pnpm check
```

That command compiles contracts, type-checks every workspace, runs package tests, and builds all
packages. Browser journeys are a separate gate:

```bash
pnpm --filter @noxlimit/web test:e2e
```

## Run the product locally in read-only mode

Read-only mode needs no wallet key. Copy the service example to an ignored local file and set:

- `SEPOLIA_RPC_URL` to a reliable Ethereum Sepolia RPC;
- `WEB_ORIGIN=http://127.0.0.1:3000`;
- `CATALOG_MANIFEST_PATH` to the exact committed manifest being reviewed.

The default `packages/catalog/sepolia/markets.json` is the honest empty bootstrap manifest. It does
not fabricate inventory. To inspect a committed live revision, choose that immutable revision
explicitly from `packages/catalog/sepolia/`; do not infer the current release merely from a
filename.

```bash
cp apps/service/.env.example apps/service/.env.local
set -a
source apps/service/.env.local
set +a
pnpm --filter @noxlimit/service dev
```

In another shell, copy `apps/web/.env.example` to `apps/web/.env.local` and set:

- `NEXT_PUBLIC_NOXLIMIT_API_ORIGIN=http://127.0.0.1:8787`;
- `NEXT_PUBLIC_SEPOLIA_RPC_URL` to a browser-safe Sepolia RPC;
- `NEXT_PUBLIC_TEST_USDC_ADDRESS` to the collateral address in the selected catalog;
- the documented minimum ETH and Test USDC readiness floors.

Then start the web app:

```bash
pnpm --filter @noxlimit/web dev
```

Open `http://127.0.0.1:3000`. Confirm the service boundary independently:

```bash
curl --fail http://127.0.0.1:8787/v1/health
curl --fail http://127.0.0.1:8787/v1/markets
```

Without worker credentials, health intentionally reports evaluator/funding as unavailable or
degraded. An empty bootstrap or closed historical catalog may still be inspected, but startup
rejects a non-empty catalog with an open active market unless its evaluator is ready. That status
is not permission to display sample markets or claim that write flows are live.

## Enable the Sepolia worker and in-product funding

The write-enabled service is deliberately one long-running replica in this release. It rebuilds
projections from chain logs, owns an in-memory funding challenge store, and serializes all service
account writes through one queue.

Configure these only through the hosting platform's secret manager or the process environment:

- `WORKER_PRIVATE_KEY`: dedicated Sepolia worker/funding-relay key;
- `FUNDING_TREASURY_ADDRESS`: the deployed funding-treasury contract for this release;
- `SEPOLIA_RPC_URL`: authenticated/reliable Sepolia transport if available.

Optional public endpoint overrides are `NOX_COMPUTE_ADDRESS`, `NOX_GATEWAY_URL`, and
`NOX_SUBGRAPH_URL`. Omit them to use the released SDK's Ethereum Sepolia configuration. Never put a
private key, credential-bearing RPC URL, proof, raw private maximum, or decrypted candidate in a
`NEXT_PUBLIC_*` variable, committed env file, log, or analytics payload.

Before declaring the service ready:

1. derive the worker address from the secret without printing the secret;
2. verify that address is the immutable `worker` on every catalogued OrderBook, including staged
   successors and retained history;
3. fund it with enough Sepolia ETH for the measured lifecycle and recovery reserve;
4. verify the funding treasury holds its advertised Test ETH/Test USDC targets;
5. start the service and require overall, evaluator, and funding health to report `READY`;
6. keep only one writer replica active for this v1 deployment.

## Production builds

Public web variables are embedded during the Next.js build, so configure them before building.

```bash
pnpm --filter @noxlimit/protocol build
pnpm --filter @noxlimit/catalog build
pnpm --filter @noxlimit/contracts compile
pnpm --filter @noxlimit/service build
pnpm --filter @noxlimit/web build
```

Run the two commands as separate supervised processes that restart independently and preserve logs
without secrets:

```bash
pnpm --filter @noxlimit/service start
pnpm --filter @noxlimit/web start
```

## Reproducible containers

`Dockerfile.service` and `Dockerfile.web` build from the monorepo root with the locked Node and
pnpm versions. The service image is an always-on single-writer process. The web image is a Next.js
SSR process; it is not a static export. Public browser variables are deliberately Docker build
arguments because Next.js inlines `NEXT_PUBLIC_*` values during `next build`.

Both images have completed local build/check/smoke verification. That proves reproducibility and
local startup only; no public service or frontend URL is currently verified.

Build the service without placing runtime credentials in an image layer:

```bash
docker build -f Dockerfile.service -t noxlimit-service .
```

Build the web only after the canonical HTTPS service origin and browser-safe RPC are known:

```bash
docker build -f Dockerfile.web -t noxlimit-web \
  --build-arg NEXT_PUBLIC_NOXLIMIT_API_ORIGIN=https://api.example.invalid \
  --build-arg NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.example.invalid \
  --build-arg NEXT_PUBLIC_TEST_USDC_ADDRESS=0x0000000000000000000000000000000000000000 \
  --build-arg NEXT_PUBLIC_TRADING_MIN_ETH=0.005 \
  --build-arg NEXT_PUBLIC_TRADING_MIN_USDC=0.01 .
```

The example origin, RPC, and collateral address are placeholders, not a deployable release. The
`0.005` Test ETH and `0.01` Test USDC values are the tested readiness floors; use the exact
collateral from the activated catalog. Inject `SEPOLIA_RPC_URL`, `WORKER_PRIVATE_KEY`, and other
service-only values at runtime through a secret manager.

Hosting configuration must enforce one service replica, disable autoscaling and scale-to-zero,
use stop-before-start deployment, and allow graceful termination. A normal overlapping rolling
deploy would create two independent queues using one signer and is therefore unsupported in v1.
If no durable absolute reload pointer is mounted, rotate the catalog by rebuilding/redeploying the
service with `CATALOG_MANIFEST_PATH` set to the new committed immutable manifest.

Recommended hosting boundaries:

- expose the web application and service through HTTPS;
- set service `HOST=0.0.0.0` inside a container or hosted process;
- set `WEB_ORIGIN` to the exact public web origin for CORS;
- mount immutable catalog revisions and an absolute reload-pointer file into the service;
- monitor `/v1/health` as structured data and require top-level, evaluator, and funding status to
  remain `READY`; also monitor worker ETH, treasury balances, RPC lag, and Gateway health;
- redact credentials, signatures, handles/proofs, candidates, and private-input material;
- deploy a new service process rather than overlapping two write-enabled replicas.

## Cloud Run release profile after revision 8

Use this profile only after the atomic revision-8 manifest is committed, independently validated,
and selected as current routing. Revisions `6` and `7` are staging history and must never be used as
the hosted runtime catalog.

- Deploy the service in one explicit region with fixed manual scaling of one instance, CPU available
  outside requests (`--no-cpu-throttling`), and no scale-to-zero. Set the container port to `8787`;
  Cloud Run supplies `PORT`, while the application still requires `HOST=0.0.0.0`.
- Deploy the web container separately with ordinary autoscaling and scale-to-zero. Its overlap is
  harmless because it owns no signer or worker queue.
- Do not enable automatic service deployments. The first writer deployment has no predecessor to
  overlap, but a later rolling revision may briefly run two processes with the same signer. Until a
  distributed lease exists, perform later service changes in a maintenance window and independently
  prove the old writer has stopped before the replacement begins.
- The fixed, continuously scheduled service is billable even when HTTP traffic is idle. It is not a
  zero-cost hosting claim; verify the account budget and alerts before publishing the URL.

Break the web/service origin cycle without weakening CORS:

1. build and deploy an unadvertised bootstrap web revision with a nonfunctional placeholder API
   origin, then read its stable HTTPS origin;
2. deploy the write-enabled service once with `WEB_ORIGIN` equal to that exact web origin;
3. read the service HTTPS origin, rebuild the web image with that value in
   `NEXT_PUBLIC_NOXLIMIT_API_ORIGIN`, and deploy the final web revision;
4. publish neither URL until the JSON readiness and catalog assertions below pass.

The service runtime boundary is:

```text
# Non-secret runtime configuration
NODE_ENV=production
HOST=0.0.0.0
WEB_ORIGIN=https://<exact-web-origin>
CATALOG_MANIFEST_PATH=packages/catalog/sepolia/<committed-revision-8-manifest>.json
FUNDING_TREASURY_ADDRESS=0x6b4Ce61906E7402e198Bd6D2bc73CEd24A721b78
POLL_INTERVAL_MS=5000
LOG_LEVEL=info

# Secret Manager references, injected only at runtime
WORKER_PRIVATE_KEY=<dedicated-worker-secret-version>
SEPOLIA_RPC_URL=<reliable-sepolia-rpc-secret-version>
```

`CATALOG_MANIFEST_PATH` is deliberately relative to `/app` inside `Dockerfile.service`, where the
committed `packages/catalog/sepolia/` directory is copied. Do not set
`CATALOG_RELOAD_POINTER_PATH` on an ephemeral Cloud Run filesystem. Omit `NOX_COMPUTE_ADDRESS`,
`NOX_GATEWAY_URL`, and `NOX_SUBGRAPH_URL` to use the released Ethereum Sepolia defaults unless a
separately verified override is required.

The final web build receives public values only:

```text
NEXT_PUBLIC_NOXLIMIT_API_ORIGIN=https://<exact-service-origin>
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://<browser-safe-sepolia-rpc>
NEXT_PUBLIC_TEST_USDC_ADDRESS=0x2B0F8B156a2870E53621802A618C3d0427A163A6
NEXT_PUBLIC_TRADING_MIN_ETH=0.005
NEXT_PUBLIC_TRADING_MIN_USDC=0.01
```

The browser RPC must be intentionally public and safe to expose. Never put a provider secret,
private key, credential-bearing RPC URL, or other server-only value in `NEXT_PUBLIC_*`.

Cloud Run's HTTP probe can establish process liveness, but `/v1/health` intentionally returns a
structured body even when a subsystem is degraded. Gate the release on the body, not HTTP 200
alone:

```bash
curl --fail --silent "https://<service-origin>/v1/health" | \
  jq -e '
    .status == "READY" and
    .evaluator.status == "READY" and
    .funding.status == "READY"
  '
curl --fail --silent "https://<service-origin>/v1/markets"
curl --fail --silent "https://<web-origin>/"
```

Also compare the returned `catalogRevision` with the committed revision-8 hash and confirm that
exactly one service revision receives traffic. Without a durable reload pointer and signal control,
future catalog rotation requires a controlled image/service replacement and inherits the same
single-writer rollout caveat.

## Deploy and rotate market bundles

The bounded operator is documented in `packages/contracts/OPERATOR.md`; its env schema is
`packages/contracts/operator.env.example`. It defaults to a network-free plan and requires an exact
confirmation phrase for every write.

Build the authoritative packages, source an ignored operator environment, then inspect the plan:

```bash
pnpm --filter @noxlimit/protocol build
pnpm --filter @noxlimit/catalog build
pnpm --filter @noxlimit/contracts compile
pnpm --filter @noxlimit/contracts operator
```

Validate a deployed candidate without a key:

```bash
pnpm --filter @noxlimit/contracts operator:validate
```

For an authorized deployment, inject `SEPOLIA_OPERATOR_PRIVATE_KEY` from a secret manager and use
the exact opt-in:

```bash
NOXLIMIT_OPERATOR_CONFIRM=DEPLOY_SEPOLIA_BUNDLE \
  pnpm --filter @noxlimit/contracts operator:deploy
```

The operator deploys resolver-first, creates a plan-bound cross-process-locked journal, advances
each write through `INTENT → SUBMITTED → CONFIRMED`, verifies immutable bindings and runtime code,
seeds the unchanged FPMM, and publishes evidence/catalog output create-only. Never delete or edit a
journal to force progress. A bare intent requires the attempt-bound `ADOPT` or `RETRY` procedure in
`OPERATOR.md` after independent chain inspection.

For every new official Sepolia BTC/USD or ETH/USD bundle,
`NOXLIMIT_MAXIMUM_OBSERVATION_DELAY_SECONDS` must be at least `14400`. The operator rejects a lower
value before a write. This is a settlement-liveness floor; it does not change the unique first-
observation/adjacent-predecessor proof. `NOXLIMIT_ORACLE_MAX_AGE_SECONDS=3600` remains the separate
runtime quote-freshness policy. Do not edit an already-deployed market or historical catalog record
to retrofit the new value; deploy resolver-first and publish a new successor/cutover revision.

Stage every synchronized successor before the predecessor close. After the safe block reaches the
close, activate all affected axes atomically:

```bash
NOXLIMIT_OPERATOR_CONFIRM=ACTIVATE_SEPOLIA_SUCCESSORS \
  pnpm --filter @noxlimit/contracts operator:activate-successors
```

For the current BTC/ETH rotation, staging is complete. Use the
[corrected strike plan](./.thoughts/evidence/2026-07-29-sepolia-corrected-successor-strike-plan.json),
[BTC deployment evidence](./.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-deployment.json),
and
[ETH deployment evidence](./.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-deployment.json)
as the fixed inputs. Revisions `6` and `7` are immutable staging history, not runtime targets. Only
after the safe block reaches the shared `2026-07-29T13:50:00Z` close may the activation command
publish revision `8`, retiring both current revision-5 IDs and activating both corrected IDs in one
manifest. If either axis cannot cut over, keep revision `5` current and fail closed; do not publish
a one-axis activation.

After reviewing the new hash-linked manifest, atomically update the service's configured catalog
pointer and send `SIGHUP`. The service verifies the candidate, builds a coherent projection, and
keeps the old catalog active if acceptance fails.

## Objective resolution and redemption

Resolution must use the first valid Chainlink observation at or after the market's resolution
timestamp and its adjacent predecessor. Select the pair read-only:

```bash
pnpm --filter @noxlimit/contracts operator:select-resolution-rounds
```

If the selector reports that the unique first observation exceeds the resolver's immutable delay,
the result is terminal for that deployed condition. Do not run the write command. Do not keep
polling as if another pair could qualify, infer a winner, or substitute a later round. The retired ETH/USD 4h
predecessor demonstrates this failure: its first observation arrived at `+3624s`, 24 seconds beyond
its 3,600-second bound, so the resolver and payout remain unset. The retired BTC predecessor passed
the same rule and has durable browser/user/LP redemption evidence.

Copy only the printed round IDs into the resolution environment, then run the one-shot action:

```bash
NOXLIMIT_OPERATOR_CONFIRM=RESOLVE_SEPOLIA_MARKET \
  pnpm --filter @noxlimit/contracts operator:resolve
```

Users redeem winning outcome shares from the web position screen. Builder liquidity is closed
separately; if it was removed before resolution, run the command again after resolution with a new
create-only evidence path so held outcome shares are redeemed:

```bash
NOXLIMIT_OPERATOR_CONFIRM=CLOSE_SEPOLIA_LIQUIDITY \
  pnpm --filter @noxlimit/contracts operator:close-liquidity
```

## Explicit live browser evidence

Live Playwright suites are disabled unless every required variable and exact confirmation is
present. Read the variable contract in `apps/web/e2e/live/live-settings.ts` and
`apps/web/e2e/live/redemption-settings.ts`. Supply private keys/RPC credentials through the process
environment, use a new create-only evidence path, and never echo them.

Order creation through browser closure and automatic fill:

```bash
LIVE_SEPOLIA_CONFIRM=RUN_REAL_SEPOLIA_WRITES \
  pnpm --filter @noxlimit/web test:e2e:live:sepolia
```

Objective browser resolution and redemption:

```bash
LIVE_REDEMPTION_CONFIRM=RUN_REAL_SEPOLIA_RESOLUTION_AND_REDEMPTION \
  pnpm --filter @noxlimit/web test:e2e:live:redemption
```

These commands perform real Sepolia writes. Do not run them against an arbitrary market, reuse an
old evidence path, or retry blindly after a transport failure. The resolution/redemption harness
has an attempt-bound recovery journal that must be inspected first. The order-creation harness has
create-only evidence but no recovery journal; inspect the configured wallet nonce, exact OrderBook
events, and candidate evidence path manually before deciding whether a fresh run is safe.

## Release acceptance

A hosted release is ready only when all of the following are true:

- the selected catalog is non-empty, hash-linked, onchain-verified, seeded, and current;
- service health is `READY` with acceptable safe-block lag;
- the web app uses the same catalog collateral and exact service origin;
- public browsing works before wallet connection;
- a wallet can explicitly request bounded funding and then pay for normal transactions;
- private input goes directly to the official Nox Gateway rather than through NoxLimit servers;
- a fresh order fills against the real FPMM after browser closure;
- objective resolution and real redemption have durable transaction evidence;
- every relied-on active bundle has a settlement-liveness parameter accepted for the release;
  revision-5 BTC/ETH successors currently carry a disclosed 3,600-second risk, while their verified
  14,400-second replacements remain staged in revisions `6`/`7`. Keep the release gated until one
  revision `8` retires and activates both axes atomically;
- no mock market, sample balance, secret, or prototype fixture is loaded in production.
