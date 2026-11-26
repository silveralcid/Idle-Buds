> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/deterministic-deadline-catchup-results/docs/CONTRACT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# API and serialized contract

## Ordering and time

Logical time is a non-negative JavaScript safe integer. No host clock is read. Every event has a unique, non-empty string `id`, integer `dueAt`, safe-integer `priority`, JSON payload, and assigned insertion `sequence`. Smaller `dueAt` runs first; equal-time events use lower numeric priority first, then lower sequence first. The sequence is assigned by successful scheduling, so same-time recursive events follow already queued events of equal priority.

## API

- `new DeadlineIndex(now = 0)` starts at committed logical time `now`.
- `schedule({id,dueAt,priority,payload})` inserts an event at or beyond the committed time/frontier.
- `cancel(id)` removes an active event. Reuse of an ID is rejected even after cancellation or application.
- `reschedule(oldId,replacement)` cancels the active event and inserts a new unique ID.
- `applyUntil(targetTime,budget,handler)` applies at most `budget` due events. It returns ordered receipts and either `complete` or `paused` with a version-1 cursor. Resuming requires the same target; budget applies per invocation. A handler returns zero or more new event inputs and must be deterministic, synchronous, and side-effect-free.
- `assertReadableThrough(t)` permits reads only through committed time and only when no active event is due at or before `t`.
- `snapshot()` and `DeadlineIndex.restore(snapshot)` support JSON serialization and resume. Snapshots contain schema version, committed time, next insertion sequence, active events, used-ID ledger, receipts, and cursor.

A handler-created event may be due at the current event's deadline or later, never earlier than the last applied deadline. `frontierTime` in the cursor captures this boundary. The index does not expose a partially advanced logical time: while any catch-up is paused, `now` remains at its pre-call value. This conservative barrier can block reads even when some events were applied; it avoids exposing a time whose due set has not been fully drained.

## Exactly-once meaning

The index guarantees each applied event appears once in its in-memory receipt history and that a serialized/restored cursor continues after that history. Exactly-once effects outside the index require the consumer to commit the reducer state and index snapshot atomically or use receipt IDs as idempotency keys. A crash between an external side effect and snapshot persistence can repeat that side effect.
