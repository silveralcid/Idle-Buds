> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle-2/0.11.7-alpha/content/CONTENT.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Content inventory and architecture

## Inventory (VERIFIED, `evidence/data/object_counts.json`)
137 object types in `MelvorBase.json` (object totals; the game loads only what each entity's `EntityConfig` lists, see below). Largest: MasteryGuildTask 3 403, Item 1 811, ArtisanRecipe 723, ShopPurchase 499, AgilityObstacle 370, AstrologyNode 280, AstrologyStarNode 240, Attack 198, Enemy 192, MasteryGuildRank 175, ToolbeltSlot 175, RecipeSubcategory 173, RanchingAnimalVariant 165, ToolbeltSlotType 157, HerbloreRecipe 155, MasteryGuildBonus 150, ItemUpgrade 124, AstrologyObservationEvent 86, CookingRecipe 77, HuntingAnimalSpecies 71, CombatArea 64. Skill recipes: Woodcutting 22, Mining 28, Fishing 24, Firemaking 27, Cooking 77, Herblore 155, Thieving 44, Farming 49 (+47 plots). Quests 37, NPCs 35, Pets 36, Prayers 41, Spells 48, Dungeons 14.

Wired through `EntityConfig` (what the components read): quests 17 of 37, Mastery Guild tasks 3 251 of 3 403 (unwired: Ranching 94, Farming 17, Smithing 14, others), pets 25 of 36 (no `*MasterPet`), combat areas 40 + 14 dungeons of 64 area objects, imbuements 16 of 32, shop purchases 461 of 499, agility obstacles 333 of 370, NPCs 33 of 35.

## Architecture
- **One JSON package per namespace** (`Namespace: MelvorBase`) with `Objects` (typed lists keyed by type name), `EntityConfig` (per-entity wiring: which recipes, categories, guild tasks, toolbelt slots, statistics belong to each skill), and modifier description tables (`GlobalModifierDescriptions`, `ComponentModifierDescriptions` 318).
- **Typed references**: every reference is a namespaced id (`MelvorBase:NormalLog`); polymorphic fields carry `{"Type": "MelvorBase:<DataClass>", "Data": {…}}` and are resolved to C# classes registered with `[DataClass]` (goals, triggers, conditions, formulas, rewards).
- **Requirements are data**: level gates are `{"Type": "MelvorBase:Level", "Data": {"Component": {"Entity": "MelvorBase:Woodcutting", "Component": "Experience"}, "Level": 1}}`, the same mechanism as quest and rank requirements.
- **Localisation**: gettext `.po` files (en_GB 2.6 MB, zh_CN 2.2 MB, fr stub); strings in the package are English defaults with `DisplayName` fields; plural forms for items (`Singular`/`Plural`).
- **Authoring**: the shipped binary contains a full data editor (forms per type), and `DataEditor/assetListing.json` lists the assets it can reference; that the shipped JSON is the editor's output is an INTERPRETATION.
- **Extraction**: `research/tools/godot-pck/godot_pck.py` lists and extracts the embedded pack; `tools/build_dataset.py` flattens 32 gameplay types to CSV.

## Observations
- The data package is the most complete "design document" in this research set after Koltera: everything from formulas-by-type to quest dialogue is in one schema'd file, including unfinished content that is present but not wired (unused quests, master pets, guild tasks).
- Alpha placeholders: `missing_artwork` icons, repeated "This is a custom description for a custom task" text on guild tasks, an "ALPHA TEST ONLY" shop item.
