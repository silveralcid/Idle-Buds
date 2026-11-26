> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/gameplay/GAMEPLAY_SYSTEMS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera — Gameplay Systems Breakdown

All rules below are **VERIFIED** from recovered source unless marked otherwise. File references are to `evidence/source_reconstructed/components/`.

## 0. The creature ("Fable") — the atom of every system  (`Controllers/Creatures.js`)

A creature instance = `{ id(uuid), fable(species), augment('' | one of 11 minerals), vibrancy(0..80, lower is better), spirit(1 of 12), gender, genetics{5 stats 1..100}, trained{…}(unused), experience, vitals{health}, favorite, nickname }`.

- **Level** = `floor( (exp / learningMod)^(1/3) )`, capped 100 (25 in demo). `learningMod` = 0.75 Fast / 1 Medium / 1.25 Slow. XP to level L = `learningMod·L³`.
- **Effective stat** = `floor( ((3·base + genetic^1.3) · level · 0.5)/100 + 5 )`, then spirit ×1.2 on one stat, ×0.8 on another. Genetics therefore matter less than species base (3× weight) but with a super-linear 1.3 exponent; at genetics 100 vs 50, the `genetic^1.3` term is 398 vs 161 — comparable to one species tier.
- **Max HP** = `floor( 0.01·(base + 0.75·genetic) · level + level + 10 )`.
- **Genetics rating** = mean of the 5 genes (%). "Perfect" = rating 100 and vibrancy 0.
- **Vibrancy** on creation = `5·floor(rand·16)` capped 80 → uniform over {0,5,…,75} (80 unreachable from the RNG; 0 has 1/16 chance). Rendered as `grayscale(vibrancy%)`; mechanically it feeds collection-log credit, trader requirements (≤40/≤30), breeding inheritance and the (dead) Global Bonus.
- **Collection Log ("diary")** stores best vibrancy per (species, augment). **Win condition**: `diary.length ≥ 41 × 12 = 492` → `state.completed` → GameComplete screen (with "continue" option). `timeTaken` counts ticks until completion.
- **Global bonus** = `(1 + Maximization) · Σ(80 − vibrancy)/(80·492)` — computed but referenced by no system in this build (the `Maximization` upgrade no longer exists). **VERIFIED dead code.**

Storage cap: `25 + 125 × FableCapacity level` (max 50 levels → 6,275).

## 1. Mining — the money engine  (`Controllers/Mining.js`, `Views/Game/Mining/*`)

Inputs: crew of creatures (base 2 slots, +2 per Recruitment level, max 12), each assigned one of the **unlocked** rocks and an optional auto-sell flag.

**Rock unlock ladder (pickaxe)**: only rocks with index ≤ `mining.pickaxe` are selectable (Mining and Augmenting). The next rock costs coins from `Pickaxes.json`: 500, 1 000, 4 500, 32 000, 86 233, 221 149, 551 217, 1 351 176, 2 633 394, 5 000 000 → **10 881 169 coins** to open Harmonium. This is the early/mid-game coin sink and the gate on which augments you can even make.

Per tick per miner:
1. If rock `percentLeft ≤ 0`: rock breaks → yield `ceil(rand·(Prospector+1))` minerals (mean (P+2)/2), XP `rock.XP · (2 if augment matches rock) · (1+0.25·ExperiencedMining)`, player XP += 5 % of that; coins if auto-sell `= minerals · Value · (1+0.25·Charisma)`.
2. Else if resting (`staminaLeft ≤ 0` → `refreshing`): stamina += `5 + 3·Athletics` until 100.
3. Else swing: `damage% = ceil( ((Atk/400·48 + 5)^1.6 / rockHP) · 30 · (1+0.25·BiggerSwings) · augmentBonus(2|1) · magicBonus )`; stamina −= `((1 − Sta/550)·2)³`.

