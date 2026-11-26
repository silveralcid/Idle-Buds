> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/architecture/TECHNICAL_ARCHITECTURE.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera (v7.0.0 build, "Kolterra 1") — Technical Architecture

Evidence tier legend: **VERIFIED** = read directly from recovered source; **STRONG INFERENCE**; **HYPOTHESIS**; **UNKNOWN**.

## 1. Identification (VERIFIED)

| Item | Value | Evidence |
|---|---|---|
| Title | Koltera (internal/legacy name **Fableverse**; exe is `fableverse.exe`, package name `fableverse`) | `package.json`, exe name |
| Developer | King Otter Games | `package.json` author |
| Steam App ID | 2233750 (main), 2280400 (playtest), 2520330 (demo); DLC 2262840 "Supporter Pack" (disabled in code) | `build/electron.js` |
| Package version | 7.0.0 ; save-format version 10 | `package.json`, `DefaultState.json` |
| Engine | **Electron 27.1.3 / Chromium 118.0.5993.159** hosting a **Create React App** (webpack) bundle | strings in `fableverse.exe`, `asset-manifest.json` |
| Language | JavaScript (JSX), ES2020; no TypeScript | source map |
| UI framework | React 18 + `react-router-dom` (hash router) + **Ant Design** (dark algorithm) | `App.js`, `index.js` |
| State | `useReducer` + `lodash.clonedeep`; no Redux library | `StateMachine.controller.js` |
| Platform integration | `steamworks.js` 0.0.26 (native .node addons for win64/linux64/osx) — used **only** for `achievement.activate()` | `electron.js` |
| Save location | `%USERPROFILE%\Saved Games\King Otter Games\Koltera\save_slot{1..3}.json` + `backups_slot{n}/` (50 rotating backups) | `electron.js` |
| Renderer flags | `in-process-gpu`, `disable-renderer-backgrounding`, `disable-background-timer-throttling`, `disable-audio-output`, `disable-accelerated-2d-canvas` | `electron.js` |
| Build artifacts shipped | **Full source maps with `sourcesContent`** (`main.2e03b727.js.map`, 4.4 MB) — the entire original source is recoverable | `build/static/js/` |

Installation layout: standard Electron (`resources/app.asar` = 34.8 MB containing `build/` + 3 runtime deps; `app.asar.unpacked/` holds the steamworks native binaries). 539 media files (494 creature PNGs, 11 mineral PNGs, 12 location JPGs, 12 gardening PNGs, one menu MP4).

No DRM, obfuscation, or integrity checking of any kind was present; nothing had to be bypassed. Steam is optional at runtime (`try/catch` around `steamworks.init`).

## 2. Process model (VERIFIED)

```
Main process (electron.js)                    Renderer (React, build/index.html)
 ├ steamworks.init(appId)                      ├ HashRouter:  "/"  -> Menu.js (slot select)
 ├ ipcMain.handle('save'|'load'|'delete'|      │               "/game" -> Game.js
 │   'listSaves'|'listBackups'|'restoreBackup' ├ Game.js: useReducer(StateMachine.reducer, Save.load(slot))
 │   |'openBackupsFolder'|'supporterPack')     ├ useInterval(1000ms): StateMachine.update -> dispatch('update')
 ├ ipcMain.on('loadSync'|'quit'|'discord'|     ├ SteamPlugin: 1px canvas repainted every rAF (keeps Steam overlay alive)
 │   'youtube'|'wiki'|'trigger_achievement')   └ window.electronAPI (contextBridge from electron-preload.js)
 └ globalShortcut: disables F5 / Ctrl+R / Ctrl+Shift+I when packaged
```

`contextIsolation: true` + preload bridge; `nodeIntegration: true` is also set (contradictory but harmless since isolation wins).

## 3. Game loop & state machine (VERIFIED)

**Tick = 1 real second** (`useInterval(…,1000)`; `GameConfig.debug.updateTickRate`). Each tick:

1. `StateMachine.update(state)` deep-clones state, sets `lastTick = now`, then calls `Controller.helpers.update(state)` for **every** file in `components/Controllers/` (discovered at build time via `require.context`). Order = webpack's alphabetical module order: Achievements, Augmenting, Breeding, CharacterLevel, Combiner, Creatures, Exploring, Gardening, Magic, Mining, Settings, Trader, Training, Upgrades, _GameConfig.
2. The result is dispatched as `{type:'update', payload}`; the reducer replaces state and **auto-saves every 15 ticks** (`ui.autoSaveInterval`).
3. UI actions dispatch `{type:'Controller.function', payload}`; the reducer splits on `.` and calls that exported function. Every action also deep-clones the whole state (twice).

Consequences:
- Pure, serializable game state → trivial save/load, migrations, and offline calc.
- O(state size) clone per tick and per click; with hundreds of creatures this is the main perf cost (`lodash.clonedeep` on a ~100 KB+ object). The devs disabled hardware acceleration features and timer throttling to keep the 1 s tick honest in the background.
- **No fixed-timestep catch-up**: if the renderer stalls, ticks are simply lost (except the offline-progress estimate on load).
- An inactivity watchdog reloads the page after 60 min without mouse input (`inactivityRefreshTime`) — a crude memory-leak mitigation.

Controllers follow one convention: `{ actionA, actionB, helpers: { start, update, …pure helpers } }`. `helpers` are also imported directly by Views for read-only math, so the same formula is never duplicated.

