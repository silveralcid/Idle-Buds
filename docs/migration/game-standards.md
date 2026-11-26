# Game development standards migration

**Status:** transferred engineering guidance; no gameplay implementation or design promotion. Imported during consolidation on 2026-11-25 (America/New_York).

## Source selection

Source repository: [silveralcid/template-bevy-starter](https://github.com/silveralcid/template-bevy-starter).

Selected branch: `main`, commit [`a3ed97e9428fab65f09471d10a91489ed8b8516e`](https://github.com/silveralcid/template-bevy-starter/commit/a3ed97e9428fab65f09471d10a91489ed8b8516e), containing merged [PR #2](https://github.com/silveralcid/template-bevy-starter/pull/2). The other inspected branch tip, `5ece9617f1f20b9a3427e12fad55e83b3de24dad`, is zero commits ahead and one behind main. No unmerged addition required separate adoption. These source documents were read from the pinned snapshot; the source repository was not modified.

Original starter additions offer MIT or Apache-2.0 at the recipient's choice. These documentation adaptations use the MIT option; its complete notice is preserved in [bevy-starter-MIT.txt](../reference/licenses/bevy-starter-MIT.txt). This does not grant rights to unrelated research or third-party game material.

## Source-to-destination matrix

All source paths below refer to the selected commit. The destination text is adapted to Idle Buds rather than a verbatim replacement for its approved design.

| Source paths | Useful material retained | Destination |
| --- | --- | --- |
| `docs/game/mvp-sop.md`; `AGENTS.md` | Bounded approved slice, observable acceptance, actual play, focused repair, explicit completion and resumption | [Development lifecycle](../game/development-lifecycle.md) |
| `docs/game/testing.md`; `docs/game/mvp-sop.md` | Layered claims, deterministic scenarios, real input, stale-build evidence, performance measurement limits | [Game testing](../game/testing.md) |
| `docs/game/runtime.md`; `docs/architecture/OVERVIEW.md` | Controlled rules, seeds/content versions, validated saves, truthful persistence and browser lifecycle | [Assets and saves](../game/assets-and-saves.md), [testing](../game/testing.md) |
| `docs/game/development.md`; `NOTICE.md`; `LICENSE-MIT` | Local asset paths, complete packaging, lockfiles, load failures and retained rights notices | [Assets and saves](../game/assets-and-saves.md), [release preparation](../game/release.md), MIT notice |
| `docs/game/agents.md`; `AGENTS.md` | Thin agent guidance, scoped ownership, current evidence, no model/service dependency for ordinary development | [Development lifecycle](../game/development-lifecycle.md), linked universal workflows |
| `docs/game/ci.md` | Bounded checks, accurate local/hosted distinctions, candidate-specific evidence and reviewable packaging | [Release preparation](../game/release.md) |
| `docs/adr/0001-small-browser-mvp-factory.md`; `docs/game/future-genres.md`; `README.md` | Reviewed to distinguish transferable principles from source-specific architecture and speculative scope | Exclusions below; no Idle Buds feature approval |

## Deliberate exclusions

- Rust, Bevy, Cargo, engine plugins, native/WASM build commands, renderer choices, language versions, source archetypes and bundled visuals/fonts. Idle Buds remains a web-stack project.
- MVP factory/generator, `tools/mvp.py` contract state machine, MCP server, upstream-sync automation, session hooks and a universal genre framework. Existing project workflows suffice.
- The starter's fixed tick rate, save byte limit, mechanic/entity/scene counts, session duration, 90-minute budget and verification-attempt cap. These are source project decisions, not Idle Buds requirements.
- The starter's no-offline-earnings behavior, pause/resume mechanics, example currencies, combat rules, creature generation, controls and progression goals. Current Idle Buds approved design owns these topics.
- The source-specific prohibition on GitHub Actions/dependency bots. This mission explicitly asks for applicable build and validation foundations; Idle Buds uses its own bounded configuration and authorization.
- Planned genres, proposed modules and speculative product systems. An interesting reference remains research unless explicitly promoted through the Idea Incubator workflow.
- Assertions that source-project tests, hosted CI, platform support, human playtesting or release evidence establish anything about Idle Buds. Only checks actually run against Idle Buds support those claims.

The four active game guides add game-specific interpretation and link to the universal standards rather than duplicating their detailed policy. They do not change approved design, release scope or implementation authorization.
