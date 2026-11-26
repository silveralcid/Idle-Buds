> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/idle-clans/1.6800/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Idle Clans — Reverse-Engineering Research Workspace

Target: `../../Idle Clans/` (Unity 6 IL2CPP client, build 1.6800, Isam Games). Produced 2026-11-25.

Start with **`FINAL_REPORT.md`**.

| Folder | Contents |
|---|---|
| `architecture/` | Engine, client/server split, data delivery, anti-tamper, limitations |
| `gameplay/` | All systems (skilling, combat, exterminating, raids, clans, quests, upgrades, market, pets…) + design/psychology |
| `progression/`, `economy/` | XP table and time-to-level, gates, currencies, market, monetization |
| `mathematics/` | Formulas with tiers and validation; `charts/` |
| `content/`, `user-experience/`, `development-lessons/` | Content model, UX notes, adopt/avoid table |
| `simulations/` | `idleclans_model.py` (rates, combat, drop EV, XP fit), `charts.py` |
| `prototypes/` | `shared_sim_prototype.html` — original single-file demo of "shared simulation + data-driven content" |
| `experiments/` | Methodology log |
| `evidence/dump/` | Class skeletons recovered from `global-metadata.dat` (Assembly-CSharp) |
| `evidence/public_api/` | Raw API responses + normalized `game-data` + flattened `tables/*.csv|json` |
| `evidence/textassets/` | Localizations CSV and other TextAssets |
| `tools/` | `meta.py` / `dump.py` (IL2CPP metadata v39 parser) |

Reproduce: `cd simulations && python3 -I idleclans_model.py && python3 -I charts.py`.
