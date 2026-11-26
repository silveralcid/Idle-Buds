> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/legends-of-idleon/build-144/content/CONTENT.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Content inventory and data architecture

## Inventory (VERIFIED, from the client's data classes; `evidence/data/`)
| Kind | Count | File |
|---|---|---|
| Items | 2 480 in 114 types (cards 281, monster drops 135, stamps 128, quest items 113, premium helmets 102, carry bags 102, helmets 58, rings 55 …) | `items.csv` |
| Monsters and resource nodes | 418: 341 monsters, 24 ores, 19 trees, 19 fishing spots, 15 bugs (AFK types: fighting 316, mining 13, choppin 18, catching 15, fishing 5, spelunking 7 …) | `monsters.csv` |
| Map scenes | 327 (each with display name, AFK target, portal kill requirement, AFK distance) | `maps.csv` |
| Classes | 25 playable + 3 placeholder "basics" entries; 42 family bonuses | `classes.csv`, `class_family_bonuses.csv` |
| Talents | 680 (297 text-only, 383 with a formula) | `talents.csv` |
| Alchemy | 140 bubbles in four cauldrons, 87 vials | `alchemy_bubbles.csv`, `alchemy_vials.csv` |
| Stamps | 128 | `stamps.csv` |
| Cards | 312 in 13 groups, 15 card sets | `cards.csv` |
| Quests / achievements | 350 / 490 (130 mapped to Steam achievements, 61 Steam achievements) | `quests.csv`, `achievements.csv` |
| Others | star signs 94, statues 32, prayers 25, shrines 9, meals 74, bribes 41, guild bonuses 18, salt licks 11, arcade upgrades 80, artifacts 41, gods 10, companions 179, islands 17, gaming upgrades 72, research grid 240 squares, compass upgrades 173, cavern premium shop 144 | CSVs and `summary.json` |

`evidence/data/idleon_data.json` holds every table (2 480 items, 418 monsters, 262 list functions from `CustomLists`, `CustomLists2`, `CustomLists3`, `CustomMaps`, `CustomMapsREAL`); `summary.json` lists each table's length.

## Data architecture
- **Content is code.** There are no data files: tables are Haxe functions compiled into the game script. Items are built by `addNewEquip`/`addNewConsumable` calls in six `ItemDefinitions` classes (split, likely because of compiler or editor limits; INTERPRETATION), monsters by `addNewMonster`, everything else by functions that return arrays of strings.
- **Strings as records.** Many rows are flat string arrays with positional meaning (`["ROID_RAGIN","1","0","addDECAY",…]`), and stamps keep their whole definition in one comma-separated `desc_line1` field (`BaseDmg,add,1,0,5,Grasslands1,3,5,10,1.2,0,{}_Base_Damage,3`). Underscores stand for spaces, `{` marks where the computed value goes, `|` is a line break.
- **Formula parameters in data.** Bonus rows carry `x1, x2, formula type` for the shared formula (FORMULAS #2), so most balance tuning is a data edit, while the rules that combine bonuses are code.
- **Localisation** lives in separate `LanguageLists*` and `LanguageNPClist*` classes (map names, talent names and descriptions, item names, bubble names …), with English in the main tables.
- **Server-side content** (server variables, events, tournaments, raids, companion odds, gem bundle offers) is not in the client.

## Extraction method
`tools/extract_seg.js` cuts each data class out of the beautified script (from its `var X = function() {};` line to the next top-level statement); `tools/dump.js` evaluates the classes together in a Node `vm` context with a three-line stub (`l` = Haxe `StringMap` with `.h`, `Y.thrown`, the class-registry object `A`) plus the classes' static constants copied from the static-initialiser line, calls every `make()` and zero-argument list function, and converts `StringMap`s to plain objects. 0 errors; no network, no game runtime. `tools/build_dataset.py` turns the JSON into the CSVs.
