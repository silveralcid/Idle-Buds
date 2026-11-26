> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera (v7.0.0) — Final Reverse-Engineering Research Report

Date 2026-11-25 · Target `E:\AI Agent\IdleBuds-ReverseEngineer\Kolterra` · Workspace `research/koltera/`

## 1. Executive summary

Koltera is a free single-player idle creature-collector by King Otter Games (Steam, Dec 2023, Mixed reviews). The shipped build is **Electron 27 + a Create React App bundle**, and it ships its **full source map with embedded sources**, so this investigation recovered the complete original code (59 JS files, ~13.3 k lines; plus `electron.js`/preload from the asar) and all 7 data tables. Consequently nearly every finding below is **VERIFIED** from source and **validated by executing a Python port** of the formulas (`simulations/`).

The game is one pure JSON state advanced by a 1-second reducer tick across 14 auto-registered controllers. Thirteen systems (mining, training, exploring, gardening, soulstones, magic, trading, breeding, augmenting, combining, gene modification, upgrades, achievements) all deposit into a single **492-cell Collection Log** (41 species × 12 variants), which is also the win condition. Its strongest ideas are the one-grid goal, creatures-as-tools job routing, deterministic pity (soulstones) and a *targeted* late-game summon. Its weaknesses are a front-loaded unlock curve (every system by trainer level 9, ~1–2 h), three parallel geometric walls with no prestige loop, cubically decaying meta-currency income, and several displayed-but-dead mechanics (elemental typing is a verified bug). A coin-priced rock-unlock ladder (10.88 M coins for all 11 rocks) gates both mining tiers and which augments exist, and every trader offer demands an augmented creature, so Mining → rock unlocks → Augmenting → Trading is the real early-game spine.

## 2. Technical architecture → `architecture/TECHNICAL_ARCHITECTURE.md`
Electron main process = save-file IPC + Steam achievements; renderer = React/AntD; `useReducer` + `lodash.clonedeep`; 1 s tick; autosave every 15 ticks; versioned migrations + recursive schema patch + 50 rolling backups; offline progress estimated analytically (mining + lumin, ×0.75, uncapped). No DRM/anti-cheat/network.

## 3. Gameplay systems → `gameplay/GAMEPLAY_SYSTEMS.md`
Exact rules for all 13 systems, including the creature stat model, mining stamina duty cycle, combat round, loot tables, trader composition, breeding inheritance table, augment/breed cost tables, gardening ladder, magic soft caps and spells.

## 4. System interaction diagram → `gameplay/GAMEPLAY_SYSTEMS.md` §12 (ASCII) and `economy/ECONOMY.md`.

## 5. Progression & economy → `progression/PROGRESSION.md`, `economy/ECONOMY.md`
Cubic XP; 5 % tithe to Trainer level; 1 Legacy/level vs 1 526 Legacy to max all upgrades; unlock gates L0–L9; rock-unlock ladder 500 → 5 M coins; currencies/sinks/bottlenecks ranked: explore-resource → magic chain, 10 B Lumin, 1.07 M augment minerals, 102 350 exploration steps, vibrancy-0 RNG.

## 6. Mathematical models → `mathematics/FORMULAS.md` (+ `charts/`)
All formulas with executed validation. Highlights: mining income converges across rocks (Value/Health ≈ const) and is throttled by stamina, not damage; breeding P(perfect gene | perfect parents) = 0.755, perfect child 24.5 %; magic boost `400·3L/(400+3L)`; gardening efficiency ×5/3 per tier; exploration `50·2^n`. Ten config-vs-code discrepancies documented.

## 7. Content architecture → `content/CONTENT_ARCHITECTURE.md`
7 JSON tables for nouns, literals for prices; 492 sprites by naming convention; vibrancy as CSS grayscale; no localization; no audio.

## 8. Design strengths & weaknesses → `gameplay/DESIGN_AND_PSYCHOLOGY.md`

## 9. Technical implementation observations
Clean controller convention; everything serializable; perf scales with roster size (double deep clone per action); inactivity reload as leak mitigation; dead code from removed features (sanctuary, market price influence, timestones, global bonus, the fifth 'magic' staff); typing bug; un-throttled auto-spells; config drift (~half of `_GameConfig` unread).

