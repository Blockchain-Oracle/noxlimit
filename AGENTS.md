# AGENTS.md

## Project Snapshot

This repository is the context and decision corpus for an iExec WTF Hackathon product.
**NoxLimit is the selected product direction, its canonical architecture was approved by the user
on 2026-07-28, Prompt 3 is `GO`, and the polished build is explicitly authorized.** Gates A/B pass locally, and live Gate C completed the Nox
privacy trace plus a real FPMM fill on Ethereum Sepolia. Public evidence is in
`spike/nox/evidence/sepolia-gate-c.json`. Prompt 4 is active; the product stories, surface map, and
designer handoff are implementation inputs. The canonical architecture is
`.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md`; current authority is
`.thoughts/decisions/CURRENT.md`. The historical independent `DROP` audit was superseded after its
decisive demand, substitute, leakage, and sponsor-fit claims were rechecked. The architecture now
includes the user-directed DeepBook-inspired BTC/ETH/verified-SOL terminal, 1h/4h/24h horizons,
truthful FPMM quote ladder, typed client boundary, and accepted post-gate Opus corrections. The
user also adopted the hybrid discovery contract: a TikTok-like vertical Market Stream on mobile,
the same stream as the desktop terminal rail, and full analysis/review before any order action.
The polished contracts, protocol, catalog, service, and web now exist. The fresh post-breadth root
`pnpm check` records contracts `84`, protocol `14`, catalog `6`, service `69`, and web `62` passing
tests (`235` total), with compile, type-check, test, and build gates green. The fresh
dedicated Playwright snapshot records `45` passing journeys, `21` intentional project/viewport
skips, and zero failures; rerun it at the submission commit. Phases 0–5 and bounded operator
hardening are complete. Phase 6 has advanced through real deployment and the atomic corrected-route
cutover on branch `codex/noxlimit-polished-product`: commit `d28f307` publishes runtime catalog
revision `8` at
`packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-corrected-rotated.json`, with catalog hash
`0x577593192efb7cf139267b3d076eb5e846fd15d1ab080611f9d504b716b4b427`. It hash-links revision `7`
(`0xe20fc416f695552619d5701ece6b4dd05ad934890387807551237b5fb424dcca`) and became effective at
Sepolia block `11,375,905`, timestamp `2026-07-29T13:53:36Z`, block hash
`0x2a37a64bd6e1c86dd4bbb80f67cf803be9f58d93427fc84d26f59861fcbf1c76`. A controlled service
stop → catalog-pointer update → single startup adopted revision `8`; health was `READY` on the
same hash, and revisions `6`/`7` were never served. Corrected BTC market
`0x37a7b5826c9ba1209470b98cd38a38f4e3e6cb448c353333138bfced7fbaf0a2` and ETH market
`0xa5219adaa2c86c0419cc7d9b05188784192ee023a7c3c27bab3f0cc8eaf8fc8a` remain catalog `ACTIVE`.
At the `2026-07-29T15:34:12Z` service snapshot, both reported lifecycle `ORDERING_OPEN` and dynamic
tradeability `TRADEABLE`.

Phase 6 settlement is partial/degraded. The retired BTC predecessor completed real browser
resolution, winning-user redemption, and builder-LP redemption. The retired ETH predecessor cannot
resolve under its immutable 3,600-second observation-delay policy: the exact first post-deadline
Chainlink observation arrived at `+3,624s`, 24 seconds outside the bound. The accountless selector
rejected before any write, the resolver and payout vector remain unset, and ETH user/LP positions
remain unredeemable. Do not claim an ETH winner or a paired BTC/ETH complete vertical. Public
frontend/service URLs, the video, X post, and submission form/contact fields are pending. Local
container build/smoke evidence is not public hosting.

