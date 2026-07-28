# Prompt 1A: Reassess NoxLimit Using the Hackathon-Appropriate Standard

> **Completed historical prompt.** Its reassessment and independent reaffirmation have run. Do not
> reopen the verdict from this file; follow `CURRENT.md` and the canonical architecture.

Copy everything below the divider into the agent session that authored the NoxLimit `DROP` audit.

---

Reopen your NoxLimit verdict. Do not blindly reverse it, and do not defend it because you authored
it. Re-audit the decisive evidence under the user's actual standard:

> This is an eight-day hackathon product. It must be a real product-shaped, end-to-end Ethereum
> Sepolia implementation with no mock market, mock price, mock trade, or fake outcome shares. The
> code must not obviously break or put the demo's assets at risk. However, do not require
> production-mainnet maturity, a professional audit, formal verification, decentralized keepers,
> organic liquidity, production economic modelling, or statistically defensible SLAs before an
> idea is allowed to survive. Separate demo blockers from post-hackathon hardening.

The user also explicitly said not to follow another agent's verdict blindly. Think independently,
show evidence, and retain `DROP` if it is still justified after the corrections below.

## Required reading

Read:

1. `AGENTS.md`
2. `AGENT_HANDOFF.md`
3. `.thoughts/decisions/CURRENT.md`
4. `.thoughts/research/2026-07-24-noxlimit-independent-research.md`
5. `.thoughts/verification/2026-07-24-noxlimit-independent-audit.md`
6. `.thoughts/verification/2026-07-24-noxlimit-drop-verdict-reassessment.md`
7. `.thoughts/sources/source-manifest.md`
8. the exact released source mirrors for:
   - `nox-protocol-contracts` v0.2.4;
   - `nox-handle-sdk` v0.1.0-beta.13;
   - pinned Gnosis Conditional Tokens and FPMM.

Keep verified facts, inference, contradiction, and unknown/test-required separate.

## Recheck four disputed conclusions

### 1. Demand

Decide whether the evidence proves “no privacy-specific demand” or only “demand not yet directly
validated.” Do not turn an unsuccessful source search into evidence of absence. Include any
counterevidence about public onchain order flow, copy trading, edge leakage, hidden intent, and
conditional-order usage. Still state plainly that adjacent evidence is not product-market-fit
proof.

### 2. Ordinary-backend equivalence

Correctly compare the complete user outcome, not only the mechanical fill:

- centralized venue;
- application backend that sees the threshold;
- user-operated always-on bot with signing authority;
- public onchain limit;
- Nox browser-off, same-chain execution where the application operator does not receive the raw
  resting threshold, while the fixed worker learns one bit per evaluation and `minOut` on success.

Verify the exact product documentation. In particular:

- Kalshi Pro's cited take-profit/stop-loss feature is under perpetual futures unless you find
  primary evidence that it applies to event contracts;
- Robinhood's event-contract docs show IOC/GTD limits unless you find primary evidence for private
  stop/TP triggers;
- Gemini Prediction Markets is a valid centralized stop-limit comparison, but the venue receives
  the trigger.

State whether any substitute preserves custody, availability, operator knowledge, and composability
well enough to establish a true veto.

### 3. Nox leakage

Do not assume every evaluation must call `publicDecrypt`. Inspect and, if possible, compile a
minimal example using the released APIs:

```solidity
euint256 candidate = Nox.select(
    eligible,
    encryptedMinOut,
    Nox.toEuint256(0)
);
Nox.allowThis(candidate);
Nox.addViewer(candidate, fixedWorker);
```

Then inspect Handle SDK beta.13 `decrypt(handle)` and the protocol ACL's `isViewer`,
`addViewer`, and `allowPublicDecryption`.

Assess this proposed orchestration:

1. a direct wallet-to-application call ingests `encryptedMinOut` with `Nox.fromExternal(...)`,
   persists it with `Nox.allowThis(encryptedMinOut)`, and stores the handle with immutable order
   state;
