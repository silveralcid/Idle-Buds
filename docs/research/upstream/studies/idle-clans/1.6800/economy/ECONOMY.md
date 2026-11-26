> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/idle-clans/1.6800/economy/ECONOMY.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Idle Clans — Economy

## Currencies (VERIFIED)
| Currency | Sources | Sinks |
|---|---|---|
| **Gold** (item 19) | NPC shop sales (`BaseValue`), player-market sales (1 % tax), boss/monster drops, gathering by-products, quests, raids, trickery potion | 49 upgrades (825 M), housing 38 M, bank space 265 M, capes, NPC shop (gear, seeds, cosmetics up to 250 M), carpentry/invocation task costs, premium unlock 1 M, clan house up to 500 M, clan creation 10 k |
| **Clan credits** | 16/task, 4/minigame, 12/boss kill, refinements, chests, clan quests (credit classes 5 ranges), Clan Cup | 21 clan upgrades, clan house (100 → 250 k) |
| Exterminating points | assignments (5–30 pts) | 5 shop unlocks |
| Skilling tickets / minigame points | events (`ClanSkillingTicketRules`) | event loot tables (6 rewards max/event) |
| Holiday currencies | drops during 5 seasonal events, 1 per 1 M gold value | event shops |
| Tokens (premium, inventory, vault, questing, exterminating, auto-raid, rename, boss hunter, prestige) | IAP or player market | consumed on use |

## Player market (VERIFIED settings)
Seller tax 1 %, 3 offer slots free / 6 premium, per-item `PlayerMarketBuyLimit`, untradeable and clan-bound flags, account-age gate for RMT-prone items (0 h currently), public price/volume API (1d/7d/30d/1y history). Price discovery is player-driven; NPC `BaseValue` is the floor. This is the game's main economic engine and the reason server authority matters.

## Price structure of content (from tables)
- Gathering outputs are worth 6–25 gold at low tiers, ~100–200 at L90, special tiers (ignis logs, sea serpent) 150–500 with 60× longer timers → gold/h from pure gathering stays in the 5–20 k range; the design pushes gold into **processing + market** and **bossing** (loot EV 14–31 k/kill for valley bosses vs 50–800 regular).
- Processing chains: e.g. plank = log + gold; bars = ore(s); armour = bars ×2–6; food heals 2–24 HP; potions 10 ingredients + base.
- Upgrade pricing follows ~×2–3 per tier (100 k → 25 M over 5 tiers), with the bank-space ladder (190 tiers, 5 416 → 10.4 M) as a smooth continuous sink.

## Sinks vs inflation
Gold enters from NPC sales (unbounded) and leaves through fixed-price upgrades/houses/capes and the 1 % market tax. Long-run inflation risk is real (unbounded NPC sell + market), mitigated by extremely large late sinks (clan house T6 500 M, Lil' swagger 250 M, 825 M dealership) and by premium/tokens being tradeable (gold → premium converts whales' money into player gold via the market, like OSRS bonds). ECONOMY-LEVEL design: inflation is accepted and absorbed by prestige sinks rather than taxed.

## Monetization (VERIFIED from settings + store)
Free-to-play. IAP: premium membership (1 month / permanent items 336/337; also buyable in-game for 1 M gold), inventory space (+30 per purchase, max 300), clan vault space (+4, max 200; 80 ironman), minigame/gemstone/credit boosts (24 h/12 h/72 h), questing/exterminating/auto-raid/rename tokens, cosmetics. Ads: up to 4/day, +30 % XP for 2 h each, 2 h cooldown (mobile). No loot boxes. Premium's gameplay effects: +6 h offline cap, +25 % clan credits, 6 market slots, 3 skills beyond L30, 3 task groups. Verdict: convenience/time-saver model with pay-for-breadth (skill caps), with the gold-buyable premium as the pressure valve.
