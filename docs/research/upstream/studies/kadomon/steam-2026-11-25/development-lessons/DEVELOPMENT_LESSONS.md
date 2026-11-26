> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/kadomon/steam-2026-11-25/development-lessons/DEVELOPMENT_LESSONS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Kadomon — Development Lessons
| Pattern | Why it works | Adopt? |
|---|---|---|
| One `ATTACK_EFFECT` VM shared by basic attacks, supers, passives, items and field effects | One execution path to test; content = rows in ScriptableObjects | Yes |
| Stage-indexed magnitude arrays `X/Y/Z[stage]` + templated `passiveDesc` | Text and numbers can never disagree; balance edits are data-only | Yes |
| Speed/Energy fixed per line, HP/ATK grow on evolution | Tempo identity stays legible; evolution feels like a power spike without changing how a unit plays | Yes |
| Enemy budget mirrors player EXP (+75/battle) | Difficulty self-scales to the run; no per-floor tuning tables | Yes, but surface it (hidden rubber-banding) |
| Fatigue timer after round 150 (first stack at 160) | Guarantees termination of stall comps | Yes |
| Unseeded `UnityEngine.Random` in the sim | Simpler code, but no replays/async PvP and flaky QA | Avoid: seed the battle RNG |
| Simulation coupled to animation via pause counting | Easy to author visuals, but sim speed = animation speed; hard to headless-test | Avoid: separate sim from presentation (cf. Super Auto Pets' event stream) |
| `GetRandoUnit` applies rarity weights per unit (plus a small `>=` bias) | The UI shows the raw weights (10 %/30 % Rare) while effective enemy odds are ≈ 4 %/16 %; the shop uses a different bucket-first sampler | Fix: sample the rarity bucket first (as the shop does) or display effective odds |
| Stats authored in Google Sheets → SO import | Fast iteration for a small team | Yes |
