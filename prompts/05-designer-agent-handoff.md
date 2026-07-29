# Prompt 5 — Design NoxLimit From Product Truth to Developer Handoff

> **PARALLEL DESIGN PROMPT.** Product selection, architecture, and the core user flow are already
> approved. This prompt does not reopen them. It takes a designer agent from context reconciliation
> through visual-direction choice, audited design batches, prototype, and implementation handoff.

You are the lead product designer for NoxLimit. Work from the repository's accepted product truth,
not from generic crypto-dashboard conventions and not from memory. Your output must be a real,
coherent normal UX for every user—not a special evaluation shortcut and not a pretty demo detached
from executable behavior.

## 1. Start with context reconciliation

Before proposing a visual direction or editing any artifact:

1. Inspect `git status` and preserve unrelated work.
2. Read these sources in order and completely:
   1. `.thoughts/decisions/CURRENT.md`
   2. `.thoughts/decisions/AUDIT-GATES.md`
   3. `DESIGNER_HANDOFF.md`
   4. `.thoughts/decisions/2026-07-28-noxlimit-market-stream-experience.md`
   5. `.thoughts/stories/2026-07-28-noxlimit-product-stories.md`
   6. `.thoughts/design/2026-07-28-noxlimit-product-surface-map.md`
   7. `.thoughts/architecture/2026-07-25-noxlimit-system-architecture.md`
   8. `.thoughts/plans/2026-07-28-noxlimit-polished-product-plan.md`
   9. `.thoughts/research/2026-07-28-deepbook-patterns-for-noxlimit.md`
   10. `.thoughts/verification/2026-07-28-noxlimit-product-surface-and-opus-reconciliation.md`
3. State, concisely:
   - the product promise;
   - the primary user's mental model;
   - what is public, confidential while resting, learned by the evaluator, and public at
     publication;
   - what is technically fixed;
   - what visual/product-design decisions remain open;
   - any real contradiction you found.
4. Search the corpus before claiming a screen, flow, or state is missing.
5. Treat old `DROP`, `STOP`, “awaiting checkpoint,” and generic-idea artifacts as history. The
   polished product build is authorized.

If you find a true product-mechanic contradiction, stop that affected surface, cite both sources,
and ask for resolution. Do not silently invent a new protocol behavior. Ordinary visual ambiguity
is yours to solve.

## 2. Create and maintain your own design plan

Create a visible task plan with exactly one item in progress. It must cover:

1. context reconciliation;
2. visual-direction exploration;
3. user direction selection;
4. foundations and component grammar;
5. Batch A — core terminal;
6. Batch B — private-order lifecycle;
7. Batch C — complete position/onboarding loop;
8. responsive/accessibility/state audit;
9. interactive prototype;
10. developer handoff and final consistency review.

Update the plan as work advances. Do not mark a stage complete because a frame exists; mark it
complete when its required variants, behavior, and review decision are recorded.

## 3. Product truth you must preserve

NoxLimit is a hybrid prediction-market discovery stream and direct Ethereum Sepolia terminal for
private maximum-price orders. A user moves through a TikTok-like vertical Market Stream, selects a
real BTC/USD or ETH/USD market (and SOL/USD only after its Pyth path is verified), chooses YES or
NO, enters a public Test USDC amount, and sets one private maximum average outcome-share price. The
browser sends the initial confidential input directly to the official Nox Handle Gateway. The
NoxLimit application API/database/analytics never receives that initial plaintext. A hosted
evaluator continues checking after the browser closes.

During monitoring:

- an ineligible private candidate decrypts to zero, so the evaluator learns failure but not the
  exact limit;
- an eligible candidate gives the fixed evaluator the exact derived limit;
- in the honest path the worker requests public decryption only for a nonzero candidate;
- the confidentiality transition occurs at `Publication pending`: once public decryption is
  granted, the candidate is publicly retrievable before the pool trade is finalized;
- a malicious or mistaken zero publication is proved and safely recovered without trading;
- a nonzero proof permits one atomic FPMM buy protected by minimum shares;
- a failed pool call can become `Disclosed refundable`; publication is not undone.

The product includes:

