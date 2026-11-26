> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/koltera/7.0.0/user-experience/UX_ANALYSIS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Koltera — User Experience Analysis

Evidence: `Views/**` source (13 k lines), Steam reviews (secondary). Tier: VERIFIED for structure, STRONG INFERENCE for felt experience (no live play session was run in this investigation).

## Information architecture
Left sidebar with 3 permanent groups: *Resources & Training* (Mining, Training, Exploring, Gardening, Soulstones, Magic, Legacy Upgrades), *Creatures & Info* (Augmenting, Trading, Breeding, Combiner, Gene Modification, Your Creatures, Collection Log), *Codex* (Creature, Spirit) + Options. Locked items display their requirement as the label ("Trainer Level 5") — a clean, self-explaining unlock tree. A gold "!" marks unlocked-but-unvisited tabs (`visited` flags) → the only onboarding device besides two intro screens (starter choice, specialization).

## Feedback loops
- Numbers update once per second (tick) — progress bars for rocks/explorers/trader are quantized, which reads as "idle-game honest" but lacks juice. Animations can be disabled in options.
- Modal dialogs for high-moment events (summon, offline return, patch notes). `message.success` toasts for automation. Steam achievement pop-ups are the main external reward signal.
- Tooltips (`FableToolTip`) carry most of the teaching: stat breakdowns, formulas in words ("Trainer Level — every time a Fable earns exp, you earn some as well").
- No sound at all (audio output disabled at process level) — a notable omission for reward cadence.

## Creature management UX
`FableSelector` is the workhorse: modal grid, sort by species/stat/genetics/vibrancy/level, filter by augment, items-per-page 24 default, favorites, nicknames, "release" with confirm option. `Inspector` shows per-stat genetics and totals; `revealedStats` flags exist but are unused (no hidden-IV mechanic shipped). Collection Log is a 41×12 grid with grayscale sprites by best vibrancy → an at-a-glance completion heatmap, the strongest motivational screen in the game.

## Friction points (STRONG INFERENCE)
1. Breeding/augmenting are per-pair/per-creature clicks with no batching; late-game diary filling means hundreds of manual operations.
2. Collection cap forces release decisions; combining 5→1 is the only bulk disposal.
3. Fixed 1250×700 layouts with inline-styled widths (700 px panels) — no scaling for 4K or Steam Deck without OS scaling.
4. Resource names (Orewood, Learnspore Shroom, Helix Stone…) and potion→gene mappings are only discoverable by reading the Magic tab; no quest/hint system.
5. Inactivity reload every 60 min wipes transient UI state (open modals, selection) — a technical fix visible to the player.

## Accessibility
Alt text on most images (surprisingly consistent), keyboard Enter deliberately suppressed on buttons, dark theme only, color used as the sole encoding for rarity buttons, grayscale filter as the vibrancy encoding (fails for low-contrast sprites). No font scaling.
