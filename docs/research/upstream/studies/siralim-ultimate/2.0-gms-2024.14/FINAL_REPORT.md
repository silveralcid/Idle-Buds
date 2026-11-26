> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/siralim-ultimate/2.0-gms-2024.14/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Siralim Ultimate — Final Report
Build: Steam Windows build of the 2.0 branch (localized, GameMaker runtime 2024.1400.0.879, YYC native), folder `E:\AI Agent\IdleBuds-ReverseEngineer\Siralim Ultimate`. Pass date 2026-11-25. No game launch, no save or install modification; the one external dataset (rovermicrover/siralim-ultimate-api, Feb 2023) was used only to confirm the creature field order.

## 1. Executive summary
Siralim Ultimate is a GameMaker **YYC** build: `data.win` (904 MB) holds only assets and names, every GML script is native code inside the 166 MB exe. That is the worst case for GameMaker tooling (UndertaleModTool cannot help), but YYC leaks enough structure to recover almost everything statically: function names (8 831 mapped), every string literal (55 327), every variable/builtin name (16 170), and the content itself, which the game stores as **code** (`scr_DatabaseCreature1–4`, `…Passives`, `…SpellGems`, `…Perks`, …). A purpose-built decoder (`research/tools/gamemaker-yyc/`) turned those into tables: **1 447 creatures** (5 classes, 166 races, five base stats summing to 99–150, one innate trait each; 1 446 resolve to localized trait text), **2 181 trait rows** (2 157 with localized text, 23 keys missing from the CSV, 1 empty), **747 spell gems**, **661 perks**, **1 862 materials**, 834 skins, 354 quests; text comes from 24 shipped localization CSVs in 16 languages.
Formulas were read from Ghidra decompilation after building a lifter for YYC's RValue calling convention: stat(L) = ceil(base + base·rate·(L−1)) with personality rate 0.2/0.3/0.4 and fusion base = round((a+b)/2); XP(L) = 20·L² and level = floor(√(xp/20)); enemy level = max(depth, ceil(depth²·rate·(1+depth/1000))) with rate = (0.03 + difficulty step)·mode; enemy gene strength = max(0, round((level−50)/10)); crit = 5 %·max(1, spdA/spdD) (floor 5 %); dodge = 5 %, or 5 %·spdD/spdA capped at 30 % when the defender is faster (floor 5 %); god favour 500+50(L−1); creature level cap 50 + 10·gene strength (nether creatures uncapped) — all VERIFIED. Trait-level modifiers and status-tick constants are STRONG INFERENCE (lifted pseudo-GML), the class-advantage multiplier and loot tables remain inside megabyte hook functions (UNKNOWN).
Design reading: stats are linear in level while depth is quadratic in enemy level, so the "infinite" depth is a build puzzle gated by gene strength (which also sets the level cap), not a grind; identity lives in ~2 150 hand-coded traits (the three big battle hooks `bc_CreatureStartOfTurn`, `bc_EventDamage`, `bc_CreatureCast` are 1.7–3.9 MB each), which is the game's strength and its maintenance risk.

## 2–13. Sections → `architecture/`, `gameplay/`, `progression/`, `economy/`, `mathematics/`, `content/`, `user-experience/`, `development-lessons/`, `prototypes/`, `experiments/`, `evidence/`.

## 14. Remaining unknowns
| Item | Status |
|---|---|
| Core damage formula (attack vs defense, class advantage, spell power) | UNKNOWN — inside `bc_EventDamage` (3.1 MB) / `bc_SpellDamage` (706 KB); exceeds the decompiler budget; needs slicing by constant search |
| Loot/drop tables, shop prices | UNKNOWN — inside `inv_Loot`, `scr_GodShopSetup` (1.8 MB); decodable with the DB decoder once the statement shape is modelled |
| `diminishing_returns` exact divisor | HYPOTHESIS |
| Which `global.mode` values are Calm/Royal/etc. | STRONG INFERENCE (0.65× / 3×) |
| Spell-gem flag semantics (30 booleans), `SpellGems5` layout, perk cost scaling | fields VERIFIED, meaning partial |
| 15 % of script names unmapped (no prologue lea found) | tooling gap |

