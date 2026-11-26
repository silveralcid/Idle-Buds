> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/13-versioned-checkpoints-results/13-versioned-checkpoints/research/DECISION.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Decision

**Question.** What is the simplest reliable checkpoint architecture for a
continuously changing, deterministic, JSON-compatible state with growing
histories and multiple software versions?

**Verdict: CONDITIONAL GO.**
- **Default: candidate A**, full validated canonical-JSON checkpoints with
  write-temp → fsync → rename → fsync(dir) and two retained generations.
- **Escalation: candidate B-ops** (snapshot + operation journal with
  ratio-triggered compaction) when A no longer fits the latency, write-volume
  or CPU budget.
- C (content-addressed chunk tree) is **HOLD**; B-patch (entity-replacement
  journal) is **NO-GO** as a general mechanism.
- Compression is optional and off by default.

Conditions and limits are in §5–§7. Every number below comes from
`evidence/` (one virtualized machine; see `evidence/environment.json`).

## 1. What was compared

| id | design | store-specific code* | change capture |
|---|---|---:|---|
| A | full envelope per commit, N=2 generations | 110 lines | none |
| B-ops | snapshot + hash-chained op journal, compaction at 50% | 571 lines (both B modes, incl. framing) | application ops + deterministic reducer per schema version |
| B-patch | same journal, entity-replacement records | (shared with B-ops) | dirty-key hint |
| C | Merkle chunk tree: manifest → 1024 buckets → sealed 64-sample segments, CoW packs, retained-manifest GC | 463 lines | dirty-key hint (or full rehash) |
| +codec | gzip-1/6, brotli-4, zstd-3 on A envelopes | — | — |

\*Non-blank, non-comment lines (`evidence/loc.json`). All candidates also use
the same 974-line shared core (canonical JSON, envelope, atomic write, schema
registry, trust helpers). The line count understates C's real complexity: its
retention/GC rules produced the two subtlest defects found (§4).

## 2. Hypotheses: which survived controlled experiments

Pre-registered in `research/HYPOTHESES.md` (committed before any
implementation). Performance verdicts are computed mechanically by
`benchmarks/report.ts`; correctness verdicts come from the test manifest and
runner evidence.

