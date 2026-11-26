> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/13-versioned-checkpoints-results/13-versioned-checkpoints/integration/CONTRACT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Integration contract

This document is self-sufficient: an integrator can re-implement or adapt the
design without access to this repository. File references point to the
reference implementation in `src/` (TypeScript, Node.js ≥ 22.18, no runtime
dependencies).

## 1. Scope and assumptions

- **State**: one JSON-compatible document per checkpoint directory, owned by a
  single writer process. Values are restricted to I-JSON: plain objects,
  arrays, finite numbers (no `-0`), well-formed strings, booleans and `null`.
- **Determinism** (needed only for journal `ops` mode): applying the same ops to
  the same state yields the same canonical bytes on every run and every
  machine.
- **Dedicated directory.** The store owns every file in its directory: it
  deletes `*.tmp` leftovers on open and prunes old generations.
- **Single writer per directory.** The library does **not** lock. Two writers
  on one directory will corrupt each other's generations. Hold an exclusive
  OS lock (e.g. `flock` on a sibling lock file) or rely on process
  supervision.
- **Local POSIX filesystem** with working `fsync(2)` on files and directories
  and atomic `rename(2)`. Not supported: network filesystems (NFS/SMB rename
  and fsync semantics differ), and Windows (directory fsync not available;
  untested).
- The API is **synchronous**. A 20 MB full checkpoint blocks the calling
  thread for ≈0.5 s on the measured hardware (see `evidence/benchmarks.md`).
  Run it in a worker thread if event-loop latency matters.

## 2. Public interfaces (`src/index.ts`)

```ts
interface CheckpointStore {
  readonly name: string;
  open(): RecoveryResult;                         // exactly once per instance
  checkpoint(req: CheckpointRequest): CommitReceipt;
  close(): void;
}
interface CheckpointRequest {
  state: JsonValue;                              // full current state, schema = registry.current
  seq: number;                                   // strictly increasing commit sequence number
  ops?: readonly JsonValue[];                    // journal 'ops' mode: ops applied since last commit
  dirty?: ReadonlySet<string> | 'all';           // keys of the partition map changed since last commit
}
interface RecoveryResult { state: JsonValue | null; report: RecoveryReport }  // null = empty directory
interface CommitReceipt { seq: number; generation: number; kind: 'full'|'delta'|'compaction'|'chunks'|'chunks-gc'; bytes: number }

new FullStore(opts: StoreOptions)                                // candidate A
new JournalStore(opts: StoreOptions & { mode: 'ops' | 'patch'; partition?; compactRatio?; maxRecords?;
                                       tailPolicy?: 'truncate'|'fail'; midLogPolicy?: 'fail'|'truncate';
                                       verifyCompaction?: boolean })      // candidate B
new ChunkStore(opts: StoreOptions & { layout?: { buckets; partition; segmentField; segmentLength };
                                     gcDeadRatio? })                     // candidate C

interface StoreOptions {
  fsys: Fsys;                // NodeFsys(dir) in production; SimFs in tests
  app: AppSpec;
  limits?: Limits;           // DEFAULT_LIMITS (own disk) or IMPORT_LIMITS (untrusted)
  macKey?: Uint8Array;       // enables HMAC-SHA-256 on envelopes and the journal chain; then REQUIRED on read
  codec?: { name: 'identity'|'gzip'|'brotli'|'zstd'; level?: number };  // full snapshots / manifests only
  retain?: number;           // verified generations kept (default 2)
  validateOnWrite?: boolean; // validate state against current schema before full writes (default true)
}
interface AppSpec {
  registry: SchemaRegistry;                                          // validators + stepwise migrations
  reducers?: ReadonlyMap<number, (state: JsonObject, op: JsonValue) => void>;  // per schema version (ops mode)
  writerMeta?: JsonObject;                                           // stamped into envelope headers
}
interface SchemaRegistry {
  current: number; minSupported: number;
  validators: Map<number, (doc: JsonValue) => void>;   // throw E_SCHEMA_INVALID; must reject unknown members
  migrations: Map<number, (doc: JsonValue) => JsonValue>; // v → v+1, pure; throw E_MIGRATION_REJECTED
}
```

