> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera-2/5.4.0/development-lessons/DEVELOPMENT_LESSONS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Development lessons

## Adopt
| Idea | Why it works | How to reuse |
|---|---|---|
| Roster = collection = workforce = upgrade currency | one acquisition loop feeds every system; each summon raises throughput for the next (55.7 player-equivalents at a full roster) | make the collectible the worker, and make "use it" the way it levels |
| One progression row spread into every skill | 12 rungs × 6 skills from one table; tuning one row rebalances all skills | `...progression(i)` spreads in data modules; keep identity in item names and drop triples |
| Universal drop chance scaled by duration | per-hour rare-drop rate is constant across tiers, so players never lose charm income by moving up | scale per-cycle chances by cycle length whenever a currency should be tier-neutral |
| Allocation puzzle with a hard budget | sanctuary tiers from summed job points: 271 points available against 324 for all-tier-5 → a real choice between specialising and spreading | design caps so the best answer depends on the player's goal, and check it with a solver |
| No-fail timed missions | party quality shortens the trip instead of risking failure (expeditions); dungeons grade instead of failing, with only the armor-set entry cost at risk | map quality to time or grade, not success; keep entry costs small |
| Prestige that is per-entity, not global | awaken/prestige each creature individually keeps the rest of the roster working | avoid "reset everything" prestige in roster games |
| Batched reducer tick | all pending fixed updates + one variable update per ≥ 33 ms dispatch, one `structuredClone` | batch simulation steps per render; never clone per sub-step |
| Self-registering modules | `require.context` on `modules/*/updates.ts` with `onUpdate`/`onFixedUpdate` | adding a system is adding a folder |
| Atomic, layered saves | tmp + fsync + rename, `.prev`, 11 rolling backups, newest-first recovery | copy as-is for any local-save game |
| Sleep detection | ≥ 10 s wall-clock gap → offline calculator instead of a giant frame | handles lid-close and background throttling with the same code path as relaunch |

## Avoid
| Problem | Evidence | Better approach |
|---|---|---|
| Two clocks (wall-clock `startTime` vs unsaved fixed-update counters) | machines/fabrication/gold counters are module-scope and reset on reload; activities drop overshoot each cycle | one simulation clock in the save; accumulate overshoot (`startTime += duration`) |
| Separate offline code path | `offline-progress.ts` (1 078 lines) re-implements gathering, helpers, crafting, machines; it diverges in at least seven ways (XP rounding, processor inputs, idle-machine XP, double `startTime` shift, garden remainder, stale `lastSaveTime`) | run the same step function in large fixed steps, or derive both from one rate function (Melvor Idle does exactly this) |
| Comments as balance documentation | sanctuary "+20 %" vs 40, rock "1000·1.5ⁿ" vs 750·1.191232ⁿ, "2 hr"/"30 minutes" vs 3 600 s, "cap 99" vs 70, dungeon "1 xp/sec" vs 0.5 | generate balance docs from the config objects; test that docs match |
| Validation only in the UI | `summonCreature` does not check cost or ownership; `addHelper` checks no cap because the cap helper is never called | put rules in reducers; UI only disables buttons |
| Dead unlocks and stubs | Dirt to Riches, Content Exporter, `getHelperSlots`, `EXPEDITIONS_PER_TIER` unused | delete or feature-flag cut content; lint for unused exports |
| Hidden dominant lever | flat +3 yield = 4× on every drop including containers | show effective multipliers ("×4 items") rather than "+3" |
| Main bonus system gated behind the first prestige | the sanctuary accepts only awakened creatures, so its +120 % XP appears only after the first L70 awakening | if a system is gated, preview it (greyed slots, a tooltip) so players plan for it |
| Client-side encryption with an embedded key | AES-256-CBC with a constant key in the shipped main process | either accept plain saves for a single-player game or use a checksum only; the key adds complexity without protection |

## Reusable principles
1. Make the thing the player collects also the thing that does the work, and let using it be how it grows.
2. Keep per-hour value of shared currencies tier-neutral; make tiers about new items, not about losing old income.
3. Put every number the player optimises on screen as an effective multiplier, including the ones that compound.
4. One clock, one step function, online and offline.
5. When a cap creates a choice, prove the choice exists with a quick search over the data (the sanctuary analysis here took one second to run).