Design properties (see `mathematics/FORMULAS.md` §1 for numbers):
- Rock `Value/Health` is nearly constant (0.12 → 0.08), so **rock choice is about XP (1.6 → 13.6) and augment matching, not coins**. Income per miner converges to ~5–7 coins/s at L100 regardless of rock.
- Damage one-shots low rocks early (Topaz 157 %/tick at L50), so **stamina is the true throttle**: a swing costs ~2.5–3.1 stamina, so a miner works ~35–40 swings then rests ~20 ticks. Athletics (+3/tick each, max +15) is therefore a ~2× income upgrade late — far better than its description suggests.
- Minerals are also the **currency for Augmenting**, creating a sell-vs-hoard decision.
- `priceChange`/`sellInfluence` market-fluctuation fields exist but affect nothing (vestigial).
- Each rock break consumes one non-swinging tick (modelled in the simulation).

## 2. Trainer Level & Legacy — the meta-progression spine  (`CharacterLevel.js`, `Upgrades.js`, `Settings.js`)

- Every XP a creature earns gives the Trainer **5 %**. Trainer level = `floor(playerXP^(1/3))`, cap 999.
- Each new level grants **1 Legacy** (checked every tick vs `legacyGiven`).
- Feature unlocks are pure level gates: Augmenting L0, Training & Legacy Upgrades L1, Exploring L2, Gardening L3, Soulstones L4, Trading L5, Breeding L6, Magic L7, Combiner L8, Gene Modification L9. Collection Log / Your Creatures unlock at 2+ creatures.
- 23 upgrades in 5 categories; cost = `StartingCost + currentLevel` Legacy (linear, 1–2 start). Maxing everything = **1,526 Legacy ≈ Trainer level 1,526**, i.e. above the cap → not all upgrades can be maxed; the 50-level Fable Capacity alone costs 1,275. Realistic budget by L100 ≈ 100 Legacy ≈ 20–25 upgrade levels.
- Specialization (one-time, at start) grants 2–3 upgrades at level 1: Miner, Trainer, Explorer, Collector, or Nothing Special.
- There is **no prestige/reset** mechanic in this build (the "Legacy" name is a holdover; the v7 migration refunded old upgrades into Legacy).

## 3. Training — combat for XP and Soulstones  (`Training.js`)

- Up to 6 parties (1 + Multi-Tasker), each one leader in one of 12 locations (gated by exploration progress). Each tick without an enemy: 18 % chance to spawn a wild creature of the location's 4 species at a level uniform in [Min,Max], random genetics/spirit.
- Fight (1 round/tick, player first): `dmg = max( floor( (L/3)·(Atk/(0.85·Def))·0.35·0.35·80·rand[0.85,1.15]·crit(5 %→1.5)·typing / 5 ), 1 )`; leader gets +4 flat and the training-staff boost. Enemy retaliates only if alive. Typing is dead (see architecture doc).
- Kill → 1 **Soulstone** of that species (+ a random Legendary soulstone if any Legendary has been summoned), leader XP = `max(floor((eL − L + 15)·L/2),1)·0.6·(1+0.5·SmarterTraining)`; buddies (0–3 via Training Buddies) get 10 % × (1+0.5·ExperienceShare) each; Trainer 5 %.
- Defeat → 0 HP; heal costs `10 coins/HP · (1 − 0.2·HealthInsurance)`, or auto-heal if Medics owned + autoheal on; otherwise natural regen 1 HP/tick.
- Auto-change-location moves the party up when `level ≥ location.MaxLevels` and the next location is explored.
- XP formula goes to the floor (0.6/kill) once leader is >15 levels above enemies → strong incentive to advance locations; over-leveled farming is useless, under-leveled is a 50 % win rate (sim: `simulations/progression_sim.py`).
- **Soulstone summons** (`spendSoulstones`): 100/500/2500/6000/12000 stones by rarity → level-1 creature with **all genetics 50**, random spirit/vibrancy, no augment. This is the deterministic pity path for the collection.

## 4. Exploring & Gathering  (`Exploring.js`)

