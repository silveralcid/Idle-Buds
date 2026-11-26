> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/rimworld/1.6.4871/user-experience/UX_ANALYSIS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# UX analysis

From the UI code (`RimWorld/MainTabWindow_*`, `Verse/Window`, `Verse/Widgets`, letters, alerts, `TimeControls`) and the defs. The game was not run, so layout and feel are inferred from code (STRONG INFERENCE where noted).

## 1. Control model
- **Standing orders, not commands.** The main surfaces set policy:
  - the **Work** tab, a matrix of pawns × 23 work types with priorities 1–4 or checkboxes;
  - **Schedule**, 24 hourly slots of Anything, Work, Joy, Sleep and Meditate;
  - **Assign** (outfit, food, drug and reading policies);
  - zones and areas, bills on benches, and designations (mine, chop, haul, hunt, tame).
  Drafting is the only direct control.
- **Inspect everything.** The inspect pane and the stat explanation tooltips break each number into its parts: base, factors, offsets, `StatPart`s. Each mood value is a list of named thoughts with durations, and each pawn shows its current job's report string (`JobDef.reportString`, in `jobs.csv`). This legibility is the main way the player learns a system of 13 000 defs. INTERPRETATION: it is also what makes AI failures feel fair.
- **Float menus.** Right-clicking with a pawn selected gives context actions (prioritise a job, equip, rescue …), each running the matching work giver's checks and listing why an action is not possible.

## 2. Time and attention
- **Speed.** ×1 / ×3 / ×6, with ×6 becoming ×12 while all colonists sleep. Ultrafast is dev-only and has no button.
- **Combat.** Shots force ×1 for 800 ticks (`TimeSlower`), so fights are always watchable.
- **Auto-pause.** The player can pause on major threats, any threat or any letter (`AutomaticPauseMode`).
- **Letters and messages.** Letters (one `LetterDef` per kind: ThreatBig, ThreatSmall, NegativeEvent, NeutralEvent, PositiveEvent, Death, NewQuest, AcceptJoiner, RansomDemand … 17 in Core) stack on the right and open into details, and many carry "jump to" targets. Messages are transient lines. **Alerts** are persistent rule checks: colonists idle, needing rescue, starving, low medicine, need for a warden …
- **Pacing.** The storyteller's spacing (minimum 1.9 days between Cassandra big threats) plus the forced ×1 in combat give rhythm: long fast-forwarded build-up, then a slow, attentive crisis (INTERPRETATION).

## 3. Strengths
1. Every system explains itself in place (stat breakdowns, thought lists, job reports, alert explanations).
2. Defaults are safe: new colonists get sensible priorities, and alerts surface the common failure states.
3. Speed controls adapt to the situation (sleep acceleration, combat slowdown), reducing the need to babysit the clock.
4. Failure reporting is designed in. When a pawn cannot do something, float menus and the work tab say why: reserved, unreachable, incapable, forbidden.

## 4. Weaknesses (STRONG INFERENCE from the code)
1. **Tier and distance logic is invisible.** Pawns take the nearest job in the highest `priorityInType` tier, not the most important one, and this rule is not shown. Players see "why is he cleaning?" without a way to read the work-giver order.
2. **Heavy late-game UI.** Many pawns × 23 work types × 24 schedule slots, plus per-bench bills, become spreadsheet work. The same data is in the work tab, and no automation layer is built in beyond bill rules (until X, repeat, do forever).
3. **Hidden numbers that drive the drama.** Adaptation days, threat points and the incident schedule are visible only in dev tools, so players reason about them through folklore.
4. **Performance is the player's problem.** When ticks get expensive, ×3 and ×6 silently deliver less than their label (`performance/PERFORMANCE_ARCHITECTURE.md` §1). The TPS and FPS counters (`GlobalControlsUtility.DrawTpsCounter`, which shows min(1000 / mean tick time, 60 × speed)) are behind debug view settings, and so is the 30-second benchmark. A normal player has no tick-rate feedback (VERIFIED for the counters' gating).
