> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/super-auto-pets/steam-2026-11-25/progression/PROGRESSION.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Super Auto Pets — Progression

## Within a run (the only power progression)
| Axis | Mechanism | Pace |
|---|---|---|
| Shop tier | turn clock 1/3/5/7/9/11 | fixed; level-ups peek one tier ahead |
| Team stats | ability scaling (End turn / Buy / Sell / Faint / Start of battle), foods, merges (+1/+1 per XP) | +1…+3 per turn per scaler early; snowballs; capped 50/50 |
| Pet levels | 2 XP → L2, 5 → L3 | 3 / 6 copies; level 3 is an achievement per pet |
| Board size | 5 slots from turn 1 (team of 3–5 realistically) | economy-limited |
| Lives/trophies | 5 lives, 10 trophies to win; later losses cost 2–3 lives | ~12–18 turns per run |

## Between runs (meta-progression, no power)
Packs owned (purchase/gift) → wider pools and custom packs; achievements (one per pet at level 3) and ribbons (red: win with L3 pets; blue: hard mode with L2/3); cosmetics/backgrounds/mascots/entrances/trumpets; snacks; ranked versus leaderboards; weekly pack rotation (Mon 00:00 UTC) as the content heartbeat; hard-mode variants (`Difficulty` enum: Hard = stronger opponent teams, Extreme, ToyHard = "Cursed" with a forced toy after every two turns, Classic, Broken).

## Pacing judgement
A run lasts until 10 wins or 0 lives, typically on the order of 12–18 turns (estimate; no telemetry), untimed in Arena or on 90 s / 24 h turns in versus. The tier clock creates a predictable rhythm (turn 3, 5, 7, 9, 11 are "upgrade turns"), lives make early losses cheap (life refund at turn 3) and late losses expensive — a textbook rising-stakes curve. Because nothing carries over, every run restarts the learning loop; mastery (not stats) is the persistent progression, which is why the game can sell packs without selling power.