- Explorers (1 + Explorers upgrade) accrue `percent += 100·(Spd+Sta)/900 · magic` per tick; each completion = 1 step, XP = `10 + 5·currentEffect('Fast Learner')` = 10 + 25 per level (max 135).
- Location n unlocks at `50·2^n` steps (50, 100, …, 51 200; total 102 350 steps). Once all 11 are unlocked, explorer slots convert to gatherer slots.
- Gatherers (1 + Gatherers, + explorer slots at end) roll per completion (with `E(x)` = upgrade Value × level): 40 % coins `ceil(rand·2(E(ShinyThings)+1)·2^loc/3)+1`, 40 % the location's mineral `ceil(rand·(2·E(Geologist)+3))`, 5 % one of the location's **artifact resources** `ceil(rand·(E(Archeologist)+1))`, 15 % nothing.
- Loot goes to a pending pile; "Transporters" + autoCollect moves coins/minerals in automatically; resources (woods, shrooms, gems, flora) stay in the explore inventory and feed Magic.
- Exploration is the gate for training locations, the only source of Magic resources, and a doubling wall that pushes players to buy Explorer slots and leveled Speed/Stamina creatures.

## 5. Gardening ("Legendary Reactor")  (`Gardening.js`, `Views/Game/Gardening`)

- 12 plant tiers; tier i costs `floor(500·3^i · 1.15^level)` coins (+0.1 % of that in Lumin while summons remain) and adds `0.001·5^i` Lumin per 5-second tick. Higher tiers are ~1.67× more efficient per coin per tier (5/3) → the top tier is ~275× better per coin than the bottom; low tiers exist only as affordability steps.
- Lumin accumulates (capped at the next summon cost) toward 4 Legendary summons at 10 M / 50 M / 500 M / 10 B Lumin: Sylvera, Suijin, Titanwing, Barblade (fixed order, vibrancy 0). After the 4th summon the reactor instead pays **coins = effect/20 per 5 s**.
- This is the game's **big-number sink**: 10 B Lumin requires ~1–10 B coins of plants (`simulations/progression_sim.py`), making it the late-game wall that Mining + Charisma + crew are tuned toward.

## 6. Trading  (`Trader.js`, `Views/Game/Trading`)

- Every 60 min the trader offers 6 creatures: 1 Starter (a different species from the starter it asks for), 2 Common/Uncommon (50/50), 1 Uncommon, 2 Rare; non-starters have an 8/19 chance of no augment else a random one.
- Each slot "looks for" a creature you own of a lower tier with requirements: Starter→another starter; Common→a starter **with one of the first 5 augments (Topaz…Ruby)**; Uncommon→a common with **any specific augment** and vibrancy ≤ 40; Rare→an uncommon with a **specific augment**, vibrancy ≤ 30 **and** genetics ≥ 75 %. Because every non-starter offer demands an augmented creature, Trading depends on Augmenting (and therefore on rock unlocks) from the start.
- Trade = your creature is released, theirs added. Magic spells can refresh (3 Mana) or extend the trader (+15 min for 2 Mana).
- It is the only source of Rares before Soulstones; the augment requirements create demand for cheap Topaz–Ruby augments and for breeding good uncommons.

## 7. Augmenting  (`Views/Game/Augmenting`, `Augmenting.js`)

- Pay minerals of the chosen **unlocked** rock: `floor((rockIndex+1)³ · 2 · rarityMod{1,2,3,4,5}) + 4` (Topaz Starter 6 … Harmonium Legendary 13 314).
- Produces a **new level-1 creature** with that augment, same vibrancy, and **genetics × 0.75 (ceil)**; the original is kept. Augmented creatures mine their rock at 2× damage and 2× XP.
- This is the primary way to fill the 11 augment columns of the diary → it is the real coin-equivalent sink for minerals and the reason to hoard rather than auto-sell.

## 8. Breeding  (`Creatures.js breed`, `Views/Game/Breeding`)

