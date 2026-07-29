# NoxLimit Market Stream Experience Decision

**Date:** 2026-07-28
**Status:** Adopted by the user
**Scope:** Product discovery and navigation; no change to the approved protocol architecture

## Decision

NoxLimit combines two interaction grammars:

1. a **TikTok-like vertical Market Stream** for fast discovery of real, live prediction markets;
2. a **DeepBook-like trading terminal** for analysis, private-order composition, review, signing,
   and durable position management.

The TikTok reference describes vertical snap-scroll discovery and one-market-at-a-time focus. It is
not the product name, a social feed, a video feed, or an opaque recommendation algorithm.

```text
Discover / Market Stream
→ selected market Trade workspace
  (desktop terminal or mobile full-context trade view)
→ private order ticket within that workspace
→ explicit review and wallet authorization
→ Orders / Positions / Activity
```

## Responsive behavior

Two IDs prevent browsing from mutating a draft:

- `focusedMarketId` is the card currently settled/keyboard-focused in Discover and may change while
  the user browses;
- `selectedMarketId` is the market loaded into the Trade workspace and changes only through an
  explicit `Open market`, `Trade YES/NO`, desktop activation, or a confirmed dirty switch.

### Mobile

The normal mobile entry is `Discover`: a vertically scrollable, snap-aligned stream of real market
cards. Each card represents one deployed, seeded, currently catalogued market bundle and shows:

- the complete or safely expandable market question;
- tracked asset and original horizon (`1h`, `4h`, or `24h`);
- the separate remaining countdown to `NoxLimit orders close`;
- current oracle price versus strike;
- YES and NO indicative FPMM prices;
- pool liquidity and lifecycle/freshness state;
- a truthful compact chart preview from real oracle or pool history;
- `Trade YES`, `Trade NO`, and `Open market` entry actions.

`Trade YES` or `Trade NO` opens the market's full-context Trade workspace with the side preselected,
never a bare form and never a direct trade. On mobile that full-height view must contain the full
question, oracle price versus strike, YES/NO prices, liquidity and size-aware quote, order-close and
resolution terms, plus an expandable full chart before the review step. The user still enters the
public amount, private maximum price, and expiry and completes the privacy/transaction review before
any Gateway request or wallet signature.

### Desktop

The full terminal remains the primary workspace. Its left rail becomes a vertically scrollable
Market Stream with richer cards instead of a static ticker list. A deliberate card selection
updates the selected market facts, charts, quote ladder, and ticket. Merely passing through cards
must not silently destroy an in-progress order draft. Public fields may be preserved in volatile
per-market state, but a dirty ticket requires confirmation before switching markets. A confirmed
market/account/chain switch clears the private maximum price; it is never stored in a URL, browser
storage, analytics, or backend. Mobile sheet dismissal, back navigation, and swipe-away use the same
keep-editing/discard protection.

## Catalog and ranking rules

- Only verified, deployed, seeded bundles can appear as live cards. There are no placeholder
  markets to make the stream look populated.
- The initial expected live depth is BTC/USD and ETH/USD across `1h`, `4h`, and `24h`—up to six
  active cards—plus SOL/USD only after its Pyth resolver passes the accepted live gate.
- One active near-the-money bundle per asset/horizon remains the initial liquidity policy. The
  stream does not create many strikes merely to imitate an infinite feed.
- Resolved and resolving markets remain available through explicit lifecycle filters/history; they
  do not masquerade as live opportunities.
- Ordering has exactly three deterministic user-visible modes: `Closing soon`
  (`tradingClosesAt ASC`), `Recently opened` (`opensAt DESC`), and `Liquidity` (numeric
  `completeSetDepthAtoms DESC`), each with `marketId ASC` tie-breaking. Asset, horizon, and lifecycle are
  filters, not sort modes. Implementations must not compare decimal strings lexicographically or
  convert onchain-sized integers through floating point. The first release has no personalized
  `For You` ranking.
- Dynamic prices, liquidity, freshness, and countdowns update in place, but the list does not
  reshuffle while a card or Trade workspace is focused. Filter/sort changes are deliberate; a
  changed background ranking appears as a refresh affordance rather than moving the active card.
- Market horizon and remaining close countdown remain distinct. User order expiry remains a third,
  separately chosen time.

## Product boundary

The Market Stream is a discovery layer, not the whole product. NoxLimit's core value still appears
in the terminal and order lifecycle:

- the full-size oracle/outcome chart remains the central analytical surface;
- the FPMM quote ladder remains the truthful liquidity view;
- the confidential maximum-price instruction remains the signature action;
- explicit review remains mandatory before signing;
- Orders, Positions, resolution, and redemption remain durable product destinations.

The design must avoid social-engagement mechanics, autoplay media, likes/comments, fake popularity,
one-tap wagering, fabricated markets, and fake chart history. Mobile snap behavior must support
keyboard/switch access, reduced motion, visible position in the stream, and ordinary scrolling when
snap motion is unsuitable.

## Why this decision

The stream makes a multi-asset, multi-horizon catalog immediately understandable and enjoyable to
browse on mobile. The terminal preserves the context required for a financial action: oracle versus
outcome price, liquidity, settlement terms, the private-limit boundary, and explicit transaction
review. Combining them gives NoxLimit a distinctive discovery experience without weakening the
approved product or turning the interface into a generic dashboard.

## Artifacts governed by this decision

- [`CURRENT.md`](./CURRENT.md)
- [`../architecture/2026-07-25-noxlimit-system-architecture.md`](../architecture/2026-07-25-noxlimit-system-architecture.md)
- [`../stories/2026-07-28-noxlimit-product-stories.md`](../stories/2026-07-28-noxlimit-product-stories.md)
- [`../design/2026-07-28-noxlimit-product-surface-map.md`](../design/2026-07-28-noxlimit-product-surface-map.md)
- [`../../DESIGNER_HANDOFF.md`](../../DESIGNER_HANDOFF.md)
- [`../../prompts/05-designer-agent-handoff.md`](../../prompts/05-designer-agent-handoff.md)

The designer owns visual language, exact card composition, gesture polish, and motion within these
product laws. The designer does not decide whether discovery replaces the terminal; the adopted
answer is the hybrid above.
