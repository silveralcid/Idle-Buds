> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/legends-of-idleon/build-144/FINAL_REPORT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Legends of Idleon — Final Reverse-Engineering Research Report

Build: Steam app 1476970, Electron 11.5.0 wrapper, game client build 144 (Lava Flame Studios). Everything was read from the installed files; the game was not run, no account was signed in, and no Firebase or other service was contacted. Media assets were not extracted.

## 1. Executive summary
Legends of Idleon is a Stencyl game compiled through Haxe to an OpenFL HTML5 build: one 25 MB Closure-compiled script (`N.js`) inside an Electron shell with a React title bar and a 33 KB Firebase bridge. Because the output is JavaScript and the Stencyl structure survives (class registry, named "custom blocks", game attributes), the rules are readable after beautifying, and the content, which is compiled into the script as data-building functions, can be dumped by evaluating those classes alone in a sandbox (2 480 items, 418 monsters and resource nodes, 262 tables, 0 errors). The 20 formulas in `mathematics/FORMULAS.md` are therefore **VERIFIED** at line level.

The architecture splits authority unusually. The server (Firebase project `idlemmo`: Auth, Firestore, two Realtime Databases, 54 Cloud Functions) owns time, purchases, gem and bundle grants, some loot, companions, tournaments, raids and social state; the client computes all progression and writes its own 177-key save document. The bridge hides its command names behind reversed, base64-encoded keys and Cloud Functions behind two- to five-letter names called through a function renamed `useState`, which is camouflage rather than protection. Offline progress is **analytic**: each character's away time (server clock minus its own stamp) times hourly rates times an AFK share (40 % fighting, 52 % skilling before bonuses), with no general time cap in the code.

Gameplay is an account of parallel characters on separate targets feeding a web of account systems (stamps, alchemy, construction, cards, statues, star signs … over seven worlds and 20 skills), all expressed in one shared bonus grammar (`add`, `decay`, `decayMulti`, `intervalAdd` … with x1, x2, level). Every skill has its own EXP ladder (Laboratory to 100 costs 7·10⁵ EXP, Research 3.5·10¹⁴). Accuracy and efficiency are hard gates (no hits below half a monster's Defence; a certain harvest only at about ten times a node's requirement), damage is compressed by staged soft caps instead of capped, and costs grow geometrically. Three findings stand out: AFK fighting applies hit chance twice (at 52 % hit chance AFK kills are about half of what one application gives); batch drop rolls undercount expected drops by up to 27 % for small batches; and several purchasable bundles are permanent multipliers inside core formulas (×1.5 damage, +30 AFK points, +250 % coins).

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
| Save cadence | event-driven saves seen; timer value not traced |

## 15. Completion checklist
- [x] Engine/stack identified (Electron 11 → React iframe → Stencyl/Haxe/OpenFL HTML5; Firebase backend)
- [x] Code beautified and archived; data classes dumped (JSON + 23 CSVs)
- [x] Formulas with tiers and line numbers (20); formula blocks archived in readable form
- [x] Model and prototype (cross-checked)
- [x] Design, UX, development lessons
- [ ] Independent review (§16)

## 16. Independent review
(pending)
