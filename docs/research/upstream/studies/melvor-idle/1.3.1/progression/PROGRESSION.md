> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle/1.3.1/progression/PROGRESSION.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Progression

| Axis | Range (base game) | Curve | What it gates |
|---|---|---|---|
| Skill level (24 skills incl. combat) | 1–99 (120 with Throne of the Herald; abyssal levels with Into the Abyss) | RuneScape table, L99 13.03 M XP, L120 104.3 M | actions and recipes by level, equipment requirements, skillcapes |
| Mastery level (per action) | 1–99 | same table | per-action bonuses (doubling, preservation, interval) from `masteryLevelUnlocks`/`masteryLevelBonuses` |
| Mastery pool (per skill) | 0 → 500 000 × actions | linear | four pool checkpoints per skill at 10/25/50/95 % (`masteryPoolBonuses`) |
| Combat level | monsters 1–1 300 (base game) | `0.25(Def + HP) + 0.325 × best style` | combat areas, dungeons, slayer areas by requirements |
| Bank | slots bought | 34 GP → 5 M per slot (cap from slot 119) | how many item types can be held |
| Agility course | 10 slots unlocked at Agility 1–90 (slots 11–15 at 100–118 with the expansion) | obstacle costs 1 M median, 20 M max | global modifiers |
| Township | buildings, biomes, worship, seasons | resource economy | modifiers and rewards |

## Pacing (`simulations/melvor_model_output.txt`)
- **One gathering skill to 99 at base rates**: Woodcutting 404 h (one tree), Fishing 175 h (junk included), sustained Mining ≈ 320–340 h. Base XP/h for top gathering actions: Woodcutting 43 000, Fishing 106 000, Mining ≈ 17 000–19 000 sustained at base rock HP, Thieving ≈ 16 500 at the top NPC. Artisan rates range from 29 500 (Summoning) to 900 000 (Smithing) and are limited by inputs.
- **Mastery** per action takes ~8.5–92 h to reach 99 depending on how many actions the skill has and its mastery interval; total mastery effort is roughly equal across interval-based skills (~790 h sequential) but higher for artisan skills with fixed short mastery intervals (≈ 930–1 210 h).
- **Combat** pacing is set by hit chance (continuous, 50 % at equal accuracy and evasion) and max hit; late areas and dungeons need specific gear, prayers and potions rather than levels alone.
- **Offline** replays online for non-combat actions up to 24 h (combat only with the opt-in setting), so pacing is calendar time × active choices, not attention time.

## Gates and walls
1. **Inputs**: the high-XP artisan skills (Smithing, Runecrafting, Fletching, Crafting, Herblore, Cooking) run 3–20× faster than gathering, so they are bottlenecked by gathering or by GP to buy inputs; Firemaking and Summoning are not faster.
2. **Bank slots** grow from trivial to 5 M GP each; the first 100 slots total 37.5 M GP, 200 slots 509 M.
3. **Agility course** costs millions per obstacle late, and its modifiers are among the strongest global bonuses.
4. **Dungeons and slayer areas** require equipment and item effects (e.g. area requirements in `entryRequirements`), making combat gear progression a separate spine.
5. **Expansions** raise caps to 120 (`skill.js` 203) and add abyssal levels, a second ladder on top of 99 (INTERPRETATION of the design).

## Comparison
Koltera 2 and Melvor share the exact level table up to 99, but Melvor adds per-action mastery on the same curve, a second meta-ladder (pools), and cross-skill input chains; Koltera 2 replaces input chains with creature labour.
