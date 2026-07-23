# Feasibility-First Candidate Report

**Research date:** 2026-07-23

**Status:** Research complete; user selection pending

**Evidence:** [winner and product audit](../research/2026-07-23-feasibility-first-winner-patterns.md)

## B. Candidate graveyard

These were serious product families, not filler generated to reach a quota. Each failed at least one
hard feasibility gate.

| Candidate or family | Why it was tempting | Exact failing gate |
|---|---|---|
| QuietInvite: reusable private Unlock membership claim codes | Unlock already ships password-protected memberships, a short code fits Nox equality, and `grantKeys` is a real unchanged action | **One-user closed loop, simpler equivalent, and bounded uncertainty:** an organizer creates the campaign while a different claimant receives the result; an automated private backend can validate a code and issue a recipient-bound claim with the same user outcome; online guessing, proof binding, role safety, sponsorship, and async recovery remain several fundamental unknowns |
| Hidden Unlock subscription renewal ceiling | Unlock has a real recurring membership workflow on Sepolia | **Nox indispensability:** the price and duration are public and fixed; a local reminder, allowance, or ordinary approval produces the same renewal outcome |
| Nox-powered paid Unlock discount code | Unlock already ships promo-code hooks and paid memberships | **Closed loop and integration:** Unlock determines price synchronously inside `purchase`; Nox resolves asynchronously. The tractable `grantKeys` path mints without payment, so pretending it is a paid discount would misstate the product |
| Private ENS registration/renewal guard | ENS is familiar, active, open source, and deployed on Sepolia | **Concrete harm and novelty:** registration already uses commit–reveal against front-running, while renewal fees are deterministic. Nox does not materially change the action |
| Secret maximum Seaport purchase or bid | Maximum-bid behavior is familiar and encrypted comparison fits Nox | **Collision and judge path:** this repeats Diam's sealed-bid mechanism, sits in the most crowded current lane, and needs reliable live Sepolia inventory/counterparty state |
| Private x402 API budget | Agent/API payments are current and recurring | **Protocol deployment and latency:** hosted facilitators do not support Ethereum Sepolia, self-hosting becomes infrastructure, and asynchronous Nox is unsuitable for the request hot path |
| Confidential iExec compute-spending ceiling | It would connect two iExec products and use a real marketplace | **Chain compatibility:** the relevant iExec test deployment is on Arbitrum Sepolia, while WTF requires Ethereum Sepolia |
| Password-protected IPFS file drop | File sharing is a real one-user action and password links are common | **Simpler equivalent and collision:** client-side E2E encryption plus a high-entropy link preserves the outcome; the historical [NoxShadowNFT](https://github.com/armsves/NoxShadowNFT) project already overlaps encrypted IPFS files and key disclosure |
| Confidential onchain game move | Hidden state creates a visible privacy effect | **One-user closed loop:** secrecy matters against another player, which reintroduces demo choreography; single-player alternatives do not need Nox. [CRYPTOWORDLE](https://github.com/raorla/CRYPTOWORDLE) also occupies the visible game lane |
| Private usage quota for an API or dataset | Encrypted `safeSub` and allow/deny are technically clean | **Verified downstream action:** enforcement still depends on a trusted offchain service or an unproven DataProtector bridge; the proof does not itself deliver the protected service |

The historical QuietRound, SLA Lock, QuietClaim, VeilFeed, VeilQuota, JuryLock, AttestGate,
ShadowRank, Carbon Escrow, VeilSub, SealedGovernor, QuietProcure, RiskPilot, ShieldedBounty,
VeilDCA, and HiddenMatch directions remain rejected. They depend on panels, fake or trusted input,
policy/legal context, multi-party choreography, crowded categories, or an action that does not close
for one user.

### Most important near-miss: QuietInvite

**FEASIBILITY: FAIL**

QuietInvite would let an invited person enter a reusable short code and receive a complimentary
membership key from an existing Unlock PublicLock. It is the closest direction found because it
begins with a shipping workflow and a precise source-verifiable privacy flaw:

- Unlock documents [password-protected NFT memberships](https://unlock-protocol.com/guides/password-protected-nft-memberships/)
  with multiple capped passwords for sponsors, cohorts, or invitees.
- The current frontend [deterministically derives a wallet from the password](https://github.com/unlock-protocol/unlock/blob/9afabd068531959528d7e154fbf0ebbccc2267a1/unlock-app/src/utils/strings.tsx#L43-L50).
- The current [`PasswordRequiredHook`](https://github.com/unlock-protocol/unlock/blob/9afabd068531959528d7e154fbf0ebbccc2267a1/smart-contracts/contracts/hooks/PasswordRequiredHook.sol)
  stores the corresponding public signer and accepts a recipient-bound signature. Binding stops
  direct signature copying, but the deterministic signer gives observers an offline dictionary
  oracle for short passwords. That attack conclusion is an inference from the source.
- An authorized key granter can call unchanged
  [`PublicLock.grantKeys`](https://github.com/unlock-protocol/unlock/blob/9afabd068531959528d7e154fbf0ebbccc2267a1/packages/contracts/src/contracts/PublicLock/PublicLockV14.sol#L4050-L4083)
  on the current [Sepolia deployment](https://github.com/unlock-protocol/unlock/blob/9afabd068531959528d7e154fbf0ebbccc2267a1/packages/networks/src/networks/sepolia.ts).

The plausible Nox mechanism is equally narrow: the organizer and claimant encrypt the same
domain-separated `uint256` code value, Nox compares two `euint256` handles, only a boolean is
revealed, and a verified success authorizes one complimentary `grantKeys` call. A public hash,
native password hook, or commit–reveal flow leaves an offline verifier or eventually reveals the
reusable short code. A long random invite link solves the problem without Nox, so this concept was
defensible only for a human-shareable short code.

It nevertheless fails the project-owner's feasibility veto:

1. **The recurring user and completed result belong to different people.** The organizer creates
   and distributes the campaign, but the claimant completes the visible onchain action. A
   preconfigured judge campaign therefore hides part of the product loop rather than proving that
   one user can originate and finish it.
2. **A normal private backend preserves the claimant's product outcome.** It can check the code and
   issue a recipient-bound one-shot voucher or mint through controlled key-granter authority. The
   claimant wallet is public in either design. No direct demand evidence showed that eliminating
   this backend trust is valuable enough for complimentary invite claims.
3. **The short-code security story remains incomplete.** Nox removes offline guessing but exposes
   an online match oracle. Per-wallet limits are Sybil-bypassable; a global attempt cap enables
   denial of service; paid attempts conflict with the sponsored no-faucet judge path.
4. **There is more than one bounded implementation uncertainty.** Cross-user persisted-handle
   equality, result-to-claimant/lock/epoch binding, replay protection, constrained
   `KEY_GRANTER_ROLE`, asynchronous recovery, custom-transaction sponsorship, and practical
   anti-guessing controls all still need live proof.
5. **The zero-friction claim was projected, not verified.** Unlock's network configuration marks
   its own flow as fully subsidized, but that does not prove that custom Nox/application
   transactions will be sponsored.
6. **Demand evidence is feature evidence, not demonstrated pain.** The Unlock guide proves that the
   feature exists; it does not prove meaningful repeated use of low-entropy verbally shared codes
   or documented losses from offline guessing.

Because feasibility is a veto, originality and a clean-looking Nox operation cannot average these
failures into a pass. QuietInvite may be worth reconsidering under looser constraints, but it is not
a survivor of this brief and must not advance to product specification or implementation.

## C. Survivors

**NONE.**

No candidate passed every required gate. In particular, none simultaneously provided:

- one person originating and completing the useful action;
- a real, unchanged Ethereum Sepolia protocol action;
- real inputs with no staged participant or trusted evidence theater;
- a result that cannot be reproduced with a conventional private backend, client encryption,
  commit–reveal, access control, or a random link;
- only one bounded implementation uncertainty;
- and a source-verifiable, faucet-free judge path.

Because there is no `FEASIBILITY: PASS`, no candidate is scored. Scoring a failed idea would violate
the research brief by letting novelty or privacy average away a hard failure.

## D. Verdict

**NONE SURVIVE. Do not select a product and do not begin architecture or implementation.**

This is a stronger outcome than promoting another broad or staged demo. The research did identify
useful boundaries:

- private trading and routing are severely crowded;
- committee, evaluator, policy, insurance, and scoring products violate the owner's exclusions;
- games need another participant;
- x402 and iExec compute have deployment/latency mismatches;
- paid Unlock hooks conflict with Nox's asynchronous resolution;
- free Unlock invite claims have a real privacy flaw but fail the one-user and simpler-backend
  gates.

The single smallest question for the next discovery pass is:

> Is there a currently deployed Ethereum Sepolia protocol where one person already performs one
> recurring numeric action, public visibility demonstrably breaks that same person's outcome, and
> the protocol itself can enforce a Nox-verified result without a second user or trusted backend?

Until a named shipping workflow answers that question with primary evidence, the responsible
decision is to keep product selection blocked. The other agent's independent research can now be
compared against this graveyard; it should not inherit QuietInvite as a recommendation.

Stop here for user review. Run Prompt 2 only if the user supplies or another agent finds a genuine
survivor to compare.
