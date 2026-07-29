# Current Product Decision

- **Status:** **NoxLimit is selected, its canonical architecture is user-approved, Prompt 3 is
  `GO`, and the user explicitly authorized Codex to plan and build the polished product on
  2026-07-28.** Gates A and B pass locally, and Gate C completed the real Nox privacy trace plus one
  Nox-authorized FPMM fill on Ethereum Sepolia. Product selection is closed unless the user reopens
  it or new executable evidence invalidates a load-bearing assumption. Prompt 4 is now the active
  implementation contract. The polished workspace contains the hardened contracts, shared
  protocol, deterministic catalog, restart-safe service, and responsive web product. The fresh
  post-settlement root `pnpm check` records contracts `84`, protocol `14`, catalog `6`, service `69`,
  and web `62` passing tests (`235` total), with compile/type-check/test/build green. The dedicated
  Playwright baseline records `45` passing journeys, `21` intentional project/viewport skips, and
  zero failures; both gates must be rerun at the exact submission commit. Phases 0–5 and bounded
  operator hardening are complete. Phase 6 includes the
  verified atomic revision-`8` cutover at
  commit `d28f307`: safe Sepolia block `11,375,905` at `2026-07-29T13:53:36Z`, block hash
  `0x2a37a64bd6e1c86dd4bbb80f67cf803be9f58d93427fc84d26f59861fcbf1c76`, activated both corrected
  14,400-second BTC/ETH routes together. The service adopted revision `8` through a controlled
  stop → catalog-pointer update → single startup and reported `READY` on catalog hash
  `0x577593192efb7cf139267b3d076eb5e846fd15d1ab080611f9d504b716b4b427`; staging revisions `6` and
  `7` were never served. Both corrected markets remain catalog `ACTIVE`; after their immutable
  close/resolution boundary, both now report lifecycle `RESOLVED_YES` and tradeability
  `ORDERING_CLOSED` while the four active 1h/24h routes remain available according to their own
  schedules.
  Phase 6 settlement remains partial/degraded for the earlier evidence pair: BTC completed real
  browser resolution,
  winning-user redemption, and builder-LP redemption; ETH cannot resolve under its immutable
  3,600-second observation-delay policy because the exact first post-deadline observation arrived
  3,624 seconds after `resolvesAt`, 24 seconds too late. The accountless selector rejected before
  any write, the ETH resolver/payout remain unset, and ETH user/LP positions remain unredeemable.
  The former revision-5 BTC/ETH routes are now `RETIRED`; their LP shares are zero, while each
  unresolved pool removal correctly leaves 50,000,000 YES and 50,000,000 NO position atoms with
  the builder. Both corrected OrderBooks now return `nextOrderId = 3`. Four one-Test-USDC orders—
  BTC NO `1`, BTC YES `2`, ETH YES `1`, and ETH NO `2`—were created through the browser, filled by
  the browser-off worker, and confirmed from a fresh browser. Their exact forwarded outcome-token
  amounts are 1,941,161, 1,978,831, 1,941,161, and 1,978,831 atoms respectively; the corresponding
  OrderBook balances are zero. The threshold-derived `minOut = 1,666,667` is public after
  publication as designed; no evidence file stores the raw private maximum. After trading close,
  the corrected BTC and ETH LP positions were removed in transactions
  `0xdedae353a3aa36ff1d9ccc95f81f28eb79ee695977f50dc773e163cad6a9e004` and
  `0x7cee695b9848ea0f7249cf4f80f8287db3e54bbe8f3d0a46d85c4c31cc80188c`.
  [BTC close evidence](../evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-liquidity-close.json)
  records zero LP shares and builder balances of 49,981,169 YES / 50,018,839 NO;
  [ETH close evidence](../evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-liquidity-close.json)
  records zero LP shares and 50,018,839 YES / 49,981,169 NO. Those close records correctly captured
  the then-unresolved state. Both corrected conditions later resolved YES from the unique first
  safe Chainlink observation at or after `resolvesAt`. The real browser resolved BTC in transaction
  `0x5fca84d75673e2fb1a36cc524a0dd4f992ff0cf51e5ee4f33dc164f77a7e6be5` and redeemed
  1,978,831 winning user atoms in
  `0xb97fb9156281802883ce0a4b2bc0278f7d11a977ead477bb1a671ae5b298e48f`; it resolved ETH in
  `0x44d1f1903e31506a27b5b9ee4b7508b2ff71ce7322343fac2d3f57f7247577f0` and redeemed
  1,941,161 winning user atoms in
  `0xbc46ffba534acebfc00fb1681b97c83953007b28bad8f84a26c00ce18096c64e`.
  The builder then redeemed all retained positions in BTC transaction
  `0xcc944eeff873c0675735acf7814570207ea63bbeb6996afaccb2f7fb5feefbc2` and ETH transaction
  `0x540bdfe636eaeda09d5835a5e94ba3d9e29664e960dc0f6f15bed9ab4cae2fb5`; both builder YES/NO
  balances are now zero. Each corrected 4h route therefore has a complete browser-created order →
  browser-off fill → objective resolution → winning-user redemption → builder-position redemption
  vertical.
  The approved BTC/ETH 1h and 24h breadth is now deployed, independently validated, seeded, and
  active alongside the corrected 4h pair in runtime catalog revision `12`. The final manifest has
  ten immutable records: four retired and six active, covering BTC/ETH 1h/4h/24h. The service is
  `READY` on revision `12`; at the post-adoption snapshot the new 1h/24h routes correctly reported
  `UPCOMING` until their shared `2026-07-29T17:30:00Z` start. Public frontend/service hosting,
  video, X post, and submission form/contact fields remain pending.
