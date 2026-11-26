> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle-2/0.11.7-alpha/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Melvor Idle 2 (0.11.7 alpha) — Final Reverse-Engineering Research Report

Build: Godot 4.7.2 + C# (.NET 10.0.15), `GamesByMalcs.Melvor2.dll` + PCK embedded in `Melvor2.exe`. Nothing was run; no online service was contacted; the obfuscated online/account code was not analysed and is stubbed in the evidence copy.

## 1. Executive summary
Melvor Idle 2 rebuilds Melvor Idle in Godot with C#. Both halves of the game are readable: the managed assembly decompiles to plainly named C# (4 048 files), and the content lives in one unencrypted 15 MB JSON package inside the PCK that is embedded in the signed executable (a named PE section `pck`, with its footer just before the Authenticode signature; our tool found it by scanning for a valid header). The core formulas are therefore **VERIFIED** at source paths.

Architecturally it keeps Melvor 1's two best ideas (one fixed-step tick, and offline as the same tick replayed) and adds structure: skills are ECS-style entities configured from data, most derived numbers are nodes in a source-generated dependency graph of small pure `[StatComputer]` functions, and even formula choice (max-hit formula per combat style) is data. The tick is Godot's physics tick (60 Hz by default, since the project does not set it); offline and catch-up run the same `PropagateTick()` on a worker thread, triggered by stale saves and by a clock-drift sleep detector, capped by a modifiable 24 h stat.

The rules stay close to Melvor 1 (an XP table of the same shape that differs by 1–5 XP at 100 levels because of how the power is computed, L99 13 034 427; the same hit-chance formula; the melee/ranged max hit is the same polynomial rewritten in integer-friendly form, which removes 89 float off-by-one cases of Melvor 1's version) while the mechanics change: trees have health, rocks break by chance-or-progress so every ore has a hit cap, thieving has staged heists that pay XP once per completed run (up to 30 stages), resistance becomes a protection-vs-power ratio capped at 70 %, area darkness lowers the player's accuracy and evasion, combat level drops Hitpoints and Prayer, pets roll on XP gained, and per-action mastery is replaced by a **Mastery Guild** (3 251 wired tasks) with seven point-percentage ranks per skill. New skills (Ranching, Hunting, Beastcrafting) and 17 wired quests widen the game; the data also holds content that is not yet wired (20 more quests, master pets, guild tasks). Skill levels are hard-capped at 99 in this build.

## 2–13. Sections → `architecture/`, `gameplay/`, `progression/`, `economy/`, `mathematics/`, `content/`, `user-experience/`, `development-lessons/`, `prototypes/`, `experiments/`, `evidence/`, `simulations/`.

## 14. Remaining unknowns
| Item | Status |
|---|---|
| Physics tick rate | 60 Hz is Godot's default and nothing in settings or code changes it: STRONG INFERENCE (not observed at run time) |
| Online features (accounts, cloud saves, live configuration, Satori events) | out of scope; code obfuscated and stubbed |
| Balance intent of alpha numbers | UNKNOWN; numbers are VERIFIED for 0.11.7 only |
| Mastery Guild full bonus table | data dumped (`MasteryGuildTask.csv`, `MasteryGuildBonus.csv`); point bands and thresholds VERIFIED, bonus effects not modelled |
| Combat damage pipeline details (triangle values, elements, ward/armour order) | formulas for the main stats VERIFIED; full turn resolution not modelled |

## 15. Completion checklist
- [x] Engine/stack identified (Godot 4.7.2 C#/.NET 10, alpha 0.11.7)
- [x] Code decompiled; pack read; content package and locales extracted
- [x] Formulas with tiers (18) and a model
- [x] Prototype (cross-checked with the model)
- [x] Design, UX, development lessons
- [x] Reusable tooling (`research/tools/godot-pck/`)
- [x] Independent review (§16)

## 16. Independent review
A separate agent audited the workspace read-only on 2026-11-26: every FORMULAS row against the decompiled C#, all content counts, the PCK index and extraction (byte-identical), the datasets and model (byte-identical outputs), the prototype in node, and a secrets check. Nothing was run or contacted.

### Confirmed
Tick and TickTimer (no physics key in the 61 project settings), agility and hunting curves, woodcutting and mining rules (expected hits and caps for all 28 rocks), thieving success, accuracy/evasion, hit chance (same as Melvor 1), max-hit formulas and the 89-case Melvor 1 off-by-one check (integer strength bonus), HP and attack interval, resistance, combat-level ratios, guild thresholds, pet trigger and the 63.2 % figure, offline and sleep detection, saves; all object counts, PCK facts, sizes, dependencies, time-of-day hours, weather weights, bank and Citizen loot. No keys, tokens or credentials outside the 37 stubs.

### Corrected after review
| Finding | Correction |
|---|---|
| XP table "identical to Melvor 1": `Math.Pow(Math.Pow(2, 1/7), i)` floors one lower at i = 7, 14 … | L99 13 034 427, L120 104 273 162; 100 levels 1–5 XP lower (FORMULAS #3, PROGRESSION, FINAL, model) |
| Content counts were object totals, not what loads (`EntityConfig`) | quests 17 of 37, guild tasks 3 251 of 3 403, pets 25 of 36 (master pets unwired), areas 40 + 14 dungeons of 64, imbuements 16, shop 461, obstacles 333, NPCs 33 (CONTENT, GAMEPLAY, PROGRESSION, ECONOMY, model) |
| Thieving stages "up to 15" and top perception 2 420 (an artefact of sampling every 6th target) | up to 30 stages; top perception 3 580 (Palace Vault, 5.4 % at 99); model prints all targets |
| Prototype credited heist XP on every success | XP once per completed run (÷ stages): Lower Floors ≈ 20 900, Palace Vault ≈ 10 000 XP/h at stealth 99 |
| Prototype applied darkness to both sides (it cancelled out) | darkness lowers the player's accuracy and evasion only; prototype shows both directions |
| Mining comparison with Melvor 1 used its no-depletion rate | compared with Melvor 1's sustained ≈ 17 400 XP/h; M2 mining is higher |
| Mining cap "⌈1/p⌉" | ceil((0.9999 − m)/p): 3 for Clay and Rune Essence |
| Level cap "raised by data" | hard-coded 99; XP keeps accumulating; "P(by 120)" → by 104.3 M XP |
| Hunting journals "per species", L30 | per HuntingAnimal (44, 41 logging), cap 25; agility technique cap 40 |
| Missing nuances | combat level also drops Prayer; player uses selected style, enemies the max; guild points per band and `ceil` thresholds; pet trigger fires once; offline cap = max(base, base + flat); `IsOffline` only on the sleep path; time of day has three modes (default accelerated 48-minute day); 8 physics steps per frame; drift under 10 s discarded; PCK is a named PE section with a visible footer |
| Overclaims | "identical results" → same distribution; "keep the mean" → bounded randomness lowers the mean; woodcutting was never geometric; tooltip text partly hard-coded; "every derived number is a node", "deliberately continuous", "editor's output" reworded or marked INTERPRETATION; 37 (not 39) stubbed files; namespaces A, a, C, c, b |

### Not changed
60 Hz stays a STRONG INFERENCE (not observed at run time). `godot_pck.py extract` now skips absolute and `..` paths (re-tested: `project.binary` extracts byte-identical).