| id | short claim | verdict | decisive evidence |
|---|---|---|---|
| H1 | A: p95 ≤ 500 ms commit and restore at ≈20 MB; dirty-independent; linear | **REFUTED** | commit p95 589 ms and warm-restore p95 1.46 s exceed 500 ms. The other two parts hold: dirty-independent (6.9%) and linear (20.4 ms/MB + 68 ms, R² = 0.995) |
| H2 | B-ops ≥10× fewer bytes than A at 1%, ≥3× at 10%, ≤1.25× A at 100% | **SURVIVED** | amortized 1093× / 113× / 12× fewer bytes than A |
| H3 | B-patch ≥5× more bytes than B-ops at 1%/10% | **SURVIVED** | 33× / 34× |
| H4 | C between A and B-ops on bytes; restore ≤1.5× A | **SURVIVED** | A/C = 33× at 1%; C/B-ops = 33×; warm restore C/A = 1.18× |
| H5 | compression is not a free win | **SURVIVED** | gzip-6 3.26× smaller at 2.98× CPU; zstd-3 0.97× gzip-6 size at 0.46× its CPU; every codec *raised* wall time (best +29%) |
| H6 | atomic protocol survives every simulated crash point; fsync mutants are caught | **SURVIVED** | 16 880 post-crash recoveries, 0 violations: 13 crash-suite variants × every fs op × 5 crash models (8 280) plus the failure-injection campaign (8 600). Also 80 real SIGKILL trials (79 mid-run, 14 interrupted atomic writes observed, all recovered exactly) and 800 injected fsync/ENOSPC faults (store poisoned, reopened ≥ last ack). fsync mutants M01–M05 killed |
| H7 | journal recovery boundary exact, never silent | **SURVIVED** | Unit tests cover torn tail, mid-log damage (exact `lastGoodSeq`), gap, reorder, identical vs conflicting duplicate, foreign journal and damaged header. Property tests: truncation at any byte, and any single-byte corruption never yields a wrong state. Corruption campaign: 0 wrong states and 0 undeclared losses for both B variants. Mutants M07–M11 and M27 killed |
| H8 | malformed corpus rejected with typed codes, bounded resources; unkeyed SHA-256 does not stop forgery, HMAC does | **SURVIVED** | 38 import files (3 valid controls) + 17 damaged directories (simulated and real fs) + 17 hostile worker messages (+1 valid control) all handled as declared, each < 2 s, inside a 192 MiB heap. A 16 M-deep nesting bomb is refused inside 128 MiB. The unkeyed recomputed-hash forgery was ACCEPTED and the keyed one rejected, exactly as predicted. 1 600 random-corruption trials: 0 wrong states, 0 untyped errors. Mutants M12–M17, M22, M24, M25 killed |
| H9 | migrations total-or-rejecting and fact-preserving; newer data refused | **SURVIVED** | fast-check: 300 representable + 300 mixed + 100 monotonicity documents. Composed == stepwise; every leaf fact present (removed field relocated to `archive`); unrepresentable values rejected with the first offending path; input never mutated. Golden v1/v2→v3 fixtures. All four stores refuse newer data and leave the directory byte-identical after a rejection. Mutants M18–M21, M23 killed |
| H10 | determinism and reproducible continuation | **SURVIVED** | 128 471-operation v1→v2→v3 oracle session replayed by every store with 14–31 restarts and 2–20 mid-commit crashes: final state byte-identical to the uninterrupted oracle. Crash-point continuation checks pass. Envelope and state bytes are identical across processes. Fixtures regenerate byte-for-byte |
| H11 | B-ops worst-case restore ≤ 2× A | **SURVIVED** | paired, journal at 99% of threshold: warm 1.65×, cold 1.40× |
| H12 | A peak RSS ≤ 4× state; B/C commits need less memory than A | **REFUTED** (first clause) | pre-registered whole-process metric: A = 5.28× (4.3–6.9× across dirty fractions, including workload memory). The supplementary per-commit sampler gives A +38.6 MiB (1.99× state) vs B-ops 0.1 MiB and C ≈2 MiB, so the second clause holds |

## 3. Measured costs (medium profile: 10 000 entities, ≈19.5 MiB canonical state)

Medians over 5 repetitions × 10 commits, each run in a fresh process
(`evidence/benchmarks.md` has p95/p99/max, repetition spread, CPU and the
small/growth profiles).

| | commit wall (1% / 10% / 100% dirty) | bytes per commit | amortized bytes vs A | warm / cold restore |
|---|---|---|---|---|
| A | 454 / 462 / 485 ms | 19.5–20.8 MiB | 1 | 0.77–0.88 s / 1.11–1.25 s |
| B-ops | **1.3 / 3.6 / 39.5 ms** | 6.1 KiB / 59 KiB / 592 KiB | 1/1093 · 1/113 · 1/12 | 0.81–1.25 s / 1.15–1.64 s; worst case 1.43 s / 1.73 s |
| B-patch | 4.8 / 47 / 1177 ms | 201 KiB / 5.9 MiB / 41.5 MiB | 1/33 · 1/3.3 · **2×** | 0.87–0.98 s / 1.23–1.31 s |
| C (1024 buckets) | 58 / 324 / 609 ms | 604 KiB / 5.1 MiB / 6.1 MiB | 1/33 · 1/3.8 · 1/3.4 | 0.91–1.05 s / 1.00–1.11 s |
| C without hint | 437 / 473 / 568 ms | same as C | same as C | — |

