# NoxLimit Design Foundations — Direction `Complement`

**Date:** 2026-07-28
**Status:** Prompt 5 Stage 2 delivered; awaiting review before Batch A
**Direction:** [`Complement`](./2026-07-28-noxlimit-visual-direction-selection.md)
**Rendered system:** <https://claude.ai/code/artifact/4e267468-6b6f-4387-bf76-e3178dfd10fe>

Design specification only. Defines tokens and component grammar for Batches A–C. No application
code is modified by this document.

## Colour

One rule governs the palette: **colour carries exactly one meaning — which outcome.** Status,
severity, and success/failure are encoded by form, never hue. This keeps the outcome pair
unambiguous and satisfies the surface map's rule that side and status are never colour alone.

### Tokens and measured contrast

| Token | Light | Dark | Role | Contrast (L/D) |
|---|---|---|---|---|
| `--unit` | `#F4F2EC` | `#08080A` | app ground | — |
| `--paper` | `#FFFDF8` | `#101014` | panel surface | — |
| `--paper-2` | `#FAF7F0` | `#17171C` | inset field, selected row | — |
| `--ink` | `#1C1B19` | `#F4F4F5` | primary text/action | 15.37 / 18.21 |
| `--ink-2` | `#45464B` | `#B6B8BD` | secondary text | 9.26 / 9.56 |
| `--ink-3` | `#6B6D73` | `#83858B` | labels, units | 5.09 / 5.15 |
| `--yes` | `#0E7A5E` | `#19C37D` | YES value and fill | 5.21 / 8.27 |
| `--no` | `#A8482A` | `#D97757` | NO value and fill | 5.70 / 6.08 |
| `--yes-btn-ink` | `#FFFFFF` | `#08080A` | on YES ground | 5.30 / 8.71 |
| `--no-btn-ink` | `#FFFFFF` | `#1A0E08` | on NO ground | 5.79 / 6.06 |

All pairs measured against their actual ground. Every one passes WCAG 2.2 AA for normal text.

**Reclaim's raw hues are dark-mode only.** `#19C37D` measures **2.26:1** and `#D97757` **3.07:1** on
`#FFFDF8` — below AA for the ~12px tabular numerals this interface is built from. Reclaim is
unaffected because it uses them as large bar fills. Light mode uses the derived twins above.

### The confidential axis — a third hue

Added 2026-07-28 after review. The original rule — "colour means outcome, nothing else" — left the
product's single most important concept rendered in plain ink, and made the lifecycle surfaces read
flat. The correction is not decoration; it gives the confidential state its own axis.

| Token | Light | Dark | Contrast | Hue |
|---|---|---|---|---|
| `--priv` | `#5B3FBF` | `#A692FF` | 7.10 / 7.39 | 251° |

For comparison: YES sits at 155°, NO at 15°. Violet cannot be misread as either.

**The rule:** violet marks the maximum price **while it is still withheld** — the private field and
its hatch, the `Resting privately` and `Evaluating` marks, `Encrypted private limit`, the
confidential column in review, and the confidential steps of the explainer.

**It switches off at `Publication pending`.** Ink returns. The privacy transition stops being a
sentence the user has to read and becomes a visible change of state. This is the single most
important thing the colour does.

Never used for outcome, severity, or decoration.

**Lifecycle rail.** A horizontal track split into a violet hatched confidential phase and a solid
ink public phase, divided by a hard rule at publication, with terminal branches beneath. It replaces
roughly a screen of prose about cancellation, expiry and refund ordering.

### Card grammar — cards are artifacts, not forms

