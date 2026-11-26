> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/legends-of-idleon/build-144/user-experience/UX_ANALYSIS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# UX analysis

From code and data only; the game was not played for this pass, so player reception is UNKNOWN.

## Strengths
- **Everyone keeps working.** Every character earns on its own target while another is played, and returning shows each character's AFK haul when it is selected. The core fantasy of an "idle MMO where you're in control" (the wrapper's own description) is built into the data model.
- **Generous starts.** Characters below level 25 attack faster, early levels are cheap (class level 10 needs 2 703 EXP), and early maps have low-Defence monsters that any accuracy can hit.
- **Many short goals.** 350 quests, 490 achievements, card collections, stamp and bubble levels and portal kill counts give a constant supply of small targets.
- **Cross-platform account.** Steam, web and mobile share one Firebase account (Google, Apple, email or Steam ticket sign-in); a uid change during login greys the game out and stops saving ("Possible Double Sign In"), and a `DUP_LOG` message addressed to this device sends it to a separate scene; how the server arbitrates two live devices is not visible.

## Friction
- **Opaque formulas.** Hit chance is 0 below half a monster's Defence and AFK fighting counts hit chance twice, so an under-geared character can sit on a map earning nothing or far less than expected; skilling needs about ten times a node's requirement for certainty. Stat screens show totals, but the reasons are hard to see (INTERPRETATION).
- **Information density.** Hundreds of bonus sources across 20 skills and dozens of account systems; most players lean on community tools and wikis (the wrapper itself whitelists two wiki domains).
- **Rotation chores.** AFK gains are claimed per character, so a large account means a routine of switching through every character to collect and reassign.
- **Pressure points tied to spending.** Inventory and storage space, AFK-rate and damage bundles, and time candies sit where players feel friction most (economy notes); the code shows bundles as permanent multipliers in core formulas.
- **Online dependency.** Login, time (for AFK), saving and many features need the Firebase backend; offline play is not possible.
- **Drop batches.** Small batches of rare drops are shaved (FORMULAS #11), which players would see as rare drops being rarer AFK than active (STRONG INFERENCE).

## Platform specifics
Frameless window with a custom React title bar, Steam Deck sizing and on-screen keyboard, Steam overlay fix switches, background-throttling disabled so the game keeps ticking when minimised.
