> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera-2/5.4.0/user-experience/UX_ANALYSIS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# UX analysis

Based on the shipped React views (`views/`, 69 files) and the rules they display; no play-testing data (UNKNOWN: retention, session lengths, review sentiment for this version).

## Strengths
- **Everything is visible and explained in numbers.** Helpers show adjusted cycle time and XP/s with the duration reduction applied (`views/pages/creatures/Helpers.tsx`), expeditions show party score and stat contributions with grit/smarts/looting labels, the bonus helpers return per-source breakdowns (sanctuary / upgrades / player level / tool) that the UI can show as tooltips.
- **No-loss systems.** No failed expeditions, no destroyed items, recovery only refunds, and an offline modal reports what happened while away (with sleep detection, so a laptop lid close is handled like a quit).
- **Safe saves.** Atomic write + previous-save fallback + 11 rolling backups + a "Save Management" page that opens the backup folder: data loss is unlikely even on crashes.
- **Guided start.** A 10-step tutorial unlocks tabs one or two at a time for the first nine steps (the last step opens ten tabs at once), so the first hour presents one new system per step instead of the full sidebar.

## Friction
- **Late arrival of the sanctuary.** Only awakened creatures may enter it, so its tab appears with the first awaken point, after a creature reaches level 70 (one to several days). The single largest XP bonus in the game (+120 %) is therefore absent from the early game, and nothing in the UI explains in advance why the slot list will be empty until then.
- **Hidden levers.** The flat yield bonus (+3 → 4× gathered items), the base-duration scaling of container chances, the uncapped helper count and expedition type 1 as a fixed 5-minute XP source are not stated as such in the UI (whether players find them quickly is UNKNOWN).
- **Offline differs from online** without saying so: XP per cycle is floored (small bonuses do nothing offline on the first rungs), while processors consume less and machine creatures level even when idle.
- **Allocation management at scale.** With up to 120 helpers and per-creature job profiles, assigning creatures well is a spreadsheet problem; the helper page lists per-skill activities but there is no "assign each creature to its best job" action (the only auto-assign fills the first open expedition slot; a free `summonAllCreatures` reducer exists but no view calls it).
- **Dead entries**: tabs named in unlock lists that have no page (Dirt to Riches, Content Exporter), placeholder icons on traits, biomes and skills, and a few empty item descriptions.

## Accessibility and presentation (observed in code)
- Fixed minimum window of 1296 px; zoom factor and fullscreen are exposed via IPC and settings.
- Floating resource notifications on every drop (can be dense with many helpers); music module with settings.
- Steam achievements for collection breadth (1/10/20/40/80/120 creatures), gold totals and 99 in every skill.
