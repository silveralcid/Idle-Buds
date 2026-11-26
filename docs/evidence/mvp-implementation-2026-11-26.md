# MVP implementation report: November 26, 2026

## Delivery status

Blueprint v2 is now implemented as a local multiplayer game candidate. This report records actual behavior and verification, not a public deployment or a claim that the first human playtest happened. Base: `23425be`; published implementation: `f15e3ee15564ead63b56099360c6b840da542076`; branch: `feat/mvp-implementation-20261126`. Published and locally verified commit `1ff62eb25383c2486ed6b192931c9d68b10806e7` have the identical Git tree `16ad2596a219c30ff378a9c18464cd13ae5bcc4b`. The GitHub connector was used because terminal push credentials were unavailable. Later evidence-only commits record final results without changing game behavior.

The owner explicitly authorized implementation and merging in the November 26 instruction. [Current Release Specification](../project/CURRENT-RELEASE.md) records that scope. The old planning-only restriction is superseded for this MVP; no claim is made that BEAT BAES shipped.

## What was built

| Area | Implemented behavior |
|---|---|
| Accounts and persistence | Bcrypt passwords, revocable hashed-token sessions, account isolation, schema migrations, strict origin/JSON commands, server clocks/seeds, committed receipts |
| First playable loop | Empty account gathers Iron Scrap, crafts capture supplies, fights with the Tender, earns a Bud, assigns eligible work and returns to saved/offline rewards |
| Production | Mining, Woodcutting, Fishing, Farming, Cooking, Crafting, Synthesis; three material tiers; connected recipes, finite queues, per-item storage, permanent upgrades, eligible Bud work and remote deployment |
| Combat/collection | 15 original species, three zones, four affinities; shared deterministic frontline battle, protected commander, five Bud slots, four combat tracks, ordered capture rules, inspect/filter/protect/release, bounded same-species condensation |
| Gear and breeding | Rolled gear stats and compatible techniques, optional maker mark, permanent equipment; primary-parent species preview, independent four-IV inheritance, traits, optional Brood Tonic, reserved parents, timed eggs/hatch and wild eggs |
| Economy | Funded buy orders and sell listings, partial fills/cancel, individual Bud/gear escrow, successful-sale tax, immediate settlement, finite NPC stock/restock and conservative buyback |
| Community | Chat, per-account cooldown, reporting, mute/block, mutual friends, clans, one shared fiber-contribution goal and a small marketplace-tax benefit |
| Ranked | Blind matching using rating/progression/strength bands, immutable defense snapshots, same battle engine, exact stored replay inputs, Elo updates, history and prestige title |
| Operator controls | Local database CLI for reports, hide/unhide, account ban/unban; revoked sessions stay invalid after unban; no public admin dashboard |
| Play/test setup | Normal accounts, separate progressed two-account fixtures, explicit test-only reset, real PostgreSQL integration, deterministic experiments and cold restore verification |
| Interface | Responsive Neon Frontier DOM/CSS, skill-first navigation, actual costs/requirements/progress, all game panels, keyboard controls, explicit destructive confirmations, reconnect and same-command retry |

Implementation is split into small domain modules under `src/game`, `src/data`, `server` and `src/ui`. No ORM, Redis, microservices, ECS, custom scripting language, content editor or new game platform was introduced. The app remains one npm project.

## Concrete correctness repairs

- Preserved offline partial cycles and deterministic event ordering across different polling intervals.
- Added foreground-aware offline accounting: another player's trades cannot refresh an absent player's 24-hour budget, and remote catch-up results survive until their return summary.
- Commands lock state and commit their request fingerprint, result and state together. Known failures retain receipts; market effects roll back without discarding legitimate elapsed progress.
- Competing buyers, cancellation/fill races, exact funded residuals and unique-instance transfers have real PostgreSQL tests.
- Fixture/reset guards validate before migration, reject connection-string host/database overrides, inspect the actual connected database and refuse normal/remote targets. A fixture database cannot be served through a public listener/origin.
- The client recovers a lost command confirmation with the same UUID, refreshes after old receipts, and retains committed return summaries from rule-error responses.

## Verification evidence

All evidence below describes the local Linux x64 environment with Node 24.22.3 and actual PostgreSQL 18.7. The final aggregate `PLAYWRIGHT_EXECUTABLE_PATH=/tmp/chromium npm run validate` passed lint, strict types, all 39 Vitest tests and all four real browser scenarios. Hosted status is reported separately.

