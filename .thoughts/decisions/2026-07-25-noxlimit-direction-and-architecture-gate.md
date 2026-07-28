# Decision: Adopt NoxLimit Direction and Review Its Architecture

**Date:** 2026-07-25  
**Decision owner:** User  
**Status:** Adopted

> **Checkpoint update (2026-07-28):** The user approved the canonical architecture and activated
> the bounded Prompt 3 spike. See
> [`../verification/2026-07-28-opus-architecture-review-reconciliation.md`](../verification/2026-07-28-opus-architecture-review-reconciliation.md)
> and [`CURRENT.md`](./CURRENT.md).

## Decision

NoxLimit is selected as the current WTF Hackathon product direction. Product discovery and
adversarial comparison are closed unless the user explicitly reopens them or executable evidence
contradicts a load-bearing assumption.

The selected first product remains:

> One public fixed-size `YES` or `NO` buy against a real outcome-share AMM, with a confidential
> minimum-output threshold while resting, browser-off Nox evaluation, one replay-safe atomic trade,
> and real cancel, expiry, refund, resolution, and redemption behavior.

The selected disposable-spike substrate is the pinned, unmodified Gnosis Conditional Tokens +
FPMM stack on Ethereum Sepolia. This is not an irreversible production-stack commitment.

## What This Authorizes

- consolidation and user review of one canonical system architecture;
- correction of stale routing, prompts, handoff, and historical verdict commands;
- the bounded 24–36-hour Prompt 3 spike **after** the user reviews and advances the architecture
  gate.

## What This Does Not Authorize

- a polished/full product build before the spike passes;
- a mock market, price, proof, trade, share, resolution, or redemption on the judged path;
- production-mainnet, audit-complete, anonymous, FHE, organic-liquidity, or latency-SLA claims;
- a return to broad product discovery or repeated verdict auditing without new evidence.

## Why the Prior State Changed

The earlier `unselected` state no longer reflected the user's direction. The user repeatedly chose
the NoxLimit/private prediction-market limit direction for deeper architecture work and explicitly
asked to understand the architecture before building.

The original independent `DROP` audit remains useful evidence but does not control workflow:

- its “no privacy demand” conclusion exceeded its evidence;
- its ordinary-backend equivalence omitted operator ignorance of the raw threshold;
- its claim that every false evaluation needed public decryption was contradicted by the released
  viewer-only Handle SDK path;
- it applied several production-hardening concerns too strictly to an eight-day hackathon gate.

The reassessment and independent reaffirmation therefore remain the current technical evidence
base, while product selection itself is the user's decision.

## Process Correction

The project had architecture-grade material spread across the hypothesis, product-reality brief,
reassessment, and reaffirmation, but stale “do not design,” `DROP`, and `unselected` language
remained actionable. That made agents re-adjudicate the idea instead of reusing established work.

The repair is:

1. one explicit authority order and reconciliation preflight;
2. one canonical architecture;
3. separate product, hackathon critical-path, implementation, submission, and production-hardening
   gates;
4. historical banners on superseded verdicts and prompts;
5. simultaneous updates to decision, routing, prompts, handoff, and verification artifacts.

## Canonical Artifacts

- [`CURRENT.md`](./CURRENT.md)
- [`AUDIT-GATES.md`](./AUDIT-GATES.md)
- [`../architecture/2026-07-25-noxlimit-system-architecture.md`](../architecture/2026-07-25-noxlimit-system-architecture.md)
- [`../verification/2026-07-24-noxlimit-drop-verdict-reassessment.md`](../verification/2026-07-24-noxlimit-drop-verdict-reassessment.md)
- [`../verification/2026-07-24-noxlimit-reaudit-reaffirmation.md`](../verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)

## Next Gate

The architecture checkpoint passed on 2026-07-28. Run
[`../../prompts/03-critical-path-verification.md`](../../prompts/03-critical-path-verification.md)
as the disposable spike only. Do not start the polished/full implementation until its verdict is
recorded and reviewed by the user.
