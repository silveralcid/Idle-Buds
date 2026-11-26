> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/rimworld/1.6.4871/architecture/ARCHITECTURE.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Architecture

Build examined: RimWorld 1.6.4871 rev590 (`Version.txt`), Steam app 294100, Windows x64. Engine Unity 2022.3.35f1 (`globalgamemanagers`) with the Mono scripting backend (`MonoBleedingEdge/`, managed DLLs in `RimWorldWin64_Data/Managed/`). `Assembly-CSharp.dll` is 15 777 280 bytes, SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Expansions installed: Royalty, Ideology, Biotech, Anomaly, Odyssey. The game was not run.

## 1. Layers
| Layer | What | Evidence |
|---|---|---|
| Unity player | rendering, input, audio, asset bundles (textures, sounds, shaders in `resources.assets`, `sharedassets*`); IMGUI for all UI | `RimWorldWin64_Data/` |
| `Verse` | Ludeon's engine-agnostic framework: things, maps, grids, defs, ticks, AI core (`Verse.AI`), lords (`Verse.AI.Group`), save system, sound, grammar, noise, profiling, Steam | 1 747 + 278 + 129 decompiled files; `Verse.Glow`, `Verse.Grammar`, `Verse.Noise`, `Verse.Profile`, `Verse.Sound`, `Verse.Steam` |
| `RimWorld` | game rules and content code: storyteller, incidents, factions, needs, thoughts, work givers, job drivers, buildings, comps, quests (`RimWorld.QuestGen`), world map (`RimWorld.Planet`), base and sketch generators | 5 913 + 302 + 381 … files |
| Defs (XML) | all content and most tuning: 250 def types, 13 159 defs after inheritance across Core + 5 DLCs | `Data/<package>/Defs`, `evidence/data/defs_counts.json` |
| Bundled libraries | DelaunatorSharp (triangulation), Gilzoide.ManagedJobs (managed jobs on Unity's job system), Ionic.Zlib, KTrie, NVorbis, RuntimeAudioClipLoader, a Unity.Collections subset; `LudeonTK` (dev tools) | decompiled namespace folders |
| Native Burst code | AOT-compiled jobs (pathfinding, path grids, drawing, glow) | `Plugins/x86_64/lib_burst_generated.dll` |

The split between `Verse` and `RimWorld` is a framework/game separation. The framework knows about things, maps and jobs but not colonists or storytellers, though the namespaces reference each other in practice.

## 2. Content as data: the def system
- **Defs** are C# classes (`ThingDef`, `PawnKindDef`, `JobDef`, `IncidentDef`, `StorytellerDef` …) whose public fields are filled from XML by `DirectXmlToObject`. Behaviour is attached by naming classes in XML: `thingClass`, `driverClass`, `workerClass`, comp `compClass`, `Class="…"` on list items.
- **Inheritance.** XML nodes with `Name` and `Abstract="True"` are templates, and children merge into them through `ParentName` before parsing. For example, `ResearchSpeed` inherits Intellectual skill factors from `IntellectualSkillBase`. `tools/defs_lib.py` re-implements this merge to produce the datasets.
- **Optional content.** `MayRequire="Ludeon.RimWorld.Biotech"` on an element drops it when that package is absent, which is how one def file serves every DLC combination.
- **Loading.** `LoadedModManager` builds the mod list (official packages first). It loads XML in parallel, applies patch operations (`PatchOperation` XPath edits, the modding hook), resolves inheritance, creates defs, resolves cross-references by name, fills the `[DefOf]` static classes by reflection and runs `ResolveReferences` per def.
- **Scale** (top types): ThingDef 1 811, SoundDef 1 231, ThoughtDef 923, BackstoryDef 845, RulePackDef 339, HediffDef 324, JobDef 320, FleckDef 316, EffecterDef 283, PawnKindDef 282, StatDef 244, PreceptDef 215, RecipeDef 190, ResearchProjectDef 164, plus 61 think trees.

## 3. Runtime object model
- **Game → World → Maps.** `Game` holds the world, the maps, the tick manager, the storyteller, research, quests, factions and history.
  - The **world** is a sphere of tiles on planet layers (surface and, with Odyssey, orbit) with world objects: settlements, caravans, sites.
  - A **map** is a square grid, typically 250 × 250. It carries cell grids (things, terrain, roofs, pathing cost, regions, fog, snow, temperature rooms, glow, gas, pollution) and per-map managers: listers, reservations, designations, zones, areas, lords, power nets, weather, wealth watcher, path finder.
- **Things.** `Thing` → `ThingWithComps` → `Pawn` / `Building` / items.
  - A `ThingDef` describes everything about a thing. Variable behaviour comes from **comps**: `CompProperties` in the def creates a `ThingComp` on the instance, such as refuelable, power, breakdown, rottable, art or explosive. This is composition over inheritance and the main extension point for content and mods.
  - Pawns own trackers: health, needs, mind state, job tracker, path follower, skills, story, relations, work settings, ideology, genes, psychic entropy …
- **Stats.** Every number a player sees is a `StatDef` evaluated by a `StatWorker`. A stat starts from the def's base value and applies offsets and factors from equipment, hediffs, traits, capacities, skills (`skillNeedFactors`) and `StatPart`s (glow, quality, age, slave …). Results are cached (`RimWorld/StatWorker.cs` 15–64).

## 4. Simulation and AI
Covered in depth in `performance/PERFORMANCE_ARCHITECTURE.md` (loop, budget, tick lists, interval ticking, jobs and threads, spatial structures, determinism) and `ai/AI_ARCHITECTURE.md` (think trees, work, jobs, reservations, pathfinding, minds, lords, storyteller, shooting).
- **Frame.** `Root_Play.Update` → `Game.UpdatePlay`: tick manager (simulation ticks for this frame), letters, world update, map updates (rebuilds and drawing), game info, components, signals, texture atlases.
- **Tick.** Map pre-ticks (including pathfinding), thing tick lists, world-level systems (storyteller, quests, world objects), map post-ticks (spawners, power, lords …), then history, components and autosave.

## 5. Persistence
- **Format.** Saves are plain XML (`.rws`) written by `Scribe` through `XmlWriter` (`Verse/ScribeSaver.cs` 49). Every saveable class implements `ExposeData()` and calls `Scribe_Values`, `Scribe_Deep`, `Scribe_References`, `Scribe_Collections` and `Scribe_Defs` on its fields; the same method handles save and load.
- **Load passes.** `LoadSaveMode` runs Saving, then LoadingVars, ResolvingCrossRefs and PostLoadInit. References between objects are stored as load IDs and resolved in the second pass, and defs are stored by name.
- **Safety.** `SafeSaver` writes `<name>.new`, moves the old file to `.old`, then moves the new one into place.
- **Autosave** every `Prefs.AutosaveIntervalDays` × 60 000 ticks, at most daily in permadeath. It runs as a synchronous long event.
- **What is not saved.** The global `Rand` state. Systems that must be stable across a reload derive their randomness from saved seeds (world `persistentRandomValue`, a map's constant seed, `loadID`s).

## 6. Mod surface (VERIFIED from structure; no mod was loaded)
- XML defs and patch operations.
- Assemblies in a mod's `Assemblies/` folder, loaded by `ModAssemblyHandler`.
- Comps, workers, think nodes and job drivers named from XML.
- `Source/` in the install: 43 commented C# files (job drivers, toils, a few comps, buildings and incident workers) shipped as modding reference. They were read for orientation only; the decompiled 1.6 assembly is the reference here, because the shipped copies differ in places (for example `Building_Door.cs` is 589 lines shipped against 621 decompiled).
- No Harmony in `Managed/`: runtime patching comes from mods themselves.
- One third-party mod (`Mods/Rojas Decorations`) is installed and was not examined.

## 7. Online, DRM and protection
None relevant. The game is single-player and offline: `Verse.Steam` provides Workshop and achievements through `steam_api64.dll`, and no network gameplay code was found in the areas read. The assembly is not obfuscated, so ilspycmd recovers readable C#. The install, saves and Steam integration were not touched.
