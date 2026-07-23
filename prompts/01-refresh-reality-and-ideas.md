# Prompt 1: Refresh Reality and Generate Ideas

You are inheriting an iExec WTF Hackathon research repository. Your task is to refresh current
reality and produce a ranked product-idea menu. Do not write a product spec, implementation plan,
architecture, stories, or code.

Start by reading, in order:

1. `README.md`
2. `AGENT_HANDOFF.md`
3. `.thoughts/research/2026-07-23-iexec-wtf-winners-and-opportunity-space.md`
4. `.thoughts/ideas/2026-07-23-iexec-wtf-product-ideas.md`
5. `.thoughts/wiki/index.md`
6. `.thoughts/wiki/nox-known-contradictions.md`
7. `.thoughts/sources/source-manifest.md`

Then browse current primary sources and verify anything that could have changed:

- https://dorahacks.io/hackathon/wtf-hackathon/detail
- https://dorahacks.io/hackathon/wtf-hackathon/buidl
- https://dorahacks.io/hackathon/vibe-coding-iexec/winner
- https://dorahacks.io/buidl/43636
- https://dorahacks.io/buidl/43431
- https://dorahacks.io/buidl/43656
- https://github.com/orgs/iExec-Nox/repositories
- https://eips.ethereum.org/EIPS/eip-8183
- https://eips.ethereum.org/EIPS/eip-8004

Search GitHub and the web for new WTF entries, especially any Nox integration involving agent
commerce, ERC-8183, ERC-8004, SLAs, service credits, insurance claims, committee oracles,
DataProtector quotas, EAS moderation, or confidential eligibility.

Hard rules:

- The organizer's wallet, DeFi, and treasury examples are optional.
- A previous VIBE project cannot be reused.
- Exclude the previous winner lanes: confidential OTC/sealed RFQ/Vickrey trading, broad
  RWA/tokenization/compliance operating systems, and confidential prediction markets/wagering.
- Heavily penalize the visible current clusters: payroll, Safe policy, private swaps, Aave
  credit/liquidation, donations, milestone escrow, CVE audit trails, and generic DeFi strategy
  agents.
- Nox must be economically indispensable. “A number is encrypted” is not enough.
- Nox is confidentiality, not anonymity. Do not claim FHE, invisible addresses, or that nobody sees
  plaintext.
- Prefer sensitive numeric inputs, confidential arithmetic/comparison/select, minimal disclosure,
  and a proof-gated real action.
- The first judge experience must require no local setup, faucet hunt, or second wallet. Treat
  “30 seconds” as a zero-friction comprehension target, not a guaranteed Nox settlement time.
- Any “real product” claim needs a current shipping product, standard, regulation, or user workflow
  as evidence.
- If you discuss an SDK/API/library, follow the two-step `ctx7 library` then `ctx7 docs` procedure
  in `AGENTS.md` and use current official documentation.

Output:

1. A short “what changed” section.
2. Facts, inferences, and unknowns kept separate.
3. Six to ten candidates. For each include:
   - plain name;
   - “like X, but…” analogy;
   - real user and problem;
   - why public-chain transparency breaks the workflow;
   - why Nox is essential;
   - zero-friction judge try path;
   - current product/trend/feasibility source;
   - build difficulty;
   - collision and kill risks.
4. A scored ranking using:
   `tryability × Nox necessity × product reality`.
5. A top three.

Save facts and market changes to a new dated file in `.thoughts/research/` and the ranked candidate
menu to a new dated file in `.thoughts/ideas/`. Do not overwrite historical artifacts. End both
files with their evidence date and unresolved questions so Prompt 2 has authoritative inputs.

Stop after the top three. Do not select architecture or start building.
