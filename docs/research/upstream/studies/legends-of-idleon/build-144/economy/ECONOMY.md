> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/legends-of-idleon/build-144/economy/ECONOMY.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Economy

Free-to-play online idle game with a premium currency and many purchasable bundles. What is below is read from the client; prices, sales and server-side rules were not observed.

## Currencies and flows (VERIFIED in code and data)
| Currency | Sources | Sinks |
|---|---|---|
| Coins (money; 30 display tiers from copper to the top coin glyphs, `CoinStrings`) | monster drops (× a "MonsterCash" multiplier of about 20 factors, incl. bundle `bun_y` +250 %), selling items (2 475 of 2 480 items have a sell price above 0), quests, AFK | stamps (geometric coin costs, FORMULAS #16), shops (9 town shops, `ShopNames`), bribes (41), anvil, upgrades across systems |
| Materials (ores, logs, fish, bugs, critters, souls, monster drops) | skills and kills, active and AFK | crafting, stamps' material levels, bubbles and vials, construction, cooking, statues, refinery |
| Gems (premium) | real-money purchases granted by the server (`ServerGems`, client adds the difference to `GemsOwned`), some achievements and events | gem shop (84 distinct `GemItemsPurchased` slots are read by formulas; its pages live in scene code and were not enumerated, so their contents are not listed here), the cavern premium shop (`MTXinfo`, 144 items: time skips, permanent cavern and villager boosts) |
| Bundles | real-money purchases; the server sets flags `bun_a`…`bun_z`, `bon_a`…`bon_y`, `ban_a`…`ban_o` (about 65) and the client grants items once | permanent effects in formulas, e.g. `bon_a` ×1.5 to the final damage multiplier, `bun_u` +30 to the AFK-gain pool, `bun_y` +250 % monster coins |
| Time candy (items, 10 types) | gem shop, achievements, bundles, events | instant AFK time for the current activity |
| Companion boxes and raffle tickets | server callables (`buyCompanionBox`, `freeCompanionBox`, daily free box timers) | 179 companions with bonuses; trades between players (`sendTradeOffer` …) |
| Guild points, tournament and raid rewards | server-side | guild bonuses (18), tournament shop |

## Observations
- **Monetisation reaches into the formulas.** Several bundles are permanent multipliers in core formulas (damage, AFK rate, coins), so spending changes progression speed directly, not only convenience. This is a design choice the player-facing text calls bundles; the code shows exactly where each lands (VERIFIED for the three cited; the other ~60 flags not traced individually).
- **Space as a lever.** Inventory bags (102 carry-bag items), storage chests and character slots are recurring purchases or unlocks, and inventory pressure is a constant mid-game constraint.
- **Who holds the money.** The server grants gems and bundles; the client stores and spends them and writes the result into its own save document. Whether server rules re-check spending was not visible (UNKNOWN).
- **Live economy.** Server variables switch gem bundle offers (`GemBundleOffer`, `GemBundleOffer2/3`, `GemPopupBundle`), limited shop rotations (`LtdShopNum`), happy hours and events without a client update.
- **No player market for items in the base loop.** Items move between a player's own characters (storage chest, shared bank) and to NPC shops; player-to-player trades exist for companions only, through server callables (STRONG INFERENCE from the callable names).