## 15. Completion checklist
- [x] Engine identified (GameMaker 2024.14, YYC) with evidence
- [x] Content extracted (databases decoded, localization parsed, data.win inventory)
- [x] Formulas with tiers (13 entries) and a simulation reproducing them
- [x] Prototype (`prototypes/siralim_calculator.html`)
- [x] Reusable toolkit saved (`research/tools/gamemaker-yyc/`, README with pipeline and gotchas)
- [x] Evidence folder (decompiled C + lifted GML, decoded DB JSON, maps)
- [ ] Core damage formula (see §14)
- [x] Independent review (§16, corrections applied)

## 16. Independent review
A separate reviewer (no access to this pass's notes) recomputed every count from the staged JSON/CSV, cross-checked the creature table against the Feb-2023 community dataset, read nine decompiled `.c` files line by line against the formula claims, and re-ran `siralim_model.py` (byte-identical output). Confirmed: 1 447 creatures and every stat/class/race figure, perk and material distributions, spell tag counts, the data.win inventory, the function-size claims, and the formulas for XP (20·L²), level (floor √(xp/20)), god favour, personality rates, enemy-level structure and constants, gene strength, and the crit base/speed scaling. Field mapping: 1 198 of 1 201 community names matched with zero race/class disagreements; 16 creatures differ in some stat values (post-2023 balance changes) and 1 172 battle-sprite ids match.

Corrections applied after the review:
- **Decoder bug**: the last trait block (rows 2001–2202) and the `SpellGems5` block were stored one assignment late because the array-element store's destination comes back in `rax`, not a stack slot; `yyc_db_decode.py` now treats any `RV_assign` after two `ArrCOW` calls as the store. Traits: 2 157 localized (23 keys absent from the CSV, 1 empty) instead of the "2 130 / 226 placeholders" previously claimed; 172 creature trait names that were wrong are now resolved (1 of 1 447 remains unresolved).
- **Max level** read backwards: ordinary creatures are capped at 50 + 10·gene strength; nether creatures (and `special_flag == 100`) are the uncapped ones.
- **Dodge**: base is 5 % for everyone (0 only for unavoidable attack kind 17), scaled by speed only when the defender is faster, capped at 30 (60 in one branch) and floored at 5 % after modifiers; crit is likewise floored at 5 % (10 % with a card set). Simulation, prototype and FORMULAS updated.
- **Enemy level**: mode multipliers are `global.mode == 0` → ×0.65 and `== 2` → ×3 (not 1/2); the difficulty step table has ten entries indexed by `global.difficultylevel` and applies only when the flag argument is true and `global.biome ≠ 21`; the summary formula now shows the step as additive to 0.03 and the mode as a rate multiplier.
- **Stat formula**: flat bonuses are added into the base before level scaling (only sigil % terms come after); Calumnier card tiers add +0.06 to a 0.4 rate; the claim that gene strength multiplies stats was removed (it does not appear in `scr_GetCreatureStat`).
- Counts/wording: 2 740 `gml_Script_*` entries contain 1 170 game scripts (the rest are libraries) and the 1 581 global-script stubs duplicate names; `scr_DatabaseAchievementFulfillment` (4.0 MB) added to the largest-function list; localization is 15 languages (English + 14); decorations use 4 database scripts; five guild shops (incl. Sorcery); 70 `SpellGems5` rows are inside the 747, not extra; 6v6, fusion sprite rule, 41 specializations and the Goblet price are now labelled as community/patch-note knowledge rather than VERIFIED.

Still UNSUPPORTED by files in the review folder (they exist in `evidence/` but were not staged): exe-level counts (55 327 literals, 16 170 variable records, 385 555 `.pdata` entries), the skins/quests/accessories/runes/cooking tables, and the row counts of the 20 localization CSVs not staged.