- BTC/USD and ETH/USD, plus only live-verified SOL/USD;
- 1h, 4h, and 24h horizons;
- real seeded Conditional Tokens + FPMM bundles;
- real oracle and outcome-price history;
- real size-aware AMM quotes;
- one-wallet onboarding with sponsored Sepolia ETH and NoxLimit Test USDC;
- browser-off monitoring with a visible check budget;
- cancel, `Expiry ready → Expire order`, separate refund, fill, position, permissionless objective
  resolution, and redemption;
- Orders, Positions, Activity, privacy explanation, and mobile behavior.

Each asset/horizon is a discrete market bundle with its own strike, close/resolution countdown,
YES/NO assets, FPMM, and OrderBook. A `4h` label describes the original market horizon, not the
time remaining when a user arrives. The initial catalog prefers one active near-the-money market
per asset/horizon and rolls a verified successor as it closes, instead of fragmenting liquidity
across many simultaneous strikes.

The Market Stream decision is fixed, not one of your visual-direction alternatives:

- mobile opens into `Discover`, with vertical full-height or near-full-height snap cards;
- desktop keeps the terminal primary and turns the left rail into a richer vertical stream;
- every card shows a real/expandable question, asset/horizon, separate close countdown, oracle
  versus strike, YES/NO prices, liquidity, lifecycle/freshness, and truthful chart preview;
- `Open market`, `Trade YES`, and `Trade NO` enter a full-context Trade workspace with the full
  question, oracle-versus-outcome distinction, size-aware quote, liquidity/terms, expandable full
  chart, and ticket; no card can execute a one-tap order or bypass review;
- visible deterministic sorting has exactly three choices: `Closing soon`
  (`tradingClosesAt ASC`), `Recently opened` (`opensAt DESC`), and `Liquidity` (numeric fixed-point
  complete-set depth `DESC`), each then `marketId ASC`; asset, horizon, and lifecycle are filters,
  never sort modes or an invented personalized `For You`;
- the first likely live set is BTC and ETH across three horizons (up to six cards); SOL appears only
  after verification, and no empty placeholder is reserved for it;
- casual scrolling cannot silently destroy an edited desktop order draft;
- public fields may remain only in volatile per-market state; dirty market switches and mobile
  dismissal/back/swipe require keep-editing/discard handling, and confirmed navigation/discard
  clears the private maximum price without persisting it;
- live values update in place, but background ranking cannot move a focused card; apply stable
  `marketId`-tied ordering only after a deliberate filter/sort/refresh action;
- every compact chart uses at most 24 real, deterministic points and visibly carries source,
  as-of/freshness, and limited-history state. Underlying previews come from phase-aware Chainlink
  or verified Pyth reads; outcome previews come from reconstructed FPMM state. With fewer than two
  points, show no curve. Use a lightweight accessible SVG on cards and reserve Lightweight Charts
  for the full terminal;
- “TikTok-like” describes discovery motion only. Do not add social video, likes/comments, autoplay,
  fake popularity, or engagement bait.

It does not include:

- a CLOB, public bid/ask depth, maker queue, or matching between user orders;
- sells, early cash-out, partial fills, leverage, or an LP console;
- a permissionless market factory or Polymarket routing;
- hidden wallet, market, side, amount, timing, position, or redemption;
- claims of anonymity, FHE, mainnet, guaranteed latency, organic liquidity, or audit completion.

The `tradingClosesAt` rule closes NoxLimit order actions. The unchanged FPMM bytecode is not
time-aware; the operator removes builder-seeded LP liquidity before resolution. User copy should
say `NoxLimit orders close`, not claim that the legacy pool contract itself closes.

## 4. Universal 30-second UX law

The user must understand the product and enter its core loop quickly as the normal experience. Do
not create a separate reduced path for evaluation.

For every first-time user:

- the app opens directly into a readable live Market Stream/selected market, with the full terminal
  one deliberate action away;
- market inspection works before wallet connection;
- one wallet is the only identity/account;
- if funds are missing, one gas-free signed request triggers product-sponsored Sepolia ETH and
  NoxLimit Test USDC funding;
- no external faucet, local setup, second wallet, or separate product account is required;
- the product explains oracle price versus YES/NO outcome-share price before the order action;
- the private field and its limits are understandable without TEE/FPMM/CTF jargon;
- “30 seconds” means understanding and entering the workflow, not guaranteed chain or Nox fill
  latency.

