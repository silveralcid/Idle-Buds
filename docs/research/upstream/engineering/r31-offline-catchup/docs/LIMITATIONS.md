> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/deterministic-deadline-catchup-results/docs/LIMITATIONS.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Limitations and unresolved risks

- In-memory TypeScript reference only; no durable store, distributed lock, concurrency control, or transactional reducer.
- Handlers must be pure and deterministic. External effects are at-least-once unless the caller provides atomic persistence/idempotency.
- `snapshot()` stores receipt history and used IDs in full. Resume serialization grows with total history; the benchmark reports this cost. Long-running deployments should consider an append-only receipt journal plus validated checkpoint format before adopting this design.
- Logical time uses safe integer ticks. Fractional timestamps, calendar rules, time zones, leap seconds, and wall-clock drift are intentionally out of scope.
- Budgets bound event count, not CPU time, heap pressure, callback cost, or wall-clock duration. One expensive reducer can exceed a service latency goal.
- The index is single-threaded and not reentrant. Do not call `applyUntil` recursively from a handler.
- The JSON contract is version 1 and has no migration framework. Payload schemas belong to the caller.
- Performance is VM- and workload-specific. This work measures this heap only; ordered maps, wheels, bucket queues, and sorted arrays remain unmeasured alternatives.
