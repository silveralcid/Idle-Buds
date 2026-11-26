> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/deterministic-deadline-catchup-results/RESULTS.md); [scope, corrections and rights](../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Results

## Decision

**CONDITIONAL GO** for a synthetic reference component. The indexed heap gives deterministic ordering, bounded event-count application, and resumable state in the tested cases. Production adoption remains conditional on atomic persistence/idempotency and representative comparisons with ordered maps, wheels, and bucket queues.

## Verification

The audited run passed strict TypeScript checking and **22/22 tests**. The seeded equivalence test ran 40 fixtures. The deliberately defective coarse-sampling baseline demonstrably omitted deadlines 4 and 12, while the indexed queue applied all three fixture deadlines. The synthetic CLI completed with seven ordered receipts and final state showing an expired allocation, approved request, started work, three maintenance cycles, and its dependent deadline check. The test suite also checks seeded cancellation ordering, strict JSON payloads, restore-ledger integrity, and callback reentrancy.

The benchmark completed 96 executions: 24 paired warmups and 72 recorded measurements (3 repetitions × 4 workloads × 3 sizes × 2 modes). The warmup pair ran before measurements for each cell. Measured mode order alternated one-shot/chunked and chunked/one-shot by repetition. Chunked budgets were `min(250000, ceil(n/4))`, producing at most four catch-up batches for each standard event count. Mass-cancellation duration and CPU are reported separately from catch-up. Exact observations and run details are in `results/benchmarks.csv` and `results/manifest.json`.

## Measured catch-up comparison

The table reports median per-run nanoseconds per applied event over three repetitions; chunked time includes snapshot/restore. Batch p50 and p95 are medians of each repetition's within-run batch percentiles. Resume overhead is the median cumulative JSON snapshot and restore time. Cancellation fields are medians from the one-shot 50% cancellation workload, measured before catch-up.

| Initial deadlines | Workload | One-shot ns/due | Bounded/resumed ns/due | Chunk batch p50 (ms) | Chunk batch p95 (ms) | Resume overhead (ms) | 50% cancellation (ms) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 10,000 | Sparse | 2,013 | 9,794 | 5.16 | 13.49 | 66 | — |
| 10,000 | Clustered | 2,310 | 6,968 | 3.52 | 6.00 | 53 | — |
| 10,000 | Cascade-heavy | 3,440 | 11,277 | 6.96 | 11.01 | 92 | — |
| 10,000 | 50% cancellation | 1,883 | 4,286 | 2.71 | 5.16 | 12 | 2.12 |
| 100,000 | Sparse | 4,283 | 10,857 | 79.87 | 120.75 | 710 | — |
| 100,000 | Clustered | 5,232 | 11,876 | 78.81 | 161.70 | 749 | — |
| 100,000 | Cascade-heavy | 7,479 | 17,190 | 128.50 | 171.00 | 1,354 | — |
| 100,000 | 50% cancellation | 4,094 | 7,100 | 58.14 | 137.32 | 160 | 40.94 |
| 1,000,000 | Sparse | 13,106 | 25,742 | 1,569.33 | 3,979.39 | 17,207 | — |
| 1,000,000 | Clustered | 13,643 | 23,415 | 1,175.77 | 3,780.33 | 14,351 | — |
| 1,000,000 | Cascade-heavy | 13,103 | 26,430 | 1,765.33 | 3,653.73 | 21,326 | — |
| 1,000,000 | 50% cancellation | 10,190 | 13,294 | 816.58 | 2,881.51 | 2,955 | 975.82 |

These measurements compare drain modes of the same heap, not different queue structures. Full snapshot/restore makes chunked mode about 1.3–4.9× slower per applied event here. At 1m, snapshot/restore costs about 14.4–21.3 seconds for the non-cancellation workloads in these fixtures. This measured cost makes full-snapshot resume unattractive for frequent catch-up checkpoints at this scale without a journal/checkpoint redesign. It does not negate bounded event-count behavior; event budgets alone do not provide a wall-clock latency bound. Cancellation timing is separately visible: canceling half of one million queued events took a median 976 ms on this VM.

Raw CSV values include per-run elapsed time, per-due cost, per-call p50/p95, resume overhead, endpoint heap delta, CPU, processed count, and cancellation cost. Endpoint V8 heap deltas can be negative after garbage collection and are not peak-memory measurements. CPU and heap figures are environment-specific. Only three measured repetitions were used; small differences should be treated cautiously. No gains are extrapolated beyond this VM.

## Alternatives and reliability

The implementation uses an indexed binary min-heap with an ID-to-position map. Ordered maps offer deterministic ordered operations but were not implemented or benchmarked. Bucket queues and timing wheels can reduce overhead for constrained or approximate time domains, but their granularity and range assumptions do not fit this exact logical-time contract without additional design. Bounded draining is supported as a processing policy, independent of the underlying index. These alternatives are discussed in `research/` and `docs/DECISION.md`; they remain unmeasured predictions, not results.

Reliability checks include seeded one-shot/chunked receipt equality, byte-equal final snapshots, restore/replay, stable priority/sequence ordering, cancellation/reschedule, recursive due-now events, equal-time storms, overflow, malformed snapshots, strict JSON payloads, handler reentrancy rejection, and read barriers. Callback purity plus atomic persistence/idempotency remain caller obligations.

The fixed-step sampling baseline is rejected by a concrete counterexample. External source retrieval was blocked by an HTTP CONNECT 403, so source metadata requires reviewer verification; source-backed claims and uncertainty are identified in `research/SOURCES.md`.

## Limits

This is a single-threaded in-memory component, not a durable journal, distributed lock, transaction, wall-clock service, or universal worker runtime. Receipts and used IDs are copied in every snapshot. See `docs/LIMITATIONS.md`, `docs/CONTRACT.md`, and `research/RECOMMENDATION.md`.
