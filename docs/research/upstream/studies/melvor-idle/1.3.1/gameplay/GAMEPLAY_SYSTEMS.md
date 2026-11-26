> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle/1.3.1/gameplay/GAMEPLAY_SYSTEMS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Gameplay systems (base game: Demo + Full packages)

Rules VERIFIED from the client scripts; counts from `evidence/data/` (built by `tools/build_dataset.py`).

## Core loop
One active action at a time, chosen from 16 non-combat skills or combat, each advancing on a 50 ms tick. Skills produce items into a bank with limited slots; items feed other skills (logs → Firemaking, Fletching; ores → Smithing; fish → Cooking → food for combat) and sell for GP. Every action also grows **mastery** for that action and a **mastery pool** for the skill, whose thresholds unlock skill-wide bonuses. Combat consumes food, potions and ammunition and drops gear, bones, currency and slayer coins. Passive systems (Farming plots, Township, rock respawns) tick alongside the active action.

```
 gathering (WC, Fishing, Mining, Thieving, Farming, Agility, Astrology) ─► bank ─► artisan (Smithing, Fletching, Crafting, Runecrafting, Herblore, Cooking, Firemaking, Summoning)
        ▲                                │                                         │
        │ mastery, pool, pets, gear      └─► shop / GP / bank slots ◄──────────────┤
        └──────── modifiers ◄── agility course, astrology, township, prayers, potions, summoning familiars
 combat (Attack, Strength, Defence, Hitpoints, Ranged, Magic, Prayer, Slayer) ◄─ food, potions, runes, arrows ─┘ ─► drops, dungeons, slayer tasks
```

## Skills
| Group | Skills (base actions) | Key rule |
|---|---|---|
| Gathering | Woodcutting (9 trees), Fishing (23 fish in 8 areas, 5–29 % junk), Mining (11 rocks), Thieving (23 NPCs), Farming (24 crops), Agility (51 obstacles in 10 course slots + pillars), Astrology (11 constellations) | Woodcutting can cut several trees at once (with the tree-cut-limit modifier) at the slowest tree's interval; Mining rocks have 5 HP, regenerate 1 per 10 s and respawn; Thieving success vs perception with a 3 s stun on failure (by default a stun stops Thieving); Farming plots grow in real time and harvest by growth; Agility builds a course of obstacles (GP and item costs) whose modifiers apply globally |
| Artisan | Firemaking (9 logs), Cooking (32), Smithing (115), Fletching (57), Crafting (57), Runecrafting (84), Herblore (30 potions), Summoning (20 familiars + 90 synergies), plus Alt. Magic (14 spells, part of the Magic skill) | input items per action; intervals 2–5 s fixed by skill, per recipe for Firemaking (2–15 s) and Cooking (2–11 s); doubling and preservation chances from mastery and modifiers |
| Management | Township (54 buildings, 10 biomes, 13 resources, 6 seasons, 6 worships, 110 + 170 tasks) | a city builder ticking passively: buildings consume/produce resources; tasks pay rewards |
| Combat | Attack, Strength, Defence, Hitpoints, Ranged, Magic, Prayer (31 prayers), Slayer (13 slayer areas, 5 task categories) | accuracy-vs-evasion hit chance, max-hit formulas, combat triangle (damage ×0.85–1.10, damage reduction ×0.75–1.25 by style matchup), 95 % resistance cap; 12 combat areas, 17 dungeons, 4 strongholds; 172 base monsters (combat level 1–1 300) |

## Mastery
Every action has a mastery level (1–99, same XP curve). Mastery XP per action grows with the action's own mastery level and with the skill's total mastery, scaled by the number of actions in the skill (so many-action skills like Smithing level each action faster). A quarter of mastery XP fills the skill's pool (half at skill 99); the pool caps at 500 000 × actions and pays bonuses at checkpoints; mastery tokens (chance = unlocked actions/185 % per action) add pool XP. Mastery level unlocks are per-skill data (`masteryLevelUnlocks`, `masteryLevelBonuses`, `masteryPoolBonuses`).

## Combat
Player and monster each have an attack timer (weapon speed, ≥ 250 ms). Each attack rolls hit chance from accuracy vs the target's evasion for that attack type, then damage uniform from min hit (1) to max hit, modified and reduced by resistance (cap 95 %). Monsters have special attacks and passives (`attacks.js`, `combatPassives`), combat effects (stun, burn, poison, slow…) are data-driven templates. Prayer drains points per attack; food auto-eats by threshold; Slayer tasks give slayer coins and access to slayer areas. Dungeons chain monsters with a final reward; strongholds are tiered.

## Meta systems
Pets (62 base, chance per action or kill), shop (201 purchases: Township 57, skill upgrades 41, skillcapes 26, Slayer 26, materials 18, general 14 incl. bank slots and auto-eat, Golbin Raid 14, gloves 5), item upgrades and 23 equipment-pair item synergies, the completion log (items, monsters, pets, mastery), Steam achievements (92), lore books, tutorial island (10 + 12 stages), Golbin Raid (a separate wave minigame with its own tick), gamemodes (current: Standard, Hardcore, Adventure; discontinued: CHAOS and three speedrun modes).

## Expansions (from shipped code only; data not downloaded)
Code for Throne of the Herald, Atlas of Discovery (Archaeology, Cartography: `cartography.js`, `hexMap.js`, `archaeology.js`) and Into the Abyss (Harvesting, Corruption, abyssal realm and abyssal levels with an offset XP table) is present in the client; their content packages load only with entitlements.

## Design and psychology
- **Breadth with interlocks.** Skills are not parallel ladders as in Koltera 2: each consumes others' outputs, so progress in one opens efficiency in another (agility obstacles and astrology add modifiers to everything).
- **Two-speed progression.** Levels (RuneScape curve, a 99 in 134–404 h for one gathering skill at base) and masteries (per action, per pool) give constant small milestones on top of long levels; pool checkpoints are mid-term goals.
- **Predictable timing.** The tick model makes timers exact and offline a replay of online for the actions that keep running, which supports min-max planning (INTERPRETATION).
- **Opt-in difficulty.** Gamemodes (Hardcore permadeath, with a harsher combat triangle and bank slots capped at 88; Adventure, where skills are bought with GP from 10 000 to 500 M over 19 unlocks and non-combat levels are capped at combat level) let the same content serve different player types; older event modes are discontinued.
- **Bank as soft cap.** The bank starts at 20 slots; extra slots cost 34 GP for the first and 5 M each from slot 119; inventory pressure pushes selling, consuming and specialising.
