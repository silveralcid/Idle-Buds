> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/siralim-ultimate/2.0-gms-2024.14/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Siralim Ultimate — Reverse-Engineering Research Workspace
Target: `E:\AI Agent\IdleBuds-ReverseEngineer\Siralim Ultimate` (Steam build of the 2.0 branch, GameMaker 2024.14 runtime, YYC native build). Produced 2026-11-25. Start with **`FINAL_REPORT.md`**.
| Folder | Contents |
|---|---|
| `architecture/` | GameMaker YYC build, data.win layout, how content is compiled into the exe, script/object inventory |
| `gameplay/` | Core loop, creatures/traits/spells, battle, realms, fusion, specializations |
| `progression/`, `economy/` | Ladders (creature/god/fame/nether/perk) and currencies/sinks |
| `mathematics/` | Formulas with evidence tiers: stats, XP, enemy scaling, crit/dodge, status damage |
| `content/`, `user-experience/`, `development-lessons/` | Inventory; UX reading; adopt/avoid |
| `simulations/` | `siralim_model.py` (+ output): stat curves, XP, realm scaling, crit/dodge, roster stats |
| `prototypes/` | `siralim_calculator.html` — stat/XP/realm/crit calculator over the 1 447 decoded creature rows |
| `experiments/` | Methodology log |
| `evidence/datawin/` | `datawin_meta.json` (GEN8, chunk sizes, names of 5 785 script entries, 1 160 objects, 79 rooms, 12 801 sprites, 1 598 sounds, 6 extensions), `datawin_strings.txt` (64 053 strings) |
| `evidence/exe/` | `script_map.json` (8 831 named native functions), `string_consts.json` (55 327 literals), `var_slots.json` (16 170 variable/builtin slots), `db_decoded/databases.json` (32 database scripts decoded to rows) |
| `evidence/decompiled/` | `c/` Ghidra output for 89 formula scripts, `gml/` the lifted pseudo-GML for 91 |
| `evidence/data/` | `creatures.{json,csv}` (1 447), `traits.json` (2 181), `spells.json` (747), `perks.json` (661), `materials.json` (1 862), skins/quests/accessories/runes/cooking, `localization_en.json` |
| `tools/` | `build_dataset.py`; the reusable GameMaker-YYC toolkit lives in `research/tools/gamemaker-yyc/` |
Reproduce: `research/tools/gamemaker-yyc/README.md` (pipeline), then `python3 tools/build_dataset.py "<game dir>" evidence evidence/data && (cd simulations && python3 -I siralim_model.py)`.
