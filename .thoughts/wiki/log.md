# iExec-Nox wiki log

## 2026-07-23 — docs-first candidate audit completed

- Investigated nine concrete products across Invoicing/Payments, DeFi/Lending, Vaults/Yield,
  Identity, NFT, and Prediction Markets.
- Separately pressure-tested the two initial near-survivors: Private Quote-to-Pay and a
  Confidential Closed-Loop Gift Card.
- Rejected Quote-to-Pay after finding a direct PaySec collision, a current optimized ERC-7984
  callback-amount ACL mismatch, public wrap/relationship leakage, and a failed fresh-user path.
- Rejected the gift card after verifying ordinary issuer-database equivalence, visible or trusted
  funding, weak independent-entitlement demand, Sigill/FHE2P collision, and consumer-card policy
  scope.
- Recorded the final `NONE SURVIVE` verdict. Product selection, Prompt 2, architecture, and
  implementation remain blocked pending genuinely new evidence.

## 2026-07-23 — complete documentation and use-case correction

- Read the complete 7,090-line `llms-full.txt` capture, the supplied attachment, and the current
  documentation source at commit `ce4262e`.
- Found that `llms-full.txt` silently omits the Vue-rendered Use Cases product cards and ten-category
  application grid.
- Added an evidence-tiered product map covering shipping references, executable building blocks,
  detailed concept pages, and all ten official application categories.
- Reopened lending, invoicing, identity-shaped, NFT, and other docs-led directions for research
  while preserving current runtime limits and collision checks.
- Reverified from contract source and live chain state that DarkOdds was a native Nox prediction
  market; its Polymarket integration was display-only.

## 2026-07-23 — feasibility-first product reset

- Retired every historical front-runner; no product is currently selected or leading.
- Recorded the user's rejected product families as exclusions rather than candidates to rename.
- Added a winner-pattern and shipping-product research prompt that makes feasibility a veto.
- Preserved old idea reports as historical collision and rejection evidence only.

## 2026-07-23 — winner and opportunity audit

- Verified the previous VIBE winner ranking: Diam first, RWAOS second, and DarkOdds third.
- Cloned and inspected each entry-linked winner repository at an explicit commit SHA.
- Confirmed the current WTF suggested targets are optional and the 13-submission DoraHacks list is private.
- Refreshed the public July competitor scan to 20 repositories and recorded the crowded lanes.
- Demoted QuietRound to a backup and made SLA Lock the current front-runner hypothesis.
- Added a revised product menu, durable decision pointer, agent handoff, staged prompts, and an
  export-safe source manifest.
- Preserved the exact 20-repository competitor snapshot and corrected the payroll lane to eight.

## 2026-07-22 — organization-wide source audit

- Mirrored all 20 public iExec-Nox repositories at explicit commit SHAs.
- Added exact release/tag mirrors for the deployable contracts, Handle SDK, Hardhat plugin, and confidential-contract examples.
- Verified the Ethereum Sepolia proxy implementation, initializer version, gateway, KMS public key, and proof TTL directly over RPC.
- Reconciled documentation against release source and identified material contradictions in network support, compiler version, type support, handle layout, plaintext exposure, ACL semantics, readiness, and security language.
- Audited official Confidential Token and cVault POCs for reusable frontend and proof-finalization patterns.
- Updated the QuietRound direction: direct reviewer calls, release-pinned APIs, async proof/finalize UX, contract-owned lifecycle state, and minimal winner disclosure.