## 4. Persistence (VERIFIED)

- Save = the whole reducer state as pretty-printed JSON (`JSON.stringify(gameData,null,2)`); ~5 KB empty, grows linearly with creature count.
- `Save.load`: `loadSync` IPC → `version()` runs ordered migrations (v<7 upgrade-system refund, v<8 trader fix, v<9 dangling-ID cleanup, v<10 perfectLog backfill) → `patch(old, DefaultState)` recursively **adds missing keys and deletes unknown keys**, which is how new features get default values.
- Before every write the main process (per `electron.js`, extracted from the asar, not part of the source map) copies the previous file to `backups_slotN/backup_<ISO>.json`, keeping the newest 50.
- A one-time migration moves pre-v2.0 `localStorage['gameSave-N']` saves to disk.
- `beforeunload` and "Quit to Main Menu" force a save; "Quit to Desktop" does **not** explicitly save (relies on the last 15 s autosave + beforeunload).
- Offline progress (`Game.js` mount): computes seconds since `lastTick`; if >5 s, estimates coins per miner = `price / ceil(100/estimatedDamage)` per tick × 0.75, plus `lumin = reactorEffect/5 × ticks`, and dispatches them. It ignores stamina rest cycles (hence the 0.75 fudge), ignores training/exploring entirely, and has **no cap**.

## 5. Content/data architecture (VERIFIED)

Data-driven via 7 JSON tables (recovered in `evidence/source_reconstructed/components/Data/`):

| File | Rows | Purpose |
|---|---|---|
| Fables.json | 41 | Species: Type (Fire/Water/Earth/Air), base stats, Learning_Speed, Rarity |
| Minerals.json | 11 | Rocks: Value, Health, XP, Level |
| Mining_Upgrades.json | 23 | All Legacy upgrades: cost, scale, max, value, description |
| Locations.json | 12 | Training areas: level band + 4 species each |
| Spirits.json | 12 | Natures: +20% one stat / −20% another |
| Pickaxes.json | 15 | Rock-unlock ladder: rock index > `mining.pickaxe` is locked; next rock is bought with coins (`Mining.upgradePickaxe`, via `MineralSelector`) — 10 881 169 coins to unlock all 11 (rows 11–14 unused) |
| DefaultState.json | – | Canonical save schema |

Hard-coded in source rather than data: gardening tiers, breeding costs/augment multipliers, augment cost table, soulstone summon costs, exploration loot tables, potion recipes, specializations, magic boost formulas. `_GameConfig.js` centralizes ~60 constants but roughly half are **dead** (e.g. `upgradeCostMultiplier 1.5` — real cost is linear; `reactor.*`, `trading.*`, `magic.*`, `achievements.*`, `exploration.stepsPerLocation`, `debug.updateTickRate` unused; the 1000 ms tick is a literal in `Game.js`).

Images are resolved by naming convention `creatures/Fable_<Name>[_<Augment>].png` through a `require.context` map (`Images.js`); vibrancy is rendered as a CSS `grayscale(vibrancy%)` filter rather than extra art — 41 species × 12 variants = 492 sprites.

## 6. UI architecture (VERIFIED)

Single `Game.js` shell: fixed 300 px Ant `Sider` menu (3 groups, items disabled until unlocked and badged gold until first visit), header with Trainer level bar + currencies, and a `Content` area that mounts exactly one tab component. Tabs persist per slot in `localStorage`. Shared widgets: `FableSelector` (modal picker with sorting/filters/pagination), `FableToolTip`, `Inspector`, `MineralBar`. Feedback: Ant `Modal.info` for summons/offline, `message.success` for automation, Steam achievement toasts. No sound (audio output disabled at the Chromium level). Minimum window 1250×700, fixed-width layouts — not responsive.

## 7. Known technical limitations / bugs found in source

| Finding | Tier | Detail |
|---|---|---|
| Elemental typing never applies | VERIFIED | `getDamage` reads `attacker.Type`, but creature instances carry no `Type` (it lives on the species row) → `typingMod` always returns 1. |
| `inBedAlready` references `state.player.sanctuary` | VERIFIED | Field does not exist in DefaultState; function is dead code from a removed "Sanctuary" feature. |
| `Achievements.js` MAGIC_STAFF branch calls `AwardsController.helpers.triggerAward` (self-reference) instead of the local `triggerAward` | VERIFIED | Harmless at runtime (module is initialized before the first tick); style inconsistency only. |
| `MIXOLOGIST` award triggered but absent from `awards` map | VERIFIED | `triggerAward` sets a new key; harmless but never shown. |
| `timestone` incremented each tick but not in DefaultState | VERIFIED | `patch()` deletes it on next load → vestigial. |
| Magic staff (`staffs.magic`) can never be crafted/levelled | VERIFIED | No Craft/Upgrade component is rendered for type `magic`; its `40+5L` boost is dead. Automation is gated by crafting all 4 domain staffs + Potion Crafter / Apprentice upgrades. |
| Apprentice auto-Extend/auto-Summon have no timer guard | VERIFIED | Fire every tick while Mana ≥ 2 / ≥ 15 → drain Mana Potions continuously. |
| Soulstone summon ignores storage cap | VERIFIED | `spendSoulstones` pushes without the `25+capacity` check. |
| Deep clone twice per action | VERIFIED | Perf scales with collection size. |
| No multiplayer / network | VERIFIED | Only `shell.openExternal` links. |
