> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/kadomon/steam-2026-11-25/mathematics/FORMULAS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Kadomon — Formulas and Quantitative Models

| # | Formula | Tier | Source |
|---|---|---|---|
| 1 | Attack cadence: a unit attacks every `max(SPEED − FAST + SLOW, 1)` ticks; damage-per-tick = ATK / SPEED | VERIFIED | `Entity.AttackTick`, `DamageHelper.GetBattleSpeed` |
| 2 | Super cadence: every `ENERGY (+ 2·supersUsed if DRAINING)` ticks | VERIFIED | `Entity.AddEnergy`, `KeywordController.energyPerDraining` |
| 3 | Hit damage = `ceil(ATK_eff × 1.25^k + FRAIL + FATIGUE)` (+ STRENGTH stacks added flat afterwards on basic attacks only, then all consumed), k = number of effective (attacker type, defender type) pairs; ATK_eff = stage ATK + ATTACK stacks + shield (SHIELD_BASH) + low-health bonus − decay penalty | VERIFIED | `DamageHelper.DamageToTake/GetBattleAttack`, `AttackScriptable.DealDamage`, `TypeDictionary` (`effectiveMulti 1.25`, `resistanceMulti 1`) |
| 4 | Type chart (attacker → effective against): Fire→Grass/Ice/Bug; Water→Fire/Toxic/Earth; Grass→Water/Earth/Lightning; Ice→Grass/Toxic/Air; Toxic→Fire/Grass/Physical; Air→Bug/Dusk/Physical; Bug→Water/Toxic/Dusk; Earth→Fire/Lightning; Dusk→Ice/Lightning/Physical; Lightning→Water/Ice/Air; Physical→Air/Bug/Dusk | VERIFIED | `evidence/data/type_chart.json` (decoded Odin 12×12 matrix) |
| 5 | Mitigation: FORTITUDE → 0 (1 stack consumed, even by 0-damage hits); SOLID_ARMOUR → `ceil(max(d − d·stacks/100, 1))` only while the unit has SHIELD; SHIELD absorbs first (`shield −= d`, overflow to HP); every basic attack also costs the attacker 1 SHIELD | VERIFIED | `StatusEffectHelper`, `HealthController.DealDamageToShield` |
| 6 | Evolution thresholds: stage 1 at 60 EXP, stage 2 at 180 EXP; merge = +30, battle = +5 all, release = +10 all, skip reward = +5 all, camp = +30 one | VERIFIED | `UnitDictionary` values, `UnitDictionary.GetLevel`, `MonInventory`, `ShopItemControllers` |
| 7 | Enemy budget: `totalExpGained += 75` per battle fought (also after a loss while morale remains); enemy i gets `budget/count × U(0.6,1.2)` (clamped to what is left; count is fixed per encounter, so ≈ 90 % of the budget is placed on average and the last enemies are often clamped) | VERIFIED | `LevelController.GetRandomEXP`, `UnitsManager.SpawnUnit` |
| 8 | Enemy count = min(encounter+1, 4); item chance per enemy = (encounter−1)·8 % | VERIFIED | `LevelController.GetEnemyCount`, `UnitsManager.SpawnUnit` |
| 9 | Rarity **weights** per unit: enc 0–2 → C 90 / R 10 / E 0; enc ≥ 3 → C 65 / R 30 / E 5. Because the weight is applied per eligible unit (20 Common, 8 Rare, 1 Epic lines before area filtering), the effective shares are ≈ 96 / 4 / 0 % early and ≈ 84 / 16 / 0.3 % late — not 90/10 or 65/30/5. Pool excludes tokens, Kadodex-locked units and already-spawned IDs. The **shop** uses a different, bucket-first sampler (`FullRandomUnit` with the enc-≥3 table) where 65/30/5 are the true odds | VERIFIED | `unitRarityChances`, `GetRandoUnit` |
| 10 | Morale: 100 (set when the starter is picked, `RewardSelectScreen.SelectCard`) − 10 × surviving enemies per loss (`damagePerEnemyAlive = 10`, applied through `PlayerHealthController`); losing the **boss** fight removes all remaining morale | VERIFIED values, STRONG INFERENCE on the ×10 application path |
| 11 | Prices: Common 5 / Rare 7 / Epic 10 gold (anything else 10); +2 gold on the reward screen after every battle, +1 ticket after boss/mini-boss fights; binning an **item** returns 1 gold, binning a **unit** returns 0 gold and gives +10 EXP to all | VERIFIED | `UnitDictionary.shopUnitCosts`, `UIManager` (AddGoldReward/AddTicketReward), `UnitBagSlot`, `ShopItemControllers` |
| 12 | Fatigue: when `currentTick > 150 && currentTick % 10 == 0` → first at tick **160**, then 170, 180… (+1 FATIGUE to every unit) | VERIFIED | `BattleManager.OnTick` |
| 13 | Action queue priority = `(isPlayer ? 5 : 0) + battleSlot − tickSpeed(effect)` (`PriorityQueue` order direction not read: STRONG INFERENCE that lower runs first) | VERIFIED formula | `BattleManager.AddAction` |