Also exported: `canonicalize`, `canonicalBytes`, `parseJsonBytes` (strict
reader), `assertJsonCompatible`, `encodeEnvelope`/`decodeEnvelope`, `upgrade`,
`validateAt`, `registryAsOf`, `acceptUntrustedState` (worker messages),
`importEnvelope` (foreign files), `NodeFsys`, `SimFs`, `InstrumentedFsys`,
`DEFAULT_LIMITS`, `IMPORT_LIMITS`, `CheckpointError`, `ERROR_CODES`.

Test harness (reusable, `src/testing/`): `runOracle`, `runSession`,
`enumerateCrashPoints`, `runImportCorpus`, `runDirCorpus`, plus the scripts
`scripts/failure-injection.ts`, `scripts/kill-runner.ts` and
`scripts/mutation-check.ts`.

### Caller obligations

1. Call `open()` before the first `checkpoint()`. If `state === null`, the
   directory held no commit point: seed a fresh state. **Any other error is
   not "empty"**; never respond to `E_NO_VALID_CHECKPOINT` by starting fresh
   automatically.
2. Do not mutate `req.state` during the `checkpoint()` call (it is read
   synchronously, so this holds unless other threads share it).
3. `ops` mode: pass exactly the ops applied since the last successful commit,
   in order. `patch` mode and C: pass every changed key in `dirty` (or `'all'`).
   A missed key in a dirty hint **silently loses that change**. Use
   `verifyCompaction: true` (B) or omit the hint (C rehashes everything) when
   you cannot guarantee completeness.
4. After any thrown commit error the store is **poisoned** (`E_CLOSED`). Close
   it, construct a new store and `open()` again; the recovered state may be
   older than the in-memory state (the failed commit was not acknowledged).
5. A commit is acknowledged **only** when `checkpoint()` returns.
6. Read `report.fallbacks`, `report.anomalies`, `report.quarantined` and
   `report.journal.truncated` after every `open()`, and surface them to
   operators. They are the declared recovery boundary.

## 3. Canonical JSON (bit-exact)

RFC 8785 (JCS), with two stricter rules:
- No insignificant whitespace; UTF-8; no BOM.
- Object members sorted by UTF-16 code units (JavaScript default `sort()`).
- Numbers: ECMAScript `Number.prototype.toString` (e.g. `1e+21`, `5e-324`).
  NaN/±Infinity refused. **`-0` refused** (stricter than JCS).
- Strings: escape `"` `\\` and U+0000–U+001F only (`\b \t \n \f \r`, else
  lowercase `\u00hh`); everything else literal. Lone surrogates refused.
- Member name `__proto__` refused (stricter than JCS).
- The **strict reader** requires `canonicalize(JSON.parse(bytes)) === bytes`,
  which rejects duplicate members, reordering, whitespace and alternative
  number/escape spellings (parser-differential defence).
- Limits (defaults / import): depth 64/32, string 16 MiB/1 MiB, object
  members 4M/200k, array length 16M/2M, total nodes 200M/20M, decoded size
  1 GiB/128 MiB, file 1 GiB/64 MiB, header 64/16 KiB, journal frame
  64/8 MiB.

## 4. On-disk formats (all integers little-endian)

### 4.1 Envelope — full snapshots (A, B) and manifests (C)

```
offset  size  field
0       8     magic "VCKPT01\n"
8       4     H = header length (1 ≤ H ≤ maxHeaderBytes)
12      H     header: canonical JSON object, exactly these members:
                {decodedBytes, encoding, format:"vckpt/1", generation, kind:"snapshot"|"manifest",
                 meta:{…}, payloadBytes, payloadSha256, schemaVersion, seq, stateSha256, [mac]}
12+H    4     CRC-32 (zlib polynomial) of bytes [0, 12+H)
16+H    P     payload = encode(canonical document), P = payloadBytes
EOF must be exactly 16+H+P
```
- `payloadSha256` = SHA-256 of the stored payload. `stateSha256` = SHA-256 of
  the decoded canonical document (equal to `payloadSha256` for identity).
- `mac` (keyed mode) = HMAC-SHA-256(key, canonical(header without `mac`)).
  The header commits to both digests, so the MAC covers the payload.
- `generation` **must equal the generation in the file name**. A renamed,
  copied or swapped file is refused.
- Verification order: size → magic → H bound → header CRC → canonical header
  parse (unknown member → `E_UNSUPPORTED_FORMAT`) → MAC → exact length →
  payload SHA-256 → bounded decode → decoded size and SHA-256 → strict
  canonical parse → schema validation → migration.

