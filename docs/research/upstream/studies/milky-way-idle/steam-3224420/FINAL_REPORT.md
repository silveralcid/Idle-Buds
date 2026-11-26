> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/milky-way-idle/steam-3224420/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Milky Way Idle — Final Report
Build: Steam client (Electron 32.0.2 wrapper, app build 3224420) + web client `main.8add56c3.chunk.js` (latest patch note 2026-09-28), data maps current to the community simulator's 2026-11-23 commit, market snapshot 2026-11-26 01:06 UTC (timestamp 1795655160). No login, no WebSocket capture, no interaction with live services beyond loading public static files and the developer's published market JSON.

## 1. Executive summary
Milky Way Idle is a **server-authoritative multiplayer idle MMO**; the Steam install is only an Electron wrapper (with an official Tampermonkey-style userscript manager and multi-window profiles). All rules run on the server and the static tables arrive after login as `init_client_data`. What the public web bundle does contain is unusually rich: display-side copies of the core formulas (action time, level efficiency, enhancing success/speed/essence/crate rates, alchemy, combat-stat derivations, combat level, monster tier scaling, market tax) and a developer-written in-game guide with the server's combat formulas in prose (hit = acc^1.4/(acc^1.4 + eva^1.4), ranged crit 0.3 × hit, damage taken 100/(100 + armor), HP 10(10 + Stamina), interval base/(1 + Attack/2000)…). Content tables (957 items, 760 actions, 95 monsters, 57 abilities, 17 house rooms, 77 achievements) come from the community combat simulator's copies of `init_client_data`, matched hrid-for-hrid against the bundle (760/760, 95/95, 957/958).
Design reading: 17 skills multiply into one XP/hour number (speed × efficiency × wisdom × buffs), content ends at level ~106 while cumulative XP keeps rising to 10⁴× the L100 figure at level 200 (L100 10 M, L125 100 M, L200 100 B — gathering to 125 is ~9 500 h with no gear), production XP is bought with coins (median 37–2 511 coins of inputs per XP), and enhancement to +20 (3.3 B attempts unprotected, 4.2 M + 1.3 M protections protected) is the true endgame sink. Monetisation is convenience/cosmetic cowbells plus MooPass, bridged to coins by a tradable cowbell bag taxed at 18 %.

## 2–13. Sections → `architecture/`, `gameplay/`, `progression/`, `economy/`, `mathematics/`, `content/`, `user-experience/`, `development-lessons/`, `prototypes/`, `experiments/`, `evidence/`.

## 14. Remaining unknowns
| Item | Status |
|---|---|
| Server combat engine (ability AI, DoT ticks, trigger ordering, retaliation/thorn ordering) | STRONG INFERENCE via the community simulator; guide states the formulas |
| `levelExperienceTable`, `enhancementLevelSuccessRateTable` as served | table values from wiki / guide (STRONG INFERENCE / VERIFIED guide); exact arrays only in `init_client_data` |
| Shop and cowbell-store item prices; task reward tables; guild trial scaling | UNKNOWN (server data not captured). Known from the bundle: 7-day MooPass = 250 cowbells (150 for Ironcow) and all MooPass perk constants (l.29453–29464); task-shop costs: cooldown 100/200/400/800, block slots 100–300, combat block 400 (l.30383–30385) |
| Offline progress algorithm | VERIFIED only as "up to 10 h, extendable" (guide/FAQ) |
| Rare-find stacking (multiplicative vs additive) | STRONG INFERENCE (wiki) |

## 15. Completion checklist
- [x] Engine/stack identified (Electron wrapper + React web client + server)
- [x] Data extracted (21 data maps, built datasets, market snapshot) with coverage check
- [x] Formulas with tiers (20 entries) and a simulation that applies them (it computes consequences; it cannot validate the formulas against server output)
- [x] Prototype (`prototypes/mwi_calculator.html`)
- [x] Evidence (client bundle, extracted formulas, guide, wrapper sources, community sources)
- [ ] Server combat code (not obtainable without server access)
- [x] Independent review (§16)

