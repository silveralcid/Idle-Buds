> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/super-auto-pets/steam-2026-11-25/economy/ECONOMY.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Super Auto Pets — Economy

## In-run economy (closed, per-turn reset)
- Income: 10 gold per turn (resets; does not bank), plus ability gold (Pig sells for more, Gold archetype, Grapes perk +1, Rice/Golden Egg constants, `MaxGoldGain` cap) and free rolls (Bigfoot/Marmoset, `MaxFreeRolls`).
- Prices: pet 3, food 3, Sleeping Pill / Strawberry Jam 1, roll 1, freeze 0, sell refund = level (1–3). Discount effects exist (`EffectDiscountMinion/Spell`, `EffectSetPrice`).
- The only "sink" is the turn boundary (unspent gold is lost except via abilities like Trumpets/FutureGold), so every turn is a knapsack: 10 gold across buy/level/roll/food. Rolling is the information purchase; freezing is the carry.

## Real-money economy
- Free: Turtle pack, Weekly pack, Arena/Versus/With Friends. Paid packs $5–$10 (Puppy, Star, Golden, Unicorn, Danger; Mini packs 1–3, $5) — content, not power, since all players in a lobby use the same pack rules (static packs play within pack unless "play against all packs").
- Gifting flow (`CheckGiftable/GiveGift/ClaimGift` DTOs), Steam + mobile receipt validation, browser payment DTOs, a subscription surface, cosmetics shop (139 cosmetic strings), surveys.
- No consumables, no gacha, no energy: a one-time-purchase model layered on a free core — the key reason the game reads as fair and why custom packs (which require owning the source packs) are the real upsell.
