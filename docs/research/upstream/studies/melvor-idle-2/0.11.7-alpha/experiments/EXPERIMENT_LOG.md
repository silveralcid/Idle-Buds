> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle-2/0.11.7-alpha/experiments/EXPERIMENT_LOG.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Experiment log

| # | Experiment | Method | Result | Tier |
|---|---|---|---|---|
| E1 | Build identification | `runtimeconfig.json`, `deps.json`, `project.binary` decode | Godot 4.7.2 C#, .NET 10.0.15, version 0.11.7 alpha, Nakama/Satori/Steamworks.NET | VERIFIED |
| E2 | Decompilation | `ilspycmd 9.1 -p -r <data dir> GamesByMalcs.Melvor2.dll` | 4 048 files, ≈668 k lines (618 data-editor files) | VERIFIED |
| E3 | Pack location | scan for `GDPC` headers with plausible versions (the review found the pack is also a named PE section `pck`, with the footer just before the signature) | PCK v4 at offset 109 411 328, 14 865 entries, no encryption | VERIFIED |
| E4 | Extraction | `research/tools/godot-pck/godot_pck.py extract` | `MelvorBase.json` (15.3 MB, 137 types), locales, settings, project.binary | VERIFIED |
| E5 | Redaction | stub the obfuscated online namespaces (A, a, C, c and b; a and c merged into A/ and C/ on the case-insensitive mount) and generated data blobs in the research copy | 37 files stubbed, names kept | — |
| E6 | Datasets | `tools/build_dataset.py` | 32 CSVs + `object_counts.json` | VERIFIED |
| E7 | Model | `simulations/m2_model.py` | tick, XP tables, woodcutting/mining/thieving rates, combat formulas incl. the Melvor 1 equivalence check, Mastery Guild structure, offline, pets | computed |
| E8 | Prototype check | node with a DOM stub on `prototypes/m2_mechanics.html` | Stone 1.96 hits / 3 673 XP/h, Normal Tree 3 600 XP/h = model; after review: heist XP/h divided by stages (Lower Floors 20 947, Palace Vault 10 030 at stealth 99), darkness applied to the player only | computed |
| E9 | Independent review | separate agent: every formula row against the decompiled code, counts, PCK and dataset reproduction, model and prototype in node, secrets check | 7 high-impact findings; corrected (FINAL_REPORT §16) | done |

Not done: running the game, logging in, any Nakama/Satori/cloud traffic, analysis of the obfuscated online code.
