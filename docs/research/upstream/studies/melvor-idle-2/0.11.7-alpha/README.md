> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle-2/0.11.7-alpha/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Melvor Idle 2 — Reverse-Engineering Research Workspace

Target: `../../Melvor 2/` (Godot 4.7.2 C#/.NET 10 build of Melvor Idle 2 **0.11.7 alpha**, Games By Malcs). Produced 2026-11-26. Start with **`FINAL_REPORT.md`**.

| Folder | Contents |
|---|---|
| `architecture/` | Build, embedded PCK, ECS-style entities, stat graph, tick, offline/sleep, saves |
| `gameplay/` | Systems and what changed from Melvor Idle 1; design notes |
| `progression/`, `economy/` | Curves, ranks, gates; currencies and sinks |
| `mathematics/` | 18 formulas with source paths, model results |
| `content/`, `user-experience/` | 137-type data package and its schema; UX notes |
| `development-lessons/` | Adopt / avoid, principles |
| `simulations/` | `m2_model.py` and its output |
| `prototypes/` | `m2_mechanics.html` (original: mining break-or-progress distribution, tree health, thieving, hit chance/resistance) |
| `experiments/` | Method log |
| `tools/` | `build_dataset.py` (MelvorBase.json → CSV); pack tooling lives in `../tools/godot-pck/` |
| `evidence/decompiled/` | ilspycmd output without the 618 data-editor files (listed in `DataEditor_FILES.txt`); obfuscated online namespaces stubbed (`REDACTED_ONLINE_NAMESPACES.txt`) |
| `evidence/pck/` | `pck_index.json`, `Data/Packages/MelvorBase.json`, `Locale/en_GB.po`, `Settings/*.json`, `project.binary` + `project_settings.json`, runtime config |
| `evidence/data/` | 32 CSVs, `object_counts.json` |

Reproduce: `(cd tools && python3 -I build_dataset.py) && (cd simulations && python3 -I m2_model.py)`.
