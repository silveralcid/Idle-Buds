> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/projects/game-dev/idle-game-reverse-engineering/README.md); [scope, corrections and rights](README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Idle game reverse-engineering program

Status: **active** (11 targets concluded and independently reviewed; RimWorld drafted, independent review in progress). Domain: game-dev. Local working copy: `E:\AI Agent\IdleBuds-ReverseEngineer\research\` on the owner's machine (game installs in sibling folders, never modified).

## Question
How do these idle, incremental and simulation games actually work (engine, data, formulas, progression, economy, offline/tick architecture, AI), what can be verified from the shipped build alone, and which design and engineering lessons transfer to our own games?

## Scope and rules
Each target gets a full pass under one governing brief ("Autonomous Game Reverse Engineering & Research Agent"): engine identification, data extraction, system analysis, formulas with evidence tiers (VERIFIED / STRONG INFERENCE / HYPOTHESIS / UNKNOWN / NOT APPLICABLE), simulations, design and psychology notes, development lessons, an original prototype, and an independent review by a separate agent whose corrections are applied before the study is marked complete. Constraints from the brief, verbatim:
- "Preserve the original game installation and save files"
- "Do not bypass DRM, anti-cheat systems, authentication, or other access protections"
- "Do not interfere with live multiplayer services or other players"
- "Do not redistribute proprietary game code or assets"

**Access control.** The studies' `evidence/` folders contain third-party material (decompiled or extracted code and data, game scripts) kept here only as a private backup at the owner's instruction (2026-11-25). Keep this repository private; do not publish or transfer that material. Keys found in evidence were redacted before commit.

## Studies
| Game | Study (canonical home) | Engine | Status | Evidence quality |
|---|---|---|---|---|
| Koltera (v7.0.0, "Kolterra 1") | [koltera/7.0.0](studies/koltera/7.0.0/README.md) | Electron 27 + React (CRA) | Concluded, independently reviewed | Full original source recovered from the shipped source map, mostly VERIFIED |
| Idle Clans (client 1.6800) | [idle-clans/1.6800](studies/idle-clans/1.6800/README.md) | Unity 6 IL2CPP; PlayFab/WebSocket/Mongo backend | Concluded, independently reviewed | Content DB from the official public API (VERIFIED) + client class model; formulas from wiki/shared-code names (STRONG INFERENCE); server logic not observable |
| Super Auto Pets | [super-auto-pets/steam-2026-11-25](studies/super-auto-pets/steam-2026-11-25/README.md) | Unity 6 IL2CPP; SpacewoodCore2 | Concluded, independently reviewed + pass-2 native decompilation | Class model + ability strings VERIFIED; roster, shop sampler, constants and trigger order decompiled from `GameAssembly.dll` |
| Kadomon: Hyper Auto Battlers | [kadomon/steam-2026-11-25](studies/kadomon/steam-2026-11-25/README.md) | Unity 2020.3 Mono | Concluded, independently reviewed | Full C# (ilspycmd) + every ScriptableObject dumped, almost entirely VERIFIED |
| Palworld (v1.0.5) | [palworld/1.0.5.102999](studies/palworld/1.0.5.102999/README.md) | Unreal Engine 5.1 | Concluded, independently reviewed | Content layer exported from the pak (503 DataTables …) VERIFIED; C++ formulas STRONG INFERENCE/HYPOTHESIS |
| Siralim Ultimate (2.0 branch) | [siralim-ultimate/2.0-gms-2024.14](studies/siralim-ultimate/2.0-gms-2024.14/README.md) | GameMaker 2024.14 YYC | Concluded, independently reviewed | Databases recovered statically from the exe; core formulas VERIFIED via a YYC lifter on Ghidra output |
| Milky Way Idle (web client 2026-09-28) | [milky-way-idle/steam-3224420](studies/milky-way-idle/steam-3224420/README.md) | Electron 32 wrapper + React web client, server-authoritative | Concluded, independently reviewed | Formulas from the official bundle and in-game guide (VERIFIED); data maps matched to the bundle; server combat via the community simulator (STRONG INFERENCE) |
| Koltera 2 (v5.4.0) | [koltera-2/5.4.0](studies/koltera-2/5.4.0/README.md) | Electron 23 + React/TypeScript | Concluded, independently reviewed | Original TypeScript from the source map; content tables dumped via esbuild, almost entirely VERIFIED; save key redacted |
| Melvor Idle (v1.3.1, base game) | [melvor-idle/1.3.1](studies/melvor-idle/1.3.1/README.md) | NW.js wrapper → TypeScript web client (50 ms tick) | Concluded, independently reviewed | Official client scripts and base data packages, VERIFIED with file/line refs; paid expansions not downloaded |
| Melvor Idle 2 (0.11.7 alpha) | [melvor-idle-2/0.11.7-alpha](studies/melvor-idle-2/0.11.7-alpha/README.md) | Godot 4.7.2 + C# (.NET 10) | Concluded, independently reviewed | Assembly decompiled and embedded PCK read; online namespaces stubbed |
| Legends of Idleon (client build 144) | [legends-of-idleon/build-144](studies/legends-of-idleon/build-144/README.md) | Electron 11 → Stencyl/Haxe/OpenFL HTML5; Firebase backend | Concluded, independently reviewed | Beautified client script and data classes evaluated offline; Firebase bridge read, no service contacted; review corrected four formula rows and the clock, sign-in and purchase descriptions, and found one OAuth client secret (now redacted) |
| RimWorld (1.6.4871, Core + 5 DLCs) | [rimworld/1.6.4871](studies/rimworld/1.6.4871/README.md) | Unity 2022.3.35f1 Mono + Burst; XML defs | Drafted, independent review in progress (deep pass on simulation, performance and AI) | Assembly decompiled (9 217 files) and 13 159 defs parsed after inheritance; tick loop, interval LOD, async Burst pathfinding, think trees, lords and storyteller read in code; exact storyteller RNG ported and cross-checked against C# |

Cross-game comparison: [COMPARATIVE_NOTES.md](comparative-notes.md).

## Layout of each study
README, FINAL_REPORT (§1 executive summary … §14 unknowns, §15 checklist, §16 independent review), `architecture/`, `gameplay/`, `progression/`, `economy/`, `mathematics/`, `content/`, `user-experience/`, `development-lessons/`, `experiments/`, `simulations/`, `prototypes/`, `tools/` (study-specific scripts) and `evidence/` (raw and derived evidence). `MANIFEST.md` and `SHA256SUMS` were added at backup time. The studies keep the internal layout they were written with, so their relative links still work.

## Shared tooling and environment
[tooling/](https://github.com/silveralcid/research/tree/3629e5eaec87049d38a0c0f4269135b90beea5d3/projects/game-dev/idle-game-reverse-engineering/tooling) holds the reusable toolkits (in the local workspace they are `research/tools/…`; references to `research/tools/<name>/` inside the studies mean `tooling/<name>/` here):
- `ue-pak-export/` — Unreal pak/usmap toolkit for Linux (CUE4Parse exporter, ooz-based Oodle shim, usmap class-model dump, pak index reader); Palworld.
- `gamemaker-yyc/` — GameMaker YYC toolkit (data.win parser, exe script/string/variable maps, database decoder, PyGhidra decompile-by-name, pseudo-GML lifter); Siralim Ultimate.
- `unity-mono-assets/` — Unity Mono asset extraction (UnityPy + generated type trees, Odin binary reader); Kadomon.
- `electron-asar-sourcemap/` — asar extractor and source-map recovery; Koltera 2, Milky Way Idle, Legends of Idleon.
- `godot-pck/` — Godot 4 PCK lister/extractor (embedded in signed executables) and `project.binary` decoder; Melvor Idle 2.
- `il2cpp-deep-re/` — IL2CPP decompilation toolkit (Il2CppInspectorRedux → Ghidra/PyGhidra pipeline, xref finders); Super Auto Pets, reusable for any IL2CPP target.
- `vm-snapshot/` — the analysis VM's own copies of scripts at backup time (some newer than the toolkit copies).

The analysis environment is described in [ENVIRONMENT.md](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/projects/game-dev/idle-game-reverse-engineering/ENVIRONMENT.md).

## Next action
Apply the RimWorld independent review, mark it concluded, add its comparative column, and back up again. All 12 folders of the local workspace (except Pokemon, done separately) will then be complete.
