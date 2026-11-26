> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera-2/5.4.0/architecture/ARCHITECTURE.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Technical architecture

## Build and process model (VERIFIED)
- **Shell**: Electron 23.3.13 (Chromium 110.0.5481.208), read from `Koltera 2.exe`. `resources/app.asar` (55 MB) holds `package.json` (`koltera-2` 5.4.0, King Otter Games, main `build/electron/main.js`, deps `steamworks.js` 0.0.26, `@nivo/radar`, `electron-reload`), the main-process code in `build/electron/` and a Create React App build in `build/` (`static/js/main.87b32385.js`, 1.6 MB, plus its 5.3 MB source map with embedded sources).
- **Main process** (`build/electron/main.js`, `ipc.js`, `encryption.js`, `configs.js`, `preload.js`, `utils.js`): initialises Steamworks with app id 2834700, opens one BrowserWindow (minimum 1296 px wide), and exposes IPC handlers `log`, `save`, `load`, `remove`, `open-backups`, `encrypt`, `decrypt`, `achievement`, `link`, `quit`, `set/get-zoom-factor`, `set/get-fullscreen`, `get-window-size`. The renderer reaches them through `window.api` from the preload script.
- **Renderer**: React + Mantine UI + nivo charts, TypeScript compiled by CRA. The source map recovers 207 files (≈42.9 k lines): `engine/` 5 files (dispatcher, saves, settings, Steam bridge, save versions), `modules/` 69 files (19 gameplay modules), `content/` 48 files (13.6 k lines of data and config), `utils/` 10, `views/` 69 (19 k lines of UI).

## State and update model (VERIFIED)
- One plain JSON `State` object, versioned (`engine/versions/v1.ts` `DefaultSave`, migrations 0 → 21 in `engine/saves.ts` `version()` (`DefaultSave.version = 21`)), held in a React `useReducer`. Every action is `{ action: (state, payload) => state, payload }`; the reducer applies it to `structuredClone(state)`.
- Modules self-register: `require.context('../modules', true, /updates\.ts$/)` collects every `modules/<name>/updates.ts` and calls its `onUpdate(state, {deltaTime})` and `onFixedUpdate(state, {deltaTime})` in key order. No module declares dependencies on another; order is alphabetical by folder.
- **Game loop** (`views/GameWrapper.tsx`): `requestAnimationFrame` drives a tick; each frame's delta is clamped to 1 s; an accumulator counts pending 1-Hz fixed updates; every ≥ 33 ms one batched `gameTick` dispatch runs all pending fixed updates and then one variable update, so the whole simulation costs one `structuredClone` per dispatch (the code comment cites memory pressure as the reason for batching).
- **Two clocks coexist**. Gathering, helpers, crafting, garden, dungeons and expeditions compare `Date.now()` with a stored `startTime` (wall clock); machines, fabrication and creature gold count fixed updates in module-level counters that are not saved (`machineCounters`, `fabricationCounter`, `goldGenerationCounter`). Sanctuary XP adds 0.5 per fixed update. Because each frame's delta is clamped to 1 s, frame gaps between 1 and 10 s (stalls short of sleep detection) lose time for the fixed-update systems and helper XP but not for the wall-clock systems.
- **Sleep detection**: a wall-clock gap of ≥ 10 s between frames (laptop sleep, throttled background window) runs the offline calculator instead of advancing the loop, then resets the accumulators.
- **Memoisation**: sanctuary tiers are cached on the lineup array and job benefits per tier (`modules/sanctuary/helpers.ts`), because the gathering update calls them every frame.

## Offline progress (VERIFIED, `utils/offline-progress.ts`, 1 078 lines)
`simulated = min(now − lastSaveTime, 72 h)`. Per system:
- player gathering and each helper are replayed **cycle by cycle** with the same random loot rolls (at most 54 000 iterations per gatherer over 72 h, since the shortest reachable cycle is 4.8 s);
- crafting queues are walked job by job, completing `floor(elapsed / itemTime)` items and carrying the overflow into the next queued job;
- machines, garden and fabrication complete `floor((elapsed + carried)/interval)` cycles and store the remainder in their timestamps;
- expeditions and dungeons complete by their absolute end times; sanctuary and machine creatures gain `0.5 × seconds`; awakened gold `floor(minutes × goldPerMinute)`.
The result is shown in a modal; an `offline-progress-potion` (100 000 gold, 3 per week) exists in the merchant.

