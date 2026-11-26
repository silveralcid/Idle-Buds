> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/super-auto-pets/steam-2026-11-25/experiments/EXPERIMENT_LOG.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Experiment & Methodology Log — Super Auto Pets
| # | Goal | Method | Result | Tier |
|---|---|---|---|---|
| E1 | Identify stack | folder/`app.info`/`ScriptingAssemblies.json`/metadata header | Unity 6000.3.11f1 IL2CPP v39, SpacewoodCore2 engine assembly, Addressables, Firebase, BestHTTP, Steamworks | VERIFIED |
| E2 | Class model | generalized metadata dumper (`evidence/dump2.py`): header struct sizes differ from the Idle Clans build (typedef 76 B, method 30 B, field/param 10 B) → layouts re-derived empirically | 1 960 SpacewoodCore2 + 1 400 Assembly-CSharp classes with fields/methods/params | VERIFIED |
| E3 | Locate pet data | searched for data assets; found fluent builder + `Create*()` methods → definitions are code | pets not in data files; enums (850/253/234/30/35) recovered | VERIFIED |
| E4 | Ability texts | UnityPy over Addressables localization bundles (type trees present) | 4 534 generated keys: names + per-level ability text for 651 pets, foods, perks, triggers, archetypes | VERIFIED |
| E5 | Current pet numbers | parsed wiki `Pets`/`Food` pages (HTML tables) | 428 pets with tier/attack/health/packs/trigger/ability levels; 158 foods | STRONG INFERENCE (community wiki) |
| E6 | Rules | wiki The Basics/Shop/Experience/Tokens/Weekly/Custom + client UI strings | economy, XP, tiers, lives, modes | STRONG INFERENCE / VERIFIED (strings) |
| E7 | Quant | `sap_model.py`: tier budgets, trigger mix per pack, shop-odds model, stats-only battle Monte Carlo, buff sensitivity | tables in FORMULAS; 4 charts | computed |
| E8 | Community DB | cloned bencoveney/super-auto-pets-db (2022 snapshot, 89 pets) for structured ability JSON history | kept as historical evidence only | external |
| E9 | Deep RE toolchain | installed .NET 8/10, ilspycmd 9.1, Il2CppInspectorRedux, JDK 25, Ghidra 12.2 + PyGhidra in the VM; saved as `research/tools/il2cpp-deep-re/` (install + pipeline scripts) | inspector output (`il2cpp.json`, C# stubs), Ghidra project with 70 203 named functions and 29 787 string labels | VERIFIED |
| E10 | Pet definitions from code | decompiled all `MinionConstants.Create*` builders (builders missing from the address map located via `find_callers.py` on `EnsureMinions`), identified unnamed setters by field offsets, parsed the fluent chains | 717 definitions; 425/428 wiki pets matched, 148 differ (binary newer) | VERIFIED |
| E11 | Shop sampler, constants, trigger ordering | decompiled `RollShop`, `RandomizeShop`, `TakeShopItems<T>`, `TryFastTakeRandom<T>`, `GetMinionPenalty`, `UpgradeTier`, `SetNewTurnGold`, `BoardConstants..cctor` (found via RIP-relative xref scan), `MinionModel.Priority`, `MinionTriggeringAbility.CompareTo`, `RandomPriority` | uniform-without-replacement sampler, tribe weighting, duplicate penalty = 0, schedule lists, priority formula | VERIFIED |
| E12 | Ability DSL | decompiled 443 `AbilityConstants` lambdas + builders, mapped enum→lambda, extracted factory-call traces | `abilities_dsl_trace.json` | VERIFIED (verbs), numbers from strings |
Not done: the ~310 ability lambdas absent from the address map; any contact with Team Wood servers.
