# QuietRound Pre-Implementation Verification Audit

> **Strategic status update — 2026-07-23:** This audit's technical Conditional Pass is preserved,
> but QuietRound is no longer the recommended product. The
> [verified winner and opportunity audit](../research/2026-07-23-iexec-wtf-winners-and-opportunity-space.md)
> demotes it to a backup because of funding-category adjacency, multi-user demo friction, the
> private-voting objection, and the Allo integration gate. Do not interpret the historical closing
> recommendation below as the current project decision.

- **Audit date:** 2026-07-22
- **Target:** QuietRound, a confidential rubric-scoring and capital-allocation strategy using iExec Nox and Allo Protocol on Ethereum Sepolia
**Overall verdict:** **Conditional Pass — keep the concept, reshape the integration, and do not call it implementation-verified yet.**

> **Organization-source addendum:** A third pass mirrored and audited all 20 public iExec-Nox
> repositories plus the exact npm/deployment tags. It strengthens feasibility but adds release/live
> ABI, proof-replay, type-width, ACL, and finalization constraints. The evidence is in the
> [organization deep dive](../research/2026-07-22-iexec-nox-org-deep-dive.md) and
> [Nox domain wiki](../wiki/index.md). Where this document's earlier wording differs, those
> source-pinned artifacts are authoritative.

## What Was Audited

This began as a second, adversarial audit of the project choice and proposed integration and now includes an organization-wide source addendum. It is not a post-build verification audit because the workspace does not yet contain a product specification, stories, implementation plan, contracts, frontend, tests, deployment, or demo evidence.

The evidence base includes:

- The user-supplied canonical hackathon brief and Nox documentation export.
- Current Nox documentation resolved through Context7 as `/iexec-nox/documentation`.
- Current Nox Solidity library, Handle SDK, Hardhat plugin, npm metadata, and deployment addresses.
- Current Allo v2 documentation, deployed-address registry, `Allo.sol`, `IStrategy`, and `BaseStrategy` source.
- Live Ethereum Sepolia bytecode checks for NoxCompute, Allo Proxy, and Allo Registry.
- The live Nox status page.
- Fresh GitHub repository and code searches across the current WTF cohort and previous Nox projects.
- The accessible hackathon mirror and indexed deadline announcement.
- All 20 public iExec-Nox repositories, exact release-tag mirrors, npm gitHeads, official product POCs, and live Nox observer data.

## Sharpened Product

**QuietRound is a confidential decision engine for grant, hackathon, RFP, and investment panels. Reviewers submit encrypted rubric scores; Nox computes the winner without exposing scores or intermediate totals; a proof-verified result authorizes an unchanged Allo v2 pool to pay the selected recipient on Ethereum Sepolia.**

The hackathon judging scenario is the demo, not the entire market category. Positioning it only as “private grant voting” would collide with MACI and earlier confidential-funding projects.

## Scorecard

| Test | Score | Audit finding |
|---|---:|---|
| A judge can try it with little friction | 4/5 | The flow is legible, but requires Sepolia wallets/gas, multiple roles, and an asynchronous compute state. |
| It obviously needs Nox | 5/5 | Encrypted numeric inputs, private aggregation/comparison, ACLs, and proof-verified public decryption are the core mechanism. |
| It feels like a real product | 4.5/5 | Confidential panel decisions are real; the reusable panel framing and real Allo payout keep it from being a standalone poll. |
| **Multiplicative score** | **90/125** | Strong enough to keep; no longer the unjustified 125/125 from the first pass. |

- **Delivery difficulty:** Medium–High
- **Visible collision risk:** Low–Medium
**Implementation verification:** Incomplete

## Confirmed Green Signals

### Competition fit

- The project adds a privacy layer to an existing open-source protocol without changing the deployed public protocol.
- It demonstrates Nox computation, not merely encrypted storage: private score validation, addition, comparison, selection, ACL persistence, public-decryption authorization, and proof verification.
- It can meet the stated Ethereum Sepolia, working frontend, no-mock-data, public repository, four-minute demo, X post, and `feedback.md` requirements.
- It avoids the most crowded current categories: payroll, Safe spending policies, swaps, escrow, and Aave strategies.

### Live technical availability

At Ethereum Sepolia block `11,329,649` on 2026-07-22, all three required official addresses returned deployed bytecode:

| Contract | Address | Bytecode present |
|---|---|---|
| NoxCompute | `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF` | Yes |
| Allo Proxy | `0x1133eA7Af70876e64665ecD07C0A0476d09465a1` | Yes |
| Allo Registry | `0x4AAcca72145e1dF2aeC137E1f3C5E3D75DB8b5f3` | Yes |

The Nox status page reported all systems operational during the audit. It also records short resolved component incidents, so the frontend still needs a waiting, retry, and timeout experience.

