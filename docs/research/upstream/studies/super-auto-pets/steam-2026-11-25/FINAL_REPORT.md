> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/super-auto-pets/steam-2026-11-25/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Super Auto Pets — Final Reverse-Engineering Research Report
Date 2026-11-25 · Target `E:\AI Agent\IdleBuds-ReverseEngineer\Super Auto Pets` · Workspace `research/super-auto-pets/`

## 1. Executive summary
Super Auto Pets (Team Wood Games, codename *Spacewood*) is a Unity 6 IL2CPP client whose entire game is a separate pure-C# engine assembly, **SpacewoodCore2** (1 555 classes). The engine is a composable **ability DSL** (46 trigger classes × 23 targeting classes × 38 conditions × 76 effects × 71 parameter types × 28 catalogues) feeding a deterministic, **seeded battle resolver** (~70 systems, 89 mutators) that emits a replayable stream of ~115 event types (133 types in the `BoardEvents` namespace incl. helpers); the Unity layer only renders events. Pet/food/perk definitions are **code**, built with a fluent template API (`MinionConstants.CreatePack1Turtle()` …), with player-facing text generated from the composition into 13-locale string tables. The client's enums hold 850 pet IDs (incl. tokens/test/unreleased), 253 foods, 234 trigger variants, 30 archetypes and 35 packs.

**Pass 2 (native decompilation, same day):** the compiled definitions were recovered directly from `GameAssembly.dll` with Il2CppInspectorRedux + Ghidra — 717 pet definitions (358 base-pack pets with tier/stats/abilities/archetypes/roles), 443 ability DSL traces, the shop sampler, roll/gold rules, the `BoardConstants` schedule lists and the trigger-ordering comparator; see §17 and `mathematics/DECOMPILED_RULES.md`. Where the wiki scrape and the binary disagree (148 of 425 pets, mostly ±1 rebalances) the binary is newer and authoritative. Before that pass, current numbers were taken from the community wiki (428 pets with tier/stats/packs/triggers/ability levels: 366 from its tables plus the 62 Danger Pack pets parsed from their own pages; the wiki cites ~450, so a few custom-pack exclusives may remain uncounted; 158 foods) and cross-checked against the client's own generated ability strings (651 pets). Rules (10 gold, 3/1 prices, tier clock on odd turns, 2/5 XP, 50 cap, 5 lives/10 trophies, life refund at turn 3, multi-life losses later) come from the wiki and the client's UI strings.

Design verdict: a near-perfect "small numbers, big leverage" auto-battler — a 10-gold knapsack every turn, a visible tier clock, base stats of 1–6 where a +1/+1 edge swings early win rate from ~35 % to ~90 % (simulated), asynchronous PvP against real boards made fair by seeded, replayable battles (structure verified, determinism inferred), and monetization that sells variety (packs, customs, cosmetics) rather than power. Strains: shop RNG, opaque trigger ordering, thin meta-progression.

## 2–13. Sections → see `architecture/`, `gameplay/` (systems + design), `progression/`, `economy/`, `mathematics/` (+charts), `content/`, `user-experience/`, `development-lessons/`, `prototypes/`, `experiments/`, `evidence/`.

## 14. Remaining unknowns
| Item | Status |
|---|---|
| Exact per-pet numbers from code (vs wiki) and unreleased/rework pets | VERIFIED (pass 2): `evidence/decompiled/pets_from_binary.csv`, incl. 190 custom/beta/mini/rework definitions |
| Shop sampler: tier weights, duplicate penalty formula (`DuplicatePenaltyConstant/Addition/Sum`), shop-buff math | VERIFIED (pass 2): independent uniform draws with replacement over the eligible pool (Unique removed once drawn), tribe-count weighting, duplicate penalty constants are 0 (dead code); shop-buff application STRONG INFERENCE |
| Trigger ordering rules in full (attack order, tie-break, early/late variants `TriggerDeathEarly`, `TriggerHurtEarly`) | VERIFIED comparator (pass 2): attack-sum priority ± Churros/Macaron, self-sourced first, seeded random ties; early/late variants remain STRONG INFERENCE |
| Whether the server runs SpacewoodCore2 for validation | HYPOTHESIS |
| Arena opponent selection and ranking | UNKNOWN (server) |
| Lives/loss-cost schedule per turn in current builds | partial (strings show 2/3-lives-per-loss and max variants; 2022 DB: 1,1,2,2,3,3,3,3,4…) |
| Shop slot schedule and sampler weights | VERIFIED (pass 2): tier-up turns [3,5,7,9,11], pet slots +1 at tiers [3,5], food slot +1 at tier [3], `LevelRequirements [0,2,5]` |

