> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/rimworld/1.6.4871/progression/PROGRESSION.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Progression and pacing

RimWorld has no level or XP bar for the colony. Progression is spread over five tracks that interact: research (technology), pawn skills, colony wealth, colony size, and the storyteller's view of all of these. Sources and tiers are as in `mathematics/FORMULAS.md`.

## 1. Tracks
| Track | Rule | Pace (model or computed) |
|---|---|---|
| Research | points per tick = ResearchSpeed × bench × 0.00825 / cost factor; 164 projects (77 Core, 119 400 points in Core) | Electricity (1 600) takes 63 h at a hi-tech bench at Intellectual 10. All Core research for one such researcher at 8 h a day is about 590 days, close to ten 60-day years, before boosts (STRONG INFERENCE; computed) |
| Tech level | the colony's faction tech (tribal, Neolithic, or Industrial for crashlanded starts); projects above it cost 1 + 0.5 per level, with the project capped at Industrial | a tribal start pays ×2 for every Industrial-and-later project, an Industrial start never pays extra |
| Skills | XP to the next level 1 000 → 10 000 (L9) → 30 000 (L19); 265 000 XP from L0 to L20; passion ×0.35 / 1 / 1.5; ×0.2 after 4 000 XP per day; decay above L9 (L20: 3 600 XP per day) | skills plateau where practice balances decay; holding L20 needs about 14 h a day of research-rate practice (§15) |
| Quality | the skill level centres a Gaussian (L10: 0.4 % masterwork; L20: 9.5 %); Legendary only with inspiration or a role | quality, not quantity, is the late-game production goal |
| Wealth | items + 0.5 × buildings + pawns; drives threat points | grows with everything; see §2 |
| Colony size | joiners from events, quests, prisoners and births; colonist count adds threat points | storyteller population intent curves throttle joiners for large colonies (Cassandra, Phoebe) |

## 2. Threat as the counter-progression
- **Threat points** rise with wealth (0 below 14 000, 2 400 at 400 000, 4 200 at 1 000 000) and with colonists (15 to 200 points each by wealth). They are scaled by difficulty (Rough ×1, Extreme ×2.2), by days passed (×0.70 at day 10 to ×1.0 at day 40) and by adaptation (×0.40 to ×1.47).
- **Rough, day 60** (model §8): 100 000 wealth with 6 colonists gives about 800 points; 400 000 with 10 gives about 3 800; 1 000 000 with 15 gives 7 200, near the 10 000 global maximum.
- **Effect.** Each gain in wealth, people or survival time is answered by bigger raids. The real progression is the gap between defensive capability (skills, gear quality, research) and threat points. Defence scales with quality and skill (hit chance compounds per cell; armor and quality multiply), while threat scales roughly linearly with wealth (STRONG INFERENCE).
- **Adaptation** (`RimWorld/StoryWatcher_Adaptation.cs`; curves in `Storytellers.xml`).
  - A colonist death costs 30 adapt days, falling to 20 in colonies of 20 or more.
  - A violent down costs 8 adapt days with one colonist, 6 with two or three, 5 at 11 and 3.5 at 20, so small colonies get more relief per hit.
  - Below zero, adapt days recover at 3 per day (6 per day below −30); from 0 to 60 they grow by 1 per day, and above 60 by 0.5 (× a difficulty factor).
  - The upshot: a struggling colony gets quick relief, and long safe stretches steadily raise the stakes (model §9).

## 3. Early, mid and late game (STRONG INFERENCE from the curves; not playtested)
1. **Days 0–11.** No big threats under Cassandra (`minDaysPassed` 11; Phoebe 13); points ×0.70. The focus is food, beds, shelter and the first research.
2. **Up to day 40.** The days factor rises to ×1.0; raids follow the on/off cycle (Cassandra 4.6 days on, 6 off; 1–2 big threats per cycle). Wealth below about 50 000 keeps threats in the low hundreds of points.
3. **Mid game.** Wealth passes 100 000–400 000. Raid strategies with higher point gates (sappers, sieges, breach raids) appear. Skills reach the decay zone (L10+), and quality and medicine dominate.
4. **Late game.** Points approach the ceiling. The win conditions (ship, Royalty's royal ascent, Ideology's archonexus, Odyssey gravship journeys, Anomaly's endings, as quests and scenario parts) are optional goals and not part of the core loop.

## 4. Why it keeps going
There is no score to finish. The storyteller answers every gain with pressure, and losses are partly refunded through adaptation. The colony therefore oscillates around a dramatic equilibrium instead of snowballing or collapsing, unless the player overreaches or a run of bad luck lands (Randy). INTERPRETATION: this equilibrium, not the tech tree, is the game's progression design.