The corrected active replacements are deployed, validated, and seeded with 50,000,000 YES and
50,000,000 NO atoms each. Both use a 14,400-second observation bound. Their synchronized source is
the
[corrected strike plan](.thoughts/evidence/2026-07-29-sepolia-corrected-successor-strike-plan.json),
with [BTC](.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-deployment.json)
and [ETH](.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-deployment.json)
deployment evidence. Revisions `6`/`7` are historical staging manifests and were never served.
The former revision-5 routes are `RETIRED`; the
[BTC](.thoughts/evidence/2026-07-29-sepolia-btc-usd-4h-successor-liquidity-close.json) LP close in
transaction `0xe811190d41186d666b5b90b7938edcdd974a1a8c48fad9fa7f18b8ebf9946b4b`
(block `11,375,985`) and
[ETH](.thoughts/evidence/2026-07-29-sepolia-eth-usd-4h-successor-liquidity-close.json) LP close in
transaction `0xcfd96ad20aec7d2a6f82c30f908cfbb021d62a7118e7a861f0bf9b88a4ed52b5`
(block `11,375,990`) each reduced LP shares to zero. Each unresolved removal leaves 50,000,000 YES
and 50,000,000 NO position atoms with the builder; do not claim those positions were redeemed.
Each corrected OrderBook now returns `nextOrderId = 3`: BTC NO order `1`, BTC YES order `2`, ETH
YES order `1`, and ETH NO order `2` were created through the browser, filled by the browser-off
worker, and confirmed from a fresh browser. The four redacted records are
[BTC NO](.thoughts/evidence/2026-07-29-r8-corrected-btc-no-order.json),
[BTC YES](.thoughts/evidence/2026-07-29-r8-corrected-btc-yes-order.json),
[ETH YES](.thoughts/evidence/2026-07-29-r8-corrected-eth-yes-order.json), and
[ETH NO](.thoughts/evidence/2026-07-29-r8-corrected-eth-no-order.json). Receipt and ERC-1155
checks prove respective user positions of 1,941,161, 1,978,831, 1,941,161, and 1,978,831 outcome
atoms, with zero matching position balance left in either OrderBook. Corrected-route objective
resolution, winning-user redemption, and builder-LP redemption remain pending; do not call either
route a complete vertical yet. The approved BTC/ETH 1h and 24h bundles are now deployed,
independently validated, and active beside the corrected 4h pair in runtime revision `12` at
`packages/catalog/sepolia/markets-2026-07-29-btc-eth-horizons-eth-24h.json`, catalog hash
`0x21083cbce01a121d253ff1114b77c9d12035e596ce89c9ad58411f3e06711a6e`. Its ten records contain
four retired and six active routes covering BTC/ETH 1h/4h/24h. Revisions `9` through `12` were
adopted sequentially and the service is `READY` on revision `12`; the four new routes correctly
reported `UPCOMING` before their shared `2026-07-29T17:30:00Z` start. Public Cloud Run/service
hosting is billable and needs explicit user cost and provider authorization before resource
creation.

The bounded operator uses a plan-bound, cross-process-locked deployment journal with frozen
ordered steps and funding, `INTENT → SUBMITTED → CONFIRMED`, attempt-bound explicit `ADOPT`/`RETRY`
recovery, secret rejection, and hash-verified create-only outputs. It also enforces exact canonical
horizon/question input and mints only a verified shared-collateral shortfall. New official Sepolia
BTC/ETH deployments enforce a 14,400-second minimum observation-delay bound while preserving the
same unique first-observation adjacency proof; runtime oracle quote freshness remains independently
3,600 seconds. The BTC 1h deployment exercised safe submitted-transaction recovery: its first
treasury-collateral top-up reverted out of gas under an exact estimate, the
[recovery record](.thoughts/evidence/2026-07-29-sepolia-btc-usd-1h-deployment-recovery.json)
preserves that receipt, and attempt-bound `RETRY` succeeded after Hardhat `gasMultiplier = 1.2`. A covered runtime-
acceptance fix now treats future catalog-`ACTIVE` markets as `UPCOMING`; the service suite passes
`69` tests. Preserve the completed BTC evidence and terminal ETH rejection. Do not poll or write the
retired ETH resolver again, and do not substitute a later round. Revision `12` is current: do not
roll back to revision `5`/`8`, serve revisions `6`/`7`, or reopen the completed paired cutover.

## Working Rules

- Before acting, reconcile context: read `.thoughts/decisions/CURRENT.md`,
  `.thoughts/decisions/AUDIT-GATES.md`, the canonical architecture, and `AGENT_HANDOFF.md`; inspect
  `git status`, relevant history, and existing `.thoughts/` artifacts.
- State what is already established, what is genuinely unknown, which artifacts are historical,
  and the next authorized action. Search the corpus before claiming research or architecture is
  missing.
- When artifacts conflict, follow the authority order in `.thoughts/decisions/AUDIT-GATES.md`.
  Historical `STOP`, `DROP`, and “do not build” commands are evidence, not current instructions.
- Read `.thoughts/wiki/nox-use-case-map.md` before product discovery. The generated
  `llms-full.txt` omits the Vue-rendered use-case cards and category grid.
- Use the newest dated research and idea files; preserve older artifacts as history.
- Separate verified facts, inferences, and unknowns.
- Recheck current hackathon rules, packages, chain state, and competitor claims before relying on
  them.
