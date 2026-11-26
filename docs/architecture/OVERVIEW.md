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
| Local play | `tools/play.mjs`, `tools/db-local.mjs`, `tools/fixtures.ts` | Loopback database/application startup and isolated test-account setup |

## Four concrete contracts

**Activity:** `advance(state, serverTime)` resolves due events once, preserves partial cycles, applies the 24-hour cap and records input/storage stops. Ordinary polling, commands and offline return use this same function. Online/offline parity is meaningful for equal eligible time within the cap; multi-day unattended time intentionally discards excess. Zero extra grace is the initial provisional value.

**Battle:** `resolveBattle(left, right, seed)` consumes immutable formation values and returns bounded, ordered events. PvE and ranked share it. The Tender occupies the protected rear, entering when Buds fall; an empty Bud team is valid. The UI displays resolved events. There is no animation-owned simulation.

**Ownership:** each player owns one JSONB game-state row, with server-generated globally distinct instance IDs. Listings remove assets into escrow. A world transaction serializes its shared mutation before locking the necessary player rows. Work/breeding/formation commitments prevent conflicting release or sale. Ranked defenses store snapshots and do not reserve live creatures.

**Commands:** a strict command union, account identity and UUID key produce a canonical request fingerprint. Player lock, reconciliation, command effects, state and result receipt commit together. Replaying a key returns its receipt; different payloads with the same key are rejected. Savepoints preserve legitimate elapsed progress while rolling back rejected command effects. A single PostgreSQL transaction advisory lock serializes current shared-world writes. This is deliberately conservative for a small test cohort; replace it only for a measured bottleneck.

## Security and deployment boundary

Bcrypt password hashes, opaque server sessions with stored token hashes, revocation/expiry, HttpOnly SameSite cookies, exact-origin JSON writes and rate limits protect local/private accounts. Future RNG seeds and egg genetics do not enter player views. Nonloopback startup requires an HTTPS origin and invite configuration. Fixtures/reset are loopback-only and restricted to the exact `idle_buds_test` database. There is no HTTP time skip or fixture mutation route.

`dist/` contains only the browser application. Reference art, imported research and archives remain outside the build. The optional embedded-postgres package is development-only and starts real PostgreSQL; an existing database can be provided with `DATABASE_URL`. There are no Redis, microservices, queues, ECS, native shells or external paid services. Read [development](../engineering/DEVELOPMENT.md) for execution and [verification](../engineering/VERIFICATION.md) for evidence limits.
