> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/03-transactional-state-fuzz-results/INTEGRATION_GUIDE.md); [scope, corrections and rights](../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Integration guide

Status: **R&D reference component, not production-ready.** This guide describes the smallest
safe interface and the gates that must pass before anything like it is adopted.

## 1. Minimal safe interface

```ts
import { createStore, restoreStore, setIn, type FrozenJson, type Tx } from "@rnd-lane03/txsnap";

const store = createStore({
  initialState: { items: {} },        // untrusted: validated + copied
  seed: 12345,                        // PRNG seed (safe integer or bigint < 2^64)
  policy: "certified",                // default; "safe" = full copy every set
  limits: { maxDepth: 64 },           // optional; defaults in DEFAULT_LIMITS
  invariant: (s) => undefined,        // optional domain check at commit; return a message to reject
});

const r = store.transact((tx: Tx) => {
  const id = tx.nextId();                       // consumed only if the transaction commits
  const roll = tx.randomInt(6);                 // same rule
  tx.set(setIn(tx.state, ["items", `i${id}`], { id, roll }));
  return id;
});
if (!r.ok) console.log(r.error.code, r.error.pointer);   // stable code + RFC 6901 location

const snapshot: FrozenJson = store.state;      // deep-frozen; safe to share by reference
const saved = JSON.stringify(store.save());    // { format, version, nextId, rng, state }
const restored = restoreStore(JSON.parse(saved), { policy: "certified" }); // untrusted input
```

Stand-alone publication (no store): `publishSafe(value, options)` → `{ ok, value | error }`;
`createTrustDomain(options).publish(value)` for the certified fast path.

Everything else in the package is either a helper that grants no trust (`setIn`, `setManyIn`,
`updateIn`, `getIn`), types, or the explicitly named `@rnd-lane03/txsnap/insecure-demo` subpath
(deliberately vulnerable references for tests — never import it in product code).

## 2. Ownership, revocation and visibility rules

| Object | Owner | Rule |
|---|---|---|
| Values passed to `set`/`publish`/`createStore`/`restoreStore` | Caller | Read once during the call, never retained, never mutated or frozen. Caller may keep mutating them; the store never sees it. |
| Published values (`store.state`, `tx.state`, `publish` results) | Trust domain | Immutable for their lifetime. Anyone may hold and share them. Reads never run foreign code. |
| Authoritative state, id counter, PRNG, version | Store | Changed only by a committed transaction. `save()` returns a frozen record that references the published state (no copy needed). |
| Certificates | Trust domain (private) | Only the domain's own engine adds them. `domain.revokeAll()` drops all of them (e.g. after a limits/policy change); there is no per-node revocation. Nodes from another domain are treated as untrusted and copied. `store.fork()` shares the domain. A store given `domain` takes limits/prototype mode/Proxy detector from it (passing them too is `INVALID_OPTIONS`). |
| `tx` handle | The transaction | Dead after the callback returns (`TX_CLOSED`). Do not pass it to async code. |

Visibility: inside a transaction, staged state is visible only through `tx.state`; everybody else,
including Proxy traps and the invariant hook's callers, sees the committed `store.state`. A commit
replaces `store.state` atomically; older snapshot references keep their old value forever.
Absent-key reads on published objects go through `Object.prototype`; use `Object.hasOwn` (or
`objectPrototype: "null"`) where prototype pollution is a concern.

## 3. Rules for code that produces the next state

- Build the next state from `tx.state` with copy-on-write (`setIn`, spread). Untouched children
  are reused automatically under the certified policy; the new spine is validated and copied.
- Never add a shortcut that skips validation because an object is frozen, sealed, "looks
  published", carries a marker, or passed validation before in a *different* domain. Frozenness is
  shallow; it is not provenance (see `research/REPORT.md` F-1/F-2 and regression R001).
- Do not expose or re-implement certification for objects the domain did not produce.
- Do not catch a `PublicationError` inside a transaction and continue expecting a commit: the
  transaction is poisoned (fail-closed) and will roll back.
- Callbacks must be synchronous. Await outside the transaction, then transact with the result.
- Untrusted *code* (plugins that can hand you Proxies or getters) cannot be bounded in-process:
  run it in a worker/process with a wall-clock timeout and heap cap, and **verify** the cap in the
  deployed environment — an inherited `--max-old-space-size` (e.g. via `NODE_OPTIONS`) overrides
  `resourceLimits.maxOldGenerationSizeMb` (observed here; also stated in the Node docs).

## 4. Adoption gates (all required)

1. `npm ci && npm run typecheck && npm run lint && npm test` pass on the target Node version(s)
   (only Node 22.22.0 / linux-x64 was tested here).
2. `node scripts/run-tests.mjs --profile=deep` passes (10× fuzz counts) on the target platform.
3. Security gate: `tests/vulnerable.test.ts` shows **every** repaired-policy exploit defeated and
   every vulnerable reference exploited (proves the suite still detects the defect class).
4. Parity gate: `npm run bench` reports `parityGate: PASSED` for both library policies on a
   workload shaped like the real one (sizes, fan-out, modification ratios) before any speedup is
   quoted; re-run the benchmark there — numbers here are from one VM.
5. Limits reviewed against real data sizes (`DEFAULT_LIMITS` are conservative guesses).
6. A decision on prototype mode (`"object"` fast reads vs `"null"` pollution-immune, ~10× slower
   reads in V8) and on whether in-process hostile code is in scope (if yes: freeze intrinsics /
   isolate; this library alone is insufficient).
7. Independent human review of `src/publish.ts` and `src/store.ts` (≈700 lines) by someone who
   did not write them. An automated review pass in this session found a high-severity defect
   (R003) that the existing corpus and fuzz suites (119,002 default-profile cases) had missed —
   treat review as a hard gate, not a formality.

## 5. Selective optimisation guidance

Use the certified policy when updates touch a small fraction of a large state (the benchmark
shows the gap growing with size and shrinking with modification ratio). Keep the safe policy (or
`publishSafe`) at boundaries where values arrive from outside the domain; the certified policy
already treats such values exactly like the safe policy does, so the two can be mixed. Do not
enable reuse for anything the domain did not itself produce, regardless of how low the observed
fuzz failure rate is: absence of failures in N runs is not evidence that a shallow check is
sound, and the vulnerable reference V1 passes every benign workload while failing the security
gate.

## 6. Operational notes

- `TxResult.stats` (`inspected`, `reused`, `sets`, `idsConsumed`, `rngDraws` = 32-bit outputs
  drawn) is exact and cheap; log it to watch the fast path's effectiveness.
- `version` advances for every committed transaction that called `set`, consumed ids or drew
  random numbers (identically under both policies); read-only transactions keep it.
- Options are resolved and copied when the store is created; mutating the options object later
  has no effect.
- Error codes are stable (`ErrorCode`); `detail` strings are not part of the contract.
- The package requires Node ≥ 22.12 (uses `String.prototype.isWellFormed`, ES2024 lib).