- Two creatures of the same species (UI-enforced), cost = `rarityBase{500,1000,2000,4000,8000} × augMod(parent1) × augMod(parent2) × (1 − breedingStaff%)`, augMod 1.25 (Topaz) … 6 (Harmonium). Instant, child is level 1.
- Augment: 50/50 from either parent. Vibrancy: 10 % → 0, 50 % → better parent, 40 % → fresh random.
- Each gene (shuffled order): 30 % higher parent, 25 % ceil(average), 20 % lower parent, 25 % uniform 1–100; then **+1, cap 100** ("safety upgrade"). With the Breeding staff you can force one chosen stat to always take the higher parent.
- Consequence: P(stat = 100 | both parents 99–100) ≈ 75 %; from two 75s the expected child gene is ~70 — **breeding regresses toward the mean unless parents are already excellent**; the +1 drift and "high parent" branch make perfect lines reachable but grindy (≈ 0.75⁵ ≈ 24 % of children of two perfect parents are perfect).

## 9. Combiner  (`Combiner.js`)

5 **level-1** creatures in (starter excluded) → all removed → 1 new level-1 creature held in `combinedFable` until collected or trashed: species random among the 5, augment random among the 5, each gene drawn from a random parent (no +1). A gacha-style compression of surplus creatures; expected genetics = average of inputs. Mainly a storage valve and augment reroll.

## 10. Magic (staffs, potions, spells)  (`Magic.js`, `Views/Game/Magic/*`)

- Four domain staffs crafted for 100 of a wood (Orewood/Skillwood/Wanderwood/Nurturewood); upgrade cost `10·(L+1)²` total, split across `min(floor(L/5)+1, 4)` resources (one resource for L0–4, all four from L15). Boost `= 400·3L/(400+3L)` % (hyperbolic, asymptote +400 %; +28 % at L10, +109 % at L50, +171 % at L100). Breeding staff: cost reduction `100·3L/(100+3L)` % (asymptote 100 %) plus the forced-stat breed mode.
- Potions: 10 of a `<Role>'s Gem` → 1 `<Role>'s Potion`; one of each → 1 **Mana Potion**.
- Spells (manual): Extend Trader +15 min (2 Mana), Refresh Trader (5), **Summon New Creature** (20 Mana → a random creature/augment **you do not yet have in the diary**). Automation (shown once all four staffs are crafted, enabled by the Potion Crafter / Apprentice Legacy upgrades): auto-craft potions, auto-extend (2 Mana) and auto-summon (15 Mana) — the latter two are mutually exclusive and, lacking a timer guard, fire **every tick** while affordable. The fifth "magic staff" (`40+5L` %) exists in state but has no craft/upgrade UI → dead.
- Gene Modification: +1 to a gene costs `ceil(gene/20)` of the matching potion (Health←Miner's, Attack←Trainer's, Defense←Explorer's, Speed←Breeder's, Stamina←Mana); change spirit = 15 Mana. This is the deterministic path to perfect genetics.
- Magic is the **convergence layer**: it consumes Exploring output and feeds Mining/Training/Breeding/Collection with soft-capped multipliers — the closest thing to an endgame loop.

## 11. Achievements  (`Achievements.js`)

41 Steam achievements, mostly threshold checks each tick (coins 100/1k/1M/1B, trainer level 1/5/25/50/100, diary 492, all-vibrancy-0 492, 12 augments owned, genetics ≤75 total or ≥500, crew 12, 10k/1M minerals, 23 distinct upgrades, 75 total upgrade levels, all 4 staffs, breeding 1/100/1000, exploring 1/3/7/11 locations, summons). Fired through `window.electronAPI.trigger_award` → `steamworks.achievement.activate`.

## 12. System interaction map

```
                 ┌──────────── XP (5%) ────────────────────────────┐
                 │                                                 ▼
 Mining ──coins──┼──► Breeding ──► Creatures ◄── Trading ◄── (needs good uncommons)
   │   └minerals─┼──► Augmenting ──┘   ▲  ▲  ▲                        ▲
   │             │                     │  │  └─ Soulstones ◄── Training ◄─ locations ◄─ Exploring
   │             └──► Gardening ──Lumin─┘  │                                       │
   │                     (coins → 4 Legendaries, then coins)                       resources
   │                                       │                                       ▼
   └──────────── staff boosts ◄──────── Magic (staffs, potions, spells, gene mod) ◄┘
                                           │
                              Trainer Level ──► Legacy ──► 23 Upgrades ──► every system
```
Every loop ultimately deposits into one place: the 492-cell Collection Log.
