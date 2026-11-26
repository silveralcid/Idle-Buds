# Experience MVP implementation, November 26, 2026

**Status:** IMPLEMENTED; final verification and merge status are recorded in [PR #9](https://github.com/silveralcid/Idle-Buds/pull/9)
**Owner:** integration lead (root)
**Base:** `main` at `742bb33`; branch `feat/experience-mvp`
**Authorization:** Owner explicitly requested the agreed playtest improvements in one PR, no issue creation, and authorized merge after verification. This supersedes the earlier planning-only boundary for this scope.

## Accepted outcome

Direct, continuous activities with automatic eligible unlocks and immediate replacement; one independent Bud per production skill; shared item slots with unlimited stacks and lossless pending rewards; compact reference-informed production and inventory; Neon Frontier shell with reorderable/collapsible navigation, bottom chat, menu and truthful server-save status; observable authoritative combat with local playback controls; responsive and controller-operable interactions. Preserve existing accounts and local/LAN startup.

No new hosting, content expansion, independent Bud skill XP, equipment loadout system, balance overhaul or new issues. Economic slot values and unlimited-stack effects remain provisional and recorded for later evaluation.

## Ownership and order

| Lane | Exclusive ownership | Dependencies | Exit evidence | Status |
| --- | --- | --- | --- | --- |
| Rules and inventory | Production/state/storage/migration rules, market transactions, related unit/integration tests | existing game | conservation, migration, switching, blocked recovery tests | Complete |
| Production UI | activities, inventory/outpost, collection, production CSS, display names | rules contract | compact resource and inventory flows | Complete |
| Combat | resolver timeline/snapshots, encounters, PvP, combat UI and replay | existing resolver | same outcome, typed replay, legacy result handling | Complete |
| Integration | app shell, navigation, input, chat, canonical docs, browser tests | all lanes | lint/types/build, real DB/browser, source review | Implemented; exact final checks and merge in PR #9 |

All writers share this isolated checkout with disjoint file ownership. Combat and rules share only explicitly separated type declarations. Integration owns the single commit series and PR. No separate branch PRs or tracker issues.

## Contracts and verification

- Server owns progression and saves. Presentation preferences may persist per account in browser storage; they contain no gameplay state.
- A valid new activity atomically replaces that worker's previous work. Incomplete work is discarded; already earned output survives.
- Blocked activities recover when inputs/space return; user pause/stop does not resume itself.
- One bounded pending reward per worker lane prevents rerolls or reward loss through reassignment.
- Fungible stacks share one slot per item type. Unequipped gear uses individual slots; equipped gear, Buds and eggs are separate. Open sell escrow reserves return capacity.
- Combat playback consumes authoritative immutable snapshots/events. Controls never execute rewards or alter battle cadence.
- Run focused regression tests during edits, then registered lint, typecheck, full real PostgreSQL/browser suite, build, save restore and repository checks. Inspect desktop/mobile screenshots and actual keyboard/controller event paths.
- Physical phone and physical controller acceptance cannot be represented by viewport or synthetic input tests. Record this distinction explicitly.

## Recovery

Keep legacy saves readable via an explicit migration. Preserve assets even above new capacity; do not wipe to repair migration. Remove remote-work restriction and compensate existing purchases once. Preserve raw local evidence in ignored `.repo-local/`. Respect branch protections and merge only the verified head after reviewing hosted checks.

## Current position

Implementation, reference inspection and the legacy-queue compatibility regression are complete. Hosted verification also identified a pre-existing LAN shutdown defect; the same PR repairs database lifecycle ownership and server IPC cleanup. The [experience evidence report](../../evidence/experience-mvp-2026-11-26.md) records observed results and physical-device limits. Use PR #9 for the exact final head/base, hosted checks and merge state rather than treating this archived execution plan as a live status ledger. The next product step is the owner's physical-device playtest under [Next Milestone](../../project/NEXT-MILESTONE.md).
