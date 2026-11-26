> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/idle-clans/1.6800/mathematics/FORMULAS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Idle Clans — Mathematical Models

| # | Model | Tier | Validation |
|---|---|---|---|
| 1 | XP per level `inc(L) = round(75·2^⌊L/7⌋ + 0.25·L)`, `XP(L)=Σ inc` | STRONG INFERENCE (fitted) | 0.26 % max cumulative error vs official 120-row table; 88/119 increments exact with α=0.25, 69/119 with α=0.245 — the true source is probably a float/rounding variant of this form |
| 2 | Combat: `aug = floor((b+64)(L+8)/10)`, `hit = ACC<DEF ? (ACC−1)/(2DEF) : 1−(DEF+1)/(2ACC)`, `maxHit = floor((S/8+L+13+SL/64)/10)`, dmg ~ U{0..maxHit} | STRONG INFERENCE (wiki, matches client function names; wiki flags hit-chance section as possibly outdated) | sanity: weakness 20 % reduction reproduces wiki example 1006 → 804.8; max-hit example (96 str, L90) → 25 ✓ |
| 3 | Combat XP = 5·damage (4 style + 1 health); kill cycle = TTK + 2.55 s | VERIFIED (SharedSettings) | – |
| 4 | Skilling XP/h = `ExpReward / BaseTime · 3600 / (speed factor)` | VERIFIED base; speed mapping HYPOTHESIS | – |
| 5 | Dodge = 0.18 %·Agility, cap 21.6 % | STRONG INFERENCE (wiki + loc string `agility_dodge_info`) | – |
| 6 | Clan event power `((speed/100)·2.75+1)·level/2` | STRONG INFERENCE (wiki) | – |
| 7 | Clan quest effort: `EffortSecondsPerMember 120 000`, exponent 2.5 on level, floor 5 % at L1, production ×0.75 | VERIFIED parameters, formula shape HYPOTHESIS | – |
| 8 | Drop EV/kill = Σ wᵢ/Σw · amountᵢ · valueᵢ | VERIFIED data | – |

## 1. XP curve
Increments: 75 (L2–6), ~152 (7–13), ~304 (14–20), ~605, ~1 207, ~2 409, ~4 810, ~9 613, ~19 214, ~38 415, ~76 818, ~153 619, ~307 221, ~614 423, ~1 228 824, ~2 457 627, ~4 915 228, ~9 830 429 (L119–120). Each band is 7 levels, so **XP to the next level doubles every 7 levels** (RuneScape doubles every ~7 too, but smoothly). Consequences: L99→L120 costs 7× the XP of L1→99; "half of all XP to 120 is in the last 7 levels".

## 2. Combat numbers (from `monsters.csv`)
Regular monsters: HP 4–90, defence 1–90, attack 2 500–4 000 ms. Valley bosses: HP 350–600, def 175–250, def bonus 145–200; Kronos HP 4 000, rig 750, str 475, def 255, bonuses ~200–325, max hit ≈ 195 (`maxHit(195, 475)`), 4 500 ms. Simulation (`simulations/idleclans_model.py`, hypothetical player bonuses +60/+130/+200): a L120 player with +200 bonuses hits kronos 30 % for ≤63 → ~17 min/kill solo and ~20 k damage taken → designed for groups (`CanBeTeamed`), consistent with loot-share rules.
Respawn floor: with 2.55 s respawn, a 4-HP turkey yields ≤ 14 k xp/h regardless of gear; XP/h ∝ DPS otherwise (regular monsters 25–120 k xp/h across archetypes).

## 3. Skilling rates
Gathering base XP/h grows 9 k → ~20 k (WC/mining/fishing), 9 k → 35 k (foraging), 18 k → 38 k (agility), 13 k → 60 k (plundering, success-gated: base chance 31 % → 6 %, 100 % at the listed cap, +10 % clan). Processing: cooking 7–120 k, smithing 8–150 k (astronomical bar 60 s/2 500 xp), brewing ~50 k. Timers for L105+ content are 10–60× longer than the tier below (ignis 150 s, sea serpent 180 s, the summit 262 s, archaeological society 240 s) with proportionally larger XP — deliberately "set and forget" tasks for offline play.

## 4. Upgrade economics
Double-loot upgrades (fisherman/lumberjack, 26.35 M for 100 % double) double gold/h of a gathering skill forever; with ~15 k gold/h base at L90 they pay back in ~1 750 h of that skill — they are prestige/endgame, not early ROI. Offline progress 6 tiers (44.2 M) raise the cap hours — the highest-leverage purchase for a 1-login/day player. Housing 38.1 M for +25 % XP ≈ −20 % time on every skill. Bank space: 190 tiers geometric (≈ ×1.04/tier) — a continuous micro-sink.

## 5. Potions
11 potion types: `(chance %, strength %, duration s)` = (0,10,601), (0,5,300), (0,40,600), (10,0,180), (0,10,600), (25,0,900), (25,105,600), (0,20,600), (0,50,600), (100,75,60), (100,15,600); Responsible drinking +10 % duration; clan Bigger bottles.

## 6. Offline
Cap 12 h base (+6 h premium, + Offline progress upgrade tiers); tasks continue at full rate until the cap, so one 18 h window per login is the practical throughput ceiling.

Reproduce: `python3 -I simulations/idleclans_model.py`, charts via `simulations/charts.py` (needs matplotlib).