| Check | Latest observed result |
|---|---|
| Pure game rules | 23/23 tests passed, including 100 seeded fresh starts, 7,200 full-day battle completions, timing partitions, capture/hatch/commitment constraints and inheritance |
| Real database integration | 14/14 tests passed, including 100 competing purchases for one Bud, auth/restart/receipt checks, market/clan conservation, remote offline cap and moderation |
| Fixture destination guards | 2/2 tests passed, including remote/normal targets and connection-string host/database override rejection |
| Strict TypeScript and lint | Passed after interface integration |
| Cold database recovery | Passed: three accounts and complete states restored after deleting only a newly created temporary cluster's data directory; migration history retained |
| Clean installation and actual launcher restart | Passed on implementation commit `1ff62eb`: fresh worktree, `npm ci`, `npm run play`, new account, three earned Scrap, clean process/database stop, relaunch and exact inventory/XP preservation |
| Browser gameplay | 4/4 passed, no skips: fresh-account loop and two-account full flow at both 1280×800 and 390×844, plus 844×390 landscape. Breeding/hatching, partial trades/cancellation, funded orders, chat/friends, clan completion and ranked history passed; populated screens have no horizontal overflow. Browser portion: 2.0 minutes |
| Repository checks | 75/75 infrastructure regressions passed; links/configuration, strict context budget and original-source migration integrity passed |
| Dependency audit | `npm audit --audit-level=high` passed. Three moderate development-chain findings remain in node-pg-migrate/glob/minimatch; no high/critical findings reported. The offered automatic fix is a breaking migration-library downgrade and was not applied |
| Hosted CI | Pending publication of the tested branch |

The environment's system Chromium wrapper pointed to a missing executable and the official Playwright CDN returned HTTP 403. An isolated packaged Chromium 158.0.8127.0 was qualified through actual browser play; no game dependency was added for that fallback. The standard Playwright download remains the documented default and CI route.

The aggregate run first exposed browser fixture state leaking from earlier integration tests. The E2E fixture now explicitly resets its guarded disposable database and checks initial ranked state; the complete combined suite then passed. Normal playtest startup continues to preserve player progress unless reset is explicitly requested.

Unrun work is not a pass. Viewport emulation is not physical iPhone/Android/Steam Deck qualification. A successful test suite is not proof that arbitrary inputs, adversarial traffic or production-scale load are safe.

## Bounded experiment results

`npm run experiments` uses the shipped rules and writes complete outcomes to ignored `.repo-local/experiments.json`.

| Baseline | Observed result | Interpretation / disposition |
|---|---|---|
| Onboarding, 100 original seeds | 100 earned catches and working Bud assignments; 29s median, 58s p90, 87s maximum simulation time | The starter loop is reachable. Real reading/navigation time and enjoyment are unmeasured. Keep the quick baseline for owner observation before tuning |
| Offline boundaries | Exact one-shot/partitioned parity at 0, 1, 3,999, 4,000, 4,001 ms, 5m, 1h and 24h; repeated reconciliation unchanged; 48h absence discards 24h | Keep one event scheduler. Zero grace is provisional |
| Combat, 3 style pairings × 2 effect settings × 100 seeds × both positions | 1,200 battles and 1,200 exact replays; 8–11 rounds; zero side-dependent winners. Tender-led beats both other styles and Hybrid beats Bud-led on every paired seed | Termination and replay pass; style balance needs revision. Each team deploys three assets at strength 66 with equal Tender XP, a controlled proxy rather than proof of equal acquisition cost. Effects change one matchup from 8 to 10 rounds but change no winners |
| Inheritance, 1,000 seeds baseline plus 1,000 tonic variants | Of 4,000 IV values each: baseline 1,644 primary-valued, 1,662 secondary-valued, 694 other; tonic 1,778 / 1,865 / 357 | Variation and optional inheritance effect exist. Random values can equal a parent, so these are observed values, not hidden branch counts |
| Production, daily check-ins at 1/7/30 days | Crafts: Tender-only 10/60/128; Mining specialist 0/72/200; Bud-assisted 10/61/245. Bud-assisted earns 9,264 Bud XP by day 30. Every policy reaches storage constraints | Worker allocation changes output. Material consumption is simulated; market sales and human demand are not. Keep capacity visible and use these baselines for a bounded pacing decision |
| Ranked, 100 synthetic formations | 99 find a candidate within static bands; one deliberately isolated formation returns no match. 39 wins / 41 losses / 19 draws, minimum strength ratio 0.652, exact replays and no side-dependent winner | Band/replay coverage passes. This is a static fixture cohort, not evidence of live queue fairness or rating convergence |
| Economy, empty/low/active market over 30 simulated days | All 90 daily currency and catalog-item ledgers reconcile including escrow. Day-30 credits from 2,000 initial: empty 2,097; low 2,093 with 4 fills/12 units/4 tax; active 2,067 with 30 fills/90 units/30 tax. Active total includes 10 funded credits | Real Fastify/PostgreSQL accounting passes under scripted flows. Every NPC round trip loses 5 credits; stock replenishes within its cap. An independent empty-account path crafts a kit without any player listing. Price discovery and inflation remain unmeasured |