### 4.2 Journal (B) — `journal-<12-digit gen>.vlog`

```
"VJRNL01\n" frame*
frame   := u32 len | u32 crc32(lenBytes ‖ payload) | payload (canonical JSON)
frame 0 := {base: sha256(state at baseSeq), baseSeq, f:"vlog/1", generation, mode:"ops"|"patch", schemaVersion}
record  := ops   mode: {from, ops:[…], prev, seq}
           patch mode: {from, prev, seq, set:{key: value|null}, top:{every top-level member except the partition}}
chain_0 = H(frame0 payload); chain_i = H(chain_{i-1} as ASCII hex ‖ payload_i); record_i.prev = chain_{i-1}
H = SHA-256, or HMAC-SHA-256(key, ·) in keyed mode
```
Replay rules: a record requires `from == currentSeq` (otherwise
`E_JOURNAL_GAP`) and `prev == chain` (otherwise `E_JOURNAL_CHAIN`). A record
with `seq ≤ currentSeq` is skipped only if it is byte-identical to the
applied record with that `seq` (otherwise `E_JOURNAL_CHAIN`). Op/patch shape
or reducer failure → `E_JOURNAL_CORRUPT`. The header must match the base
state hash, seq, generation, mode and schema version (otherwise
`E_JOURNAL_FOREIGN` / `E_REPLAY_VERSION`).

A record whose canonical size exceeds `maxRecordBytes` is not appended; that
commit becomes a compaction instead. Known inefficiency (measured, not fixed):
in `patch` mode at very high dirty fractions a single record exceeds the
compaction threshold, so every commit appends **and** compacts, writing ≈2× a
full checkpoint. Use `ops` mode, or A, for workloads that rewrite most
entities between commits.

Tail classification after the last valid frame: **torn** = short header,
frame past EOF, all-zero bytes, or CRC failure in a frame ending exactly at
EOF → truncated by default (`tailPolicy`). **corrupt** = a damaged frame
followed by more data → refused by default (`midLogPolicy: 'fail'`, error
carries `lastGoodSeq`). This classification is a heuristic, as in RocksDB's
tail-tolerant mode.

### 4.3 Chunk tree (C) — `manifest-<gen>.vck` + `pack-<gen>.vpk`

- Pack: `"VPACK01\n"` followed by concatenated chunk bytes. A chunk reference
  is `[sha256, packGen, offset, length]` (offset ≥ 8).
- Manifest payload: `{buckets:[ref|null × B], f:"vcas/1", layout:{buckets,
  partition, segmentField, segmentLength}, packs:[gen…], rest:{top-level
  members except partition}}`.
- Bucket chunk: `{e:[[key, head, segs|null], …]}` sorted by key; `head` is
  the value without `segmentField`; `segs = {s:[segment refs], t:[tail]}`.
  Sealed segment = exactly `segmentLength` consecutive array elements at
  index boundaries `kL … (k+1)L−1`. Bucket = FNV-1a-32 over UTF-16 code units
  of the key, mod B.
- The dedup index (hash → reference) only names chunks in packs that are still
  retained; entries are dropped when their pack is pruned.
- Restore reads every referenced pack fully (bounded by `maxFileBytes`), so
  peak restore memory includes dead chunks (≤ 1/(1−gcDeadRatio) × live bytes).
- Restore checks: pack listed in manifest, offsets in range, SHA-256 of
  every chunk, key-to-bucket placement, no duplicate keys, full sealed
  segments, tail shorter than a segment.

## 5. Commit and recovery protocols

**Atomic file write**: create `name.tmp` exclusively → write → `fsync(file)` →
close → `rename(tmp, name)` → `fsync(dir)`. Leftover `*.tmp` files are
deleted on open.

| | commit (acknowledged when `checkpoint()` returns) | recovery |
|---|---|---|
| **A** | atomic write of `snap-<g+1>.vck`; then delete generations outside the newest `retain` verified ones | newest generation that verifies end-to-end; invalid newer files are renamed `*.quarantine` and listed in `fallbacks`; `E_SCHEMA_TOO_NEW`/`E_MIGRATION_REJECTED` are fatal (never a silent fallback) |
| **B** | append one frame + `fsync(journal)`. Compaction (after the triggering record, when journal ≥ `compactRatio` × canonical snapshot bytes): write `snap-<g+1>` and `journal-<g+1>` (header only) with temp+fsync+rename each, then **one** `fsync(dir)`; keep 2 generations | newest valid snapshot → replay its journal → **chain** into later journals whose base hash matches (survives a damaged/deleted newest snapshot without loss); a later journal that holds records but cannot be chained → `E_JOURNAL_FOREIGN`; torn tail truncated; a journal never spans schema versions (after a migrating open the first commit is a compaction) |
| **C** | write `pack-<g+1>` (new chunks only), then the manifest, then one `fsync(dir)`; the **first** commit fsyncs the directory between pack and manifest (no older manifest to fall back to); GC rewrites live chunks when dead bytes > `gcDeadRatio`; packs referenced by any retained manifest are kept | newest manifest whose whole tree verifies; otherwise the previous one |

