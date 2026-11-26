> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/legends-of-idleon/build-144/gameplay/GAMEPLAY_SYSTEMS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Gameplay systems

From the client code and its data classes; VERIFIED unless marked. Counts are table lengths in `evidence/data/summary.json` and the CSVs.

## Core loop
An account holds several **characters**. Each has a class, a character level, 20 skill levels, talents, equipment, food and an "AFK target": the monster, ore, tree, fishing spot, bug, kitchen, lab or cave it was left on. The character being played earns full rate; every other character earns **AFK gains** for the activity it was left on, computed when the player next selects it (40 % of the active fighting rate and 52 % of the active skilling rate before bonuses, FORMULAS #14). Playing therefore means rotating characters: claim each one's AFK haul, spend it, set it back to work.

Resources from all characters feed **account-wide systems** (stamps, alchemy, construction, cards, statues, star signs, guild, and one or more new systems per world). Those systems feed bonuses back into every character's damage, EXP, drop rate, AFK rate and skill efficiency through the same few hundred named bonus sources (the `DamageDealed` block alone reads about 150).

## World and system map
Seven worlds (the `DeathNoteMobs` table has seven monster lists); 327 map scenes; 341 monsters and 77 resource nodes (24 ores, 19 trees, 19 fishing spots, 15 bugs). Skills appear in `SkillNames` order; world attribution of systems below follows that order and the world-coded material names; every world row is INTERPRETATION.

| Area | Skills | Account systems (table sizes) |
|---|---|---|
| Character | class level, 25 classes (plus three "basics" placeholder entries) in four lines (Beginner → Journeyman → Maestro → Voidwalker → Infinilyte; Warrior → Barbarian / Squire → Blood Berserker / Divine Knight → Death Bringer / Royal Guardian; Archer → Bowman / Hunter → Siege Breaker / Beast Master → Wind Walker; Mage → Wizard / Shaman → Elemental Sorcerer / Bubonic Conjuror → Spiritual Monk / Arcane Cultist) | 680 talents, 94 star signs, 42 family bonuses (from each class's level, shared by the account), equipment with upgrade slots, 312 cards in 15 sets, obols, 350 quests, 490 achievements |
| World 1 | Mining, Smithing, Chopping | anvil production, 128 stamps (A combat, B skills, C misc), 32 statues, forge, post office, colosseum, bribes (41) |
| World 2 | Fishing, Alchemy, Catching | 140 bubbles in four cauldrons, 87 vials, liquids, arcade (80 upgrades), obols, bug nests |
| World 3 | Trapping, Construction, Worship | refinery and salts (9), 3D printer and towers (27), cogs, salt licks (11), worship tower defence, 25 prayers, 9 shrines, atom collider (17) |
| World 4 | Cooking, Breeding, Laboratory | 74 meals, pets and territories (29), lab chips (22), jewels (24), sigils (24) |
| World 5 | Sailing, Divinity, Gaming | 17 islands, 41 artifacts, captains, 10 gods, gaming upgrades (72), the "holes"/caverns (107 buildings) |
| World 6 | Farming, Sneaking, Summoning | crops (7 seed types), market (16), ninja upgrades (32), jade upgrades (52), summoning upgrades (82) |
| World 7 | Spelunking, Research | spelunking upgrades (68), research grid (240 squares, 64 research items), legend talents (50) |
| Cross-world | — | companions (179, a server-run gacha), weekly boss, tournaments and raids (server), Tome (124 lines), upgrade vault (90), arcane (63) and grimoire (55) upgrades, compass (173), dream challenges (77) |

## How the main loops work (code)
- **Fighting.** Attack interval from weapon speed (FORMULAS #9), hit chance from accuracy vs. Defence (#4), damage roll between mastery × max and max (#5–#6), crit from AGI (#7); monsters respawn per map; kills drop items through drop tables, cards and coins; "kill per kill" multipliers (overkill) count extra kills per kill. Portals to the next map need a kill count on the current one (`MapDetails[map][0]`).
- **Skilling.** Mining, Chopping, Fishing and Catching hit a node at the skill's speed; efficiency divided by the node's Defence sets the harvest chance (23 % at parity, certain only at about 10×, FORMULAS #20), and multi-drop and value bonuses multiply yield. Other skills are menus over the same resources: smithing at the anvil, alchemy cauldrons brewing bubble levels, construction building speed, cooking meals, lab connections, sailing voyages, and so on.
- **Progression of a bonus.** Nearly every upgrade is "level n of something", turned into a value by the shared formula (FORMULAS #2); most are `decay` or `add`. A decay bonus approaches its cap x1 (half at n = x2), so early levels give most of the value and cost little, and the last few percent are where costs (geometric, FORMULAS #16) dominate.
- **Soft caps everywhere.** Damage components are compressed by staged exponents rather than capped (FORMULAS #5); crit and EXP-from-stat curves switch to saturating forms at 1 000 stat.

## Design and psychology
- **A workforce, not an avatar.** Several characters on different targets make the account a small economy; choosing who does what (and which class's family bonus to level) is the strategic layer. Classes matter beyond combat because talents and family bonuses boost skills and the account.
- **Breadth as retention.** Each world adds three skills and several account systems that all multiply each other. Few bonuses are large alone; the game keeps offering one more small multiplier somewhere else, and the sum keeps moving (INTERPRETATION).
- **Login rhythm.** AFK gains are claimed per character on selection and time-based systems (refinery, printer, traps, cauldrons) accrue in the background, which pulls players back to rotate characters several times a day without forcing it (INTERPRETATION).
- **Opaque depth.** Formulas are long chains of named lookups with many hidden terms (a damage formula with about 150 sources, a "kill per kill" multiplier reading about 51 block calls). The game shows the totals in its stat screens, but planning relies on community tools (INTERPRETATION).
- **Soft over hard limits.** Staged soft caps and decaying bonuses avoid walls in numbers that grow to 10³⁰ and beyond (late monsters have 10³⁶ HP), keeping each further order of magnitude reachable but slower.
