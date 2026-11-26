> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/palworld/1.0.5.102999/experiments/EXPERIMENT_LOG.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Experiment & Methodology Log — Palworld
| # | Goal | Method | Result | Tier |
|---|---|---|---|---|
| E1 | Identify stack | exe strings, pak footer parser (`pak_index.py`), config export | UE 5.1, pak v11 Oodle unencrypted, ProjectVersion 1.0.5.102999 | VERIFIED |
| E2 | Reader toolchain | CUE4Parse (.NET 10) console app; Epic's Linux Oodle needs glibc 2.38 → built an Oodle-ABI shim on the open-source `ooz` decoder | reads all 191 962 entries | VERIFIED |
| E3 | Mappings | tried community usmaps: 0.6.6 fails (struct drift), PalworldModding `UsefulFiles` Sept-2026 parses 753/753 character rows | correct mappings for 1.0.5 | VERIFIED |
| E4 | Data export | `PalExport datatables` for `Pal/DataTable` + `L10N/en`, `ini Pal/Config`, DataAssets, sphere BP | 503 tables, 197 731 rows, 0 failures | VERIFIED |
| E5 | Class model | `usmap_dump.py` | 11 964 structs, 2 131 enums (3 041 `Pal*`) | VERIFIED |
| E6 | Datasets | `tools/build_dataset.py` | pals/skills/passives/items/recipes/tech/exp/spawns/breeding JSON+CSV | VERIFIED |
| E7 | Formulas | tables + class fields + community datamines (stats, breeding, capture) | FORMULAS.md with tiers | mixed |
| E8 | Quant | `simulations/palworld_model.py` | breeding reachability/ties, stat curves, EXP, spawn bands | computed |
| E9 | Independent review | separate agent recomputed every number from the staged JSON/INI and re-ran E8 | 12 duplicate dex rows found (300 → 288), condenser/relic/EXP-ratio/tech-cost/preset corrections; see FINAL_REPORT §16 | corrected |
Not done: running the game or UE4SS (would modify the install); C++ disassembly of the 161 MB shipping exe (capture/damage constants); Blueprint bytecode reading.
