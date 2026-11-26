> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/legends-of-idleon/build-144/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Legends of Idleon — Final Reverse-Engineering Research Report

Build: Steam app 1476970, Electron 11.5.0 wrapper, game client build 144 (Lava Flame Studios). Everything was read from the installed files; the game was not run, no account was signed in, and no Firebase or other service was contacted. Media assets were not extracted.

## 1. Executive summary
Legends of Idleon is a Stencyl game compiled through Haxe to an OpenFL HTML5 build: one 25 MB Closure-compiled script (`N.js`) inside an Electron shell with a React title bar and a 33 KB Firebase bridge. Because the output is JavaScript and the Stencyl structure survives (class registry, named "custom blocks", game attributes), the rules are readable after beautifying, and the content, which is compiled into the script as data-building functions, can be dumped by evaluating those classes alone in a sandbox (2 480 items, 418 monsters and resource nodes, 260 tables, 0 errors). The 20 formulas in `mathematics/FORMULAS.md` are tiered VERIFIED with the custom block and line where each is computed; the independent review (§16) corrected four of them and several line ranges.

The architecture splits authority unusually. The server (Firebase project `idlemmo`: Auth, Firestore, two Realtime Databases, 54 Cloud Functions) owns the time reference, purchases, gem and bundle grants, some loot, companions, tournaments, raids and social state; the client computes all progression and writes its own 177-key save document. The bridge hides its command names behind reversed, base64-encoded keys and Cloud Functions behind two- to five-letter names called through a function renamed `useState`, which is camouflage rather than protection. Offline progress is **analytic**: each character's away time (a game clock set from the server at each sync and advanced by the local clock in between, minus the character's own stamp) times hourly rates times an AFK share (before bonuses 40 % fighting, 52 % for most skills, 100 % Divinity, 50 % Spelunking, 1 % Research). `AFKgains` applies no general time cap beyond one prayer and two sanity resets; several account systems cap their own stores.

Gameplay is an account of parallel characters on separate targets feeding a web of account systems (stamps, alchemy, construction, cards, statues, star signs … over seven worlds and 20 skills), all expressed in one shared bonus grammar (`add`, `decay`, `decayMulti`, `intervalAdd` … with x1, x2, level). The 21 EXP ladders use 15 distinct curves (seven gathering and crafting skills share one); Laboratory to 100 costs 7·10⁵ EXP and Research 3.5·10¹⁴ with the server variable `A_ResXP` at 1 (5.3·10¹⁷ at 1.1). Accuracy and efficiency are hard gates (no hits below half a monster's Defence; a certain harvest only at about ten times a node's requirement), damage is compressed by staged soft caps instead of capped, and costs grow geometrically. Three findings stand out: AFK fighting applies hit chance twice (at 52 % hit chance AFK kills are about half of what one application gives); batch drop rolls undercount expected drops by up to 27 % for small batches; and several purchasable bundles are permanent multipliers inside core formulas (×1.5 damage, +30 AFK points, +250 % coins).

## 2–13. Sections → `architecture/`, `gameplay/`, `progression/`, `economy/`, `mathematics/`, `content/`, `user-experience/`, `development-lessons/`, `prototypes/`, `experiments/`, `evidence/`, `simulations/`.

## 14. Remaining unknowns
| Item | Status |
|---|---|
| Server-side rules (Firestore security rules, Cloud Function logic, validation of saves and spending) | UNKNOWN; out of scope (live service) |
| Server variables' current values (e.g. `A_ResXP`, happy hours, bundle offers) | UNKNOWN; read at login from `_vars/_vars` |
| Gem-shop page contents and prices | in scene code, not enumerated; 84 gem-shop slots are read by formulas |
| Effects of each of the ~65 bundle flags | three traced (`bon_a`, `bun_u`, `bun_y`); the rest not individually traced |
| Most bonus terms inside the long formulas (≈150 sources in damage) | named in `evidence/blocks/`, not individually modelled |
| Companion gacha odds, tournament and raid rules | server-side |
| Whether the server bounds offline gains or validates saves | UNKNOWN; the client applies no general cap |

