> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera-2/5.4.0/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera 2 — Reverse-Engineering Research Workspace

Target: `../../Kolterra 2/` (Electron 23 build of **Koltera 2** v5.4.0 by King Otter Games, Steam app 2834700). Produced 2026-11-26. Start with **`FINAL_REPORT.md`**.

| Folder | Contents |
|---|---|
| `architecture/` | Process model, state/reducer, tick loop and clocks, offline engine, persistence, defects |
| `gameplay/` | Every system with its rules, interaction diagram, design and psychology |
| `progression/`, `economy/` | Axes, pacing, gates; currencies, flows, sinks, balance notes |
| `mathematics/` | 32 formulas with source paths and tiers, plus model results |
| `content/`, `user-experience/` | Content inventory and data architecture; UX review |
| `development-lessons/` | Adopt / avoid tables and reusable principles |
| `simulations/` | `k2_model.py` (Python port of the formulas over the datasets) and its output |
| `prototypes/` | `k2_planner.html`: original single-file planner (gathering bonuses and time to level, sanctuary lineup tiers, helpers, creature levels, expeditions, dungeons, garden) |
| `experiments/` | Method log |
| `tools/` | `build_dataset.py` (content dump → CSV) |
| `evidence/asar_extract/` | Main-process JS (save-encryption key redacted), CRA build with source map, `package.json`; media and node_modules not copied |
| `evidence/source_reconstructed/` | 207 original TypeScript/TSX files recovered from the source map |
| `evidence/tsbuild/` | `dump.ts`, `tsconfig.json`, `package.json` used to dump content with esbuild |
| `evidence/data/` | `k2_content.json`, 11 CSVs, `configs.json`, `universal_drops.json` |

Reproduce: `(cd tools && python3 -I build_dataset.py) && (cd simulations && python3 -I k2_model.py)`. To regenerate `k2_content.json`: copy `evidence/tsbuild/*` to a scratch folder next to a copy of `source_reconstructed/` (as `../src`), `npm i esbuild`, then `npx esbuild dump.ts --bundle --platform=node --tsconfig=tsconfig.json --outfile=dump.js --loader:.png=empty --loader:.mp3=empty --loader:.wav=empty --external:react --external:@mantine/* --external:@nivo/* --external:react-dom && node dump.js > k2_content.json`.
