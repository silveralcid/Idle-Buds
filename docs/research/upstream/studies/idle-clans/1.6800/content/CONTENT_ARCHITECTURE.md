> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/idle-clans/1.6800/content/CONTENT_ARCHITECTURE.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Idle Clans — Content Architecture (VERIFIED)

## Inventory (from `game-data`, config version 483)
- **1 009 items** (646 category-0 materials/misc, 573 equippable across 16 slots), fields for every combat bonus by style, `AttackInterval`, `TwoHanded`, `WeaponType/Class`, potion/consumable effects, enchantment links, loc keys, trade flags, market buy limits, mastery-cape type.
- **318 skilling tasks** in 16 skill collections (grouped into pages by `CustomId`/`SortOrder`), **80 monsters** in 10 areas with full stat sheets and weighted loot tables (738 loot rows), **234 quests**, **49 + 21 upgrades**, **6 clan houses**, **99 shop entries**, **11 potions**, **3 raids**, **3 clan bosses**, **5 exterminating experts**, **245 achievements**, **5 holiday events**, minigame loot tables, 83 shared settings, 8 client settings.
- **5 690 localization keys × 23 languages** (English, Spanish, Finnish, German, Japanese, Portuguese, French, Italian, Korean, Turkish, Polish, Chinese S/T, Russian, Thai, Ukrainian …) as a single CSV TextAsset.
- Art: ~1 500 sprites (items, monsters, UI), 37 audio clips, two UI scenes (~31 k MonoBehaviours), no 3D.

## Delivery model
Everything numeric lives in MongoDB documents served by the game server and mirrored by the public API; the client holds the schema (C# classes under `Databases.*`, `IdleMMOServer.Scripts.Shared.*`) and the art/loc. A content patch = new document version (`ConfigVersion`) + optional sprite/loc update; balance hot-fixes need no store release. Identity is by integer `ItemId`/`TaskId` (append-only; `Discontinued`/`Unobtainable`/`Hidden` flags instead of deletion), which keeps old saves and market history valid.

## Patterns worth copying
- Weighted loot entries with `CanBeRemovedFromDropTable` + `RemoveFromDropTableAtLevel` (tables thin out as you level — RuneScape-style "level-locked drops").
- `IdentifiableType` + `IsSymbolTask` + `CustomIconId` so a generic task renderer covers 16 skills.
- Loc keys on every entity; English strings are never in data documents.
- Per-game-mode exclusion lists on content rows rather than forked tables.
- Debug command catalog shared between client and server with parse rules — one source of truth for tooling.
