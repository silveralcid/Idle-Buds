> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle-2/0.11.7-alpha/user-experience/UX_ANALYSIS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# UX analysis

From code and data only (no play-testing; UNKNOWN: player reception of the alpha).

## Strengths
- **Explained numbers.** Tooltips are templated from the stat graph (e.g. hit chance shows "Your … Accuracy Rating vs Enemy's … Evasion Rating = chance to hit"; resistance shows "Capped at 70 % before Combat Triangle"); some of that text is fixed localisation (the 70 % note is hard-coded in `en_GB.po`), so it would not follow a data change.
- **Bounded luck.** Mining progress removes long dry streaks; tree health makes log timing predictable; progress bars reflect real state.
- **Goals everywhere.** Mastery Guild tasks, quests and completion log give many concrete targets.
- **Sleep and catch-up handling.** A detector notices sleep or stalls once at least 10 s of drift build up inside one 5 s window (shorter stalls are discarded) and replays missed ticks off the UI thread with a progress counter and a snapshot of what changed.
- **Settings** include a TimeOfDay group (accelerated default cycle, system clock or fixed hour) and display modes (`Settings/defaultDevice.json`, `defaultUser.json`).

## Friction (alpha)
- Placeholder art and copy on many tasks and obstacles.
- Information load grows with new skills (ranching variants, toolbelt types, astrology nodes) on top of Melvor 1's density.
- Online features (accounts, cloud, news) depend on external services; their UX was not examined.