- **Canonical architecture:**
  [`../architecture/2026-07-25-noxlimit-system-architecture.md`](../architecture/2026-07-25-noxlimit-system-architecture.md)
- **Audit and authority policy:**
  [`AUDIT-GATES.md`](./AUDIT-GATES.md)
- **Selection and architecture-gate decision:**
  [`2026-07-25-noxlimit-direction-and-architecture-gate.md`](./2026-07-25-noxlimit-direction-and-architecture-gate.md)
- **Polished-build authorization:**
  [`2026-07-28-noxlimit-polished-build-authorization.md`](./2026-07-28-noxlimit-polished-build-authorization.md)
- **Market-discovery experience decision:**
  [`2026-07-28-noxlimit-market-stream-experience.md`](./2026-07-28-noxlimit-market-stream-experience.md)
- **Visual direction selection (adopted and delivered):**
  [`../design/2026-07-28-noxlimit-visual-direction-selection.md`](../design/2026-07-28-noxlimit-visual-direction-selection.md)
  — Direction `Complement` selected; palette inherited from Reclaim (`getreclaim.xyz`). `Vigil` and
  `Caliper` are rejected history.
- **Design system and batches (delivered 2026-07-28):**
  [`../design/2026-07-28-noxlimit-foundations.md`](../design/2026-07-28-noxlimit-foundations.md) and
  [`../design/2026-07-28-noxlimit-designer-handoff.md`](../design/2026-07-28-noxlimit-designer-handoff.md)
  — The six durable local HTML sources under `../design/html/` contain the three-direction record,
  `Complement` foundations, Batches A–C, responsive compositions, and the clickable prototype.
  They are design inputs with explicit sample data, not product deployment evidence. The web app
  now implements the accepted responsive direction; production data continues to come only from
  the validated service/catalog boundary.
- **Active implementation plan:**
  [`../plans/2026-07-28-noxlimit-polished-product-plan.md`](../plans/2026-07-28-noxlimit-polished-product-plan.md)
- **Context/gate/architecture verification:**
  [`../verification/2026-07-25-context-gate-and-architecture-audit.md`](../verification/2026-07-25-context-gate-and-architecture-audit.md)
- **Architecture approval and Opus 5 review reconciliation:**
  [`../verification/2026-07-28-opus-architecture-review-reconciliation.md`](../verification/2026-07-28-opus-architecture-review-reconciliation.md)
- **DeepBook product/API research:**
  [`../research/2026-07-28-deepbook-patterns-for-noxlimit.md`](../research/2026-07-28-deepbook-patterns-for-noxlimit.md)
- **Product-surface and post-gate review reconciliation:**
  [`../verification/2026-07-28-noxlimit-product-surface-and-opus-reconciliation.md`](../verification/2026-07-28-noxlimit-product-surface-and-opus-reconciliation.md)
- **Prompt 3 executable evidence and verdict:**
  [`../verification/2026-07-28-noxlimit-critical-path.md`](../verification/2026-07-28-noxlimit-critical-path.md)
