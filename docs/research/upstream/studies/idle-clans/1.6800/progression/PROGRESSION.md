> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/idle-clans/1.6800/progression/PROGRESSION.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Idle Clans — Progression

## XP table (VERIFIED from official table; model fitted)
One table for all 22 skills, cap 120, XP cap 500 M. Per-level increment ≈ `round(75·2^⌊L/7⌋ + 0.25·L)` (max cumulative error 0.26 % vs the published table; see `mathematics/FORMULAS.md`). Milestones: L50 = 86 043, L70 = 614 346, L90 = 4.30 M, L99 = 11.06 M, L110 = 31.9 M, **L120 = 88.5 M** (8× the XP of L99). Combat level formula exists in shared code (`CombatFormulas.CombatLevel(rigour,strength,defence,health,archery,magic)`) — body UNKNOWN.

## Time-to-level (simulated, base rates, best available task, no boosts)
| skill | L50 | L70 | L90 | L99 | L110 | L120 |
|---|---|---|---|---|---|---|
| Woodcutting | 8 h | 46 h | 253 h | 595 h | 1 577 h | 4 096 h |
| Mining | 7 h | 42 h | 245 h | 596 h | 1 643 h | 4 478 h |
| Fishing | 7 h | 47 h | 305 h | 717 h | 1 598 h | 3 915 h |
| Foraging | 6 h | 26 h | 137 h | 341 h | 956 h | 2 592 h |
| Agility | 4 h | 22 h | 136 h | 312 h | 856 h | 2 328 h |
| Plundering | 5 h | 25 h | 142 h | 318 h | 746 h | 1 689 h |

Realistic stacks (tools 25 % + gear 6 % + cape 20 % speed; house 25 % + clan house 30 % + consumables 4 % XP; ad boost) roughly halve to third these; offline progress (12 h, 18 h premium per login) means 1–2 logins/day keeps the task running continuously. L99 in a gathering skill is therefore a 150–300 h background commitment; L120 is ~1 000+ h — the endgame identity is "maxing", like its MMO ancestors.

## Progression axes
| Axis | Driver | Shape |
|---|---|---|
| 22 skill levels | tasks, combat, quests | exponential XP (×2/7 levels), ~flat rate → time-gated grind |
| Gear tiers | smithing/crafting/drops (bronze → … → godlike L80 → otherworldly L100–105) | step function by level req; weapon bonus 150–180 at top |
| Local-market upgrades | gold | 49 upgrades, 1–190 tiers, 825 M total; QoL and multipliers |
| Housing / clan house | gold + materials + credits | +5…25 % / +5…30 % XP |
| Mastery capes | gold at L90/100/110/120 | +5…20 % speed per skill; completionist cape = all |
| Collection log / achievements / titles | drops, milestones | 245 achievements, 5 difficulties |
| Clan rank / Clan Cup | contribution | monthly leaderboards |
| Pets | quest RNG (per-quest %) | pet levels unlock pet tasks |
| Premium | gold (1 M untradeable unlock) or IAP | removes L30 cap on Agility/Farming/Enchanting, +6 h offline, +25 % credits, 6 market slots, 3 premium-gated task groups |

## Gates and pacing
- Content is level-gated in 10-level steps (tasks at 1/10/20/…/90/105/110); every skill has an L105–110 “ignis/sea-serpent/the-summit” task with a very long timer (150–262 s) — prestige content for the 120 grind.
- Premium gates three skills at L30 and three task groups (`TasksLockedBehindPremium`), the main conversion lever; premium is also **earnable for 1 M gold** (`UntradeablePremiumUnlockCost`).
- Clan house tiers require 5 M → 500 M gold plus tens of thousands of planks/bars — a shared long-term sink that keeps clans cooperating.
- Offline cap (12 h) is the retention heartbeat: log in twice a day or lose throughput.