Current published packages are:

- `@iexec-nox/nox-protocol-contracts@0.2.4`
- `@iexec-nox/handle@0.1.0-beta.13`
- `@iexec-nox/nox-hardhat-plugin@0.1.0`

The Hardhat plugin is published and declares Hardhat `^3.4.0`; the earlier apparent npm availability concern is resolved.

The version states are not interchangeable: Ethereum Sepolia remains on the repository's v0.2.3 implementation/initializer version 3; npm contracts 0.2.4 has the same contract source and is compatible; contract `main` is 29 commits ahead and exposes APIs the live proxy does not support. Pin the three package versions exactly and compile with Solidity 0.8.35.

Public Nox observer data also shows a successful Ethereum Sepolia transaction resolving two `Add`, one `Ge`, and five `Select` handles about 12 seconds after its block timestamp. That directly validates the operation shape QuietRound needs, but it is one observation rather than a latency guarantee.

### Originality scan

- A fresh GitHub scan found 19 repositories created since July 1 matching `iexec nox`, including heavy payroll/Safe concentration but no visible Nox + Allo confidential rubric project.
- Exact repository searches for `QuietRound`, `"iExec Nox" Allo`, and `"confidential scoring" blockchain` returned no hits.
- GitHub code search for `"@iexec-nox" "allo"` returned no hits.
- Earlier confidential-funding projects hide amounts, proposals, donations, or funding terms. QuietRound's differentiated mechanism is confidential multi-criterion panel judgment that computes a minimal winner result and triggers an Allo payout.

This is evidence of differentiation, not proof: private teams, unindexed repositories, and unpublished submissions remain invisible.

## Material Corrections From The First Pass

### 1. Use stable Allo v2, not the Allo 2.1 preview

Stable Allo v2 is already deployed on Ethereum Sepolia. A deadline build should integrate the deployed v2 proxy and registry rather than accept preview-contract risk.

### 2. Finalization is asynchronous

Nox operations emit work for off-chain TEE runners. QuietRound cannot close a round, immediately obtain plaintext, and pay the winner in one synchronous interaction.

The correct state machine is:

1. Close the round and create the encrypted winner handle.
2. Mark only that winner handle publicly decryptable.
3. Show `Computing securely…` while the Nox runner resolves it.
4. Retrieve the signed public-decryption proof.
5. Submit the proof through Allo's `distribute` path.
6. Verify the proof inside the strategy and pay exactly the immutable winning recipient once.

### 3. Do not inherit stable Allo v2 `BaseStrategy` in the same Nox contract

Current Nox `Nox.sol` requires Solidity `^0.8.35`. Stable Allo v2's `BaseStrategy` is `^0.8.19`, but its imported `Transfer.sol` pins the compiler to exactly `0.8.19`. A single contract inheriting that source and importing current Nox cannot compile unchanged under one Solidity compiler.

The lean path is a Solidity 0.8.35 contract that implements the Allo strategy ABI directly and is registered with `createPoolWithCustomStrategy`. It should not copy or patch `BaseStrategy`. The deployed Allo contracts remain unchanged. This exact interface/initialization path must be proven in the first implementation spike.

If that direct implementation becomes too costly, the fallback is two contracts: a Nox scoring contract compiled at 0.8.35 and a small Allo strategy compiled at 0.8.19 that trusts only the immutable scoring contract. That fallback is more complex and should not be the default.

### 4. The standard `Nox.fromExternal` helper and `Allo.allocate` caller path need care

The Handle SDK binds an encrypted input to both an application contract and an owner. `Nox.fromExternal` validates the owner using the application contract's current `msg.sender`. When Allo calls a strategy, the strategy's `msg.sender` is Allo, while the original reviewer is passed separately as `_sender`.

Therefore, blindly calling `Nox.fromExternal` inside an Allo-routed `allocate` will validate against the wrong owner. The safest MVP is a custom `submitScores` function on the registered strategy that reviewers call directly; then the strategy is the bound application contract and the reviewer is `msg.sender`. Allo still owns the pool lifecycle and calls the final distribution. A lower-level custom validation against Allo's `_sender` may be possible, but it expands security-sensitive code and should not be chosen without a test.

### 5. Reveal only the winner index

The first pass allowed final totals or winner disclosure. The stronger privacy boundary is to make only a deterministic winner index publicly decryptable. Individual scores and intermediate totals should never grant the organizer viewer access and should never be marked public.

### 6. Pin released APIs; do not build against `main`

