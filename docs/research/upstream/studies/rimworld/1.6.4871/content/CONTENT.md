> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/rimworld/1.6.4871/content/CONTENT.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Content inventory and data architecture

All content is XML under `Data/<package>/Defs` (Core, Royalty, Ideology, Biotech, Anomaly, Odyssey) plus textures, sounds and shaders in Unity asset files. Defs were read in place; no assets were extracted. Extraction is by `tools/build_dataset.py` with the inheritance merge in `tools/defs_lib.py`, producing `evidence/data/`.

## 1. Scale
- **Def types and defs.** 250 def types, 13 159 defs after inheritance (`defs_counts.json`, `summary.json`).
- **Largest types.** ThingDef 1 811, SoundDef 1 231, ThoughtDef 923, BackstoryDef 845, RulePackDef 339, HediffDef 324, JobDef 320, FleckDef 316, EffecterDef 283, PawnKindDef 282, StatDef 244, PreceptDef 215, RecipeDef 190, PrefabDef 176, HistoryEventDef 172, GeneDef 169, GenStepDef 167, ResearchProjectDef 164.
- **ThingDefs by category.** Buildings 588, items 537, motes 218, pawns (races) 158, plants 107, projectiles 76, ethereal 71, filth 44.
- **ThingDefs by package.** Core 800, Odyssey 336, Biotech 223, Anomaly 204, Ideology 127, Royalty 121.
- **Research by package.** Core 77, Anomaly 42, Royalty 19, Biotech 14, Odyssey 9, Ideology 3. Core totals 119 400 points.
- **Incidents (131).** Misc 50, ThreatBig 33, GiveQuest 12, Special 11, DiseaseHuman 11, ThreatSmall 4, FactionArrival 4 and others.
- **Behaviour definitions.** 61 think trees, 108 duties, 33 mental breaks, 46 mental states, 24 needs, 51 traits, 23 work types, 153 work givers, 11 raid strategies, 7 difficulty presets, 109 storyteller comp entries.

## 2. Datasets (`evidence/data/`)
| File | Rows | Key columns |
|---|---|---|
| `thing_defs.csv` | 1 811 | category, class, ticker type, tech level, market value, mass, HP, work to make or build, beauty, package |
| `ranged_weapons.csv` | 86 | verb class, range, warmup, burst count and spacing, projectile, damage and damage type, accuracy at touch, short, medium and long range, cooldown, market value |
| `races.csv` | 158 | intelligence, body size, hunger rate, health scale, life expectancy, move speed, food type, think trees |
| `pawn_kinds.csv` | 282 | race, combat power, default faction, fighter flag |
| `jobs.csv`, `work_types.csv`, `work_givers.csv`, `duties.csv` | 320 / 23 / 153 / 108 | driver class, interruptibility; work type, priority in type, giver class, scan mode, emergency; duty think nodes |
| `mental_breaks.csv`, `mental_states.csv`, `needs.csv`, `thoughts.csv`, `traits.csv`, `hediffs.csv` | 33 / 46 / 24 / 923 / 51 / 324 | break intensity, commonality, mental state, worker, required trait; thought class, duration, stack limit, stages with mood or opinion; trait commonality; hediff class, lethal severity, tendable |
| `incidents.csv`, `raid_strategies.csv`, `storyteller_comps.csv`, `difficulties.csv` | 131 / 11 / 109 / 7 | incident category, base chance, population effect, refire days, minimum threat points, earliest day; strategy arrival modes and points-weight curve; storyteller comp class and parameters; difficulty factors |
| `stats.csv`, `research.csv` | 244 / 164 | category, base value, limits, cacheable, worker; cost, tech level, prerequisites |
| `evidence/thinktrees/*.md` | 61 | indented outlines of every think tree, with node classes, tags and parameters |

## 3. Data architecture observations
- **Data and code split along "what" and "how".** Numbers, curves, lists and names are XML; behaviour is a class named from XML (`workerClass`, `thingClass`, `driverClass`, comp classes). Balance is mostly a data edit; new mechanics are new classes plus defs.
- **Inheritance keeps the volume manageable.** Abstract parents carry shared values (for example skill factors for all intellectual stats; base weapon and apparel templates), so most concrete defs list only differences.
- **Curves everywhere.** `SimpleCurve` points in XML express nonlinear tuning (threat points per wealth, adaptation factor, accuracy by skill, hit factors by distance), so designers can tune shape without code.
- **DLCs as layered data.** `MayRequire` and per-package folders let one ruleset serve all combinations. The storyteller comp index shifts with the DLCs present (20 with all, 7 Core only) because comps are merged in package order; the model selects the right index for the exact schedule.
- **Text as data.** `RulePackDef`s (339) drive the grammar system (`Verse.Grammar`) that writes names, art descriptions, tales and letters.
