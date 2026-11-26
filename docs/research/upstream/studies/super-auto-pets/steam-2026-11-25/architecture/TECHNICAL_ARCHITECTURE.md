> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/super-auto-pets/steam-2026-11-25/architecture/TECHNICAL_ARCHITECTURE.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Super Auto Pets (Windows client, Unity 6000.3.11f1) — Technical Architecture

Tiers: **VERIFIED** (client files, metadata class model, string tables), **STRONG INFERENCE**, **HYPOTHESIS**, **UNKNOWN**. Online game: no server was contacted; the only external sources were the public wiki (superautopets.wiki.gg) and a public GitHub dataset.

## 1. Identification (VERIFIED)
| Item | Value |
|---|---|
| Title / studio | Super Auto Pets, Team Wood Games (company "Team Wood" in `app.info` on the device and in `globalgamemanagers` PlayerSettings); internal codename **Spacewood** (all namespaces; Google-services config project `spacewood-e1fb0`); backend hosts in string literals: `api.teamwood.games`, `staging.teamwood.games`, `internal.teamwood.games/api` |
| Engine | Unity 6000.3.11f1, IL2CPP (metadata v39); D3D12 folder and `GameAssembly.dll` 75 MB per the on-device directory listing |
| Platforms | Steam (`steam_api64.dll` in Plugins on the device; Steamworks.NET), iOS/Android (Google-services config, NotchSolution, Unity IAP incl. Apple stubs), web (Team Wood site); `PurchasePlatform` enum: Spacewood, AndroidPlayStore, Stripe, Xsolla, SteamMicroTransaction, AppleStore, SpacewoodReward, gifts, Paddle, SteamDLC |
| Assemblies | `SpacewoodCore2.dll` = **the game engine** (rules, abilities, battle resolver, DTOs; 1 555 types), `Assembly-CSharp.dll` = Unity presentation (1 519 types: render systems, views, build/battle MonoBehaviours), BestHTTP (REST), Steamworks.NET, UniTask, DOTween Pro, ProCamera2D, QuantumConsole, HotReload runtime stub, Newtonsoft.Json, **Unity IAP** (`Unity.Purchasing.*`) and **Unity Gaming Services Analytics/Core** (a Google-services config ships in StreamingAssets, but no Firebase SDK assembly is in the build); `Assembly-CSharp-firstpass` 690 types |
| Metadata | 20 801 types, 138 814 methods, 87 311 fields; packed structs: typedef 76 B, method 30 B, field/param 10 B (different packing from the Idle Clans build of the same metadata version) |
| Content delivery | Unity **Addressables** (`StreamingAssets/aa`, 38 bundles): one 25.5 MB default group (UnityPy inventory: 411 Texture2D/Sprite pairs, per-pet pose ScriptableObjects, 6 AudioClips, a "Changes" TextAsset) + Unity Localization string/asset tables for 13 locales |
| Data | **No data files for pets**: pet/food/perk definitions are C# code (`MinionConstants.CreatePack1Turtle()` … `CreatePack7Color()`, `AbilityConstants.CreatePack*`, `SpellConstants`, `PerkConstants`) compiled into native code. Only the generated localization strings (names, ability text per level) are data |

