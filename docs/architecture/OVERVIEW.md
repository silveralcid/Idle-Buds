# Architecture overview

Status: the owner approved the technology direction; this mission establishes only the non-game frontend foundation. [ADR 0001](../adr/0001-web-foundation.md) explains the implementation boundary.

| Area | Current home | Responsibility and present status |
|---|---|---|
| Browser application | `src/`, `index.html`, `vite.config.ts` | React/TypeScript/Vite startup, semantic DOM and local CSS; no gameplay |
| Future deterministic game rules | `src/game/` | Reserved documented boundary; no simulation or domain framework yet |
| Future game definitions | `src/data/` | Reserved documented boundary; no imported third-party catalogs |
| Production assets | `public/` | Only original or rights-cleared runtime assets; no reference boards |
| Browser acceptance | `tests/e2e/` | Foundation startup, errors and viewport checks |
| Future authoritative backend | `server/README.md` | Approved Node/TypeScript/Fastify plus PostgreSQL direction; no service, schema or database provisioned |
| Developer tools | `tools/` | Inherited standard-library repo helper and migration integrity validation |
| Knowledge/reference | `docs/` | Design, research, source archives and evidence; excluded from production inputs |

## Boundaries to preserve

Future rules consume explicit time/inputs and deterministic seeds where needed. UI is an adapter, not authority for rewards, elapsed time, creature ownership or economic settlement. The eventual single modular server owns those outcomes with transactional persistence. An idle game does not need a continuously running graphical simulation per player.

Do not select schemas, transport protocols, cache layers, queues, hosted providers, auth systems, rendering engines or frontend state libraries before the first authorized feature needs them. Vitest is the recommended future pure-rules test runner; real PostgreSQL integration/concurrency tests become required when persistence/economy exists. Present browser smoke checks are not those future tests.

Tauri remains a later desktop candidate. Steam/Deck/mobile packaging and compatibility remain unqualified. No Rust/Cargo/Bevy, native wrapper, WebAssembly or backend dependency enters this foundation. No art/reference/reverse-engineering file may be imported into runtime merely because it is nearby.