- **Public live trace:** [`../../spike/nox/evidence/sepolia-gate-c.json`](../../spike/nox/evidence/sepolia-gate-c.json)
- **Current Phase 6 runtime catalog:** revision `12` at
  [`../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-horizons-eth-24h.json`](../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-horizons-eth-24h.json),
  catalog hash `0x21083cbce01a121d253ff1114b77c9d12035e596ce89c9ad58411f3e06711a6e`.
  It directly hash-links revision `11`
  (`0x855f7b2de0298c831efc8510786d63bdfa062b8996c45fda3ed60037c72fb303`)
  and became effective at safe Sepolia block `11,376,650` and
  `2026-07-29T16:27:00Z`. Its ten records contain four retired historical routes and six `ACTIVE`
  routes: corrected BTC/ETH 4h plus BTC/ETH 1h and 24h. The service adopted revisions `9` through
  `12` sequentially and reports `READY` on the exact revision-12 hash. The four new routes were
  `UPCOMING` at the adoption snapshot because their immutable `startsAt` is
  `2026-07-29T17:30:00Z`; catalog activation is intentionally distinct from dynamic tradeability.
- **Phase 6 breadth deployment evidence:** the synchronized
  [`../evidence/2026-07-29-sepolia-btc-eth-1h-24h-strike-plan.json`](../evidence/2026-07-29-sepolia-btc-eth-1h-24h-strike-plan.json)
  anchors the four new bundles. Revision `9` adds BTC 1h market
  `0x0c552e5f150ec05e4ef39c4a7913ec4ac0a94b9fe71170538d452d3661e7b7ed`
  with catalog hash `0x3fdb8c17958a56f89b19b8ab491ba458629d2762c69eacf4ad2b436c92d561f3`;
  revision `10` adds ETH 1h market
  `0x47d1776ad85039be6705753f9aa6879ae7349a617540a3b0a0ef71e2915bee07`
  with hash `0xe0f239053009afa5c78d21df58cd66cc2200aa93222529d989e231da2c5776bd`;
  revision `11` adds BTC 24h market
  `0x5fdb953c06530f97653d665624c576d2303e62a64c5fd40f4ccfa84276a4a4e5`
  with hash `0x855f7b2de0298c831efc8510786d63bdfa062b8996c45fda3ed60037c72fb303`;
  and revision `12` adds ETH 24h market
  `0xd171e879c281a1321dd37b9f2085554f155d717307477181fd3c42ac1231edbd`
  with hash `0x21083cbce01a121d253ff1114b77c9d12035e596ce89c9ad58411f3e06711a6e`.
  Their four deployment records are
  [BTC 1h](../evidence/2026-07-29-sepolia-btc-usd-1h-deployment.json),
  [ETH 1h](../evidence/2026-07-29-sepolia-eth-usd-1h-deployment.json),
  [BTC 24h](../evidence/2026-07-29-sepolia-btc-usd-24h-deployment.json), and
  [ETH 24h](../evidence/2026-07-29-sepolia-eth-usd-24h-deployment.json). Independent validation for
  every pool records 50,000,000 YES atoms, 50,000,000 NO atoms, and 50,000,000 LP shares.
- **Phase 6 catalog chronology (historical, not current routing):** commit `c073643` published
  revision `5` at
  [`../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json`](../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-rotated.json),
  catalog hash `0x8aa65b0b5a91025ed1fd0e1487b9c9058b44ca05889632e9f85baf3bb3885899`.
  Commit `d2dbc39` then recorded revision `6` at
  [`../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-btc-corrected-successor.json`](../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-btc-corrected-successor.json)
  with corrected BTC market
  `0x37a7b5826c9ba1209470b98cd38a38f4e3e6cb448c353333138bfced7fbaf0a2` as `SUCCESSOR`;
  revision `7` at
  [`../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-corrected-successors.json`](../../packages/catalog/sepolia/markets-2026-07-29-btc-eth-4h-corrected-successors.json)
  carries BTC forward and adds corrected ETH market
  `0xa5219adaa2c86c0419cc7d9b05188784192ee023a7c3c27bab3f0cc8eaf8fc8a`
  as `SUCCESSOR`. Their catalog hashes are
  `0x1adb2085979fe9f9f94d5fad6793de7d808888e32cf5fa259d92a25b34b7693b`
  and `0xe20fc416f695552619d5701ece6b4dd05ad934890387807551237b5fb424dcca`.
  The corrected strike/timing plan is
  [`../evidence/2026-07-29-sepolia-corrected-successor-strike-plan.json`](../evidence/2026-07-29-sepolia-corrected-successor-strike-plan.json),
  and the independently verified deployment/seed records are
  [`../evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-deployment.json`](../evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-deployment.json)
  and
  [`../evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-deployment.json`](../evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-deployment.json).
  Revisions `6` and `7` were staging-only and were never served; revision `8` is immutable
  corrected-route history and revision `12` is current.
