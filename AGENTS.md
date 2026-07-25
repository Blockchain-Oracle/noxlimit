# AGENTS.md

## Project Snapshot

This repository is the context and decision corpus for an iExec WTF Hackathon product.
**NoxLimit is the selected product direction for architecture review and bounded critical-path
verification.** It is not yet technically verified and no polished/full build has started. The
canonical architecture is
`.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md`; current authority is
`.thoughts/decisions/CURRENT.md`. The historical independent `DROP` audit was superseded after its
decisive demand, substitute, leakage, and sponsor-fit claims were rechecked.

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
- Maintain the canonical architecture as the shared technical contract. Do not start the polished
  product build until the user reviews it and the bounded Prompt 3 spike passes. A disposable
  integration spike is allowed only when the user advances that gate.

## Commands

There is no application build yet.

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
- The judge path has no local setup, faucet hunt, or second-wallet dependency.
- Nox is indispensable to a real state transition.
- Any selected concept must verify:
  `encryptInput → fromExternal → confidential compute → persisted handle → allowPublicDecryption → public proof → one-shot real action`.

## Context Workflow

- Start at `.thoughts/decisions/CURRENT.md`, then `.thoughts/decisions/AUDIT-GATES.md`, the canonical
  architecture, and `AGENT_HANDOFF.md`.
- Research lives in `.thoughts/research/`.
- Product candidates live in `.thoughts/ideas/`.
- The durable selection state lives in `.thoughts/decisions/CURRENT.md`; dated decision memos live
  beside it.
- Nox implementation reality lives in `.thoughts/wiki/`.
- Exact third-party commits live in `.thoughts/sources/source-manifest.md`.
- Staged agent prompts live in `prompts/`.
- `prompts/01a-hackathon-calibrated-noxlimit-reassessment.md` has run; its reaffirmation lives in
  `.thoughts/verification/2026-07-24-noxlimit-reaudit-reaffirmation.md`. Prompt 2 is waived because
  the user selected the direction. After architecture review, the next technical step is only the
  bounded Prompt 3 spike. The original independent audit is preserved as history.
  `prompts/00-docs-first-product-discovery.md` remains the discovery rerun; the older
  `01-refresh-reality-and-ideas.md` is historical.

## Do Not

- Do not commit `.thoughts/raw/`; it contains local third-party mirrors.
- Do not republish winner or iExec-Nox source trees.
- Do not inherit the old QuietRound recommendation without rerunning selection.
- Do not inherit SLA Lock or either `NONE SURVIVE` verdict without reading the dated evidence. The
  newest docs-first verdict is current research state, not a selected product.
- Do not reopen product selection or inherit NoxLimit as technically verified. The direction is
  selected; only its live feasibility remains conditional.
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
