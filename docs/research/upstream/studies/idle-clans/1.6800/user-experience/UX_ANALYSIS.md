> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/idle-clans/1.6800/user-experience/UX_ANALYSIS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Idle Clans — UX Analysis (static; STRONG INFERENCE)

Evidence: UI class inventory (251 popup classes, FTUE namespace, Leaderboards, Recruitment UI, portrait-mode rework Nov-2026 per wiki news), localization strings, store reviews.

- **Information density**: a single-screen task picker per skill with level gates visible, inline requirement text (`skill_requirement_*` keys), and ~250 modal popups — the game explains with dialogs rather than guided flows beyond the optional tutorial (FTUE: 15 classes, starter loot of 6 items).
- **Feedback**: Feel/MMFeedbacks + NiceVibrations for juice/haptics on mobile; toast notifications for rare drops (`MaxDropPercentageToShowRareLootNotification` 1 %) and milestones feed; local push reminders at 3/7/14/… days of absence (retention nudges).
- **Social surfaces**: chat channels (general/trade/help/clan hub/LFG), recruitment search for clans and players with language/region/category filters (public API 44–45), clan logs, leaderboards (top 100 queries), Clan Cup standings.
- **Automation as UX**: auto-eat, auto-loot, auto-cook, auto clan boss, auto raid token, task queue, loadouts (15 task + combat) — progression literally buys away clicks, the genre's core promise.
- **Friction/complaints** (store reviews, secondary): grind length, monetization perception (premium skill caps), mixed graphics; strengths: "not P2W", trading, clans, offline progress.
- **Accessibility**: 23 languages; mobile portrait mode; Steam Deck verified; font/contrast specifics UNKNOWN.