## 15. Completion checklist
- [x] Engine/stack identified (Electron 11 → React iframe → Stencyl/Haxe/OpenFL HTML5; Firebase backend)
- [x] Code beautified and archived; data classes dumped (JSON + 23 CSVs)
- [x] Formulas with tiers and line numbers (20); formula blocks archived in readable form
- [x] Model and prototype (cross-checked)
- [x] Design, UX, development lessons
- [x] Independent review (§16), corrections applied

## 16. Independent review
A separate agent reviewed the workspace read-only, with its scratch files outside it, and made no network calls. It re-ran the pipeline: the `N.js` hash matches, js-beautify 1.15.1 `-s 1` reproduces `N.pretty.js` exactly, and `dump.js`, `build_dataset.py`, the model and 26 simplified blocks reproduce byte for byte. It executed the original `AFKgainrates`, `IncreaseExpREQ` and `CalcAwayKills` code with bonuses stubbed, ran the prototype under node, and checked each formula row against its lines. Every EXP total, hit-chance, Defence, soft-cap, drop-bias, stamp and content count in the docs matched, except those listed below.

Corrections applied:
- **Clock.** The game clock is set from server time at login and re-sync, then advanced by the local clock (+1 per second, and the local gap after 0–120 s out of focus); only gaps over 120 s re-sync. The docs had said the local clock is not used (ARCHITECTURE, DEVELOPMENT_LESSONS, §1).
- **Sign-in and purchases.** The grey-out and "cancel saving" path is a uid change during login. `DUP_LOG` only applies to this device and switches scene. Both purchase callables are Steam (`ptc` from `startBuy`, `ptf` after Steam authorisation); the web flow uses Stripe and was not traced (ARCHITECTURE, UX).
- **Formula rows.**
  - #16 stamps: coins are paid for every level, and materials raise the cap without adding a level; the vial reduction applies to coins too. Model and prototype fixed (Sword Stamp to L10: 445 coins, not 402).
  - #18 respawn: the 50 bound is on self-heal/100.
  - #20 harvest: 5.0 % at r = 0.25, and the block is `RunCodeOfTypeXforThingY`.
  - #5, #12–#14: ranges, branches and per-activity AFK bases corrected (Divinity 100 %, Spelunking 50 %, Research 1 %).
  - The Crabcake example is 40 vs 75 kills/h.
- **Counts.**
  - 15 distinct EXP curves across 21 ladders, not one per skill.
  - 260 tables, not 262.
  - 240 custom-block definitions (235 non-empty).
  - `ArbitraryCode` has 33 branches, not 70 selectors; `EtcBonuses` is a map lookup.
  - 55 callable names.
  - Stamp intervals are 1–20.
  - The kill-per-kill multiplier reads about 51 calls.
  - Kills per level grow ×1.24 per level at L10–30.
  - Research cost depends strongly on `A_ResXP`.
- **Caps and saves.**
  - `AFKgains` has the prayer cap and two resets; account systems cap their own stores. The "carry capacity" claim was unsupported and was removed.
  - Saves also run on a four-minute timer, and all 177 keys are written in `CloudSAVE`.
- **Wording.** Design intent was stated as fact ("deliberate wall", "design choice", "constant constraint"); this is now marked as not documented or not measured. "Double-counted" was reworded to "enters twice". Every world attribution is labelled INTERPRETATION. The CSP is noted as using fixed nonces. The bundle flags' additional effects and the missing Firestore collections and item builders were added.
- **Secrets.** `evidence/client/extra.js` contained a Google OAuth device-flow client secret; it is now redacted, as is the Stripe publishable key in `index.html` (see `SOURCE.txt`). No other keys or credentials were found.

Not changed: the review confirmed formula rows 1–4, 6–11, 15, 17 and 19 as written (with small caveats now noted inline). The intent behind hit chance entering the AFK kill rate twice remains unknown.
