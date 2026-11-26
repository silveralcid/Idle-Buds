> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/experiments/EXPERIMENT_LOG.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Experiment & Methodology Log

| # | Goal | Method | Result | Confidence |
|---|---|---|---|---|
| E1 | Identify engine | `strings fableverse.exe`, inspect `resources/`, `package.json` | Electron 27.1.3 / Chromium 118, CRA React bundle, steamworks.js | VERIFIED |
| E2 | Recover application code | Wrote a 30-line pure-Python ASAR parser (`~/tools/asar_extract.py`, no deps) → `evidence/asar_extract/` (601 files). Original untouched. | Full `build/` tree incl. `main.*.js.map` with `sourcesContent` | VERIFIED |
| E3 | Reconstruct source | Parsed the source map; wrote the 59 first-party files to `evidence/source_reconstructed/` (13 287 lines) | Complete controllers, views, engine | VERIFIED |
| E4 | Recover data tables | Webpack inlines JSON as `JSON.parse('…')`; regex-extracted the 7 blobs from the bundle and named them by schema | Fables(41), Minerals(11), Locations(12), Spirits(12), Pickaxes(15), Mining_Upgrades(23), DefaultState | VERIFIED |
| E5 | Validate formulas by execution | Ported every controller formula to Python (`simulations/koltera_model.py`) and ran tick-exact simulations of mining and combat; cross-checked analytic probabilities vs 200 k-sample Monte Carlo (breeding) | Analytic and simulated values agree to <0.2 pp | VERIFIED |
| E6 | Progression timing | `progression_sim.py`: training XP/s by level × location, hours to L100, gardening greedy purchase to summons | L100 ≈ 8.5 h solo training; 4th summon ≈ 12 h at ~1.1 B coins of plants | STRONG INFERENCE (depends on upgrade state) |
| E7 | Charts | `charts.py` → 6 PNGs | see `mathematics/charts/` | – |
| E8 | Public context | Web search (Steam/SteamDB) | Free, released 2023-12-09, Mixed ~65 %, Koltera 2 announced | VERIFIED (external) |
| E9 | Independent review | Separate agent re-reads source and audits report claims | see `FINAL_REPORT.md` §15 | – |

Not performed (and why): live play-session telemetry (the source made black-box inference unnecessary; the game runs only via Electron on the host and launching it was not required to answer any question); binary analysis of `fableverse.exe` (it is stock Electron; no game logic in native code); save-file analysis of real player data (none present in the folder; schema fully known from `DefaultState.json` and `electron.js`).

Ethics/scope: no DRM, anti-cheat, auth or network protections exist or were touched; no proprietary assets or code are redistributed in this workspace beyond the evidence copies kept locally for study (the `evidence/` folder is the user's own installation data, extracted in place).
