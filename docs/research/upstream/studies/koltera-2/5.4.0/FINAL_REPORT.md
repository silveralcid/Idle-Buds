> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera-2/5.4.0/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera 2 (v5.4.0) — Final Reverse-Engineering Research Report

Build: Steam (app 2834700), Electron 23.3.13 / Chromium 110, `koltera-2` 5.4.0 by King Otter Games, renderer bundle `main.87b32385.js` with full source map. Local single-player; nothing was launched, no save was read, no service was contacted.

## 1. Executive summary
Koltera 2 is the sequel to Koltera (researched in `../koltera/`) and, like it, ships a **source map with embedded sources**, so the investigation recovered the original TypeScript (207 files, ≈42.9 k lines) and dumped every content table by bundling the original modules with esbuild. Almost every finding is **VERIFIED** from source and exercised by a Python port (`simulations/k2_model.py`).

The game is one JSON state advanced by self-registering modules on a batched loop: a `requestAnimationFrame` tick clamps frame time to 1 s, counts 1-Hz fixed updates and dispatches them with one variable update every ≥ 33 ms through a single `structuredClone`. The design centres on a **120-species roster that is at once the collection, the workforce and the upgrade currency**: gathered and crafted goods (6 gathering skills on one shared 12-rung ladder, 3 workstations with 144 recipes) pay for summons; creatures work as **uncapped helpers** on any activity, in an 8-slot **sanctuary** (awakened creatures only) whose summed job values set per-skill bonus tiers, on never-failing **expeditions**, graded **dungeons** (an armor set per creature per run) and **machines**; each creature awakened at level 70 yields one of the exactly 120 points the **Awaken Tree** costs.

Key quantitative findings: one skill to 99 takes about 1 100–1 125 h at the in-game minimum bonus and 191–204 h with every other bonus maxed (XP ×3.55, cycles ×0.6); the flat **+3 yield** bonus is a 4× multiplier on gathered items, the largest item multiplier; universal-drop chances scale with base duration, so charm income is tier-neutral (4.5 containers/h base, 30/h maxed); the sanctuary point budget (271 of the 324 needed) makes lineup choice a genuine trade-off (max tier sum 25 of 30, three jobs at tier 5 at most, proven exactly in review), and it needs eight awakened creatures; before awakening, creature XP comes from helpers (0.40–0.95 XP/s base, 3.61 maxed), expedition type 1 (always 5 minutes: 1.0–1.8 XP/s solo by tier), dungeons (flat 450·tier per creature) and machines (0.5 XP/s); and because helpers are uncapped, labour scales with the roster (up to ~56 player-equivalents), so the real pace-setter is player skill levels: tier-3 to tier-5 summons need L60–L90 rungs, about 4 040 h base / 700 h maxed for all six gathering skills.