## 16. Independent review
A separate agent audited the workspace on 2026-11-26: it re-read every cited line in `main.pretty.js`, the guide and the community simulator, recomputed every count from the data maps, matched hrids against `main.js`, re-ran `mwi_model.py` (byte-identical), solved the enhancing chain exactly with fractions and a closed-form recursion, re-derived hours-to-level and production cost per XP from the raw maps, ran the prototype in node with a DOM stub and rebuilt the datasets.

### Confirmed
Formulas 1, 2, 4, 5, 7–11, 13, 14 and 18–19 against the cited lines; 3 and 15 at STRONG INFERENCE as labelled; hours to level (17.9 / 227.4 / 1 136.0 / 9 466.2 h / 6.26 M h); production cost-per-XP medians; enhancing expectations (+10 19 464.8, +20 3 296 627 681.8; with protection from +2: +10 1 068.9 attempts and 330.4 protections); hit-chance values; all content counts except those corrected below; the Markov chain construction (success at state k uses the client's `table[current]`, protection applies from the set level).

### Corrected after review
| Finding | Correction |
|---|---|
| House rooms described as "+1 skill level per level" for all | 7 combat rooms +1 level; 9 skilling rooms +1.5 % efficiency; Observatory +1 % action speed and +0.05 % enhancing success; all rooms +0.05 % wisdom, +0.2 % rare find; 8 levels each (GAMEPLAY) |
| Level 3 576 attributed to labyrinth/guild scaling | it is the Deranged Jester dungeon boss; labyrinth and guild monsters are defined at L100 and scaled proportionally (PROGRESSION) |
| "30 patch-note entries" | 10 news posts + 20 patch notes (README, CONTENT, E3) |
| "L100 → L125 is 10× the XP of 1→100"; increment "resets" | 9× (cumulative 10×); per-band growth ratios and the ×1.706 / ×2.010 step-ups at 100 and 125 (FORMULAS #17, model results, model print) |
| Enhancement slot list without charms; "multiplies all base stats" | ×5 slots are back, charm, earrings, neck, ring, trinket; only positive combat stats are enhanced (FORMULAS #6, GAMEPLAY) |
| "30-state" chain; "main source of lost-a-billion FAQ"; "500 M to review a loss"; "2 MB bundle with every locale" | 21 states; the FAQ says ordinary failures never qualify; the fee reverses a confirmed loss; other locales are lazy-loaded chunks (UX, DEVELOPMENT_LESSONS) |
| MooPass and task-shop prices listed as UNKNOWN | present in the bundle (l.29453–29464, l.30383–30385) (§14) |
| Parties "up to 5"; enrage "3 min zones, 10 min dungeons"; abilities "from books"; slots "1/20/50/90"; 54 trigger conditions | per-zone party size 1/3/5; per-monster enrage 180/600 s; 56 book abilities, 9 special; 5 slots (two at Int 1); 55 named in the bundle (GAMEPLAY) |
| Wording: "floor 3 s", "price/5", essence "time", "×2.25 (+100)", "mid prices", "survival", tier label order in #16, house values labelled VERIFIED, `client_formulas.js` claimed to hold every VERIFIED function, coverage claimed to verify values | all reworded (FORMULAS, ARCHITECTURE, CONTENT) |
| Model: XP-ratio line printed as "time"; docstring XP scaling; HP not floored; ★ recipes shown as top XP/h; an ask of −1 dropped items that had a bid | fixed; price fallback now skips non-positive values, which moves the crafting median from 2 252 to 2 511 coins/XP and tailoring from 650 to 660 (all documents updated) |
| Prototype: header "760 actions"; "-0 protection items"; protect-from +1 silently allowed | 694 gathering/production actions; protection line only when set; warning that +1 is wasted |
| Snapshot date | 2026-11-26 01:06 UTC (timestamp 1795655160) |

### Not changed
The reviewer could not find `evidence/wrapper/` because it audited a staging copy that lacked it; the folder exists in this workspace (`evidence/wrapper/main.js`, 1 346 lines, plus config, cache-manager, event-logger, preload, ext-runtime and script-manager), so the Electron 32.0.2 / build 3224420 / cache-profile / Steamworks-path claims keep their VERIFIED tier. `evidence/community/wiki_Market_raw.txt` is empty (the page fetch returned nothing); market rules are sourced from the guide and patch notes instead. Remaining reviewer notes that stand as limitations: time-to-level in the prototype uses a constant XP/h, and the model applies formulas rather than validating them.
