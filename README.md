# Idle Buds

Idle Buds is an idle-first creature-collection MMO concept built around progression at your own pace, meaningful creatures, and a shared player economy and community. This repository is the project's **single source of truth** for design, engineering, research and development.

**Current state:** consolidated project knowledge and a minimal React/TypeScript/Vite development foundation. Gameplay has not been implemented by this migration. No application has been deployed. The [current scope and approvals](docs/design/AUTHORITY.md) preserve the BEAT BAES gate and the owner's limited consolidation exception.

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

An approved design decision is not automatically release scope or permission to implement. Research, prototypes, legacy code and art references do not become requirements through migration. No final Current Release Specification is present yet.

## Develop locally

Use Node.js 24 and npm. Python 3.11+ is required for repository validation only.

```sh
npm ci
npm run dev
```

Vite prints the localhost address. The page is a neutral development shell. [Development setup](docs/engineering/DEVELOPMENT.md) includes browser prerequisites and the full command reference.

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

Keep actual check commands registered in [.repo/project.json](.repo/project.json). Test results apply to the source and environment exercised. Foundation/browser checks do not prove gameplay, multiplayer, platform compatibility or subjective fun.

## Repository map

| Path | Purpose |
|---|---|
| `src/` | Browser application; documented homes for future game rules and data |
| `public/` | Only rights-cleared production assets; no reference imports |
| `server/` | Documented boundary for the future authoritative backend |
| `tests/e2e/` | Browser checks of built output |
| `docs/design/`, `docs/project/` | Canonical design, governance and scope |
| `docs/game/`, `docs/engineering/` | Game and engineering standards |
| `docs/research/`, `docs/reference/` | Attributed, non-authoritative research and visual references |
| `docs/migration/`, `docs/archive/` | Source manifests, historical snapshots and recovery instructions |
| `tools/`, `.repo/` | Reused repository validation and selective context tooling |
| `.agents/`, `.codex/`, `.claude/` | Shared AI workflows and thin provider adapters |
| `.github/` | Review templates and bounded validation workflows |

[Architecture](docs/architecture/OVERVIEW.md) records the approved web stack. The future initial backend is a single Node/TypeScript/Fastify service using PostgreSQL. No server, database, auth system, queue, infrastructure provider or native shell is provisioned by this foundation. Tauri remains a later candidate. No Rust or Bevy implementation is inherited.

## Standards and workflow

Follow [code quality](docs/engineering/CODE-QUALITY.md), [risk-based testing](docs/engineering/TESTING.md), [game development](docs/game/development-lifecycle.md), [asset/save safety](docs/game/assets-and-saves.md), and [delivery](docs/agents/delivery.md). Reuse before building, keep scope small, fix concrete failures, and update the existing owner. Use isolated branches and pull requests; respect protections and retain exact verification evidence.

The foundation needs no secrets. Never expose credentials through `VITE_*` variables. Reference art, third-party research and archived source stay outside runtime/build inputs. Review rights before using any material in a production game.

## Sources and recovery

The [Drive migration](docs/migration/google-drive.md) accounts for all five source files and preserves original export bytes. Google Drive remains an untouched historical backup. [Universal standards](docs/migration/universal-standards.md) and [game standards](docs/migration/game-standards.md) record adopted branches, commits and deliberate exclusions. The [research migration](docs/migration/research.md) accounts for 185 permitted files from eleven game studies and seven earlier engineering topics, including source corrections and review limits.

The [legacy archive](docs/archive/README.md) preserves all 50 original branch tips. Main's historical implementation is available at `archive/legacy-2026-11-25`; newer combat work and divergent tips have named archive refs. History has not been rewritten.

## Next milestone

Use the existing design to approve one short MVP boundary and measurable acceptance plan, confirm the gameplay gate, then authorize the first integrated onboarding slice. Do not restart exhaustive design interviews. Incremental work should lead toward the small complete ecosystem required for holistic product validation. [The next-milestone note](docs/project/NEXT-MILESTONE.md) preserves the exact boundary between that recommendation and an authorized assignment.
