> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/21-event-protocol-rollout-results/21-event-protocol-rollout/INTEGRATION-CONTRACT.md); [scope, corrections and rights](../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Integration contract

What another product can reuse, what it must guarantee, and what it costs to
adopt. Paths are relative to this workstream. The reusable core is
`protocol-spec/src/` and has **no runtime dependencies** (pure TypeScript,
runs in Node ≥ 22.12 and in browsers). Everything in `client-server-demo/`,
`rollout-emulator/` and `compatibility-matrix/` is a reference harness built
on that core.

## 1. Reusable interfaces (`protocol-spec/src`)

| Module | API | Purpose |
|---|---|---|
| `schema.ts` | `object(shape, {refine})`, `req/opt/optNullable/reqNullable`, `str/int/num/bool/closedEnum/openEnum/array/intPair/opaqueObject`, `decodeWith(schema, input) → {ok, value, unknownKeys} \| {ok:false, issues}`, `UnknownEnum` | Typed decoding with explicit presence (absent ≠ null), tolerant of unknown keys, rejects prototype keys, never throws |
| `wire.ts` | `safeJsonParse(text, limits)`, `decodeFrame(text, gen) → frame \| ignored \| error`, `encodeFrame`, `byteLength`, `DEFAULT_LIMITS` | Size, depth and node limits, then frame dispatch for the negotiated generation |
| `frames.ts` | `ProtocolTable`, `GenerationSpec {gen, frames, features, events}`, frame schemas, `EPL_PROTOCOL`, reject/event codes | Declares each generation: frames, envelope features, and the exact event version per type |
| `registry.ts` | `EventVersionDef<B,C> {type, v, schema, ignorable, capability?, modelled?, critTokens?, toCanonical, fromCanonical}`, `EventRegistry`, `decodeEvent`, `encodeEvent`, `roundTripMismatches` | Hub-and-spoke adapters with fidelity `exact` / `projected` / `lossy`, plus a sampled self-check |
| `negotiate.ts` | `ServerCodeSupport`, `Policy {epoch, floor, ceiling, deniedBuilds, caps, latestClientBuild, grease}`, `negotiate(hello, support, policy)`, `welcomeFor`, `verifyWelcome`, `capGranted` | Pure handshake decision with an audit record |
| `receipts.ts` | `ReceiptStore {check, record}`, `fingerprint`, `stableStringify` | Idempotent receipts (duplicate / conflict) keyed by id plus canonical fingerprint |
| `audit.ts` | `AuditLog.emit(kind, actor, fields)`, `toJSONL()` | Structured decision log |
| `rng.ts` | `Rng(seed)`, `stableBucket(key, salt)`, `cyrb53` | Reproducible runs; stable cohort bucketing for percentage rollouts |
| `faults.ts` | `FAULTS`, `fault(id)`, `withFaults`, `withExtraFaultsSync` | Seeded known-bad behaviours for mutation testing |
| `domain/deals.ts` | example domain (synthetic CRM deals): schemas v1–v3, adapters, `applyPatch`, `modelledDealFields` | Template for a domain's event family |

Adapting to another product means writing a `ProtocolTable` and one
`EventVersionDef` per (type, version) against your canonical model. Mark
`ignorable` and `capability`, list `modelled` fields for the self-check, and
attach `critTokens` for fields that must be understood. Keep the core modules
unchanged.

## 2. Reference components (harness)

- `client-server-demo/src/server.ts`: `ServerInstance(name, build, env, opts)`
  with sessions, LSN fan-out, withholding, receipts, resume, drain/goaway,
  policy re-evaluation, a round-trip self-check and an anti-entropy digest.
  `env` = `{clock, rng, store, receipts, sessions, policy, audit, oracle?}`.
- `client-server-demo/src/client.ts`: `ProtocolClient` with handshake
  verification, rev-ordered patch application, gap buffering, refetch, dedupe,
  feature gates, an outbox with re-encode-or-fail, backoff, a handshake
  timeout and a digest check. It runs on the simulator, Node WebSocket and
  browsers.
- `client-server-demo/src/store.ts`: example storage guard (`min_reader`,
  `writer_gen`) and per-generation row access. Treat it as a pattern, not a
  database layer.
- `client-server-demo/src/ws.ts` / `wsconn.ts`: minimal RFC 6455 server (lab
  use only) and a `Conn` adapter for WHATWG WebSocket.
- `compatibility-matrix/src/matrix.ts`: `generateMatrix`, `runCell`,
  `runTransition`, `runCoexistence`, `evaluate(cells, transitions, spec)`.
  The CLI exits 2 or 3 when requirements fail (fail closed).
- `rollout-emulator/src/emulator.ts`: `RolloutEmulator(plan, seed).run()`
  with gates, pre-flight and automatic rollback.

## 3. Invariants an adopter must preserve

| id | invariant | enforced by | verified by |
|---|---|---|---|
| I1 | A consumer applies an event only if `v` equals the negotiated version for its type, all `crit` tokens are understood (P3+), and the body decodes. | `decodeEvent` | injection tests, fuzz F1, CF1 |
| I2 | Producers never deliver a lossy downcast. They withhold it and send resync; snapshots say `unavailable`. | `encodeEvent` + server | matrix, SF2, round-trip gate |
| I3 | Absent and null stay distinct from wire to canonical model and back. | `schema.ts`, adapters | unit tests, CF2 |
| I4 | Unknown open-enum values are preserved, never coerced. Closed enums reject. | `openEnum` / `closedEnum` | CF3 |
| I5 | Negotiated version ∈ client range ∩ effective server range; otherwise an explicit reject with a retry hint. | `negotiate`, `verifyWelcome` | 1600-case grid, CF8, SF6 |
| I6 | Capabilities are recomputed from policy at every handshake. Client assertions are audited, never trusted. Writes that need a feature are re-checked server-side. | `negotiate`, server `applyCommand` | SF3, SF8, CF5 |
| I7 | A command id is applied at most once. Same id with a different canonical body is a conflict. Only deterministic outcomes are recorded. | `ReceiptStore`, server | SF4, duplicate probes |
| I8 | Patches apply only at `rev == current + 1`. Gaps buffer and refetch. Older revs are dropped. | client | CF4, reorder/drop arms |
| I9 | Resume replays from the durable change log, and only at the same generation. Otherwise refetch. | server + client | SF10, SF11, CF9 |
| I10 | A rollback target must honour the storage guard whenever rows were written at a higher generation. | emulator pre-flight / your deploy tooling | transitions, coexistence |
| I11 | Every decision is audited (negotiate, reject, grant/revoke, withhold, resync, goaway, deploy, gate, rollback). | `AuditLog` | emulator audit JSONL |

Transport assumption: **per-connection FIFO and no silent loss** (TCP /
WebSocket). Duplicates and reconnects are handled. Silent loss on a live
connection is out of contract; P2+ anti-entropy repairs it, P1 cannot.

Receipt window: receipts expire by TTL or capacity, and a redelivery after
eviction is indistinguishable from a new command. Producers must stop retrying
before the window closes. Default here: 24 h / 100k entries, and clients give
up after 8 attempts.

## 4. Dependencies

- Runtime: none for `protocol-spec/src`. The harness uses Node built-ins
  (`node:http`, `node:crypto`, `node:fs`, `node:child_process`) and the
  WHATWG `WebSocket` global (Node ≥ 22.4 or a browser).
- Dev (pinned exactly): `typescript@5.9.3`, `@types/node@22.19.1`,
  `playwright-core@1.56.1` (browser tests only; its Chromium revision 1194 is
  141.0.7390.37).
- Toolchain: Node 22.x (tested on v22.22.0), npm 10.x (tested on 10.9.4).

## 5. Migration / adoption risks

| Risk | Impact | Mitigation |
|---|---|---|
| Already-deployed clients lack `range`/`caps`/`crit`. | They can only be protected by server-side adapters and withholding. `crit` cannot be retrofitted. | Ship `range`, `caps` and `crit` in the first generation you control. Keep adapters for the support window. |
| Withholding increases fetches and "unavailable" views for old clients. | UX degradation and extra load (measured in BENCHMARKS.md). | Ramp lossy-producing features by capability. Show an "update to view" state. Set a sunset with gate PG1. |
| Old rollback targets lack the storage guard. | Rollback becomes a one-way door. | Release reader/guard support one release before the writer (expand first). Make the pre-flight a deploy blocker. |
| Receipt store sizing. | Duplicates after eviction. | Size the TTL above the maximum client retry horizon. Monitor evictions. |
| Canary telemetry is blind to silent semantic loss. | Bad adapters pass observable gates. | Round-trip self-check on adapted events (G1); shadow consumers or contract tests (G0). |
| The capability matrix grows with features × generations. | Test cost. | The executed matrix generator runs in CI (36 cells + transitions take about 0.4 s here). |
| The minimal WebSocket server is lab-grade. | Not for internet exposure. | Use your platform's hardened WebSocket stack. Keep only the protocol layer. |
| Browser caches keep entry scripts. | Stale clients after a breaking deploy. | Use `no-cache` HTML and hashed bundle URLs. Strict server rejection plus a cache-busting reload path (X1). |
