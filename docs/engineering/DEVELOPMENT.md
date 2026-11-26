# Local development and checks

## Prerequisites

Use Node.js 24 (the repository version file is authoritative), npm and Git. Python 3.11+ runs the inherited repository tools. No cloud account, database, API key, Rust toolchain or Docker is needed for the foundation. Review package scripts before installation; dependencies are exact in the committed lockfile.

```sh
npm ci
npm run dev
```

Open the loopback URL printed by Vite. The page is a non-game development shell. It contains no gameplay, persistence or connected backend. The [architecture overview](../architecture/OVERVIEW.md) explains approved future boundaries.

## Verification

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

Use `py -3` in place of `python3` on Windows if needed. Linux browser dependencies may be needed on a new machine; use that machine's approved setup process. `npm test` builds, then serves and checks the production output through localhost. `npm run setup:browser` keeps downloaded browsers in ignored `.repo-local/browsers`. `PLAYWRIGHT_EXECUTABLE_PATH` can select an installed compatible browser when the normal CDN is unavailable; record that qualification environment. Browser installation is a development setup step, not a runtime requirement.

The browser suite verifies this foundation only. There are no game-rule unit tests or database integration tests yet because those behaviors are absent. Add Vitest with the first real deterministic game rules and transaction/concurrency coverage with the first authoritative persistence feature. Do not report the Python helper suite as gameplay tests.

The repository-health and web-validation GitHub workflows run bounded checks without deployments, stored credentials or paid model calls. A workflow file is not evidence that it ran successfully; inspect the actual head commit's jobs.

## Environment and dependencies

The current app needs no environment variables. `.env.example` records that fact. Keep real `.env*` files and credentials ignored. Every `VITE_*` value is public in the browser bundle; server secrets must never use that prefix or enter frontend imports. Add real environment names and validation alongside their first owning integration.

Use one npm lockfile and `npm ci` for reproduction. Review direct/transitive upgrades, supported runtime requirements, license notices, audit output and affected behavior. Do not use `npm audit fix --force` or broaden the stack automatically. Prefer an applicable patch, then rerun affected checks. Dependency tools are development dependencies unless runtime use is demonstrated.

## Production preparation

`npm run build` creates `dist/`; `npm run preview` serves the result locally. Only that reviewed build output is a potential frontend deployment artifact. Never deploy the repository root, Drive exports, art references, research, legacy snapshots or private evidence. No hosting provider or deployment is configured, and this shell is not a game release.

Before a real release, follow [game release preparation](../game/release.md): approve scope, verify actual server/persistence boundaries, review asset/dependency rights, validate browser inputs and save migrations, inspect the exact artifact, establish backup/rollback procedures and obtain applicable release/deployment authorization. Version `0.0.0` denotes this unreleased foundation, not an announced game version.

`publicDir` is disabled until an approved feature needs public assets. Existing `public/` guidance and reference materials are not copied into `dist/`. Add approved assets through explicit imports or enable the public directory only with rights-reviewed contents.
