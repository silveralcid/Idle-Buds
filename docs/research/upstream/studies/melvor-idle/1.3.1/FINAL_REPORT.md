> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle/1.3.1/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Melvor Idle (v1.3.1) — Final Reverse-Engineering Research Report

Build: Steam NW.js wrapper 1.2.2 → web client `steam.melvoridle.com` (scripts build 12097, data version 528). Base game only (Demo + Full packages); expansions described from shipped code. No login, no save read, no cloud contact; public static files only.

## 1. Executive summary
The Steam install contains no game logic: it is an NW.js shell that iframes the official web client, with Steamworks (greenworks), Discord presence, a local media cache and Chromium flags that disable background timer throttling. The web client is 143 unminified TypeScript-compiled scripts (127 k lines) plus JSON data packages, so the rule code and the balance data are both directly readable and every core formula here is **VERIFIED** at a file and line.

The engine is the model fixed-step idle architecture: a 50 ms tick counted from `performance.now()` with timers stored as tick counts, one active action plus passive tickers, render flags consumed once per loop, and an offline mode that replays the **same tick function** in frame-budgeted batches for up to 24 h, so offline progress has the online distribution for every action that keeps running (combat is stopped by default unless the player opts in). Content is registered from schema'd, namespaced JSON packages (base game, expansions, events and mods share one path), bonuses from a single 570-id modifier system, saves are binary with id remapping, zlib and base64, autosaved every 10 s.

Gameplay is RuneScape-shaped (same XP table, L99 = 13.03 M) but denser: 24 skills (8 combat, 16 non-combat with input chains between them), per-action mastery on the same curve with a skill pool (bonuses at 10/25/50/95 %), and a combat system whose hit chance is a continuous ratio of accuracy to evasion (50 % at parity) with a combat triangle and a 95 % resistance cap. Model highlights (base values): one-tree Woodcutting to 99 in 404 h, Fishing 175 h with junk, sustained Mining ≈ 320–340 h because rocks deplete and respawn; the top Thieving target succeeds under 20 % at 99 (≈ 16 500 XP/h); artisan skills run 30 000–900 000 XP/h and are input-bound; mastery XP per action scales with the skill's action count (≈ 8.5 h vs 92 h per action between Smithing and Woodcutting), evening out mastery effort for interval-based skills; bank slots climb from 34 GP to a 5 M cap at slot 119 (509 M for 200 slots). Two defaults stop progress unless changed: Thieving stops at the first stun, and combat stops when the game goes offline.

## 2–13. Sections → `architecture/`, `gameplay/`, `progression/`, `economy/`, `mathematics/`, `content/`, `user-experience/`, `development-lessons/`, `prototypes/`, `experiments/`, `evidence/`, `simulations/`.

## 14. Remaining unknowns
| Item | Status |
|---|---|
| Expansion content numbers (Throne of the Herald, Atlas of Discovery, Into the Abyss) | NOT INCLUDED by choice (entitlement-gated packages not downloaded); mechanics only from shipped code |
| Mastery level / pool bonus effects per skill | VERIFIED as data (`masteryLevelUnlocks`, `masteryLevelBonuses`, `masteryPoolBonuses`), not modelled |
| Township production/consumption balance | data dumped (`township.json`), not modelled |
| Full combat simulation (special attacks, effects, prayers, potions) | not modelled; core hit/damage/triangle formulas only |
| Mastery bonuses to Mining HP and Thieving stealth | effects quoted from data, not integrated into the time-to-99 model |
| Cloud/PlayFab behaviour, account flows | out of scope (live service) |

## 15. Completion checklist
- [x] Engine/stack identified (NW.js wrapper + TypeScript web client, PIXI, Dexie, PlayFab SDK)
- [x] Data extracted (base packages → 9 CSVs + JSON) and code archived (143 scripts)
- [x] Formulas with tiers and line references (21)
- [x] Model and prototype (cross-checked)
- [x] Design, UX, development lessons
- [ ] Expansion data (deliberately excluded)
- [x] Independent review (§16)

## 16. Independent review
A separate agent audited the workspace on 2026-11-26: it checked every cited line range (all correct), recomputed the numbers with its own scripts (including tick simulations of mining depletion, fishing junk and thieving stuns), rebuilt the datasets and re-ran the model (byte-identical), and ran the prototype in node. It downloaded nothing and contacted no services.

### Confirmed
XP and abyssal tables, tick and offline constants, Woodcutting 403.8 h, combat examples (392 max hit, 23 112 accuracy, 25/50/75/87.5 % hit), Court Jester thieving, bank-slot costs (34 / 566 / 83 031 / 2 123 966; cap from slot 119; 37.5 M for 100, 509 M for 200), all content counts, locales and wrapper facts; formula rows 1–4, 9–15, 17 and 20–21 as written (some with extra detail).

### Corrected after review
| Finding | Correction |
|---|---|
| "Offline equals online" — entering the offline loop stops combat unless `enableOfflineCombat` is on (default off), stops locked skills; Golbin Raid never runs offline; unseeded RNG | FORMULAS #5 and results, ARCHITECTURE, FINAL, UX, PROGRESSION, model |
| Mining XP/h ignored rock HP (5), regen (+1/10 s) and respawn; Dragonite also needs 270 total mastery | sustained ≈ 17–19 k XP/h at base HP (two simulations), ≈ 97 k with +99 HP; 1→99 ≈ 320–340 h |
| Fishing ignored junk (1 XP, 5–29 %) | Whale 106 478 XP/h; 1→99 175.3 h |
| Thieving King "160 000 XP/h"; default stop-on-stun | ≈ 16 300–16 700 XP/h with Continue-on-Stun; FORMULAS #6, #19 |
| Mastery interval is the per-skill `masteryModifiedInterval` | FORMULAS #8; Smithing one action ≈ 8.5 h; normalisation holds only for interval-based skills |
| Combat triangle missing | FORMULAS #16, GAMEPLAY; prototype notes it |
| Prototype: monster magic max hit used the melee formula; DPS ignored monster damage reduction; speed rounded instead of floored | fixed (Wizard 118, DR applied) |
| Gamemodes: Adventure prices skill unlocks (not level caps); CHAOS and speedruns discontinued; Hardcore caps bank slots at 88 | GAMEPLAY, ECONOMY, UX, ARCHITECTURE |
| 16 non-combat skills (not 15); Alt. Magic is part of Magic | FINAL, GAMEPLAY |
| Paid layer incomplete; "no trade code" | IAP ids and prices, ads hooks, Patreon test-server gate; Township NPC trader |
| Smaller items: intervals floored not rounded; token chance is a %; Astrology 3 s; Firemaking/Cooking per-recipe intervals; itmMonsters are a pool of existing monsters; synergies are equipment pairs (summoning has 90); shop categories (no cosmetics); Slayer-coin obstacles; player combat level; event packages date-gated; mod loading is not sandboxed; hard-coded modifier exceptions; offline loop does not render; background-throttling wording; Discord every 15 s; PlayFab auto cloud save 23 h; design-intent wording | corrected in place |

### Not changed
`steamInit.js` was not copied into `evidence/wrapper/` (it is in the install folder); whether the paid packages are actually served without login was deliberately not tested.
