> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/rimworld/1.6.4871/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# RimWorld — Reverse-Engineering Research Workspace

Target: `../../RimWorld/` (1.6.4871 rev590, Steam app 294100, Unity 2022.3.35f1 Mono, Core + five DLCs). Produced 2026-11-26 with an emphasis on simulation, performance and game AI. Start with **`FINAL_REPORT.md`**, then `performance/` and `ai/`. Nothing was run and nothing in the install was changed.

| Folder | Contents |
|---|---|
| `performance/` | Tick loop and frame budget, bucketed tick lists, camera-rate interval ticking, async Burst pathfinding, regions and reachability, caches, GC, saves, scaling hot spots, determinism |
| `ai/` | Think trees and the needs-versus-work sorter, work givers and scanners, job drivers and toils, reservations, A\*, needs, mood and breaks, social, lords and raids, storyteller (threat points, adaptation, exact schedule, Randy), shooting |
| `architecture/` | Layers (`Verse`, `RimWorld`, defs, Unity), def system, object model, persistence, mod surface |
| `gameplay/`, `progression/`, `economy/` | Systems map and design psychology; research, skills, quality, wealth versus threat; value, trade, wealth brake |
| `mathematics/` | 34 formulas with tiers and file and line, plus model results |
| `content/`, `user-experience/` | Def inventory and datasets; UX review |
| `development-lessons/` | Adopt, avoid and principles |
| `simulations/` | `rimworld_model.py` and its output (16 sections) |
| `prototypes/` | `rimworld_workbench.html` (original): tick budget, A\* strength visualiser, threat points, exact big-threat schedule, mental-break risk, hit chance, job choice |
| `experiments/` | Method log; `rngcheck/` (C# hash check); `protocheck/` (node harness for the prototype) |
| `tools/` | `defs_lib.py` (XML inheritance merge), `defs_survey.py`, `build_dataset.py`, `build_prototype.py` + `prototype_template.html` |
| `evidence/decompiled/` | ilspycmd output of `Assembly-CSharp.dll` (9 217 files) |
| `evidence/data/`, `evidence/thinktrees/` | 20 CSVs, `defs_counts.json`, `summary.json`; 61 think-tree outlines |

Reproduce:
1. `ilspycmd -p -r <Managed> -o decomp <Managed>/Assembly-CSharp.dll`
2. `python3 -I tools/build_dataset.py <RimWorld/Data> evidence/data`
3. `(cd tools && python3 -I build_prototype.py)`
4. `(cd simulations && python3 -I rimworld_model.py > rimworld_model_output.txt)`
5. `node experiments/protocheck/run.js prototypes/rimworld_workbench.html`
6. `dotnet run --project experiments/rngcheck`
