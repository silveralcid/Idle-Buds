> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/rimworld/1.6.4871/ai/AI_ARCHITECTURE.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Game AI architecture

Source: `evidence/decompiled/` (RimWorld 1.6.4871 Assembly-CSharp), `Data/*/Defs` (think trees, duties, storytellers, mental breaks), and outlines of all 61 think trees in `evidence/thinktrees/`. Numbers marked "model" come from `simulations/rimworld_model.py`. Tiers: everything here is **VERIFIED** in code or defs unless marked otherwise.

RimWorld's AI has three layers. **Pawns** choose jobs from behaviour trees. **Lords** coordinate groups (raids, caravans, visitors, parties) by giving pawns duties. The **storyteller** decides what happens to the colony. All three are deterministic code paths around seeded or unseeded `Verse.Rand` calls; none uses planning or learning.

## 1. Pawn decision: think trees
- **Structure.** A `ThinkTreeDef` (XML) is a tree of `ThinkNode`s. A node's `TryIssueJobPackage(pawn)` returns a `ThinkResult` (a job plus its source node) or nothing. Composite nodes:
  - `ThinkNode_Priority` tries children in order until one returns a job.
  - `ThinkNode_PrioritySorter` (`Verse.AI/ThinkNode_PrioritySorter.cs` 19–60) inserts its children into a working list at random positions, then repeatedly picks the child with the highest `GetPriority(pawn)` above 0 and `minPriority`. If that child gives no job, it is removed and the next highest is tried. The random order only breaks ties.
  - Conditional nodes (`ThinkNode_Conditional*`) gate subtrees on state: downed, drafted, mental state, in a lord, has a queued job, temperature, prisoner and so on.
  - `ThinkNode_Subtree` links a tree to another def. `ThinkNode_Tagger` labels the result for interruption rules. `ThinkNode_QueuedJob` resumes queued orders.
  - Leaves are `JobGiver_*` classes, which build a `Job` (a `JobDef` + targets + counts).
- **Two trees per pawn.** The **main** tree runs when the current job ends or is interrupted. The **constant** tree (`HumanlikeConstant`, `AnimalConstant` …) is evaluated every 30 ticks while a job runs (`Pawn_JobTracker` 140) and can interrupt it: flee explosions, find oxygen, respond to hostility, the lord's constant duty.
- **Humanlike main tree, in priority order** (`evidence/thinktrees/Humanlike.md`):
  1. Downed and burning states.
  2. Critical mental states.
  3. Close melee threats.
  4. Ordinary mental states.
  5. Queued jobs.
  6. Drafted orders.
  7. Self-tend.
  8. Lord duty.
  9. Prisoner, slave and guest logic.
  10. Seek the allowed area or a safe temperature.
  11. `MainColonistBehaviorCore`: the sorter that balances needs against work.
- **The needs-versus-work sorter.** `GetPriority()` values come from `JobGiver_GetFood`, `JobGiver_GetRest`, `JobGiver_GetJoy`, `JobGiver_Work` and the current timetable slot:

| Giver | Condition | Anything | Work | Joy | Sleep |
|---|---|---|---|---|---|
| GetFood | food below the race's want-to-eat level | 9.5 | 9.5 | 9.5 | 9.5 |
| GetRest | rest < 0.30 (Sleep slot: always) | 8 | 0 | 8 | 8 |
| GetJoy | joy < 0.35 (Joy slot: < 0.95; Sleep slot: < 0.95) | 6 | 0 | 7 | 2 |
| Work | – | 5.5 | 9 | 2 | 3 |

  Hunger always wins. In a Work slot only food outranks work, so a tired, bored colonist keeps working until the timetable changes. In Anything slots needs below their thresholds outrank work.
- **Why trees, not utility AI.** The sorter is the only utility-like part, and its values are a handful of constants. Everything else is a fixed precedence list. That makes behaviour predictable and debuggable. The price is that cross-cutting preferences must be expressed by inserting nodes at the right height.

