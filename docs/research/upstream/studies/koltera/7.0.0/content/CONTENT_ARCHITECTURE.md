> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/content/CONTENT_ARCHITECTURE.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera — Content Architecture (VERIFIED)

## Content inventory
- **41 species** (4 Starter, 11 Common, 11 Uncommon, 11 Rare, 4 Legendary); 4 elemental types (10–11 each); 3 learning speeds; Total_Skillpoints 350/400/450/550–850 by rarity. Most same-rarity species are stat clones (e.g. all Commons 70/70/70/70/70 except 3) — differentiation is mostly art + learning speed, not numbers.
- **11 minerals** = 11 augment variants ⇒ 41 × (1 + 11) = **492 collectible variants**, each a separate PNG (`Fable_<Name>_<Mineral>.png`).
- **12 locations**, each a JPG + 4 species + level band + loot table (in code).
- **12 spirits** (natures): symmetric 4 stats × 3 negatives each; Health is never affected.
- **23 Legacy upgrades**, **12 gardening tiers**, **4 staffs + 1 magic staff**, **9 explore resources + 4 gems + 5 potions**, **41 achievements**.

## Data-driven vs hard-coded
Data files cover the *nouns* (species, rocks, upgrades, locations, spirits). The *verbs and prices* (breeding costs, augment formula, loot rolls, gardening tiers, soulstone costs, spells, specializations) are literals inside controllers/views. Adding a species = 1 JSON row + 12 PNGs + optional location entry; adding a system = a new file in `Controllers/` (auto-registered by `require.context`) + a View + a `Game.js` tab + an unlock flag in `DefaultState`/`Settings.js`.

## Asset pipeline
- Images are `import`-ed via webpack `require.context('assets/images', true, /png|jpe?g|gif|svg|webp/)`, so every asset is content-hashed into `static/media/`; lookups by convention string (`Images.get(path)`).
- Vibrancy uses CSS `filter: grayscale(v%)` — one sprite covers 16 visual states.
- A single MP4 loops behind the main menu; no audio assets at all.
- Localization: **none** (English strings inline in JSX; Chromium `locales/*.pak` are just Electron's).

## Dependencies between content
Species → Locations (which can be *trained*), → Trader pools by rarity, → Soulstone costs by rarity, → Breeding/augment costs by rarity. Minerals → mining rocks, augment names, explore loot per location, augment cost index. A naming mismatch anywhere (e.g. `Mineral_Opal.png` exists in assets but "Opal" is not in Minerals.json) silently becomes unused content.