## 15. Completion checklist
| Requirement | Status |
|---|---|
| Engine identified | YES |
| Technical architecture investigated | YES (engine/presentation split, DSL, resolver, playback, DTOs) |
| Accessible data structures documented | YES (class model, enums, string tables); pet numbers via wiki |
| Core loops mapped | YES |
| Major systems understood | YES |
| Progression reconstructed | YES (in-run + meta) |
| Economy analyzed | YES |
| Formulas investigated/validated | YES (pass 2: shop sampler, roll/gold rules, schedule constants and trigger ordering decompiled; per-pet data from the binary; ability numeric scaling still from strings) |
| Content architecture | YES |
| Save/persistence | YES (server-side; client holds decks/cosmetics via DTOs) |
| UX analyzed | YES (static) |
| Motivation/retention analyzed | YES |
| Interactions mapped | YES |
| Lessons extracted | YES |
| Simulations completed | YES |
| Evidence-backed | YES |
| Gaps documented | YES |
| Final report | YES |
| Independently reviewed | YES (§16; errors found were corrected) |

## 16. Independent review (completed)
A separate agent audited 14 claim groups offline against the evidence and ran the model. Confirmed outright: engine/metadata facts, all namespace counts, enum sizes and member lists, class/member names (MinionConstants, MinionTemplate, AbilityConstants, BoardConstants, BattleState, BoardRandom, Playback), string-table keys and texts, locale list, wiki rules, tier-budget table and all simulation numbers. Errors found and corrected:

| Finding | Fix |
|---|---|
| Type counts (1 960 / 1 400) wrong → 1 555 SpacewoodCore2 / 1 519 Assembly-CSharp | corrected |
| "Firebase" assembly does not exist (only a google-services config); Unity IAP + UGS Analytics are the shipped services | corrected |
| "80 trigger classes" double-counted targeting: 46 `Trigger*` + 23 `Targets*`; "133 event types" includes helpers (~115 events); 44 bundles → 38 | corrected |
| Wiki Pets table omits the Danger Pack: 366 of ~450 pets; foods 164 → 158 (navbox rows); Mini Pack 3 exists | fetched and parsed the 62 Danger Pack pages → 428 pets; all statistics recomputed |
| Trigger counts not case-normalised; battle/shop classification inconsistent between docs | normalised; classification reconciled and labelled rough |
| Several "VERIFIED" labels cited the wrong string keys or unverifiable facts (tier clock, stat cap, sizes) | re-cited to `Tooltip.Turn`, `TierUnlocked*`, `Tip.MaxStats`, `BehemothAbility.About`; device-listing facts marked as such |
| Server-runs-core labelled inconsistently; determinism stated as fact | HYPOTHESIS / STRONG INFERENCE applied consistently |
| Shop-slot schedule and historical life-loss schedule were unsupported in text though present in the 2022 community DB `turns` table | now cited |
| Outdated hard-mode naming; unverifiable run-length and "no dailies" claims | replaced with the client `Difficulty` enum; hedged |
| Omissions: backend hosts, PlaybackEnum (shop actions replay too), PurchasePlatform, Role/Tribe/Difficulty/LossPointsMode enums | added to architecture |

Residual uncertainty after the first review: pet numbers were wiki-sourced; shop sampler and trigger ordering were native-only — both resolved in §17.