## 2. Work: work types, work givers and scanners
- **Ordering** (`RimWorld/Pawn_WorkSettings.cs` 215–240). The player sets a priority from 1 to 4 per work type. Work types are sorted by `naturalPriority + (4 − player priority) × 100 000`, so player priority dominates and the def's natural order breaks ties. Emergency givers (firefighting, emergency doctoring) from work types at the best priority come first.
- **Search** (`RimWorld/JobGiver_Work.cs` 55–300):
  - The pawn walks the ordered work givers. Each giver is a `WorkGiver_Scanner` with a thing request, a cell set or a custom enumerable.
  - For each scanner it finds the best target. A prioritized scanner uses a global search scored by `GetPriority(pawn, thing)`; otherwise `GenClosest.ClosestThingReachable` searches region by region up to `MaxRegionsToScanBeforeGlobalSearch`, then globally.
  - Within one `priorityInType` tier the best target across all scanners wins. At the first tier boundary after a valid target, the search stops (line 85), and the winning giver builds the job.
- **Consequence.** A pawn does the nearest job of its highest tier, not the globally most valuable one. Distance is the implicit utility, which is why base layout (storage near benches, beds near work) changes colony efficiency so much.
- **Data.** 23 work types and 153 work givers across the DLCs (`evidence/data/work_types.csv`, `work_givers.csv`).

## 3. Executing a job: drivers, toils and reservations
- **JobDriver.** A job's `JobDef.driverClass` builds a list of **toils** (`MakeNewToils`). A toil is a small state machine step:
  - `initAction`;
  - `tickAction`, or in 1.6 `tickIntervalAction(delta)`;
  - `defaultCompleteMode`: Instant, Delay, PatherArrival, Never or FinishedBusy;
  - end conditions and fail conditions: `FailOnDespawnedNullOrForbidden`, `FailOnBurningImmobile`, `FailOn(() => …)`.
  Jumps (`Toils_Jump.JumpIf`) allow loops: haul again while there is more to carry, do a bill again while it is not done. Research, for example, is: go to the bench's interaction cell, then a toil whose interval action adds `ResearchSpeed × bench factor × delta` points and 0.1 Intellectual XP per tick (`RimWorld/JobDriver_Research.cs` 30–45).
- **Job tracker** (`Verse.AI/Pawn_JobTracker.cs`):
  - Starts, ends and queues jobs, and re-checks think trees when a job ends.
  - Expires jobs by `expiryInterval`. For jobs with an interval-scaling target the interval follows the distance to that target, along the curve (0 → 30, 50 → 120, 100 → 600 ticks), so distant pursuits re-plan less often.
  - Pools finished `Job` objects (`JobMaker.ReturnToPool`).
  - Has a loop guard: if a pawn starts 10 or more jobs within the last 10 ticks it logs an error and gets an error-recovery job (lines 205–240). Two givers that each produce a job the other immediately invalidates therefore become a visible bug instead of a frozen pawn.
- **Reservations** (`Verse.AI/ReservationManager.cs`). A pawn reserves the targets of its job (things, cells, seats, stack counts, layers) before acting. Other pawns' searches skip reserved targets (`CanReserve` 157–227 scans the map's reservation list). This prevents two pawns hauling the same item, but it is a linear scan per query (see `performance/PERFORMANCE_ARCHITECTURE.md` §6). Other ways to claim things:
  - `PhysicalInteractionReservationManager` (one pawn physically using a thing);
  - `AttackTargetReservationManager` (melee targets spread across attackers);
  - pawn **claims** on beds and seats.
- **Movement.** `Pawn_PathFollower` requests a path, walks it cell by cell at the pawn's move speed, and re-requests when the path is blocked. Doors open on approach, and a blocked cell costs extra until it clears.

## 4. Pathfinding
Asynchronous, Burst-compiled A\* since 1.6. Full description in `performance/PERFORMANCE_ARCHITECTURE.md` §4; the search itself is `Verse/PathFinderJob.cs`.

