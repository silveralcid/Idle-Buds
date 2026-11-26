> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle/1.3.1/experiments/EXPERIMENT_LOG.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Experiment log

| # | Experiment | Method | Result | Tier |
|---|---|---|---|---|
| E1 | Install inspection | read `Melvor/package.nw/{package.json,index.html,main.js}`, list `lib/`, `assets/` | NW.js wrapper (1.2.2) iframing `https://steam.melvoridle.com`; Steamworks via greenworks; Discord RPC; 259 MB local media; no game code locally | VERIFIED |
| E2 | Client fetch | `curl` of the iframe page and the 143 scripts it lists (`?12097`), no login | 127 190 lines of compiled TypeScript; `gameVersion` v1.3.1 | VERIFIED |
| E3 | Data fetch | `assets/data/melvorDemo.json`, `melvorFull.json` (`?528`), `lang/en.json` | base-game data; expansion/event packages deliberately not fetched (entitlement-gated in the client) | VERIFIED |
| E4 | Datasets | `tools/build_dataset.py` | 9 CSVs + `skills_summary.json` + `township.json` | VERIFIED |
| E5 | Formula extraction | reading `utils.js`, `skill.js`, `character.js`, `enemy.js`, `monsters.js`, `thieving2.js`, `woodcutting.js`, `game.js`, `shop.js`, `saveWriter.js` | 21 formulas with line refs | VERIFIED |
| E6 | Model | `simulations/melvor_model.py` | XP table, base XP/h per skill, time to 99, mastery per action and pool, combat hit/max-hit, thieving success, offline/tick constants, content counts, bank-slot costs | computed |
| E7 | Prototype check | run `prototypes/melvor_calculator.html` script in node with a DOM stub | Woodcutting 1→99 403.8 h (model 404 h); after review fixes, monster magic max hits use their spells (Wizard 118) and player DPS includes monster damage reduction | computed |
| E8 | Independent review | separate agent: every cited line, own simulations (mining depletion, fishing junk, thieving stun), dataset and model reproduction, prototype in node | 11 high-impact findings; corrected (FINAL_REPORT §16) | done |

Not done: logging in, reading saves, contacting PlayFab or the Melvor Cloud, downloading paid expansion data.