`npm run experiments:world` writes the complete daily ledgers to ignored `.repo-local/world-experiments.json`; the measured run completed in 6.63 seconds on PostgreSQL 18.7. Its injected gameplay clock does not accelerate real credential expiry or network rate-limit windows. Market quantities/prices and player behavior are controlled fixtures. No market equilibrium, live ranked fairness, observed human session, seven-day cohort or retention result is claimed. The proposed 10-player test remains to be run. Do not expand content to compensate for missing human feedback.

### Packet disposition

M0's scoped authorization is recorded. M1–M8 have integrated game implementations and the evidence above; M9.1 has runnable normal/fixture modes, restore/reset procedures and bounded experiment runners. M9.2 has the initial automated baselines and explicit findings, while observed owner sessions and the human cohort are **NOT RUN**. The three-style combat hypothesis needs a bounded revision. This is a playable engineering candidate, not a claim that all hypotheses succeeded or humans accepted the game.

## Adoption, provenance and limits

Runtime uses existing React/Vite, Fastify 5.12.8, Fastify cookie/rate-limit/static plugins, pg 8.23.1, bcryptjs 3.0.3 and seedrandom 3.0.5. Migrations use node-pg-migrate 9.0.0; rules use Vitest 5.1.2; browser checks retain Playwright 1.65.1. Exact versions and package license metadata are in `package-lock.json`. Direct runtime libraries declare MIT except bcryptjs (BSD-3-Clause). Development embedded-postgres is a launcher for real PostgreSQL; its distribution has its own bundled binary notices. No donor-game runtime code, formulas, names, artwork or extracted assets were copied. Placeholder marks/shapes are original DOM/CSS.

Reference patterns were adapted from the already-imported [reference map](../plans/active/mvp-execution-playbook.md#reference-to-work-map-read-just-before-the-packet). Official implementation references: [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/), [node-postgres transactions](https://node-postgres.com/features/transactions), [Fastify cookies](https://github.com/fastify/fastify-cookie), [bcryptjs](https://github.com/dcodeIO/bcrypt.js), [seedrandom](https://github.com/davidbau/seedrandom), [embedded PostgreSQL](https://github.com/leinelissen/embedded-postgres), [packaged Chromium testing](https://github.com/Sparticuz/chromium).

Provisional parameters include original content names, capture percentages, XP/IV curves, 90s breeding plus 120s incubation, prices/tax, stat/technique distributions, the three-point work-only condensation bonus, one clan goal/benefit, and simple ranked bands. Successful sale proceeds are paid immediately rather than requiring a separate claim click. The single shared-world transaction lock favors correctness for a small cohort; throughput and adversarial load are not qualified.

## What remains

1. Confirm hosted checks at the merge boundary and preserve their exact source/result. Local implementation and aggregate verification are complete.
2. Observe the owner playing a fresh account, a progressed account and two-account multiplayer. Record confusing, tedious and enjoyable moments separately from defects.
3. Address the measured combat-style dominance with one bounded tuning/retest cycle. Use production, economy and ranked baselines to make explicit keep/revise/defer decisions after observed play. Do not mistake fixed-cohort conservation for market sustainability or static matching for live fairness.
4. Verify installation and actual browser/touch behavior on the intended Cloud Work/server rig and target devices. Decide any private remote serving separately from implementation.
5. Run the proposed small seven-day playtest if the owner wants that cohort. Human availability and retention are outcomes, not reasons to create more systems.

[Miyu continuation](../project/MIYU-HANDOFF.md) contains the exact startup commands and requested Sol Extra High route. Public deployment, paid services, commercial launch and additional content remain outside this task.
