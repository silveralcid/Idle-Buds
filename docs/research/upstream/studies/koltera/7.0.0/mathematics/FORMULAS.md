> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/mathematics/FORMULAS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera — Mathematical Models

Because full source was recovered, every formula here is **VERIFIED by source** and then **validated by execution** of a Python port (`simulations/koltera_model.py`, `progression_sim.py`). Where the source and the config file disagree, the *executed code path* is reported. Charts in `mathematics/charts/`.

## 1. Mining

```
dmg%      = ceil( ((Atk/400 · 48 + 5)^1.6 / rockHP) · 30 · (1 + 0.25·BiggerSwings) · (2 if augment==rock) · (1 + staffBoost/100) )
stamina/swing = ((1 − Sta/550) · 2)^3            (Sta 50 → 6.0, 100 → 4.4, 150 → 3.1, 250 → 1.3)
rest regen    = 5 + 3·Athletics per tick
minerals/break = ceil(rand·(Prospector+1))        E = (Prospector+2)/2
coins/break    = minerals · Value · (1 + 0.25·Charisma)
XP/break       = rock.XP · (2 if augment) · (1 + 0.25·ExperiencedMining); Trainer gets 5 %
```
Steady-state income per miner (Otto, genetics 75, no upgrades), from a 20 000-tick simulation:

| rock | L1 c/s | L25 | L50 | L100 | dmg@L50 |
|---|---|---|---|---|---|
| Topaz | 0.23 | 0.62 | 1.21 | 1.44 | 157 % (one-shot) |
| Ruby | 0.25 | 1.05 | 2.49 | 4.96 | 20 % |
| Harmonium | 0.42 | 1.07 | 2.69 | 6.86 | 4 % |

Observations: (a) income grows only ~15–25× from L1→L100 per miner; (b) rocks converge because `Value/Health` is ~constant; (c) once a rock is one-shot, income is bounded by the stamina duty cycle `swings/(swings+rest)` ≈ 65–70 % at mid levels — Athletics ×5 raises regen 5→20/tick and is the best hidden income multiplier; (d) upgrade multipliers stack multiplicatively: crew 2→12 (×6), Charisma (×2.25), Prospector (mean 1→3.5, ×3.5), augment match (×2 dmg) → ~×50 over base from Legacy alone.

Offline estimate (Game.js) uses `price/ceil(100/dmg)` per tick ×0.75, ignores stamina **and Prospector yield**; for one-shot rocks the 0.75 roughly matches the ~0.65 duty cycle, for Prospector owners it under-pays (mean yield up to 3.5×) → **offline is fair-to-stingy, and uncapped**. It also keeps crediting Lumin after the 4th summon where live play pays coins.

## 2. Levels and XP

```
creatureXP(L) = learningMod · L³      learningMod ∈ {0.75, 1, 1.25}
level(xp)     = floor((xp/learningMod)^(1/3)), cap 100
trainerLevel  = floor(playerXP^(1/3)), cap 999;  playerXP += 0.05 · every creature XP
Legacy        = trainerLevel (1 per level)
```
L100 Medium = 1 000 000 XP. Since the Trainer gets 5 %, Trainer L100 (1 M XP) needs 20 M creature XP ≈ 20 maxed creatures' worth. Legacy to max all 23 upgrades = **1,526** (sum of `StartingCost+i`) → unreachable; players must choose. Fable Capacity alone is 1,275 of that.

Combat XP: `max(floor((eL − L + 15)·L/2), 1) · 0.6`. Positive only while `eL > L − 15`; at parity ≈ `4.5·L` per kill. Monte Carlo (`progression_sim.py`) with auto-advance: L50 in ~2.3 h, L100 in ~8.5 h of continuous training for one leader (win rate 50 % entering a band, ~100 % at its top).

## 3. Combat

```
dmg = max( floor( (L/3) · (Atk / (0.85·Def)) · 0.35 · 0.35 · 80 · U[0.85,1.15] · crit(5 %: 1.5) · typing(=1, bug) / 5 ), 1 )
    = max( floor( 0.6533 · L · Atk/(0.85·Def) · rand · crit ), 1 )          (constants collapse to 0.653)
leader dmg += 4 ; leader dmg ×(1 + trainingStaff%)
HP  = floor(0.01·(baseHP + 0.75·genHP)·L + L + 10)
```
Fights last 1–6 ticks; encounter wait is geometric p=0.18 (mean 5.6 s), so **XP throughput is dominated by the spawn rate, not combat** (≈7–8 s per encounter at any level). Heal cost = 10 coins/HP lost; at L90–100 a fight costs ~1 000–1 400 coins if auto-healed, versus mining income of ~5 c/s/miner → late training is a real coin sink.

## 4. Breeding genetics (Markov on one gene)

