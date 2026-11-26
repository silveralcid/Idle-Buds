> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/palworld/1.0.5.102999/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Palworld — Final Reverse-Engineering Research Report
Date 2026-11-25 · Target Steam install, v1.0.5.102999 · Workspace `research/palworld/`

## 1. Executive summary
Palworld is an **Unreal Engine 5.1** title shipped as one 39 GB unencrypted, Oodle-compressed pak. Its game logic is C++ plus Blueprints, but its *tuning* is almost entirely in DataTables, so this pass extracted the whole content layer: 503 tables / 197 731 rows, the typed item DataAsset, config, and an 11 964-type class model from the reflection mappings. To do it on Linux a small toolchain was built and saved (`research/tools/ue-pak-export/`): a CUE4Parse exporter, an Oodle-ABI shim compiled from the open-source `ooz` decoder (Epic's Linux library needs a newer glibc), a usmap parser, and a pak index reader. The 1.0-era community mappings (Sept 2026) are the only ones that parse this build.

What the data says (VERIFIED): 288 Paldeck entries (204 numbered species + 84 lettered subspecies, one row per `ZukanIndex`+suffix) among 753 character rows, each with species scaling values (HP 60–200, ATK/DEF 50–200), 1–2 of 9 elements, capture-rate correction, price, gender ratio, `CombiRank` breeding power, 12 work suitabilities in use (ranks 1–8; `OilExtraction` is defined but no species has it), fixed passives and learn sets; 385 active skills (power 0–1 250, cooldown ≤ 300 s); 417 localized passives (313 distinct display names; ≈190 element boosts); 2 466 items and 1 414 recipes; 588 technologies (1 413 points + 182 ancient); a 100-level EXP table (player 10.6 M to L65, 382 M to L100; Pals 41 M / 283 M); trust ranks; 20 condenser ranks; 15 capture-power ranks; 258 unique breeding combos; 1 829 wild spawn rows in 413 spawner groups with level bands 1–80; and four difficulty presets exposing 46 world settings.

What stays inferred: the stat formula (`500+5L+base·0.5·L·(1+IV)` for HP; `100+base·0.075·L·(1+IV)` attack; `50+…` defense; community-verified), the breeding rule (nearest `CombiRank` to `floor((a+b+1)/2)`, ties to the higher rank — the simulation shows ties decide 46 % of pairs and every pool species but one (Aegidron, the lowest rank) can be bred from two different species), the element chart, and above all the capture formula (inputs are all in data; the combination is C++ and unpublished — HYPOTHESIS).

Design verdict: a data-driven triple loop (collect / craft-automate / breed-optimize) with every curve exposed to server settings; its hidden numbers (IVs, breeding rank, capture math) deliberately or not became the community's meta-game.

## 2–13. Sections → `architecture/`, `gameplay/`, `progression/`, `economy/`, `mathematics/`, `content/`, `user-experience/`, `development-lessons/`, `prototypes/`, `experiments/`, `evidence/`.

## 14. Remaining unknowns
| Item | Status |
|---|---|
| Capture probability formula (sphere tier values, HP term, wiggle rolls, alpha penalty) | HYPOTHESIS — in C++ (`PalCaptureJudge*`), only inputs recovered |
| Damage formula constants, element chart, crit/sneak multipliers | STRONG INFERENCE (community); `PalDamageInfo` fields VERIFIED |
| Stat formula constants (500/100/50, 0.5/0.075, +5 HP) | STRONG INFERENCE (community, in-game verified by third parties); not in tables |
| Breeding tie-break when ranks are equal (priority field) | STRONG INFERENCE; no duplicate rank among the 260 pool species, so the priority field never decides anything in v1.0.5 data |
| Blueprint logic (124 weapon BPs, 109 waza BPs) | not read (bytecode) |
| Server/online: dedicated-server authority, PvP rates | class fields only |

## 15. Completion checklist
| Requirement | Status |
|---|---|
| Engine identified | YES (UE 5.1, build 1.0.5) |
| Technical architecture | YES |
| Accessible data structures | YES (all DataTables, item DataAsset, class model) |
| Core loops / major systems | YES |
| Progression / economy | YES (tables); formulas tiered |
| Formulas validated | PARTIAL (tables VERIFIED; stat/breeding community-verified; capture modelled) |
| Content architecture | YES |
| Save/persistence | NOT COVERED (UE SaveGame `.sav` with GVAS+zlib; no saves read) |
| UX / motivation / lessons | YES (static) |
| Prototype | YES (`prototypes/palworld_breeding_stats.html`) |
| Independent review | §16 |

## 16. Independent review
A separate reviewer (no access to this pass's notes) recomputed every checkable number in FORMULAS, GAMEPLAY_SYSTEMS, CONTENT, ECONOMY, PROGRESSION and this report from the staged JSON/INI and re-ran `palworld_model.py` (byte-identical output). Confirmed: project version, 753 rows, dex-number range, element mix, rarity ladder, stat ranges, capture correction, price and gender ranges, pool size and rank spread, 258 unique combos, the simulation's pair counts and tie-break implementation, the stat-curve examples, every EXP total and ratio except one, tech counts and point totals, trust thresholds, condenser reset costs, effigy ranks (15 ranks / 100 effigies), talent fruit +10, base-camp levels, Easy/Normal/Hard presets, active-skill counts/ranges, item type counts and prices, recipe costs, variant rates and spawn bands.

Corrections applied after the review:
- The Paldeck count was a filter artifact: 300 rows passed `zukan>0 and not boss`, but only 288 distinct (`ZukanIndex`, suffix) keys exist (204 + 84); 12 quest/summon/oil-rig rows reuse a dex number and `PlantSlime_Flower` (no name text) duplicated PlantSlime. `build_dataset.py` now writes an `in_paldeck` flag, the pool is 260 species with 260 distinct ranks, and the breeding simulation was re-run (18 044 rank / 15 551 tie / 152 unique / 183 same). The "priority" tie-break therefore never fires in v1.0.5 data, and the one substantive reachability result is that Aegidron (rank 30, the minimum) cannot be bred from two different species under tie→higher.
- HP minimum is 60, not 50; `CombiRank` dex range is 10–9 999 (30–3 080 only in the pool); work suitability uses 12 of 13 jobs with ranks 1–8; species fix at most 2 passives; no randomizer rows exist among the 753.
- Condenser stones are 1–4 per rank across four stone tiers, not "rank r needs r stones"; the relic-statue reset is a nominal 1 gold, not the condenser ladder; the capture-power relic table carries `EffectRate` 0 for all 15 ranks, so the per-rank bonus lives in code.
- Pal EXP vs player: 3.9× at L65 and 3.2× (not 1.6×) at L80; `PalNextEXP` is flat at 6 896 858 from L65 to L100, so the Pal total drops below the player's again at L98–100.
- Tech cost per level plateaus at 19–28 (L40–70) and falls to 12–13 by L80 rather than rising to 22–30.
- Hardcore also resets drop rates to 1.0 and disables Palbox export/import; presets expose 46 fields, not ≈60.
- 56 of the 473 "named" passives carry the placeholder "en Text"; 417 are localized (313 distinct display names). 43 of the 385 active skills never appear in a learn set. 10 real sphere tiers (plus debug and Radar spheres). Spawner counts are rows (1 691 / 1 829 Pal entries) in 413 groups.
- Wording: the stat formula is community-derived (STRONG INFERENCE), not "verified against thousands of values"; stat-table rounding is half-to-even; the Ancient Sphere line now names the item.

Still UNSUPPORTED by files in the review folder (they exist in `evidence/datatables/` but were not staged): the per-table row counts in CONTENT/ARCHITECTURE (503 tables / 197 731 rows, 8 782 lottery rows, 1 029 drop rows, 5 772 / 7 111 learn rows, 4 999 capture-bonus rows), the 2 455-object item DataAsset split, and the class-model totals; these come straight from the export logs and were not re-derived by the reviewer.
