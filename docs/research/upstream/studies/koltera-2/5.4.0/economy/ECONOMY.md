> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera-2/5.4.0/economy/ECONOMY.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Economy

Closed single-player economy, no trading, no premium currency, no real-money purchases in the build (VERIFIED: no store or IAP code in the renderer or main process).

## Currencies
| Currency | Sources | Sinks |
|---|---|---|
| Gold | merchant sales (54 sellable items, 2–600 gold; prestige points sell for 10 000 and Braymen's letter for 5 000), task board (2 000–16 000 per delivery, ≤ 60 000 per 20 h), gold flowers (level gold per minute), awakened creatures (1 + gold upgrades per minute each), creature milestones (20 000 → 200 000, 1.1 M total), backpacks (100 gold at 50 %) | machines (3.2 M for all nine), garden rocks (307 532), containers (3 000), charm crates (7 500), armor crates (10 000), flowers (2 500), fertilizer (1 250), basic inputs (50–150), potions (task-board reset 40 000 ×7/week, offline-progress 100 000 ×3/week, awaken-tree reset 250 000 ×1/week) |
| Charms (6, one per gathering skill) | the skill's container (1 each, 100 %), charm crates (4 × each type at 25 %), story rewards | summoning (5 → 800 per creature, 30 596 total) |
| Awaken points | 1 per creature awakened (120 possible) | Awaken Tree nodes (1 each, 120) |
| Prestige points | 1 per prestige of an awakened L120 creature (repeatable) | fabrication allocation (≤ 5 per item), or sold for 10 000 gold |
| Essences and stones | garden flowers (raw), refinery machine and workstations (pure, stones, infinity stones) | summoning (128 raw / 64–128 pure / 32 stones / 16 infinity stones per creature by tier) |
| Dungeon runes | dungeons (2–12 per combat run by tier, × grade) | tier 4–5 summons (600 / 1 800; 48 000 in total) |
| Armor sets | armor crates (10 000 gold; armor set at 10 %, plus helmet/chestplate/boots), crafting | one per creature per dungeon run |

## Flows and multipliers (model)
- **Yield is the largest item multiplier.** Every gathering drop (player and helpers) gets a flat +0 … +3 (sanctuary T5 +1, two yield upgrades +2), and base drops are 1 item, so maxed yield is a 4× multiplier on gathered resources, universal drops and containers; garden, machine, dungeon, expedition and crafting outputs do not get it, and in parallel work most jobs sit at +2. Combined with the 0.6× cycle time it makes 6.7× the base item rate per gatherer.
- **Charm supply is time-locked, not gold-locked.** Containers arrive at a constant 4.5 per hour per gatherer at base (the chance is scaled to duration) and 30 per hour at maxima; the gold route costs 7 500 gold per charm crate, which yields one expected charm of each type (about 41 M gold for the binding Exploring charms). Charms are the single currency every summon shares, so they pace the roster.
- **Helpers are uncapped, so labour scales with the roster.** All 120 creatures on their best job are worth up to about 56 players of throughput (fewer in practice: sanctuary members cannot help); labour stops being the constraint and player skill levels (L60–L90 rungs for tier 3–5 inputs) become it.
- **Gold income tiers**: early ≈ a few thousand per hour (sales, tasks); mid ≈ 9 000/h from a full gold garden (838 782 gold to build, 93 h payback); late ≈ 7 200–43 200/h from 120 awakened creatures (1 → 6 gold/min each).
- **Machines** convert gold into passive throughput: 225 items/h for a maxed generator or the greenhouse (60 s base), 109 conversions/h for the 120 s processors, each requiring an assigned creature (which then levels at 0.5 XP/s while the machine runs).
- **Weekly-limited potions** are the only gold sinks with a refresh cadence; everything else is a one-time purchase or a per-unit container buy.

## Balance observations
1. **Gold sinks are front-loaded, sources back-loaded.** Machines, rocks and flowers cost ~4 M up front, while the largest source (awakened gold) only grows after hundreds of hours. Mid-game gold is therefore the tightest resource for machine buyers; the task board and gold garden act as the bridge.
2. **The tree's gold branch is small.** Merchant discount and sellable bonus top out at 15 % each; awaken gold +5/min per creature is the only gold node that scales with the roster (×6 per awakened creature).
3. **No inflation pressure.** With no trading and fixed prices, there is nothing to inflate; late-game gold piles up once machines and garden are bought, apart from potions and containers.
4. **Fabrication** converts surplus prestige into a trickle (k items per 180 s per item, ≤ 5 points per item = 100 items/h), so prestige is a long-tail optimisation rather than a power spike.