## 2. Core engine design (VERIFIED from class model)
```
SpacewoodCore2 (pure C#, platform-agnostic; whether the server runs the same assembly is a HYPOTHESIS — no server evidence)
 ├ Enums: MinionEnum (850 incl. tokens/test/unreleased), SpellEnum (253), TriggerEnum (234), Pack (35), Archetype (30), Role (Tempo/Scaler/Tech/Carry/Comeback/Pivot), TribeEnum (Fire/Grass/Water/Thunder/Grey), Difficulty (Normal/Hard/Extreme/Classic/ToyHard/Broken), LossPointsMode (PerTier/Single/PerMinion/SingleRegain/PerMinionTier/PerMinionAndShopTier), Perk (126), Cosmetic (119), ErrorCode (127), ~120 more
 ├ Models: BoardModel (99 fields: Gold, Turn, Tier, Minions, MinionShop, SpellShop, Lives/Losses/Victories, FreeRolls, Trumpets, Relics, Deck …),
 │         MinionModel (49), MinionTemplate (fluent builder: SetStats/SetTier/AddAbility/AddPack/SetArchetype…), BattleState (Seed, PlayerSeed, OpponentSeed, event index, Outcome),
 │         BoardRandom (seeded RNG with roll registry), BattleModel/BattlePairModel, Modes (Arena/Versus/BullyRush constants)
 ├ Abilities DSL: Ability (88 fields) = Trigger (46 `Trigger*` + 23 `Targets*` classes in the Triggers namespace) × Targets (Self/Relative/Absolute/Find/Scan/Mirror/Middle/Aim/LastSummoned/TriggerSource…)
 │         × Conditions (38) × Effects (79: GiveBuff, Damage, Summon, Transform, CopyAbility, StealMinion, GainGold, Push, Repeat, Mana, Permarize …)
 │         × Parameters (71) + Catalogues (how a summoned/chosen minion or spell is picked: Fixed, Find, Shop, Memory, PreviousEnemies, TargetCopy, TeamCopy …)
 ├ Actions/Resolver: ~70 Systems (PhaseManager, TradePhase, MovePhase, TriggerAbility, ActivateAbilityTry/Do, AbilityDamage, Destroy, MarkDead, Summon, Cleanup …)
 │         + 89 Mutators; produces an ordered stream of ~115 BoardEvent types (133 in the namespace incl. summon processors/interfaces) (BuffMinion, DamageMinion, SummonMinion, PlaySpell, RollShop, …)
 ├ Playback: PlaybackModel/Action/Result + PlaybackEnum (GameReady/Mode/Watch/Abandon + PlayerAction StartTurn/RollShop/PlayMinion/StackMinion/PlaySpell/SellMinion/Choose/EndTurn/NameBoard/CommitBoard) — whole games (shop actions and battles) replay from seeds + action/event streams; the client only renders events
 └ DTO: 144 request/response types (Build/EndTurn/Roll/Play/Stack/Sell/Choose, Arena/Versus/BullyRush queue & watch, decks, gifts, purchases, Steam login, surveys, news, history/playback fetch)
```
Assembly-CSharp: `Board.RenderSystems` (74) + `RenderAggregators` turn BoardEvents into animations; `Codec` (25) serialises boards; Views/UI/Popups; `MinionLibrary`/`PackLibrary` map enums to sprites.

Consequences: the seeded structure is VERIFIED (`BattleState.Seed/PlayerSeed/OpponentSeed`, `BoardRandom` with a roll registry, literal "[Resolver] Running with default player seed and opponent seed"); that battles are therefore **deterministic and replayable** is STRONG INFERENCE; that the server re-simulates to validate is HYPOTHESIS. Every ability in 850 pets is a composition of ~280 reusable primitives (46 triggers, 23 targeters, 38 conditions, 76 effects, 71 parameters, 28 catalogues) rather than bespoke code.

## 3. Networking & services (VERIFIED names)
BestHTTP client to a Team Wood backend (REST, JSON DTOs), a Firebase project config (`spacewood-e1fb0`, used by the mobile builds — no Firebase assembly here), Steam auth + Steam/mobile purchase validation DTOs, versus rooms with turn timers (`VersusConstants`: lives, min/max players, turn duration, async cutoff, grace period), Bully Rush mode constants, gifting of packs, surveys, news. Server authority over matchmaking/arena opponent pool; the simulation core is shared (the `Spacewood.Core` namespace name and seed-bearing `BattleState` imply the server uses the same core — HYPOTHESIS).

## 4. Content delivery
Addressables with a 25 MB local group; 13 locales via Unity Localization (string tables: GeneratedStrings 4 534 keys — `Minion.X.Name`, `Ability.XAbility.N.About`, `Spell.X.About`, `Perk/Trigger/Archetype/Pack` names; GeneralStrings 874 UI keys). "Generated" indicates the ability texts are produced from the code definitions at build time — the same pattern Idle Clans uses for its wiki.

## 5. Limitations / observations
- Pet numbers are in native code; recovered here from the wiki (428 current pets) and ability texts from the client's own strings (651 pets with text, 778 ability families).
- The 850-entry `MinionEnum` includes test evaluators (`TestEvaluator2A3H` …), tokens, unreleased and reworked pets (`CreateRework*`, `CreateDraft`), i.e. the enum is append-only history.
- Shipped debug console (QuantumConsole) and HotReload public runtime stub; no anti-tamper beyond server validation; nothing bypassed.
