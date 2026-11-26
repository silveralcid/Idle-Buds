> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle/1.3.1/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Melvor Idle — Reverse-Engineering Research Workspace

Target: `../../Melvor/` (Steam build: NW.js wrapper 1.2.2 that loads the web client from `steam.melvoridle.com`; game v1.3.1, script build 12097, data version 528; Games by Malcs). Produced 2026-11-26. Start with **`FINAL_REPORT.md`**.

| Folder | Contents |
|---|---|
| `architecture/` | Wrapper, web client, 50 ms tick engine, offline catch-up, registry, modifiers, mods, saves, entitlements |
| `gameplay/` | Systems, interaction diagram, design and psychology |
| `progression/`, `economy/` | Ladders, pacing, gates; currencies, flows, sinks |
| `mathematics/` | 21 formulas with file/line references, model results |
| `content/`, `user-experience/` | Inventory and data architecture; UX review |
| `development-lessons/` | Adopt / avoid and principles |
| `simulations/` | `melvor_model.py` and its output |
| `prototypes/` | `melvor_calculator.html` (original: player vs monster hit/max hit/DPS, time to level, thieving success, mastery XP) |
| `experiments/` | Method log |
| `tools/` | `build_dataset.py` (data packages → CSV) |
| `evidence/client/` | `steam_index.html`, the 143 `built/*.js` scripts, `data/melvorDemo.json` + `melvorFull.json`, `lang/en.json`, `SOURCE.txt` |
| `evidence/wrapper/` | NW.js `package.json`, `index.html`, `main.js`, `greenworks.js`, `discord.js` |
| `evidence/data/` | 9 CSVs, `skills_summary.json`, `township.json` |

Reproduce: `(cd tools && python3 -I build_dataset.py) && (cd simulations && python3 -I melvor_model.py)`.
