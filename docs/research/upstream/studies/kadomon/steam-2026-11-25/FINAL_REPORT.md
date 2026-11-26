> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/kadomon/steam-2026-11-25/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Kadomon: Hyper Auto Battlers — Final Reverse-Engineering Research Report
Date 2026-11-25 · Target `E:\AI Agent\IdleBuds-ReverseEngineer\Kadomon` · Workspace `research/kadomon/`

## 1. Executive summary
Kadomon is a Unity 2020.3 **Mono** build (Dino Rocket), so the whole game logic was recovered as C# (732 files) and every content asset was dumped with generated type trees plus a custom Odin-binary reader. Evidence is therefore almost entirely **VERIFIED**: 140 Kadomon stage definitions (29 three-stage lines playable + bosses/tokens/hyper forms), 177 attack scripts, 218 passive assets, the 12×12 type chart, the tuning singleton (`UnitDictionary`) and the full battle code.

The game is a Pokémon-flavoured roguelike auto-battler: a 12-layer map template (7 battles, 2 mysteries, 2 camps, boss; 3 shops and a mini-boss inserted; layers partly randomised), teams of 4, **tick-based combat** where SPEED is literally "ticks between attacks" and ENERGY "ticks until SUPER", damage = `ceil(ATK × 1.25^(effective type pairs) + Frail + Fatigue)` with no resistances, shields/fortitude/solid-armour mitigation, 28 stackable statuses, and a single `ATTACK_EFFECT` VM behind every attack, super, passive, item and field effect. Progression is EXP → evolution at **60 / 180 EXP**, where evolution raises HP (+≈14/stage) and ATK (+≈2.6/stage) but **never speed or energy** (0 of 29 lines), so tempo is a line's identity. Enemies are generated from an EXP budget that grows **+75 per battle fought** regardless of the player's choices, which quietly out-paces passive player EXP (+5/battle) and forces merging (+30) and recruiting defeated enemies (free). Economy is thin by design: 2 gold per battle, shop 5/7/10 by rarity, 1 ticket per boss/mini-boss to restock, morale 100 − 10 per surviving enemy on a loss (all of it on a boss loss).

Design verdict: a clean, data-driven small-team design — one effect VM, stage-indexed numbers with templated text, self-scaling enemies, a fatigue clock to end stalls. Weaknesses visible in code: unseeded `UnityEngine.Random` (no replays), simulation coupled to animation, a weighted-sampling routine whose per-unit weights make the displayed rarity odds (10 % / 30 % Rare) several times higher than the real enemy odds, and hidden rubber-banding that players cannot see.

## 2–13. Sections → `architecture/`, `gameplay/`, `progression/`, `economy/`, `mathematics/`, `content/`, `user-experience/`, `development-lessons/`, `prototypes/`, `experiments/`, `evidence/`.

## 14. Remaining unknowns
| Item | Status |
|---|---|
| Exact effect rows of every passive/super (extracted to JSON; only sampled by hand) | data VERIFIED, prose coverage PARTIAL |
| Shop stock size/composition in the shipped shop UI (`ShopBagController`), ticket amounts per boss | PARTIAL (tickets start at 1; `MinibossTooltip` says "[X] tickets") |
| Map generator details beyond `MapConfig` (path randomisation, shop/mini-boss placement rules in `Map/` namespace) | STRONG INFERENCE from config; code present but not fully read |
| Localization table contents (I2 asset unreadable) | UNKNOWN; strings are inline English |
| Intent behind enemy EXP mirroring and uneven stat lines | HYPOTHESIS |

## 15. Completion checklist
| Requirement | Status |
|---|---|
| Engine identified | YES (Unity 2020.3.25f1 Mono) |
| Technical architecture | YES |
| Accessible data structures | YES (all assets dumped and resolved) |
| Core loops / major systems | YES |
| Progression / economy | YES |
| Formulas validated | YES (read from source; simulation reproduces stat budgets) |
| Content architecture | YES |
| Save/persistence | YES (Easy Save 3 local; structure not dumped) |
| UX / motivation / interactions | YES (static) |
| Lessons extracted | YES |
| Prototype | YES (`prototypes/kadomon_tick_battler.html`) |
| Independent review | see §16 |

## 16. Independent review (completed)
A separate agent audited FORMULAS, GAMEPLAY_SYSTEMS, ARCHITECTURE, CONTENT and the executive summary line-by-line against 26 source files and the extracted data, re-running the simulation (byte-identical output) and recomputing every count. Confirmed: tick model and order, speed/energy formulas, Draining, damage formula shape and type stacking, 1.25/1.0 multipliers, mitigation chain, 60/180 thresholds and EXP sources, enemy budget/count/item-chance formulas, map template and counts, roster/type/class/keyword counts, stat-budget table, type-edge result, priority formula, Odin/Sheets/ES3/unseeded-Random facts. Errors found and corrected:
| Finding | Fix |
|---|---|
| STRENGTH was placed inside the multiplied attack; it is added flat after the formula on basic attacks only | formula row and gameplay text corrected |
| Fatigue "from tick 150" — the condition is `> 150 && % 10 == 0`, first at 160 | corrected (docs, lessons, prototype, simulation note) |
| Rarity "odds" are per-unit weights: effective enemy shares ≈ 96/4/0 and 84/16/0.3 %, and the shop uses a bucket-first sampler with true 65/30/5 odds | rewritten; UI/odds mismatch promoted to a design finding |
| "Sell a unit for 1 gold" — only binning an *item* pays 1 gold; releasing a unit pays 0 and +10 EXP to all | corrected |
| Rewards/EXP/enemy budget accrue after any battle fought (losses included while morale remains); boss loss zeroes morale; gold 2 and ticket 1 come from `UIManager` reward screen | corrected and cited |
| Map has 7 battle layers (not 8), partly randomised; "~11 battles / 22 gold" → ≈ 9 fights / 18 gold | corrected |
| `SetMaxHealth(100)` is in `RewardSelectScreen.SelectCard` (starter pick), not `StartGame` | citation fixed |
| Stat bounds in `UnitDictionary` are unenforced bookkeeping (ATK 3 exists) | reworded |
| Omissions added: LAST_WISH fires the super per stack; each basic attack costs 1 SHIELD; ASSASSIN targeting; enemies sorted by HP desc; locked units excluded; recruit candidates are pre-battle copies; EXPLODE has no caller | added |
| Epic line is one of the 29 lines (not extra); the "Hyper" forms are hidden Common/Rare stage-3 rows, EVENT = 11 names | content doc corrected |
| Unsupported-in-evidence items (priority queue direction) labelled STRONG INFERENCE | labelled |
Side findings from the review worth a dev's attention: `Entity.ReduceShieldPercent` uses `CeilToInt(amount/100)` (removes ~1 shield, not a percentage); `GlobalEffectHelper.RollConsume` uses `<= chance` so chance 0 still fires 1 %; `DealDamage` writes `attack.value = num`, so a non-basic attack row starting at value 0 can switch itself into fixed-damage mode unless reset.
