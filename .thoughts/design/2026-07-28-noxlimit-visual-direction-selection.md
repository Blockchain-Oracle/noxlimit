# NoxLimit Visual Direction Selection

**Date:** 2026-07-28
**Status:** Adopted by the user
**Stage:** Prompt 5 Stage 1 complete — direction selected, Stage 2 (foundations) authorized
**Scope:** Visual language only. No change to product mechanics, the Market Stream + terminal
hybrid, the screen/state contract, or any privacy claim.

## Decision

**Direction A — `Complement` — is selected.**

Three comparable directions were designed over the same terminal slice and the same surface-map
sample data, presented at ~1440px and ~390px in light and dark. The user selected Complement.

### Selection history

The user first indicated `Vigil`, then corrected the choice to `Complement` in the same session.
`Complement` is the active decision. `Vigil` and `Caliper` are rejected history and must not be
revived without a new recorded decision. This line exists so a later agent does not resurrect the
superseded pick from a stale artifact.

## The selected direction

**Thesis:** YES and NO are two halves of one unit, so every price is drawn as a proportion you can
see — and the amount by which the pair overshoots 1.00 is the fee and pool shape, shown rather than
hidden.

Load-bearing properties that later work must preserve:

- **The unit bar is the primitive.** A 0–1 bar with YES filling from the left and NO filling from
  the right. Because separate executable quotes include pool shape, size and fees, the two do not
  meet at 1.00; the overlap is drawn as a hatched sliver labelled with the exact overshoot
  (`0.47 + 0.54 − 1.00 = 0.01`). This is a truthfulness device, not decoration — it is the design's
  answer to "why don't YES and NO add up?"
- **The rail card is its own unit bar.** Selected Market Stream cards carry the YES/NO wash inward
  from each edge at the outcome proportion, so scanning the rail reads as six differently-weighted
  units before a single number is read.
- **The chart plane is divided into outcome territory.** The strike splits the plot: above carries a
  YES wash and the label `YES resolves`, below carries a NO wash and `NO resolves`. In `Underlying`
  mode the line itself stays ink, because that series is USD and not an outcome price. This rule is
  how the design keeps oracle price and outcome-share price from ever being confused, and it is
  mandatory.
- **The private field is a withheld fill.** The one panel whose ground is hatched instead of filled,
  and the only field with a full-ink border. No padlock, no glow, no disabled styling.
- **The limit/quote scale.** Beneath the private field, a zoomed axis (window `0.40`–`0.52`, both
  bounds labelled) pins the user's maximum against the live pool quote and draws the distance
  between them as a dashed gap — literally what the order is waiting on. The window must be zoomed:
  on a full 0–1 axis the two pins sit ~3% apart and their labels collide.
- **Status is form, never colour.** The check budget is N discrete cells that fill as they are
  spent, so `Monitoring exhausted` is a picture of an empty budget. At `Publication pending` the
  private panel loses its hatch and the ground turns solid — the value is no longer withheld and the
  interface stops implying otherwise.
- **Motion is proportional.** Bars interpolate their width when a quote updates, so a moving market
  is visible as movement of the unit itself. Under `prefers-reduced-motion` widths snap.

## Palette

The palette is **inherited from Reclaim** (`getreclaim.xyz`, source of truth
`glaze/site/src/index.css`) by explicit user instruction.

| Token | Light | Dark | Note |
|---|---|---|---|
| Unit ground | `#F4F2EC` | `#08080A` | Reclaim paper / ink |
| Paper | `#FFFDF8` | `#101014` | panel surface |
| Paper-2 | `#FAF7F0` | `#17171C` | raised / selected row |
| Ink | `#1C1B19` | `#F4F4F5` | 15.2:1 / 18:1 |
| Ink-2 | `#45464B` | `#B6B8BD` | |
| Ink-3 | `#6B6D73` | `#83858B` | |
| YES | `#0E7A5E` | `#19C37D` | 4.7:1 / 8.4:1 |
| NO | `#A8482A` | `#D97757` | 5.2:1 / 6.4:1 |
| YES button ink | `#FFFFFF` | `#08080A` | 5.3:1 / 8.4:1 |
| NO button ink | `#FFFFFF` | `#1A0E08` | 5.8:1 / 6.0:1 |
| Washes | clay 14% / green 11% | clay 10% / green 7% | paired radials, top-left and top-right |