Further measured facts:
- **Where A's time goes** (micro-benchmarks, 19.4 MiB). Canonicalize 307 ms
  (native `JSON.stringify` is 187 ms). SHA-256 56 ms. Write + fsync of a
  fresh file 46 ms. Strict parse 619 ms, of which 177 ms is the
  canonical-form re-check. Schema validation 40 ms. On this device fsync is
  ≈13% of commit time (`A-nofsync` 400 ms vs 462 ms) and validation ≈6%
  (`A-novalidate` 433 ms).
- **Growth.** A's commit grows from 170 ms at 5.7 MiB to 1.30 s at 58.7 MiB.
  B-ops stays at 3.5–4.6 ms. C goes from 132 ms to 829 ms.
- **C bucket count.** 4096–16384 buckets cut C to 31–35 ms / 0.48–0.75 MiB
  at 1% and 146–162 ms / 1.4–1.7 MiB at 10%. That is still 23–122× more bytes
  than B-ops' per-commit bytes, because the root manifest plus dirty-bucket rewrites form a
  floor.
- **Compression on A** (10% dirty). zstd-3: 3.38× smaller, wall +29%, CPU
  1.37×. gzip-1: 2.87×, +36%. gzip-6: 3.26×, +172%. brotli-4: 3.56×, +149%.
  Restore +4–10% warm. On this storage, compression never reduced wall time.
- **Memory per steady commit** (RSS sampled at 1 ms). A +38.6 MiB
  (≈2× state). B-ops ≤0.6 MiB. C ≈2 MiB. B-patch at 100%: +110 MiB.

## 4. Defects found by the research process (all fixed; each guarded by a test, most by a mutant)

| # | found by | defect | consequence before the fix |
|---|---|---|---|
| 1 | crash enumeration, `reorder` model | C's first commit renamed pack and manifest under one directory fsync | crash in the very first commit → refused to open instead of an empty start |
| 2 | crash enumeration | B/C treated record-less leftovers with no commit point as unrecoverable | same |
| 3 | trust-boundary review | B keyed mode used an unkeyed SHA-256 journal chain | records could be forged by anyone with write access |
| 4 | corruption campaign (swap) | envelope `generation` not bound to the file name (A/B/C) | swapped/renamed generations → silent rollback |
| 5 | corruption campaign (delete) | a deleted active B journal was not reported | silent loss of journal records |
| 6 | mutation check (M06 survived once) | test gap for GC retention of the fallback manifest's packs | a regression would have passed the suite |
| 7 | adversarial review | C's dedup index kept chunks whose pack had been pruned | content reappearing later is committed as a reference to a deleted pack: an **acknowledged commit that cannot be restored** |
| 8 | adversarial review | B-patch replay kept top-level members the application removed | divergence for generic state shapes |
| 9 | harness self-review | SIGKILL runner read ACKs before stdout drained | weaker durability check |
| 10 | benchmark self-review | variant `C-nohint` still passed the hint | duplicated numbers (excluded; `C-rehash` measured instead) |
| 11 | worker test | assumed a dropped worker message is silent | on Node 22.22 the receiver gets `messageerror`; test corrected |

Defect 7 and defect 1 are C's retention/ordering hazards, and neither was
visible in 100k-operation sessions. That is the practical meaning of
"C is more complex" here.

## 5. Conservative choice matrix

Budgets measured on target hardware are required. The constants below are from
this VM.

