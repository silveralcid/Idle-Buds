> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/legends-of-idleon/build-144/experiments/EXPERIMENT_LOG.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Experiment log

| # | Experiment | Method | Result | Tier |
|---|---|---|---|---|
| E1 | Build identification | strings in `LegendsOfIdleon.exe`; `resources/app.asar` header; `package.json`; `steam_appid.txt`; `GameVERSION` check in the script | Electron 11.5.0 / Chrome 87, app 1476970, Lava Flame Studios, client build 144 | VERIFIED |
| E2 | Unpack | `@electron/asar` extract to a scratch folder (install untouched) | main process sources, React launcher, `static/game` (N.js 25.4 MB, default.pak 46 MB, firebase.js) | VERIFIED |
| E3 | Engine | class registry (`A["…"]`), Stencyl/OpenFL/Lime/Box2D packages, Haxe idioms | Stencyl → Haxe → OpenFL HTML5, 253 game script classes, 235 custom blocks | VERIFIED |
| E4 | Beautify | `js-beautify -s 1 N.js` | `N.pretty.js`, 174 617 lines (all line references) | — |
| E5 | Data dump | `tools/extract_seg.js` + `tools/dump.js` (Node `vm`, StringMap stub, static constants) | 2 480 items, 418 monsters, 260 tables, 0 errors | VERIFIED |
| E6 | Datasets | `tools/build_dataset.py` | 23 CSVs + `summary.json` | VERIFIED |
| E7 | Formula reading | custom blocks extracted and simplified (`tools/simplify.py`) into `evidence/blocks/` | 20 formulas in FORMULAS.md with line numbers | VERIFIED |
| E8 | Backend map | read `lib/firebase.js`: command dispatcher (base64 of the reversed name), Firestore collections, callables | 174 bridge commands, 54 callables, saves to `_data/{uid}`, vars `_vars/_vars`, time via `ttg` | VERIFIED (client side) |
| E9 | Model | `simulations/idleon_model.py` | EXP ladders, bonus shapes, hit and harvest chance, damage taken, soft caps, drop-odds bias, AFK kill rate (double hit chance), stamp costs | computed |
| E10 | Prototype | `tools/build_prototype.js` → `prototypes/idleon_workbench.html`; run in node with a DOM stub | class L1→100 1 386 407 903 EXP = model; Crabcake AFK example (1.8 s, no crit) 99.5 / 40.2 kills/h as coded vs 117 / 75.5 with hit chance once at 84 % / 52 % hit chance = model (100 / 40 vs 117 / 75); harvest and drop-odds figures = model (drop odds −18.6 % at an expected 1.5) | computed |
| E11 | Independent review | separate agent, read-only, scratch outside the workspace: re-ran beautify, dump, datasets, model and prototype; executed the original `AFKgainrates`, `IncreaseExpREQ` and `CalcAwayKills` code; audited the formula rows and evidence for secrets | pipeline byte-identical; 4 formula rows and several line ranges corrected; clock, sign-in and purchase descriptions corrected; one OAuth client secret redacted | applied (FINAL_REPORT §16) |

Not done: running the game, signing in, any request to Firebase or other services, reading or changing a save, the 46 MB asset pack (media only), the gem-shop page contents (scene code), and per-bundle effects beyond the three cited.
