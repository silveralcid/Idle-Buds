> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/idle-clans/1.6800/gameplay/GAMEPLAY_SYSTEMS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Idle Clans — Gameplay Systems Breakdown

Sources: public API `game-data` (VERIFIED data), client metadata class skeletons (VERIFIED structure), official wiki (STRONG INFERENCE for formulas; function names corroborated in the client's `CombatFormulas`). Tables referenced are in `evidence/public_api/tables/`.

## 0. Core loop
Pick a **task** (one at a time, queueable) → it ticks on the server every `BaseTime` ms (reduced by speed boosts) → yields XP + items → sell to NPC shop (`BaseValue`) or to players (**Player Market**, 1 % seller tax, 3 slots free / 6 premium) → buy gear, consumables and **Local-market upgrades** → unlock higher tasks by level (cap 120) → repeat. Social layer: **clans** (20 members, 10 000 gold + total level 100 to create), clan events, clan quests, clan bosses, raids, leaderboards, Clan Cup. The character sheet is 22 skills (`Skill` enum: Rigour(Attack), Strength, Defence, Archery, Magic, Health, Crafting, Woodcutting, Carpentry, Fishing, Cooking, Mining, Smithing, Foraging, Farming, Agility, Plundering, Enchanting, Brewing, Exterminating, Invocation + None), all on one XP table.

## 1. Skilling tasks (318 tasks, 15 non-combat skills) — VERIFIED data
- Gathering (no inputs): Woodcutting 11 trees (L1 spruce 3 s/7.5 xp → L105 ignis 150 s/935 xp), Mining 11 ores, Fishing 13 fish, Foraging 10, Agility 9 courses, Plundering 11 settlements (success-chance gated), Invocation dig sites (gold-costing).
- Processing (inputs → outputs): Smithing (bars, armour, jewellery; 12 groups), Carpentry (planks: log + gold), Crafting (arrows, leather, fabrics, gem breaking), Cooking, Brewing (potions from logs/fish/herbs), Farming (seeds → crops, long timers 30–180 s), Enchanting (scrolls), Item creation (end-game recipes).
- Each task row carries: `LevelRequirement`, `BaseTime`, `ExpReward`, `ItemReward`+`ItemAmount`, `Costs[]`, flags (`Hidden`, `Disabled`, `CanReceiveFromSkillingPartyEvent`, `AffectedByShowUsTheMoney`, `TriggerMilestoneOnCompletion`), and for pets `CustomPetTimeMs`/`CustomPetExpReward`.
- Design: base XP/h is **nearly flat** per skill (gathering 9 k → 20–35 k xp/h from L1 to L110) while XP-to-level is exponential (see mathematics). Higher tiers mainly unlock **value** (gold/h and better inputs), not XP rate. Processing skills are faster XP (cooking 120 k xp/h at L50 with pies) but consume inputs — the classic RuneScape-style buy-XP economy.
- Boost stack (wiki): tools 4–25 % speed (8 tiers), skilling gear 3×2 % speed, mastery capes 5–20 % speed (L90/100/110/120), consumables +2/4 % XP, personal house +5…25 % XP, clan house +5…30 % XP, potions, daily ad boost +30 % XP (2 h ×4/day), clan events. **How speed % maps to time (divide vs. subtract) is not stated** → HYPOTHESIS; both bounds are reported in the model.

## 2. Combat — formulas VERIFIED-by-name, numbers from data
- Styles: Melee (Rigour→hit, Strength→max hit), Archery, Magic (each both). Enemy weakness to a style: −20 % augmented defence and +20 % damage (`CombatNpcWeaknessDefenceReductionPct/DamageBoostPct`).
- `augmented = floor((bonus + 64)·(level + 8)/10)`; `hitChance = ACC<DEF ? (ACC−1)/(2·DEF) : 1 − (DEF+1)/(2·ACC)`; `maxHit = floor((S/8 + L + 13 + S·L/64)/10)`; damage uniform 0..maxHit; boosts (weakness 20 %, enchant 12 %, potion 20 %) additive on max hit; dodge = 0.18 %/Agility level (cap 21.6 %), rolled before the enemy's hit.
- XP = 5 per damage dealt: 4 to the style skill(s), 1 to Health (`CombatExpPerHit`, `HealthExpPerHit`). Respawn 2 550 ms (`EnemyRespawnTimeMS`).
- 80 monsters in 10 areas (`monsters.csv`): six regular areas with 5–6 monsters each (HP 4–90), boss area *valley_of_gods* (griffin/devil/hades/zeus/medusa/chimera HP 350–500, sobek 600, **kronos 4 000 HP, 4 500 ms attacks, max hit ~195**), exterminating assignments (17), invocation rituals (18), 3 clan bosses. Each has explicit stat/bonus lines per style, `AttackStyleWeakness`, `EnemyAttackInterval`, `Loot[]` with weights, min/max amounts, level gating (`RemoveFromDropTableAtLevel`).
- Loot EV per kill (shop value): regular 20–800 gold, bosses 14 k–31 k gold → bossing is the gold engine; group combat (1–3) splits drops ∝ damage.
- Food heals 2–24 HP per item (`HealthAppliedOnConsume`; best: cooked bloodmoon eel 24), auto-eat is a 100 k upgrade; death = removed from combat, loot forfeited.
- Attack intervals come from the weapon (2 500–4 750 ms; most 4 000). Weapon classes with per-monster weakness multipliers (`WeaponMonsterWeakness`, +30 % typical).

## 3. Exterminating (slayer) — VERIFIED data
5 experts (eldric L1 … sila Health L80) hand out assignments (9–13 monsters each) worth 5–30 points; XP = 50 % of the monster's XP; points buy shop unlocks (5), tokens give +25 % points. Bounty hunter upgrade +10 % offence vs assignment. Bloodmoon exterminator +10 % XP.

## 4. Raids — VERIFIED config
Three raid levels for groups ≤ 6: levels 1–2 are phase raids (2 enemies/battle, +10 % enemy power per battle, 120 s prep then 45 s, 600 s battle cap), level 3 "Bloodmoon massacre" is wave-based (+1 %/wave, first boss wave 10 then every 5, vault 15 items, bag 4) with its own currency/upgrade line (Bloodmoon preparation/fishing/exterminator/helmet). Starter kit of 9 items; HP restored to 25 % after battle.

## 5. Clans — VERIFIED data/structure
- Creation: 10 000 gold, total level ≥ 100; 20 members; 100 logs kept; ranks; vault (8 base slots, +4/IAP to 200); clan houses tier 1–6 (gold 5 M → 500 M + materials; +5…30 % global skilling XP, +4…30 inventory; credit cost 100 → 250 000).
- **Clan credits** earned per task completion (16), minigame participant (4), boss kill (12), refinements, chests; premium +25 %. Spent on 21 **clan upgrades** (e.g. Get up, Strength in numbers, Bigger bottles, Group effort +10 % plunder, Yoink, Bullseye, Gatherers, event completion/cooldown tiers, Ways of the Genie, Royal extermination, auto clan boss, Roll it).
- **Clan quests** (Oct-2026 rework, `ClanQuestConfig` 54 parameters + `ClanQuestGenerator` in shared code): weekly objectives generated from member levels (percentiles 30/60/90, max 20 levels above tier, min target L30), effort budget `EffortSecondsPerMember` 120 000 s with `EffortLevelExponent` 2.5 and 5 % floor at level 1, production effort ×0.75, kill bands, boss/raid options (4 each), 2 base rerolls (+2 Roll-it, +2 Quester token), rewards as timed clan buffs (28 definitions, max 5 active), credit classes (5 ranges).
- Clan events: gathering/crafting skilling parties (power = `((speed/100)·2.75 + 1)·level/2`), combat events vs Big ol' Turkey (no damage), clan bosses (3 types, 5 000 ms attack, modifiers, rejoin lockout 60 s).
- Clan Cup: monthly objectives/leaderboards with credit rewards (API endpoints 12–20).

## 6. Quests — VERIFIED data
234 quest definitions across skills (`quests.csv`): type, difficulty, weight, completions (min/max), XP reward range (random skill or fixed), level band, loot, `PetChancePercentage`. Daily/periodic (`EnforcedPeriodType`), some premium-only (`RequirePremium`), some one-time. Quests are the **pet** source (79 loc keys; pets do tasks for you and level up to unlock more — a second idle lane).

## 7. Upgrades (Local market) — VERIFIED data, names decoded from the enum
49 player upgrades / 67 enum entries (`upgrade_type_names.json`, `upgrades.csv`): housing 5 tiers (100 k → 25 M; +5…25 % skilling XP; skill reqs), bank space **190 tiers** (5 416 → 10.4 M, 265 M total), woodcutting/fishing double-chance 5 tiers (100 k → 20 M; reaches 100 %), offline progress 6 tiers (200 k → 25 M), toolbelt 7, ammo saver 6 (→ 50 M), combat dodge, auto eat/loot/cook, teamwork, boss slayer, loadouts 15×1 M, taskmaster 10 tiers, pets, and 30 item-gated upgrades (books/lost pages dropped by content). Dealership total ≈ **825 M gold + 30 items** (wiki).

## 8. Economy surfaces — VERIFIED
NPC shops (99 entries: weapons 750–1 000, bronze armour 350–1 000, seeds, cosmetics 1 M, Lil' swagger 250 M), player market with per-item buy limits (`PlayerMarketBuyLimit`), untradeable flags, clan-bound items, game-shop tokens (premium, inventory space, questing/exterminating/auto-raid/rename tokens, seasonal currencies). Mastery capes 500 k–5 M per tier; completionist cape 1 M–10 M.

## 9. Other systems
- **Potions** (11 types: chance + strength % + duration 60–900 s; e.g. type 10: 100 % chance, +75 % for 60 s) with `PotionDurationCalculator` (Responsible drinking +10 %).
- **Enchanting / gemstones / scrolls**: enchanted item variants (`EnchantedVersionItemId`, `EnchantmentBoost`), cosmetic scrolls.
- **Invocation** (archaeology dig sites costing gold → relics → rituals vs 18 ritual enemies; `RitualPowerCalculator`).
- **Collection log** (`CollectionLogRules`), **achievements** (245, 5 categories × 5 difficulties, titles), **milestones** feed, holiday events (5 types with currency drops), **minigames** (2-minute skill events, 3 000 ms intervals, loot tables per skill).
- **Game modes**: Normal, Ironman, Group Ironman (deposits/leaver rules in `Clans.GroupIronman`).
- **FTUE**: tutorial (15 classes) with starter combat loot (6 items).

## 10. System interaction map
```
 Gathering ─► materials ─► Processing ─► gear/food/potions/ammo ─► Combat ─► loot, keys, tokens
     │             │              │                                   │
     ▼             ▼              ▼                                   ▼
  gold (NPC/market) ◄───────────────────────────────────────── bosses, raids, exterminating
     │
     ├─► Local-market upgrades (speed, double-loot, offline, QoL)  ─► faster everything
     ├─► housing (XP %)  ─► clan credits ─► clan upgrades/house ─► everyone faster
     └─► premium (gold-buyable) ─► +6 h offline, +25 % credits, 6 market slots, skills past 30
 Quests ─► XP + pets (second idle lane)      Clan quests/events/cup ─► buffs, credits, cosmetics
 Everything ─► XP table (×2 per 7 levels) ─► unlocks, mastery capes, leaderboards, achievements, titles
```
