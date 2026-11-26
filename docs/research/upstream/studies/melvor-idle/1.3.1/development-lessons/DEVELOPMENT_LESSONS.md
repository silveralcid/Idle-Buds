> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle/1.3.1/development-lessons/DEVELOPMENT_LESSONS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Development lessons

## Adopt
| Idea | Evidence | Reuse |
|---|---|---|
| Fixed-step tick (50 ms) with timers counted in ticks | `combatManager.js` 12–16, `game.js` 1770–1806 | deterministic simulation, exact intervals, save timers as tick counts |
| Offline = the same tick function, batch-sized to a frame budget | `game.js` 2200–2215 (`OFFLINE_GC_RATIO` 0.95) | no second code path; offline has the online distribution by construction (risky actions such as combat can be made opt-in, as Melvor does) |
| Render flags consumed once per loop | `renderQueue` pattern throughout | catch-up of thousands of ticks costs one render |
| Namespaced, schema'd data packages with `modifications` | `melvorDemo.json`/`melvorFull.json`, `namespaceRegistry.js` | the same loader serves base game, expansions, events and mods |
| One modifier system for every bonus source | `modifiers.js`, 570 definitions | new content adds bonuses without new code paths |
| Mastery XP that scales with action count | `skill.js` 2289–2298 | evens out per-skill mastery effort for interval-based skills (fixed artisan mastery intervals break the evenness) |
| Binary save with id remapping, compressed | `saveWriter.js` 525–537, 707–716 | small saves, stable across content additions |
| Disable background throttling in the wrapper | NW.js `chromium-args` | keeps a timer-driven game honest when minimised |
| Official mod manager with error attribution | `mod.js` | community content without destabilising support |

## Avoid
| Problem | Evidence | Better |
|---|---|---|
| Client-side entitlement gating of content files | `cloudManager.js` 508–531 loads packages after `has…Entitlement()` checks (whether the paid packages are served without login was not tested) | if gating matters, gate the files on the server |
| Very large single files | `mod.js` 6 558, `township.js`, `cartography.js`, `serializeSave.js` 2 882 lines of legacy conversion | split by concern; retire old-format converters behind a one-time migration tool |
| Modifier sprawl | 570 modifier ids, many sources, plus hard-coded item exceptions | expose an "effective rate" breakdown in game |
| Progress-stopping defaults | Thieving stops on stun; combat stops offline | make safe defaults visible at the moment they trigger |

## Principles
1. Make the simulation a pure function of ticks and saved state; everything else (rendering, saving, offline) is scheduling around it.
2. Data packages are the content API: if the base game uses the same path as mods and expansions, all three stay healthy.
3. Normalise long-tail effort in the formula (mastery's action-count term) instead of hand-tuning every skill.