**Costs:**
- A cardinal step costs the pawn's ticks per cardinal move (13 by default) and a diagonal step its ticks per diagonal move (18), plus the cell's cost from the cost grid: terrain, things, the avoid grid and allowed area.
- Cells with a cost of 10 000 or more are impassable, and a blocked cell (one with a pawn standing in it) adds 175.
- Diagonal moves may not cut corners.

**Heuristic.** Octile distance × 13 × strength:

| Pawn | Strength |
|---|---|
| Colonists | 1 (1.5 in unnatural darkness) |
| Animals | 1.75 |
| Other AI pawns | round(curve of distance 40 → 1, 120 → 2) |

A closed node is reopened only if the new cost is lower by more than 11.

**Model results (§3):**
- Strength 1.75 finds paths about 6 % longer on average (worst 16 %) while expanding only 14 % of the nodes, on 30 random maps.
- Because 13·√2 = 18.4 > 18, even strength 1 slightly overestimates diagonals, so the search is weighted A\*, not strictly optimal.
- This is a deliberate trade, and the code says so: colonists, whose paths the player watches, get near-optimal paths; animals and raiders get cheap ones.

## 5. Needs, mood and mental breaks
- **Needs** update every 150 ticks (`IsHashIntervalTick(150, delta)`); each update applies 150 ticks of change at once.
  - **Food**: falls 2.6667·10⁻⁵ per tick × the race's hunger rate. That is 1.6 nutrition per day for a human, ×0.5 when hungry, ×0.25 when urgently hungry, 0 when starving.
  - **Rest**: falls 1.5833·10⁻⁵ per tick (0.95 per day; ×0.7 tired, ×0.3 very tired) and is regained at 3.8095·10⁻⁵ per tick in bed (× bed rest effectiveness). A full night is about 10.5 h (model §5).
  - **Joy, beauty, comfort, outdoors, room size …** are seekers or simple needs defined in `NeedDefs`.
- **Mood** (`RimWorld/Need_Mood.cs`, `Need_Seeker.cs`).
  - The instant mood is clamp01(0.32 + Σ thought offsets / 100 + the difficulty offset), from 923 `ThoughtDef`s (memories, situational thoughts, social opinions).
  - The displayed mood moves toward it by at most 0.12 per hour when rising and 0.08 per hour when falling. A sudden −20 thought therefore takes about 2.5 h to land fully, which gives the player a window to react.
- **Mental breaks** (`Verse.AI/MentalBreaker.cs`).
  - Thresholds come from the stat `MentalBreakThreshold` (base 0.35, modified by traits, ideology and hediffs): minor at the threshold, major at × 4/7 (20 %), extreme at / 7 (5 %).
  - Every 150 ticks the breaker checks mood. Once mood has been below a threshold for more than 2 000 ticks, a break happens with mean time between 4 days (minor), 0.8 days (major) or 0.5 days (extreme).
  - `Rand.MTBEventOccurs` is linear per check (p = interval / MTB), so the chance of a major break after a day spent below 20 % is about 70 % (model §6).
  - After recovery, no new random break can start for 15 000 ticks (6 h).
  - The break itself is picked by weighted random from the eligible `MentalBreakDef`s of that intensity, weighted by each worker's `CommonalityFor(pawn)` (line 317; 33 break defs). The thought blamed for it is also weighted random, by how negative it is (line 382).
- **Mental states** replace the main tree near its top: berserk, wander, binge, fire starting, tantrum, hide in room and so on. Each state def names a think tree, and recovery happens after an MTB or when its condition ends.
- **Inspirations** are the positive mirror: random, mood-gated, and they boost a skill outcome, such as +2 quality levels for Inspired Creativity.

## 6. Social AI
- **Interactions** (`RimWorld/Pawn_InteractionsTracker.cs`). Every 60 ticks, at least 320 ticks after the last interaction, a pawn may start a random interaction. Its MTB is 22 000 ticks when quiet, 6 600 normally and 550 when super active, at most about 0.36 per hour per pawn normally (model §7).
- **Choosing the interaction.** `InteractionDef`s (chitchat, deep talk, insult, romance attempt, recruit …) are chosen by weighted random on their workers' `RandomSelectionWeight(initiator, recipient)` (line 341).
- **Effects.** Each interaction gives thoughts and opinion changes and can start fights. Relations are kept in `Pawn_RelationsTracker`, where opinion is the sum of social thoughts.

