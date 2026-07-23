# Feasibility-First Winner and Product Evidence Audit

**Research date:** 2026-07-23

## Scope and method

This pass began from current products and comparable winners, not from a list of values Nox can
hide. It re-verified the WTF Hackathon, examined 14 winners or finalists across six privacy, ZK,
FHE, TEE, and Ethereum-integration events, checked current product workflows and protocol
deployments, and refreshed the visible collision landscape. Historical ideas in this repository
were inspected only after the independent research and were used as a rejection log.

The resulting candidates and verdict are in
[the feasibility-first candidate report](../ideas/2026-07-23-feasibility-first-candidates.md).

## A. Evidence audit

### Current WTF evidence

#### Verified organizer facts

- The [WTF Hackathon brief](https://dorahacks.io/hackathon/wtf-hackathon/detail) asks for either a
  clean privacy integration with an impactful open-source protocol or an innovative Nox product.
  It explicitly says the result should be a product, not merely a proof of concept.
- The wallet, DeFi, and treasury ideas are optional examples. The organizer says entrants are not
  required to choose them.
- The transparent protocol should remain unchanged; layering, batching, or routing through it is
  allowed.
- Reusing a previous VIBE submission is disqualifying.
- The displayed judging weights are Creativity `3`, accessible real end-to-end experience with no
  mock data `3`, Ethereum Sepolia `2`, `feedback.md` `2`, a video no longer than four minutes `2`,
  meaningful Nox use `1`, and UX `1`.
- Required artifacts include a public open-source repository, complete code, a functional
  frontend, setup/deployment/use documentation, an X post tagging `@iEx_ec`, `feedback.md`, and the
  demo video.
- On 2026-07-23 the page displayed `13` BUIDLs and `74` hackers. The
  [BUIDL list](https://dorahacks.io/hackathon/wtf-hackathon/buidl) said submissions were private.
- The page displayed a deadline of `2026/08/01 21:59`, but no authoritative timezone was visible
  beside it.

#### Verified previous-winner facts

The prior challenge's [canonical winners page](https://dorahacks.io/hackathon/vibe-coding-iexec/winner)
and complete project pages establish three exclusion zones:

| Rank | Product | Legible action | Nox-dependent mechanism |
|---:|---|---|---|
| 1 | [Diam](https://dorahacks.io/buidl/43636) | Make or fill a confidential OTC/RFQ order | Encrypted amounts and bids, confidential comparison/selection, ERC-7984 settlement |
| 2 | [RWAOS](https://dorahacks.io/buidl/43431) | Issue and operate confidential real-world assets | Confidential balances, transfer controls, cap-table state, selective disclosure |
| 3 | [DarkOdds](https://dorahacks.io/buidl/43656) | Place a confidential prediction-market wager | Encrypted wagers/balances and TEE-computed proportional payouts |

#### Inferences

- The organizer is rewarding a complete, visible product action more heavily than infrastructure
  breadth. Creativity and a real no-mock end-to-end path have the largest displayed weights.
- The previous winners were easy to understand because each began with an existing product
  category and one exact public-chain failure. Nox changed the economic action, not only its
  storage format.
- Selective disclosure and encrypted amounts are now baseline mechanics, not product
  differentiation.
- “Try it in 30 seconds” should mean immediate comprehension and no setup choreography. It cannot
  honestly promise universal settlement inside 30 seconds because Nox execution is asynchronous.

#### Unknowns

- The authoritative timezone for the August 1 deadline.
- Which public repositories correspond to the 13 private BUIDLs.
- Projects still private, unindexed, or developed in older repositories.
- Whether the organizer considers a complimentary Unlock membership claim sufficiently substantial.
  Even a positive answer would not clear this pass's separate one-user, backend-equivalence, and
  anti-guessing failures.

### Comparable-winner matrix

“Reachable” means the public URL returned a page during research; it does not prove that every
wallet, proof, or contract path still works.

| Event, date, placement | User, recurring problem, and product action | Familiar workflow | What the sponsor technology enabled | Genuine judge path and build surface | Current activity | Why it won |
|---|---|---|---|---|---|---|
| ETHGlobal Trifecta, Mar 20–23 2025 — [Pass-Tee-Port](https://ethglobal.com/showcase/pass-tee-port-2qoc1), TEE Track 1st and Marlin winner | An attendee scans an NFC passport and shares only an age/uniqueness attribute with a venue or dapp | Mobile ID and age verification | An attested enclave validates the government signature without exposing the passport to an ordinary backend | Real NFC scan, enclave, certificate chain, attribute viewer, and contracts; a judge needs a compatible passport. The [checker remains reachable](https://pass-tee-port.vercel.app) | [Repository](https://github.com/holyfuchs/pass-tee-port) stopped on the event weekend | **Inference:** a complete sensitive-document → attested computation → minimal credential chain made the TEE indispensable |
| ETHGlobal Trifecta, Mar 20–23 2025 — [Vicinity](https://ethglobal.com/showcase/vicinity-caa4c), Aztec Best Use of Noir 1st | A customer proves they visited a place and posts an anonymous review without revealing coordinates | Yelp/Google reviews with proof of visit | A custom Noir circuit proves proximity while hiding coordinates and identity | React Native app, geolocation, JWT validation, and a 68,902-gate circuit; reported mobile proving below three seconds; no hosted self-serve app | [Repository](https://github.com/raven-house/vicinity) stopped on the event weekend | **Inference:** one familiar tap hid technically deep proof work and produced an immediately understandable privacy payoff |
| ETHGlobal Trifecta, Mar 20–23 2025 — [ZKFOCIL](https://ethglobal.com/showcase/zkfocil-private-ils-0oos6), ZK Track 3rd and Brevis SDK 2nd | Ethereum validators construct private inclusion lists while proving eligibility | Validator/protocol operations | zkVM proofs and linkable ring signatures hide which validator acted while preventing double-signing | Two Rust zkVM implementations, benchmarks, signatures, and an educational simulated frontend; not a self-serve product | [Repository](https://github.com/Cypher-Laboratory/ethGlobal_zkFocil) stopped on the event weekend | **Inference:** deep Ethereum-protocol novelty won a technical prize; this is not a transferable WTF product benchmark |
| ETHGlobal Taipei, Apr 4–6 2025 — [FindMyPhotos.app](https://ethglobal.com/showcase/findmyphotos-app-bg143), Flow “Most Killer App Potential” 1st plus sponsor awards | An event attendee uploads a selfie, finds every matching event photo, then downloads it or requests removal | Google Photos face search for event albums | AWS Rekognition and Flickr delivered the core value; blockchain mainly gated discounts/payments | One visually obvious action using real event albums and a real selfie; web app, indexing, image APIs, and several chains | [Repository](https://github.com/MattWong-ca/find-my-photos) continued to Dec 2025; domain no longer resolves | The award explicitly cited “Killer App Potential.” **Inference:** concrete pain and instant visual payoff outweighed weak blockchain necessity |
| ETHGlobal Taipei, Apr 4–6 2025 — [Zhat's Me](https://ethglobal.com/showcase/zhats-me-vioyt), Self offchain SDK 2nd | An attendee proves identity and possession of a real ticket email at check-in without exposing either | Eventbrite-style event check-in | Self and a ZK Email blueprint prove two real credentials | One Next.js app and two proof SDKs; meaningful use needs the Self app and an actual ticket email. The [frontend remains reachable](https://zhats-me.vercel.app) | [Repository](https://github.com/moven0831/Zhats-Me) stopped on the event weekend | **Inference:** two complex proof systems were narrowed to one event-specific job instead of becoming an identity platform |
| ETHGlobal Bangkok, Nov 15–17 2024 — [Iceberg](https://ethglobal.com/showcase/iceberg-doqwp), Uniswap Hooks 1st and Fhenix 2nd | A trader places a hidden limit order and later claims the encrypted output | CEX iceberg/limit orders | FHE hides price, amount, direction, receipts, and intermediate state inside a Uniswap v4 hook | Focused Solidity/Foundry integration with extensive tests but no frontend | [Repository](https://github.com/marronjo/iceberg) stopped on the event weekend | **Inference:** exact protocol integration, a recognizable MEV problem, and serious tests; it won as a sponsor integration rather than a self-serve product |
| ETHGlobal Bangkok, Nov 15–17 2024 — [YumeRTS](https://ethglobal.com/showcase/yumerts-game-x99f9), Phala TEE 2nd and Arbitrum award | Two players command units in a real-time strategy match while hidden game state advances | StarCraft/Age of Empires | A TEE conceals and attests game state/randomness | Visually strong web game but required two players and combined Next.js, Phala, Stylus, Push, Privy, Circle, betting, NFTs, matchmaking, and replays | [Frontend repository](https://github.com/yumerts/yumerts-frontend) was archived in Dec 2024; demo domain is gone | **Inference:** spectacle and a visible TEE workload created wow factor; its own PoC label and scope make it a poor one-builder benchmark |
| ETHGlobal Singapore, Sep 20–22 2024 — [PriVote](https://ethglobal.com/showcase/privote-hertg), Ethereum Foundation MACI 1st | An organizer creates a poll, eligible voters cast private ballots, and only the result is published | Snapshot/Typeform elections | MACI supplies ballot privacy/anti-collusion; identity tools supply eligibility | Frontend, contracts, coordinator, Docker services, CCIP, and multiple auth methods; needs organizer, voters, and coordinator | [Project organization](https://github.com/PriVote-Project) continued through Dec 2025; [app remains reachable](https://privote.live) | **Inference:** a complete open-source MACI surface and continued operation turned infrastructure into a recognizable product; voting remains owner-excluded here |
| ETHGlobal Singapore, Sep 20–22 2024 — [ZkCredit](https://ethglobal.com/showcase/zkcredit-gfx87), Mina Protokit 2nd | A borrower privately proves income/asset thresholds and accepts a loan | Traditional underwriting and loan marketplaces | ZK hides financial values while proving thresholds | Web app, runtime/circuits, marketplace, identity, blacklist, and proposed insurance; the team invented a “government Merkle tree” because real signed data was unavailable | [Repository](https://github.com/EkamSinghPandher/ZkCredit) stopped on the event weekend | **Inference:** ambitious circuit work won a sponsor prize despite false input provenance and unfinished enforcement—direct evidence that “winner” does not imply WTF feasibility |
| Oasis Privacy4Web3, winners Nov 27 2024 — [SQUIDL](https://ethglobal.com/showcase/squidl-psquk), winner plus earlier sponsor awards | A freelancer/business shares one permanent payment link; every visit creates a fresh stealth address | PayPal.me and Stripe Payment Links | Sapphire keeps ECDH/signing keys in a TEE; ROFL watches stealth addresses without plaintext announcement events | Legible link flow but a wide stack: frontend/backend, Prisma, ENS, ROFL, bridges, 1inch, cards, chains, wrapped assets | [Repository](https://github.com/engowl/squidl) shows cross-event iteration through Nov 2024; domain no longer resolves | Prior award explicitly called it a consumer-crypto winner. **Inference:** familiar behavior and strong privacy need carried an over-wide build |
| Oasis Privacy4Web3, winners Nov 27 2024 — [PrivaHealth](https://github.com/ChanX21/PrivaHealth), winner | A patient authorizes a doctor to view medical records | Patient portal/EHR permissions | Sapphire keeps confidential state and access permissions | Vue, Solidity, patient/doctor/health-center roles, AI recommendations, reviews, and research sharing; requires several roles and authentic records | [Frontend remains reachable](https://priva-health.vercel.app); code stopped before winners were announced | **Inference:** legible social impact and a deployed interface; conventional private databases and multi-role friction weaken the transferable pattern |
| ZK Hack Berlin, Jun 20–22 2025 — [ZeroHour](https://devfolio.co/projects/zerohour-c1ed), Grand Winner | A wearable owner proves they exceeded 10,000 steps without publishing raw activity | Fitbit/Apple Health achievement verification | A Sigma/Pedersen proof system runs within a PineTime watch's 64 KB RAM | Firmware and emulator forks, embedded C++, reference prover, and verifier; Bluetooth transfer and real-device flashing were unfinished | Public branches stopped on the event weekend | The [official winner report](https://zkhack.dev/2025/06/26/zk-hack-berlin/) says the team “pushed the limit” of client-side proving. Technical achievement, not product completeness, drove the result |
| ZK Hack Berlin, Jun 20–22 2025 — [ZK-AntiCheat](https://devfolio.co/projects/zkanticheat-74ee), 2nd overall plus product-market-fit/consumer awards | A gamer proves approved memory state without sending all memory to invasive anti-cheat software | Riot Vanguard/speedrun verification | Merkleized memory checks and recursive proofs conceal memory while attesting checks | Six repositories covering memory capture, circuits, prover, contracts, scoreboard, and leaderboard; trusted capture and slow proving remained unresolved | All [organization repositories](https://github.com/zk-AntiCheat) were archived on the event weekend | Sponsor labels cited product-market fit. **Inference:** it attached novel crypto to a famous spyware pain, but the unresolved input boundary would fail the current no-mock gate |
| ZK Hack Berlin, Jun 20–22 2025 — [Anon Proxies](https://devfolio.co/projects/anonymous-proxy-signatures-bce9), Chewing Glass and Aztec winner | A company or parent privately delegates limited spending authority | Company cards and parental allowances | Anonymous, timed, revocable proxy signatures are the core primitive | Arkworks, WASM, Noir verifier, and toy apps; testnet deployment failed and a fallback hash was acknowledged unsafe | [Repository](https://github.com/therealyingtong/schnorr-tokens) stopped on the event weekend | “Chewing Glass” rewards cryptographic difficulty. **Inference:** implementation depth won despite incomplete deployment and weak tryability |

The [Trifecta judging criteria](https://ethglobal.com/events/trifecta/info/details), official
[Taipei](https://ethglobal.com/events/taipei),
[Bangkok](https://ethglobal.com/events/bangkok), and
[Singapore](https://ethglobal.com/events/singapore2024) event pages, the
[Oasis winners announcement](https://oasis.net/blog/privacy4web3-hackathon-winners), and the
[ZK Hack Berlin report](https://zkhack.dev/2025/06/26/zk-hack-berlin/) were used to distinguish
official placements from inference.

### Recurring winner and failure patterns

#### Transferable winner patterns

1. **The user recognizes the action before learning the cryptography.** Upload a selfie, scan a
   ticket, submit a review, share a payment link, or place an order.
2. **One exact visibility failure explains the technology.** Leaked location, identity, order
   parameters, device memory, or payment linkage is more persuasive than “privacy is important.”
3. **One visibly completed result beats a dashboard tour.** The strongest product-shaped entries
   ended in a found photo, accepted credential, posted review, completed order, or issued proof.
4. **An existing protocol or workflow compresses both explanation and scope.** Yelp, Eventbrite,
   Uniswap, MACI, and payment links gave judges a known mental model.
5. **Deep technology can disappear behind one action.** Vicinity's circuit and Pass-Tee-Port's
   certificate chain were substantial, but the user flow stayed narrow.
6. **Prize type must be interpreted.** “Best Use of X” and “Chewing Glass” can reward technical
   depth even when the app is not deployable. Those winners are not evidence that a PoC will satisfy
   WTF's explicit product requirement.
7. **Continuation is rare and therefore meaningful.** PriVote is the strongest durable example;
   FindMyPhotos continued for months; most repositories stopped at the event.

#### Repeated failure patterns

1. A valid proof can still begin with a fake or self-attested input: ZkCredit's invented government
   tree and ZK-AntiCheat's unresolved memory capture are the clearest examples.
2. Multi-role demos conceal an unclosed user loop. Several winners need voters, doctors,
   coordinators, opponents, adjusters, or institutions.
3. Sponsor stacking creates impressive submission pages and fragile products.
4. A technically difficult primitive can win the wrong contest while remaining unusable.
5. Familiar user value can win despite decorative blockchain usage, as FindMyPhotos demonstrates;
   that would fail the separate Nox-indispensability gate here.
6. Most hackathon apps show no post-event use. Winning does not prove that the scope or workflow was
   product-sustainable.

### Current shipping-product and workflow evidence

| Shipping workflow | Repeated user behavior and public visibility harm | Integration reality | Research verdict |
|---|---|---|---|
| Unlock password-protected memberships and event access | Unlock exposes a workflow for creators to distribute shared passwords with per-code caps for sponsors, cohorts, or invitees. This verifies a shipping feature, not its usage volume. The current flow derives a deterministic wallet from the password and stores its public signer, so a short human code has a public offline guessing verifier. The offline-guessing conclusion is an inference from the official [password derivation](https://github.com/unlock-protocol/unlock/blob/9afabd068531959528d7e154fbf0ebbccc2267a1/unlock-app/src/utils/strings.tsx#L43-L50) and [PasswordRequiredHook](https://github.com/unlock-protocol/unlock/blob/9afabd068531959528d7e154fbf0ebbccc2267a1/smart-contracts/contracts/hooks/PasswordRequiredHook.sol) | Unlock documents the [shipping password workflow](https://unlock-protocol.com/guides/password-protected-nft-memberships/). Current PublicLock lets an authorized key granter call [`grantKeys`](https://github.com/unlock-protocol/unlock/blob/9afabd068531959528d7e154fbf0ebbccc2267a1/smart-contracts/contracts/mixins/MixinGrantKeys.sol), and the official [Sepolia configuration](https://github.com/unlock-protocol/unlock/blob/9afabd068531959528d7e154fbf0ebbccc2267a1/packages/networks/src/networks/sepolia.ts) includes the protocol deployment and subsidized-gas support | **KILL under this brief:** a long random link removes the Nox need; a private backend preserves the complimentary claim outcome; organizer and claimant split the loop; online guessing and custom sponsorship remain unresolved; paid discounts collide with Unlock's synchronous purchase hook |
| Shared customer codes and invite links | [Stripe promotion codes](https://docs.stripe.com/billing/subscriptions/coupons?locale=en-GB) and [Discord invites](https://support.discord.com/hc/en-us/articles/208866998-Invites-101) validate the behavior: people repeatedly distribute customer-facing codes/links with expiration and redemption limits | These products are behavior evidence, not proposed integrations | Supports the product premise that one reusable cohort code is a real job; it does not establish blockchain demand by itself |
| Unlock recurring subscriptions | Members renew weekly/monthly/yearly access; creators manage duration and price through the [shipping subscription flow](https://unlock-protocol.com/guides/onchain-subscriptions/) | Unlock is real, but a hidden renewal ceiling does not alter the fixed public price or renewal action | **KILL:** local preferences or ordinary allowance controls preserve the same value; Nox is decorative |
| ENS registration and renewal | Users register or renew names; public intent can invite front-running | ENS already uses commit–reveal for registration and has [documented Sepolia deployments](https://docs.ens.domains/learn/deployments/) | **KILL:** native commit–reveal already protects the relevant intent; renewal fees are deterministic |
| Seaport/OpenSea purchases and maximum bids | Buyers place asset orders and may want a hidden maximum, resembling [automatic bidding](https://www.ebay.com/help/buying/bidding/automatic-bidding?id=4014) | [Seaport](https://docs.opensea.io/docs/seaport) is open and deployed, but a real demo needs suitable inventory and counterparty state | **KILL:** repeats Diam's sealed-bid mechanism and the most crowded current trading lane |
| x402 API payments | Agents and users pay for API calls; [x402](https://x402.org/) reports current network activity | Official [network support](https://docs.cdp.coinbase.com/x402/network-support) does not provide a hosted Ethereum Sepolia facilitator | **KILL:** self-hosting becomes infrastructure and asynchronous Nox resolution does not fit the request hot path |
| iExec compute purchasing | Users procure live compute tasks and manage spending | The official [iExec address list](https://docs.iex.ec/get-started/tooling-and-explorers/important-addresses) places the test deployment on Arbitrum Sepolia | **KILL:** the hackathon requires Ethereum Sepolia, producing a fundamental integration mismatch |
| Confidential file sharing | Users repeatedly password-protect and share files; [Proton Drive](https://proton.me/support/password-protect-files-proton-drive) already offers client-side encrypted password links | A custom IPFS/AES layer is possible, but a high-entropy link or conventional end-to-end encryption preserves the core outcome | **KILL:** Nox is not indispensable and the historical [NoxShadowNFT](https://github.com/armsves/NoxShadowNFT) project already overlaps encrypted IPFS-file access |
| Onchain game moves | MUD supports shipping onchain games and reports a real project ecosystem through its [official site](https://mud.dev/) | A meaningful hidden-move game needs another player; a single-player version can use ordinary commitments or delayed randomness | **KILL:** fails the one-user loop and collides with the current [CRYPTOWORDLE](https://github.com/raorla/CRYPTOWORDLE) repository |

Context7 was queried for current Unlock Protocol documentation before relying on its API. It returned
no official Unlock package after three resolution attempts, so API and deployment claims were
verified against current official documentation and the pinned official repository. Context7
resolved MUD as `/latticexyz/mud`; its current docs reinforced that a MUD build adds a separate
world/system deployment surface rather than reducing the game scope.

### Current collision map

#### Verified visible landscape

- The exact public GitHub search still returns the 20 repositories recorded in the
  [source manifest](../sources/source-manifest.md#visible-july-2026-competitor-snapshot).
- Broader repository and package-import searches found at least seven additional substantive,
  likely-current projects:
  [VeilRoute](https://github.com/Max-wht/VeilRoute),
  [NoxSwap](https://github.com/minhleeee123/iExec-WTF-Hackathon-Summer-Edition),
  [Veil Hook](https://github.com/aabxtract/Veil-Hook),
  [VeilSwap](https://github.com/tang-vu/veilswap),
  [CTIN](https://github.com/FlemingJohn/CTIN---Confidential-Treasury-Intent-Network),
  [NoxEscrow](https://github.com/AduAkorful/NoxEscrow), and
  [Noxus](https://github.com/aydi26/iexec_WTF).
  [zzaved/iexecwtf](https://github.com/zzaved/iexecwtf) was an unclassified stub.
- Private swaps, confidential intents, dark-pool routing, and Uniswap integrations are the most
  saturated visible lane, with at least seven implementations. Payroll, generic Safe policy,
  escrow, donations, Aave, and confidential agent strategies are also occupied.
- The [iExec-Nox organization](https://github.com/orgs/iExec-Nox/repositories) still exposes 20
  public repositories. The hackathon links `iExec-Nox/nox-hardhat-starter`, but that repository was
  not publicly reachable during this audit.
- Exact GitHub repository/code searches for `iExec Nox Unlock`, `@iexec-nox` with `grantKeys`, and
  `@iexec-nox` with `PublicLock` returned no result on 2026-07-23.

The no-result checks are reproducible with:

```bash
gh search repos 'iexec nox unlock' --limit 100
gh search code '"@iexec-nox" grantKeys' --limit 100
gh search code '"@iexec-nox" "PublicLock"' --limit 100
```

#### Collision inference

Private trading is not merely risky; it is the visibly dominant lane. Escrow and policy products
are also poor originality bets. No visible public project currently combines Nox with Unlock's
membership grant path, but the private BUIDL list means this is evidence of differentiation rather
than proof of uniqueness.
