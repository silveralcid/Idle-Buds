> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/palworld/1.0.5.102999/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Palworld — Reverse-Engineering Research Workspace
Target: `G:\Program Files (x86)\Steam\steamapps\common\Palworld` (UE 5.1, v1.0.5.102999). Produced 2026-11-25. Start with **`FINAL_REPORT.md`**.
| Folder | Contents |
|---|---|
| `architecture/` | Engine/build, pak layout, data-driven content model, runtime class structure |
| `gameplay/` | Core loop, Pals, combat, capture, progression, breeding, world systems |
| `progression/`, `economy/` | Ladders and currencies |
| `mathematics/` | Formulas with tiers; stat growth; breeding structure; EXP economics |
| `content/`, `user-experience/`, `development-lessons/` | Inventory; UX reading; adopt/avoid |
| `simulations/` | `palworld_model.py` (+ output): breeding resolver, stat curves, EXP, spawn bands |
| `prototypes/` | `palworld_breeding_stats.html` — breeding resolver + stat calculator on the real tables |
| `experiments/` | Methodology log |
| `evidence/datatables/` | 503 DataTables as JSON (`Pal/DataTable/**`, `L10N/en/**`) |
| `evidence/assets/` | `DA_StaticItemDataAsset` (2 455 item objects), breeding item data, `BP_PalSphere` |
| `evidence/data/` | Resolved datasets: `pals.{json,csv}`, `active_skills`, `passive_skills`, `items`, `recipes`, `technology`, `exp_table`, `wild_spawns`, `breeding_unique`, `world_presets` |
| `evidence/classmodel/` | `palworld_classes.{md,json}` — 11 964 structs/classes, 2 131 enums from the mappings |
| `evidence/config/` | `Pal/Config/*.ini` incl. `DefaultPalWorldSettings.ini`, `DefaultGame.ini` |
| `evidence/mappings/` | usmap files tried (Sept-2026 one matches); `pak_filelist.txt` |
| `tools/` | `build_dataset.py`; the reusable exporter lives in `research/tools/ue-pak-export/` |
Reproduce: see `research/tools/ue-pak-export/README.md`, then `python3 tools/build_dataset.py evidence/datatables evidence/data && (cd simulations && python3 -I palworld_model.py)`.
