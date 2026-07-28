# NoxLimit Architecture Approval and Opus 5 Review Reconciliation

> **Historical checkpoint:** This memo activated Prompt 3. Prompt 3 later completed at `GO`; follow
> [`CURRENT.md`](../decisions/CURRENT.md) and the
> [critical-path verification](./2026-07-28-noxlimit-critical-path.md) for active routing.

> **User scheduling correction (2026-07-28):** Finding 3 and the clock section below describe only
> how the completed disposable spike was run. They are superseded as workflow advice. Do not pass
> their project-clock pressure into a new review, force deployment, cut approved scope, or weaken
> correctness because of them. The user controls pacing; protocol close/resolution/expiry/recovery
> times remain separate technical requirements.

**Date:** 2026-07-28
**Gate:** Architecture review → bounded hackathon critical-path verification
**Decision owner:** User
**External reviewer:** Claude Code, exact model `claude-opus-5`, no fallback
**Reviewed diff:** `0bc3d8e...a5c9f98`
**Outcome:** Architecture approved; Prompt 3 active after targeted corrections

## Decision

The user approved the canonical NoxLimit architecture and then requested an independent Claude Code
review using Opus 5. The review completed successfully and returned seven findings. They were
verified against current authority, released v0.2.4 source, the Handle SDK, the architecture, and
the hackathon risk standard before any edit.

The review does not reopen product selection. Its two load-bearing observations refine the worker
trust and privacy boundary and become explicit Prompt 3 experiments. One claimed API mismatch is
factually rejected, while its narrower executable-evidence concern is retained.

## Reconciliation Snapshot

- **Objective:** Make one approved architecture accurately describe its trust/privacy boundary,
  then run the disposable Nox/FPMM critical-path spike.
- **Canonical authority:** User approval → `CURRENT.md` → canonical architecture → this exact-gate
  reconciliation → Prompt 3.
- **Established:** NoxLimit is selected; FPMM's fixed-input quote, native atomic `minOut`,
  balance-delta forwarding, and outer `try/catch` recovery shape are sound at architecture level.
- **Historical:** The independent `DROP`, its reassessment, and the 2026-07-25 architecture PASS
  remain evidence; none routes current work.
- **Genuine unknowns:** Live viewer/private decrypt, public proof retrieval, nonce-distinct handle
  isolation, typed onchain proof consumption, real legacy pool lifecycle, and the combined Sepolia
  trade.
- **Mutation safety:** Context repair and the disposable Prompt 3 spike are authorized. A polished
  build is not.

## Finding Dispositions

| # | Review finding | Disposition | Verified evidence | Adopted action |
|---:|---|---|---|---|
| 1 | Fixed worker can kill an order by requesting publication and abandoning it | **Accept, narrowed** | The contract cannot know candidate plaintext before proof. After `allowPublicDecryption`, however, public proof retrieval is open and finalization can be permissionless. | Document worker-forced disclosure/terminal-refund power; restrict publication request to the worker, make finalization permissionless, and test third-party rescue plus full refund. |
| 2 | Repeated evaluations bracket the private threshold | **Accept risk; reject deterministic two-sided claim** | `ViewerAdded` and evaluation timing are public, but silence is also consistent with worker/Gateway failure or censorship. A zero candidate gives the worker one inequality; an eligible candidate gives it exact `minOut` even before publication. A public observer gets only assumption-dependent evidence until success publishes exact `minOut`. | Add honest privacy copy and a public-only Gate A watcher with a delayed-eligible control and tick-width measurement. |
| 3 | No remaining-time reckoning | **Historical only; superseded by the user's scheduling correction** | This observation affected the already-completed Prompt 3 sequence. | Retain as provenance only; it has no authority over product architecture, deployment, or current pacing. |
| 4 | Wiki log/index contain stale active routing | **Accept** | `wiki/index.md` said no product was selected; `wiki/log.md` said work remained blocked. | Point both to current authority, add the 2026-07-28 checkpoint, and widen mandatory stale-language searches. |
| 5 | Architecture uses a Nox API not covered by compile evidence | **Reject API mismatch; accept evidence gap** | Released v0.2.4 `Nox.publicDecrypt(euint256, proof)` exists and calls `INoxCompute.validateDecryptionProof`. The earlier skeleton exercised only the underlying verifier path. | Keep the correct typed API and require Prompt 3 to compile and execute that exact imported wrapper in the OrderBook path. |
| 6 | Prior verification memo self-graded PASS without durable sub-review links | **Accept provenance weakness** | The memo summarizes three reviews but does not link their raw outputs. | Mark it as a historical checkpoint and make this external-review reconciliation the new exact-gate record. |
| 7 | Architecture directory and historical prompt terminology leave routing gaps | **Accept** | `AGENTS.md` did not register `.thoughts/architecture/`; Prompt 1A retained an active-looking “unselected candidate” option. | Register the directory and make the old option explicitly historical. |

