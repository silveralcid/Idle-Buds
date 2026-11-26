> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/super-auto-pets/steam-2026-11-25/user-experience/UX_ANALYSIS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Super Auto Pets — UX (STRONG INFERENCE from client structure + public reception)
- One screen per phase; drag-and-drop shop with freeze; battle is a watched replay of the event stream with per-event animations (`Board.RenderSystems`, 74 systems) and emoji-style art — readable at a glance, which is what made the game a streaming/mobile hit.
- Ability text is uniform and short (generated), icons for attack/health/gold/perk; tooltips per trigger/archetype; hard-mode toys and custom-pack editors add complexity for veterans without touching the base screen.
- Asynchronous Arena removes waiting; versus adds 90 s timers; async 24 h versus exists for the mobile audience.
- Feedback juice: DOTween Pro animations, trumpets/mascots/entrances as cosmetic self-expression, achievements per pet.
- Friction: RNG in shop (mitigated by freeze/rolls; there is no duplicate penalty in the shipped sampler, see `mathematics/DECOMPILED_RULES.md`), opacity of trigger order for new players, 850-pet knowledge load across packs (mitigated by the pack system and the wiki).
