# Prompt 3: Verify the Chosen Concept's Critical Path

Run this only after `.thoughts/decisions/CURRENT.md` points to a persisted selection memo and marks
Prompt 3 as allowed.

Your job is to determine whether the selected product is technically real enough to justify
specification and implementation. This is a verification task, not a product build. You may create
a bounded, disposable integration spike to obtain executable evidence, but do not build product
architecture, feature surfaces, or polish.

Read the complete Nox wiki and exact source manifest first. Resolve current SDK/library/API
documentation through Context7. Prefer live chain state and exact installed release source over
default branches or prose documentation.

Verify the smallest complete path:

`encryptInput → direct fromExternal → replay guard → confidential update/computation → allowThis → Nox.allowPublicDecryption → asynchronous resolution → publicDecrypt → on-chain proof verification → one-shot real downstream action`

For SLA Lock, the downstream action is:

`stored evaluation handle → verified pass/fail proof → evaluator calls complete/reject on one unchanged ERC-8183 job → escrow releases/refunds`

Required evidence:

- exact package versions and source SHAs;
- target chain and deployed addresses;
- caller/owner/app binding trace;
- supported type and operation trace;
- persistence and ACL trace;
- input-proof and finalization replay protections;
- durable pending/retry state;
- receipt-confirmed terminal transaction;
- proof that the downstream protocol was not modified;
- proof that the telemetry or other confidential inputs are real and credibly signed;
- transaction hashes or reproducible local test output.

Classify every claim as:

- Verified;
- Partially verified;
- Not verified;
- Contradicted.

End with one of:

- **GO** — the complete critical path is evidenced;
- **CONDITIONAL GO** — list the exact remaining gates;
- **NO-GO** — state the failing assumption and return to idea selection.

Save the evidence and verdict as `.thoughts/verification/YYYY-MM-DD-<concept>-critical-path.md`.
Update `.thoughts/decisions/CURRENT.md` with the verdict and link. Preserve any spike commands and
transaction hashes needed for reproduction.

Stop after the verdict. Do not turn the verification into a full implementation plan.
