> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle-2/0.11.7-alpha/development-lessons/DEVELOPMENT_LESSONS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Development lessons

## Adopt
| Idea | Evidence | Reuse |
|---|---|---|
| Stats as a dependency graph with generated wiring | `[StatsClass]`, `[StatComputer]`, `ComputeStatNode` | pure formula functions, automatic recomputation, tooltips generated from the same graph |
| Formula choice as data | `CombatStyle.MaxHitFormula` `{"Type": "MelvorBase:StrengthBonus"}` | designers can swap or add formulas per style without code changes |
| Bounded randomness | Mining progress-or-break | chance per attempt plus accumulated progress cuts the tail (and lowers the mean, so tune p with that in mind) |
| XP-proportional rare rolls | `ChancePerExperienceTrigger` | rewards that are neutral to action speed |
| Same tick for offline, on a worker thread | `Main.RunOfflineTicks` in `Task.Run` | the online distribution without freezing the UI (but set the offline flag on every replay path, not only one) |
| Sleep detection by clock drift | `SleepDetector` (5 s poll, 10 s threshold) | catches OS sleep and long stalls with one mechanism (shorter drift is discarded, not replayed) |
| Editor inside the game binary, JSON as output | 618 `DataEditor` files | content and tools versioned together |
| Integer-friendly formula forms | `22 + L + (L + 17)·S/64` vs Melvor 1's float form (89 off-by-one cases, integer S) | rewrite float formulas into integer arithmetic where exactness matters; the XP table shows the reverse: `Pow(Pow(2, 1/7), i)` drifts from `2^(i/7)` |

## Avoid
| Problem | Evidence | Better |
|---|---|---|
| Physics tick as the game clock by default | `TickInterval` derived from `Engine.PhysicsTicksPerSecond` (unset → 60 Hz) | pin the simulation rate in project settings so a physics change cannot change game speed |
| Alpha placeholders in shipped data | generic task descriptions, `missing_artwork` | lint data for placeholders before builds |
| Content present but not wired | 20 quests, 152 guild tasks, 11 master pets, 24 areas not in `EntityConfig` | report unreferenced objects in the data build |
| Unsanitised pack paths in our own tool | `godot_pck.py extract` (research tool; fixed after review) | reject `..` and absolute paths when extracting untrusted packs |

## Principles
1. Model numbers as a graph of small pure functions; the UI, simulator and tests can all read the same graph.
2. Prefer bounded variance mechanics (progress plus chance) over pure geometric rolls for actions players repeat thousands of times.
3. Tie rare rewards to the resource players already optimise (XP), not to action count.
