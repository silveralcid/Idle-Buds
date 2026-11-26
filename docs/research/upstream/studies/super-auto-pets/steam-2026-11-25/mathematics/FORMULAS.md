> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/super-auto-pets/steam-2026-11-25/mathematics/FORMULAS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Super Auto Pets — Mathematical Models

| # | Model | Tier | Notes |
|---|---|---|---|
| 1 | Economy: gold/turn = 10 (+ability income), pet/food 3, Pill/Jam 1, roll 1, sell = level | VERIFIED for gold/turn, roll price, pet price 3, gold cap 300 (decompiled `SetNewTurnGold`, `RollShop`, `MinionConstants.Create`, `BoardConstants`); rest STRONG INFERENCE (wiki + client strings) | see `DECOMPILED_RULES.md` §3–4 |
| 2 | XP: level 2 at 2 XP, level 3 at 5 XP; merge = +1 XP, +1/+1 per XP; keeps higher stat line | VERIFIED thresholds (`BoardConstants.LevelRequirements = [0,2,5]`, `LevelupAmount 2`, `LevelupGold 3`, `StackExp`/`StackExpStepwise = true` from the decompiled static constructor); merge rule STRONG INFERENCE | |
| 3 | Tier unlock turn T(tier) = 2·tier − 1 (1,3,5,7,9,11); cap 50/50 (Behemoth 100); sell = 1 gold per level; max gold 50 | VERIFIED (client strings `ShopOverlay.Tooltip.Turn`, `ShopUpgrade.TierUnlocked2..6`, `Tip.MaxStats`, `Ability.BehemothAbility.*.About`, `Tip.PetSellValue`, `Ability.ElkAbility.*.FinePrint`) | |
| 4 | Tier stat budget: mean atk+hp ≈ 4.0, 5.2, 5.9, 7.3, 8.9, 12.0 for tiers 1–6 (428 pets incl. Danger) | computed from wiki data (STRONG INFERENCE) | ~+1.5 per tier, +3 at tier 6; wide overlap (tier 4 ranges 2–19) |
| 5 | Shop odds: eligible pool W (pack pets with tier ≤ shop tier, multi-tribe pets counted tribe-count times), each slot an independent uniform draw (**with replacement**; Unique pets removed once drawn), no duplicate penalty → P(specific pet in one shop) = 1 − (1 − 1/W)^slots; P(in k shops) = 1 − (1 − 1/W)^(slots·k) | VERIFIED sampler (decompiled `RandomizeShop`/`TakeShopItems`/`TryFastTakeRandom`; `DuplicatePenaltyConstant = 0`), see `DECOMPILED_RULES.md` §3 | Turtle tier-1 pet (W = 10, 3 slots): 27 % per shop, 47 % with 2 rolls, 79 % with 5; `simulations/shop_sampler_sim.py` |
| 6 | Stats-only battle: +1/+1 on every pet raises win rate vs an equal random team from ~35 % to ~90 % (turn 1–5), 81 % at turn 9 | computed (simulation) | shows how marginal stat edges dominate before abilities |
| 7 | Lives: Arena 5 (easy 7), versus 6; later-turn loss cost 2–3 lives (`LosePerLoss2/3`) and max-loss variants; a life regained at turn 3/5 if any lost | STRONG INFERENCE (client strings + wiki) | |

## Tier budget detail (wiki data, VERIFIED computed)
Note: the per-pet numbers below were computed from the wiki scrape; the binary roster (`evidence/decompiled/pets_from_binary.csv`, VERIFIED) differs for 148 of 425 matched pets by ±1 stat rebalances and 22 tier moves (the binary is the newer source). Tier means shift by < 0.2 per tier; the design reading is unchanged.
| tier | n | atk mean (range) | hp mean (range) | atk+hp mean / median |
|---|---|---|---|---|
| 1 | 65 | 1.9 (1–4) | 2.1 (1–4) | 4.0 / 4 |
| 2 | 68 | 2.3 (1–5) | 2.9 (1–6) | 5.2 / 5 |
| 3 | 73 | 2.5 (1–6) | 3.4 (2–7) | 5.9 / 6 |
| 4 | 71 | 3.3 (1–8) | 4.0 (1–11) | 7.3 / 8 |
| 5 | 78 | 3.9 (1–8) | 5.0 (1–12) | 8.9 / 9 |
| 6 | 73 | 5.9 (2–12) | 6.2 (2–13) | 12.0 / 12 |
Design reading: base stats are intentionally weak relative to the 50 cap and to ability scaling (an Ant gives +1/+1 on faint at level 1; end-turn scalers give +1…+3 per turn); by turn 9 a well-scaled team has 15–30 stat points per pet versus a tier-5 base of 9. **Abilities, not tiers, are the power curve**; tiers mostly gate access to stronger scaling verbs.

## Gold-to-power
10 gold/turn ≈ 3 purchases or 2 + 4 rolls. Level 2 costs 9 gold (three copies, three shop appearances), level 3 costs 18 — plus the opportunity cost of rolls to find copies (expected rolls to see a specific tier-1 pet twice more at turn 1–2 ≈ 2/0.25 ≈ 8 rolls = 8 gold without freezes) → leveling is usually a 2–3-turn plan and the level-up "next-tier choice" is the tempo reward. Selling returns 1–3 gold, so "buy-sell cycling" (Cycle archetype, Buy/Sell triggers) converts gold into permanent stats at ~1 stat per gold.

## Battle sensitivity (simulation, `simulations/sap_model.py`)
Random Turtle-pack teams of tier-appropriate pets, stats only: draws are common at turn 1 (40 %) because stat lines are tiny and symmetric; by turn 9 draws fall to 11 %. A uniform +1/+1 edge is decisive early (92 % win) and still strong late (81 %). This is the mathematical reason the game rewards *consistent small scaling every turn* over late big buys, and why Start-of-battle snipes (Dolphin/Crocodile-style) and Faint summons are balanced around removing 1–2 stat-dense targets.

## RNG and fairness (structure VERIFIED, property STRONG INFERENCE)
Battles are seeded (`BattleState.Seed/PlayerSeed/OpponentSeed`); all randomness goes through `BoardRandom` with a roll registry, so a battle is a pure function of (both boards, seed) and the event stream can be replayed (`PlaybackModel`). Arena opponents are real player boards from the same turn (asynchronous), so the "opponent distribution" is the live meta.
