> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/rimworld/1.6.4871/gameplay/GAMEPLAY_SYSTEMS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Gameplay systems, design and psychology

RimWorld is a colony simulation that its own code calls a story generator. The player gives standing orders: work priorities, zones, bills, designations, schedules and policies. Autonomous pawns carry them out while the storyteller injects events scaled to the colony. Unless noted otherwise, claims are VERIFIED in `evidence/decompiled/` or the defs, and design-intent statements are labelled INTERPRETATION.

## 1. Core loop
1. **Set up conditions.** Zones, stockpiles, buildings, bills, work priorities, timetables, food, drug and apparel policies.
2. **Pawns act on them.** Think trees choose between needs and work, and work givers find the nearest valid target (`ai/AI_ARCHITECTURE.md` §1–3).
3. **The colony accumulates.** Wealth, skills, research, relationships and memories.
4. **The storyteller responds.** Threat size follows wealth and colonist count, and timing follows the storyteller's cycle or randomness (§8 there).
5. **Events damage, kill or change pawns.** Mood, injuries, deaths and new arrivals alter what pawns can do, and the loop resumes.

The player is a planner, not an actor. The only direct control is drafting, where pawns become soldiers with move and attack orders.

## 2. System map
| System | Main code / defs | Feeds |
|---|---|---|
| Needs and mood | `Need_*`, `ThoughtDef` (923), `Need_Mood` | mental breaks, work time lost, inspirations |
| Work and jobs | 23 work types, 153 work givers, 320 job defs | everything produced, built, cleaned, treated, hauled |
| Health | `HediffDef` (324), body-part trees, capacities (Consciousness, Moving, Manipulation, Sight …) | stats via capacity factors; death; mood |
| Skills and traits | 12 skills (XP curve, passion, decay), 51 traits | stat multipliers, quality, mood, break thresholds |
| Production | `RecipeDef` (190), bills, benches, quality | items, wealth, trade goods |
| Farming and animals | plants (107 plant defs), 158 race defs, taming, training, gathering | food, materials, combat animals |
| Construction and environment | buildings (588 defs), rooms (beauty, cleanliness, space, impressiveness), temperature, power | mood, research and work speed, safety |
| Research | 164 projects (77 Core) | unlocks of recipes, buildings and items |
| Combat | verbs, `ShotReport`, cover, armor, `DamageDef`s | injuries, deaths, loot |
| Social | interactions, opinions, relations, romance, recruitment | mood, breaks, fights, joiners |
| Factions and world | goodwill, settlements, caravans, trade, quests (`QuestGen`) | silver, allies, threats, colonists |
| Storyteller | 109 storyteller comps across the storyteller defs, 131 incidents, 11 raid strategies | all external events |
| DLC layers | Royalty (titles, psycasts), Ideology (precepts, roles, rituals), Biotech (genes, children, mechanitor), Anomaly (entities, horror), Odyssey (orbit, gravships) | extra need, thought, stat and incident layers on the same frameworks |

The DLCs extend the same frameworks (defs, comps, thoughts, stats, think-tree inserts, storyteller comps) instead of adding parallel ones. This is why 13 159 defs coexist with one tick loop and one AI.

## 3. How a pawn's day plays out
A colonist's timetable has 24 hourly slots (Anything, Work, Joy, Sleep, Meditate). In a Work slot only hunger interrupts work. In Anything slots, rest below 30 % or joy below 35 % outranks work (priorities 8 and 6 against 5.5). Rest falls 0.95 per day and sleep restores it in about 10.5 h. Food falls 1.6 per day for a human (model §5). Mood follows thoughts slowly (8 % per hour down, 12 % up). If it stays below the break threshold for more than 2 000 ticks (48 min), break checks begin. A colony that is overworked, ugly or grieving therefore declines over hours, not instantly, and the player can see it coming in the needs and thoughts panes.

## 4. Design and psychology (INTERPRETATION grounded in the verified mechanics)
- **Failure is content.** Deaths, breaks and losses feed thoughts, tales and art descriptions (`TaleRecorder`, the `CompArt` tale picker), so a bad event becomes a remembered story element instead of a pure setback.
- **Rubber-banding is explicit and hidden.** Adaptation days fall when colonists die or are downed and rise in peace (`StoryWatcher_Adaptation`), and the points factor runs from ×0.40 to ×1.47. Losing makes the next threats smaller; winning makes them larger. The player sees the effect but not the number, so the difficulty feels like narrative rather than a slider.
- **Fair randomness.** Cassandra and Phoebe draw threats from a seeded schedule with minimum spacing (1.9 and 8.2 days) inside on/off cycles. The colony cannot be hit twice in a row by chance, and save-scumming does not move threats. Randy removes the spacing for players who want variance but keeps a 13-day forced-threat guarantee.
- **Wealth is a double-edged score.** Threat points follow wealth, with buildings at half value. Every improvement raises danger, so the player is always weighing growth against defence. Players have built a "wealth management" metagame on this; the code supports the strategy (items at full value, buildings at half).
- **Legible causation.** Every mood point has a named thought, every stat a breakdown, every job a reason in the inspect pane. Even when a break comes from randomness (MTB checks), the player can always trace why the pawn was at risk. This is the difference between unfair and dramatic.
- **Attachment through specificity.** Backstories (845), traits, relations, passions and generated names and art make pawns individuals. Losing one hurts because of that, which is where the game's emotional weight comes from.
- **Indirect control as tension.** Pawns obey priorities, not commands, so the player's plan meets the pawns' needs: a cook leaves mid-meal to sleep. This produces the "watching a story unfold" stance rather than micro-management.
- **Pacing by days and by speed.** Threat points ramp from ×0.70 at day 10 to ×1.0 at day 40. Cassandra's first big threat waits until day 11, Phoebe's until day 13. Combat forces normal speed for 800 ticks after each shot, and speed ×12 while everyone sleeps compresses quiet nights.
