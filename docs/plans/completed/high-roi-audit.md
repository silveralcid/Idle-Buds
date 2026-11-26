# High-ROI repository audit and fixes

**Status:** COMPLETE implementation and bounded local verification, November 26, 2026. Live Git/PR state owns integration status.
**Owner:** integration lead for the owner's audit request.
**Base:** `46a0e89` on `main`; working branch `fix/high-roi-audit-20261126`.
**Authorization:** the owner's added instruction, “Immediately act on it and merge your changes,” supersedes the copied audit-only restriction for this bounded work.

## Goal and boundary

Trace the current game, confirm consequential defects or unnecessary complexity, and fix only improvements worth doing at the local/private MVP stage. Preserve approved gameplay, accounts, saved assets and the current stack. No new gameplay, hosted Actions, services, paid infrastructure, public deployment or persistent gameplay-data mutation.

## Independent investigation and exclusive ownership

| Lane | Investigation | Write ownership |
| --- | --- | --- |
| Integration lead | Player flow, setup, final verification, synthesis | Store eligibility, obsolete limit exports, browser regression, adjacent server docs, plan and report |
| Server review | Authentication, commands, shared economy, persistence | Read-only; no P0/P1 server defect confirmed; independently reviewed final remedy/report |
| Rules review | Activity reconciliation, rewards, storage, deterministic rules | Read-only; retained an in-memory timing probe and independently reviewed the diff |
| Lab/developer review | CLI/MCP, experiments, launcher, test tooling | Read-only; no P0/P1 lab defect confirmed; qualified an isolated browser fallback |

All lanes share the isolated integration checkout. Assign disjoint paths before any parallel edits. Investigation results do not create a backlog or imply approval of new design.

## Acceptance and merge gate

1. Record exact baseline and evidence; reproduce each selected defect where practical.
2. Reuse existing rule/validation owners for the smallest fix, with focused regression coverage for meaningful failures.
3. Run current-source lint/types, relevant real database/browser checks, lab checks, repository checks and dependency audit. Record environment limitations separately.
4. Commit a concise audit with priorities, effort/risk, acceptance criteria, systems to leave alone and bounded deferred work.
5. Review the complete diff, refresh `main`, create one PR and merge the tested head under the owner's authorization. Keep Actions disabled.

## Rollback and stopping rule

Revert the scoped change if its acceptance fails; no schema/data reset is part of the work. Stop investigation when remaining concerns are speculative or lower value than playtesting. Physical-device compatibility and human enjoyment require separate observed sessions.

## Completed result and qualification limit

The [audit report](../../evidence/audits/high-roi-audit-2026-11-26.md) records the one P1 fix and four deferred P2 observations. Code/test commit `c066bd39a2fa9b49b5d2a0370b9f14625bd4cd21` passes lint, types/build, 104 rule/database/tool tests, 20 browser cases including the four new store cases, four lab smoke scenarios and content checks. Cold restore, 75 repository-tool tests, documentation checks and source-migration integrity also pass.

The code/test tree `7556dd0ed756a8c9c7a8ee611e5f67cac10a14f4` is published unchanged as [`42a529a`](https://github.com/silveralcid/Idle-Buds/commit/42a529a39325b9467c692ac47d8f4461825ccfc7). The published tree hash was checked against the locally tested tree; only later documentation differs.

The full `npm test` command exits 1 because both unchanged LAN browser cases encounter the sandbox's denied `os.networkInterfaces()` call before gameplay. The same raw OS call and baseline/current LAN functions reproduce the denial. Keep those cases intact, report them as blocked coverage, and qualify them on a suitable host rather than altering network/security controls or declaring a full-suite pass. This narrow store consumer fix does not change LAN code. No new gameplay, dependencies, migrations, services or issues are needed.