- **Retired revision-5 successor liquidity close:**
  [`../evidence/2026-07-29-sepolia-btc-usd-4h-successor-liquidity-close.json`](../evidence/2026-07-29-sepolia-btc-usd-4h-successor-liquidity-close.json)
  records BTC transaction
  `0xe811190d41186d666b5b90b7938edcdd974a1a8c48fad9fa7f18b8ebf9946b4b` at block `11,375,985`;
  [`../evidence/2026-07-29-sepolia-eth-usd-4h-successor-liquidity-close.json`](../evidence/2026-07-29-sepolia-eth-usd-4h-successor-liquidity-close.json)
  records ETH transaction
  `0xcfd96ad20aec7d2a6f82c30f908cfbb021d62a7118e7a861f0bf9b88a4ed52b5` at block `11,375,990`.
  Each close reduced builder LP shares from 50,000,000 to zero and left 50,000,000 YES plus
  50,000,000 NO atoms as unresolved builder positions; no redemption is claimed.
- **Phase 6 committed execution evidence:**
  [`../evidence/2026-07-29-phase6-btc-no-order.json`](../evidence/2026-07-29-phase6-btc-no-order.json),
  [`../evidence/2026-07-29-phase6-btc-yes-order.json`](../evidence/2026-07-29-phase6-btc-yes-order.json),
  and [`../evidence/2026-07-29-phase6-eth-yes-order.json`](../evidence/2026-07-29-phase6-eth-yes-order.json)
  record direct-Gateway creation, browser closure, and real FPMM fills on the original bundles.
  [`../evidence/2026-07-29-phase6-btc-resolution-redemption.json`](../evidence/2026-07-29-phase6-btc-resolution-redemption.json)
  proves the retired BTC predecessor's browser resolution and winning-user redemption, and
  [`../evidence/2026-07-29-sepolia-btc-usd-4h-liquidity-redemption.json`](../evidence/2026-07-29-sepolia-btc-usd-4h-liquidity-redemption.json)
  proves builder-LP redemption in transaction
  `0x706c0c6f38518a8cd536eb4b177939a642434979153f5ee9c62f105f186c3f0c`, receipt block
  `11375232`. The ETH limitation is captured separately in
  [`../evidence/2026-07-29-sepolia-eth-usd-4h-resolution-policy-rejection.json`](../evidence/2026-07-29-sepolia-eth-usd-4h-resolution-policy-rejection.json):
  the unique first observation was 24 seconds outside the immutable bound, no resolution write was
  attempted, and no ETH winner exists.
- **Revision-8 corrected-route execution evidence:**
  [`../evidence/2026-07-29-r8-corrected-btc-no-order.json`](../evidence/2026-07-29-r8-corrected-btc-no-order.json),
  [`../evidence/2026-07-29-r8-corrected-btc-yes-order.json`](../evidence/2026-07-29-r8-corrected-btc-yes-order.json),
  [`../evidence/2026-07-29-r8-corrected-eth-yes-order.json`](../evidence/2026-07-29-r8-corrected-eth-yes-order.json),
  and
  [`../evidence/2026-07-29-r8-corrected-eth-no-order.json`](../evidence/2026-07-29-r8-corrected-eth-no-order.json)
  record one direct Gateway post each, browser closure, API/fresh-browser fill confirmation, and
  the public transaction hashes. Receipt and ERC-1155 reads independently verify all four fills.
  Together with the three predecessor records, the product now has seven browser-off fills.