The protocol-contracts, Handle SDK, and Hardhat-plugin default branches retain their released version strings while being 29, 5, and 2 commits ahead of the npm payloads. Current contract `main` adds `persistTransientHandle` and reinitializer version 4; the Ethereum Sepolia proxy does not expose that API. The build must pin contracts `0.2.4`, Handle SDK `0.1.0-beta.13`, and plugin `0.1.0` exactly, using `toE*` plus `allowThis` from the released library.

### 7. Nox proof expiry is not application replay protection

The live input-proof TTL is 3,600 seconds, but NoxCompute does not consume a nonce. A reviewer can replay the same still-valid proof and repeat the application mutation unless QuietRound enforces its own round/project/reviewer submission mapping. Public decryption proofs are also reusable and contain no round, caller, application, expiry, or nonce; finalization must bind the proof to the winner handle already stored for that round and enforce one-shot distribution state.

### 8. Use one encrypted width for scores and totals

Nox implements no encrypted cast from `euint16` to `euint256`, and arithmetic requires matching handle types. QuietRound should therefore encrypt rubric scores as `uint256` and use `euint256` through validation and aggregation. A separate `euint16` winner index is safe because its `select` branches are both `euint16` and it is never added to totals.

### 9. Reuse the official asynchronous pattern, with receipt and persistence fixes

The official Confidential Token POC provides a source-backed proof polling/finalization state machine and separate retry path. It also marks success without awaiting the final receipt and keeps retry inputs only in a React ref. QuietRound must persist the round phase/winner handle on-chain, recover after refresh, and show completion only after a successful payout receipt.

## Minimum Winning Architecture

Keep the MVP deliberately fixed:

- One official Allo v2 pool funded with real native Sepolia ETH.
- Three immutable recipient/project addresses.
- Three immutable reviewer addresses.
- Three criteria with scores clamped to a declared range.
- One encrypted submission transaction per reviewer.
- Public submission-count and deadline state; encrypted score values and totals.
- A deterministic tie-break declared before scoring; for example, lowest project index wins an exact tie.
- One encrypted winner handle, one public-decryption proof, one Allo distribution, and a permanent `distributed` guard.

Required contract protections:

- Allowlisted reviewers only.
- One submission per reviewer.
- Fixed recipient ordering and fixed rubric before the round opens.
- Encrypt every score as `uint256` and use `euint256` for score validation and aggregate totals; Nox cannot cast an encrypted `euint16` into an `euint256` total.
- Keep the winner index independently typed as `euint16` (or use `euint256` consistently) and declare a deterministic tie-break.
- Clamp encrypted scores rather than attempting to `require` an encrypted boolean.
- Call `allowThis` on every encrypted value needed by a later transaction.
- Consume each input proof only once through explicit round/project/reviewer state.
- Never accept a caller-chosen payout recipient after proof generation; derive it from the verified winner index and immutable recipient array.
- Mark distributed state before transferring, and reject proof replay or double distribution.
- Close only at the declared deadline or after all immutable reviewers have submitted.

## Honest Privacy Boundary

QuietRound can claim:

- Rubric scores and intermediate totals remain confidential.
- The organizer cannot decrypt reviewers' scores merely because it controls the round.
- Only a minimal winner result is publicly decrypted and verified on-chain.
- The public Allo payout is authorized by that verified result.

QuietRound must not claim:

- Reviewer anonymity. Wallet addresses, transaction timing, function calls, and submission counts remain public.
- Protection against malicious or colluding judges. Allowlisting controls participation but does not make subjective scoring honest.
- Perfect secrecy in very small panels. A winner and public contextual information can still permit inference.
- A private payout. The final Allo transfer is intentionally public.
- Instant finalization. Nox compute and proof generation are asynchronous.

## Kill Risks And Mitigations

| Risk | Severity | Mitigation / decision |
|---|---|---|
| Sponsor sees it as generic private voting or a prior grant-project repeat | High | Frame it as a reusable confidential rubric engine; obtain written Discord confirmation before committing the full build. |
| Custom Allo strategy ABI does not compile/initialize cleanly with Nox 0.8.35 | High | Make this the first build gate; do not start UI polish first. |
| End-to-end Nox proof latency or reliability is poor on Sepolia | High | Run a live close → wait → publicDecrypt → on-chain verify spike; design explicit pending/retry UX. |
| Strategy passes input proofs through the wrong caller identity | High | Use a direct reviewer `submitScores` entrypoint for MVP, or prove explicit-owner validation with tests. |
| Unreleased `main` API is compiled against the older live proxy | High | Pin npm versions exactly and use the release-tag mirrors as implementation authority. |
| A valid proof is replayed to add scores or distribute twice | High | Add explicit submission and distribution state; bind public proof verification to the stored round handle. |
| Mixed encrypted widths fail type validation | High | Use `euint256` for submitted scores and totals; do not assume an encrypted cast exists. |
| Sparse reviewers make scores inferable | Medium | Demo three reviewers; reveal only winner index; do not publish totals. |
| Wallet/gas friction hurts judge experience | Medium | Pre-fund named demo wallets; keep the public observer view wallet-free; record a clean three-role video. |
| Allo source licensing is mishandled | Medium | Do not copy `BaseStrategy`; implement only the required ABI and document the integration. If Allo AGPL code is vendored or modified, comply with AGPL-3.0. |
| Exact deadline timezone remains unknown | High operational | Confirm in Discord and target a complete submission by July 31, at least 24 hours early. |

