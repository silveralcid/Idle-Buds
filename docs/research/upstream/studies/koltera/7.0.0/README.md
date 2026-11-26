> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera ("Kolterra 1") — Reverse-Engineering Research Workspace

Target: `../../Kolterra/` (Electron build of **Koltera** v7.0.0 by King Otter Games, Steam 2233750). Produced 2026-11-25.

Start with **`FINAL_REPORT.md`**. Supporting material:

| Folder | Contents |
|---|---|
| `architecture/` | Engine, process model, tick loop, persistence, UI shell, bugs |
| `gameplay/` | All 13 systems with exact rules; design & psychology analysis |
| `progression/`, `economy/` | Curves, gates, currencies, sinks, bottlenecks |
| `mathematics/` | Every formula + validation; `charts/` |
| `content/`, `user-experience/` | Data/asset architecture; UX review |
| `development-lessons/` | Per-system adopt/avoid table and reusable principles |
| `simulations/` | Python port of the formulas (`koltera_model.py`), Monte Carlo (`progression_sim.py`), `charts.py` |
| `prototypes/` | `collection_idle_prototype.html` — original single-file demo of the best ideas |
| `experiments/` | Methodology log |
| `evidence/asar_extract/` | Unpacked `app.asar` (untouched original remains in `../../Kolterra/`) |
| `evidence/source_reconstructed/` | Original source recovered from the shipped source map (59 files) + 7 data tables |

Reproduce: `cd simulations && python3 -I koltera_model.py && python3 -I progression_sim.py && python3 -I charts.py` (needs matplotlib for charts only).