| situation | choose | why / evidence |
|---|---|---|
| A's commit (≈20 ms/MB + 70 ms here) fits the latency budget, state × commits/hour fits the write budget, and restore (≈40 ms/MB warm, ≈60 ms/MB cold here) fits the recovery-time objective | **A**, identity encoding, `retain: 2` | simplest (110 store-specific lines), every crash/corruption/migration check passed, deterministic bytes |
| A exceeds the latency or write budget (large state, frequent commits) **and** the app has deterministic ops with a reducer per schema version | **B-ops**, `compactRatio: 0.5`, `verifyCompaction: true` in CI/staging | 1.3–40 ms commits, 12–1093× fewer bytes, worst-case restore ≤ 1.65× A (H2, H11). Requires op determinism; a journal never spans versions |
| no deterministic op log; dirty hints available | **A** (B-patch only if dirty ≤ 1% and entities are small) | B-patch is dominated by B-ops (33×) and costs 2× A at 100% dirty (§3) |
| need deduplication across many retained versions, or partial restore of large cold histories | **C — HOLD** | writes 23–122× more than B-ops and has the subtlest GC hazards (§4). Requires a dedicated review before production |
| storage or backup bandwidth is the bottleneck | A + **zstd-3** (accept Node "experimental" API) or **gzip-1** (stable) | 3.4× / 2.9× smaller, +29% / +36% commit wall (H5) |
| other parties can write the directory, or state is imported | `macKey` + `IMPORT_LIMITS`, plus an **external monotonic anchor** for rollback detection | HMAC stops forgery (H8). Deletion of the newest generation is undetectable without an anchor |
| recovery-time objective below ≈40 ms/MB × state | none of these | restore is parse-bound for every candidate. Shrink or partition the state |

## 6. Production applicability limits

- **Measured on one virtualized x86-64 VM** (4 vCPU, ext4 on virtio with a
  host write-back cache). fsync latency here (0.7 ms) is a lower bound for
  physical disks, and absolute numbers will differ. Re-run `benchmarks/` on
  target hardware before setting budgets.
- **Power loss was not tested on real hardware.** It was modelled by `SimFs`
  (strict/torn/reorder/zero-fill), and real-process crashes were tested by
  SIGKILL, which leaves the page cache intact. Devices that lie about flushes
  defeat any software protocol.
- **Single writer, local POSIX filesystem.** No locking is provided. NFS/SMB,
  Windows (no directory fsync) and browsers (OPFS) were not tested.
- **Whole state in memory.** A needs about 2× state transiently per commit
  and 4–7× as process peak. Restore of every candidate is bounded by JSON
  parsing and validation: ≈25–35 MB/s end-to-end here, of which `JSON.parse`
  alone is ≈69 MB/s.
- **Synchronous API**: a 20 MB A commit blocks its thread for ≈0.5 s. Use a
  worker thread if that matters, and handle `messageerror` there.
- **Synthetic workload.** Random-walk histories and 10 000 small entities.
  Compression ratios, entity sizes and dirty patterns of real data will differ.
- **Toolchain.** Node ≥ 22.18 (type stripping). zstd is experimental in Node
  22. Canonical form depends on ECMAScript `Number#toString`, which is
  standardised, but ports to other languages need an RFC 8785 library.

## 7. Risks of the recommendation

1. **Budget creep.** A's cost grows linearly with state size, and growing
   histories make that inevitable. Monitor checkpoint duration and switch to
   B-ops (same envelope format for snapshots, so migration is mechanical)
   before the budget is hit.
2. **Determinism discipline for B-ops.** A reducer change without a
   schema-version bump makes replay diverge. Mitigated by `verifyCompaction`
   (detects divergence; tested) and the rule that journals never span
   versions.
3. **Dirty-hint correctness** (B-patch, C). A missed key is silent loss. Only
   use hints from a single, tested mutation path, or omit them.
4. **Rollback/deletion.** Without an external anchor, deleting the newest
   commit file returns an older exact state, undeclared for A and C. B
   survives deletion of its newest snapshot without loss (journal chaining).
5. **Operator handling.** Recovery reports (`fallbacks`, `anomalies`,
   `quarantined`, `journal.truncated`) must be surfaced. The library never
   starts fresh on damaged directories (`E_NO_VALID_CHECKPOINT`).

## 8. Not pursued / blocked

- Content-defined chunking (FastCDC): not needed for keyed JSON with
  append-only arrays (structural chunking gives stable boundaries).
  Unmeasured.
- ro_compat-style read-only opening of newer data: documented as an
  extension point.
- Real power-loss rigs, other OSes, network filesystems, browsers:
  **BLOCKED** by the environment (single Linux VM, no hardware access).
