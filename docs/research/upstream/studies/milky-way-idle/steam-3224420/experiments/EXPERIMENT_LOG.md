> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/milky-way-idle/steam-3224420/experiments/EXPERIMENT_LOG.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Experiment log
| # | Step | Tool | Result | Tier |
|---|---|---|---|---|
| E1 | Install inventory | device shell | Electron 32.0.2 wrapper, unminified app JS, no game data; Steam via steamworks.js | VERIFIED |
| E2 | Web client | curl of the public index + static chunks | `main.8add56c3.chunk.js` (1.96 MB) + vendor; prettified to 79 594 lines | VERIFIED |
| E3 | Formula extraction | grep/scripted block extraction | 43 extraction headers → `client_formulas.js` (1 not found, 2 arrow functions truncated); in-game guide + FAQ + 10 news + 20 patch-note headings | VERIFIED |
| E4 | Data maps | community simulator repo (`testing`, 2026-11-23) | 21 maps; hrid coverage vs client bundle 760/760 actions, 95/95 monsters, 957/958 items | STRONG INFERENCE → content VERIFIED by coverage |
| E5 | XP table & mechanics notes | wiki.gg `?action=raw` | 200-level table; efficiency/gathering/rare-find rules | STRONG INFERENCE |
| E6 | Market | developer's public `/game_data/marketplace.json` | snapshot for cost-per-XP | VERIFIED (snapshot) |
| E7 | Datasets | `tools/build_dataset.py` | items/actions/monsters/abilities/house rooms/enhancing tables | VERIFIED |
| E8 | Model | `simulations/mwi_model.py` | XP/h, time-to-level, production cost/XP, enhancing Markov, hit chance, tiers | computed |
| E9 | Independent review | separate agent: every cited line re-read, counts recomputed from the maps, model re-run byte-identical, exact Fraction solve of the enhancing chain, prototype run in node | 8 high-impact errors and ~30 smaller ones, all corrected (FINAL_REPORT §16); core formulas and all model numbers confirmed | done |
Not done (by design): logging in, capturing `init_client_data` or WebSocket traffic, running userscripts, any interaction with live services beyond loading public static files and the published market JSON.
