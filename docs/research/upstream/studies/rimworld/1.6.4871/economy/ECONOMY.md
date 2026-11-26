> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/rimworld/1.6.4871/economy/ECONOMY.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Economy

RimWorld's economy is mostly internal: pawns turn time, skill and materials into goods. Silver and trade connect it to factions, and wealth connects it to danger. Formulas are in `mathematics/FORMULAS.md` #20–21 and #31–34; numbers are from model §16 unless noted.

## 1. Value
- **Market value is derived, not authored, for crafted things.** It is the sum of ingredient values plus work × 0.0036. An assault rifle is 60 steel (1.9 each) + 7 components (32) + 40 000 work → 482; a revolver is 135.
- **Labour has a price.** A pawn at work speed 1 does 2 500 work per hour, worth 9 silver of market value per working hour before quality. Quality then multiplies the whole item: awful 0.5, poor 0.75, good 1.25, excellent 1.5, masterwork 2.5, legendary 5, with capped gains of +500 to +3 000. Skill, which drives quality, is therefore worth more than raw speed for valuable items (STRONG INFERENCE).
- **Base values** for raw resources and many items are set in defs (silver 1, steel 1.9, component 32, simple meal 15; `evidence/data/thing_defs.csv`).

## 2. Trade
- **Prices.** The player sells at MV × 0.6 and buys at MV × 1.4, both moved by the negotiator's `TradePriceImprovement` (0.015 per Social level, capped at 0.395), settlement and faction bonuses, and the trader type's price factors. Hard and Extreme add a 10 or 20 % loss on both sides. The sell price is clamped to at most the buy price (`Tradeable.cs` 291–293).

  | Negotiator Social | Buy × MV | Sell × MV | Round-trip loss |
  |---|---|---|---|
  | 0 | 1.40 | 0.60 | 57 % |
  | 10 | 1.19 | 0.69 | 42 % |
  | 20 | 0.98 | 0.78 | 20 % |
  | cap (0.395) | 0.847 | 0.837 | 1 % |

  Trade alone cannot make money: profit comes from producing goods cheaply and selling them, not from arbitrage.
- **Channels.** Orbital traders (comms console), visiting caravans, the player's own caravans to settlements, quests that pay in silver or items, and ransom and prisoner sales. Royalty adds favor as a second currency for some trades (`TradeCurrency.Favor`).

## 3. Wealth and threat: the economic brake
- **Storyteller wealth** = items + 0.5 × buildings (floors included) + pawns (slaves × 0.75). It feeds threat points through a curve that is flat to 14 000, then rises to 2 400 points at 400 000 and 4 200 at 1 000 000.
- **Consequences** (STRONG INFERENCE):
  - Stockpiled silver and items count fully, buildings at half, and destroyed or traded-away value drops out at the next recount (at most every 5 000 ticks).
  - Converting surplus into buildings, or spending it on defence, lowers threat per unit of value.
  - Hoarding raises threats without making the colony stronger.
- **Fixed wealth mode.** This difficulty option replaces measured wealth with a time curve (`Map.PlayerWealthForStoryteller`), for players who do not want this pressure.

## 4. Sinks and sources
| Flow | Source | Sink |
|---|---|---|
| Materials | mining, chopping, farming, animals, deconstruction, salvage, raid loot | construction, crafting, fuel, rot and deterioration |
| Food | farming, hunting, animal products, trade | nutrition needs (1.6 per human per day), spoilage |
| Silver | trade, quests, ransom, events | trade purchases, quest costs, ideology and royal obligations |
| Medicine and drugs | crafting, trade | treatment, addiction |
| Value at risk | everything above | raids (theft, kidnapping, destruction), fires, infestations, mental breaks |

The danger sink is the distinctive one. Raids, steal subgraphs and fires destroy or remove wealth, and the storyteller sizes them by wealth, so the economy is self-limiting.

## 5. Research as investment
Research has no silver cost, only researcher time: points per hour = 20.6 × ResearchSpeed × bench factor. At Intellectual 10 on a hi-tech bench that is 25 points per hour, so a 4 000-point project costs about 158 researcher-hours. That is time not spent producing. Tribal starts pay ×2 for every Industrial-and-later project.
