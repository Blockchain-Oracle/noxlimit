# Nox integration patterns

Last verified: **2026-07-23**

> **Routing note (2026-07-28):** NoxLimit is selected and Prompt 3 is `CONDITIONAL GO`; only its
> funded live run remains. QuietRound/Allo names
> below are historical integration examples only. Apply the released-API patterns to the
> [`canonical NoxLimit architecture`](../architecture/2026-07-25-noxlimit-system-architecture.md)
> and follow [`CURRENT.md`](../decisions/CURRENT.md).

These patterns are grounded in the released packages, the live Ethereum Sepolia deployment, and
official Nox product POCs. They are implementation guidance, not proof that QuietRound itself has
already passed an end-to-end test.

## 1. Pin releases and design to the live ABI

Use contracts `0.2.4`, Handle SDK `0.1.0-beta.13`, plugin `0.1.0`, and Solidity `0.8.35`.
Do not use `main`-only `toTransientE*` or `persistTransientHandle`; the live Sepolia implementation
does not expose them.

## 2. Cache one Handle client per wallet and chain

The official Confidential Token frontend creates one `createViemHandleClient` per account/chain in
React Query with infinite stale time. This preserves the client's cached access authorization and
avoids repeated wallet signatures.

Source: [`use-handle-client.ts`](https://github.com/iExec-Nox/nox-product-poc/blob/3dd5d49a78d3fcda8879307e9e132ebe12502c71/demo-ctoken/hooks/use-handle-client.ts#L5-L25).

## 3. Encrypt for and call the consuming contract directly

The browser should call:

```ts
const { handle, handleProof } = await handleClient.encryptInput(
  value,
  'uint256',
  quietRoundAddress
)
```

Then submit that handle/proof in a direct transaction to `quietRoundAddress`. Do not route the proof
through Allo or another router before `Nox.fromExternal`; the proof owner must equal the application's
current `msg.sender`.

Official pattern: [`use-confidential-transfer.ts`](https://github.com/iExec-Nox/nox-product-poc/blob/3dd5d49a78d3fcda8879307e9e132ebe12502c71/demo-ctoken/hooks/use-confidential-transfer.ts#L73-L123).

## 4. Add public replay protection

Nox input proofs are time-limited but not consumed. The application must prevent a reviewer from
reusing the same proof to increase a total repeatedly. Use a round/project/reviewer mapping and set
it before issuing confidential operations. Decide up front whether one submission is final or whether
a replacement flow is required.

## 5. Use one encrypted integer width throughout an arithmetic path

Nox has no implemented encrypted cast between `euint16` and `euint256`, and arithmetic requires
matching operand types. Therefore QuietRound should use **`uint256` / `euint256` for every submitted
score and aggregate total**, even though scores are small. Do not accept `euint16` scores and then
assume they can be added to an `euint256` total.

The winner index may independently use `euint16` because its own `select` branches are both
`euint16`; it is never arithmetically combined with a total.

Source: [`TypeUtils.validateOperationTypes`](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/utils/TypeUtils.sol#L165-L186)
and the released [`Nox.sol` overloads](https://github.com/iExec-Nox/nox-protocol-contracts/blob/1a2ebd45e4af91797397961bcb0046fe1e5c1d03/contracts/sdk/Nox.sol).

## 6. Validate encrypted values with comparisons and `select`

An encrypted boolean cannot drive a Solidity `require`. To constrain a score to 0–5, compare it to
an encrypted/public-handle maximum and select either the score or zero. The official cVault contract
uses this “encrypted condition chooses next state” pattern.

Source: [`ConfidentialERC7540.sol`](https://github.com/iExec-Nox/nox-product-poc/blob/3dd5d49a78d3fcda8879307e9e132ebe12502c71/cVault/contracts/contracts/vault/ConfidentialERC7540.sol#L280-L317).

An invalid score can be replaced by zero or leave the old total unchanged; it cannot honestly be
described as a confidential check that reverts. If the UX should reject bad values before submission,
also validate the browser input, while treating on-chain encrypted clamping as the trust boundary.

## 7. Persist every cross-transaction result

New results and validated inputs grant only transient access. After calculating a new total:

```solidity
(ebool ok, euint256 candidate) = Nox.safeAdd(total, sanitizedScore);
euint256 nextTotal = Nox.select(ok, candidate, total);
Nox.allowThis(nextTotal);
total = nextTotal;
```

Consume input handles immediately and avoid persisting them. Persist aggregates that will be read by
the next review transaction. Do not grant the organizer, reviewer, or a helper viewer/admin access to
individual scores unless the product explicitly wants permanent disclosure rights.

## 8. Compose argmax from supported primitives

There is no custom argmax operator. A first-wins tie break can iterate candidates with strict `gt`:

```solidity
ebool better = Nox.gt(candidateTotal, bestTotal);
bestTotal = Nox.select(better, candidateTotal, bestTotal);
winnerIndex = Nox.select(better, Nox.toEuint16(i), winnerIndex);
```

Runner executes all events from one transaction in log order and can reuse intermediate plaintext,
so the whole fixed-size argmax may be emitted in one close transaction. A live Ethereum Sepolia
transaction has already resolved an `Add` + comparison + multi-`Select` chain. Still cap the MVP at
three candidates and benchmark the exact close transaction.

## 9. Reveal only the winner

Store the winner handle under `roundId` and call `Nox.allowPublicDecryption(winnerIndex)`. Public
decryption is irreversible. Do not mark individual scores or totals public. Do not give the organizer
viewer access “for debugging”; viewer access is also permanent in the deployed model.

## 10. Model finalization as a durable state machine

The official Confidential Token hook provides the right shape:

`encrypting → requesting → waiting for proof → finalizing → confirmed/error`

It calls `publicDecrypt`, uses bounded retries, saves finalization parameters, and provides a separate
retry path. Source: [`use-unwrap.ts`](https://github.com/iExec-Nox/nox-product-poc/blob/3dd5d49a78d3fcda8879307e9e132ebe12502c71/demo-ctoken/hooks/use-unwrap.ts#L15-L155).

QuietRound should adapt it to:

`Round open → close submitted → securely computing → proof ready → award transaction pending → distributed`

Corrections to the POC pattern:

- Wait for and verify the final transaction receipt before showing success.
- Recover `roundId`, winner handle, and phase from contract storage after refresh; do not keep the
  only retry data in a React ref.
- Catch `NotYetComputedHandleError` as expected pending state. SDK beta.13 exhausts its own short
  1/2/4-second retry schedule quickly, so wrap it in a longer bounded application poll.
- Offer an explicit retry button and retain Etherscan links.
- Treat an RPC 429, unresolved handle, reverted proof transaction, and failed payout receipt as
  distinct states.

## 11. Bind the public proof to application state

The finalizer must use `round.winnerHandle` already stored by the close transaction. Never accept a
caller-selected handle. Then:

1. require the round is closed/pending;
2. require it has not distributed;
3. optionally assert the stored handle is publicly decryptable;
4. call `Nox.publicDecrypt(storedWinnerHandle, proof)`;
5. bounds-check the returned index against the immutable recipient list;
6. transition to distributed before the external payout path;
7. make the Allo distribution one-shot;
8. verify the payout transaction receipt in the frontend.

The proof itself does not carry round, app, caller, expiry, or nonce. Application storage supplies
that context.

Canonical contract-side request/finalize pattern:
[`ERC20ToERC7984WrapperBase.sol`](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/extensions/ERC20ToERC7984WrapperBase.sol#L111-L124).

## 12. Keep product state in product events

Emit high-level events such as:

- `ScoreSubmitted(roundId, projectId, reviewer)`
- `RoundClosed(roundId, winnerHandle)`
- `AwardDistributed(roundId, recipient, amount)`

The generic Nox subgraph models handles and operators, not QuietRound semantics. Use application
storage/events as the source of truth. Link Etherscan, Nox Nexus, and the Nox chain-of-trust portal as
optional evidence and diagnostics.

## 13. Integrate Allo without routing encrypted ingestion through it

The safe current direction is:

- reviewers call the custom strategy/decision contract directly for encrypted score submission;
- the strategy remains registered with an unchanged stable Allo v2 pool;
- final proof verification authorizes the strategy's Allo-compatible distribution path;
- no Allo source is modified or vendored.

Because current Nox imports require Solidity `^0.8.35` while stable Allo's inherited
`BaseStrategy` graph contains an exact `0.8.19` pragma, implement the required stable `IStrategy`
surface directly at 0.8.35 rather than inheriting that source graph. This remains an implementation
spike until a pool creation and proof-gated payout have passed end to end.

## 14. Do not assume optimized ERC-7984 callbacks can compute on the callback amount

`IERC7984Receiver` documents the callback `amount` as accessible to the receiver. In the current
optimized `ERC7984Base` path, `Nox.transfer` grants its operation results to the token contract.
The token persists/grants the recipient's new balance, but it does not grant the separate
`transferred` handle to the receiver before invoking the callback. The raw path does explicitly
grant `transferred` to `to`.

Consequences:

- a callback can return a constant encrypted boolean;
- an amount-sensitive receiver cannot assume `Nox.eq`, `safeSub`, `add`, or other operations on the
  callback amount will pass ACL checks against a shared optimized token;
- a custom raw wrapper changes the token/deployment surface;
- a direct application `pay` function can validate the input itself, but pulling cTokens then
  requires the user to approve the application as an ERC-7984 operator.

Before using `transferAndCall` as a product shortcut, deploy the exact token and receiver on the
target chain and prove callback-amount computation end to end.

Sources:
[`ERC7984Base` optimized and raw paths](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/token/ERC7984Base.sol#L355-L489)
and
[`IERC7984Receiver`](https://github.com/iExec-Nox/nox-confidential-contracts/blob/e685645986af394ab5507c0c67e611650f4e4d33/contracts/interfaces/IERC7984Receiver.sol#L13-L29).

## Do not copy these POC mistakes

- The official unwrap hook marks confirmation after sending the final transaction without waiting
  for its receipt.
- cVault reads React error state immediately after an awaited step runner, risking stale state.
- cVault targets Arbitrum Sepolia, pins older Nox code, and grants its owner access to user handles.
- Some POC README addresses are labeled placeholders even though runtime config contains deployments.
- `nox-product-poc` lacks one clear repository-root license; only copy from clearly licensed subtrees.

The official POCs are strong pattern evidence, not production templates.
