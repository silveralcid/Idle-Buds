> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/kadomon/steam-2026-11-25/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Kadomon: Hyper Auto Battlers — Reverse-Engineering Research Workspace
Target: `../../Kadomon/` (Unity 2020.3 Mono client, Dino Rocket). Produced 2026-11-25. Start with **`FINAL_REPORT.md`**.
| Folder | Contents |
|---|---|
| `architecture/` | Engine, ScriptableObject/Odin content model, tick simulation, managers, persistence |
| `gameplay/` | Core loop, stats, battle resolution, status effects, effect VM, in-run progression |
| `progression/`, `economy/` | EXP/evolution, enemy scaling; gold/tickets/EXP/morale |
| `mathematics/` | All formulas with source references; stat budgets; type-edge value; economy arithmetic |
| `content/`, `user-experience/`, `development-lessons/` | Content inventory; UX reading; adopt/avoid table |
| `simulations/` | `kadomon_model.py` (+ output) |
| `prototypes/` | `kadomon_tick_battler.html` — 4v4 tick battler using the real stat lines, type chart and formulas |
| `experiments/` | Methodology log |
| `evidence/decompiled_src/` | Full C# decompilation of `Assembly-CSharp.dll` (732 files) |
| `evidence/assets/` | Every MonoBehaviour asset as JSON by class (9 539 objects, 362 classes) + `_summary.json`, `_failed.json` |
| `evidence/data/` | Resolved dataset: `kadomon.json`, `attacks.json`, `passives.json`, `type_chart.json`, items/status/field/map/rest/event JSON, `singletons.json` (UnitDictionary tuning), `enums.json` |
| `tools/` | `dump_scriptables.py` (UnityPy + generated type trees), `odin_binary.py` (Odin binary reader), `build_dataset.py` |
Reproduce: `python3 tools/dump_scriptables.py "<Game>_Data" 2020.3.25f1 evidence/assets && python3 tools/build_dataset.py evidence/assets evidence/decompiled_src evidence/data && (cd simulations && python3 -I kadomon_model.py)`.