Do not create a reduced “demo mode” that bypasses the real normal flow.

## 5. The trading chart is the central analytical surface

The desktop hierarchy is:

```text
Market Stream rail  →  market facts + TRADING CHART + AMM quote ladder  →  private order ticket
```

On mobile, the compact truthful card chart is a discovery preview; the full market view retains the
central analytical chart before or alongside order composition. Do not let the feed crop become the
only analytical context.

Design two truthful chart modes or coordinated panes:

1. `Underlying`: real oracle observations, USD axis, strike line, NoxLimit-order-close marker, and
   resolution marker.
2. `Outcome prices`: real YES and NO FPMM-implied history, Test USDC/share axis, and actual fill
   markers.

Place a size-aware AMM quote ladder beside or below the chart:

```text
Test USDC in | shares received | fee-inclusive average price | price impact
```

Every row is a real `calcBuyAmount` quote. Private resting limits are never public depth. Do not
fabricate OHLC candles, volume, trades, bids, asks, midpoint, or liquidity. If data is sparse,
design a truthful point/line and `Limited history` state. Lightweight Charts is the renderer, not a
third-party price/data feed, and its required TradingView attribution must be present.

## 6. Funding experience to design

The wallet needs two assets:

- native Sepolia ETH for gas;
- six-decimal `NoxLimit Test USDC` as stable market collateral.

Do not substitute native Sepolia ETH as market collateral: Conditional Tokens expects an ERC-20,
and wrapping ETH would add friction and make the 0–1 outcome-price/payout model volatile.

Design one `Fund test wallet` sequence:

1. check wallet/network/balances;
2. explain the two test assets concisely;
3. request one short-lived wallet signature, not a gas-paying transaction;
4. show sponsor-service submission;
5. track Sepolia ETH and Test USDC arrival separately;
6. handle partial completion/retry, cooldown/rate limit, treasury low, service unavailable, user
   rejection, account/network change, and already funded states;
7. return directly to the preserved market/order context.

The initial grant tops toward measured starting targets: enough gas for one complete lifecycle plus
recovery and enough Test USDC for several orders. Afterward, balances decrease normally and are
never replenished automatically. A low-balance returning user may explicitly request a refill only
after the configured cooldown; it tops toward a cap and respects per-refill/lifetime limits. Design
insufficient balance, refill eligible, cooldown, and cap-reached states. This sponsored funding
action does not imply that normal order transactions are gasless.

## 7. Stage 1 — Offer visual directions before full design

Do not immediately design all screens. First create **three genuinely distinct visual directions**
for the same comparable terminal slice, using the exact same design-sample market/order data from
the surface map.

Each direction must include:

- a memorable working name and one-sentence design thesis;
- a high-fidelity desktop terminal hero slice with its Market Stream rail;
- a representative full mobile Discover card and its transition into the terminal/order ticket;
- information-density strategy;
- typography roles;
- color/contrast logic;
- chart treatment;
- treatment of the private maximum-price field;
- order lifecycle/status treatment;
- motion/interaction signature;
- accessibility reasoning;
- why it fits NoxLimit rather than any exchange;
- implementation complexity and main risk.

The options must differ in visual composition and interaction treatment, not in whether the adopted
Market Stream + terminal hybrid exists. Avoid
default “dark navy + neon cyan/purple + glowing cards” autopilot unless a direction earns and
substantially transforms it. Avoid generic card grids, excessive pills, fake terminal noise, and
decorative privacy locks everywhere.

Present the directions side by side and ask the user to choose:

- Direction A;
- Direction B;
- Direction C;
- or a clearly specified hybrid.

**Pause after this choice request.** Do not build the full design system or batches until the user
selects a direction. Record the selected direction and any hybrid rules in a dated design decision
note so another agent cannot silently revert it.

## 8. Stage 2 — Foundations after direction selection

Turn the selected direction into a restrained system:

- semantic color tokens, including data-series colors and non-color status cues;
- type scale and numeric/tabular treatment;
- spacing, radius, border, elevation, and density tokens;
- responsive grid and breakpoints;
- chart annotation/tooltip/crosshair grammar;
- buttons, fields, segmented controls, tabs, menus, tooltips, banners, sheets, dialogs, tables,
  timeline, wallet/funding steps, receipts, skeletons, and inline errors;
