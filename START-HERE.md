# Start here

Idle Buds has an implemented local multiplayer game candidate. The [implementation report](docs/evidence/mvp-implementation-2026-11-26.md) owns completed work, observed tests and gaps; do not infer full acceptance from the presence of code.

1. Read [AGENTS](AGENTS.md), [authority/scope](docs/design/AUTHORITY.md) and the [Current Release Specification](docs/project/CURRENT-RELEASE.md). The owner explicitly authorized Blueprint v2 implementation and merge on November 26, 2026.
2. Inspect current Git state and the [Miyu continuation](docs/project/MIYU-HANDOFF.md). Read only the relevant packet and canonical design section through [the index](docs/INDEX.md).
3. Install using [development setup](docs/engineering/DEVELOPMENT.md). `npm ci` then `npm run play` starts the real local game. `npm run playtest` provides isolated progressed accounts for multiplayer.
4. Do not stop after planning. Continue the smallest unfinished accepted behavior on an isolated branch. Run focused checks while editing, then relevant integration/browser/repository checks. Preserve existing progress and unrelated work.
5. Record exact source, actual checks, unrun coverage and next action. Never label a human experiment or deployment complete without observed evidence.

The repository is the source of truth. Drive exports, upstream research and legacy branches remain historical references; do not reimport them as runtime dependencies. No public deployment, paid service or extra content is implicit in the implementation authorization.
