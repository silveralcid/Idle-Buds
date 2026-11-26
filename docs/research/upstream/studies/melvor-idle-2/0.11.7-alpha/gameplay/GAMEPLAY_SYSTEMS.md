> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle-2/0.11.7-alpha/gameplay/GAMEPLAY_SYSTEMS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Gameplay systems (0.11.7 alpha)

From `MelvorBase.json` (counts) and the decompiled code (rules); VERIFIED unless marked.

## Skills and systems
25 skill entities: gathering (Woodcutting, Mining, Fishing, Farming, Ranching, Hunting, Thieving, Agility, Astrology), artisan (Firemaking, Cooking, Smithing, Crafting, Fletching, Runecrafting, Herblore, Beastcrafting), combat (Attack, Strength, Defence, Hitpoints, Ranged, Magic, Prayer, Slayer); plus Quests (17 wired of 37 quest objects; 33 of 35 NPCs wired), Shop (461 wired of 499 purchases), Bank (tags, stack limit), Completion Log, Statistics, Time and Weather.

| System | What changed from Melvor Idle 1 |
|---|---|
| Woodcutting | trees have **health**: each 1 s hit deals 1 damage (weak spots, double damage and instant cuts as modifiers); log and XP only when the tree falls; "overgrowth effects"; 22 recipes incl. bushes and quest objects |
| Mining | **chance with a cap**: each hit breaks the rock with chance p, otherwise progress accumulates by p, so the rock always breaks within ceil((0.9999 − m)/p) hits (m = minimum prospecting, default 0); shatter (×3 ore, ×2 XP), stone/essence side drops |
| Fishing | locations with swimming-fish sprites; fish chance per catch, junk otherwise, special products |
| Thieving | NPCs, stalls and heists with perception, damage, **stages** (up to 30; XP only when the last stage completes) and distractions (36) |
| Farming, Ranching, Hunting, Beastcrafting | new animal husbandry (20 animals, 165 variants, 53 enclosures), hunting (44 animals, 71 species, traps, tools, journals with their own XP curve) and a crafting skill for animal products |
| Agility | techniques (5, own XP curve, cap 40), 10 locations, 370 obstacle objects (333 wired) and 38 courses with paths; obstacles have difficulty, damage and traps |
| Astrology | 12 constellations, 280 nodes + 240 star nodes, observation events |
| Combat | accuracy vs evasion per stance; resistance from protection vs power (cap 70 % before the combat triangle); elements, ward, armour, lifesteal; 192 enemies, 40 wired combat areas + 14 dungeons (64 area objects), 41 prayers, 48 spells in 3 spellbooks, 16 wired imbuements (32 objects), area darkness that lowers the player's accuracy and evasion, 10 slayer masters; turn/stack/charge/bleed effects |
| Mastery | per-action mastery replaced by the **Mastery Guild**: 3 251 wired tasks (3 403 objects) in six difficulty bands (Novice 1 → Expert 12 points) award points; seven ranks per skill at 0–100 % of points; rank bonuses (e.g. +10 % skill XP) |
| Toolbelt | 175 slots of 157 types in 11 categories hold tools and consumables per skill |
| Pets | 25 wired pets (36 objects), each an XP-proportional chance, one expected per 13.03 M XP; the 104.3 M-scale master pets are unwired |

## Core loop
Same shape as Melvor Idle 1 (one active action per tick, items to a bank, skills feeding each other, GP from selling), with three additions: quests that script goals and dialogue around skills, the Mastery Guild as a goal list per skill, and longer per-action interactions (tree health, rock progress, heist stages) that turn single rolls into short sequences.

## Design and psychology
- **Variance with a ceiling.** Mining's "break chance or progress" turns a geometric wait into a bounded one (and shortens the mean); base tree health is deterministic, so woodcutting time per log is fixed apart from weak-spot and similar modifiers.
- **Goals as content.** 3 251 wired, data-defined tasks give a constant supply of small targets (cut 200 Normal trees, then 2 500…), replacing Melvor 1's numeric mastery levels with legible objectives (INTERPRETATION).
- **Action-speed-neutral rewards.** Pets roll on XP gained, not on action count, so speed upgrades do not change pet odds per XP.
- **Ambient world state.** Time of day (default: an accelerated cycle of 30 game seconds per real second, a 48-minute day starting at 08:00; alternatively the system clock or a fixed hour) and weather are hooks for conditional bonuses and events (`TimeAndWeather.Triggers`).
- Alpha status shows: placeholder art and descriptions, "ALPHA TEST ONLY" bank slots, generic task text.
