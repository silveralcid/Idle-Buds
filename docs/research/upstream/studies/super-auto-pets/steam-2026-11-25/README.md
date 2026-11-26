> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/super-auto-pets/steam-2026-11-25/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Super Auto Pets — Reverse-Engineering Research Workspace
Target: `../../Super Auto Pets/` (Unity 6 IL2CPP client, Team Wood Games). Produced 2026-11-25. Start with **`FINAL_REPORT.md`**.
| Folder | Contents |
|---|---|
| `architecture/` | Engine, SpacewoodCore2 design (ability DSL, resolver, seeded battles, DTOs), delivery |
| `gameplay/` | Core loop, shop, pets, foods/perks, battle resolution, packs/modes; design & psychology |
| `progression/`, `economy/` | In-run and meta progression; in-run and real-money economy |
| `mathematics/` | Tier budgets, economy, shop odds, battle sensitivity; `charts/` |
| `content/`, `user-experience/`, `development-lessons/` | Content-as-code model; UX; adopt/avoid table |
| `simulations/` | `sap_model.py`, `charts.py` |
| `prototypes/` | `autobattler_dsl_prototype.html` — original single-file demo of a composable ability DSL with seeded replayable battles |
| `experiments/` | Methodology log |
| `mathematics/DECOMPILED_RULES.md` | Pass-2 native decompilation results: pet roster from code, shop sampler, constants, trigger ordering |
| `evidence/decompiled/` | Ghidra output (curated C) for `MinionConstants`, `AbilityConstants`, shop, triggers, helpers; `pets_from_binary.{json,csv}`, `pets_binary_vs_wiki_diff.csv`, `abilities_dsl_trace.json` |
| `evidence/stubs/SpacewoodCore2/` | Il2CppInspector typed C# stubs with addresses and field offsets |
| `evidence/dump/` | Class skeletons (SpacewoodCore2, Assembly-CSharp) |
| `evidence/strings/` | Generated/general English string tables (names, ability texts), raw tables and key maps |
| `evidence/wiki/` | Parsed pets/foods JSON and rule-page texts (superautopets.wiki.gg) |
| `evidence/community/` | 2022 community DB snapshot (historical) |
Reproduce: `cd simulations && python3 -I sap_model.py && python3 -I charts.py && python3 -I shop_sampler_sim.py ../evidence/decompiled/pets_from_binary.json`. Re-run the decompilation: see `research/tools/il2cpp-deep-re/README.md`.
