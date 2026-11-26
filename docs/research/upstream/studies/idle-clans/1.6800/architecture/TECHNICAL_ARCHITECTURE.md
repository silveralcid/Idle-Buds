> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/idle-clans/1.6800/architecture/TECHNICAL_ARCHITECTURE.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Idle Clans (client build 1.6800) — Technical Architecture

Evidence tiers: **VERIFIED** (read from client binary metadata, asset files, or the official public API), **STRONG INFERENCE**, **HYPOTHESIS**, **UNKNOWN**. Idle Clans is an online, server-authoritative MMO; nothing on the server was accessed beyond the documented public read-only API (`query.idleclans.com`, rate-limited at 50 req/min globally), and the live game was not run or interfered with.

## 1. Identification (VERIFIED)

| Item | Value | Evidence |
|---|---|---|
| Title / developer | Idle Clans, Isam Games Oy (Kirkkonummi, Finland) | `app.info` company "isam_games"; App Store listing |
| Platforms | Windows (this build), macOS, iOS, Android; Steam App 2103530, free, released 2023-04-07 | SteamDB, store pages |
| Engine | **Unity 6000.3.25f1 (Unity 6.3)**, IL2CPP scripting backend, global-metadata **version 39**, D3D12 renderer | `globalgamemanagers` string, metadata header, `D3D12/` |
| Build | client `1.6800` = `RequiredBuildVersion` on the server; server config version 483 | `Configuration/build-versions` API |
| Native binaries | `GameAssembly.dll` 55 MB (all C# compiled to C++), `UnityPlayer.dll` 36.7 MB, no Mono `Managed/` folder | directory listing |
| Metadata | `global-metadata.dat` 18.4 MB: 24 398 types, 148 204 methods, 107 457 fields, 25 119 string literals; Assembly-CSharp = 3 190 types | custom parser `tools/meta.py` |
| Backend/services | **PlayFab** (`PlayFab.dll`), custom game servers over **WebSocket** (`bezi-websocket-sharp`), **MongoDB BSON** document model (`MongoDB.Bson.dll`, `ObjectId` in API payloads), Unity Services (Purchasing 4.x, Core), Steamworks.NET 2025.163 (SDK 1.63) | `ScriptingAssemblies.json`, `UnityServicesProjectConfiguration.json`, API JSON |
| Notable packages | Odin Serializer, UniTask, DOTween, Feel/MMFeedbacks, NiceVibrations (haptics), QuantumConsole + SRDebugger (debug consoles shipped), ZXing (QR), BouncyCastle, Roslyn `Microsoft.CodeAnalysis` (!), SharpToken, Newtonsoft.Json, Lean GUI/Transition, ChocDino UIFX | `ScriptingAssemblies.json` |
| Assets | `resources.assets` 17 MB (2 850 MonoBehaviours, 191 sprites, Localizations TextAsset 3.4 MB / 23 languages), `sharedassets0` (1 341 sprites, 37 audio clips), `level0`/`level1` (two scenes, ~31 k MonoBehaviours = UI prefabs) | UnityPy inventory |

Anti-tamper observed: **enum value scrambling** — every C# enum's constants are rewritten as `base + k·0x02020202` (Skill: None=100925952, Rigour=134611970 …). This defeats casual enum reading but is linear and trivially reversible (we recovered all 66 `UpgradeType` names by index). No code obfuscation of names; no DRM; nothing was bypassed.

## 2. Client/server split (VERIFIED by structure, STRONG INFERENCE for runtime behaviour)

```
 Client (Unity, IL2CPP)                                    Backend
 ├ Assembly-CSharp (3 190 types)                           ├ PlayFab (auth, accounts, IAP receipts)
 │  ├ Network.* (491 types: message DTOs, handlers)  ◄──ws──┤ Game servers (regions; /api/Server/info)
 │  ├ IdleMMOServer.Scripts.Shared.* (≈300 types)          │   run the same "Shared" assembly:
 │  │   CombatFormulas, CombatCalc, NPCCombatCalc,         │   CombatFormulas, ClanQuestGenerator,
 │  │   ClanQuestGenerator, PotionDurationCalculator,      │   PotionDurationCalculator, …
 │  │   RitualPowerCalculator, CollectionLogRules, …       ├ MongoDB (config docs: Items, Tasks, Upgrades, …)
 │  ├ Databases.* (66): FullReadonlyDatabase, CsvLoader,   └ query.idleclans.com (public read-only REST,
 │  │   ItemDatabase, TaskDatabase … (filled from server)        47 GET endpoints, Swagger)
 │  ├ Player.PlayerData (37 fields: Inventory, Equipment, Skills, Quests, Loadouts, Raiding, TaskQueue…)
 │  ├ Popups.* (251), UI.*, FTUE.* (15), Minigames, Raids (35), Guilds (29), PlayerMarket (10)
 │  └ DebugTools (20), QuantumConsole, SRDebugger (shipped debug UIs; server-gated per DebugCommandCatalog)
 └ Local: settings, notification scheduling, cached config (ConfigVersion 483)
```

Key architectural facts:
- **All content is data, delivered by the server.** The client ships no item/task tables; `Databases.*` classes deserialize Mongo documents (`ObjectIdJsonConverter`, `ReplaceCollectionsJsonConverter`). The public API's `/api/Configuration/game-data` returns the same documents (2.8 MB, 17 collections). Balance changes need no client update.
- **Shared simulation code.** The `IdleMMOServer.Scripts.Shared` namespace is compiled into the client so the UI can predict outcomes (hit chance, max hit, potion duration, clan-quest effort) exactly as the server computes them. The wiki (which the developers say is largely generated from game code) publishes the same formulas, and their function names match 1:1 (`AugmentedStat`, `HitChance`, `MaxHitFromStrength`, `ReduceDefenceForWeakness`).
- **Authority.** `PlayerData` holds `SessionLoginTime`, `ActiveServerId`, `TaskQueue`; `Network.*` has 491 message types. Progress is computed server-side on timers (offline cap 12 h + 6 h premium, `BaseOfflineProgressCapHours`). The client is a renderer plus predictor — a cheat-resistant design for an economy with a player market.
- **Rate-limited public API** with bucketed limits (`startup-query` 120/min … `extreme-query` 3/10 min) and optional trusted keys for heavy history queries.
- **Localization**: a single CSV TextAsset (5 690 keys × 23 languages) addressed by `*LocKey` fields in the data documents, so new content ships as data + loc rows.

## 3. Runtime loop (STRONG INFERENCE)
Unity main loop at `DefaultFpsTarget` 60; gameplay is event-driven from server messages (task completion, combat ticks, chat). Combat timing is server-side: player attack interval from weapon (`AttackInterval` 2 500–4 750 ms, unarmed 3 600), enemy interval per monster (2 500–4 500 ms), respawn 2 550 ms. Skilling tasks are timers of `BaseTime` ms reduced by speed boosts; task queue (`TaskQueue`, Oct-2026 rework) chains them.

## 4. Persistence (VERIFIED structure)
Server-side player documents (`PlayerData` fields: Inventory, Equipment, EquipmentBonuses, Potions, Quests, Skills, Enchantments, ToggleableSettings, AutoSellSettings, Loadouts, CombatLoadouts, Blocks, Exterminating, Rewards, Stats, Raiding, PurchaseLimiter, ClanInfo, Health, Invocation, Storages, TaskQueue, GameMode …). Limits from `SharedSettings`: inventory 60 starter → 250 max (+30/IAP up to 300), clan vault 8 base, max skill XP 500 000 000, max level 120. Local client stores only preferences. Three game modes (`GameMode` enum: Normal, Ironman, Group Ironman) share one codebase with per-mode config flags (`DisabledForIronmen`, `ExcludedGameModes`).

## 5. Observations / limitations
- Shipped debug tooling (QuantumConsole, SRDebugger, `DebugCommandCatalog`) and a developer test item (`white_block_of_mass_destruction`: +1 000 000 to every combat bonus, in the public item table) — harmless because the server validates, but noisy for collection-log/API consumers.
- Roslyn (`Microsoft.CodeAnalysis`) in a shipped mobile/desktop client is unusual (~6 MB); likely a dependency of a console/scripting package.
- Metadata v39 is newer than the public Il2CppDumper/Inspector tooling supported at the time of this investigation; a 120-line custom parser was sufficient for class/method/field/enum recovery (`tools/meta.py`, `tools/dump.py`).
- Method bodies are native code in `GameAssembly.dll`; no disassembler was available in the workspace, so formulas come from the shared-assembly names + wiki + API data, not from decompilation. See `mathematics/FORMULAS.md` for tiers.
