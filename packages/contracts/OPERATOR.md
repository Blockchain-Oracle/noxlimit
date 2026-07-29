# Sepolia market-bundle operator

The operator defaults to a read-only plan. It does not accept private thresholds and never prints
or serializes an RPC credential or private key. Start from `operator.env.example`, copy it to an
ignored local file, replace every placeholder, and source it in the current shell.

Build the authoritative schema and contracts before operating:

```bash
pnpm --filter @noxlimit/protocol build
pnpm --filter @noxlimit/catalog build
pnpm --filter @noxlimit/contracts compile
```

Then run the plan. This validates every required non-secret setting plus the complete catalog hash
chain, prints a redacted action list, performs no network connection, and creates no output file:

```bash
pnpm --filter @noxlimit/contracts operator
```

## Network actions

Read-only verification needs `SEPOLIA_RPC_URL`, the finalized catalog candidate at
`NOXLIMIT_CATALOG_OUTPUT_PATH`, `NOXLIMIT_COLLATERAL_ADDRESS`,
`NOXLIMIT_FUNDING_TREASURY_ADDRESS`, and `NOXLIMIT_LP_OWNER`:

```bash
pnpm --filter @noxlimit/contracts operator:validate
```

Deployment additionally needs `SEPOLIA_OPERATOR_PRIVATE_KEY` supplied by the current shell or a
secret manager. It refuses every network except chain `11155111`, checks external runtime code,
uses resolver-first deployment order, seeds the unchanged FPMM, verifies all immutable bindings,
and publishes only to the two explicit create-only output paths after their payloads are staged in
the deployment journal. On a fresh run the journal and both outputs must be absent; on resume,
already published outputs must hash-match the staged payload exactly.

```bash
NOXLIMIT_OPERATOR_CONFIRM=DEPLOY_SEPOLIA_BUNDLE \
  pnpm --filter @noxlimit/contracts operator:deploy
```

For the first bundle, omit `NOXLIMIT_COLLATERAL_ADDRESS` and
`NOXLIMIT_FUNDING_TREASURY_ADDRESS`; the operator deploys NLTUSDC and the shared funding treasury.
For every later bundle, supply both addresses. The operator verifies the treasury's immutable
collateral and claim policy, reuses it, verifies NLTUSDC code/metadata/six-decimal issuer ownership,
and mints only the exact collateral shortfall required by the frozen pool-seed and treasury targets.
It tops balances only to the configured minimums. This keeps one user funding surface rather than
creating an unusable treasury per market.

The declared market horizon is exact: `resolvesAt - startsAt` must be precisely the configured
`1h`, `4h`, or `24h` duration, and `NOXLIMIT_QUESTION` must equal the canonical
asset/strike/resolution-UTC question printed by the plan. A prose-equivalent question is rejected.

## Resuming an interrupted deployment

The deployer automatically creates
`<NOXLIMIT_EVIDENCE_OUTPUT_PATH>.journal.json` before its first chain write. The journal freezes the
plan hash, operator, Sepolia chain, absolute output paths, ordered expected steps, and exact funding
plan. A cross-process lock allows only one process to advance it. Steps persist as
`INTENT → SUBMITTED → CONFIRMED`; submitted and confirmed steps resume without sending a
replacement.

If a process exits after recording `INTENT` but before recording its transaction hash, the next run
fails closed. Inspect the operator account and chain first. Then set exactly one attempt-bound
recovery in `NOXLIMIT_DEPLOYMENT_RECOVERY_JSON`:

```bash
# Adopt the transaction only after confirming this is the hash sent for attempt 1.
NOXLIMIT_DEPLOYMENT_RECOVERY_JSON='{"resolverDeployment":{"action":"ADOPT","expectedAttempt":1,"transactionHash":"0x..."}}'

# Retry only after proving attempt 1 never broadcast a transaction.
NOXLIMIT_DEPLOYMENT_RECOVERY_JSON='{"resolverDeployment":{"action":"RETRY","expectedAttempt":1}}'
```