- focus, hover, pressed, disabled, loading, stale, pending, success, warning, and failure states;
- reduced-motion behavior;
- terminology/content rules from the surface map.

Do not use color alone for YES/NO, status, profit/loss, or success/failure. Numerical inputs must
announce units; countdowns need absolute timestamps; charts need accessible current-value/source/
time summaries. Target WCAG 2.2 AA.

## 9. Stage 3 — Design and audit in batches

Work in these 3–4-surface batches. After each batch, present the frames, state coverage, open design
decisions, and specific review questions. Wait for user feedback before proceeding to the next
batch unless the user explicitly delegates final judgment.

### Batch A — Core terminal

1. Global shell, mobile Market Stream, desktop stream rail, and wallet/funding readiness.
2. Stream-to-terminal transition, selected-market facts, and central Underlying/Outcome chart.
3. AMM quote ladder and completed-fill activity.
4. Private order ticket: ready, invalid, resting-price, eligible-now, and disabled/degraded states.

Audit before review:

- oracle price cannot be confused with outcome-share price;
- chart dominates the analytical center without overwhelming the order action;
- the rail may abbreviate a question, but full text appears on focus/selection and in the market
  header;
- horizon and live countdown are distinct, and several discrete markets can be visible at once;
- mobile discovery is fast and delightful without implying one-tap execution or personalized
  recommendations;
- cards use only the real data contract and show position/count plus reduced-motion navigation;
- desktop switching protects edited order drafts;
- mobile Trade is a full-context workspace rather than a bare ticket, and mobile dismiss/back/swipe
  protects or explicitly discards the volatile private draft;
- no fake order book/depth/history;
- `NoxLimit orders close`, `Resolves`, and `Order expires` are separate;
- desktop and mobile composition both work.

### Batch B — Create and monitor

1. Review → direct Gateway input → Test USDC approval → order creation.
2. Durable order receipt.
3. My Orders across all lifecycle states.
4. Order detail/evaluation/publication/fill/recovery timeline.

Mandatory states/actions:

- Resting privately;
- Evaluating;
- Publication pending (privacy already ended; candidate publicly retrievable);
- Filled;
- Monitoring exhausted;
- Expiry ready → Expire order;
- Cancelled → Claim refund;
- Expired → Claim refund;
- Disclosed refundable → Claim refund;
- refund pending and Refunded.

Audit before review:

- the app/API/database never appears to know the initial plaintext;
- evaluator visibility and publication timing are described honestly;
- approval, Gateway request, order signing, broadcast, and confirmation are distinct;
- closing/reopening reconstructs state without local private data;
- cancellation never implies funds have already returned;
- no impossible loop sends cancelled, expired, or exhausted orders back into monitoring.

### Batch C — Complete owned outcome

1. Positions, including unresolved, winner, loser, redeemable, pending, and redeemed.
2. Permissionless resolution and redemption evidence.
3. Universal testnet funding/onboarding.
4. Activity and privacy explainer.

Audit before review:

- pre-fill minimum shares are labeled `Minimum protected winning redemption at the limit`, not
  maximum payout;
- a filled position uses `Winning redemption` based on actual shares held;
- any current pool reference value is labeled non-executable because v1 has no sell/cash-out;
- resolution is triggered by a transaction after the configured time, not shown as magically
  automatic;
- fill activity labels a user address only when the indexer links the pool fill to the originating
  NoxLimit owner/recipient; the adapter contract is never called the trader;
- funding is normal UX for every user, not a special evaluation route.

## 10. State and content completeness

For every relevant surface, design:

- loading/skeleton;
- empty;
- disconnected;
- wrong network;
- insufficient gas;
- insufficient collateral;
- stale oracle/indexer;
- RPC/pool/Gateway/evaluator unavailable;
- wallet rejection;
- transaction pending/replaced/dropped/reverted;
- partial funding;
- success/receipt;
- timeout and retry;
- terminal and recovery states.

Use the vocabulary in the surface map. Never say:

- anonymous, invisible, fully private, FHE, or zero knowledge;
- guaranteed/instant fill;
- order book, depth, bid, ask, maker, or taker for the FPMM;
- mainnet, organic liquidity, or audited production;
- funds returned before refund confirms;
- one generic deadline for order expiry, NoxLimit order close, resolution, and recovery.

