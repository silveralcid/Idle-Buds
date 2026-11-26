> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle-2/0.11.7-alpha/economy/ECONOMY.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Economy

Closed single-player economy in the shipped data: three currencies (Gold Pieces, Slayer Coins, Prayer Points), items with `SellsFor`, a shop of 461 wired purchases (499 objects) and quest/task rewards (VERIFIED, `MelvorBase.json`). The online layer (Nakama/Satori, cloud API, Patreon link) exists in code but is out of scope; nothing in the base data defines a player market or trading.

- **Sources**: item sales, thieving currency rewards (e.g. Citizen 3–12 GP at 85 %), combat drops, quest and Mastery Guild rewards.
- **Sinks**: shop purchases (tools, toolbelt and bank upgrades, consumables), recipe inputs, agility obstacle costs, enclosure upgrades.
- **Bank** stacks are an explicit pressure valve in the alpha (initial limit 100, alpha purchase +1 650).
- **Modifiers** remain the real currency: Mastery Guild ranks, toolbelt items, prayers, imbuements and equipment set bonuses (42) feed the same stat graph.
- Balance figures beyond these are not modelled; the alpha's numbers are likely to change (HYPOTHESIS).
