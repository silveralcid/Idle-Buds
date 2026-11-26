> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/rimworld/1.6.4871/development-lessons/DEVELOPMENT_LESSONS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Development lessons

What a developer building a simulation-heavy game, idle or colony, can take from RimWorld's code. Each lesson cites the mechanism it comes from.

## Adopt
| Practice | RimWorld mechanism | Why it works |
|---|---|---|
| Fixed-tick simulation with a per-frame tick cap and a time budget, dropping unspent time | `TickManager.TickManagerUpdate`: ≤ 2 × speed ticks, ≤ 45 ms, leftover discarded | heavy saves slow down gracefully instead of entering a catch-up death spiral; the simulation is frame-rate independent |
| Spread periodic work over buckets | Rare (250) and Long (2 000) tick lists hashed by thing id; `IsHashIntervalTick` offsets everywhere | per-tick cost stays flat (20 calls per tick for 5 000 things, not a 5 000-call spike) |
| Level of detail by visibility for logic, not just graphics | 1.6 `TickInterval(delta)`: every zoom + 1 ticks on screen, every 15 off screen; logic written against `delta` | off-screen and other-map work drops to 1/15 frequency without changing results |
| Make expensive queries asynchronous where the answer can wait a tick | 1.6 path requests: queued, solved as Burst jobs, resolved next tick; synchronous fallback kept | moves the largest AI cost off the main thread with a one-tick latency that players do not notice |
| Choose heuristic weight by who is watching | A\* strength 1 for colonists, 1.75 for animals, distance-based for raiders | about 6 % longer paths for 7× fewer expansions where optimality does not matter |
| Hierarchical spatial index for reachability and nearest-thing search | 12 × 12-bounded regions, districts, cached reachability, region-wise `GenClosest` | most "can I get there / what is closest" questions avoid full A\* |
| Seed reproducible systems from saved values; keep ordinary randomness unseeded | storyteller schedule = f(world seed, target seed, comp index, cycle); lords seeded by `loadID` | save-scumming cannot move raids, yet everyday variety survives reloads |
| Put content and tuning in data, behaviour in named classes | 13 159 XML defs; `workerClass`, `thingClass`, comps; `SimpleCurve`s | designers tune curves without code; DLCs and mods layer on the same rules |
| Composition for entities | `ThingComp`s from `CompProperties` | one thing class serves hundreds of defs; features are reusable |
| Make every number explainable | stat breakdowns, named thoughts, job report strings | players can debug the simulation themselves, so failures read as fair |
| Guard against AI loops in production | ≥ 10 jobs in 10 ticks triggers error recovery and a log | a logic bug becomes a visible, recoverable event instead of a frozen pawn |
| Safe saves | `SafeSaver`: write `.new`, rotate `.old`, swap | a crash during save never destroys the previous file |
| Ship a benchmark | dev 30-second benchmark reporting FPS, TPS and ticks per frame | performance regressions are measurable in the same build players run |

## Avoid or improve
| Issue | Where | Better |
|---|---|---|
| Linear reservation scans | `ReservationManager.CanReserve` walks all reservations per query | index reservations by target (dictionary or per-cell lists) |
| Invisible job-selection rules | nearest target in the first `priorityInType` tier wins | show the tier and distance reasoning in the UI, or let players weight distance |
| Hidden drama variables | adaptation days, threat points and the incident schedule appear only in dev tools | expose a coarse "threat outlook" to reduce folklore |
| Single-threaded core tick | everything except paths, drawing, glow and flecks runs on the main thread | carve out more pure data jobs (needs, stat recalculation, listers) as 1.6 did for paths |
| Linear MTB approximation | `MTBEventOccurs` uses p = interval / MTB | fine at short intervals; use 1 − e^(−interval/MTB) if checks become coarse (interval ticking makes `delta` up to 15) |
| Speed labels that over-promise | ×6 delivers less when ticks are slow, with no feedback outside debug views | show the achieved rate, which the game already computes (`MeanTickTime`) |

## Principles
1. **Budget time explicitly** and let the simulation slow down rather than skip or spiral.
2. **Spend computation where the player looks:** camera-rate logic, heuristic weights by audience, cheap paths for animals.
3. **Determinism where it protects the design** (threat schedules, lords), randomness where it creates stories.
4. **Legibility is a feature of the simulation, not the UI layer.** Every system carries the data needed to explain itself.
5. **A story generator needs a governor.** Wealth-scaled threats and adaptation keep the colony in a dramatic band instead of letting it snowball or die.
