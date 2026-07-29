# Deploying NoxLimit

NoxLimit is a Node/pnpm monorepo with Solidity contracts, a shared protocol package, a versioned
Ethereum Sepolia catalog, one long-running Fastify service, and a Next.js web application. It is
testnet software and must not be used with production-value assets.

The commands below describe the implemented product. Current public release URLs and the manifest
chosen for the final hosted release belong in `SUBMISSION.md` once verified.

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

Recommended hosting boundaries:

- expose the web application and service through HTTPS;
- set service `HOST=0.0.0.0` inside a container or hosted process;
- set `WEB_ORIGIN` to the exact public web origin for CORS;
- mount immutable catalog revisions and an absolute reload-pointer file into the service;
- monitor `/v1/health` as structured data and require top-level, evaluator, and funding status to
  remain `READY`; also monitor worker ETH, treasury balances, RPC lag, and Gateway health;
- redact credentials, signatures, handles/proofs, candidates, and private-input material;
- deploy a new service process rather than overlapping two write-enabled replicas.

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

Stage every synchronized successor before the predecessor close. After the safe block reaches the
close, activate all affected axes atomically:

```bash
NOXLIMIT_OPERATOR_CONFIRM=ACTIVATE_SEPOLIA_SUCCESSORS \
  pnpm --filter @noxlimit/contracts operator:activate-successors
```

After reviewing the new hash-linked manifest, atomically update the service's configured catalog
pointer and send `SIGHUP`. The service verifies the candidate, builds a coherent projection, and
keeps the old catalog active if acceptance fails.

## Objective resolution and redemption

Resolution must use the first valid Chainlink observation at or after the market's resolution
timestamp and its adjacent predecessor. Select the pair read-only:

```bash
pnpm --filter @noxlimit/contracts operator:select-resolution-rounds
```

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
- no mock market, sample balance, secret, or prototype fixture is loaded in production.