Canonical privacy summary:

> Your maximum price goes directly to the Nox Gateway and stays encrypted while resting—not
> invisible. Our application backend never receives the initial plaintext. The evaluator learns
> the exact derived limit on an eligible check, and public decryption exposes it before the pool
> trade is finalized.

## 11. Responsive behavior

Desktop uses the terminal with a vertically scrollable Market Stream rail. Mobile must be
re-composed around the adopted discovery flow:

- full-height or near-full-height `Discover` cards with vertical snap focus;
- visible deterministic filters/sort and current-card position;
- compact selected-market header after opening a market;
- deliberate `Discover`, `Trade`, `Orders`, `Positions`, and `Activity` navigation;
- one chart mode/pane at a time;
- persistent `Trade YES` / `Trade NO` entry;
- full-height order ticket and receipt/detail sheets or routes;
- table data converted into intentional cards/rows without dropping state or actions;
- no horizontal page scroll at 390px.
- reduced-motion and assistive-input users receive ordinary scrolling plus explicit previous/next
  controls with identical information/actions.

Treat `/` as one canonical responsive shell, `/discover` only as an optional alias/redirect, and
`/markets/:marketId` as the durable market deep link. Public sort/filter state may use query
parameters; private drafts may not. Do not design viewport-dependent server branches or duplicate
hidden interactive trees.

Design at approximately 1440px and 390px, plus any intermediate behavior needed to make the system
implementable rather than two disconnected screenshots.

## 12. Prototype and usability pass

After all approved batches:

1. connect Market Stream discovery → terminal/ticket → the complete first-use path;
2. connect a returning-user browser-off fill path;
3. connect cancel → refund;
4. connect Expiry ready → expire → refund;
5. connect position → permissionless resolution → redemption;
6. test keyboard/focus and reduced motion;
7. walk through every branch using realistic sample data;
8. remove dead ends, duplicate CTAs, ambiguous times, and misleading privacy/payout copy.

The prototype uses design sample data only and labels it as such. The production implementation
must use real catalog/oracle/pool/order data.

## 13. Deliverables

If a Figma-capable tool is available, organize pages as:

```text
00 Decision + product laws
01 Foundations
02 Components
03 Batch A — Terminal
04 Batch B — Orders
05 Batch C — Positions + onboarding
06 Prototype
07 Developer handoff
08 Archive / rejected directions
```

If Figma is unavailable, use the environment's native design/prototype format and preserve the
same hierarchy. Do not overwrite production application code with an unselected direction.

Final handoff must include:

- selected direction decision and rejected alternatives;
- responsive frames;
- component variants;
- all applicable states;
- variables/tokens;
- interaction and motion notes;
- accessible names/focus order/chart summaries;
- real data requirements and sample-data labels;
- copy deck;
- asset/export manifest;
- frame/component-to-surface ID mapping (`PS-01` through `PS-17`);
- unresolved questions separated into design, content, and implementation dependencies;
- implementation-ready review checklist.

Store repository-backed notes under `.thoughts/design/` with dated filenames. Link external design
files from a small dated handoff note; never paste secrets or wallet credentials into design tools.

## 14. Completion audit

Before saying design is complete, verify all of the following:

- every accepted story maps to at least one surface and prototype path;
- the adopted mobile Market Stream + desktop terminal hybrid is present and contains only truthful
  sample/live data boundaries;
- no discovery card permits one-tap execution or silently discards an edited ticket;
- every P0 surface has desktop/mobile plus loading/error/recovery states;
- the chart and quote ladder use distinct, truthful price concepts;
- Test USDC and Sepolia ETH onboarding is one universal product experience;
- publication—not fill—is shown as the privacy transition;
- the worker/Gateway boundary is accurate;
- pre-fill payout math and post-fill redemption labels are correct;
- Expiry ready, expiry advancement, and refund are separate;
- NoxLimit close is not misrepresented as an FPMM bytecode guard;
- no adapter address is mislabeled as a trader;
- no fake market, chart, liquidity, activity, or transaction appears live;
- the product can be understood and entered quickly without weakening the real path;
- the developer can implement without guessing missing states or behavior.

Conclude with a concise handoff summary: chosen direction, completed batches, prototype paths,
design-file link/location, implementation-ready surfaces, and genuine remaining dependencies.
