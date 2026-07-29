# NoxLimit Designer → Developer Handoff

**Date:** 2026-07-28
**Direction:** `Complement` — see
[visual direction decision](./2026-07-28-noxlimit-visual-direction-selection.md)
**System:** [foundations](./2026-07-28-noxlimit-foundations.md)
**Status:** Batches A–C delivered and audited. Prototype and final consistency pass outstanding.

Design specification only. No application code was created or modified by this work.

## Deliverables

Every page is checked into the repository as a self-contained HTML file (webfonts inlined — open
directly in any browser, no server, no network):

| Repo file (durable source of truth) | Live artifact | Contents |
|---|---|---|
| `.thoughts/design/html/noxlimit-directions.html` | [link](https://claude.ai/code/artifact/a10d83f0-cde6-44bc-8c31-cbc7d0ac0f07) | `Complement` (selected), `Caliper`, `Vigil` — 1440 + 390, light and dark |
| `.thoughts/design/html/noxlimit-foundations.html` | [link](https://claude.ai/code/artifact/4e267468-6b6f-4387-bf76-e3178dfd10fe) | Tokens incl. confidential axis, card grammar, type, status system, chart rules |
| `.thoughts/design/html/noxlimit-batch-a.html` | [link](https://claude.ai/code/artifact/1a50a4f5-f3a9-4ba2-afaa-3e314d19fae5) | PS-01 – PS-07 core terminal states |
| `.thoughts/design/html/noxlimit-batch-b.html` | [link](https://claude.ai/code/artifact/8713a8e7-9d39-44b8-ac9e-ec78a9417112) | PS-08 – PS-11 lifecycle + 390px mobile composition |
| `.thoughts/design/html/noxlimit-batch-c.html` | [link](https://claude.ai/code/artifact/c7305942-1232-4749-8725-40cb5496ed6c) | PS-12 – PS-16 owned outcome + 390px mobile composition |
| `.thoughts/design/html/noxlimit-prototype.html` | [link](https://claude.ai/code/artifact/b88ec935-b266-420a-9b8a-46fbbbda5a6d) | Interactive prototype — all five §12 journeys clickable on the legal state machine |

The repo files are authoritative. Artifact links are conveniences that can expire; if one is lost,
republish the repo file. Developers should read the CSS custom properties in any of these files as
the executable token definitions.

## Surface coverage

| Surface | Priority | Covered in | States delivered |
|---|---|---|---|
| PS-01 Global shell | P0 | Batch A | booting · read-only · wrong network · unfunded · ready · degraded · evaluator down |
| PS-02 Market Stream | P0 | Batch A | loading · ready · not-tradeable · filter-empty · stale · dirty-switch · reduced-motion |
| PS-03 Market header | P0 | Batch A | live · closing soon · orders closed · awaiting resolution · resolved · oracle stale · pool unavailable |
| PS-04 Chart | P0 | Batch A | underlying · outcome prices · limited history · stale/unavailable |
| PS-05 Quote ladder | P0 | Batch A | ready · insufficient liquidity · orders closed |
| PS-06 Recent fills | P1 | Batch A | ready · indexer delayed (tab on the ladder) |
| PS-07 Order ticket | P0 | Batch A | resting price · eligible now · invalid · quote refreshing · three gates · disabled by market |
| PS-08 Create sequence | P0 | Batch B | 5 steps · rejected · gateway down · reverted · stale quote · account change · duplicate |
| PS-09 Receipt | P0 | Batch B | just confirmed (session) · after reload (durable) |
| PS-10 My Orders | P0 | Batch B | all twelve statuses with primary actions |
| PS-11 Order detail | P0 | Batch B | resting/evaluating · publication pending · filled · exhausted · refundable · zero recovery |
| PS-12 Positions | P0 | Batch C | open · winner · loser · redemption pending · redeemed · empty/mismatch |
| PS-13 Resolution | P0 | Batch C | before resolution · resolved with evidence |
| PS-14 Activity | P1 | Batch C | ready with filters |
| PS-15 Onboarding | P0 | Batch C | check · sign/track · cooldown · cap · treasury low · partial |
| PS-16 Privacy explainer | P0 | Batch C | five-step structure + canonical disclosure |
| PS-17 Diagnostics | P2 | not designed | out of scope for the trader UI; operator view only |

## Implementation notes that are not obvious from the frames

1. **`minmax(Npx, 1fr)` overflows any container narrower than N.** Use
   `minmax(min(Npx, 100%), 1fr)`. This produced a 384px horizontal overflow at 390px until fixed;
   it will recur in any grid written the naive way.
2. **Flex columns silently collapse short children.** Set `flex-shrink: 0` on sheet children or
   elements like the unit rail render at 0px height while still occupying DOM.
3. **Scope component modifier classes.** A status modifier named `.bar` inherited the page header's
   `.bar` rules and rendered a 13px mark as a 59×27 ellipse. Prefix or namespace modifiers.
4. **The outcome wash must be applied by a selector that covers every card variant.** It was scoped
   to the desktop card only and silently vanished on mobile, taking the direction's signature with
   it.
5. **Verify computed geometry, not screenshots.** Every one of the above looked plausible rendered.
   The checks that caught them: dump each mark's `getBoundingClientRect`, and run a pairwise
   intersection test over positioned labels.

## Copy rules the implementation must not relax

- `NoxLimit orders close` — never "market closes". The unchanged FPMM has no clock.
- `Order expires`, `Resolves`, `NoxLimit orders close` are three separate labelled fields.
- `Minimum shares` in the primary interface; `minOut` never appears.
- `Current pool quote`, not `Market price`.
- Pre-fill: `Minimum protected winning redemption at the limit`. Post-fill: `Winning redemption`.
- Any pool value on a position is labelled **non-executable** — v1 has no sell.
- Never: `anonymous`, `invisible`, `fully private`, `FHE`, `zero knowledge`, `order book`, `depth`,
  `bid`, `ask`, `maker`, `taker`, `guaranteed fill`, `instant fill`, `mainnet`,
  `organic liquidity`, `For You`, `Trending`, or `funds returned` before a refund confirms.
- Canonical disclosure verbatim; short form beside the field is
  “Encrypted while the order rests — not invisible.”

## Verified against the corpus

- `minOut = ceilDiv(amountIn × 1e18, maxAveragePriceWad)` — the sample 25.00 Test USDC at a 0.44
  maximum yields exactly `56.818182`, which is what every frame shows. Ceil rounding makes the
  protected minimum slightly more protective than the decimal preview, and copy says so.
- Contrast measured for every token pair against its real ground; all pass WCAG 2.2 AA. Reclaim's
  raw hues measure 2.26:1 and 3.07:1 on paper, which is why light mode uses derived twins.
- No horizontal page scroll at 390px on any delivered page, verified by walking every element box.
- Twelve status marks verified distinct and correctly sized.

## Genuinely outstanding

**Design**
- ~~Interactive prototype~~ — delivered 2026-07-28 (`.thoughts/design/html/noxlimit-prototype.html`).
  A working simulated terminal on the legal order state machine: discover → ticket → review →
  Gateway → approve → create → receipt; browser-off fill via simulated evaluator checks and a quote
  move (fills at 57.142857 against the 56.818182 minimum — the surface-map numbers); cancel → refund;
  expiry ready → expire → refund; resolve → redeem. Guards verified: publication pending forbids
  owner cancellation; no terminal state re-enters monitoring; balance changes only on refund/redeem
  confirmation. A journeys panel tracks the five §12 paths; all five verified clickable end to end.
  Simulation controls are visually fenced as prototype scaffolding (dashed panel, labelled).
- ~~Mobile compositions for Batches B and C~~ — delivered 2026-07-28: My Orders, order detail and
  receipt as 390px cards (Batch B); positions and funding (Batch C). Actions pinned, confidential
  axis intact.
- PS-17 operator diagnostics, if the team wants it designed rather than improvised.

**Card grammar (added after user review).** Cards are artifacts, not forms: proportional outcome
wash on owned things, the violet confidential band, the phase rail, the perforated receipt, and the
Gateway route map. See the card-grammar section of the foundations doc — the review step is a trade
ticket, and key–value lists are reserved for detail below a receipt's perforation.

**Content**
- Full copy deck as a single extractable list; copy currently lives inline in the frames.
- Error strings for every `tradeabilityReasons` value.

**Implementation dependencies (design tolerates either outcome)**
- Measured check budget, cadence and recovery windows.
- Real chart history depth at launch.
- Whether SOL/USD is active.
- Portfolio placement: fixed strip, resizable tray, or route.
- Funding provider cooldown and cap policy.

## Next authorized action

Prototype pass, then the final consistency review against Prompt 5 §14. Neither blocks a developer
starting Batch A surfaces from the tokens and states already specified.