## 7. Group AI: lords, duties and raids
- **Lord** (`Verse.AI.Group/Lord.cs`). A lord owns a set of pawns and a `LordJob`, which builds a `StateGraph`:
  - The graph's nodes are **LordToils**, such as `LordToil_AssaultColony`, `LordToil_Stage`, `LordToil_DefendPoint`, `LordToil_ExitMap`, `LordToil_PanicFlee` and `LordToil_KidnapCover`.
  - Its edges are **Transitions** with **Triggers**, such as `Trigger_FractionPawnsLost`, `Trigger_TicksPassed`, `Trigger_PawnHarmed`, `Trigger_FractionColonyDamageTaken` and `Trigger_Memo`.
  - A toil assigns **duties** (`DutyDef`, 108 defs) to its pawns.
  - The `ThinkNode_Duty` slot in each pawn's main tree runs the duty's own think subtree. Pawns stay autonomous inside the duty: they still path, fight and flee individually.
- **Assault colony** (`RimWorld/LordJob_AssaultColony.cs`).
  - **Give up.** The raid gives up after a random 26 000–38 000 ticks (10.4–15.2 h); sappers and breachers wait 33 000–38 000.
  - **Satisfied.** It leaves "satisfied" once 25–35 % of colony value has been damaged.
  - **Kidnap and steal.** Subgraphs carry off downed colonists or valuables.
  - **Auto-flee.** For factions with auto-flee, every toil gets a high-priority transition to `PanicFlee`. It fires when the fraction of pawns lost reaches a value drawn once per lord from the faction's `attackersDownPercentageRangeForAutoFlee` (default 0.4–0.7), seeded by the lord's `loadID`.
  - **Determinism.** The whole graph is built under `Rand.PushState(loadID × 193)`, so a lord rebuilds identically after a load.
- **Raid strategies and arrival modes** (`RaidStrategyDef`, `PawnsArrivalModeDef`; 11 strategies in `evidence/data/raid_strategies.csv`). They choose the lord job (immediate attack, sappers, siege, breach, stage then attack …) and how pawns enter (edge walk-in, drop pods, centre drop). Each strategy has a `selectionWeightPerPointsCurve`, so some strategies appear only at higher points.
- **Combat at pawn level.** Ranged pawns pick targets with `AttackTargetFinder`, which weighs distance, threat, cover and line of sight. Melee pawns use the melee target reservation. Cover positions come from `CoverUtility`. Hit chance is analytic (§9).