Added 2026-07-28 after user review ("too plain; the resolved-winner card is what creativity looks
like"). The reference point is the position card whose outcome wash fills it at the real
proportion. Five devices, each carrying a product truth:

| Device | Rule |
|---|---|
| **Proportional outcome wash** | A card representing something owned carries the outcome wash at its real proportion — 47% open, 100% resolved winner. The card is its own unit bar. |
| **Violet confidential band** | A full-width hatched violet band holds the withheld value in tickets and receipts. It turns to plain ground at publication. |
| **Phase rail** | Slim track — violet hatch, hard tick, plain ground — showing where an order sits relative to the privacy boundary. Detail views and mobile cards. |
| **Perforated receipt** | Receipts split summary from detail with a perforation and edge notches. Proof, not a settings panel. |
| **Route map** | The Gateway call drawn as a route: browser → violet dashed path → Gateway, struck-through API node labelled *never receives it*. |

The review step is a **trade ticket**: chip header, question in display type, side+amount hero on
the outcome wash, violet band, then a small public-meta strip. Key–value row lists are reserved for
genuinely tabular detail below a receipt's perforation.

### Mandatory redundancy

Every outcome value pairs hue with a glyph — **filled square for YES, outlined square for NO**. Not
optional styling; it is the mitigation recorded in the direction decision for the profit/loss
reading that green/clay inherits.

### The unit bar

YES fills from the left, NO from the right on a 0–1 track. They do not meet at 1.00, because
separate executable quotes include pool shape, size and fees. The overlap is bracketed, hatched, and
labelled with the exact overshoot. For the sample market: `0.47 + 0.54 − 1.00 = 0.01`.

## Typography

Two families, three roles. **Prose gets the sans, evidence gets the mono** — a value returned by the
chain never shares a voice with a label NoxLimit wrote.

| Role | Face | Spec |
|---|---|---|
| Display | Archivo 600, `wdth 118` | 30/1.15, −0.03em |
| Title | Archivo 600, `wdth 108` | 21/1.25, −0.025em |
| Body | Archivo 400, `wdth 100` | 15/1.6 |
| Small | Archivo 400 | 13/1.5 |
| Label | IBM Plex Mono 500 | 9.5, +0.13em, uppercase |
| Numeric lead | IBM Plex Mono 500 | 19, tabular |
| Data | IBM Plex Mono 400 | 12.5, tabular |

Archivo's width axis is the signature: display expanded, UI normal.

### Numeric rules

- `font-variant-numeric: tabular-nums` on every numeral, without exception.
- Units are never implied: `Test USDC`, `Test USDC / share`, `56.818182 YES`.
- Test USDC is six decimals.
- `minOut = ceilDiv(amountIn × 1e18, maxAveragePriceWad)`. Ceil rounding makes the protected
  minimum slightly **more** protective than a decimal preview, and copy says so.
- Countdowns always carry an absolute UTC time beside the relative one.
- Atom amounts, block numbers and order IDs are decimal strings compared numerically — never
  lexicographically, never through float.

## Space and structure

Spacing `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Radius `4 · 6 · 9 · 12`.

**No drop shadows.** Depth is a 1px rule plus a one-step ground change; sheets use a scrim. A
terminal that shadows every panel reads as a card dashboard.

| Breakpoint | Composition |
|---|---|
| ≥ 1280 | rail 302 · fluid centre · ticket 384 |
| 1024–1279 | rail 272 · fluid centre · ticket 344; ladder shows selected side only |
| 768–1023 | rail becomes a drawer; ticket may dock to the bottom |
| < 768 | single column Discover stream; full-height Trade workspace |
| 390 | reference mobile; no horizontal page scroll |

## Mobile composition rules

Established while auditing the selected direction's 390px frames. These are binding for Batches A–C.

- **The card wash is not desktop-only.** The YES/NO wash reading inward from each card edge at the
  outcome proportion is the direction's signature and must render on the mobile Discover card too,
  at ~55% of the desktop strength so a full-height card does not over-saturate.
- **Glyph redundancy applies at every size.** Mobile outcome values carry the filled/outlined square
  exactly as desktop rail cards do. There is no size at which hue alone is acceptable.
- **The overshoot is drawn wherever a unit bar appears**, including the compact mobile bar. A bar
  that appears to fill exactly to 1.00 misrepresents the quote pair.
- **The mobile Trade workspace pins its primary action.** Content scrolls in the sheet; `Review
  private order` and the short privacy disclosure sit in a fixed footer so the action is always
  reachable and the disclosure is never scrolled away from the field it describes.
- **The mobile Trade workspace is full-context, not a bare ticket.** It carries the full question,
  the unit rail, the chart, a size-aware quote ladder, the ticket, and the preview rows — per the
  Market Stream decision. A card action preselects market and side only.
- Flex sheets must set `flex-shrink: 0` on children; an unconstrained flex column silently collapses
  short elements such as the unit rail to zero height.

## Batch A open questions — resolved by the designer

The user delegated final judgment on 2026-07-28. Decided as follows, each from the contract rather
than preference:

1. **Recent fills becomes a tab on the quote ladder** (`Quotes` / `Recent fills`), not a panel below
   it. The chart is the central analytical surface and needs the height; fills are reference texture,
   not a decision input. PS-06 is P1 and nothing in it is needed to compose an order.
2. **Quick-amount chips stay absolute** — `5 / 25 / 100 / 250` — matching the ladder rows exactly, so
   a chip and a ladder row are the same real `calcBuyAmount` quote. Percentages of balance would
   break that correspondence and are meaningless against a sponsored testnet grant.
3. **Not-tradeable cards stay inline, dimmed, with their reason.** The surface map requires a
   temporarily stale or evaluator-down active market to stay visible carrying every exact disabled
   reason; collapsing them into a "Not tradeable" group hides the catalog's real state.

## Limit/quote scale — collision rule

The scale beneath the private field is a zoomed window (`0.40`–`0.52`, both bounds labelled) so the
limit and the pool quote never sit on top of each other. One further rule, found while designing the
`Eligible now` state:

- When the two pins fall **within ~20% of the scale width**, positioned captions collide. Drop the
  per-pin captions and render a single legend line beneath instead (`▍Your limit 0.48 · ▍Pool quote
  0.47`). Pins and value labels stay positioned; only the captions fall back.

## Status system

Twelve named statuses, each with a distinct geometric mark. **No status uses hue at all.**

| Status | Mark | Valid primary action |
|---|---|---|
| Awaiting signature | dashed circle | Sign, or cancel locally |
| Resting privately | hatched square | View · Cancel |
| Evaluating | half-filled circle | View · Cancel while rules allow |
| Publication pending | ring | View only — owner cancellation forbidden |
| Filled | solid circle + check | View position |
| Monitoring exhausted | barred circle | Cancel or replace, then refund |
| Expiry ready | square + filled corner | Expire order |
| Cancelled | circle + diagonal slash | Claim refund |
| Expired | square + diagonal slash | Claim refund |
| Refundable | diamond | Claim refund |
| Refund pending | dashed square | View transaction |
| Refunded | solid square + check | View receipt |

Two rules the marks exist to enforce:

- **`Publication pending` is the privacy transition, not `Filled`.** The candidate is publicly
  retrievable before the pool trade finalizes, and stays public even if execution then fails.
- **Cancellation never returns collateral.** `Cancelled` and `Expired` both expose a separate
  `Claim refund` transaction; no balance changes until it confirms.

The check budget renders as discrete cells that fill as checks are spent. A timed-out evaluation
still consumes a check, so the budget is the honest picture of remaining monitoring.

Tradeability reasons keep their fixed precedence: `UNVERIFIED`, `NOT_ACTIVE`, `ORDERING_CLOSED`,
`INDEXER_UNSAFE`, `ORACLE_STALE`, `NO_LIQUIDITY`, `EVALUATOR_UNAVAILABLE`. Badges (`NEW`,
`CLOSING_SOON`, `LOW_LIQUIDITY`, `STALE`) are derived, never lifecycle states.

## Banners are hue-free

Severity is carried by inversion and rule weight. A red banner beside a clay `NO` price would be a
genuine misread, so critical uses a fully inverted ink ground instead of a hue.

`info` inset ground · `warning` 3px ink left rule · `critical` inverted ink · `stale` dashed border.

## Chart grammar

Two truthful modes. `Underlying` is USD and its line stays **ink, never an outcome hue**, because
the series is not an outcome price. The strike divides the plot into outcome territory — YES wash
above, NO wash below, each labelled. That single rule is how the two prices stay distinguishable.

- Strike: dashed rule + bordered chip with the exact value.
- Orders close: dotted vertical marker labelled `NoxLimit orders close` — never "market closes".
- Crosshair snaps to real observations; it never interpolates an unobserved value.
- Fewer than two real points draws **no curve at all**.
- Cards ≤ 24 points via lightweight SVG; terminal ≤ 240 via Lightweight Charts with TradingView
  attribution present.
- Every chart is `role="img"` with a summary naming value, units, source, as-of time, and strike.

## Motion

`160ms` unit-bar width interpolation · `120ms` card wash cross-fade · `180ms` sheet entry ·
`0ms` for anything conveying transaction state. Under `prefers-reduced-motion` widths snap, washes
cross-fade instantly, and skeleton shimmer becomes a static block. No information lives in motion.

## Three times, never collapsed

`NoxLimit orders close` (immutable per market; stops NoxLimit order actions, not an FPMM guard) ·
`Resolves` (needs a transaction; not automatic) · `Order expires` (per order, ≤ orders close;
presets 10m · 30m · 1h · until close).

## Open dependencies this system tolerates

Check budget and cadence (cells generate from `maximumEvaluations`; any N renders) · recovery
windows (measured values, never presented as expected timing) · chart history depth (sparse is a
designed state) · SOL/USD (appears only after its Pyth gate; no placeholder reserved) · portfolio
placement (strip, tray or route) · funding provider (capability language, not provider promises).

## Next authorized action

Batch A — core terminal: PS-01 through PS-07 with their loading, empty, stale, error and recovery
states, at ~1440px and ~390px, reviewed before Batch B.
