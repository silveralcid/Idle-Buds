> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle/1.3.1/content/CONTENT.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Content inventory and architecture

## Inventory (base game = `melvorDemo.json` + `melvorFull.json`, data version 528; VERIFIED counts from `evidence/data/`)
| Kind | Demo | Full | Total |
|---|---|---|---|
| Items | 671 | 735 | 1 406 |
| Monsters | 66 | 106 (`itmMonsters` lists 50 of these as the Into the Mist random pool) | 172 in `monsters.csv` |
| Combat areas / slayer areas / dungeons / strongholds | 12 / 0 / 8 / 0 | 0 / 13 / 9 / 4 | 12 / 13 / 17 / 4 |
| Skills (skillData entries) | 13 | 20 (extends Demo) | 24 distinct |
| Skill actions with level + XP | | | 519 (Smithing 115, Runecrafting 84, Fletching 57, Crafting 57, Cooking 32, Herblore 30, Farming 24, Fishing 23, Thieving 23, Summoning 20, Alt. Magic 14, Mining 11, Astrology 11, Woodcutting 9, Firemaking 9) |
| Agility obstacles | | 51 | 51 (10 slots, pillars 3) |
| Township | | 54 buildings, 10 biomes, 13 resources, 6 seasons, 6 worships, 110 tasks, 170 casual tasks | |
| Pets | 26 | 36 | 62 |
| Shop purchases | 82 | 119 | 201 |
| Prayers / attack spells / curses / auroras | 0 / 20 / 0 / 0 | 31 / 9 / 14 / 12 | 31 / 29 / 14 / 12 |
| Attacks / passives / combat effects | 41 / 20 / 34 | 116 / 60 / 64 | |
| Modifier definitions | 570 | | |
| Steam achievements | | 92 | 92 |
| Gamemodes | 1 | 6 | 7 |

## Architecture
- **JSON data packages with a schema** (`$schema`, `namespace`, `data`, `modifications`): the game, its expansions, events and mods all register content the same way into namespaced registries. Full adds entries to Demo's skills (more trees, fish, recipes) through its own `skillData`, and its `modifications` block patches existing Demo objects (modifiers, shop purchases, equipment slots, combat-area categories, items, skill data, pets).
- **Ids are namespaced strings** (`melvorD:`, `melvorF:`, `melvorTotH:`, `melvorAoD:`, `melvorItA:`), mapped to compact numeric ids in saves.
- **Text is mostly separate**: packages carry English `name` fields, but displayed names and descriptions come from `lang/en.json` (1.27 MB) and 12 other real locales (zh-CN, zh-TW, fr, de, it, ko, ja, pt, pt-br, es, ru, tr) plus two joke locales (`lemon`, `carrot`), keyed by id; data files carry ids and numbers.
- **Media**: 259 MB of images ship locally with the Steam wrapper; the web client references them by path.
- **Extraction method**: the Demo and Full packages were downloaded from the public client host and flattened by `tools/build_dataset.py`, which merges per-skill lists the way registration does.

## Observations
- Content is large and evenly instrumented: every action has level, base XP, interval or recipe costs, so the whole game can be modelled from data plus ~20 formulas.
- The base-game monster list includes level 1 300 monsters (the end-game in the Full package), far above any player combat level: their difficulty is carried by levels and bonuses, not by a separate scaling system.
