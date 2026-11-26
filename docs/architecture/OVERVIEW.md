# Architecture overview

Idle Buds is a single React/TypeScript/Vite application with one authoritative Fastify server and a PostgreSQL database. Scope is the local/private MVP in the [Current Release Specification](../project/CURRENT-RELEASE.md). This is an implemented development candidate, not a public deployment or scale claim.

| Area | Owner | Responsibility |
|---|---|---|
| Browser | `src/App.tsx`, `src/ui/`, `src/styles.css` | Semantic DOM, skill navigation, views and same-origin API requests; no authority over rewards or time |
| Rules | `src/game/` | Explicit-time activity reconciliation, original seeded battles/captures, breeding, inventory and progression validation |
| Definitions | `src/data/catalog.ts` | Original species, zones, skill/resource/recipe/gear/upgrade data |
| HTTP/auth | `server/app.ts`, `server/auth.ts`, `server/commands.ts` | Session identity, origin/input/rate checks, dispatch and response shaping |
| Persistence | `server/db.ts`, `migrations/` | PostgreSQL transactions, account state, sessions and command receipts |
| Shared world | `server/market.ts`, `server/social.ts`, `server/pvp.ts` | Escrow, orders/store, social/clans, immutable defense snapshots and ranked outcomes |
| Tests | `tests/unit/`, `tests/integration/`, `tests/e2e/` | Same rules, real PostgreSQL and browser interactions |
| Local play | `tools/play.mjs`, `tools/play-db.mjs`, `tools/db-local.mjs`, `tools/fixtures.ts` | Local/LAN application supervision, owned database lifecycle and isolated test-account setup |

## Four concrete contracts

**Activity:** `advance(state, serverTime)` resolves due events once, preserves partial cycles, applies the 24-hour cap and retries input/storage blocks when their prerequisites return. Ordinary polling, commands and offline return use this same function. Explicit pause and stop remain deliberate player choices. Valid replacement is atomic; one independent Bud per production skill shares access to sources with the Tender. Online/offline parity is meaningful for equal eligible time within the cap; multi-day unattended time intentionally discards excess. Zero extra grace is the initial provisional value.

**Battle:** `resolveBattle(left, right, seed)` consumes immutable formation values and returns bounded, ordered events plus opening formation snapshots. PvE and ranked share it. The Tender occupies the protected rear, entering when Buds fall; an empty Bud team is valid. The browser projects recorded turns, health, effects and frontline changes without submitting commands. Pausing, stepping, speeding up or replaying that projection never affects server progression or rewards. Legacy snapshot-free results remain readable as logs.

**Ownership:** each player owns one JSONB game-state row, with server-generated globally distinct instance IDs. Save schema 2 migrates schema 1 without deleting excess assets and is independent of combat rules version 1. Shared inventory has item-type slots and individual unequipped-gear slots; Buds and eggs remain separate. Listings remove assets into escrow and reserve their return capacity. Bounded pending production output preserves completed rewards until they fit. A world transaction serializes its shared mutation before locking the necessary player rows. Work/breeding/formation commitments prevent conflicting release or sale. Ranked defenses store snapshots and do not reserve live creatures.

**Commands:** a strict command union, account identity and UUID key produce a canonical request fingerprint. Player lock, reconciliation, command effects, state and result receipt commit together. Replaying a key returns its receipt; different payloads with the same key are rejected. Savepoints preserve legitimate elapsed progress while rolling back rejected command effects. A single PostgreSQL transaction advisory lock serializes current shared-world writes. This is deliberately conservative for a small test cohort; replace it only for a measured bottleneck.

## Security and deployment boundary

Bcrypt password hashes, opaque server sessions with stored token hashes, revocation/expiry, HttpOnly SameSite cookies, exact-origin JSON writes and rate limits protect local/private accounts. Future RNG seeds and egg genetics do not enter player views. The explicit trusted-home-LAN mode permits the configured private HTTP origin with ordinary account login; other nonloopback startup retains HTTPS/invite requirements. Fixtures/reset are loopback-only and restricted to the exact `idle_buds_test` database. There is no HTTP time skip or fixture mutation route. Interface preferences persist per account in the browser, while gameplay state remains server-owned.

`dist/` contains only the browser application. Reference art, imported research and archives remain outside the build. The optional embedded-postgres package is development-only and starts real PostgreSQL; an existing database can be provided with `DATABASE_URL`. There are no Redis, microservices, queues, ECS, native shells or external paid services. Read [development](../engineering/DEVELOPMENT.md) for execution and [verification](../engineering/VERIFICATION.md) for evidence limits.

The local launcher supervises HTTP shutdown before stopping a database it owns. Its small IPC database helper isolates the embedded package's process-wide exit hooks from the supervisor and terminal interrupts; parent disconnect also requests database cleanup. An externally supplied database is never owned or stopped by the launcher. Database credentials cross the private IPC channel and are not printed in the startup banner.