## 8. The storyteller
- **Cadence.** `Storyteller.StorytellerTick` runs every 1 000 ticks. Each `StorytellerComp` proposes incidents for each target (home maps, caravans, the world), and fired incidents are queued with delays (`IncidentQueue`).
- **Threat points** (`RimWorld/StorytellerUtility.cs` `DefaultThreatPointsNow`):
  - Wealth = items + 0.5 × buildings (floors included) + pawns. Pawns are the market values of all player-faction pawns on the map, slaves at ×0.75 and quest lodgers excluded. Wealth is recounted at most every 5 000 ticks (`WealthWatcher.MinCountInterval`).
  - Points = (PointsPerWealthCurve(wealth) + Σ per-colonist points) × lerp(1, adaptation factor, effect factor) × difficulty `threatScale` × days-passed factor. The days-passed factor runs from 0.70 at day 10 to 1.00 at day 40.
  - Per-colonist points come from (0 → 15, 10 000 → 15, 400 000 → 140, 1 000 000 → 200) by colony wealth, lerped 0.65 toward the colonist's health.
  - The result is clamped to [a seeded minimum of 35 up to the difficulty's ceiling, 10 000].
  - On Rough at day 60, 100 000 wealth and 6 colonists give about 800 points; 400 000 and 10 colonists give 3 800 (model §8).
- **Adaptation** (`RimWorld/StoryWatcher_Adaptation.cs`).
  - Adapt days rise over time and fall when colonists die (−30, or −20 in colonies of 20+) or are violently downed (−8 to −3.5 by population). They run from −60 to 100 days, grow only after a 30-day grace (unless negative), recover at 3 per day below 0 (6 below −30), rise 1 per day from 0 to 60 and 0.5 above, and update every 30 000 ticks.
  - They feed the points factor through a curve: −30 → ×0.40, 0 → ×0.80, 30 → ×1.00, 60 → ×1.20, 100 → ×1.47 (model §9).
  - This is the difficulty "rubber band": losing pawns lowers the next threats; peace raises them.
- **Exact on/off-cycle scheduling** (`RimWorld/IncidentCycleUtility.cs`, `StorytellerComp_OnOffCycle`).
  - Cassandra's and Phoebe's big threats come from a schedule that is a pure function of (world seed, target's constant seed, comp index, cycle index). It uses `Gen.HashCombineInt` and a seeded `Rand` to place 1–2 incidents (Cassandra) or 1 (Phoebe) per cycle, with minimum spacing and relaxation of crowded points.
  - Cycle lengths are Cassandra 4.6 days on / 6 off, Phoebe 8 on / 8 off.
  - The comp index is the position in the merged comp list: 20 with all DLCs, 7 for Core only.
  - Reloading a save does not move a scheduled raid in time; only the points and the incident chosen at fire time are re-rolled.
  - Model §10 reimplements the scheduler and checks the hash functions against the C# originals (`experiments/rngcheck/`). Results: Cassandra about 8.5 big threats per 60-day year (median gap 8.1 days, minimum 1.9) and Phoebe about 3.8 (median 16 days).
- **Randy** (`StorytellerComp_RandomMain`).
  - Incidents arrive with an MTB of 1.35 days. The category is weighted: Misc 3.5, FactionArrival 2.4, ThreatBig 1.4, OrbitalVisitor 1.1, ThreatSmall 0.6, ShipChunkDrop 0.22.
  - A big threat is forced if 13 days pass without one.
  - Model: about 8.4 big threats per year, similar in count to Cassandra but with no spacing, so the variance is the design.
- **Incident choice.** Within a category, the incident is chosen by its `baseChance` × its storyteller adjustments × "can fire now" checks (`IncidentWorker.CanFireNow`). Raids then choose faction, strategy and arrival from the points.

## 9. Shooting
`Verse/ShotReport.cs`:
- **Aim chance** = shooter accuracy^distance × the weapon's accuracy at that distance (interpolated between its touch ≤ 3, short ≤ 12, medium ≤ 25 and long ≤ 40 cell values) × weather, lighting and other factors, with a minimum of 0.0201. It is then multiplied by (1 − cover block chance). A miss can still hit something along the line.
- **Shooter accuracy** comes from the `ShootingAccuracyPawn` curve on Shooting skill: 0.89 per cell at L0, 0.97 at L10, 0.99 at L20.
- **Example** (model §12): an assault rifle at 15 cells hits 29 % at skill 5, 44 % at 10 and 59 % at 20.
- **Effect on behaviour.** Because accuracy compounds per cell, skill matters more at long range, and AI pawns' target and position choices favour cover.

## 10. What the AI does not do
- No global planner: pawns are greedy within their tier, and lords are fixed graphs.
- No learning or memory of the player's defences.
- No coordination beyond lords and reservations: two raiders do not plan flanks, they pick targets independently inside the same duty.
- Raids do pathfind around kill-box walls, through doors they can bash, and toward the weakest-cost approach, because the cost grid includes things to break. This, not intent, explains much of the "smart" raid behaviour players see. Sappers and breachers use dedicated path cost tuning and a `BreachingGrid` (`Verse.AI/BreachingGrid.cs`) to dig or blast toward the colony. This is STRONG INFERENCE from the code paths: no live game was observed.
