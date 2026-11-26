# Earlier engineering research

**Historical research only.** Eighteen complete authored documents from seven studies were copied from the same [pinned snapshot](../README.md). The original catalog/audit describes experiments from `04bf510b60e46a5a937a7e660851df9de5c4aa69` in October 2026. Current storage does not refresh those results. No donor test or benchmark was rerun, and no executable packages or dependencies were imported.

| Topic | Copied records | Qualification |
|---|---|---|
| R01: numbers | [Integration guide](r01-numeric-reproducibility/INTEGRATION_GUIDE.md), [notices](r01-numeric-reproducibility/LICENSES.md) | Exact numerical profiles change semantics; historical cross-runtime parity was blocked. Rust/WASM examples are reference, not the Idle Buds stack. |
| R03: failed operations | [Integration guide](r03-transaction-isolation/INTEGRATION_GUIDE.md), [threat model](r03-transaction-isolation/research/THREAT_MODEL.md), [notices](r03-transaction-isolation/LICENSES.md) | Rollback/aliasing invariants are useful; donor storage, IDs, random-number generation and deliberately faulty controls were not imported. |
| R13: save recovery | [Contract](r13-save-recovery/integration/CONTRACT.md), [decision/results](r13-save-recovery/research/DECISION.md) | Assumes one writer on local POSIX storage; does not qualify browser or PostgreSQL durability. |
| R21: protocol compatibility | [Contract](r21-protocol-compatibility/INTEGRATION-CONTRACT.md), [findings](r21-protocol-compatibility/EXECUTIVE-FINDINGS.md) | Mixed-version semantics need testing; a handshake does not establish compatibility. No transport/rollout framework selected. |
| R30: balance experiments | [Results](r30-balance-experiments/RESULTS.md), [contract](r30-balance-experiments/docs/CONTRACT.md), [limits](r30-balance-experiments/docs/LIMITATIONS.md) | Paired seeds and complete outcomes support comparison; synthetic effects do not prove fun, retention or real balance. |
| R31: offline catch-up | [Results](r31-offline-catchup/RESULTS.md), [contract](r31-offline-catchup/docs/CONTRACT.md), [limits](r31-offline-catchup/docs/LIMITATIONS.md) | Budget counts events, not CPU time. Receipt/ID history is unbounded; external exactly-once effects are not established. |
| R34: economy conservation | [Results](r34-economy-conservation/RESULTS.md), [contract](r34-economy-conservation/docs/CONTRACT.md), [limits](r34-economy-conservation/docs/LIMITATIONS.md) | Proposal-only; execution intentionally throws. Pricing/matching policies are unapproved research. |

Donor “GO/HOLD/REJECT,” adoption gates, example commands and backticked filenames remain scoped to their source study. Referenced implementation files may be deliberately excluded. None of these documents override the [approved game design](../../../design/design-bible.md) or create a Current Release Specification.

Selection considered the older catalog and evidence audit covering 35 packages/34 assignments. Other-project handoffs, issue mappings, rendering/AI/social frameworks, raw traces and incomplete R27 were excluded. Reuse conceptual test requirements when an authorized implementation needs them; avoid importing an entire donor architecture to solve a smaller problem.
