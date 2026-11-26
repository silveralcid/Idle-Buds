> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/idle-clans/1.6800/experiments/EXPERIMENT_LOG.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Experiment & Methodology Log — Idle Clans

| # | Goal | Method | Result | Tier |
|---|---|---|---|---|
| E1 | Identify engine/stack | directory listing, `globalgamemanagers` strings, `ScriptingAssemblies.json`, `boot.config`, metadata header | Unity 6000.3.25f1 IL2CPP, metadata v39, PlayFab/WebSocket/Mongo BSON/Steamworks | VERIFIED |
| E2 | Recover class model without Il2CppDumper (no .NET runtime, GitHub releases unreachable) | wrote `tools/meta.py` + `tools/dump.py`: parsed the v39 header as (offset,size,count) triples, inferred struct layouts empirically (typeDef 82 B packed, method 32 B, field/param 12 B, image 36 B), decoded enum constants from field-default-values | 3 190 Assembly-CSharp classes with fields/methods/params → `evidence/dump/AssemblyCSharp.txt` (39 k lines) | VERIFIED |
| E3 | Reverse the enum scrambler | compared consecutive enum values; constant stride 0x02020202 | 66 `UpgradeType` names recovered, matched wiki names | VERIFIED |
| E4 | Extract assets | UnityPy over all `.assets`/level files | 23-language Localizations CSV (5 690 keys), forbidden-names list, TLD list; MonoBehaviour fields not readable (no type trees in IL2CPP builds) | VERIFIED |
| E5 | Obtain content tables | official public API (Swagger, 47 endpoints): `/Configuration/game-data`, `/Items/metadata`, settings, limits; normalized Mongo extended JSON | 17 collections, 1 009 items, 318 tasks, 80 monsters, 234 quests, 70 upgrades, 245 achievements | VERIFIED (public) |
| E6 | Formulas | wiki pages Combat / Plundering / Clan events / XP table; cross-checked function names against client `CombatFormulas`, constants against `SharedSettings` | hit/max-hit/XP/dodge/respawn/weakness | STRONG INFERENCE |
| E7 | XP model fit | least squares on increments | `round(75·2^⌊L/7⌋+0.25L)`, 0.26 % max error | STRONG INFERENCE |
| E8 | Simulations | `idleclans_model.py`: skilling xp/gold per hour for all tasks, hours-to-level, combat Monte Carlo vs real monster sheets, drop EV | tables in FORMULAS/PROGRESSION; charts ×6 | – |
| E9 | Public reception | web search (Steam, App Store, Discord) | Mostly Positive ~74 %, 1 600+ reviews, ~650–900 concurrent on Steam | VERIFIED (external) |

Not done and why: decompiling `GameAssembly.dll` (no Ghidra/IDA in the workspace; shared-code function names + wiki were sufficient for the research questions); live-play telemetry or any interaction with game servers beyond the documented public API (online game; explicitly out of bounds); reading MonoBehaviour prefab data (needs IL2CPP type trees, which require the binary dump).
