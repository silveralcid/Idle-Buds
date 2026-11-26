> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/development-lessons/DEVELOPMENT_LESSONS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera — Development Lessons for Independent Developers

For each significant system: what it does, how it works, why it is (in)effective, complexity, and the simplest viable independent implementation. "Adopt?" is this investigation's judgement.

| System | Accomplishes | Mechanism (as built) | Effective? | Dev complexity | Simplest viable version | Adopt? |
|---|---|---|---|---|---|---|
| Pure-state tick engine | deterministic sim, trivial save/offline/migrations | 1 s `setInterval`, reducer over a JSON blob, every controller's `update()` runs each tick, deep-clone per action | Yes for correctness; perf cost O(state) per tick | Low | `state = reduce(state, tick)` + structural sharing (Immer) instead of cloneDeep; run N catch-up ticks on resume | **Yes**, with Immer and a fixed-timestep accumulator |
| Auto-registered controllers | add a system by adding a file | `require.context` over a folder; `Controller.action` string routing | Yes — zero wiring | Low | a `systems: System[]` array with `{update, actions}` | Yes |
| Versioned save + schema patch | forward compatibility | `version()` migrations + recursive `patch(old, default)` + 50 rolling backups | Excellent; cheap insurance | Low | same; also write a `schemaVersion` and keep backups | **Yes** |
| Single collection goal | gives every loop a purpose | `diary` keyed by (species, variant), win at N×M | Excellent | Low | any 2-D grid of (thing × variant) with best-quality tracking | **Yes** |
| Variant-by-filter | 12 visual states per sprite | CSS grayscale by quality | Very effective cost-wise | Trivial | hue-rotate/grayscale/outline per variant | Yes |
| Creature stat model | differentiate duplicates | `(3·base + gen^1.3)·L/200 + 5`, ×1.2/×0.8 nature | Good; genetics meaningful but secondary | Low | base·L·(1 + gen/200) + nature | Yes |
| Cubic XP + tithe to meta-level | unify all activities into one bar | `L³`, 5 % to trainer, 1 point/level | Good early, starves late | Low | `L^2.5–3` with a secondary late-game source of meta-currency | Yes, add a late source |
| Stamina duty cycle in mining | hidden throttle after damage saturates | work until 0, rest to 100 | Clever but opaque; best upgrade (Athletics) looks worst | Low | show uptime % in UI | Yes, but surface it |
| Coin-priced tier unlock ladder (rocks) | paces access to higher content tiers | 10 fixed prices 500 → 5 M, unlocks both a mining tier and an augment | Good: clear saving goals; invisible in GameConfig | Trivial | a price list in data | Yes |
| Linear-cost upgrades | simple purchasing | `cost = start + level` | Transparent; runs out of tension | Trivial | mild geometric (×1.15) or tiered | Partially |
| Level-gated unlocks | onboarding ramp | `if level ≥ n` flags | Clear, but all gates within 2 h | Trivial | spread gates along expected hours, not levels | Yes, re-pace |
| Training encounter loop | XP + materials from idle combat | 18 %/tick spawn, 1 round/tick, player-first | Fine; spawn rate dominates | Medium | same; make typing actually work | Yes (fix typing) |
| Soulstone pity | deterministic access to every species | 1 per kill, rarity-priced | Good anti-frustration device | Low | per-species shards | **Yes** |
| Trader with requirements | time-gated barter | hourly pool by rarity, "looking for" lower tier with quality bars | Good: creates demand for mid-tier quality | Medium | same | Yes |
| Breeding table | heritable improvement | per-gene 30/25/20/25 hi/avg/lo/random, +1 | Good tension; regression to mean below ~80 | Low | same table; expose odds | Yes |
| Augmenting | variant creation + material sink | cubic cost, ×0.75 genetics penalty, new L1 copy | Good sink; penalty forces breed-then-augment | Low | same | Yes |
| Combiner | bulk disposal / reroll | 5→1 random pick per gene | Minor | Trivial | optional | Optional |
| Gardening ladder | big-number sink + milestone summons | cost ×3/tier ×1.15/level, worth ×5/tier | Works as a wall; low tiers pointless | Low | ensure each tier has a niche or auto-prestige | Partially |
| Hyperbolic staff boosts | soft-capped multipliers | `400·3L/(400+3L)` | Good shape; too starved by 5 % drops | Low | same curve with better feed | **Yes** (curve), re-tune feed |
| Potion → gene mod | deterministic perfection | ceil(gene/20) potions per point | Good late-game sink | Low | same | Yes |
| Targeted summon ("what you lack") | solve last-cells RNG | sample from missing (species, variant) pairs | Excellent | Trivial | same | **Yes** |
| Offline estimate | reward returning | mining-only analytic estimate ×0.75, uncapped | Acceptable; honest note shown | Low | simulate up to a cap with the same tick function | Yes, cap it |
| Central config file | tuning | `_GameConfig.js` — half the keys unused | Failed where not enforced | Low | load *all* constants from config and lint for unused | Yes, enforce |
| Steam integration | achievements | steamworks.js, IPC | Minimal and robust (try/catch init) | Low | same | Yes |

## Reusable design principles extracted
1. **Converge every loop on one visible grid.** Multi-system idlers need a single scoreboard that each system can advance by a different route.
2. **Give at least one deterministic path to every collectible**, and one *targeted* path for the final percent.
3. **Make the throttle visible.** If duty cycle (stamina) is what limits output, display it; otherwise the best upgrade looks like the worst.
4. **Stagger unlocks across hours, not early levels.** New verbs are the cheapest retention you have — spend them slowly.
5. **Prefer one escalating wall over three parallel ones**, or add a reset/prestige that turns walls into momentum.
6. **Keep meta-currency flowing late.** If upgrades are the fun, income of upgrade currency must not decay cubically.
7. **Ship data, not literals, for prices** — Koltera's tuning drift (config vs code) is what happens otherwise.
8. **Pure state + migrations + rolling backups** is the correct persistence architecture for a solo-dev idle game; do it from day one.
9. **Delete dead systems** (types, market price influence, the fifth staff); displayed-but-inert mechanics erode trust.
10. **Throttle automation.** Auto-cast with no timer guard drains the resource it spends every tick — every "auto" needs a cadence or a reserve floor.

## Independent implementation recommendation (if building "a game like this")
Web/Electron is fine; use TypeScript + Immer + a fixed-step simulation with catch-up ticks, data tables for *all* numbers, and the same single-grid goal. Budget: the core here is ~13 k lines of React for 13 systems; a focused clone of the four best ideas (jobs, collection grid, soulstones, targeted summon) is a 4–6 k-line project.
