> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/rimworld/1.6.4871/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# RimWorld — Final Reverse-Engineering Research Report

Build: RimWorld 1.6.4871 rev590 (Steam app 294100; Unity 2022.3.35f1, Mono; Core + Royalty, Ideology, Biotech, Anomaly, Odyssey). Everything was read from the installed files: the game assembly was decompiled with ilspycmd and the XML defs were parsed in place. The game was not run, no save was opened, and nothing was modified. Focus as requested: simulation, performance and game AI.

## 1. Executive summary
RimWorld is a single-threaded, fixed-tick simulation (60 ticks per second at ×1) built on Ludeon's own framework (`Verse`) inside Unity. The rules are game code (`RimWorld`), and nearly all content and tuning lives in 13 159 XML defs across 250 types.

The performance design comes down to a handful of rules:
- **A frame budget, with leftover time dropped.** A frame runs at most 2 × speed ticks and stops after 45 ms; unspent time is dropped. A heavy colony therefore slows down smoothly instead of spiralling. At 4 ms per tick, ×6 delivers 214 ticks/s instead of 360, and the label never says so outside debug views.
- **Periodic work is spread out.** It is hashed into 250- and 2 000-tick buckets and id-offset intervals.
- **Interval logic follows the camera (new in 1.6).** It runs every zoom + 1 ticks on screen and every 15 ticks off screen.
- **The largest AI cost runs off the main thread (also new in 1.6).** Pathfinding is queued and solved as Burst-compiled A\* jobs, resolved the next tick.
- **Spatial queries use acceleration structures.** Regions bounded by 12 × 12 squares, cached reachability and region-wise closest-thing search keep most queries away from full A\*.
- **Smaller pieces.** A 3 ms incremental GC slice, object pooling and a built-in 30-second FPS/TPS benchmark.

The AI is three layers of plain, legible code:
- **Pawns** use XML think trees with fixed precedence. A small priority sorter balances hunger (9.5), rest (8), joy (6–7) and work (5.5–9) by timetable slot. Work goes to the nearest target in the highest priority tier, through scanners, toils and reservations.
- **Lords** run state graphs of toils and triggers for raids and other groups. Auto-flee comes at 40–70 % losses, a give-up timer at 10–15 h, and a "satisfied" exit at 25–35 % colony damage, all seeded per lord.
- **The storyteller** sizes threats by wealth (buildings at half value) and colonists, ramps them over the first 40 days, and rubber-bands them through adaptation days (×0.40 to ×1.47). Cassandra and Phoebe time big threats with an exact seeded schedule. The model reimplements it, and a C# check confirms the hashing matches bit for bit. The schedule depends only on world seed, map seed, comp index and cycle, so reloading cannot move a raid.
- **Pathfinding heuristics depend on who is watching.** Colonists get strength 1, animals 1.75; at 1.75 paths are about 6 % longer but only 14 % of the nodes are expanded.

Three findings stand out for developers:
1. Visibility-based logic LOD combined with asynchronous paths is the 1.6 performance strategy, and it generalises to any agent simulation.
2. Determinism is used selectively. Threat timing, lords and flee thresholds are seeded from saved values, while ordinary randomness is reseeded from the clock at start-up. This protects the design from save-scumming without making the world repetitive.
3. Legibility is built into the simulation (named thoughts, stat breakdowns, job reports), so stochastic failures such as mental breaks with a mean time between of days read as fair. The weaker spots are linear reservation scans, invisible tier-and-distance job rules, and hidden drama variables.

## 2–13. Sections
| § | Topic | File |
|---|---|---|
| 2 | Engine, layers, defs, object model, saves, mod surface | `architecture/ARCHITECTURE.md` |
| 3 | **Simulation and performance** | `performance/PERFORMANCE_ARCHITECTURE.md` |
| 4 | **Game AI** | `ai/AI_ARCHITECTURE.md` |
| 5 | Gameplay systems, design and psychology | `gameplay/GAMEPLAY_SYSTEMS.md` |
| 6 | Progression and pacing | `progression/PROGRESSION.md` |
| 7 | Economy | `economy/ECONOMY.md` |
| 8 | Formulas (34, tiered, with file and line) and model results | `mathematics/FORMULAS.md` |
| 9 | Content inventory and data architecture | `content/CONTENT.md` |
| 10 | UX | `user-experience/UX_ANALYSIS.md` |
| 11 | Development lessons | `development-lessons/DEVELOPMENT_LESSONS.md` |
| 12 | Prototype (original workbench: tick budget, A\* strength, threat points, exact big-threat schedule, mental-break risk, hit chance, job choice) | `prototypes/rimworld_workbench.html` |
| 13 | Simulations, experiments, evidence | `simulations/`, `experiments/`, `evidence/` |

## 14. Remaining unknowns
| Item | Status |
|---|---|
| Real per-tick costs on real colonies | UNKNOWN; not profiled (the model's tick-cost table is illustrative) |
| How often ×6 actually falls short in typical late games | UNKNOWN without running the benchmark |
| Exact weights inside `AttackTargetFinder` and cover choice | read at structure level, not modelled |
| Raid behaviour against specific base layouts (kill boxes, breach paths) | STRONG INFERENCE from cost-grid code; not observed |
| Quest generation (`QuestGen`, 381 files) and world generation | out of focus; not analysed in depth |
| Ideology, Biotech, Anomaly and Odyssey subsystems beyond their use of the shared frameworks | surveyed by counts only |
| Per-incident worker logic for the 131 incidents | not individually read |

## 15. Completion checklist
- [x] Engine and build identified (Unity 2022.3.35f1 Mono, Burst AOT, 1.6.4871)
- [x] Code decompiled (9 217 files) and archived; defs parsed into 20 CSVs and 61 think-tree outlines
- [x] Simulation and performance architecture (loop, budget, buckets, interval LOD, async paths, regions, caches, GC, saves)
- [x] AI architecture (think trees, work, jobs, reservations, pathfinding, minds, social, lords, storyteller, shooting)
- [x] Formulas with tiers and file and line (34)
- [x] Model (16 sections) with an exact RNG port cross-checked against C#; prototype checked against the model in node
- [x] Gameplay, progression, economy, content, UX, development lessons
- [ ] Independent review (§16)

## 16. Independent review
(pending)