2. a later contract call reads/binds the real pool quote;
3. Nox computes `candidate = eligible ? minOut : 0`;
4. the application persists `candidate` and grants a fixed worker viewer-only access;
5. the worker privately decrypts candidate;
6. zero causes no explicit public-decryption proof under honest worker policy;
7. nonzero causes a worker-gated application call to load the stored candidate for
   `(orderId,evaluationNonce)` and mark it publicly decryptable;
8. the application rejects zero and consumes order state before one real FPMM buy.

Do not say “public proof plus order nonce” as though the proof contains that nonce. The Gateway
proof signs only the handle and decrypted result. Application storage must bind the stored handle
to the order/evaluation, reject caller-selected handles, enforce cancel/expiry/phase, and consume
the order once.

Do not declare this verified from source inspection alone. Identify the smallest live spike needed.
Explicitly report:

- the worker's readiness-bit and successful-minOut knowledge;
- chosen-query/evaluation-cadence risk;
- censorship and malicious-publication powers;
- irreversible grants;
- plaintext `minOut` at fill;
- what the public can infer from timing and non-action.
- the fact that honest-worker-gated success-only publication is policy, not confidential protocol
  enforcement, and that malicious zero publication must be safe.

Decide whether those are demo-breaking, an honest narrow privacy boundary, or post-hackathon
hardening concerns.

### 4. Sponsor fit

Recheck the live official rules/API. Prediction markets being “already seen” is an originality
warning, not a formal ban unless you find a current explicit rule. Creativity is tied with
end-to-end/no-mock at the highest displayed weight. The track's published `judging_criteria` field
has no categorical prediction-market penalty formula.

Evaluate the exact transition—not a generic market:

`confidential resting threshold → success-only release → replay-safe proof → real outcome-share
AMM buy`

Keep DarkOdds accurate: native Nox markets with read-only Polymarket display, not a router.

Also surface the current registration requirement to complete the iExec Hello World journey and
submit the wallet used.

## Required gate split

Give every risk a primary class and, where severity changes the answer, a conditional secondary
class:

1. `DEMO/PRODUCT BLOCKER`
2. `BOUNDED SPIKE REQUIRED`
3. `POST-HACKATHON HARDENING`
4. `PRODUCT-DEMAND UNKNOWN`
5. `ORIGINALITY / JUDGE RISK`

Product-demand and originality evidence may still justify `DROP`; do not mislabel them as security
failures. Likewise, do not let post-hackathon hardening silently become a demo-security veto.

## Required output

Write a dated correction or reaffirmation memo. Give one verdict:

- `DROP`
- `KEEP AND VERIFY` (candidate status at the time this historical prompt ran)
- `RESHAPE AND VERIFY` (state the exact smaller candidate)

If the verdict is `KEEP AND VERIFY` or `RESHAPE AND VERIFY`, specify one 24–36-hour disposable
critical-path test covering:

1. honest-worker-gated viewer/private-decrypt/success-publication behavior on the current released
   Nox stack;
2. real Conditional Tokens + FPMM split/seed/buy/resolve/redeem behavior;
3. a final **Ethereum Sepolia** replay-safe Nox-authorized FPMM trade with immutable recipient and
   atomic `minOut`, using the actual adapter rather than a direct EOA buy.

The eventual adapter gate must cover collateral approval, ERC-1155 receiver support, atomic
forwarding to the immutable owner, and safe cancel/expiry/refund state. If the no-mock claim
includes resolution, require the live official price feed plus a real resolver; a manually selected
payout proves only protocol plumbing.

This reassessment cannot award `VERIFIED CANDIDATE`; only executable evidence from Prompt 3 can do
that.

Do not build the full product or polished frontend in this task. Preserve the original audit as
history. Update `CURRENT.md`, `README.md`, `AGENT_HANDOFF.md`, `AGENTS.md`, and `prompts/README.md`
only after the evidence supports the revised verdict, and make the new state internally
consistent.