**Dark mode uses Reclaim's exact tokens.** Light mode uses derived darker twins for the outcome
pair: Reclaim's `#D97757` and `#19C37D` measure **2.8:1 and 2.1:1** on `#F4F2EC`, which fails AA for
the ~12px tabular numerals this interface is built from. Reclaim itself is unaffected because it
uses those hues as large bar fills, not as data. The derived twins hold the identity and pass.

Note the structural fit: Reclaim's own hero splits a single bar into two categories (Claude Code and
Codex footprint). Complement splits a unit into YES and NO. Same device, same palette.

### Known cost of the palette

Green/clay for YES and NO reintroduces a profit-and-loss reading that YES/NO does not carry — the
two are sides of one unit, not good and bad. This is accepted by user decision. The mitigation is
mandatory:

- every outcome value carries a **filled vs. outlined glyph** in addition to hue;
- outcome hues never encode status, and status never uses the outcome pair;
- side, status, and profit/loss are never communicated by colour alone anywhere in the product.

## Typography

| Role | Face | Use |
|---|---|---|
| Display | Archivo, `wdth` 110–122 | wordmark, market question, panel titles |
| UI / prose | Archivo, `wdth` 100, 400–600 | labels, body, buttons, notes |
| Data | IBM Plex Mono 400/500/600 | every number, always `tabular-nums`; timestamps, addresses, hashes, countdowns |

The width axis is the direction's typographic signature: display sizes are set expanded, UI is set
normal. Prose gets the sans, evidence gets the mono — so a value that came off-chain never sits in
the same voice as a label we wrote.

Faces must ship as self-hosted subsets. A CDN link is not acceptable — a silent fallback to system
fonts is a rejected outcome.

## Rejected alternatives (history, not live options)

- **Direction B — `Caliper`.** Engineering drawing; YES/NO carried by fill and position with **no
  hue at all**; one clay signal reserved for the private field and the distance-to-strike dimension
  line; registration crops and outside-plot axes. Was the most accessible of the three.
- **Direction C — `Vigil`.** Privacy as light behaviour; the private field's luminance inverted
  against the theme; Instrument Serif for the market question; lit stage with a dimmed filmstrip
  rail; check budget drawn as lamps going dark.

Ideas from the rejected directions may be grafted into Complement only through an explicit, recorded
decision — not silently. Two worth considering later: Caliper's hue-free outcome encoding as the
accessibility fallback, and Vigil's lamp metaphor for the check budget.

## What this decision does not change

- the adopted mobile Market Stream + desktop terminal hybrid;
- the PS-01–PS-17 screen/state contract in the product surface map;
- the separation of oracle price from outcome-share price;
- public / confidential / published boundaries and the canonical privacy disclosure;
- prohibited vocabulary;
- `NoxLimit orders close`, `Resolves`, and `Order expires` as three separate times.

## Next authorized action

Prompt 5 Stage 2 — foundations: semantic tokens, type scale, spacing/radius/elevation, responsive
grid, chart annotation grammar, and the component + state matrix. Then Stage 3 batches A, B, C, each
reviewed while small.

## Governed artifacts

- [`../decisions/CURRENT.md`](../decisions/CURRENT.md)
- [`../../DESIGNER_HANDOFF.md`](../../DESIGNER_HANDOFF.md)
- [`../../prompts/05-designer-agent-handoff.md`](../../prompts/05-designer-agent-handoff.md)
- [`./2026-07-28-noxlimit-product-surface-map.md`](./2026-07-28-noxlimit-product-surface-map.md)
