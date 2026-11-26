> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/siralim-ultimate/2.0-gms-2024.14/experiments/EXPERIMENT_LOG.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Experiment log
| # | Step | Tool | Result | Tier |
|---|---|---|---|---|
| E1 | Engine id | header + chunk list | GameMaker 2024.14, YYC (no CODE chunk), 6 extensions | VERIFIED |
| E2 | data.win | `gm_datawin.py` | GEN8, 5 785 script entries, 1 160 objects, 79 rooms, 12 801 sprites, 1 598 sounds, 64 053 strings | VERIFIED |
| E3 | Script map | `yyc_script_map.py` (prologue lea + .pdata) | 8 831 named functions (85 % of 10 385 names) | VERIFIED |
| E4 | String & variable tables | `yyc_string_consts.py`, `yyc_var_slots.py` | 55 327 literals, 16 170 var/builtin slots | VERIFIED |
| E5 | Databases | `yyc_db_decode.py` | 32 `scr_Database*` scripts → rows; creature field map confirmed against the Feb-2023 community CSV (1 201 rows; 4=health 0=attack 5=int 3=def 12=speed 1=sprite 10=trait) | VERIFIED |
| E6 | Ghidra | import 41 s, `yyc_decompile.py` + helper/var labels, `yyc_lift.py` | 89 formula scripts decompiled, 91 lifted to pseudo-GML | VERIFIED/STRONG |
| E7 | Formulas | reading the lifted/raw C | stat, XP, level, enemy level, gene, crit, dodge, god XP, max level | see FORMULAS |
| E8 | Quant | `simulations/siralim_model.py` | curves and roster stats | computed |
| E9 | Independent review | separate agent | decoder store bug (rows 2001–2202 shifted), max-level direction, dodge base, mode multipliers, stat-bonus order; see FINAL_REPORT §16 | corrected |
Not done: emulation of `scr_Database*` (not needed), decompiling the megabyte hooks (`bc_EventDamage`, `bc_SpellDamage`, class-advantage multiplier), drop tables inside `inv_Loot`, exact `diminishing_returns`; no game launch, no save edits.
Blind spots fixed on the way: Ghidra headless silently drops stores without `grabFromProgram` (toolkit-wide fix); VM out-of-memory on a numpy sliding window over 143 MB; a 3 GB JSON from recursive tuple args in the first DB decoder.
