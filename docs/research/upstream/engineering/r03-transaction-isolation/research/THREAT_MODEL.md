> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/03-transactional-state-fuzz-results/research/THREAT_MODEL.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Threat model — immutable publication and transaction isolation

Scope: the reference component in `src/` (lane 03). All data is synthetic. Labels:
**observed** = reproduced on this machine by a test or probe (id given); **inferred** = follows
from the spec/design, not separately demonstrated; **not yet tested** = no evidence collected.

## 1. Assets and properties

| Asset | Property we want |
|---|---|
| Authoritative state (`store.state`) | Changes only through a committed transaction; never through a reference held by anyone else. |
| Published snapshots (any value returned by `publishSafe`, `domain.publish`, `store.state`, `tx.state`) | Deeply immutable and value-stable for their whole lifetime; reads never run caller/attacker code. |
| Id counter, PRNG state, version | Advance only on commit; replayable from (seed, initial state, operation sequence). |
| Certification table (per trust domain) | Contains only nodes this domain produced, each deeply frozen and validated under the domain's limits. |

## 2. Actors and trust levels

| Level | Who | Trust |
|---|---|---|
| T0 | The library and the code that creates the store; loaded **before** any less-trusted code | Trusted |
| T1 | Transaction callbacks and their helpers | Trusted intent, assumed buggy: may retain and later mutate inputs, catch and ignore errors, leak the `tx` handle, return promises, re-enter |
| T2 | Data crossing the boundary (parsed JSON, plugin results, restored saves) | **Untrusted.** May be any JavaScript value graph: cycles, sparse arrays, accessors, Proxies with arbitrary traps, exotic/mutable built-ins, swapped prototypes, cross-realm objects, `__proto__` keys, pathological sizes |
| T3 | Hostile code executing in the same realm (e.g. a compromised dependency) | **Out of scope for guarantees.** See §6 for what still holds and what does not |

## 3. Trust boundary

Every value entering through `publishSafe`, `domain.publish`, `tx.set`/`tx.update`,
`createStore({ initialState })` or `restoreStore` is treated as T2, **including frozen values and
values that look exactly like published ones**. The single exception: a container that the same
trust domain certified (private `WeakMap`, see INVARIANTS I5) is reused without inspection.
Nothing about the object itself — frozenness, shape, symbols, prototype, `isFrozen` answers — can
make it certified.

## 4. Threats and mitigations

| # | Threat | Mitigation | Evidence |
|---|---|---|---|
| A1 | Caller mutates a retained input after publication | Every accepted container is copied; published graph shares no container with the input | observed: `tests/retained-references.test.ts` (all depths 0..16), P1, P8 (10k+20k cases), E02 |
| A2 | Shallow-frozen ancestor with mutable descendants is trusted | Frozenness is never consulted for trust; frozen input is copied | observed: E01 defeated; V1 exploited (R001, shrunk repro); certification tests |
| A3 | Accessor in the published graph returns changing values / runs code on read | Accessors rejected (`PROPERTY_ACCESSOR`) using descriptors, so the getter is never invoked | observed: corpus (32 recipes, 0 getter calls), E05, E10, probe F07 |
| A4 | Proxy published into the snapshot (reads run attacker traps; DoS by throwing) | Proxies are never published: their own data is copied into fresh plain objects; optional `isProxy` hook rejects them before any trap runs | observed: E06, `tests/proxy.test.ts`, probes F09–F11, F17 |
| A5 | Proxy TOCTOU: inconsistent answers between checks | Single-read discipline: one `getOwnPropertyDescriptor` per property; the value read is the value copied; nothing is re-read | observed: TOCTOU tests in `tests/proxy.test.ts`, recipe `tocTouProxy` |
| A6 | Mutable built-ins (Map/Set/Date/typed arrays/ArrayBuffer) inside a "frozen" snapshot | Rejected (`OBJECT_EXOTIC`) by prototype identity, `ArrayBuffer.isView`, and slot brand checks for prototype-swapped instances | observed: E03/E04; probes F02–F06, F26; 184 corpus recipes |
| A7 | Holes read through a polluted `Array.prototype` | Sparse arrays rejected (`ARRAY_HOLE`) | observed: E12; probe F13 |
| A8 | `__proto__` own key re-parents a copy (prototype pollution) | `__proto__` keys rejected (`KEY_FORBIDDEN`); output created without `__proto__` assignment | observed: E11 (V1 exploited), probe F21 |
| A9 | Forged certification (look-alike, copied descriptors/symbols, `Object.create(certified)`, Proxy wrapper, cross-domain node, patched `WeakMap.prototype`) | Certificates live in a closure-private `WeakMap` per domain, accessed through built-ins captured at load; no API certifies an existing object | observed: `tests/certification.test.ts`, E07/E08 (V2 exploited) |
| A10 | Partial publication on failure; failure consumes ids or PRNG draws | Transaction works on private copies; commit is a block of field assignments after all user code ran; any failure poisons the transaction (fail-closed) | observed: `tests/transactions.test.ts` (19 failure modes × 2 policies), M1 (40,387 commands), replay tests |
| A11 | Re-entrancy from callbacks or traps (nested `transact`, `tx` use during validation) | `TX_REENTRANT` (store-level flag + per-transaction `validating` flag) | observed: proxy and transaction tests |
| A12 | Leaked `tx` handle used later / async callback mutates after commit | Handle closed when the callback returns (`TX_CLOSED`); thenable results rejected (`TX_ASYNC_RESULT`) | observed: transaction tests |
| A13 | Pathological size: depth, width, length, long strings, exponential DAG | Limits checked before work where possible (array length before key enumeration), node budget counts expanded tree size, certified reuse accounted in O(1) via stored height/size | observed: `tests/limits.test.ts` (100k-deep rejected in ~1 ms; 2^61-value DAG rejected at the 1M budget in ≈1 s) |
| A14 | Stack exhaustion | Hard cap `maxDepth ≤ 1000`; `RangeError` from own frames mapped to `STACK_EXHAUSTED` | observed: limits test (caller recursion of ≈4,800 frames → `STACK_EXHAUSTED`) |
| A15 | Non-determinism | No `Date`, `Math.random`, `performance.now` in `src/` (lint-enforced); seeded xoshiro128**; key order = source own-key order | observed: replay tests, golden digest, rand_xoshiro parity |
| A17 | A trap installs setters on `Array.prototype`/`Object.prototype` (or re-parents `Array.prototype` onto a Proxy) mid-traversal so that writing the copy hands it to attacker code | Each output write is preceded — with no caller code in between — by a check that the `[[Set]]` path is plain; otherwise `defineProperty` with a null-prototype descriptor. Traversal path and error paths use the same discipline | observed: **R003 was a real defect** (found by review, fixed); `tests/review-findings.test.ts` (3 tamper kinds × 2 prototype modes × 2 policies), P9 fuzz, mutation check `results/mutation-check-R003.json` |
| A16 | Hostile trap that never returns or allocates without bound | **Cannot be bounded in-process.** Run untrusted producers in a worker/process with a timeout and heap cap | observed: `tests/isolation.test.ts` (terminate after 400 ms; `ERR_WORKER_OUT_OF_MEMORY`); see pitfall below |