- Treat Nox as confidential TEE computation, not anonymity or FHE.
- Apply a hackathon-appropriate risk standard: require real non-mock Sepolia behavior, immutable
  order binding, no obvious asset loss, replay protection, atomic limits, and honest privacy
  claims. Do not turn mainnet availability, professional auditing, formal verification, organic
  liquidity, decentralized keepers, production economic modelling, or SLA distributions into
  pre-build vetoes; record them as post-hackathon hardening.
- Maintain the canonical architecture as the shared technical contract. The user approved it and
  advanced Prompt 3 on 2026-07-28. Local Gates A/B and live Gate C passed, and the user explicitly
  advanced the polished-build checkpoint. Do not rerun discovery or Gate C; execute Prompt 4 and
  reconcile executable changes back into the canonical contract.
- The user controls pacing. Historical hackathon dates, spike clocks, and agent estimates do not
  force deployment, scope cuts, or correctness tradeoffs. Keep protocol times—trading close,
  resolution, order expiry, and recovery timeouts—distinct from project scheduling.

## Mandatory Implementation Preflight

Before editing product code, tests, schemas, infrastructure, or deployment scripts:

1. Run the Abu Context Engineering `context-reconciliation` workflow. Inventory the existing
   corpus, then read the active phase in the implementation plan, the relevant product stories and
   product-surface sections, the canonical architecture, current handoff, and the implementation
   and tests already present. Do not implement from the latest message or an isolated checklist.
2. Trace the proposed slice end to end: current phase → user-visible outcome and flow → product
   law/privacy boundary → architecture invariant → existing code path → acceptance test. If that
   trace cannot be explained, continue reconciling before mutation; ask the user only when current
   authorities genuinely conflict.
3. Before the first edit, state a compact context snapshot in commentary or the task artifact:
   objective and phase, user outcome, canonical authority, established behavior, superseded
   history, genuine unknowns, exact bounded change, files/preservation boundaries, and proof of
   completion. Search before claiming any research, architecture, feature, or test is missing.
4. Work phase by phase and one reviewable slice at a time. Preserve accepted flows outside the
   slice, especially the normal 30-second first-use experience, direct-to-Nox private-input path,
   real onchain asset movement, explicit recovery actions, and `spike/**` evidence.
5. After implementation, run the phase-appropriate tests and verify the user-visible acceptance
   behavior—not only compilation. When accepted behavior or phase status changes and context
   maintenance is authorized, reconcile the canonical decision, plan, routing, and handoff
   together so the next agent inherits one current story.

## Commands

The polished product build is active across `packages/contracts`, `packages/protocol`,
`packages/catalog`, `apps/service`, and `apps/web`; `spike/market` and `spike/nox` remain immutable
reproduction evidence.

```bash
pnpm compile
pnpm typecheck
pnpm test
# Historical/reproduction only:
(cd spike/market && pnpm test && pnpm verify:provenance)
(cd spike/nox && pnpm test)
# Live Gate C already passed; do not rerun during ordinary implementation:
(cd spike/nox && pnpm gate-c:sepolia)
```

Useful corpus checks:

```bash
rg --files --hidden -g '!.git/**' -g '!.thoughts/raw/**'
rg --hidden -n 'TODO|TBD|Unknown|Contradict' README.md AGENT_HANDOFF.md .thoughts prompts \
  -g '!.thoughts/raw/**'
gh search repos 'iexec nox created:>=2026-07-01' --limit 100
```

For any SDK, API, library, framework, CLI, or cloud-service question, fetch current documentation
through Context7 before answering or implementing:

```bash
npx ctx7@latest library '<official library name>' '<full task question>'
npx ctx7@latest docs '/org/project' '<full task question>'
```

Run `library` first, select the closest high-reputation result, then pass its exact `/org/project`
ID to `docs`. Use a versioned ID when the task is version-specific and use no more than three
Context7 commands per question. Do not send credentials or secrets in the query. If Context7 reports
a quota error, surface it and suggest `npx ctx7@latest login` or `CONTEXT7_API_KEY` instead of
silently guessing from memory.

## Quality Gates

- Every product claim has a source or is labeled as an inference.
- Candidate ideas avoid previous-winner and visible-current-project collision.
- Every user's first-use path has no local setup, faucet hunt, or second-wallet dependency.
- Discovery uses only verified/deployed/seeded market cards, deterministic visible sorting, and no
  one-tap execution, fake personalization, social mechanics, or silent loss of an edited ticket.
- Nox is indispensable to a real state transition.
- Any selected concept must verify:
  `encryptInput → fromExternal → confidential compute → persisted handle → allowPublicDecryption → public proof → one-shot real action`.
