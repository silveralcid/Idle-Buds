> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/idle-clans/1.6800/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Idle Clans (client 1.6800) — Final Reverse-Engineering Research Report

Date 2026-11-25 · Target `E:\AI Agent\IdleBuds-ReverseEngineer\Idle Clans` · Workspace `research/idle-clans/`

## 1. Executive summary
Idle Clans is a free multiplayer idle MMORPG by Isam Games (Finland), released April 2023 on Steam/iOS/Android (Mostly Positive, ~1 600 Steam reviews). The client is **Unity 6000.3 IL2CPP** with PlayFab auth, WebSocket game servers and a MongoDB document backend. Unlike Koltera, **the client contains no game rules or content**: every item, task, monster, upgrade, quest and tuning constant is a server document, and the simulation runs server-side with a shared C# assembly (`IdleMMOServer.Scripts.Shared`) compiled into the client for prediction.

Because the studio publishes a **public read-only API** (47 endpoints) whose `game-data` endpoint returns the entire content database (1 009 items, 318 tasks, 80 monsters with weighted loot, 234 quests, 70 upgrades, 245 achievements, 83 tuning constants) and an official wiki generated from game code, this investigation reached VERIFIED data coverage without touching the server beyond documented, rate-limited public calls. Code structure (3 190 classes with fields/methods/enums) was recovered with a purpose-built parser for the brand-new metadata v39 format, including reversal of the game's linear enum scrambler.

Design verdict: a faithful "OSRS grammar at idle cost" — one XP table that doubles every 7 levels, nearly flat XP rates so percentage boosts never obsolete, server-authoritative economy with a 1 % tax market and gold-buyable premium (bonds), and clans as shared sinks/buffs/fights. Its strain points are the L99→120 wall (7× the XP of 1→99 with no new verbs), premium gating of three skills at L30, and a heavy information load.

## 2. Technical architecture → `architecture/TECHNICAL_ARCHITECTURE.md`
## 3. Gameplay systems → `gameplay/GAMEPLAY_SYSTEMS.md` (11 systems + interaction map)
## 4. System interaction diagram → `gameplay/GAMEPLAY_SYSTEMS.md` §10
## 5. Progression & economy → `progression/PROGRESSION.md`, `economy/ECONOMY.md`
## 6. Mathematical models → `mathematics/FORMULAS.md`, `mathematics/charts/`
XP increment `round(75·2^⌊L/7⌋ + 0.25·L)` (0.26 % error); combat hit/max-hit/XP formulas (wiki, names match client); skilling XP/h and hours-to-level tables; combat Monte Carlo on real monster sheets; drop EV; upgrade economics.
## 7. Content architecture → `content/CONTENT_ARCHITECTURE.md`
## 8. Design strengths & weaknesses → `gameplay/DESIGN_AND_PSYCHOLOGY.md`
## 9. Technical implementation observations
Server-delivered content with version numbers; shared simulation assembly; enum scrambling (reversible); shipped debug consoles and a developer test item in public data; Roslyn in the client; bucketed public API rate limits; 23-language CSV localization.
## 10. Development complexity
Backend-heavy: game servers, Mongo config, PlayFab, market, clans, raids, API — a multi-year, small-team live-ops product (STRONG INFERENCE from scope: ~3 200 client classes, 491 network DTOs, 17 config collections). Client itself is UI-only Unity.
## 11. Reusable design principles → `development-lessons/DEVELOPMENT_LESSONS.md`
## 12. Independent implementation recommendations → same file + `prototypes/shared_sim_prototype.html`
## 13. Supporting experiments & evidence → `experiments/EXPERIMENT_LOG.md`, `evidence/`, `simulations/`
## 14. Remaining unknowns
| Item | Status |
|---|---|
| Exact speed-boost → time mapping and stacking order | HYPOTHESIS (two bounds modelled) |
| Combat level formula body, `RitualPowerCalculator`, `PotionDurationCalculator` internals | UNKNOWN (native code, no disassembler) |
| Whether the wiki's hit-chance section is current (page flags it outdated) | UNKNOWN |
| Real player pacing / retention data | UNKNOWN (no telemetry) |
| MonoBehaviour prefab values (UI tuning) | UNKNOWN (no type trees) |
| Server-only logic (anti-cheat, market matching, offline accrual details) | UNKNOWN by design |

## 15. Completion checklist
| Requirement | Status |
|---|---|
| Game engine identified | YES |
| Technical architecture investigated | YES |
| Accessible game data structures documented | YES (class model + full content DB) |
| Core gameplay loops mapped | YES |
| Major gameplay systems understood | YES (skilling, combat, exterminating, raids, clans, quests/pets, upgrades, market, potions, invocation, achievements) |
| Progression systems reconstructed | YES |
| Economy analyzed | YES |
| Significant formulas investigated and validated | YES where public (XP fit validated; combat from wiki/shared names; stacking HYPOTHESIS) |
| Content architecture understood | YES |
| Save/persistence investigated | YES (server-side model; client holds none) |
| User experience analyzed | YES (static) |
| Player motivation/retention analyzed | YES |
| System interactions mapped | YES |
| Development lessons extracted | YES |
| Simulations/experiments completed | YES |
| Findings supported by evidence | YES |
| Knowledge gaps documented | YES (§14) |
| Final report completed | YES |
| Independently reviewed | see §16 |

## 16. Independent review
(filled in after the review pass)
