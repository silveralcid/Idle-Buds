# Idle Buds

Idle Buds is an idle-first creature-collection multiplayer game built around progression at your own pace, meaningful creatures, and a shared player economy and community. This repository is the project's **single source of truth** for design, engineering, research and development.

**Current state:** local multiplayer MVP implementation on React/TypeScript/Vite, Fastify and PostgreSQL. The [implementation report](docs/evidence/mvp-implementation-2026-11-26.md) separates working systems, actual verification and unfinished playtest gates. No public game has been deployed. The owner authorized this MVP implementation and merge on November 26, 2026; see [scope and approvals](docs/design/AUTHORITY.md).

## Start with the right authority

| Need | Read |
|---|---|
| Project governance and permitted work | [Constitution](docs/project/CONSTITUTION.md) and [authority/scope](docs/design/AUTHORITY.md) |
| Approved design, provisional choices and open questions | [Game Design Bible](docs/design/design-bible.md) |
| New ideas, qualification, holds and promotions | [Idea Incubator](docs/design/idea-incubator.md) |
| Current development priorities | [Next milestone](docs/project/NEXT-MILESTONE.md) |
| Imported game and engineering findings | [Research snapshot](docs/research/upstream/README.md) |
| Developer or AI agent onboarding | [START-HERE](START-HERE.md) and [AGENTS](AGENTS.md) |
| All topic owners | [Documentation index](docs/INDEX.md) |

An approved design decision is not automatically release scope or permission to implement. Research, prototypes, legacy code and art references do not become requirements through migration. The [Current Release Specification](docs/project/CURRENT-RELEASE.md) owns the bounded local/private MVP.

## Develop locally

Use Node.js 24 and npm. Python 3.11+ is required for repository validation only.

```sh
npm ci
npm run play
```

Open `http://127.0.0.1:3000`. Register a fresh Tender to gather, craft, catch and deploy your first Bud.

For trusted home-network play, run `npm run play:lan` instead. Open a printed private IPv4 HTTP URL on another device on the same network, register without an invite or sign in, and play the same persistent development world. Stop with Ctrl+C. No VPN or HTTPS is needed; do not expose this mode to the internet. [LAN setup and troubleshooting](docs/engineering/DEVELOPMENT.md#trusted-home-lan-playtesting).

 `npm run playtest` starts a separate local fixture database with progressed multiplayer accounts. [Development setup](docs/engineering/DEVELOPMENT.md) includes browser prerequisites and the full command reference.

```sh
npm run lint
npm run typecheck
npm run build
npm run setup:browser
npm test
python3 tools/repo.py check --tests
python3 tools/repo.py docs budget --strict
python3 tools/validate_migration.py
npm audit --audit-level=high
```

Keep actual check commands registered in [.repo/project.json](.repo/project.json). Test results apply to the source and environment exercised. Checks establish only the behavior actually exercised. Human enjoyment, physical-device compatibility and live economy balance need their own evidence.

## Repository map

| Path | Purpose |
|---|---|
| `src/` | Browser application, shared deterministic game rules and original data |
| `public/` | Only rights-cleared production assets; no reference imports |
| `server/` | Authoritative account, game, economy, community and ranked server |
| `tests/` | Rule tests, real PostgreSQL integration and browser gameplay |
| `docs/design/`, `docs/project/` | Canonical design, governance and scope |
| `docs/game/`, `docs/engineering/` | Game and engineering standards |
| `docs/research/`, `docs/reference/` | Attributed, non-authoritative research and visual references |
| `docs/migration/`, `docs/archive/` | Source manifests, historical snapshots and recovery instructions |
| `tools/`, `.repo/` | Reused repository validation and selective context tooling |
| `.agents/`, `.codex/`, `.claude/` | Shared AI workflows and thin provider adapters |
| `.github/` | Review templates and bounded validation workflows |

[Architecture](docs/architecture/OVERVIEW.md) records one browser app, one Fastify service, one PostgreSQL database and one pure rules implementation. No Redis, microservices, ECS, native shell or paid provider is required. Local PostgreSQL starts from a development-only package when an existing database is not supplied.

## Standards and workflow

Follow [code quality](docs/engineering/CODE-QUALITY.md), [risk-based testing](docs/engineering/TESTING.md), [game development](docs/game/development-lifecycle.md), [asset/save safety](docs/game/assets-and-saves.md), and [delivery](docs/agents/delivery.md). Reuse before building, keep scope small, fix concrete failures, and update the existing owner. Use isolated branches and pull requests; respect protections and retain exact verification evidence.

Server credentials and local database state stay in ignored environment/local files. Never expose credentials through `VITE_*` variables. Reference art, third-party research and archived source stay outside runtime/build inputs. Review rights before using any material in a production game.

## Sources and recovery

The [Drive migration](docs/migration/google-drive.md) accounts for all five source files and preserves original export bytes. Google Drive remains an untouched historical backup. [Universal standards](docs/migration/universal-standards.md) and [game standards](docs/migration/game-standards.md) record adopted branches, commits and deliberate exclusions. The [research migration](docs/migration/research.md) accounts for 185 permitted files from eleven game studies and seven earlier engineering topics, including source corrections and review limits.

The [legacy archive](docs/archive/README.md) preserves all 50 original branch tips. Main's historical implementation is available at `archive/legacy-2026-11-25`; newer combat work and divergent tips have named archive refs. History has not been rewritten.

## Continue implementation and playtesting

Read [Miyu handoff](docs/project/MIYU-HANDOFF.md), the [implementation report](docs/evidence/mvp-implementation-2026-11-26.md) and [next milestone](docs/project/NEXT-MILESTONE.md). Continue from verified current main; do not restart planning or replace the application. Remaining work must preserve the fixed Blueprint v2 scope and pass/fail gates. Use Sol at Extra High effort on Cloud Work or the server rig as requested by the owner. Public deployment and commercial release remain separate decisions.
