> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera-2/5.4.0/progression/PROGRESSION.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Progression

## Axes
| Axis | Range | Curve | Gate it opens |
|---|---|---|---|
| Skill level (9 skills) | 1–99 | RuneScape table (L99 = 13.03 M XP); XP keeps counting without limit | activities at 1/5/10/15/20/30/…/90; recipes to 90; milestones every 90 total levels |
| Player level | 1–99 | floor(mean skill level) | +0.25 % XP per level (+25 % at 99) |
| Creature roster | 0–120 species | fixed tiered costs (gathered input ×10, ×5, ×2, ×2, ×1.5 per tier) | sanctuary tiers, helpers, parties, machines, creature milestones every 12 |
| Creature level | 1–70, 1–120 awakened | 50·L² | awaken at 70 (+1 awaken point, +1 gold/min); prestige at 120 (+1 prestige point) |
| Awaken Tree | 0–120 nodes | 1 point each | the permanent multipliers (XP, duration, yield, workstation, gold) |
| Expedition completions | 0–3 000+ | total count; per-type tier counts | the 20 expedition types (by total); tier t of a type after 5/10/15/20 completions of its tier t − 1 (`UNLOCK_REQUIREMENTS`, `isTierUnlocked`) |
| Tools | 0–10 × 11 | bars 50 → 500 | +5 %/level XP (or +2 %/level workstation speed) |
| Machines | 9 × L0–10 | 100–800 k gold, then bars+planks | 0.28× interval at L10 |
| Garden | 25 rocks, flowers L1–6 | 750 × 1.191232ⁿ | essence and gold income |

## Pacing (model, `simulations/k2_model_output.txt`)
- **One skill to 99**: 1 125 h at the in-game minimum bonus (about 1 098 h for a first skill), 191–204 h with every other bonus maxed (191 needs player level 99, i.e. every skill at 99). Level 50 at 33 h / 6 h. Nine skills × that is the long tail; player level, sanctuary and the tree compress it by up to 5.9×.
- **Creature levels**: L70 in 136 h on a machine, 72 h as a base helper on a top activity (170 h on a first-rung one), 19 h as a maxed helper, ~38 h on a solo tier-5 run of expedition type 1 (1.8 XP/s; reached after 50 runs). The sanctuary accepts only awakened creatures. With no helper cap, the whole roster can level in parallel while gathering, so the 120 awakenings needed for the tree are bounded by the slowest creatures rather than by slot count.
- **Summoning**: gathered inputs grow 10×, 5×, 2×, 2×, 1.5× per tier (100 → 30 000) and the basket widens (charms, expedition loot, refined goods, essences, dungeon runes). Player-only gathering for all inputs would be 13 101 h base; every summoned creature is also a new helper, so labour stops being the constraint (a labour-only snowball estimate is ~583 h base). The real pace-setter is level gates: tier-3 to tier-5 inputs come from the L60–L90 rungs, helpers can only work unlocked activities and give no player XP, and L90 in all six gathering skills is ~4 040 h base / ~700 h maxed. The roster is both the goal and the engine, but player levels set the speed.
- **Gold**: early gold comes from merchant sales (54 items have a sell value; apart from prestige points at 10 000 and Braymen's letter at 5 000, the top is 600 for carrot cake) and the task board (60 000 gold per 20 h at most); mid game adds gold flowers (up to 9 000/h) and creature milestones (1.1 M total); late game adds awakened creatures (1–6 gold/min each, up to 720/min with all 120 and the gold upgrades).

## Gates and walls
1. **Tutorial ladder** (10 steps, minutes each) unlocks tabs in sequence; the last step opens the remaining four skills, the tree, tools, milestones, machines and dungeons at once.
2. **Charms**: each summon needs 5–800 of the skill's charm and charms only come from containers (1 % × duration/8 per cycle, or 3 000 gold each, or charm crates). 30 596 are needed in total; the yield bonus is what makes this affordable (4 containers per drop at +3).
3. **Level 70 awakening**: the first awaken point (the tree's currency, and the trigger that unlocks the Sanctuary and Fabrication tabs, consistent with the sanctuary accepting only awakened creatures) needs one creature at 245 000 XP. Before it, XP comes from helpers (0.40–0.95 XP/s base), expeditions (type 1 solo: 1.0 XP/s at tier 1, 1.8 at tier 5 after 50 runs), dungeons and machines (100 000 gold); the fastest path is about 1.5–3 days of looping expedition type 1, online or offline. The sanctuary's XP bonuses arrive only after this first wall, and full tier-5 lineups need eight awakened tier-4/5 creatures.
4. **Tier 4–5 summons** need dungeon runes (600/1 800; 48 000 in total), which only dungeons give (2–12 per run by tier, ×grade), and each run costs an armor set per creature: at least 2 000 S-grade tier-5 runs for the last 40 species.
5. **Expedition type 14** unlocks at 300 total completions, earlier than type 13 (700); probably a data slip for 900.

## Comparison with Koltera 1
Koltera 1 put every system behind a Trainer level reached by L9 in 1–2 hours and used cubic creature XP (`L³`); Koltera 2 replaces that with a tutorial chain plus state unlocks, a quadratic creature curve (50·L²) with a hard 70 gate, a RuneScape skill table, and an explicit prestige layer (awaken → tree; prestige → fabrication). The collection goal moved from a 492-cell variant grid to a 120-species roster that is also the workforce.
