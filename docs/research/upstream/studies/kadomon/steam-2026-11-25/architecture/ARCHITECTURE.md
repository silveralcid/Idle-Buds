> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/kadomon/steam-2026-11-25/architecture/ARCHITECTURE.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Kadomon: Hyper Auto Battlers — Technical Architecture

Evidence tier: VERIFIED unless marked. Sources: `evidence/decompiled_src/` (full C# of `Assembly-CSharp.dll`, ilspycmd 9.1, 732 files / 67 725 lines), `evidence/assets/` (every MonoBehaviour asset dumped with generated type trees), `evidence/data/` (resolved content dataset).

## Engine and build
- Unity **2020.3.25f1**, **Mono** scripting backend (`MonoBleedingEdge/`, `Managed/Assembly-CSharp.dll` 906 KB) → full C# recoverable without native work. URP, Cinemachine, DOTween, TextMeshPro, ProBuilder (menus), Odin Inspector/Serializer, I2 Localization, Easy Save 3 (`ES3Defaults`), GameAnalytics, Steamworks (`SteamManager`), EasyFeedback (in-game feedback form), DamageNumbersPro, Febucci TextAnimator.
- `app.info`: company "Dino Rocket", product "Kadomon Hyper Auto Battlers". Two scenes (`level0`, `level1`); all content in `sharedassets1.assets` (ScriptableObjects) and `resources.assets`.

## Content model: ScriptableObjects + Odin serialization
All game content is authored as Unity ScriptableObjects (9 539 MonoBehaviour assets, 362 classes; 140 `KadomonData`, 177 `AttackScriptable`, 64 `StatusEffectScriptable`, 218 passive assets across ~30 `*PassiveScriptable` classes, 29 `ItemScriptableObject`, 23 `FieldEffectScriptable`, 21 map `NodeBlueprint`, 12 `AreaScriptable`, 8 `RestOptionScriptable`, 4 events, 3 gym leaders, 10 consumables, 3 item recipes). Classes derive from `SerializedScriptableObject`, so fields Unity cannot serialize (dictionaries, 2-D arrays, polymorphic lists) live in Odin's binary blob (`serializationData.SerializedBytes`); `tools/odin_binary.py` decodes it.

Key types:
- `KadomonData` — one evolution **stage**: `monID`, `monName`, `monLevel` (0/1/2 = stage), `monHealth/Attack/Speed/Energy`, `monTypes` (up to 3 of 11 `TYPE`s), `unitRarity`, `unitClass`/`unitSecondClass` (TANK/DAMAGE/SUPPORT/SUMMONER/MOVER), `monTraits` (29 flavour `TRAITS`), `keywords` (12 `KEYWORDS`), `passives`, `superEffects`, `startEffects`, `preEvo`, Odin `evolutions: List<EvolveMethodData>` (Level / Item / Team_Types).
- `UnitScriptable` — a runtime unit instance (`currentMon`, `currentExp`, `bonusStats`, `heldItem`, status effects); cloned from `FullUnitHolderDictionary.unitScriptables`.
- `AttackScriptable` — a list of `Attack {targetType: TARGETING(28), attackEffect: ATTACK_EFFECT(25), value, value2, value3, anim, elementType, toSummon}` plus `applyToHit` status stacks; used by basic attacks, supers, passives and items alike (one effect VM, see `gameplay/`).
- `PassiveScriptable` family — trigger-typed assets (`OnEnergy` = super, `OnSpawn`, `OnAttack`, `OnHit`, `OnDeath`, `OnUnitDeath`, `OnAlly*`, `OnStatusEffect`, `OnSelfMove`, …) holding `attackEffect[]` rows (effect / status / percentStat / var X|Y|Z / ticks / summons) and the per-stage parameter arrays `X`, `Y`, `Z` (index = evolution stage). `passiveDesc` is the template string with `[X]` placeholders — the in-game text is generated from data.
- `UnitDictionary` (singleton, "the tuning file"): stat bounds (HP 5–120, ATK 4–21, SPD 8–21, NRG 8–30), `shopUnitCosts (5,7,10)`, `expLevel2 60`, `expLevel3 180`, `expForMerge 30`, `sellEXP 10`, `skipEXP 5`, `battleTeamEXP 5`, `enemyEXP 75`, `goldPerBattle 2`, `itemsEvery 2`, `fieldEvery 3`, `unitRarityChances` by encounter index.
- `TypeDictionary` ("TYPE CHART"): `typeAdvantage[12,12]`, `effectiveMulti 1.25`, `resistanceMulti 1.0`.
- `Map.MapConfig` ("FullWorld"): 12 layers + shop/mini-boss counts (procedural Slay-the-Spire-style map, `Map/` namespace).

## Runtime architecture
- Static-manager style: `BattleManager`, `LevelController`, `GoldController`, `MonInventory`, `StaticMonUnlocker`, `GlobalEffectHelper`, `KeywordController`, `StatusEffectHelper`, `DamageHelper`, `PassiveTriggerHelper` are static classes; UI controllers are MonoBehaviour singletons (`UIManager`, `NewMenuGroupManager`, `RewardSelectScreen`, …).
- Battle is a **tick simulation driven by `TickManager`**; `BattleManager.OnTick` advances one unit per tick in slot order (player slots then enemy slots), and every effect is queued as a `TurnAction` in a `PriorityQueue` keyed by `(isPlayer ? 5 : 0) + battleSlot − tickSpeed(EFFECT_SPEEDS)`; the action order panel (`ActionOrderDisplayer`) renders this queue. Visuals block the queue (`StartAction/FinishAction` pause counting) so the sim is coupled to animation time (hyper speed just raises tick rate).
- Randomness is `UnityEngine.Random` (unseeded): battles are **not replayable** and the outcome can differ on replay — a deliberate "watch it play out" design; there is no server.
- Persistence: Easy Save 3 (`ES3`) local files for unlocks/stats (`StaticMonUnlocker`, `UnitData.unlockState`), Steam achievements via `SteamManager`. No online services beyond GameAnalytics + feedback form (STRONG INFERENCE from assemblies; no networking code found).
- Localization: I2 Localization asset present (`I2.Loc.LanguageSourceAsset`), strings mostly inline English.
- Debug/dev surfaces shipped: `ShopController` (dev unit shop with `UnlockAll/LockAll`, 8 random units, reroll 5), `DebugScreenController`, `RandomMonController` (chaos mode), `GoogleSheetsForUnity.ConnectionData` (stats were tuned from a Google Sheet — `UnitDictionary.tabID = "FullUnits"`).
