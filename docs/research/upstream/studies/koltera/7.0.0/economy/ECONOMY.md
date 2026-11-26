> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/economy/ECONOMY.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera — Economy Analysis

## Currencies and materials (VERIFIED)

| Currency | Sources | Sinks | Notes |
|---|---|---|---|
| Coins (fablecoins) | mining auto-sell/sell, gathering (40 % roll, `2^loc/3` scale), reactor after 4 summons, offline estimate | **rock unlocks (10.88 M total)**, breeding, healing, gardening plants | no inflation control; no decay; uncapped offline |
| Minerals ×11 | mining (hoard mode), gathering, Geologist | augmenting (cubic), selling → coins | dual-use creates the game's key tension |
| Legacy | 1 per trainer level | 23 upgrades (linear cost) | ~100 by L100; 1 526 to max all |
| Lumin | gardening plants | 4 legendary summons (1e7/5e7/5e8/1e10), 0.1 % tax on plant purchases | capped at next summon cost |
| Soulstones (per species) | 1 per kill (+ legendary roll) | summon at 100/500/2 500/6 000/12 000 | deterministic pity; 12 000 kills for one Legendary |
| Explore resources (7 woods/shrooms/flora, 4 role Gems, 4 role Potions, Mana Potion) | gathering 5 % roll, potion crafting | staff craft 100, staff upgrades 10(L+1)², potions 10:1 → 4:1, spells 2/5/20 (auto 2/15), gene mod ceil(gene/20) | the slowest, most contested resource chain |
| Creatures themselves | trader, breeding, augmenting, combiner, soulstones, magic summon, gardening | release, trading, combiner (5→1) | storage 25 + 125/level |

## Flow diagram

```
 time ──► Mining ──► coins ──► Gardening plants ──► Lumin ──► Legendaries ──┐
             │                 └─► Breeding ──► creatures ─────────────────┤
             └─► minerals ──► Augmenting ──► creatures ────────────────────┤
 time ──► Training ──► XP, soulstones ──► creatures ───────────────────────┤──► Collection Log (492)
 time ──► Exploring ──► steps (gates), coins, minerals, resources ─► Magic ─┤
                                                        └─ staffs (+% to all above), potions → gene mod / summon ┘
```

## Pricing structure

- Rock unlocks: 500 → 5 M coins, ×2–7 per step; the ladder paces the first ~20–40 h and gates both mining XP tiers and augment availability.
- Rocks: `Value ≈ 0.08–0.12 × Health` → price is tied to difficulty, so **no rock is a money exploit**; `XP/Value` falls from 0.53 (Topaz) to 0.13 (Harmonium), i.e. low rocks are XP-efficient, high rocks are coin-efficient only via the ×2 augment match.
- Breeding: rarity base ×2 per tier, times augment multipliers 1.25…6 **per parent** (multiplicative) — Harmonium×Harmonium is 36× base. Punishes breeding high-augment lines, pushing players to breed *then* augment (which costs 25 % genetics) — a real strategic trade.
- Augmenting: cubic in rock tier × linear in rarity → spending is back-loaded onto the top three rocks (Emberite/Stormheart/Harmonium are 58 % of the 1.07 M total).
- Gardening: cost ×3/tier, ×1.15/level; worth ×5/tier → classic "buy the highest tier you can afford" incremental ladder with no reason to revisit low tiers.
- Healing 10 coins/HP with up to −80 % → scales with level² roughly (HP ∝ L, damage taken ∝ L); becomes material at L80+ when fights cost ~1 k.

## Bottlenecks (ranked by simulated time)

1. **Explore resources → Magic** (5 % of gather completions, split across 2–4 items/location, 10:1 potion ratios): tens of hours for meaningful staff levels or a handful of Mana Potions. This also gates Gene Mod (the only deterministic perfect-genetics path) and Magic Summons (the only *targeted* diary filler).
2. **Lumin 10 B** (4th legendary): ~1–10 B coins of plants.
3. **Augment minerals 1.07 M** with top rocks at 4–6 % damage/swing.
4. **Exploration 102 350 steps** (geometric).
5. **Vibrancy 0 for all 492** (Master Completionist): per creation P = 1/16, breeding 10 % → brute RNG.

## Inflation / sink balance

Coins have four sinks: rock unlocks (a fixed 10.88 M ladder, mid-game), breeding (front-loaded), healing (late), gardening (back-loaded). Between ~20 h and the gardening push, coins accumulate with little use → achievement thresholds (1 M, 1 B) are the de-facto pacing. There is no decay, no tax, no market (the `priceChange` market code is dead). The economy is therefore **monotonic and deflation-free**, which is simple and transparent but leaves a dead zone mid-game.

## Monetization

Free-to-play with **zero in-game monetization**: no IAP, no ads, no timers purchasable. A Supporter Pack DLC check exists but is commented out and `supporterPack` is always `false`. Engagement mechanics (offline bonus, hourly trader, achievements) are retention-oriented, not spend-oriented.
