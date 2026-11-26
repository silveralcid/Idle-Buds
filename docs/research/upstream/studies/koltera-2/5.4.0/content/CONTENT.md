> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera-2/5.4.0/content/CONTENT.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Content inventory and architecture

## Inventory (VERIFIED, `evidence/data/`, built by `tools/build_dataset.py`)
| Table | Count | Notes |
|---|---|---|
| Creatures | 120 | 20 per tier 0–5; main jobs: Exploring 21, Farming 20, Digging 20, Fishing 20, Mining 19, Chopping 19, All 1; 13 traits; one type each: Earth 32, Water 30, Wind 29, Fire 29 (the type field is an array and the code supports several); six stats (power, toughness, agility, intelligence, gathering, luck) and six job values (0–10) |
| Skills | 9 | 6 gathering × 12 activities (72), 3 workstations |
| Items | 192 | Gathered 118, Refined 51, Currency 9, Container 8, Sellable 3, Consumable 3; 27 buyable, 54 sellable, 3 with weekly limits |
| Recipes | 144 | Workbench 61, Furnace 51, Stove 32, over 48 output items (multiple input variants per output) |
| Awaken Tree | 120 nodes | Gathering 72, Workstation 33, Gold 15; nine effect types; grid positions and prerequisite edges included |
| Expedition types | 20 | base rating 1 → 6 000, base XP 300 → 1 300, one trait and biome each, stat weights, one reward item |
| Biomes | 7 | advantage / disadvantage type lists |
| Dungeon tiers | 5 | combat and per-skill gathering reward tables |
| Machines | 9 | 3 generators, 6 processors with recipe lists |
| Tools | 11 | 10 levels, bar costs |
| Milestones | 30 | 3 tracks × 10 (creatures 12 → 120, items 19 → 192, total skill levels 90 → 891) |
| Story / tutorial | 10 steps | requirement + reward + tab unlocks |
| Achievements | 18 | Steam keys: creature counts, gold totals, 99 in each skill |

## Architecture
- **Content is code.** Every table is a TypeScript module under `content/data/` (13.6 k lines) or `content/configs/`, exporting `{ get, getById }` objects; there are no JSON or asset-bundle data files. Tables are typed by the module types (`CreatureContent`, `Skill`, `ExpeditionTypeContent`), so the compiler checks references.
- **Generated content.** The 72 gathering activities spread a shared `GATHERING_SKILL_PROGRESSION` row into each activity (`...getGatheringProgression(i)`) and append `universalDrops(i)`; creature summoning costs call tier functions (`getResourceAmount`, `getCharms`, …). Balance is changed in one place and propagates to all six skills or all 120 creatures.
- **Configs separate from data.** Tunables live in `content/configs/*.ts` (global, skilling, creatures, sanctuary, expeditions, dungeons, machines, taskboard, tools, milestones, gathering-progression) with inline designer comments, several of which have drifted from the values (see `architecture/ARCHITECTURE.md`).
- **Extraction method.** The source map's `sourcesContent` was written out to `evidence/source_reconstructed/`; `evidence/tsbuild/dump.ts` imports the content modules through the original tsconfig path aliases, esbuild bundles it for node (image/audio imports stubbed), and a cycle-safe converter writes `evidence/data/k2_content.json`. `tools/build_dataset.py` then flattens it to CSV.
- **Assets**: images are referenced by path (`items/<id>.png`, `creatures/<job>/<id>.png`) inside the asar; many entries still point at `items/placeholder.png`. Media were not copied into the research folder.

## Observations
- Data entry is uniform: every creature of a tier has the same cost shape, every skill the same 12-rung ladder. That makes balance legible and tooling easy, and it also flattens identity: skills differ only by item names and their universal-drop triple.
- Expedition type 14's unlock count (300) breaks the otherwise increasing sequence (…, 500, 700, **300**, 1 100, …).
- `build_dataset.py` maps the story `reward` field (the first version read a non-existent `rewards` key and left the column empty).
- Placeholders remain: all 13 traits, the 7 biomes and the skill entries use `placeholder.png`, and 7 items have empty or "to be written" descriptions, consistent with a game still in active development (v5.4).
