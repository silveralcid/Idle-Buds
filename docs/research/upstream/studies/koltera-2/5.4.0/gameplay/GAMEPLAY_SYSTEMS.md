> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera-2/5.4.0/gameplay/GAMEPLAY_SYSTEMS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Gameplay systems

All rules VERIFIED from `evidence/source_reconstructed/` unless marked; numbers from `evidence/data/` and `simulations/k2_model_output.txt`.

## Core loop
The player runs **one** gathering activity at a time (6 skills × 12 activities on one shared ladder) and up to three crafting queues (Furnace, Workbench, Stove). Gathered and crafted items pay for **summoning 120 creatures** (6 tiers × 20). Creatures then work in five places at once: as **helpers** on any gathering activity (speed set by the creature's job value for that skill), in the **sanctuary** (8 slots whose summed job values give per-skill tiers), on **expeditions** and **dungeons** (stat-weighted party scores), and **assigned to machines** (required to run them). Creatures assigned to machines (and, once awakened, to the sanctuary) gain 0.5 XP/s. At level 70 a creature can be **awakened** (level resets, +1 awaken point, +1 gold/min forever); awaken points buy the 120-node **Awaken Tree**. Awakened creatures at 120 can be **prestiged** for prestige points, which **Fabrication** turns into a trickle of chosen items.

```
 gathering (6 skills) ──items──► workstations (3) ──refined──┐
      ▲   ▲ yield/xp/speed                                    ▼
      │   └── sanctuary tiers ◄── 8 creatures' job values   summoning (120 species)
      │        helpers ◄───────── creatures ◄────────────────┘
      │                             │  levels: idle 0.5 XP/s, helpers, expeditions, dungeons
 awaken tree ◄── awaken points ◄── awaken at L70 ──► +1 gold/min ──► gold
 (120 nodes)                         │
                                 prestige at L120 ──► fabrication (items every 180 s)
 gold ◄── merchant sales, task board, garden gold flowers, milestones ──► machines, garden rocks, containers, potions
```

## Systems
### Gathering (Chopping, Mining, Digging, Exploring, Fishing, Farming)
Twelve activities per skill unlocked at levels 1–90, sharing one progression table (xpRate 2 → 220, duration 8 → 45 s). Each cycle rolls every output independently: the main resource at 100 %, then the skill's three "universal" drops (e.g. Mining: dirt, relic, crate; Chopping: leaf, feather, pouch) at 20 / 10 / 1 % × duration/8. The rare third drop is a **container** holding that skill's **charm**, the currency every summon needs. Level cap 99 on a RuneScape-identical XP table.

### Workstations and crafting
Furnace (51 recipes, level ≤ 60), Workbench (61, ≤ 80), Stove (32, ≤ 90): 144 recipes over 48 output items, several input variants per output (e.g. coal from twig ×4 → 1, or from logs ×4 → 2–5). Jobs queue; ingredients are taken at queue time; items complete one by one over `craftTime × amount`. Awaken-tree upgrades add XP, speed and an ingredient-recovery chance (up to 30 %, per crafted item, returns the full recipe). Workstation tools have a **speed mode** toggle: +2 %/level speed instead of +5 %/level XP.

### Tools
Eleven tools, ten levels each, +5 % XP per level, costing 50 → 500 bars of increasingly rare metal: axe, pickaxe, machete, shovel, fishing pole and pitchfork boost their gathering skill; hammer, saw and knife boost Furnace, Workbench and Stove; the sword boosts expedition creature XP and the staff boosts every helper's creature XP.

### Creatures and summoning
120 species, exactly 20 per tier 0–5 and 19–21 per main job (one "All" creature, Moss). Stat totals rise from 41 (T0) to 388 (T5), job totals from 1.6 to 30.9. Summoning consumes a fixed basket per tier: the skill's charm (5 → 800), a gathered resource (100 → 30 000), and from T1 up expedition drops, refined goods, essences/stones and, at T4–T5, dungeon runes. Each species can be owned once (the sanctuary and helpers refer to species ids). Levels follow `50·L²`; cap 70, 120 after awakening.

### Helpers
Any owned creature can be put on any gathering activity. Its cycle is the activity duration × `10^((10 − job)/9)` (job 10 = ×1, job 0 = ×12.9), reduced by the same sanctuary/upgrade duration bonuses, and it earns 0.40–0.95 creature XP/s (higher on later activities) scaled by the skill's XP bonuses. Loot gets the full yield bonus. There is no helper cap: every owned creature that is not in the sanctuary, on an expedition or in a dungeon can help, on any activity the player has unlocked (a `getHelperSlots()` helper exists but nothing calls it; the reducer itself does not check ownership or machine assignment, the UI does). Helpers are the main parallelism: all 120 on their best job equal about 56 players, so each summon speeds up the next one.

### Sanctuary
Eight slots, **awakened creatures only** (so it opens with the first awaken point and fills slowly). For each gathering job, the sum of the slotted species' job values divided by 60 gives a tier at 10/30/50/70/90 % (6/18/30/42/54 points). Tier 1 +40 % XP, tier 2 −10 % duration, tier 3 +80 % XP, tier 4 −10 % duration, tier 5 +1 yield. Best eight for a single job reach 73–75 points; three jobs can be tier 5 together; the best all-round lineup is 5/4/4/4/4/4 (the job-point budget caps the tier sum at 25 of 30).

### Expeditions
20 expedition types, each with a base rating, base XP, trait, biome and stat weights; 5 tiers per type (difficulty ×1–×3, XP ×1–×1.8, loot ×1–×5); a type unlocks at a **total** completion count (0 → 3 000) and its tier t at 5/10/15/20 completions of tier t − 1 of that same type. Up to 3 creatures. Party score = stat·weight·level per creature, ×1.5 if the biome favours its type, ×0.5 if it disfavours it, ×1.5 for a matching trait. Score never decides success: it scales the trip from 60 to 5 minutes. Expedition type 1 has a base rating of 1, so it always takes 5 minutes and is the best early creature-XP source (1.0–1.8 XP/s solo by tier). Looping a trip adds +1 % XP per 10 loops (max +20 %). Note: type 14 requires 300 completions, below type 13's 700 and equal to type 10's, which looks like a data-entry slip for 900 (HYPOTHESIS about intent; the value itself is VERIFIED).

### Dungeons
Five tiers, 15 minutes, up to 3 creatures, a combat or gathering focus (combat weights power/grit/agility/smarts 0.25 each; gathering weights smarts/looting/luck 0.33). The party score over the tier rating (2 000 × tier) gives grade S/A/B/C/F with reward multipliers 2/1.5/1/0.5/0.25. Each run consumes one armor set per creature (refunded only if cancelled). Rewards: dungeon runes, hide, meat, eggs (combat) or large stacks of the skill's resources (gathering), plus a flat 450 × tier creature XP each. Tier-4/5 summons need 48 000 runes in total, i.e. at least 2 000 S-grade tier-5 runs.

### Machines
Nine buildings costing 100 000–800 000 gold: three generators (stone quarry, stick finder, coal miner) and six processors (smelter, sawmill, cooker, greenhouse, bakery, refinery) that run a chosen recipe or "smelt all". Each needs an assigned creature (which also levels at 0.5 XP/s). Ten upgrade levels cut the interval to 0.28× (60 s → 16 s, 120 s → 33 s) for 100–1 000 bars plus planks per level.

### Garden
A 5×5 plot starts as 25 rocks; clearing costs 750 → 50 000 gold (307 532 total). Flowers (fire, water, wind, earth, gold) yield their essence or gold every 60 s equal to their level (1–6); levelling costs fertilizer equal to the current level.

### Awaken Tree
120 nodes, 1 awaken point each, laid out on a grid with prerequisites: Gathering (72: per skill XP I–VI to +60 %, duration to −20 %, yield +2), Workstation (33: XP to +50 %, speed to +60 %, recovery to +30 %), Gold (15: merchant discount, sellable gold, awaken gold). Exactly one point per species, so buying the whole tree means awakening every creature once. A reset potion (250 000 gold, 1/week) refunds it.

### Fabrication
Prestige points (one per prestige of an awakened L120 creature) are allocated to items, up to 5 per item; every 180 s each item yields its point count.

### Economy hubs
Merchant (buy containers, flowers, potions; sell "sellables"; weekly limits on potions), Task Board (8 deliveries, 2 per tier, 50–400 items for 2 000–16 000 gold, 20 h cooldown each), Milestones (3 tracks × 10: creatures owned 12 → 120 for 20 000 → 200 000 gold; items discovered 19 → 192 for bars; total skill levels 90 → 891 for workstation tools).

### Onboarding and meta
A 10-step tutorial ("Getting Started" … "Expedition Assignment") unlocks tabs in order: Chopping → Summoning → Garden → Workbench + Mining → Furnace → Stove → Task Board + Merchant → Expeditions → the remaining four skills, Awaken Tree, Tools, Milestones, Machines and Dungeons. Other tabs unlock from state (first item, first creature, first flower, first awaken point). Collections (Beastiary, Item Codex), 18 Steam achievements, Statistics. Commented-out navigation shows cut content: Gauntlet, Player Handbook and seven mini-games (Dirt to Riches, Fishing Docks, Dig Sites, Supply Run, Battle Pit, Bank, Mana Shrine).

## Design and psychology
- **One spine, many parallel lanes.** Every system ends in "more creatures" or "more awaken points", and creatures are the workers of every other system. This is the sequel's main structural change from Koltera 1, whose 13 systems deposited into a 492-cell collection grid: Koltera 2 has a 120-species roster that is simultaneously the collection, the workforce and (through awakening) the upgrade currency.
- **Allocation is the decision space.** One player activity, three queues, eight sanctuary slots, three-creature parties and machine assignments all draw on the same 120 creatures, and each creature has a fixed job profile. The sanctuary maths guarantees a real choice (three jobs at tier 5, or five at tier 4 and one at tier 5, never all six).
- **Few failure states.** Expeditions only get faster with better parties and crafting recovery only refunds; dungeons grade instead of failing, but an F grade still burns the armor sets and pays 0.25×. Losses are small and mostly time.
- **Flat additive bonuses that compound through time.** Four player XP sources add (max +255 %, ×3.55; helpers have four sources up to +280 %), two duration sources add (−40 %), and yield is a flat +3 per gathering drop. Because base yields are 1, the flat +3 is a 4× multiplier on gathered items, the largest single multiplier on item output, and it also multiplies charm income; only gathering (player and helpers) receives it.
- **Long, visible gates.** L70 awakening (38 h on the best solo expedition loop, 136 h on a machine), 120 awakenings for the tree, 30 000-item T5 summons behind L90 skills. Progress bars are always moving thanks to helpers, expeditions and machine XP; the long poles are designed for weeks of play (HYPOTHESIS about intent).
- **Steady rewards for collection breadth.** Milestones pay every 12 creatures, 19 items, 90 total levels; the tree pays per species awakened. Breadth over depth is rewarded explicitly.
