# Authoritative server

Idle Buds runs on Node.js 24, Fastify and PostgreSQL. Run `npm run play` from the repository root to build the client, apply the database migration and serve the game at `http://127.0.0.1:3000`. The launcher starts a local PostgreSQL instance when `DATABASE_URL` is unset. See the [development setup](../docs/engineering/DEVELOPMENT.md) for the development proxy, disposable fixtures and verification commands.

The browser uses the same origin as its API. The server listens on loopback by default. Configuring a nonloopback listener directly requires an HTTPS `ALLOWED_ORIGIN` and a signup invite in `IDLE_BUDS_INVITE`; provide HTTPS through the serving environment. The explicit `npm run play:lan` launcher is the trusted-home-network exception: it accepts detected private HTTP origins with ordinary account login, as described in [development setup](../docs/engineering/DEVELOPMENT.md#trusted-home-lan-playtesting). The disposable fixture database still requires both a loopback listener and a loopback origin. See the [.env example](../.env.example) for supported settings.

## HTTP interface

| Method and path | Request | Response |
| --- | --- | --- |
| `GET /api/health` | None | Database readiness |
| `POST /api/register` | `{username,password,invite?}` | Authenticated player state and session cookie |
| `POST /api/login` | `{username,password}` | Authenticated player state, return summary and refreshed session cookie |
| `POST /api/logout` | `{}` | Revokes the presented session and clears its cookie |
| `GET /api/state` | Session cookie | `{username,state,summary}` |
| `GET /api/world` | Session cookie | Marketplace, general store, community and ranked view |
| `POST /api/command` | Session cookie and `{id,command}` | Authoritative state, return summary and result message |

POST requests require JSON and an allowed browser `Origin`. The server uses bcrypt password hashes and stores SHA-256 digests of randomly generated session tokens. Cookies are HTTP-only and SameSite Strict, and are Secure for HTTPS origins. Session tokens expire after 14 days. Credentials use IP-based request limits. Chat also enforces its cooldown per account in PostgreSQL.

Authenticate and use a new UUID per command intent. Retrying the same UUID with identical arguments replays its recorded status and response. Reusing an ID with different arguments returns a conflict. Rule rejections also retain receipts. Use `GET /api/state` to read current progress after replaying an older receipt. Client request types live with the [game rules](../src/game/types.ts) and [world interface](world-types.ts).

## Persistence and settlement

PostgreSQL stores account and session records, player saves, command receipts, escrow and settlements, chat and social records, and ranked snapshots and results. The server applies the shared deterministic rules using its clock. A player row lock and transaction serialize reconciliation with commands and persist the receipt alongside the resulting state. A PostgreSQL transaction advisory lock serializes shared world mutations so a trade or ranked challenge can update two accounts consistently.

Offline reconciliation shares one 24-hour budget across remote market settlements until the player returns. Settlement preserves pending catch-up rewards for the owner's next state response. Successful market fills transfer goods and pay proceeds directly. Partial fills leave the remaining goods or credits in escrow. Sell-listing cancellation returns reserved assets losslessly, including legacy overfull holdings; buy-order cancellation requires room in the wallet for the refund. The general store carries starter materials, with bounded stock and gradual restock. Prices, tax and matchmaking bands are provisional playtest values.

Ranked defense publication freezes a versioned team. The server selects a blind opponent from its rating, progression and team-strength bands, then stores the actual teams, seed and result for replay. Prestige rewards are titles.

## Moderation

An operator with access to the playtest PostgreSQL database can read the 100 latest reports and act on exact message IDs or account usernames. Supply the intended database in `DATABASE_URL`.

```sh
node --env-file-if-exists=.env server/moderation.ts reports
node --env-file-if-exists=.env server/moderation.ts hide MESSAGE_UUID
node --env-file-if-exists=.env server/moderation.ts unhide MESSAGE_UUID
node --env-file-if-exists=.env server/moderation.ts ban USERNAME
node --env-file-if-exists=.env server/moderation.ts unban USERNAME
```

A ban ends active sessions and pauses the account's live chat visibility, open listings and ranked defenses. Unbanning restores access and requires a fresh sign-in. The API exposes player reporting, mute and block controls. Operator actions use the database connection.
