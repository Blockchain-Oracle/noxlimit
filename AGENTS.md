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
The polished contracts, protocol, catalog, service, and web now exist locally. The final 2026-07-29
local snapshot records contracts `62`, protocol `14`, catalog `6`, service `63`, and web `30`
passing tests (`175` total), plus Playwright `42` passing, `18` intentional project/viewport skips,
and zero failures. Root compile, type-check, test, and build gates pass, and the current responsive
1440px/390px baselines are green. Phases 0–5 and bounded
operator hardening are locally complete. The read-only Sepolia smoke is honestly degraded with an
empty catalog. The fresh BTC/ETH create-to-redeem deployment remains Phase 6 and still needs
external Sepolia gas funding plus live credentials/processes; local implementation is not live
product evidence.

The bounded operator now uses a plan-bound, cross-process-locked deployment journal with frozen
ordered steps and funding, `INTENT → SUBMITTED → CONFIRMED`, attempt-bound explicit `ADOPT`/`RETRY`
recovery, secret rejection, and hash-verified create-only outputs. It also enforces exact canonical
horizon/question input and mints only a verified shared-collateral shortfall. The next authorized
action is to fund the operator safely, deploy or resume one BTC/USD 4h and one ETH/USD 4h bundle,
activate the catalog, provision hosted worker/funding processes, and capture the complete live
browser-to-redemption proof.

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
  live-verified, the polished product layers are implemented locally, and bounded operator
  hardening is complete locally. What remains unverified is the live product release: safely
  funding the operator, a non-empty activated BTC/ETH catalog, hosted worker/funding provision,
  and the fresh browser-to-redemption trace.
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
