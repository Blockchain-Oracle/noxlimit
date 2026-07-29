# NoxLimit Polished-Build Authorization

**Date:** 2026-07-28
**Decision:** The user explicitly advanced the polished-build checkpoint and assigned Codex to plan
and implement the complete NoxLimit product.

## Authority change

The prior active route stopped after the user-approved architecture and successful Prompt 3 live
critical-path gate. The user has now stated that Codex is the builder, asked it to plan how to
achieve the product, and requested that implementation continue while a designer works from a
detailed product/user-flow package.

Therefore:

- Prompt 4 is authorized and is the active implementation contract.
- Product selection, architecture selection, and Prompt 3 are closed unless executable evidence
  invalidates a load-bearing assumption or the user explicitly reopens them.
- The canonical architecture remains the technical contract; no second architecture should be
  created.
- The designer handoff and product surface map are implementation inputs, not a pause gate.
- Work proceeds from implementation planning into the contract/domain foundation, terminal,
  worker/indexer/catalog, and complete live user path.

## Scope authorized

- repository structure, dependencies, application code, contracts, tests, local services, and
  documentation needed for the approved product;
- a polished terminal using the accepted DeepBook-informed product grammar;
- real Ethereum Sepolia integration after proportional local verification;
- a designer-ready user-flow and screen/state contract in parallel with engineering.

This authorization does not silently authorize a production-mainnet deployment, asset custody
beyond explicit testnet product contracts, submission on the user's behalf, or claims beyond the
verified evidence.

## Active product contract

NoxLimit remains:

- a curated BTC/USD and ETH/USD product, plus SOL/USD only after the Pyth path is live-verified;
- 1h/4h/24h objective price markets on Ethereum Sepolia;
- real Conditional Tokens + seeded FPMM outcome shares;
- a public, immutable per-order amount and side;
- a maximum average price protected under the Nox confidentiality boundary while genuinely
  resting;
- hosted browser-off evaluation with an explicit check budget;
- one atomic minimum-output-protected buy, followed by position, objective resolution, and
  redemption;
- truthful cancellation, expiry, separate refund, and monitoring-exhaustion behavior.

## Next action

Derive the research-backed implementation plan and Integration Reality Matrix from the canonical
architecture and the accepted live spike. Then begin the product contract/shared-domain foundation
without repeating discovery or Gate C.

The corresponding designer inputs are:

- [`../../DESIGNER_HANDOFF.md`](../../DESIGNER_HANDOFF.md)
- [`../stories/2026-07-28-noxlimit-product-stories.md`](../stories/2026-07-28-noxlimit-product-stories.md)
- [`../design/2026-07-28-noxlimit-product-surface-map.md`](../design/2026-07-28-noxlimit-product-surface-map.md)

## User-experience clarifications

The user's “try in 30 seconds” requirement is a universal first-use product law, not a special
hackathon evaluation path. Every user gets the same one-wallet onboarding, product-sponsored
Sepolia ETH and NoxLimit Test USDC funding, real trading chart/quotes, durable browser-off order
lifecycle, and recovery flow.

The design package also adopts the audited privacy timing: the NoxLimit application backend does
not receive the initial plaintext; the fixed evaluator learns the exact derived limit on an
eligible check; granting public decryption ends the resting privacy phase before final pool
execution. `Expiry ready → Expire order → Claim refund` is explicit, and NoxLimit's close time is
not misrepresented as a time guard in the unchanged FPMM.

The later user-approved discovery refinement is governed by
[`2026-07-28-noxlimit-market-stream-experience.md`](./2026-07-28-noxlimit-market-stream-experience.md):
mobile uses a TikTok-like vertical Market Stream, desktop uses the same stream as the terminal rail,
and every card leads into the complete analytical/review flow rather than one-tap execution.