**Fresh start rule**: an empty directory (no commit-point file) returns
`state: null`. Uncommitted leftovers (packs, or journals with no records and
no snapshot) are reported as `orphans`. A journal *with* records but no
snapshot → `E_NO_VALID_CHECKPOINT`.

## 6. Versioning and migration rules

- Every envelope/journal records its writer `schemaVersion`.
- Reader: `fromVersion > current` → `E_SCHEMA_TOO_NEW` (refuse; no downgrade,
  no fallback to an older generation). `fromVersion < minSupported` or a gap
  in the chain → `E_SCHEMA_UNSUPPORTED`.
- Validate at the claimed version, migrate one step at a time, and validate
  after each step. Migrations are pure (they never mutate input) and either
  represent every authoritative fact or throw `E_MIGRATION_REJECTED` with a
  JSON-pointer `path`. Nothing is written until the whole chain succeeds, so a
  rejection leaves the directory byte-identical.
- Unknown members are **rejected** (`E_SCHEMA_INVALID`), except inside
  declared opaque bags (synthetic model: `ext`, `archive`), which are
  carried verbatim.
- Field changes in the synthetic model: v2 additive (`unit`, `tags`, with
  defaults); v3 removed `legacyCode` (non-null → `archive.legacyCode`; null
  dropped); v3 incompatible change of history value `v` (number) → `vu`
  (integer micro-units), converted only when exact, otherwise rejected.
- Journal `ops` replay uses the reducer of the journal's schema version.
  Changing reducer semantics requires a new schema version.

## 7. Error contract (`CheckpointError.code`)

| code | meaning | integrator action |
|---|---|---|
| `E_IO` | fs call failed (errno in `details`) | inspect errno; for ENOSPC free space, then reopen |
| `E_FSYNC_FAILED` | fsync failed; store poisoned | reopen; never retry fsync on the same handle |
| `E_CLOSED` | store closed or poisoned | reopen |
| `E_TRUNCATED`, `E_TRAILING_DATA`, `E_BAD_MAGIC`, `E_HEADER_CORRUPT`, `E_HASH_MISMATCH`, `E_DECOMPRESS` | container damage | normally seen as `fallbacks` entries; surface them |
| `E_UNSUPPORTED_FORMAT`, `E_UNSUPPORTED_CODEC` | container from a newer library | upgrade the library |
| `E_AUTH_REQUIRED`, `E_AUTH_FAILED` | keyed mode: missing/invalid MAC | treat as tampering; do not import |
| `E_JSON_SYNTAX`, `E_JSON_TYPE`, `E_NONCANONICAL`, `E_FORBIDDEN_KEY`, `E_LIMIT_EXCEEDED` | value-level rejection at a trust boundary | refuse the input |
| `E_SCHEMA_INVALID` | document or op fails its schema | bug or tampering |
| `E_SCHEMA_TOO_NEW` | written by a newer release | upgrade software; do not fall back |
| `E_SCHEMA_UNSUPPORTED` | too old / no migration path | ship the missing migration |
| `E_MIGRATION_REJECTED` | facts not representable in the new schema | fix data or migration; directory untouched |
| `E_JOURNAL_CORRUPT`, `E_JOURNAL_GAP`, `E_JOURNAL_CHAIN`, `E_JOURNAL_FOREIGN`, `E_REPLAY_VERSION` | journal integrity failure; `details.lastGoodSeq` gives the boundary | operator decision: `midLogPolicy:'truncate'` accepts the declared loss |
| `E_CHUNK_MISSING`, `E_CHUNK_CORRUPT`, `E_BAD_REFERENCE` | chunk-tree damage | seen as fallbacks |
| `E_NO_VALID_CHECKPOINT` | files exist but none verify (`details.fallbacks`) | restore from backup; never start fresh automatically |
| `E_STATE_MISMATCH` | replay/verification diverged from memory | non-deterministic reducer or wrong dirty hint |
| `E_SEQ_REGRESSION`, `E_INVALID_ARGUMENT` | caller contract violation | fix caller |

