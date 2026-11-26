> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/legends-of-idleon/build-144/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Legends of Idleon — Reverse-Engineering Research Workspace

Target: `../../Legends of Idleon/` (Steam app 1476970; Electron 11.5.0 wrapper; game client build 144; Lava Flame Studios). Produced 2026-11-26. Start with **`FINAL_REPORT.md`**. Nothing was run and no online service was contacted.

| Folder | Contents |
|---|---|
| `architecture/` | Electron → React iframe → Stencyl/Haxe/OpenFL game; custom blocks and game attributes; Firebase bridge, saves, server time, live variables |
| `gameplay/` | Core loop, world and system map, how fighting and skilling work, design and psychology |
| `progression/`, `economy/` | 21 EXP ladders, gates and pacing; currencies, gems, bundles, flows |
| `mathematics/` | 20 formulas with line numbers in `N.pretty.js`, model results |
| `content/`, `user-experience/` | Inventory, data-as-code architecture and extraction method; UX review |
| `development-lessons/` | Adopt / avoid and principles |
| `simulations/` | `idleon_model.py` and its output |
| `prototypes/` | `idleon_workbench.html` (original: EXP to level, bonus formula, fight and AFK kill rate, harvest chance, stamp costs, drop odds) |
| `experiments/` | Method log |
| `tools/` | `extract_seg.js`, `dump.js` (data classes → JSON), `simplify.py` (readable formula blocks), `build_dataset.py` (JSON → CSV), `build_prototype.js` + `prototype_template.html` |
| `evidence/client/` | `N.pretty.js` (beautified game script), `index.html`, `firebase.js` (API key redacted), `extra.js`, `extra_steam.js` |
| `evidence/wrapper/` | Electron `package.json`, `src/main/*.js`, `app.html` |
| `evidence/blocks/` | 27 formula blocks in readable form (see its README) |
| `evidence/data/` | `idleon_data.json`, 23 CSVs, `summary.json` |

Reproduce: unpack `resources/app.asar` to a scratch folder, `js-beautify -s 1 distBuild/static/game/N.js > N.pretty.js`, then `node tools/dump.js N.pretty.js evidence/data/idleon_data.json`, `(cd tools && python3 -I build_dataset.py && node build_prototype.js)`, `(cd simulations && python3 -I idleon_model.py)`.
