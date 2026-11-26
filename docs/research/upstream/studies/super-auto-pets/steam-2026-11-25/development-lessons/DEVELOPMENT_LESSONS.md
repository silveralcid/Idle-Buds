> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/super-auto-pets/steam-2026-11-25/development-lessons/DEVELOPMENT_LESSONS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Super Auto Pets — Development Lessons
| System | What it does | Mechanism | Effective? | Complexity | Simplest viable | Adopt? |
|---|---|---|---|---|---|---|
| Deterministic seeded battle core as a pure library | fair async PvP, replays, server validation | `SpacewoodCore2`: BoardModel + BoardRandom(seed) + event stream + PlaybackModel | Excellent | Medium | pure function `battle(boardA, boardB, seed) → events` | **Yes** |
| Ability DSL (trigger × target × condition × effect × params × catalogue) | 850 pets from ~270 primitives | class-per-primitive, fluent `MinionTemplate` | Excellent for behaviour-heavy content | High upfront, low per-pet | a small set of trigger/effect enums with JSON params | **Yes** for auto-battlers/card games |
| Generated ability text | text always matches code; 13 locales | `CreateAbout` → Unity Localization "GeneratedStrings" | Excellent | Medium | template strings per effect | **Yes** |
| 10-gold knapsack with roll/freeze | dense decisions, visible odds | fixed income, uniform prices, freeze | Excellent | Trivial | same | **Yes** |
| Tier clock (odd turns) | pacing legibility | `DefaultShopUpgradeTierOnTurn` | Excellent | Trivial | same | **Yes** |
| Tiny stat scale + 50 cap | every point matters, scaling pets shine | base 1–6, +1/+1 steps | Very effective | Trivial | same | Yes |
| Merge-to-level with next-tier peek | tempo reward for consistency | 2/5 XP, choice of two next-tier pets | Strong | Low | same | Yes |
| Life refund at turn 3 + rising loss cost | forgiving start, tense end | `RecoverLife`, `LosePerLoss2/3` | Strong | Trivial | same | Yes |
| Async arena vs real boards | zero-wait PvP, live meta | server pool of committed boards by turn | Excellent | Medium (backend) | upload boards, sample same-turn opponents | **Yes** |
| Packs + weekly rotation + custom packs | infinite formats from fixed content | pack ownership flags, archetype rules | Strong | Medium | one rotating subset per week | Yes |
| Cosmetic-only monetization with pack gifting | trust | packs $5–10, gifts, no power | Strong, revenue-limited | Low | same | Yes if audience is large |
| Append-only enums with test/unreleased members | safe iteration | enum IDs, `SetReleaseVersion`, reworks kept | Good | Trivial | same | Yes |
| Shipped debug console / hot-reload stubs | dev velocity | QuantumConsole | fine with server authority | Low | strip or gate | Case by case |

## Principles
1. Make the battle a pure, seeded function and ship it on both ends; everything else (replays, fairness, anti-cheat, async PvP) falls out.
2. Express behaviour as a composable DSL and *generate* the player-facing text from it.
3. Keep numbers tiny and income fixed; depth comes from ordering, triggers and tempo, not from big stats.
4. Pace with a visible clock (tier turns) and a forgiveness window (life refund) before the stakes rise.
5. Sell variety (packs, customs, cosmetics), never power; let a weekly rotation do the live-ops work.