- **Revision-8 corrected-route settlement evidence:**
  [BTC browser resolution/redemption](../evidence/2026-07-29-r8-corrected-btc-resolution-redemption.json)
  and [ETH browser resolution/redemption](../evidence/2026-07-29-r8-corrected-eth-resolution-redemption.json)
  bind the catalog, exact adjacent Chainlink round pair, safe-block browser evidence, resolver
  event, winning shares, CTF payout event, and exact Test USDC balance delta. The corresponding
  [BTC builder redemption](../evidence/2026-07-29-sepolia-btc-usd-4h-corrected-successor-liquidity-redemption.json)
  and [ETH builder redemption](../evidence/2026-07-29-sepolia-eth-usd-4h-corrected-successor-liquidity-redemption.json)
  prove that LP shares were already zero, no second liquidity removal occurred, the retained
  resolved positions were redeemed, and no builder outcome balance remains.
- **Spike substrate:** pinned, unmodified Gnosis Conditional Tokens + FPMM. This is selected for
  the disposable verification slice, not asserted as an irreversible production-stack decision.
- **Survivors:** One selected direction; one locally and live-verified disposable adapter; one real
  Nox-authorized Sepolia FPMM fill.
- **Confidence:** High that the hackathon critical path is executable. Clean suites pass 8 released-Nox
  primitive tests, 8 combined adapter/adversarial tests, and 8 independent market/math tests. The
  exact typed wrapper, private viewer path, nonce isolation, real FPMM fill/refund behavior, ERC-1155
  forwarding, atomic limit, replay guard, and public-inference experiment all execute. The live
  Sepolia run then verified four confidential evaluations, success-only publication, independent
  proof rescue, exact share forwarding, zero adapter dust/allowance, and replay rejection. Product
  demand remains unvalidated rather than disproved.
- **Independent audit (2026-07-24):** returned `DROP` and remains preserved as evidence. Its useful
  feasibility findings stand, but its decisive claims do not: the demand search proves
  *unvalidated*, not *absent*; a normal backend can preserve the execution shape but must receive
  the raw threshold; released Nox has viewer-only private decryption; and prediction markets are an
  originality burden, not a documented prohibition.
- **Hackathon-calibrated reassessment (2026-07-24):** `KEEP AND VERIFY`. A real non-mock Sepolia
  state transition, immutable order binding, atomic `minOut`, replay protection, cancel/expiry/refund,
  and an honest privacy boundary are demo gates. Mainnet, a professional audit, decentralized
  keepers, organic liquidity, production manipulation economics, and latency SLAs are
  post-hackathon hardening rather than selection vetoes.
- **Independent audit + verdict:**
  [`../verification/2026-07-24-noxlimit-independent-audit.md`](../verification/2026-07-24-noxlimit-independent-audit.md)
- **Independent research (evidence, pins, reproduction commands):**
  [`../research/2026-07-24-noxlimit-independent-research.md`](../research/2026-07-24-noxlimit-independent-research.md)
- **Reassessment of the `DROP` verdict:**
  [`../verification/2026-07-24-noxlimit-drop-verdict-reassessment.md`](../verification/2026-07-24-noxlimit-drop-verdict-reassessment.md)
- **Independent recheck and reaffirmation (source + live evidence, gate split, spike spec):**
  [`../verification/2026-07-24-noxlimit-reaudit-reaffirmation.md`](../verification/2026-07-24-noxlimit-reaudit-reaffirmation.md)
- **NoxLimit hypothesis (historical candidate framing):**
  [`2026-07-24-noxlimit-product-hypothesis.md`](../ideas/2026-07-24-noxlimit-product-hypothesis.md)
- **NoxLimit product-reality brief:**
  [`2026-07-24-noxlimit-product-and-market-reality.md`](../research/2026-07-24-noxlimit-product-and-market-reality.md)
- **Independent audit prompt:**
  [`01-independent-noxlimit-audit.md`](../../prompts/01-independent-noxlimit-audit.md)
- **Hackathon-calibrated reassessment prompt:**
  [`01a-hackathon-calibrated-noxlimit-reassessment.md`](../../prompts/01a-hackathon-calibrated-noxlimit-reassessment.md)
- **Correction audit:**
  [`2026-07-23-nox-docs-first-correction.md`](../research/2026-07-23-nox-docs-first-correction.md)
- **Product research:**
  [`2026-07-23-docs-first-product-research.md`](../research/2026-07-23-docs-first-product-research.md)
