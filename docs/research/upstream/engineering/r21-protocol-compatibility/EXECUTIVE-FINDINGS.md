> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/21-event-protocol-rollout-results/21-event-protocol-rollout/EXECUTIVE-FINDINGS.md); [scope, corrections and rights](../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Executive findings

**Question.** How do you roll out independently deployed clients and servers
(CRM webhook consumers, marketing-automation APIs, collaboration backends,
embedded sales widgets) when a new capability needs negotiation and one event
schema changes incompatibly, without any consumer silently misreading data?

**Answer in one line.** Pin an exact event version per negotiated protocol
generation. Convert through a canonical model with **honest fidelity
classification**: lossy conversions are withheld and turned into explicit
"unavailable", never approximated. Recompute capabilities at every handshake.
Resume only from the durable log and only at the same generation. Ship
storage-guard readers before writers. Gate rollouts on consumer-reported
rejects **plus** an adapter round-trip self-check, because a silently lossy
adapter is invisible to every consumer-side signal.

Recommendation: **CONDITIONAL GO** for adopting the pattern and the
`protocol-spec` core (§5). All evidence is synthetic and comes from one
machine.

## 1. What was built and executed

- A TypeScript reference package (no runtime dependencies): three protocol
  generations; the incompatible P3 `amount` unit change; negotiation with a
  legacy field plus range extension; capability policy with epochs and cohort
  hashing; hub-and-spoke adapters; idempotent receipts; LSN resume; a storage
  guard; a deterministic simulator; a minimal RFC 6455 server; a staged
  rollout emulator; and an executed compatibility matrix generator.
- An independent oracle that recomputes negotiation, folds ground truth from
  every accepted write, and checks every client-applied event, snapshot and
  final view.
- Executed at commit `050e58d` (full manifest in `raw-results/manifest.json`):
  - 117 test cases (43 unit, 32 integration, 36 adversarial, 6 real-browser), all passing.
  - 36 executed matrix cells, 6 live transitions and 9 data-coexistence runs.
  - 7 rollout plans × 3 seeds.
  - 540 exhaustive mixed-version runs, 400 chaos runs, 75,000 fuzzed client
    frames and 10,000 fuzzed server commands.
  - A seeded-fault kill matrix (20 known-bad implementations).
  - 3 multi-process real-socket deploy/rollback runs, benchmarks, and
    Chromium 141 experiments.

## 2. What was learned (measured)

1. **Exact version checks are what prevent silent misreading.** A shape-only
   decoder (CF1) accepted mislabeled P3 frames and turned $1,234.50 into
   $123,450.00. The correct client rejected 100% of mislabeled frames in
   injection tests and fuzzing (0 invariant violations in 75,000 mutated
   frames). `crit` must-understand tokens did not help deployed P1/P2 readers:
   by design they ignored unknown `crit`, as the fuzzer confirmed. So
   must-understand has to exist from the first generation (compare the TLS
   frozen-field lesson, S41).
2. **Withholding beats approximating.** In every one of 36 executed client ×
   server cells across 4 policies there were 0 UNSAFE cells. Old consumers saw
   `resync` + `unavailable: requires_newer_client` for EUR amounts, the
   stalled stage and v1 unassignments. The cost: legacy P1 consumers used
   **1.5–2.0× the bytes per applied event** of P3 consumers in a mixed
   workload (B1).
3. **Rollback is only as safe as the rollback target's reader.** Over 10 seeds
   each: S3→S2 (guard-aware) was UNSAFE 0/10; S3→S1 (pre-guard) was UNSAFE
   9/10. S1 serving rows written at generation 3 was UNSAFE in the coexistence
   test. The emulator's pre-flight blocked the S1 rollback in 3/3 seeds. When
   forced, G0 and G5 caught it and rolled back (3/3).
4. **Canary telemetry is blind to silent semantic loss.** A bad build that
   skipped downcasts (SF1) was caught by the consumer ack-reject gate (G2) in
   3/3 seeds. A bad build that approximated lossy changes (SF2) passed every
   consumer-observable gate in 3/3 seeds (`canary-sf2-no-self-check`
   COMPLETED with 14 / 22 / 217 oracle violations). The **adapter round-trip
   self-check on adapted events** caught SF2 in 0/5 seeds at sample rate 0,
   2/5 at 0.01, 4/5 at 0.1 and 5/5 at 1.0. It flagged even the seed where no
   client happened to be harmed. Cost: about 1.8 µs per adapted event (B2).
5. **The oracle found three real design bugs during development**, each now
   covered by a seeded fault and a test:
   - resuming from a per-connection buffer skipped changes made while the
     client was offline (`silent_staleness`) → resume from the durable LSN
     log (SF10);
   - resuming across a P1→P2 generation change left newly modelled fields
     stale but "fresh" → same-generation resume rule on both sides (SF11, CF9);
   - a new client rejected by a legacy server during a rolling deploy was
     stranded forever, because P1 rejects carry no retry hint → clients infer
     "server too old" and back off.

   It also found two lab-harness bugs (close overtaking in-flight data; idle
   time invented by `settle`). Those were fixed before the published run.
6. **Stale browser caches are real in Chromium 141.** After a breaking deploy,
   `page.reload()` re-ran a `max-age=3600` or `immutable` unversioned entry
   script **without any network request**. The stale C1 build connected, was
   refused (`upgrade_required`) and recovered through a cache-busting reload
   in 265 ms / 242 ms. A `no-cache` entry or a content-hashed URL loaded the
   new build directly (87 ms / 81 ms). Chromium failed the WebSocket (`error`,
   close 1006) when the server selected no subprotocol or an unoffered one,
   consistent with the WHATWG standard (S43).
7. **Sunsets must be gated on observed share.** With a long-lived stale-cache
   tail, the P1-sunset pre-gate held the plan in 3/3 seeds. With fast reloads
   and a 2% stale share it passed in 3/3.
8. **Transport contract matters.** The LSN resume cursor is exact under
   per-connection FIFO: 200/200 in-contract chaos runs (deploys, policy flips,
   reloads, duplicate deliveries, connection drops) had 0 violations. With
   silent drops or in-connection reordering (out of contract), 33/100 runs
   showed staleness without the anti-entropy digest. With the P2+ digest that
   fell to 7/100, **all on P1 clients**, which cannot use it.
9. **Node 22's built-in WebSocket can hang naive reconnect loops.** In v22.22.0
   (undici 6.23.0) a refused or pre-handshake-reset connection fired `error`
   but never `close` and stayed `CONNECTING` for at least 5 s. The adapter
   treats `error` as close, and the client has a handshake timeout.
10. **Cost of safety (B2, this VM).**
    - Full validated decode: 5.5 µs vs 1.5 µs for bare `JSON.parse` (3.73×,
      95% CI 3.60–3.75).
    - Downcast encode: no slower than native (0.96×).
    - Receipts: 5.6 µs per command.
    - The envelope is about 56% of a small event's bytes. Batch acks save
      18.5% of ack bytes. GREASE costs about 7% of bytes.

## 3. Seeded-fault evidence (negative tests)

See `TEST-RESULTS.md` §3 and `raw-results/faults/fault-kill-matrix.json`.
- Baseline: all 111 unit/integration/adversarial tests are green.
- **20/20 seeded faults are killed.** Each known-bad implementation makes 1–20
  of the 111 tests fail. Faults: CF1–CF9 on the client and SF1–SF11 on the
  server, covering shape-only decoding, null-as-absent, enum coercion, LWW
  patching, cached grants, missing dedupe, defaulted mandatory fields,
  unverified versions, adapter bypass, silent lossy adapters, trusted
  grants, missing receipts, an ignored storage guard, an ignored floor,
  encode-once fan-out, unenforced features, missing precision checks and two
  resume bugs.
- 10/20 are also caught by the matrix or emulator tools. For example, SF2
  produces 17 UNSAFE cells and makes the `standard` plan roll back with
  2,832 oracle violations.
- In a development run SF10 initially survived (19/20). Its test was
  corrected before the published run (TEST-RESULTS.md §3).

## 4. Counterarguments and limits

- **"Just make every change additive."** For new optional fields, that is the
  right answer: the tolerant readers here handle them, and the extra layers
  cost little. But AIP-180 (S16) and Kubernetes (S19) both document changes
  that keep the same shape and break meaning (format changes, new enum
  values). The P3 unit change is exactly that, and additivity cannot express
  "this number now means something else".
- **"Use a new event type instead of a new generation."** That is a valid
  alternative (CloudEvents primer, S50), and dual-publishing old and new types
  avoids adapters. It does double the fan-out and still needs per-consumer
  routing. The generation table here is equivalent if each type is versioned
  independently.
- **"Withholding degrades old clients too much."** That is measurable (B1:
  1.5–2× bytes, explicit "unavailable" views). The alternative, showing an
  approximate value, is the failure mode this lane exists to prevent.
  Ramping lossy-producing features by capability limits the impact.
- **The oracle is not available in production.** That is correct. G0 is
  lab-only. The production-viable controls are G1 (self-check), G2–G5 and
  shadow consumers. The detection-rate table shows what G1 buys at each
  sample rate.
- **Synthetic evidence.**
  - Cohort sizes, reload rates and stale-cache shares are assumptions.
  - Real CDN/browser behaviour beyond one headless Chromium build was not
    measured.
  - Mobile networks, real CRM tenants and human reload behaviour were not
    studied.
  - The literature review was limited to GitHub-hosted official sources:
    31 consulted, 25 blocked (listed).

## 5. Recommendation: CONDITIONAL GO

Adopt the pattern (`release-playbook.md`) and the `protocol-spec` core
(`INTEGRATION-CONTRACT.md`) for new or versionable event channels, under these
conditions:

1. Ship `range`, `caps`, explicit presence and `crit` from the first
   generation you control. Retrofits cannot protect deployed readers.
2. Make the storage-guard pre-flight and the matrix requirement check
   (exit 2/3) **deploy blockers**.
3. Run the round-trip self-check on 100% of adapted events during canaries.
   Add a shadow consumer for G0 where the domain allows.
4. Calibrate gate thresholds and cohort assumptions on real telemetry before
   the first production sunset.
5. Treat the minimal WebSocket server as lab-only. Port the protocol layer
   onto your hardened transport.

**HOLD** on using the LSN resume cursor for unordered paths such as webhooks.
Use per-entity revisions plus reconciliation there.
