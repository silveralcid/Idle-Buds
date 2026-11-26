# Local development and verification

## Start a fresh game

Use the pinned Node.js 24/npm runtime and a nonroot account. Python 3.11+ is needed only for repository checks. Review package scripts, then:

```sh
npm ci
npm run play
```

Open `http://127.0.0.1:3000`. Register a username and a password of 12+ characters (at most 72 UTF-8 bytes). The launcher builds the app, starts a project-local **real PostgreSQL** instance, applies versioned migrations and runs Fastify serving the app. Default saves remain under ignored `.repo-local/postgres/`. Stop with Ctrl+C, then use the same command to resume saved accounts. No Docker or cloud service is required. Optional package platform support follows the locked embedded-postgres distribution; the current verification host is Linux x64. Windows/macOS are not automatically qualified by that fact.

The PostgreSQL distribution needs local library symlinks; the reviewed package recreates them through `autoRehydrateSymlinks` on startup. No global database package, OS user or service is installed. The local database listens only on loopback and uses SCRAM authentication with a random local password. A launcher-owned helper keeps the package's global interrupt hooks separate: Ctrl+C closes HTTP first, then the owned database, and reports shutdown completion. A supplied `DATABASE_URL` remains externally owned. Do not copy database files while the database is running.

## Trusted home LAN playtesting

```powershell
npm run play:lan
```

Run this from the checkout on the host. It builds the app, uses the same development database and migrations as `npm run play`, then prints localhost and detected private IPv4 HTTP URLs. Connect your phone, laptop or Steam Deck to the same home network; open the printed URL corresponding to your host's Wi-Fi/Ethernet adapter (on Windows, compare with `ipconfig`). Register a username/password without an invite, or sign in with an existing account. Different accounts can use separate devices/browser profiles. Ctrl+C stops the server and any database it started; restart to resume the same saves.

LAN mode explicitly ignores `HOST`, `ALLOWED_ORIGIN` and `IDLE_BUDS_INVITE` and uses detected exact HTTP origins plus localhost; `PORT` still applies. If using an existing PostgreSQL service, use the same loopback `DATABASE_URL` as normal play and set PostgreSQL `listen_addresses` to loopback only. The embedded database already binds to loopback. LAN mode refuses the disposable fixture database and cannot combine with fixture/reset flags.

If another device cannot connect, verify the host URL works and both devices are on the same trusted network (not an isolated guest Wi-Fi). On Windows, confirm the network profile is Private. If the firewall blocks the default port, run PowerShell as administrator:

```powershell
New-NetFirewallRule -DisplayName "Idle Buds LAN playtest" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private -RemoteAddress LocalSubnet
```

Use the configured port if different. Remove the rule when no longer needed with `Remove-NetFirewallRule -DisplayName "Idle Buds LAN playtest"`. Do not disable the firewall, forward router ports or open PostgreSQL. Guest Wi-Fi/client isolation can prevent peer access even on the same SSID; switch both devices to the trusted home network.

This mode uses unencrypted HTTP on the private network and retains password hashing, sessions and server authority. The seeded fixture commands remain loopback-only. Remote/public deployment retains the existing HTTPS/invite safeguards and is not authorized by LAN mode. Physical Windows/phone compatibility requires testing on those devices. If embedded PostgreSQL cannot initialize on your host, use an existing loopback PostgreSQL development database as described below; do not reset saves to work around a startup error.

## Seeded multiplayer playtest

```sh
npm run playtest
```

This uses a **separate** local `idle_buds_test` database on port 55434. Accounts `alpha` and `beta` have midgame inventories, compatible parents, unlocked zones and formations; `fresh` starts empty. All use the clearly test-only password `Local-playtest-only-2026`. Use separate browser profiles/private windows for simultaneous accounts. The shared server performs real trades, clan changes and ranked battles. Existing fixture progress is preserved on relaunch.

```sh
npm run playtest:reset
```

The reset command explicitly clears only the loopback `idle_buds_test` database, then recreates those fixtures. It refuses other database names or remote hosts. Never use these public fixture credentials for a deployed service. No browser/API endpoint can seed players or skip time.

## Existing PostgreSQL and hot reload