## 10. Development complexity assessment
Whole game ≈ 13 k lines JSX + ~1 k lines data, solo-dev scale, ~6 months of part-time work judging by scope (HYPOTHESIS). Per-system complexity table in `development-lessons/`. Nothing requires more than a web developer's toolkit; art (494 sprites) is the dominant content cost.

## 11. Reusable design principles → `development-lessons/DEVELOPMENT_LESSONS.md` (9 principles)

## 12. Independent implementation recommendations → same file; plus `prototypes/collection_idle_prototype.html` (original, single file, demonstrates tick engine, job routing with stamina, collection grid, shard pity, targeted summon).

## 13. Supporting experiments & evidence → `experiments/EXPERIMENT_LOG.md`, `evidence/`, `simulations/`

## 14. Remaining unknowns
| Item | Status |
|---|---|
| Real player pacing (hours to 492) | UNKNOWN — no save data or telemetry; simulations assume fixed upgrade states |
| Why the elemental typing bug and dead systems shipped | UNKNOWN (no commit history) |
| Steam achievement rarity / player distribution | UNKNOWN (not fetched) |
| Demo build (`REACT_APP_DEMO`) differences beyond the L25 cap | partially known (caps only) |
| Koltera 2 (sibling folder) | NOT INVESTIGATED (out of scope: "Kolterra 1") |
| Felt UX (juice, readability on Deck) | STRONG INFERENCE only — no live session run |

## 15. Completion checklist
| Requirement | Status |
|---|---|
| Game engine identified | YES |
| Technical architecture investigated | YES |
| Accessible game data structures documented | YES (all 7 tables + save schema) |
| Core gameplay loops mapped | YES |
| Major gameplay systems understood | YES (13/13) |
| Progression systems reconstructed | YES |
| Economy analyzed | YES |
| Significant formulas investigated and validated | YES (source + executed port + Monte Carlo) |
| Content architecture understood | YES |
| Save and persistence mechanisms investigated | YES |
| User experience analyzed | YES (static analysis; no live session) |
| Player motivation and retention analyzed | YES |
| Major system interactions mapped | YES |
| Development lessons extracted | YES |
| Useful simulations and experiments completed | YES |
| Findings supported by evidence | YES (file-level citations throughout) |
| Remaining knowledge gaps documented | YES (§14) |
| Final report completed | YES |
| Research independently reviewed for accuracy | YES (§16; errors found were corrected) |

## 16. Independent review (completed)
A separate agent that had not seen the analysis audited 25 VERIFIED-tier claims against the recovered source and ran the Python model. Result: **22 confirmed verbatim, 1 not verifiable from the bundle it was given** (Electron main-process details — those come from `evidence/asar_extract/build/electron.js`, which is in this workspace), **2 incorrect** plus adjacent errors. All findings were re-checked against source by the author and corrected in the documents:

| Reviewer finding | Fix applied |
|---|---|
| Pickaxe / rock-unlock ladder is **live**, not vestigial (10 881 169 coins; gates rocks for mining and augmenting) | Rewritten in architecture §5/§7, gameplay §1/§7, economy, progression, lessons |
| Manual spell costs are 2 / 5 / 20 (15 is the auto-summon price) | gameplay §10, economy |
| Fast Learner adds +25 XP per level (Value 5 × level × 5), not +5 | gameplay §4 |
| Staff upgrade cost splits across `min(floor(L/5)+1,4)` resources, not always 4 | gameplay §10, formulas §8, model comment |
| Fifth "magic" staff has no craft/upgrade UI → its boost is dead; automation gated by the 4 domain staffs | gameplay §10, architecture §7 |
| Trader offers require a **specific augment** on the creature handed over | gameplay §6, progression |
| Minor: starter-offer wording, MAGIC_STAFF hoisting wording, controller count 14, vibrancy's other mechanical uses, Geologist/Shiny Things in level terms, combiner level-1 rule, auto-spells fire every tick, soulstone summon ignores cap, offline ignores Prospector | all patched |

Reviewer's verdict on the mathematics and the Python port: faithful and reproducible. Residual risk after corrections: felt-UX statements remain inference (no live session).