## 17. Pass 2 — native decompilation (completed)
Toolchain (installed in the analysis VM and saved as a repeatable pipeline in `research/tools/il2cpp-deep-re/`): .NET SDK 8/10, ilspycmd 9.1, Il2CppInspectorRedux 2026.2 CLI, Temurin JDK 25, Ghidra 12.2 + PyGhidra. Pipeline: inspector (`il2cpp.json` address map, typed C# stubs → `evidence/stubs/SpacewoodCore2/`) → Ghidra import without auto-analysis → `apply_il2cpp_names.py` (70 203 functions, 29 787 string labels, type/method-info labels) → `decompile_targets.py` by name substring / `decompile_addrs.py` by address (needed for the huge `Create*` builders and lambdas missing from the map; call sites found with `find_callers.py` and `find_rip_refs.py`) → extractors `parse_minion_constants.py`, `parse_ability_lambdas.py`, `postprocess_pets.py`.

Results (all VERIFIED from the binary, details in `mathematics/DECOMPILED_RULES.md`):
| Finding | Where |
|---|---|
| 717 pet definitions incl. 358 base-pack pets, 42 tokens, 112 relics, 15 bullies, 190 custom/beta/mini/rework; `Create()` defaults `Attack = 2·tier`, `Health = 2·tier + 1`, `Price = 3` | `evidence/decompiled/pets_from_binary.{json,csv}` |
| Binary vs wiki scrape (base-pack definitions only): 348 wiki names matched, 225 identical, 123 differ (9 tier moves, 55 by more than 1 stat); spot checks against wiki page histories (Duck v0.40, Pigeon v0.46, Alchemedes v0.35) show the scraped table was stale and the binary current | `pets_binary_vs_wiki_diff.csv` |
| 443 ability DSL traces (trigger → targets → effects), 756 enum→lambda registrations | `abilities_dsl_trace.json` |
| Shop roll: 1 gold or free-roll charge, gold clamp 0–300, frozen kept, independent uniform draws **with replacement** (Unique pets removed once drawn), tribe-count weighting, **no duplicate penalty** (constants 0, dead code), 0.01 % Sloth easter egg | `decompiled/shop/` |
| `BoardConstants`: tier-up turns [3,5,7,9,11], pet slots +1 at tiers [3,5], food +1 at tier 3, `LevelRequirements [0,2,5]`, MaxGold 300, MaxGoldGain 50, MaxFreeRolls 10, MaxStats 50 … | `decompiled/shop/BoardConstants_cctor_g.c` |
| Trigger ordering: `Priority = attack(perm+temp) ± 1000 (Churros/Macaron)`, self-sourced first, seeded random tie-break; player order by seeded roll-off | `decompiled/triggers/` |
Independent review of pass 2: a separate agent audited `DECOMPILED_RULES.md` line-by-line against the decompiled C and stubs (33 files). Confirmed: `Create()` defaults, setter offsets, `RollShop` gold logic, slot arithmetic, tribe weighting, `BoardConstants` lists and constants, `SetNewTurnGold`, `UpgradeTier`, `Priority` ± Churros/Macaron, comparator sign conventions, roster counts, spot-checked pets, diff counts. Errors found and corrected: (1) `TryFastTakeRandom` is an indexed read with no removal → the sampler draws **with replacement** (Unique pets are the only ones removed), so the slots/N model and `shop_sampler_sim.py` were rewritten as independent draws; (2) the pack-exclusion list applies only in the `ShopAll` branch and excludes Wacky(11), not Bullies(9); (3) the wiki diff included custom/beta templates sharing a pet's name — recomputed on base-pack definitions only (348 matched / 225 same / 123 differ) and the "±1 rebalances" wording dropped; (4) a 0.01 % Sloth easter egg in `RandomizeShop` was missed; (5) `UpgradeTier`'s Pack7 `TierMin`/spell-capacity rule and the relic `TierMin` bump were understated; (6) several names (ShopSize getter, PackTemplate flag, OrderByAbilityPriority key, GetMinionPenalty's role) rested on lambdas not yet decompiled and are now labelled STRONG INFERENCE.

Limits: ~310 ability lambdas and some helper methods have no entry in the inspector's address map (recoverable by address); numeric ability scaling is level-computed at runtime (taken from the localized strings); tribe membership (`SetTribeElements`) was not parsed, so the weighting multiplier per pet is known in rule but not tabulated.