**Observed pitfall (A16):** this environment exports `NODE_OPTIONS=--max-old-space-size=8192`.
Worker threads inherit it and it overrides `resourceLimits.maxOldGenerationSizeMb`: a worker
requested with a 48 MB old generation reported `heap_size_limit` ≈ 8204 MB and grew to >4.8 GB in
30 s without being stopped. With `NODE_OPTIONS` cleared, the same worker was stopped with
`ERR_WORKER_OUT_OF_MEMORY` after ≈0.35–0.55 s (varies by run). Isolation limits must be verified in the deployed
environment, not assumed.

## 5. Where untrusted Proxies get control

Inspection of an untrusted object runs, in this order and nothing else (observed, `tests/proxy.test.ts`):

- objects: `getPrototypeOf`, `ownKeys`, then `getOwnPropertyDescriptor(k)` once per key;
- arrays: `getPrototypeOf`, `getOwnPropertyDescriptor("length")`, `ownKeys`, then one descriptor read per index.

`typeof`, `Array.isArray`, `ArrayBuffer.isView`, `WeakMap`/`Set` lookups and the slot brand checks
run no traps (`Array.isArray` throws on a revoked Proxy; that becomes `INSPECTION_THREW`).
`get`, `has`, `set`, `defineProperty`, `deleteProperty`, `preventExtensions` and
`isExtensible` are never triggered — across the 624-recipe corpus and 30,000 fuzzed recipes no
disallowed trap ran (observed).

What a trap **can** still do while it has control: run arbitrary code (side effects, timing
observation of the traversal order), throw (→ `INSPECTION_THREW`, transaction rolled back),
mutate other parts of the input graph (the copy reflects whatever is read at the moment each
property is read — consistently), **tamper with intrinsics** (install prototype setters, replace
built-in methods, pollute `Object.prototype`), loop forever, or allocate without bound (A16).
What it **cannot** do (after the R003 fix): get its Proxy, a getter, or any object it controls
into the published graph; make a later read of the snapshot's own properties differ from the
first; see or mutate the partially built output (it is never passed to caller code, and output
writes cannot be intercepted by prototype hooks — A17); commit or consume ids/PRNG (re-entrancy
is refused and poisons the transaction).

Lesson recorded from R003: "a trap runs arbitrary code" must be read literally — every
operation the engine performs after a trap returns has to be safe against a modified realm,
not only against the trap's return values.

## 6. Explicitly out of scope / residual risks (T3 and engine-level)

- **No perfect sanitizer.** In-process hostile code that runs before this module loads can
  replace the built-ins it captures (T3, *inferred*). Code that runs later — including a T2 Proxy
  trap during inspection — can pollute `Object.prototype`, so absent-key reads through published
  objects see the pollution (probe F12; snapshot *own* properties are unaffected), and can
  replace built-in methods that consumers later call on snapshots (e.g. `Array.prototype.map`).
  Output construction itself is hardened against prototype hooks (A17, *observed*). Use
  `objectPrototype: "null"` (≈10× slower reads in V8, probe F31) and/or freeze intrinsics (e.g. a
  lockdown step) if this matters; isolate untrusted producers (A16).
- Brand detection is best-effort: Promises, generators and unknown host objects with swapped
  prototypes are not brand-detected. They are still copied as their (empty) own data, so the
  snapshot stays immutable; only the error message is less precise. *Inferred.*
- Limits bound this library's work, not the work an engine or trap performs before control
  returns (a 200k-key `ownKeys` result is fully materialised before `OBJECT_TOO_MANY_KEYS`).
  *Observed.*
- Cross-realm objects are rejected rather than adopted. *Observed.*
- Not yet tested: other engines (SpiderMonkey, JavaScriptCore), Node < 22, browsers, Deno/Bun,
  SES/lockdown environments, `--frozen-intrinsics`.
