> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/kadomon/steam-2026-11-25/experiments/EXPERIMENT_LOG.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Experiment & Methodology Log — Kadomon
| # | Goal | Method | Result | Tier |
|---|---|---|---|---|
| E1 | Identify stack | `app.info`, `Managed/`, `globalgamemanagers` | Unity 2020.3.25f1 Mono, Dino Rocket | VERIFIED |
| E2 | Source | `ilspycmd 9.1 -p` on `Assembly-CSharp.dll` | 732 C# files / 67 725 lines (`evidence/decompiled_src/`) | VERIFIED |
| E3 | Content data | UnityPy 1.25 + TypeTreeGeneratorAPI (type trees generated from the Managed DLLs; `tools/dump_scriptables.py`) | 9 539 MonoBehaviours / 362 classes dumped; 71 unreadable (text-animator, 1 `TypeDictionary` parsed by hand) | VERIFIED |
| E4 | Odin blobs | wrote `tools/odin_binary.py` (Sirenix binary format reader) | evolutions, attack rows, dictionaries, the 12×12 type chart decoded | VERIFIED |
| E5 | Dataset | `tools/build_dataset.py` resolves PPtrs/enums → `evidence/data/` | 140 Kadomon, 177 attacks, 218 passives, type chart, singletons | VERIFIED |
| E6 | Rules | read `BattleManager`, `Entity`, `DamageHelper`, `HealthController`, `StatusEffectHelper`, `AttackScriptable`, `UnitDictionary`, `LevelController`, `UnitsManager`, shop/reward/rest controllers | formulas in `mathematics/FORMULAS.md` | VERIFIED |
| E7 | Quant | `simulations/kadomon_model.py` | stage budgets, evolution growth, 1v1 matrix, type-edge value | computed |
Not done: play-testing; reading every passive's effect rows (data is extracted, only sampled by hand); I2 localization table (unreadable blob, strings are inline anyway).
