> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/milky-way-idle/steam-3224420/README.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Milky Way Idle — Reverse-Engineering Research Workspace
Target: `E:\AI Agent\IdleBuds-ReverseEngineer\Milky Way Idle` (Steam client = Electron 32.0.2 wrapper, app build 3224420) plus the web client it loads from `www.milkywayidle.com` (bundle `main.8add56c3.chunk.js`, latest in-client patch note 2026-09-28). Produced 2026-11-25. Start with **`FINAL_REPORT.md`**.
| Folder | Contents |
|---|---|
| `architecture/` | Wrapper, web client, server-authoritative model, data flow (`init_client_data`), userscript runtime |
| `gameplay/` | Skills, actions, combat, enhancing, alchemy, labyrinth, tasks, guilds, market |
| `mathematics/` | Formulas with evidence tiers (client code, developer guide text, community simulator) |
| `progression/`, `economy/` | XP curve, unlock cadence; coins, market, cowbells, MooPass, sinks |
| `content/`, `user-experience/`, `development-lessons/` | Inventory; UX reading; adopt/avoid |
| `simulations/` | `mwi_model.py` (+ output): XP curve, skilling XP/h and time-to-level, production input cost per XP, enhancing Markov chain, hit chance, monster tiers |
| `prototypes/` | `mwi_calculator.html` — skilling XP/h & time-to-level, exact enhancing expected attempts/protections, hit chance |
| `experiments/` | Methodology log |
| `evidence/client/` | Official bundle (raw + prettified, 79 594 lines), `client_formulas.js` (43 extraction headers with line refs: 1 not found, 2 arrow functions truncated; the cited `main.pretty.js` lines are authoritative), `game_guide.md` (in-game guide + FAQ verbatim), `patch_note_headings.json` (10 news posts + 20 patch notes), `marketplace_snapshot.json` (the developer's public hourly market API) |
| `evidence/data_maps/` | 21 game data maps (items, actions, monsters, abilities, house rooms, achievements, guild buffs, labyrinth…) as shipped by the community combat simulator; checked against the client bundle's hrid lists (760/760 actions, 95/95 monsters, 957/958 items) |
| `evidence/community_sim/` | Combat simulator engine source (shykai/MWICombatSimulatorTest, branch `testing`, 2026-11-23) — reference for server-side combat resolution |
| `evidence/community/` | wiki.gg raw pages used (Experience table, Efficiency, Action Speed, Gathering, Enhancing, Alchemy, Wisdom, Rare Find) |
| `evidence/wrapper/` | The Electron wrapper's own sources (main.js, config.js, cache manager, userscript runtime) |
| `evidence/data/` | Built datasets: `items`, `actions`, `monsters`, `abilities` (json+csv), `house_rooms.json`, `enhancing_tables.json`, `level_experience_table.json` |
| `tools/` | `build_dataset.py` |
Reproduce: `python3 tools/build_dataset.py evidence evidence/data && (cd simulations && python3 -I mwi_model.py)`. `evidence/data/level_experience_table.json` is not produced by the build script: it is a hand copy of the community wiki table (STRONG INFERENCE) and is kept as an input file.