- **Candidate report:**
  [`2026-07-23-nox-docs-first-candidates.md`](../ideas/2026-07-23-nox-docs-first-candidates.md)
- **Product surface:** A hybrid discovery-and-trading experience over curated, real Ethereum
  Sepolia market bundles: a TikTok-like vertical **Market Stream** for fast one-market-at-a-time
  discovery, followed by a DeepBook-like full terminal for analysis, private-order review, and
  durable ownership. Mobile opens into the snap-scroll stream; desktop keeps the terminal primary
  and turns its left rail into the stream. BTC/USD and ETH/USD, plus SOL/USD after its Pyth resolver
  test; 1h/4h/24h horizons; real FPMM quotes/liquidity; a Nox-encrypted private maximum-price
  order; durable Orders, Positions, and Activity. The stream is deterministic and contains only
  verified/deployed/seeded bundles—no personalized `For You`, fake inventory, social mechanics, or
  one-tap execution. DeepBook supplies terminal/API grammar, not CLOB mechanics.
- **UX/design contract:** [`../../DESIGNER_HANDOFF.md`](../../DESIGNER_HANDOFF.md),
  [`../stories/2026-07-28-noxlimit-product-stories.md`](../stories/2026-07-28-noxlimit-product-stories.md),
  and [`../design/2026-07-28-noxlimit-product-surface-map.md`](../design/2026-07-28-noxlimit-product-surface-map.md).
  The 30-second entry principle is the normal experience for every user, not an evaluation-only
  shortcut. One wallet receives sponsored Sepolia ETH plus NoxLimit Test USDC through the product;
  balances remain real, never auto-refill, and only explicit low-balance refills are capped by
  target/cooldown/lifetime policy. The central terminal includes real oracle/outcome charts and a
  real FPMM quote ladder over discrete rolling asset/horizon market bundles.
- **Privacy UX boundary:** the initial limit travels directly from the browser to the official Nox
  Gateway, bypassing the NoxLimit API/database/analytics. The evaluator sees zero on an ineligible
  check and the exact derived limit on an eligible one. `Publication pending`, not `Filled`, marks
  the point where the candidate is publicly retrievable.
- **Post-gate Opus 5 verdict:** Exact `claude-opus-5`, max effort, exit 0, no fallback: `GO` remains
  valid and the reviewer recommends building after the adopted A1–A3/F1–F3 corrections. These
  prohibit owner abandonment after publication, preserve nonce/check coupling, expose exhausted
  monitoring, require resolver-first versioned market bundles, and strengthen product tests/API
  semantics. The final consistency pass also requires onchain market-close enforcement, composite
  order references plus explicit refund, and non-cherry-pickable first-observation settlement.
  These do not reopen selection or Gate C.
- **Operator deployment boundary:** The locally verified Sepolia deployer creates or resumes a
  cross-process-locked journal before its first write. The journal freezes the plan/operator/chain/
  output binding, ordered expected steps, and exact funding plan; advances every write through
  `INTENT → SUBMITTED → CONFIRMED`; and requires attempt-bound explicit `ADOPT` or `RETRY` recovery
  for a bare intent. A submitted step accepts attempt-bound `RETRY` only after the runner proves its
  exact persisted receipt reverted at the configured confirmation depth and verifies the sender;
  pending, successful, mismatched, or stale-attempt cases submit nothing. It rejects secret-bearing
  payloads, stages and verifies final payloads before create-only publication, and safely resumes
  submitted, confirmed, or partially published work.
  Market configuration also enforces the exact declared 1h/4h/24h duration and canonical question;
  reused operator-owned Test USDC is minted only by the computed seed/treasury shortfall. New
  official Sepolia BTC/ETH deployments now require
  `maximumObservationDelaySeconds >= 14,400`; the now-active corrected BTC/ETH successors exercise that
  floor without weakening the unique first-observation/adjacent-predecessor proof. Runtime quote
  freshness remains a separate 3,600-second policy.
  The BTC 1h rollout exercised submitted-transaction recovery: an exactly estimated treasury-
  collateral top-up reverted out of gas, the
  [recovery record](../evidence/2026-07-29-sepolia-btc-usd-1h-deployment-recovery.json) preserves
  attempt 1 and its receipt, and the
  explicit attempt-bound `RETRY` succeeded after the Hardhat gas multiplier was raised to `1.2`.
  No journal was deleted or rewritten. Runtime acceptance now distinguishes immutable catalog
  activation from every dynamic lifecycle: verified/seeded `UPCOMING` routes stay non-tradeable,
  `ORDERING_OPEN` routes retain the evaluator/liquidity safety gates, and closed/resolving/resolved
  `ACTIVE` routes may restart as truthful `ORDERING_CLOSED` history without requiring removed
  liquidity or an evaluator. The `69`-test service suite covers both time boundaries, and the
  [r12 post-close restart](../evidence/2026-07-29-r12-post-close-restart.json) proved the exact mixed
  state live: both zero-depth 4h routes were `AWAITING_RESOLUTION / ORDERING_CLOSED`, while all four
  1h/24h routes remained `ORDERING_OPEN / TRADEABLE` and health stayed `READY`. The later
  [r12 post-resolution restart](../evidence/2026-07-29-r12-post-resolution-restart.json) proves a
  fresh singleton startup rebuilds both corrected 4h routes as `RESOLVED_YES / ORDERING_CLOSED`,
  keeps the then-open BTC/ETH 24h routes `TRADEABLE`, and returns evaluator, funding, and overall
  health to `READY` on the same catalog hash.
