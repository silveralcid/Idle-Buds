> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/gameplay/DESIGN_AND_PSYCHOLOGY.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera — Game Design & Player Psychology

Tier: analysis is **STRONG INFERENCE** built on VERIFIED mechanics, plus public Steam reception (Mixed, ~65 % positive; recurring praise "relaxing / unique creature mechanics", recurring complaint "few clicks per hour / grind").

## What makes it fun (where it works)

1. **One goal, many doors.** Every system — mining, fighting, exploring, trading, breeding, augmenting, combining, summoning, spells — terminates in the same 492-cell grid. The player never asks "why am I doing this"; the Collection Log answers. This is the game's best structural decision.
2. **Creatures as tools, not just trophies.** A creature's stats route it into a job (high Attack → mining, Spd+Sta → exploring, bulk → training leader). Genetics/spirits make even duplicates compare differently, so the roster is a puzzle of allocation, not a list.
3. **Readable, honest math.** Cubic levels, linear upgrade costs, visible formulas in tooltips. Players can plan; nothing is hidden behind pity counters or obfuscated odds (the odds in this report are exactly what the code rolls).
4. **Layered acquisition with different risk profiles**: trader (time-gated, deterministic requirements), soulstones (grind, deterministic), breeding (cheap, stochastic, improvable), augmenting (expensive, deterministic variant), magic summon (rare, *targeted at missing cells*). Having a targeted filler late prevents the classic "last 3 % is pure RNG" despair — for the base diary. (The vibrancy-0 master log lacks such a path.)
5. **Anticipation beats**: hourly trader refresh, 5-second reactor ticks toward a visible summon bar, per-rock break animations, level-band graduation in training.

## Where it breaks down

1. **Front-loaded novelty.** All systems unlock by Trainer L9 (~1–2 h). After that there are no new verbs for 100+ hours. Idle games that retain (Melvor, NGU) stagger unlocks across the whole arc.
2. **Plateau instead of crescendo.** Three independent ×2 / ×3 walls (exploration, Lumin tiers, cubic augment costs) plus Legacy income that decays cubically produce a long flat middle with shrinking purchase cadence. There is no prestige loop to convert "stuck" into "restart stronger".
3. **Dead mechanics the player can feel**: elemental types are displayed (Codex) but do nothing (bug); market price fields, pickaxes, `trained` stats, `revealedStats`, global vibrancy bonus — all vestigial. Players sense depth that isn't there.
4. **Cost of manual operations scales with the goal**: ~450 augments and hundreds of breeds are individual clicks; the automation layer (Magic) only automates potions/trader/summons, not the heavy loops.
5. **Offline progress is generous but partial** (mining + lumin only, 75 %, uncapped) — the Steam complaint "lacks offline progression" predates this build; now the opposite risk exists (uncapped returns trivialize the coin economy after a long absence).

## Motivation profile (self-determination lens)
- *Competence*: strong early (fast levels, constant unlocks), weak late (walls, RNG).
- *Autonomy*: strong — specialization, job assignment, which walls to push, hoard vs sell.
- *Relatedness*: none (single-player, no social, Discord link only).
- *Collection drive / Zeigarnik*: very strong — the grayscale grid is a permanent "unfinished" cue.

## Genuine enjoyment vs obligation mechanics
No monetization pressure, no dailies, no FOMO timers; the hourly trader is the only appointment and missing it costs nothing. Obligation here comes only from sunk-cost toward 492/492. Compared with the genre, Koltera is on the ethical end: engagement is earned by goals, not extracted by scarcity. Its retention weakness is *design* (plateau), not manipulation.
