# Execution plan: API and MCP experiment lab

**Status:** IMPLEMENTED AND LOCALLY VERIFIED; live PR checks own hosted qualification and merge
**Owner:** integration lead
**Base:** `1c9c3877af6d455f51c992cdba5d61a9a5bb7c2b` (`main`)
**Authorization:** November 26, 2026 owner instruction: “Implement all you can directly to repo, merge right away.” This authorizes the agreed local lab, tests, documentation, dependencies, one PR and verified merge. It does not request deployment or paid model runs.

## Accepted result

Reuse the authoritative game rules and player HTTP API. Deliver a typed local lab API and CLI, five thin MCP tools, named current-mechanics scenarios, bounded policies and exploration, durable per-run reports, replay and comparisons. Correct stale experiment assumptions. Keep normal game behavior and account login intact. Human/device qualification remains an observed-play task.

## Ownership and dependency order

| Lane | Exclusive paths | Dependency | Exit evidence |
|---|---|---|---|
| Integration | shared `tools/lab/types.ts`, package/config/CI/docs, CLI, content checks | current main | registered commands, local and hosted checks, reviewed PR merge |
| Runner | `tools/lab/runner.ts`, `tools/lab/report.ts`, `tools/lab/provenance.ts`, `tests/unit/lab-runner.test.ts` | shared scenario contract | bounded run, passive snapshots, trace/replay, failure and budget evidence |
| Scenarios | `tools/lab/scenarios.ts`, `tools/lab/policies.ts`, `tools/experiments.ts`, `tests/unit/lab-scenarios.test.ts` | shared scenario contract | production, full bag, replacement, offline, policies and bounded action exploration |
| MCP | `tools/player-client.ts`, `tools/mcp.ts`, `tools/mcp-schemas.ts`, `tests/integration/lab-mcp.test.ts`, `tests/tools/mcp.test.ts` | shared lab API after runner contract | SDK client round trip, actual authenticated HTTP, receipts and hidden-state boundaries |

Agents share this isolated branch with disjoint file ownership; integration lead owns all commits and publishing. Contract changes are coordinated before downstream edits.

## Acceptance and stopping point

CLI and real MCP invocation run the same named scenario. Identical inputs reproduce normalized gameplay evidence. Reports retain source/fixture/policy identity and individual runs. Failure, budget exhaustion and unavailable configuration are explicit. Passive inspection preserves offline allowance; request retries preserve command UUIDs. Existing relevant tests pass, and one current design question receives an observed report. Stop optional expansion when these workflows are usable and qualified.

## Verification and rollback

Focused rules/MCP/database checks, lint/typecheck/build, registered application and repository checks, hosted CI on the published head. Use guarded disposable databases. No normal save resets, remote lab endpoints, model spend or scheduled jobs. Revert the lab commit to roll back; no production save migration is planned.

## Observed handoff

[Implementation evidence](../../evidence/experiment-lab-2026-11-26.md) records delivered contracts, local checks and the bounded production finding. [Usage](../../engineering/EXPERIMENT-LAB.md) documents the actual commands. The implementation PR owns final exact-head hosted checks and merge. No design interview or new service is needed to use this increment.