Defects are mostly drift between designer comments and values (sanctuary "+20 %" is +40, rock "1000·1.5ⁿ" is 750·1.191232ⁿ, "2 hr" is 1 h, "cap 99" is 70, and more), an offline engine that diverges from online in at least seven ways (some in the player's favour), per-cycle overshoot loss (≤ 0.34 %), unsaved machine counters, rule checks that live only in the UI, dead helpers, and dead unlocks for cut mini-games.

## 2. Technical architecture → `architecture/ARCHITECTURE.md`
Electron main process (Steamworks, IPC, AES-256-CBC save with atomic write, `.prev`, 11 backups) + CRA/React/Mantine renderer; reducer over one versioned JSON state; `require.context` module registry; two clocks; sleep detection; 72 h offline engine re-implementing each system.

## 3. Gameplay systems → `gameplay/GAMEPLAY_SYSTEMS.md`
Gathering, workstations, tools, creatures and summoning, helpers, sanctuary, expeditions, dungeons, machines, garden, Awaken Tree, fabrication, merchant, task board, milestones, tutorial and meta, with an interaction diagram.

## 4. System interaction
Roster-centred: every system produces summon inputs or creature XP, and creatures are the labour of every other system (diagram in the gameplay file).

## 5. Progression and economy → `progression/PROGRESSION.md`, `economy/ECONOMY.md`
Nine RuneScape-table skills, a 50·L² creature curve gated at 70, per-creature prestige; closed gold economy with front-loaded sinks (machines 3.2 M, garden 0.84 M) and back-loaded sources (awakened gold up to 43 200/h).

## 6. Mathematical models → `mathematics/FORMULAS.md`
32 formulas with source paths; model results for pacing, drops, sanctuary optimisation, summoning snowball, loop drift and offline penalty.

## 7. Content architecture → `content/CONTENT.md`
Content is typed TypeScript modules; skills and creature costs are generated from shared progression rows and tier functions; 120 creatures, 192 items, 144 recipes, 120 nodes, 20 expedition types.

## 8. Design strengths and weaknesses
Strengths: one roster feeding every system, allocation decisions with proven trade-offs, few loss states (only dungeon armor), per-entity prestige, tier-neutral currency income, robust saves. Weaknesses: the dominant levers (yield, uncapped helpers, expedition type 1) are not explained in the UI, the sanctuary is gated behind the first awakening without a preview, skills differ only cosmetically, offline silently diverges from online, and comments drift from values.

## 9. Technical implementation observations
Batching all fixed steps into one cloned dispatch is the right fix for a clone-per-action reducer; memoising sanctuary tiers keeps per-frame bonus lookups cheap; the separate 1 078-line offline engine is the main maintenance risk (it already diverges in XP rounding, processor inputs, idle-machine XP and timestamps).

## 10. Development complexity assessment
Small-team scale: ≈6 k lines of rules (modules), 13.6 k lines of content, 19 k lines of UI. The hardest parts to rebuild are the offline engine and the UI for managing up to 120 assignments, not the formulas.

## 11. Reusable design principles → `development-lessons/DEVELOPMENT_LESSONS.md`

## 12. Independent implementation recommendations
Same file, plus `prototypes/k2_planner.html` (original single-file planner: gathering bonus stacking and time to level, sanctuary lineup tiers from a creature picker, helper speed, creature levelling, expedition duration, dungeon grade, garden cost).

## 13. Supporting experiments and evidence → `experiments/EXPERIMENT_LOG.md`, `evidence/`, `simulations/`

## 14. Remaining unknowns
| Item | Status |
|---|---|
| Live balance data (how players actually pace; review sentiment for 5.x) | UNKNOWN (no telemetry, no store data gathered) |
| Steam Cloud configuration | UNKNOWN (no cloud API in the main process; may be set on Steam's side) |
| Designer intent behind comment/value mismatches (which is correct) | HYPOTHESIS: values are current, comments are stale |
| Expedition type 14 unlock at 300 completions | value VERIFIED; whether intended is HYPOTHESIS (likely 900) |
| The snowball estimate | labour-only upper bound (helpers on their best job, sanctuary members counted, +3 yield everywhere); it ignores level gates, which dominate |
| Exact merchant UI rules (weekly-limit reset time, discount rounding) | VERIFIED limits; reset timing not traced |

## 15. Completion checklist
- [x] Engine and stack identified (Electron 23 + CRA/React, Steamworks)
- [x] Source and data extracted (207 source files, full content dump, 11 CSVs)
- [x] Formulas with tiers (32 entries) and a model that applies most of them (16 sections; seven rows are documented rules only)
- [x] Simulation of pacing, sanctuary optimisation and summoning snowball
- [x] Prototype (`prototypes/k2_planner.html`), checked against the model
- [x] Design, psychology, UX and development lessons
- [x] Evidence with key redacted; originals untouched
- [x] Independent review (§16)

## 16. Independent review
A separate agent audited the workspace on 2026-11-26: it confirmed all 207 recovered files equal the source map's `sourcesContent`, checked every FORMULAS row against the cited code, recomputed the numbers with its own scripts, solved the sanctuary lineup exactly with an integer program, rebuilt the datasets (byte-identical), re-ran the model and ran the prototype in node, and confirmed that no save-encryption key literal remains anywhere in the copy.

### Confirmed
FORMULAS rows 1, 3–8, 11, 12, 14–17, 19, 21–24, 26–30 and 32 as written (several with extra line references); time-to-level values, multipliers (×3.55, ×0.6, +3, helper ×3.80), creature XP, summoning totals and charm counts, garden, machine and save mechanics; the sanctuary results (best 8 per job 75/74/73/75/73/75, top-8 job budget 271, tier-sum ceiling 25, at most three tier-5 jobs; 23 is the best tier sum with three tier-5 jobs); most ARCHITECTURE defects.

### Corrected after review
| Finding | Correction |
|---|---|
| Only awakened creatures can enter the sanctuary (`sanctuary/functions.ts` 20–24); docs had it as an idle-levelling slot | added to FORMULAS #10/#18, GAMEPLAY, PROGRESSION, UX, DEVELOPMENT_LESSONS, model §7–8; "136 h idle in the sanctuary" claims replaced |
| "XP accrues to 1.48 B" — `getMaxXp` is never called; XP is unbounded; `getXpForLevel` is off by one | FORMULAS #2, ARCHITECTURE #5, PROGRESSION, model §1 |
| Universal drops "constant at every tier" fails at the 45 s rung (common chance 1.125) | FORMULAS #9 and results, model §5 now prints all 12 rungs |
| Creature XP from expeditions (type 1 always 5 min: 1.0–1.8 XP/s solo, up to 3.24) and dungeons (flat 450·tier per creature) was ignored | model §9–10, FORMULAS #25 and results, PROGRESSION, GAMEPLAY |
| "All maxima" applied to all six skills at once; snowball ignored level gates and counted sanctuary members as helpers | FORMULAS #13 and results, PROGRESSION, ECONOMY, model §15 (rungs per tier, ~4 040 h base / 700 h maxed to L90 in six skills) |
| "Five XP sources, +305 %" | four player sources +255 %, four helper sources +280 % |
| Yield "on every resource, essence…" | gathering drops only |
| Dungeons consume one armor set per creature per run; "no failure states / removes loss aversion" | GAMEPLAY, ECONOMY (armor sets, 48 000 runes ≥ 2 000 S-grade runs), DEVELOPMENT_LESSONS |
| Offline diverges beyond XP rounding (primary input only, idle-machine XP, double `startTime` shift, garden remainder, stale `lastSaveTime`, crafting floor) | ARCHITECTURE #6, #13; FORMULAS #31; model §16 |
| Drift and offline-iteration figures used an unreachable 1 s cycle | 4.8 s minimum: ≤ 0.34 % drift, ≤ 54 000 iterations |
| Migrations "0 → 8+" | 0 → 21 |
| Numeric details: 1 131 h is not reachable (player level 1 gives +0.5 %: 1 125 h); 191 h needs player level 99 (≈ 204 h for a first skill); charm crates ≈ 41.4 M (binding type); greenhouse 225/h; per-tier input growth 10×/5×/2×/2×/1.5×; coal from logs 2–5; sell-value top excludes prestige points and Braymen's letter; placeholders are on traits, biomes and skills; `get-window-size` IPC; Moss and tier-3 cost exceptions; machine creature-type requirements | all corrected in place |
| Missed comment drift, dead code and UI-only rules | ARCHITECTURE #14–16 |
| Wording: "exercised by the model" for rule-only rows, design intent stated as fact ("tuned", "meant to", "intended bridge", "keep players returning"), "strongest lever" | reworded or labelled HYPOTHESIS/UNKNOWN |
| Reproduction: `universal_drops.json` key order (unsorted `os.listdir`), `story.csv` empty `rewards` column (field is `reward`), model docstring "148 entries" | fixed in `tools/build_dataset.py` and the model |

### Not changed
Electron 23.3.13 / Chromium 110 come from strings in `Koltera 2.exe`, which is not copied into the workspace (the original install is next to it); the esbuild dump was not re-run by the reviewer. The prototype's sanctuary picker still lets any species be selected so lineups can be explored; its panel note now says the game requires awakened creatures.