## Persistence (VERIFIED, `build/electron/ipc.js`, `encryption.js`)
- `save.json` in the game data directory, written every 30 s by the renderer, after an offline/sleep catch-up, and synchronously from `beforeunload` (the comment explains a dispatch there would hang Electron on close). The main process JSON-stringifies the state, encrypts it with **AES-256-CBC, a random 16-byte IV per save, stored as `ivhex:cipherhex`**, copies the previous file to `save.json.prev`, writes `save.json.tmp`, `fsync`s and renames: an atomic write with a one-generation fallback. Every 15 minutes it also writes a timestamped encrypted backup, keeping the 11 newest.
- Load tries `save.json`, then `.prev`, then each backup newest first, and starts fresh only if all fail; the renderer runs `version()` migrations and `patch()` (removes keys absent from the default save, adds missing defaults recursively, preserving contents of empty default objects).
- The key is a constant in the shipped main-process code, so the encryption prevents casual editing only; it is not a protection boundary. The research copy of `encryption.js` has the literal redacted and no save file was read or decrypted.

## Steam and tooling (VERIFIED)
- Achievements are unlocked through IPC → `steamClient.achievement.activate(key)` (18 achievement definitions in `content/data/achievements.ts`). No Steam Cloud API calls appear in the main process; cloud sync, if any, would be configured on Steam's side (UNKNOWN).
- A "Developer Tools" tab exists only when `process.env.NODE_ENV === 'development'`, so CRA strips it from the shipped build. "Content Exporter", "Discord" and "Credits" are in the base unlocked-tab list; no navigation entry named Content Exporter exists in the shipped views (dead entry).

## Defects and code/comment drift found (VERIFIED)
| # | Finding | Effect |
|---|---|---|
| 1 | Sanctuary tier comments say "+20 % XP" and "+40 % total"; the values are 40 and 80 (cumulative +120 %) | the strongest XP source is 3× what its designer comment says |
| 2 | Garden rock comment "1000 × 1.5^n"; code `750 × 1.191232^n` | documentation drift (code ends near 50 000 gold) |
| 3 | Expedition duration comment "0 % = 2 hr"; bound is 3 600 s | documentation drift |
| 4 | Creature helper comments mention cap 99 / "Level 99: 490 050 XP"; config caps at 70 (120 awakened) | documentation drift |
| 5 | XP is unbounded past 99 (`addExperience` has no cap); `getMaxXp()` and `getXpForLevel()` are unused, and `getXpForLevel` is off by one | dead helpers; at 99 the XP bar runs between the last two table entries (1.35 B → 1.48 B) |
| 6 | Offline gathering XP uses `Math.floor(xpRate × mult)`, online `round(…, 2)`; offline crafting XP is floored per job, online rounded | offline loses the fractional bonus (−11 % at xpRate 2 with +12.5 %; any bonus under +50 % on the first rung is lost) |
| 7 | Activities restart with `startTime = now`, discarding the overshoot | at most 0.34 % slower than nominal (4.8 s cycle); 0.2 % at 8 s |
| 8 | Machine, fabrication and creature-gold counters live in module scope and are not saved | a reload drops up to one interval of progress per machine |
| 9 | `gameTick` passes the frame delta as `fixedDeltaTime` | unused by every module today; a trap if a module starts to scale by it |
| 10 | A comment in `story/helpers.ts` says "Unlock Sanctuary and Awaken Tree", the code unlocks Sanctuary and Fabrication (Awaken Tree comes from the last tutorial step) | drift; no player impact |
| 11 | The final tutorial step unlocks a "Dirt to Riches" tab whose navigation entry is commented out, as are Gauntlet, Player Handbook and six other mini-games | dead unlock; cut content visible in source |
| 12 | Biome multipliers multiply per creature type, so a dual-type creature would get ×2.25 or ×0.25 | latent: every shipped creature has exactly one type |
| 13 | Further offline divergences: processors consume only their primary input (bakery leather/egg, refinery stone never taken); machine creatures gain XP offline whether or not the machine runs; a not-yet-completed gathering/helper cycle subtracts the simulated time from `startTime` twice; the garden drops partial progress when no cycle completes; the sleep path computes from `lastSaveTime`, up to 30 s stale, re-crediting time simulated online | offline is better than online on some axes and worse on others |
| 14 | More comment drift: `configs/expeditions.ts` per-tier duration comments (10–25 min; values 300 and unused) and "30 minutes" for 3 600 s; `configs/dungeons.ts` "1 xp/sec" (450 over 900 s is 0.5); `offline-progress.ts` "per 2 minutes" for 180 s; `story/helpers.ts` "Creatures and Expeditions" (unlocks Creatures and Helpers); `creatures/helpers.ts` skill L50 "~1,111,945" (101 333); `GameWrapper` "24 Hour Offline Potion" (the item is one hour); unused `BACKUP_INTERVAL = 30` | documentation drift |
| 15 | Dead code: `getBestExpeditionTeam`, `getHelperSlots`, `EXPEDITIONS_PER_TIER`, effect types `all_*`/`qol_*` without data | unused |
| 16 | Rules enforced only in the UI: summon cost and one-per-species (`summonCreature` checks neither), ≤ 3 creatures per expedition, one active expedition per type | reducers trust the caller |
