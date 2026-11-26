> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/legends-of-idleon/build-144/progression/PROGRESSION.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Progression

## Ladders (VERIFIED, `mathematics/FORMULAS.md` #1)
| Ladder | EXP L1→50 | L1→100 | L1→200 | Next-level ratio at L100 | Notes |
|---|---|---|---|---|---|
| Character level | 9.4·10⁶ | 1.39·10⁹ | 2.1·10¹¹ | ×1.066 | per character; base growth settles at ×1.044 from about L322 |
| Default skills (Mining, Chopping, Fishing, Alchemy, Catching, Trapping, Cooking) | — | 2.8·10¹⁰ | 1.6·10¹⁵ | ×1.126 | ×1.09 asymptotically |
| Smithing | — | 2.7·10¹⁰ | 1.6·10¹⁵ | ×1.126 | slightly cheaper early |
| Construction | — | 4.5·10⁷ | 2.3·10⁹ | ×1.048 | own curve with a break at L71 |
| Worship | — | 1.2·10⁸ | 3.9·10¹² | ×1.112 | |
| Breeding | — | 1.9·10⁹ | 2.5·10¹⁴ | ×1.130 | shared by all characters |
| Laboratory / Divinity | — | 7.2·10⁵ / 6.0·10⁵ | 2.2·10⁷ / 1.7·10⁷ | ×1.035 | nearly flat ladders |
| Sailing | — | 4.7·10⁷ | 3.2·10¹¹ | ×1.096 | |
| Gaming | — | 2.3·10¹³ | 2.8·10²⁴ | ×1.296 | ×1.13² per level above L20: a deliberate wall |
| Farming / Sneaking | — | 6.2·10⁹ / 1.4·10¹¹ | 7.5·10¹⁵ / 4.8·10¹⁶ | ×1.14 | |
| Summoning / Spelunking | — | 4.1·10⁸ / 4.4·10⁹ | 1.1·10¹² / 3.7·10¹¹ | ×1.09 / ×1.04 | |
| Research | — | 3.5·10¹⁴ | 2.3·10²⁹ | ×1.39 | also × `A_ResXP`^(L−20), a server variable (not known offline) |

Cumulative values are from `simulations/idleon_model_output.txt` §1 with no multipliers. The table is the point: every skill has a different curve shape, so "level 100" means very different effort per skill, and the later skills (Gaming, Research) are written to be walls while Laboratory and Divinity barely grow.

## What moves a character
1. **Next map, not next kill.** Kills per level on a fixed map grow about ×1.1 per level (Frog: 113 kills for L10→11, 1 075 837 for L70→71), so progress is moving to maps with higher EXP per kill, gated by portal kill counts (`MapDetails[map][0]`) and by accuracy (no hits below half the monster's Defence, FORMULAS #4).
2. **Accuracy and efficiency gates.** Fighting needs accuracy ≥ 0.5 × Defence to hit at all and 1.5× for certainty; skilling needs efficiency ≈ 10 × the node's Defence for a certain harvest (FORMULAS #20). Both turn stat growth into access to the next tier of targets.
3. **Multipliers from the account.** EXP and damage are products of dozens of account sources (stamps, bubbles, cards, statues, star signs, family bonuses, meals …), each a decay or add curve. A new account system usually adds a new multiplier rather than a new resource sink.
4. **AFK share.** Fighting AFK starts at 40 % and skilling at 52 % of the active rate; AFK-rate bonuses are among the most valuable because they apply to every idle character, all the time.

## Gates
Portal kill counts per map; quest chains (350 quests, NPC dialogue); class promotions at set levels (`ClassPromotionChoices`); world access through quests and bosses; system unlocks through quests and items; server-side events (happy hours, weekly boss, tournaments, raids) on a calendar the server sets.

## Pacing notes
- Early pacing is generous: characters below level 25 attack faster (FORMULAS #9), class EXP needs only 2 703 EXP for level 10 and 3.96·10⁵ for 30.
- The middle game is a breadth race: many systems at low levels give most of their value (decay curves), so spreading is efficient.
- The late game is soft-capped rather than capped: damage components are compressed in stages (FORMULAS #5), stamp and upgrade costs grow geometrically (#16), and the newest ladders (Gaming, Research) grow faster than any bonus.
