> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/super-auto-pets/steam-2026-11-25/gameplay/DESIGN_AND_PSYCHOLOGY.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Super Auto Pets — Design & Psychology (STRONG INFERENCE)
**Why it works**
1. *Ten gold, five slots, one decision rhythm.* Every turn is a solvable knapsack with visible odds; the tier clock makes the whole run legible in advance. Decisions per minute are high, inputs are trivial.
2. *Tiny numbers, huge leverage.* Base stats are 1–6; a +1/+1 is a ~55-point win-rate swing early (simulation). Players feel every purchase.
3. *Composable abilities with generated text* keep 850 pets learnable: a pet is "trigger → effect", and triggers are a small shared vocabulary (Faint, Start of battle, End turn, Sell, Buy …).
4. *Asynchronous PvP against real boards* delivers a living meta without matchmaking waits; deterministic seeded battles make it fair and replayable.
5. *No power purchases.* Packs change the puzzle, not the odds; the fairness is structural, not promised.
6. *Short runs, cheap losses early, expensive late* (life refund at turn 3, multi-life losses later): tension rises exactly as investment rises.
7. *Weekly pack + customs* convert a fixed card pool into a rotating format, the same trick as Hearthstone's Tavern Brawl / TFT sets, at zero art cost.

**Where it strains**
- Shop RNG can brick runs; freezes and cheap rolls soften but don't remove it (the shipped sampler has no duplicate penalty — pass 2 decompilation).
- Trigger ordering edge cases (simultaneous faints, tie-breaks) are opaque to most players; the wiki is required for mastery.
- Meta-progression is thin (cosmetics/achievements); retention relies on the weekly pack and ranked versus rather than a growing character.
- Pack purchase fragmentation: custom packs require owning source packs, so the "fair" model still gates the creative mode.

**Enjoyment vs obligation** (inference from the systems observed): almost entirely intrinsic (puzzle + mastery + novelty); the main appointment is the Monday weekly pack; no energy system or consumables were found in the client's DTOs/strings, though seasonal cosmetics and a subscription surface exist.