## Additional Load-Bearing Finding: Nonce/Handle Recurrence

Released v0.2.4 derives a confidential operation handle from the operator and operands with seed
zero whenever any operand is already confidential. The public handle for an integer quote is
deterministic. Re-evaluating the same encrypted threshold at the same integer quote can therefore
recreate the same candidate handle across application nonces.

Gateway proofs sign the handle and plaintext result, not `orderId` or `evaluationNonce`, while
viewer/public ACL grants are effectively irreversible. The old architecture's “public zero proof
→ reopen” rule is therefore unsafe unless the application makes each evaluation graph
nonce-distinct.

The released-source candidate is:

```solidity
euint256 n = Nox.toEuint256(evaluationNonce);
euint256 freshZero = Nox.sub(n, n);
euint256 evaluationMinOut = Nox.add(encryptedMinOut, freshZero);
ebool eligible = Nox.ge(Nox.toEuint256(quote), evaluationMinOut);
euint256 candidate = Nox.select(eligible, evaluationMinOut, Nox.toEuint256(0));
```

`freshZero` has plaintext zero but receives a fresh unique handle because its operands are public;
adding it preserves the threshold value while changing the confidential graph. This is
source-supported, not yet live-verified. Gate A must prove candidate inequality, ACL isolation, and
old-proof rejection across identical-value evaluations. If it fails, a publicly decrypted zero is
terminal/refundable rather than reopenable.

## Honest Privacy Statement To Verify

> Your exact limit is encrypted while the order rests—not invisible. Wallet, side, amount,
> evaluation times, and pool quotes are public. The evaluator learns whether each check passes, and
> repeated checks may narrow the possible range. If execution is attempted, the threshold-derived
> minimum output becomes public even if the trade later fails.

This statement is a test target, not a passed product claim. Gate A must determine whether any
released behavior requires stronger disclosure.

## Historical Gate C Schedule — Superseded as Workflow Authority

The bullets below are retained solely to explain the completed spike. They must not route current
work or be treated as a recommendation for the polished build.

- Prompt 3 activated at **2026-07-27 23:40 UTC**.
- Target the verdict by **2026-07-28 23:40 UTC**; the absolute spike stop is
  **2026-07-29 11:40 UTC**.
- Run Gate A (released Nox path) and Gate B (real local CTF/FPMM lifecycle) in parallel.
- Start Gate C as soon as both have executable evidence; do not consume the full time box by
  default or continue polishing without a live Gate C transaction at the hard stop.
- Stop on a contradicted load-bearing assumption and record `NO-GO`; otherwise record `GO` or only
  the exact remaining bounded conditions.
- If the spike passes at the hard stop, reserve the approximately 82 remaining hours as: 30h core
  build, 20h worker/frontend/judge path, 14h deployment/stabilization, 10h submission artifacts,
  and at least 8h final buffer.
- Do not start polished frontend or full-product work before the verdict checkpoint.

## Evidence

- Released typed wrapper:
  `.thoughts/raw/iexec-nox-pins/nox-protocol-contracts-v0.2.4/contracts/sdk/Nox.sol`
- Released proof verifier and handle generation:
  `.thoughts/raw/iexec-nox-pins/nox-protocol-contracts-v0.2.4/contracts/modules/Compute.sol`
- Released ACL events:
  `.thoughts/raw/iexec-nox-pins/nox-protocol-contracts-v0.2.4/contracts/modules/ACL.sol`
- Released public proof client:
  `.thoughts/raw/iexec-nox-pins/nox-handle-sdk-v0.1.0-beta.13/src/methods/publicDecrypt.ts`
- Current architecture:
  [`../architecture/2026-07-25-noxlimit-system-architecture.md`](../architecture/2026-07-25-noxlimit-system-architecture.md)
- Active spike:
  [`../../prompts/03-critical-path-verification.md`](../../prompts/03-critical-path-verification.md)

## Historical Next Action — Completed

Prompt 3 was run, returned `GO`, and updated current routing and evidence. The repository is now
stopped for the user's polished-build checkpoint.