- Preserve the adopted post-gate corrections: no owner abandonment from `PublicationPending`;
  nonce/check coupling across timeouts; explicit `MonitoringExhausted`; resolver-first immutable
  market bundles; deterministic market IDs; named API statuses; and product-strength boundary and
  mutation tests. The polished contract/client must also enforce market close onchain, use
  composite order references with an explicit refund action, and prevent settlement-round
  cherry-picking.

## Context Workflow

- Start at `.thoughts/decisions/CURRENT.md`, then `.thoughts/decisions/AUDIT-GATES.md`, the canonical
  architecture, and `AGENT_HANDOFF.md`.
- Research lives in `.thoughts/research/`.
- Product candidates live in `.thoughts/ideas/`.
- The accepted technical contract lives in `.thoughts/architecture/`; update the canonical file
  named by `CURRENT.md` rather than creating a competing architecture.
- The durable selection state lives in `.thoughts/decisions/CURRENT.md`; dated decision memos live
  beside it.
- Nox implementation reality lives in `.thoughts/wiki/`.
- Exact third-party commits live in `.thoughts/sources/source-manifest.md`.
- Staged agent prompts live in `prompts/`.
- `prompts/01a-hackathon-calibrated-noxlimit-reassessment.md` has run; its reaffirmation lives in
  `.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md`. Prompt 2 is waived because
  the user selected the direction. The user approved the architecture on 2026-07-28; Prompt 3 is
  `GO`, and the user advanced the polished-build checkpoint. The original independent audit is
  preserved as history. `prompts/04-polished-product-implementation.md` is the active build
  handoff. `prompts/05-designer-agent-handoff.md` is the parallel design workflow and inherits the
  adopted Market Stream + terminal decision; its visual directions cannot remove that hybrid.
  Its design workflow is closed: visual direction `Complement` is adopted with a Reclaim-inherited palette
  (`.thoughts/design/2026-07-28-noxlimit-visual-direction-selection.md`); `Vigil` and `Caliper` are
  rejected history and must not be revived without a new recorded decision. Directions,
  foundations, Batches A–C, responsive compositions, and the prototype are durable local sources
  under `.thoughts/design/html/`; their sample values are never live product data.
  `prompts/00-docs-first-product-discovery.md` remains the discovery
  rerun; the older
  `01-refresh-reality-and-ideas.md` is historical.

## Do Not

- Do not commit `.thoughts/raw/`; it contains local third-party mirrors.
- Do not republish winner or iExec-Nox source trees.
- Do not inherit the old QuietRound recommendation without rerunning selection.
- Do not inherit SLA Lock or either `NONE SURVIVE` verdict without reading the dated evidence. The
  newest docs-first verdict is current research state, not a selected product.
- Do not reopen product selection or rerun Prompt 3. The bounded technical critical path is
  live-verified, the polished layers and operator hardening are complete, and the committed Phase 6
  evidence now includes a non-empty activated BTC/ETH catalog, seven browser-off fills—three on
  predecessor routes and four on corrected routes—and one
  complete BTC browser-to-user/LP-redemption vertical. ETH is a terminal immutable-policy rejection,
  not pending settlement or a second winner. Corrected 14,400-second BTC/ETH routes are active
  together in revision `8`; revision `5` is retired and revisions `6`/`7` were never served. Their
  former LP shares are zero, while the unresolved YES/NO positions remain. Durable public hosting
  and submission assets remain unverified; do not roll back or repeat the completed cutover. The
  corrected routes now prove browser creation and browser-off fills on both sides, but neither is a
  complete vertical until objective resolution and user/builder redemption evidence is preserved.
  Keep those settlement/redemption proofs pending. BTC/ETH 1h/24h breadth is complete in revision
  `12`; preserve its four deployment records and sequential r9→r12 adoption instead of redeploying
  it. Do not create billable hosting resources without explicit user cost/provider authorization.
- Do not create a second NoxLimit architecture. Update the canonical architecture when executable
  evidence requires a change.
- Do not inherit the independent audit's claim that every failed evaluation needs an explicit
  public-decryption proof. Recheck the released `select`, `addViewer`, private `decrypt`, and
  honest-worker-gated publication path while preserving timing/non-action inference as a risk.
- Do not describe DarkOdds as a Polymarket router; it built native Nox markets and used Polymarket
  only as a read-only display source.
- Do not use unreleased Nox `main` APIs against current published packages or the live Sepolia ABI.
- Do not claim mock or self-reported data is a real end-to-end product path. Builder-seeded
  liquidity is acceptable when it is a real onchain pool and is labeled honestly; it is not
  evidence of organic liquidity.
