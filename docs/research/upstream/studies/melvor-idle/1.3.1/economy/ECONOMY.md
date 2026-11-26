> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/melvor-idle/1.3.1/economy/ECONOMY.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Economy

Single-player and closed: no player market or player trading (VERIFIED); Township has an NPC Trader / Trading Post (`township.js` 3040–3078). There is no premium currency. The paid layer, from client code: in-app product ids for the full game (US$9.99, `removeAds`), three expansions (US$4.99 each) and an Expanded Edition bundle (US$14.99) (`nativeManager.js` 22–45); advertising hooks for the free web version (`constants.js` 533, `main.js` 279, `cloudManager.js` 1398–1400); a Patreon check gating test-server access (`cloudManager.js` 1406, 2476–2611).

## Currencies (VERIFIED, data and `currency.js`)
| Currency | Sources | Sinks |
|---|---|---|
| GP | selling items (1 280 of 1 406 items have a sell value; median 250 GP, max 60 M), Thieving NPC drops, monster GP drops, agility obstacle rewards, alt. magic (alchemy spells), township | shop (201 base purchases across Township, skill upgrades, skillcapes, materials, general incl. bank slots and auto-eat, gloves; Slayer and Golbin Raid purchases cost their own currencies), agility obstacles (median 1 M, max 20 M), farming/township upkeep, Adventure-mode skill unlocks (10 000 → 500 M) |
| Slayer coins | slayer tasks and slayer-area kills | slayer shop purchases, slayer area requirements, 16 agility obstacles |
| Raid coins | Golbin Raid | raid shop |
| Mastery tokens / pool XP | per-action token drops | spending pool XP on mastery levels |

## Flows
- **Gathering → artisan → GP or combat**: artisan skills multiply item value (logs → bows; ores → bars → armour) and are where GP is made, but their XP/h is input-bound, so gathering speed and GP purchases of raw inputs are the main levers.
- **Modifiers as the real currency**: agility obstacles, astrology constellations, township, pets, potions and summoning synergies all add modifiers through one modifier system. GP buys many of these (agility), so late GP is converted into global percentages.
- **Bank slots** are a growing sink: 34 GP for the first, 83 031 for the 50th, 2.12 M for the 100th, then 5 M each from slot 119 (37.5 M for the first 100, 509 M for 200).
- **Item charges and consumables** (gloves, potions, runes, arrows, food) create continuous demand for artisan output while playing combat or specific skills.

## Balance notes
1. Sell values span 1 to 60 M GP, so a handful of high-value items (rare drops, top gear) dominate wealth; the rest of the bank is mostly inputs.
2. Because there is no market, prices never react to supply; sinks are fixed prices or fixed price schedules (bank slots and `Linear` shop costs scale with the quantity bought, `shop.js` 598–620) and sources fixed rates, which makes the economy fully calculable.
3. Gamemodes change the economy: Adventure prices skill unlocks (19 steps, 10 000 → 500 M GP) and caps non-combat levels at combat level; Hardcore removes recovery from death, uses a harsher combat triangle and caps purchased bank slots at 88; the speedrun modes are discontinued.