Per gene: 30 % hi, 25 % ceil(mean), 20 % lo, 25 % U{1..100}; then +1, cap 100.

Validated by 200 k-sample Monte Carlo:
- Parents 100/100 → P(child 100) = 0.755 analytically (0.75 from the three non-random branches + 0.25 × P(U ≥ 99) = 0.25 × 0.02); simulation 0.754 ✔.
- Parents 99/99 → 0.755 (the +1 makes 99 equivalent to 100).
- Parents 75/75 → E[child] = 69.9 (**regression**: the random branch pulls toward 50.5).
- All five genes perfect from two perfect parents: 0.755⁵ ≈ **24.5 %**; with the Breeding staff forcing one stat: 0.755⁴ ≈ 32.5 %.
- Vibrancy: parents 0/0 → P(child 0) = 0.1 + 0.5 + 0.4·(1/16) = 0.625 ✔ (sim 0.626); parents 40/40 → 0.125 ✔.

Cost: `base{500..8000} · augMod₁ · augMod₂ · (1 − staff%)`; two Harmonium Rares = 4000·36 = **144 000** coins.

## 5. Augmenting cost

`floor((i+1)³ · 2 · rarity{1..5}) + 4` minerals of rock i (0-based). Cubic in rock tier: Topaz 6–14, Ruby 254–1 254, Harmonium 2 666–13 314. Filling one species' 11 augments costs 8 756 (Starter) / 17 468 (Common) / 26 180 (Uncommon) / 34 892 (Rare) / 43 604 (Legendary) minerals; the whole 41-species diary = **1 073 380 minerals** (dominated by the top rocks) — this is the single largest material sink and why the "Prospector" and "Geologist" upgrades matter.

## 6. Exploration

`steps(n) = 50·2^n`, n = 0..10 → 102 350 total. One explorer at `(Spd+Sta)=100` completes a step every 9 ticks → **~256 h solo** for all 12 locations; with 6 explorers at (Spd+Sta)=300, ~14 h. The doubling is the game's hardest geometric wall and the lever that sells Explorer slots.

## 7. Gardening (Lumin)

`cost(i, lvl) = floor(500·3^i · 1.15^lvl)`, `worth(i) = 0.001·5^i` per 5 s. Efficiency `worth/cost` rises ×(5/3) per tier; tier 11 (Luminari, 88.6 M) yields 48 828 Lumin/5 s ≈ 35 M/h, so the 1st summon (10 M) is minutes after affording Luminari, while the 4th (10 B) needs ~12 h at ~1.1 B coins invested (greedy sim). After 4 summons the reactor pays `effect/20` coins per 5 s → a Luminari-stack returns ~0.5 % of its cost per hour: **weak as an investment, exists so Lumin players aren't stranded**.

## 8. Magic soft caps

`boost(L) = 400·3L/(400+3L)` → half-max (200 %) at L = 133, +171 % at L100. Cumulative upgrade cost `Σ 10(k+1)² ≈ 3.3 M resource units` to L100 (drawn from 1 resource at L0–4, up to 4 from L15); each resource unit drops from a 5 %/40 % gather roll, so staff level ~30–50 (+80–110 %) is the practical ceiling. Textbook diminishing returns: linear cost growth in level vs quadratic resource cost vs hyperbolic benefit.

## 9. Trader

Refresh 3 600 ticks. Offer composition: 1 Starter, 2 × (50 % Common / 50 % Uncommon), 1 Uncommon, 2 Rare. Augment on non-starters: P(none) = 8/19 = 42 %, each specific augment 1/19 = 5.3 %. Expected Rare offers per hour = 2 → a specific (Rare species, augment) pair appears with p = 2·(1/11)·(1/19) ≈ 0.96 %/h, i.e. ~104 h expected → augmenting/breeding, not trading, is the realistic completion path; the trader's job is species coverage early.

## 10. Config vs code discrepancies (VERIFIED)

| `_GameConfig.js` says | Code actually does |
|---|---|
| `upgrades.upgradeCostMultiplier 1.5` | `cost = StartingCost + level` (linear) |
| `exploration.stepsPerLocation 100` | `50·2^n` |
| `reactor.luminGenerationRate 0.2`, `upgradeEffectMultiplier 1.1` | tier worths 0.001·5^i, cost ×1.15 |
| `trading.traderRefreshTime 600` (and `DefaultState.trader.refreshIn 600`) | 3 600 s hard-coded |
| `debug.updateTickRate 1000`, `magic.*`, `achievements.*`, `fables.starterStatValue` | never read |
| `training.baseCriticalChance 0.2 / dodge 0.3` | crit 5 %, no dodge |
| `fables.augmentChance 50`, `breedingTimeMultiplier` | unused |

Lesson: a "single source of truth" config only works if the code reads from it; here roughly half the keys are documentation that drifted.