- **Next workflow:** Preserve the completed predecessor BTC proof and the terminal predecessor ETH
  rejection. Do not keep
  polling the retired ETH resolver, submit an ETH resolution transaction, infer a winner from the
  rejected observation, or substitute a later round. Revision `12` is the current runtime routing;
  do not roll back to revision `5`/`8` or serve staging revisions `6`/`7`. Preserve the retired
  revision-5 liquidity-close evidence and its unresolved 50,000,000 YES / 50,000,000 NO positions
  per market. Preserve the four corrected-route order/fill records and both completed corrected
  objective-resolution/user-redemption/builder-redemption verticals. Preserve the completed BTC/ETH
  1h/24h deployment and revision-9→12 runtime-adoption evidence; breadth is complete. Public
  frontend/service hosting is the next release dependency, but
  the proposed Cloud Run topology is billable and resource creation requires explicit user cost and
  provider authorization. Then produce the video, X post, repository/form/contact fields, and final
  submission run. Preserve `spike/**`; do not derive a competing plan, restart discovery, or repeat
  Prompt 3.
- **Prompt 4:** [`../../prompts/04-polished-product-implementation.md`](../../prompts/04-polished-product-implementation.md)
  is authorized and active as the implementation handoff.
- **Prompt 5:** [`../../prompts/05-designer-agent-handoff.md`](../../prompts/05-designer-agent-handoff.md)
  is the completed designer-agent workflow. `Complement` and the six local HTML deliverables are
  implementation inputs; `Vigil` and `Caliper` remain rejected history.
- **Prompt 2:** Waived by explicit user selection; do not run a new comparison loop.
- **Prompt 3 state:** **GO — LIVE GATE C VERIFIED.** Final transaction
  `0xbae85703bb59878fa63838e03c1bc57cdcdc46f6e2f74ac701b38fc85d088caa`
  succeeded at Sepolia block `11,366,991`. It is accepted evidence for the active polished build,
  not a gate to rerun.
- **Scheduling authority:** The user controls pacing and phase authorization. Historical project or
  spike dates do not route work, force deployment, or justify reducing correctness. Market trading
  close, market resolution, order expiry, and internal recovery timeouts are protocol concepts,
  not project schedules.

## Historical verified state at audit time (2026-07-24; not active routing)

- The then-published WTF submission date was re-verified through the official page/API. It is
  retained in the dated research, not as an active architecture or implementation constraint.
  DoraHacks challenged a default command-line request, but a browser-like user agent reached the
  official API. Required chain: **Ethereum Sepolia** (prior winners were on
  Arbitrum Sepolia — do not inherit their chain). 13 BUIDLs, 81 hackers at the evening recheck. The
  Innovative track's published `judging_criteria` field is **empty** — the "already seen …
  prediction markets" steer is track-description prose, not a separate scoring formula; the empty
  field does not negate that originality risk. The official API's required registration-question
  payload instructs hackers to complete iExec Hello World and submit the wallet address used.
- Nox is live **only** on Ethereum Sepolia (11155111) and Arbitrum Sepolia (421614); **no production
  mainnet**. Ethereum NoxCompute impl `0xc9B5…b819` unchanged since 2026-07-22. Packages still
  0.2.4 / beta.13 / 0.1.0.