## Stat budgets by evolution stage (dex-visible Common/Rare/Epic, `simulations/kadomon_model.py`)
| stage | n | HP | ATK | SPD | NRG | ATK/SPD | HP×ATK/SPD | supers per 100 ticks |
|---|---|---|---|---|---|---|---|---|
| 0 | 29 | 26.1 | 5.7 | 13.9 | 23.3 | 0.46 | 10.3 | 4.3 |
| 1 | 29 | 40.6 | 8.5 | 13.9 | 23.3 | 0.69 | 24.1 | 4.3 |
| 2 | 29 | 54.6 | 10.9 | 13.9 | 23.3 | 0.88 | 41.8 | 4.3 |
Across all 29 lines **speed and energy never change on evolution** (0 of 29); evolution adds ≈ +14 HP and +2.6 ATK per stage, i.e. "power" (HP × DPT) roughly ×2.3 then ×1.7. Speed/energy are therefore a line's *identity* (fast glass cannons like Fitiki 21 SPD/11 ATK/23 HP vs slow walls like Blizzacean 16 SPD/72 HP), and the only ways to change tempo in a run are FAST/SLOW stacks, items and field effects.

## Type edge value
Stat 'bounds' in `UnitDictionary` (HP 5–120 …) are sheet-import bookkeeping, not enforced (three stage-0 units have ATK 3); actual visible ranges are HP 15–120, ATK 3–21, SPD 8–21, NRG 17–30.

In stats-only 1v1 duels between all 29 stage-1 units (no supers/passives), the side with a one-way type edge wins 80 % (157 match-ups); overall win rates range from 100 % (Freezard, Epic: 15 ATK / 8 SPD) to 7 % (Fitiki), so the base stat lines are deliberately uneven and balanced by supers/passives/keywords rather than by stats (HYPOTHESIS on intent; VERIFIED numbers).

## Economy arithmetic
A single path has 7 battle layers + 1 mini-boss + boss ≈ 9 fights → ≈ 18 gold + rewards; one Common (5) per two battles or one Epic (10) per five. Recruiting a defeated enemy is free, so gold is for targeted purchases and tickets gate rerolls — the shop is a *supplement* to the free recruit stream. EXP: a merged duplicate (+30) is worth 6 battles of passive EXP; with 60/180 thresholds a unit needs 12 battle-wins or 2 merges to reach stage 1 and 36 wins / 6 merges for stage 2 — the enemy budget (+75 per battle to the whole enemy team) outpaces passive player EXP by design, pushing the player to merge/recruit aggressively.

## RNG
`UnityEngine.Random` everywhere (targets, enemy roll, EXP split, item drops); no seed → battles are not reproducible (`RandomEnemyPassive`, `GetRandomEnemy`).
