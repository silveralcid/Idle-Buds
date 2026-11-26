> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/rimworld/1.6.4871/mathematics/FORMULAS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Formulas

Paths are relative to `evidence/decompiled/` (namespace folders) or to the game's `Data/<package>/Defs`. Line numbers refer to the decompiled files. Tier key: **VERIFIED** = read in code or defs; **STRONG INFERENCE** = follows from several verified pieces; **HYPOTHESIS** = plausible, not confirmed.

## Time and simulation
| # | Formula | Tier | Where |
|---|---|---|---|
| 1 | 60 ticks per real second at ×1; 2 500 ticks per hour, 60 000 per day, 15-day quadrums, 60-day years | VERIFIED | `Verse/GenTicks.cs` 10–14, `GenDate` |
| 2 | Speed multipliers: ×1, ×3, ×6 (×12 while no player humanlike is awake, ×18 with no maps), dev-only ×15 (×150 with no maps or boost); forced ×1 for 800 ticks after a combat verb | VERIFIED | `Verse/TickManager.cs` 74–113, 245–; `Verse/TimeSlower.cs` 9–32; `Verse/Verb.cs` 339–341 |
| 3 | Per frame: add real time to a debt (snapped to one tick's time if within 10 %); run ticks while debt > 0, ticks < 2 × multiplier and elapsed < 45.45 ms (WorstAllowedFPS 22); leftover debt is discarded | VERIFIED | `TickManager.TickManagerUpdate` 318–355 |
| 4 | Rare and Long tickers: bucket = hash % 250 or % 2 000; one bucket per tick | VERIFIED | `Verse/TickList.cs` 16–27, 90, 124 |
| 5 | Interval ticking (1.6): `TickInterval(delta)` every clamp(rate, 1, 15) ticks, rate = zoom + 1 on screen in the current map, else 15 | VERIFIED | `Verse/GenTicks.cs` 122 `GetCameraUpdateRate`; `Verse/Thing.cs` 700–751 |
| 6 | `IsHashIntervalTick(n)`: (TicksGame + HashOffset) % n == 0 with HashOffset = HashCombineInt(thingIDNumber, 169495093) | VERIFIED | `Verse/Gen.cs` 216 |
| 7 | `Rand.Value` = (MurmurHash(seed, iterations++) + 2³¹) / 4 294 967 295; seed from the wall clock at start-up, not saved | VERIFIED | `Verse/Rand.cs` 35; `Verse/MurmurHash.cs` |
| 8 | `Rand.MTBEventOccurs(mtb, unit, interval)` succeeds with p = interval / (mtb × unit) per check (linear approximation) | VERIFIED | `Verse/Rand.cs` 509 |

## Movement and pathfinding
| # | Formula | Tier | Where |
|---|---|---|---|
| 9 | Step cost = ticks per cardinal (13) or diagonal (18) move + max(grid cost, provider cost) + 175 if blocked; cost ≥ 10 000 impassable; diagonals cannot cut corners | VERIFIED | `Verse/PathFinderJob.cs` 38, 141–208 |
| 10 | Heuristic = octile distance × 13 × strength; reopen a closed node only if it improves by more than ceil(0.8 × 13) = 11 | VERIFIED | `PathFinderJob.cs` 162 |
| 11 | Strength: colonist 1 (1.5 in unnatural darkness), animal 1.75, other AI round(curve(40 → 1, 120 → 2)(distance)) | VERIFIED | `Verse/PathFinder.cs` 262, 535–555 |

## Needs, mood and minds
| # | Formula | Tier | Where |
|---|---|---|---|
| 12 | Food fall per tick = 2.6667·10⁻⁵ × hungerRateFactor × baseHungerRate × (1 fed, 0.5 hungry, 0.25 urgently hungry, 0 starving); applied every 150 ticks | VERIFIED | `RimWorld/Need_Food.cs` 11, 218 |
| 13 | Rest fall 1.5833·10⁻⁵ per tick × (1, 0.7 tired, 0.3 very tired); gain in bed 3.8095·10⁻⁵ × bed rest effectiveness | VERIFIED | `RimWorld/Need_Rest.cs` 18–57 |
| 14 | Instant mood = clamp01(0.32 + Σ thought mood offsets / 100 + difficulty offset); mood moves toward it ≤ 0.12/h up, ≤ 0.08/h down (per 150-tick step: × 0.06) | VERIFIED | `RimWorld/Need_Mood.cs` 20–31; `Need_Seeker.cs` 36–52; `NeedDefs` Mood |
| 15 | Break thresholds: minor T = MentalBreakThreshold (base 0.35), major T × 4/7, extreme T / 7; after > 2 000 ticks below, MTB 4 / 0.8 / 0.5 days checked every 150 ticks; none within 15 000 ticks of recovery | VERIFIED | `Verse.AI/MentalBreaker.cs` 24–40, 165–169 |
| 16 | Random interaction: every 60 ticks, > 320 ticks since the last, MTB 22 000 / 6 600 / 550 ticks (quiet / normal / super active) | VERIFIED | `RimWorld/Pawn_InteractionsTracker.cs` 24–30, 120 |
| 17 | Job loop guard: ≥ 10 jobs started within the last 10 ticks triggers an error-recovery job | VERIFIED | `Verse.AI/Pawn_JobTracker.cs` 205–240 |
| 18 | Job expiry for distance-scaled jobs = curve(0 → 30, 50 → 120, 100 → 600 ticks) of Manhattan distance to the target | VERIFIED | `Pawn_JobTracker.cs` 48–52, 164 |
| 19 | Work-type order key = naturalPriority + (4 − player priority) × 100 000 (descending); stop at the first `priorityInType` tier boundary after a target is found | VERIFIED | `RimWorld/Pawn_WorkSettings.cs` 225–228; `RimWorld/JobGiver_Work.cs` 85 |

## Storyteller
| # | Formula | Tier | Where |
|---|---|---|---|
| 20 | Storyteller wealth = items + 0.5 × buildings (incl. floors) + player-faction pawns (slaves × 0.75); or a time curve in fixed-wealth mode | VERIFIED | `Verse/Map.cs` 412–422; `RimWorld/WealthWatcher.cs` 124–165 |
| 21 | Threat points = (PointsPerWealthCurve(W) + Σ colonist points) × lerp(1, adaptation factor, effect factor) × threatScale × daysPassed curve (10 → 0.70, 40 → 1.00), clamped to [seeded min 35…ceiling, 10 000]; wealth curve (0, 0), (14 000, 0), (400 000, 2 400), (700 000, 3 600), (1 000 000, 4 200); colonist points (0, 15), (10 000, 15), (400 000, 140), (1 000 000, 200) lerped 0.65 toward health | VERIFIED | `RimWorld/StorytellerUtility.cs` 14–69, 131– |
| 22 | Adaptation: adaptDays updated every 30 000 ticks by 0.5 × growth curve (1 below 60, then smaller); losses subtract; range −60 to 100; no growth in the first 30 days; points factor curve −30 → 0.40, 0 → 0.80, 30 → 1.00, 60 → 1.20, 100 → 1.47 (Rough) | VERIFIED | `RimWorld/StoryWatcher_Adaptation.cs` 14–16, 75; `StorytellerDef` curves |
| 23 | On/off cycle incident times are a pure function of HashCombineInt(world persistentRandomValue, target ConstantRandSeed, comp index, cycle index) | VERIFIED | `RimWorld/IncidentCycleUtility.cs` 14–; ported and cross-checked in `experiments/rngcheck/` |
| 24 | Randy: an incident with MTB 1.35 days (checked every 1 000 ticks), category by weight; ThreatBig forced after 13 days without one | VERIFIED | `RimWorld/StorytellerComp_RandomMain.cs` 18, 43; `Storytellers.xml` |
| 25 | Raid auto-flee at fraction lost ∈ [0.4, 0.7] drawn once per lord (seed loadID); assault gives up after 26 000–38 000 ticks (sappers 33 000–38 000); satisfied at 25–35 % colony damage | VERIFIED | `RimWorld/LordJob_AssaultColony.cs`; `FactionDef` |

## Combat, skills and economy
| # | Formula | Tier | Where |
|---|---|---|---|
| 26 | Aim chance = accuracy(skill)^distance × weapon accuracy(distance) × weather × gas × execution + darkness offset, min 0.0201; × target size × posture; hit = clamp01(aim × (1 − cover block)) | VERIFIED | `Verse/ShotReport.cs` 58–78, 92–98 |
| 27 | Shooter accuracy per cell from `ShootingAccuracyPawn`: 0.89 at L0, 0.945 at L5, 0.97 at L10, 0.99 at L20 | VERIFIED | `Stats` defs; model §12 |
| 28 | XP to next level = curve(0 → 1 000, 9 → 10 000, 19 → 30 000); learn × (0.35 / 1 / 1.5 by passion) × GlobalLearningFactor, × 0.2 after 4 000 XP in a day | VERIFIED | `RimWorld/SkillRecord.cs` 30–66, 251–300, 371–395 |
| 29 | Skill decay every 200 ticks: L10 −0.1, L11 −0.2, L12 −0.4, L13 −0.6, L14 −1, L15 −1.8, L16 −2.8, L17 −4, L18 −6, L19 −8, L20 −12 XP (× 0.5 with Great Memory, none with Perfect Memory) | VERIFIED | `SkillRecord.Interval`; `Pawn_SkillTracker.cs` 99–115 |
| 30 | Crafted quality = clamp(int(GaussianAsymmetric(center(skill), 0.6, 0.8)), 0, 5); a masterwork result is kept with p 0.5, otherwise re-rolled with upper width 0.95; inspiration +2, Ideology role offset; center L0 0.7 … L10 3.1 … L20 4.2 | VERIFIED | `RimWorld/QualityUtility.cs` 152–258 |
| 31 | Crafted market value = Σ ingredient values + work × 0.0036 (divided by product count); quality factors 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2.5 / 5 with capped gains | VERIFIED | `RimWorld/StatWorker_MarketValue.cs` 10, 47–90; `Stats_Basics_General.xml` |
| 32 | Player sell = MV × 0.6 × trader factor × sell factor × (1 − difficulty loss) × (1 + negotiator + settlement + bonuses); buy = MV × 1.4 × factors × (1 + loss) × (1 − negotiator − settlement); sell clamped to ≤ buy | VERIFIED | `RimWorld/TradeUtility.cs` 256–283; `Tradeable.cs` 264–293 |
| 33 | Negotiator gain = TradePriceImprovement = 0.015 × Social level × talking/hearing capacities, max 0.395 | VERIFIED | `Stats_Pawns_Social.xml` |
| 34 | Research per tick = ResearchSpeed × bench factor × 0.00825 × difficulty factor / cost factor; ResearchSpeed = (0.08 + 0.115 × Intellectual) × WorkSpeedGlobal × capacities; cost factor = 1 + 0.5 × (min(project tech, Industrial) − colony tech) when positive | VERIFIED | `RimWorld/ResearchManager.cs` 38, 310–320; `Verse/ResearchProjectDef.cs` 486–499; `RimWorld/JobDriver_Research.cs` 30–45 |

## Model results (`simulations/rimworld_model.py`)
- **Tick budget.** With 8 ms of rendering per frame, 2 ms per tick holds ×6 at 35 FPS; 4 ms per tick gives only 214 ticks/s at ×6 or ×15. Speed degrades smoothly instead of stuttering, because unspent time is dropped (§1).
- **Bucketing.** 5 000 rare tickers cost about 20 `TickRare` calls per tick (range 9–33 with random hashes) instead of a 5 000-call spike every 250th tick (§2).
- **A\* strength.** At strength 1.75, path cost is ×1.063 on average (worst ×1.155) while only 14 % of the nodes are expanded (§3).
- **Needs.**
  - A human eats 1.6 nutrition per day.
  - A full night's rest is about 10.5 h.
  - Mood falls at most 8 % per hour, so a −20 thought needs 2.5 h to land fully (§5).
- **Breaks.** After 24 h below the major threshold, a major break has happened with 70 % probability; after 6 h, 24 % (§6).
- **Threat points (Rough, day 60).** 100 000 wealth with 6 colonists gives about 800 points; 400 000 with 10 gives 3 800; 1 000 000 with 15 gives 7 200 (§8).
- **Big threats per 60-day year** with the exact scheduler: Cassandra 8.5 (minimum gap 1.9 days), Phoebe 3.8 (minimum 8.2), Randy about 8.4 with no spacing (§10).
- **Hit chance.**
  - Assault rifle at 15 cells: 29 / 44 / 59 % at Shooting 5 / 10 / 20.
  - Sniper rifle at 30 cells: 16 / 36 / 66 % (§12).
- **Quality and skill decay.**
  - At Crafting 10, 0.4 % of crafts are masterwork; at 20, 9.5 %. Legendary needs inspiration or a role.
  - Decay at L20 is 3 600 XP per day, about 14 h of research-rate practice to hold the level (§15).
- **Trade** (§16).
  - The round-trip loss is 57 % at Social 0 and 20 % at Social 20.
  - Even at the 0.395 cap, buy (×0.847) stays above sell (×0.837), so trading alone cannot make money.
- **Research.** Electricity (1 600) takes 134 h at a simple bench at Intellectual 6, and 43 h at a hi-tech bench at 15. Tribal colonies pay ×2 for Industrial and later projects (§16).
