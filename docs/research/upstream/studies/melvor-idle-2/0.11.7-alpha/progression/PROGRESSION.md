> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle-2/0.11.7-alpha/progression/PROGRESSION.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Progression

| Axis | Curve | Notes |
|---|---|---|
| Skill levels | RuneScape-shaped table (`StandardExperienceTable`, L99 13 034 427; L120 104 273 162, 1–5 XP below Melvor 1 at 100 levels) | hard-capped at 99 (`ExperienceComponent.cs` 39; nothing calls `SetLevelCap`); XP keeps accumulating past the cap |
| Agility techniques | own curve: L10 3 043, L20 29 493, L30 252 356, L40 2 132 329 XP | doubles every 3.25 levels; cap 40 |
| Hunting journals | own curve: L10 499, L20 4 146, L25 11 275 | per HuntingAnimal (44, 41 log to the journal); cap 25 (bonuses at levels 2–25) |
| Mastery Guild rank | 0, 5, 10, 20, 40, 65, 100 % of a skill's task points (rounded up) | 7 ranks per skill (175 total), bonuses per rank; 3 251 wired tasks |
| Quests | 17 wired quests (37 quest objects; MQ18–MQ27 and 10 side quests are referenced nowhere) | gate content and NPC unlocks |
| Bank | base stacks + flat modifiers | an "ALPHA TEST ONLY" purchase adds 1 650 stacks after the initial limit of 100 |
| Offline cap | base 24 h, `FlatOfflineTime` modifiers | progression lever rather than a constant |

## Pacing (`simulations/m2_model_output.txt`)
- Base XP/h at the top gathering actions: Woodcutting ~23 000–31 000 (Ashen, Redwood), below Melvor 1's 43 200; Mining up to ~38 000 (Dense Coal; Dragonite ≈ 23 600), which is above Melvor 1's sustained Dragonite rate once its rock HP and respawn are counted (≈ 17 400 XP/h in the Melvor 1 model). Tuning intent UNKNOWN.
- Thieving entry targets are easy (Citizen 76 % at level 1, certain from level ~32) and the top targets need stealth bonuses (Palace Vault 5.4 % at 99); heists pay XP once per completed run, so base XP/h at 99 sits between ≈ 6 000 and 22 000 for all targets.
- Pets: 63 % chance by level 99 per skill for the 25 wired pets, ~100 % by 104.3 M XP; the master pets are not wired.

## Gates
Level requirements per recipe (`Requirements` of type `MelvorBase:Level`), quest steps, Mastery Guild ranks, toolbelt slot unlocks, shop purchase requirements; combat areas and dungeons by requirements and darkness.