## 8. Trust boundaries

| source | trust | required handling |
|---|---|---|
| Own checkpoint directory | accidental corruption only | CRC + SHA-256 + strict parse + schema validation (always on) |
| Same directory, adversary with write access | hostile | `macKey` (HMAC on envelopes and the journal chain). **Still undetectable**: deletion of the newest commit point, or rollback to an older complete generation. That needs an external monotonic anchor (e.g. last committed `seq` stored elsewhere) |
| Imported files | hostile | `importEnvelope(bytes, {registry, limits: IMPORT_LIMITS, macKey})` |
| Worker-thread messages | hostile | `acceptUntrustedState(value, claimedVersion, {registry})`: strict JSON-compatibility (rejects `undefined`, BigInt, Map/Date/typed arrays, sparse arrays, `-0`, NaN, cycles via depth, `__proto__`), limits, schema upgrade, `structuredClone` detach. Also handle the worker's `messageerror` event: on Node 22.22 a value nested ≥ ~5 000 deep is accepted by `postMessage`, never delivered, and surfaces only as `messageerror` on the receiving side |

## 9. Failure modes and declared recovery boundaries

| event | A | B | C |
|---|---|---|---|
| process crash / SIGKILL mid-commit | last acked or the in-flight commit | same | same |
| power loss (simulated: strict / torn / reorder / zero-fill) | same (exhaustive crash points) | same | same |
| fsync error / ENOSPC mid-commit | store poisoned; reopen → ≥ last ack | same | same |
| newest commit file damaged | previous generation (declared fallback) | **no loss**: chain through previous journal | previous manifest (declared) |
| newest commit file **deleted** | previous generation, **undeclared** (rollback limitation) | no loss when the snapshot is deleted; journal deleted → declared anomaly, its records lost | previous manifest, undeclared |
| journal tail torn | n/a | truncated to the last complete record (declared) | n/a |
| journal damaged mid-file | n/a | refuse with `lastGoodSeq` (or truncate by policy, declared) | n/a |
| newer-version data | refuse | refuse | refuse |
| unrepresentable migration | refuse, directory untouched | same | same |
| two writers | **undefined** (unsupported) | undefined | undefined |
| wrong dirty hint | n/a | `patch`: silent loss unless `verifyCompaction` | silent loss unless no hint is given |

## 10. Adapting without this repository

1. **Pick a candidate** with `research/DECISION.md` §choice matrix. The
   default recommendation is A while full-checkpoint latency and bytes/hour fit
   the budget, and B (`ops`) otherwise.
2. **Write the schema registry**: one validator per version that rejects
   unknown members, plus one pure migration per step that throws on
   unrepresentable facts.
3. **Port the formats** in §3–§4 exactly. The canonicalizer is the only
   delicate piece: test it against RFC 8785 Appendix B and an independent
   implementation.
4. **Implement the `Fsys` interface** for your platform (11 methods, §2 /
   `src/fsys.ts`). Keep the commit order in §5. If your platform cannot fsync
   a directory, document that durability gap; do not paper over it.
5. **Port the crash harness**: an in-memory filesystem that separates visible
   from durable state, plus crash images (`strict`, `torn`, `reorder`,
   `zerofill`, `process`). Enumerate a crash before every mutating operation
   of a small workload, and check `acked ≤ recovered ≤ attempted` and
   byte-identity against an oracle.
6. **Reproduce the mutants** in `scripts/mutation-check.ts` (remove each
   fsync, each integrity check, each migration guard) and confirm your suite
   kills them all.
7. **Measure on your hardware** with `benchmarks/` (fresh process per run,
   cold restore after dropping caches) before choosing thresholds. The
   numbers in this repository are from one virtualized machine (see
   `evidence/environment.json`).

## 11. Extension points not implemented

- ro_compat-style read-only opening of newer data (ext4 feature-flag model).
- Content-defined chunking (FastCDC) for opaque blobs.
- Inter-process locking; asynchronous (worker-backed) API; Windows support.
- External rollback anchor (monotonic counter) to detect deletion of the
  newest generation.