- Chainlink BTC/USD + ETH/USD are live and fresh on Ethereum Sepolia (8 decimals). Chainlink Automation
  v2.1 sunsets 2026-07-31 — use a hosted/permissionless worker, not Automation.

## User-locked rejection record

Do not revive, rename, or lightly repackage:

- SLA Lock, agent disputes/evaluators, service-quality escrow, or proof-of-service;
- Proofline, community notes, moderation, polling, voting, or governance;
- benchmarks, certification, ratings, reputation, or scores as the product;
- shares, equity, policy, compliance, insurance, legal, or international-rule workflows;
- a new chain, protocol, SDK, platform, or broad infrastructure product;
- wallets, confidential tokens, token factories, or generic wrappers;
- products that require multiple organizations, panels, reviewers, or fake participants to work.

Any new discovery pass must research winners from comparable privacy, ZK, FHE, confidential
computing, and protocol-integration hackathons before generating candidates. Feasibility is a veto:
one builder, one self-serve user loop, a real standalone or unchanged-protocol action, real inputs,
and no mock choreography.

## Current research boundary

The prior feasibility-first `NONE SURVIVE` report remains a valid historical graveyard, but was not
a complete discovery result. The corrected pass read the component-rendered Nox product catalog,
allowed standalone innovative products, and investigated nine candidates across Invoicing,
Payments, DeFi/Lending, Vaults/Yield, Identity, NFT, and Prediction Markets.

The corrected docs-first pass originally produced no survivor. Its two strongest near-misses still
failed exact gates:

- **Private Quote-to-Pay:** direct PaySec collision, current optimized ERC-7984 callback-amount ACL
  mismatch, amount-correlation leakage, two-role/token onboarding, and a failed 30-second path.
- **Confidential Closed-Loop Gift Card:** ordinary issuer-database equivalence, visible or trusted
  funding, weak independent entitlement demand, Sigill/FHE2P collision, and policy scope.

DarkOdds also remains a native prediction-market collision; Polymarket was display-only. Generic
lending, NFT, vault, fundraising, RWA, trading, payroll, treasury, swap/routing, and escrow products
remain crowded or user-excluded.

## Evidence behind the selected direction (`KEEP AND VERIFY` on 2026-07-24; live-verified now)

> The independent audit returned `DROP`, but the hackathon-calibrated reassessment found material
> factual and logical errors in the hard vetoes and their key supporting claims. The user later
> selected NoxLimit as the direction; Prompt 3 later verified combined live feasibility. See the top of
> this file, the
> [independent audit](../verification/2026-07-24-noxlimit-independent-audit.md), and the
> [reassessment](../verification/2026-07-24-noxlimit-drop-verdict-reassessment.md).

NoxLimit is a narrower prediction-market order-management hypothesis, not a reversal of the generic
market rejection. It proposes a public amount that is immutable per order plus a private buy limit
against an unchanged real
outcome-share AMM:

`encrypt threshold → persist → compare with the fixed-input quote sampled in the evaluation request
→ reveal threshold-derived minimum output → consume proof once → execute a
minimum-output-protected buy`

The research found feature-supply and product-investment signals for advanced prediction-market
orders, but no direct proof of privacy-specific demand. The released viewer/private-decrypt path,
real FPMM deployment, asynchronous orchestration, escrow/custody, and measured evaluation leakage
pass locally, and their combined live path passes on real builder-seeded Sepolia pools. Fresh-user
funding and product UX now also have committed integrated evidence: seven orders filled browser-off
across predecessor and corrected routes, the original pools closed, and verified successors
activated in one catalog revision. The retired
BTC predecessor additionally completes objective resolution plus real winning-user and builder-LP
redemption. The retired ETH predecessor is a recorded terminal policy rejection: its first
post-deadline observation was 24 seconds outside the immutable one-hour bound, so no write or winner
exists. Both corrected 14,400-second routes now complete objective browser resolution, winning-user
redemption, and builder-position redemption. No official Nox production mainnet exists, but that is
not a hackathon blocker because Ethereum Sepolia is the required chain.

`KEEP AND VERIFY` is the historical 2026-07-24 maturity label. The current status is
`GO`: local and live executable evidence exists. The polished implementation is user-authorized
and active.