`expectedAttempt` is mandatory and prevents an old recovery instruction from applying to a later
attempt. Recovery is per step; do not include unrelated entries. The journal rejects credentials,
private keys, RPC URLs, signatures, ciphertext/proof material, and other secret-bearing fields.
Final evidence and catalog payloads are staged and hash-checked before create-only publication, so
restarting after one output was written verifies and completes the exact remaining output.

Resolution is one-shot onchain and idempotent in the operator. First run the catalog-bound,
read-only selector. It takes a coherent safe-block snapshot, walks adjacent proxy rounds backward
from `latestRoundData`, verifies same-phase or prior-phase-terminal adjacency, and prints the exact
public IDs as `resolveEnvironment`. It fails closed before an observation is ready, when the first
one is too late, or if observation/phase/scan-bound evidence is invalid:

```bash
pnpm --filter @noxlimit/contracts operator:select-resolution-rounds
```

Copy its three `resolveEnvironment` values into the current shell. The write operator then
re-verifies the supplied pair through the resolver simulation before sending the one-shot action:

```bash
NOXLIMIT_OPERATOR_CONFIRM=RESOLVE_SEPOLIA_MARKET \
pnpm --filter @noxlimit/contracts operator:resolve
```

When several ACTIVE axes share one trading close, stage every replacement as `SUCCESSOR` before
that close and cut all of them over in one revision. The accountless operator pins one safe block,
verifies every predecessor and successor binding, resolver/feed policy, runtime hash, LP owner, and
positive pool balance, rechecks the block hash, then creates one hash-linked catalog file without a
chain write:

```bash
NOXLIMIT_OPERATOR_CONFIRM=ACTIVATE_SEPOLIA_SUCCESSORS \
pnpm --filter @noxlimit/contracts operator:activate-successors
```

`NOXLIMIT_CUTOVER_PAIRS_JSON` is a nonempty array of `{predecessorMarketId,
successorMarketId}` objects. Omitting any other ACTIVE route already closed at the shared snapshot
fails closed; single-axis `operator:activate-successor` remains available when no synchronized
close exists.

Liquidity close verifies the FPMM/CTF/collateral/condition binding, removes only the operator's LP
shares, and redeems held outcome positions when the condition is resolved. Repeating the same
completed action has no chain effect. If LP positions were closed before resolution, run it after
resolution with a new evidence path to redeem:

```bash
NOXLIMIT_OPERATOR_CONFIRM=CLOSE_SEPOLIA_LIQUIDITY \
  pnpm --filter @noxlimit/contracts operator:close-liquidity
```

## Safety and external gates

- `operator` is the default and is plan-only; every chain-writing command also requires an exact,
  action-specific `NOXLIMIT_OPERATOR_CONFIRM` value.
- `sepolia` has no configured account. `sepoliaOperator` obtains its one account lazily from
  `SEPOLIA_OPERATOR_PRIVATE_KEY`; no script reads or includes that variable in output.
- Catalog history is an ordered JSON array of absolute manifest paths from bootstrap through the
  current head. The candidate output is not included until it is reviewed and published.
- Output is create-only. Existing files are never overwritten.
- Deployment journal state is plan-bound and cross-process locked. Never delete or edit a journal
  to force progress; use the attempt-bound `ADOPT`/`RETRY` recovery described above.
- Live execution remains gated on a funded operator, a reliable Sepolia RPC, current official
  Chainlink proxy addresses, verified deployed Gnosis CTF/FPMM addresses, a worker address, exact
  source commits, safe strike/times/policies, and enough NLTUSDC/Test ETH for seed and treasury
  minimums. The plan uses no invented fallback for any of them.

The next live run is one BTC/USD 4h and one ETH/USD 4h bundle. Safely fund the operator first, then
deploy or resume both journals, activate the verified catalog, provision the hosted worker/funding
path, and record the complete browser → Nox → FPMM → objective resolution → redemption evidence.
That fresh Phase 6 proof has not yet occurred.
