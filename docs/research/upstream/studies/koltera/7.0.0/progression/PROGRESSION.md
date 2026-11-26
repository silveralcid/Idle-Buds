> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/progression/PROGRESSION.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera — Progression Analysis

## Progression axes (VERIFIED)

| Axis | Driver | Curve | Cap | Type |
|---|---|---|---|---|
| Creature level | XP from mining/training/exploring | cubic (`L³`) | 100 | vertical |
| Trainer level | 5 % of all creature XP | cubic | 999 | vertical → unlocks + Legacy |
| Legacy upgrades | 1 Legacy / trainer level | linear cost per level | 1 526 Legacy to max all | horizontal (breadth) |
| Genetics | breeding (stochastic), gene mod (deterministic, potions) | bounded 1–100 | 100 ×5 | vertical per creature |
| Vibrancy | luck on creation, breeding 10 % reroll to 0 | discrete 0..75 | 0 | cosmetic + diary |
| Collection Log | every acquisition path | 492 cells | 492 → game complete | horizontal (the real goal) |
| Exploration | explorer stat throughput | geometric ×2 | 11 unlocks | gating |
| Rock unlocks | coins (Pickaxes.json) | ×2–7 per step, 10.88 M total | 11 rocks | gating (mining tiers + augments) |
| Magic staffs | explore resources | hyperbolic benefit, quadratic cost | asymptote +400 % | soft-capped vertical |
| Lumin / Legendaries | coins | ×1.67 efficiency per tier | 4 summons | milestone |

## Unlock timeline (level gates from `Settings.js`)

L0 Augmenting → L1 Training + Legacy Upgrades → L2 Exploring → L3 Gardening → L4 Soulstones → L5 Trading → L6 Breeding → L7 Magic → L8 Combiner → L9 Gene Mod. Trainer XP to L9 = 729 playerXP = 14 580 creature XP ≈ 1–2 hours of early mining/training. **All 13 systems are unlocked within the first session**; after that, depth comes from numbers, not new verbs. This front-loaded unlock curve matches the Steam-review complaint that the game becomes "a few clicks per hour".

## Phase model (STRONG INFERENCE from formulas + simulation)

1. **Bootstrap (0–1 h)**: 1 starter mining Topaz (0.2 c/s), choose specialization; first Legacy buys Recruitment/Athletics; training unlocks at L1 and starts the soulstone and XP engines.
2. **Expansion (1–10 h)**: crew to 4–8, parties to 2–3, first explorers; buying rocks 2–5 (500 → 32 k coins); trader every hour (each offer demands an augmented creature, so cheap Topaz–Ruby augments start immediately). Income 5–30 c/s.
3. **Systems online (10–40 h)**: rocks 6–10 (86 k → 5 M coins); Magic resources trickle in, first staffs, gene mod begins; auto-location and Medics automate training; exploration reaches locations 7–9 (6 400–12 800 steps).
4. **Grind plateau (40–200+ h)**: the three geometric walls bite simultaneously: exploration 25 600/51 200 steps, Lumin 500 M/10 B, and the augment diary (~1.07 M minerals) + breeding for vibrancy-0 perfects. Hundreds of creatures stress the clone-per-tick architecture.
5. **Completion**: 492 diary cells → `GameComplete` with `timeTaken`; optional "Master Completionist" (all 492 at vibrancy 0) is a second, mostly RNG, layer.

## Pacing judgements

- **Good**: cubic XP with linear-ish XP income gives fast early levels and a readable slowdown; level bands per location (5-wide early, 10-wide later) keep training relevant; the 5 % trainer tithe unifies all activities into one progression bar.
- **Weak**: Legacy is capped by trainer level, which is capped by the cubic — so late Legacy arrives ~1 per several hours while upgrade *costs stay linear*; the system simply runs out of meaningful purchases. Three independent ×2 walls (exploration, Lumin tiers, rock costs cubic) create a plateau rather than a crescendo. No prestige means no second curve to ride.
- **Hidden best buys** (from the sim): Athletics (regen 5→20 ≈ ×2 mining uptime), Recruitment (+2 slots each), Prospector (mean yield ×3.5 at max), Explorers (direct divisor of a 102 k-step wall). Worst: Fable Capacity beyond need (1 275 Legacy), Health Insurance (healing is cheap relative to income until L80+).