Copy `.env.example` to ignored `.env` only when configuration is needed. Set `DATABASE_URL` to the intended development database. `npm run db:migrate` applies migrations; `npm start` runs the server against an existing migrated database. `npm run play` can also launch with an existing `DATABASE_URL` and will not start a second database. No scripts erase an external database automatically.

For UI hot reload use two terminals: `npm run dev:server` and `npm run dev`. The Vite origin is `http://127.0.0.1:5173`, proxied to Fastify on port 3000. Set `ALLOWED_ORIGIN` to the actual browser origin if customizing it. Default local origins include both standard ports. Every `VITE_*` variable is public: secrets belong only in server environment configuration. Outside the explicit trusted LAN launcher, nonloopback binding requires a private invite and HTTPS origin; this does not itself authorize deployment.

## Verification

```sh
npm run lint
npm run typecheck
npm run setup:browser
npm test
npm run test:restore
npm run experiments
npm run experiments:world
python3 tools/repo.py check --tests
python3 tools/repo.py docs budget --strict
python3 tools/validate_migration.py
npm audit --audit-level=high
```

`npm test` creates a disposable real PostgreSQL cluster, applies migrations, runs Vitest rule/database tests, builds production output and drives that output through Fastify with Playwright at desktop and narrow mobile viewports. It closes/removes its owned database afterward. To use an existing test service, explicitly provide a loopback `DATABASE_URL` named exactly `idle_buds_test`; its test data is disposable. `npm run test:unit`, `npm run test:integration` and `npm run test:browser` select narrower checks. The browser install uses ignored `.repo-local/browsers`; `PLAYWRIGHT_EXECUTABLE_PATH` may select an existing compatible Chromium. Record that environment in test evidence.

`test:restore` creates a fresh disposable cluster, seeds three accounts, stops PostgreSQL, makes a cold filesystem backup, removes the original temporary data directory, restores the backup, restarts and verifies complete player states and migration history. This proves the local cold-restore procedure, not production online backups or cross-host failover.

`experiments` runs fixed-budget seeded onboarding, equal-strength paired combat styles, offline boundaries, inheritance, current 24-hour independent-Bud production scenarios and 100 synthetic ranked formations using the same rules as the server. The production section uses the shared lab’s five-seed daily/frequent/paused variants, with unlimited item stacks and automatic blocked-work recovery. Full aggregate outcomes go to ignored `.repo-local/experiments.json`; production runs also retain their individual lab artifacts. The fixed aggregate filename is retained for compatibility.

`experiments:world` creates its own disposable real PostgreSQL database and exercises Fastify commands with an injected gameplay clock. Empty, low-volume and active-market cohorts record daily wallet/resource/escrow conservation, tax, NPC stock and 7/30-day source/sink flows in ignored `.repo-local/world-experiments.json`. Fixed fixtures and scripted prices measure accounting and behavior, not live equilibrium. Neither experiment command proves human retention.

For the API-first lab, use `npm run lab -- list`, `npm run lab -- smoke`, and `npm run lab -- run <scenario>`. Per-run reports, comparisons, replay, content validation and local stdio MCP setup are documented in [Experiment Lab](EXPERIMENT-LAB.md). Configure an MCP client to launch `node --env-file-if-exists=.env tools/mcp.ts` directly from the repository root; npm banners must not enter its protocol stream.

## Build, rights and recovery

`npm run build` produces the browser `dist/`; server source executes through Node 24's native erasable TypeScript support. Publish neither repository root nor private `.repo-local` contents. Locked package licenses and original content provenance are recorded in the implementation report. `publicDir` stays disabled; reference boards and donor code do not enter runtime. Source version `0.1.0-dev.1` denotes an unreleased candidate.

Keep future save changes behind explicit migrations and content/rules versions. Back up a local database only after clean shutdown or with normal PostgreSQL backup tooling. Never reset real accounts to resolve a migration problem. The [experience report](../evidence/experience-mvp-2026-11-26.md) owns the latest verification and unfinished acceptance; the [original implementation report](../evidence/mvp-implementation-2026-11-26.md) retains the baseline and the [Miyu handoff](../project/MIYU-HANDOFF.md) owns next actions.
