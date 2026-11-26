> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/palworld/1.0.5.102999/mathematics/FORMULAS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Palworld — Formulas and Quantitative Models
| # | Formula / table | Tier | Source |
|---|---|---|---|
| 1 | EXP curve: `DT_PalExpTable` — player L10 5 510, L20 56 840, L30 273 624, L40 840 233, L50 2.38 M, L60 6.50 M, L65 10.58 M, L80 45.9 M, L100 382 M; Pal totals L50 2.68 M, L65 41.4 M, L100 283 M | VERIFIED | `evidence/data/exp_table.json` |
| 2 | Stats: `HP = (500 + 5L + HPbase·0.5·L·(1+IV)) × (1+passive) × (1+soul) × (1+condense)`; `ATK = (100 + ATKbase·0.075·L·(1+IV)) × …`; `DEF = (50 + DEFbase·0.075·L·(1+IV)) × …`; IV ∈ [0,0.30] | STRONG INFERENCE (community formula; species bases VERIFIED) | `DT_PalMonsterParameter` Hp/ShotAttack/Defense; wiki/community IV calculators |
| 3 | Breeding: `target = floor((rankA + rankB + 1)/2)`; child = pool Pal with min |CombiRank − target|, tie → higher rank, duplicate rank → lower `CombiDuplicatePriority`; `DT_PalCombiUnique` overrides | STRONG INFERENCE rule, VERIFIED fields | `simulations/palworld_model.py` |
| 4 | Egg gender: P(male) = `MaleProbability`/100 (10–90 by species, mean 49) | VERIFIED field, STRONG INFERENCE use | `pals.json` |
| 5 | Capture inputs: species `CaptureRateCorrect` × world `PalCaptureRate` × sphere tier × capture-power rank × HP-missing term (+ back-hit, status); exact combination unpublished | HYPOTHESIS (model) | data fields + community calculators |
| 6 | Difficulty presets: Easy EXP 1.3 / capture 2.0 / player dmg 1.5 / taken 0.7 / drops 2.0 / hatch 0.5; Normal all 1.0, death penalty Item; Hard EXP 0.8 / capture 0.8 / player dmg 0.5 / taken 1.5 / drops 0.5 / hatch 2.0, death penalty All; Hardcore = Hard with taken 2.0, drop rates back to 1.0, Palbox export/import off, and permadeath flags (`bHardcore`, `bPalLost`) | VERIFIED | `evidence/data/world_presets.json` |
| 7 | Technology budget: 537 regular techs cost 1 413 points; 51 boss techs cost 182 ancient points; per-level cost rises from 5–13 (L1–10) to a 19–28 plateau (L40–70) and falls to 12–13 by L79–80 | VERIFIED | `technology.json` |
| 8 | Crafting work: Pal Sphere 300 work (1 Paldium Fragment), Legendary Sphere 50 000 work, Cake 200 000 work (5 Flour, 8 Red Berries, 7 Milk, 8 Egg, 2 Honey); work speed = Pal `CraftSpeed` × suitability | VERIFIED amounts, STRONG INFERENCE throughput | `recipes.json` |
| 9 | Trust ranks: 6 000, 13 000, 21 000, 30 000, 40 000, 55 000, 80 000, 110 000, 150 000, 200 000 points; negative ranks at −1 / −1 000 / −10 000 | VERIFIED | `DT_FriendshipRankTable` |
| 10 | Condenser: 1–4 stones per rank over four stone tiers (Stone 1,2,3,4; Stone2 1,2,3; Stone3 1,2,3; Stone4 1,2,2,3,3,3,4,4,4,4), reset 100/300/500… gold (20 ranks); effigies: capture-power rank r needs 1–9 effigies (15 ranks) | VERIFIED | `DT_CharacterUpgradeMasterDataTable`, `DT_PlayerStatusRankMasterDataTable` |
| 11 | Enemy variants: `EnemyMaxHPRate`, `EnemyReceiveDamageRate`, `EnemyInflictDamageRate`, `EnemyWazaCoolTimeRate` multiply the species line (raid boss ×1.4 HP, ×0.4 damage taken, ×2 dealt; `EnemyMaxHPRate` is stored as 140) | VERIFIED fields | `pals.json` |
| 12 | Element chart: 2× / 0.5× cycle Fire→Leaf,Ice; Water→Fire; Leaf→Earth; Electricity→Water; Ice→Dragon; Earth→Electricity; Dark→Normal; Dragon→Dark | STRONG INFERENCE (wiki; C++ table) | — |

## Stat growth (from the species scaling values, formula #2)
| Pal | HP/ATK/DEF scaling | L50, 0 IV | L65, 30 % IV |
|---|---|---|---|
| Lamball | 70/70/70 | 2 500 / 362 / 312 | 3 782 / 544 / 494 |

(Values are rounded half-to-even as the simulation prints them; conventional rounding gives Lamball 363/313 and 3 783, Jetragon DEF 811.)
| Chikipi | 60/60/60 | 2 250 / 325 / 275 | 3 360 / 480 / 430 |
| Anubis | 120/130/100 | 3 750 / 588 / 425 | 5 895 / 924 / 684 |
| Jetragon | 115/140/120 | 3 625 / 625 / 500 | 5 684 / 987 / 810 |
| Frostallion | 140/140/120 | 4 250 / 625 / 500 | 6 740 / 987 / 810 |
Dex-wide species scaling: HP 60–200 (mean 95.7), ATK 50–200 (mean 97.0), DEF 50–200 (mean 93.5). Because the species term is multiplied by level, a 200-HP species out-scales a 60-HP one by 3.3× in the level-dependent part; IVs add up to +30 % on that part only, condenser/souls/passives multiply the whole stat.

## Breeding structure (simulation)
260 pool species over 260 distinct ranks (30–3 080, all multiples of 10) → with ranks 10 apart, nearly half of all pairs land exactly between two ranks, so the tie rule decides 15 551 of 33 930 pairs (46 %); every species but Aegidron (rank 30, the minimum, structurally unreachable under tie→higher) can be bred from two different parents; the most common children (Sweepa 603 pairs, Dazemu 581) sit at the middle of the rank distribution — the "breeding funnel" that community guides describe.

## EXP economics
Player XP to 65 (10.6 M) is ~4.4× XP to 50 and the L100 total is 36× L65 — the 1.0 level cap raise is a long tail; Pal XP needed is 3.9× the player's at L65 and 3.2× at L80 (the Pal `NextEXP` is flat at 6.9 M from L65 to L100), so leveling Pals past the player is the expensive half; capture bonus EXP (`DT_PalCaptureBonusExpTable`) rewards catching multiples of a species (4 999-row ladder).
