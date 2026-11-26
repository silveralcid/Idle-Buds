> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle/1.3.1/user-experience/UX_ANALYSIS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# UX analysis

From the client scripts and data; no play-testing data (UNKNOWN: retention, session patterns).

## Strengths
- **Trustworthy timing.** Progress bars are tick timers; offline progress shows a loading bar that replays the ticks of whatever keeps running offline (combat only with the opt-in setting).
- **Transparent numbers.** Modifier sources are itemised in tooltips (`ModifierSourceBuilder` in Thieving stealth, mastery XP sources), and the formulas are simple enough to rebuild outside the game.
- **Gamemodes and character slots** give separate saves with different rules; Hardcore and Adventure add stakes for players who want them (event and speedrun modes are discontinued).
- **Mods are first-class**: an in-game mod manager with mod.io, error attribution to the offending mod and game-version tags keeps the base game stable while the community extends it.
- **Localisation**: 13 real locales loaded by key.

## Friction
- **Information density.** 24 skills, mastery per action, four pool checkpoints, 570 modifier types and global sources (agility, astrology, township, pets, potions, summoning synergies) make "what is my real XP/h" hard to answer in game; players need external tools to plan well (INTERPRETATION).
- **Bank management.** Limited slots with steep late costs force constant selling and sorting.
- **24-hour offline cap** with catch-up time proportional to the gap: very long gaps are processed at CPU speed (adaptive batches), so returning after a day costs a loading wait.
- **Defaults that stop progress**: Thieving stops at the first stun and combat stops when the game goes offline unless the player changes two settings (one behind five confirmations).
- **Web client inside a wrapper**: the Steam build needs the network to load the game, and its behaviour depends on Chromium flags (background throttling is disabled explicitly).

## Accessibility and presentation
- Themes (OneUI-based CSS with colour themes), keyboard input handling (`keyboardInput.js`), floating notifications, minibar shortcuts per skill.
- Tutorial island with staged objectives for new players.