## Go/No-Go Gates

QuietRound becomes a full **Go** only when all of these are evidenced:

1. **Eligibility gate:** iExec confirms the concept is sufficiently distinct from prior VIBE work and that an Allo v2 custom strategy is a valid clean integration.
2. **Compile gate:** a minimal Solidity 0.8.35 Allo-compatible strategy imports the exact Nox 0.2.4 npm payload—not contract `main`—and compiles under Hardhat 3.
3. **Input gate:** a real reviewer wallet encrypts and submits a supported score handle successfully on Ethereum Sepolia.
4. **Compute gate:** multiple encrypted scores aggregate, compare, and produce a winner handle across transactions with correct ACL persistence.
5. **Proof gate:** the winner handle becomes publicly decryptable, the Handle SDK returns a proof, and the contract verifies it.
6. **Payout gate:** the official Allo v2 proxy distributes real native Sepolia ETH to only the verified winner.
7. **Demo gate:** a clean frontend demonstrates reviewer, organizer, and public observer states without mock data.

If gates 2–6 are not complete in the first focused engineering spike, the concept remains promising but is not safe to build out as a polished hackathon submission.

## Sponsor Message To Send

> We are building QuietRound, a confidential rubric-allocation strategy for hackathons, grants, and review panels. Reviewers submit encrypted numeric scores to a custom strategy registered with the official Allo v2 pool on Ethereum Sepolia. Nox keeps every score and intermediate total confidential, then only a proof-verified winner index becomes public and Allo distributes real Sepolia ETH to that immutable recipient. We are not reusing a prior VIBE project. Does this count as a clean integration with an unmodified open-source protocol, and is it sufficiently distinct from earlier private-grant/fundraising entries? Also, what is the exact August 1 cutoff time/timezone and the recommended judging-week Nox package pin?

## Historical Final Audit Decision (Superseded)

**The 2026-07-22 audit said to keep QuietRound.** It then had the best combination of visible
originality, indispensable Nox usage, real-protocol composability, and a four-minute demo story. The
deeper passes replaced assumptions with source-backed constraints: asynchronous close/proof,
direct-caller identity, exact release/live ABI, explicit proof replay guards, a single encrypted
score width, irreversible disclosure, and receipt-verified finalization. None killed the concept at
that time, but all belonged in the proposed first implementation spike.

The responsible status is:

- **Concept selection:** Conditional Pass.
- **Architecture direction:** Reshape as documented above.
- **Implementation verification:** Incomplete.
- **Historical next action:** Run the seven go/no-go gates in order, beginning with sponsor
  confirmation and a minimal Nox + Allo strategy spike.

## Primary Sources

- [WTF Hackathon on DoraHacks](https://dorahacks.io/hackathon/wtf-hackathon/detail)
- [Accessible WTF Hackathon mirror](https://competehub.dev/en/competitions/dorahackswtf-hackathon)
- [Nox documentation](https://docs.noxprotocol.io/getting-started/welcome)
- [Nox Solidity library v0.2.4](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/sdk/Nox.sol)
- [Nox Handle SDK beta.13 input encryption](https://github.com/iExec-Nox/nox-handle-sdk/blob/e552f6a3b297bc5bc7d1afd514c96e7b9b30cea0/src/methods/encryptInput.ts)
- [Nox Hardhat plugin](https://github.com/iExec-Nox/nox-hardhat-plugin)
- [Local iExec-Nox organization deep dive](../research/2026-07-22-iexec-nox-org-deep-dive.md)
- [Nox live status](https://status.noxprotocol.io/)
- [Allo documentation](https://docs.allo.gitcoin.co/)
- [Allo v2 deployed contracts](https://github.com/allo-protocol/allo-v2/blob/main/contracts/README.md)
- [Allo v2 `Allo.sol`](https://github.com/allo-protocol/allo-v2/blob/main/contracts/core/Allo.sol)
- [Allo v2 `BaseStrategy`](https://github.com/allo-protocol/allo-v2/blob/main/contracts/strategies/BaseStrategy.sol)
- [Allo v2 `Transfer.sol`](https://github.com/allo-protocol/allo-v2/blob/main/contracts/core/libraries/Transfer.sol)
