> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera-2/5.4.0/experiments/EXPERIMENT_LOG.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Experiment log

| # | Experiment | Method | Result | Tier |
|---|---|---|---|---|
| E1 | Build identification | strings in `Koltera 2.exe`; `resources/app.asar` header; `package.json`; `build/electron/configs.js` | Electron 23.3.13 / Chromium 110; `koltera-2` 5.4.0 by King Otter Games; Steam app id 2834700 | VERIFIED |
| E2 | Asar extraction | `research/tools/electron-asar-sourcemap/asar_extract.py --skip-media` | main-process JS (6 files), CRA build, 5.3 MB source map; media and node_modules not copied | VERIFIED |
| E3 | Source recovery | `sourcemap_extract.py main.87b32385.js.map --app-only` | 207 files, ≈42.9 k lines of TypeScript/TSX (engine 5, modules 69, content 48, utils 10, views 69) | VERIFIED |
| E4 | Content dump | `evidence/tsbuild/dump.ts` bundled with esbuild using the original tsconfig path aliases (`@data`, `@configs`, `@modules`, `@engine`, `@utils`, `@components`, `@pages`), media loaders stubbed, React/Mantine/nivo external; cycle-safe JSON conversion (a first version deduplicated shared objects and lost data) | `evidence/data/k2_content.json` (creatures, skills, items, upgrades, expeditions, traits, achievements, story, biomes, 9 configs) | VERIFIED |
| E5 | Flat datasets | `tools/build_dataset.py` | 11 CSVs + `configs.json` + `universal_drops.json` (per-skill drop triples parsed from source; a first version assumed Mining's dirt/relic/crate for every skill) | VERIFIED |
| E6 | Loop and clocks | read `views/GameWrapper.tsx`, `engine/dispatcher.ts`, every `modules/*/updates.ts` | rAF loop, 1-s clamp, 1-Hz fixed accumulator, 33-ms batched dispatch, two clocks, sleep detection | VERIFIED |
| E7 | XP table | parse `xpTable`, compare with the RuneScape formula | 147 entries; levels 2–126 identical, then 200 M × 1.1ⁿ; only 98 used | VERIFIED |
| E8 | Model | `simulations/k2_model.py` | 16 sections: bonuses, time to 99, drops, helpers, creatures, sanctuary, expeditions, dungeons, machines, garden, gold, crafting, summoning snowball, loop drift and offline penalty | computed |
| E9 | Sanctuary optimisation | simulated annealing over 8-of-120 lineups; point-budget bound | 3 simultaneous tier-5 jobs possible; max tier sum 25 (bound: 271 points < 276 needed for 26) | computed |
| E10 | Helper cap | read `addHelper`, search for callers of `getHelperSlots` and for `helper_slot` effects | no cap | VERIFIED |
| E11 | Prototype check | run the planner's script in node with a DOM stub | 1→99 at maxima 191.1 h, L70 136.1 h, rocks 307 532 — equal to the model | computed |
| E12 | Independent review | separate agent: source map vs recovered files, every FORMULAS row, numeric recomputation, exact sanctuary ILP, dataset/model/prototype reproduction | 12 high-impact findings and ~25 smaller ones; corrected (FINAL_REPORT §16) | done |

Not done (by design): launching the game, reading or decrypting a save, contacting Steam or any service. The save-encryption key literal is redacted in `evidence/asar_extract/build/electron/encryption.js`.
