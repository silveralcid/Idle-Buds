# Experiment lab implementation evidence: November 26, 2026

## Scope and identity

Owner instruction: “Implement all you can directly to repo, merge right away.” Implemented on `feat/experiment-lab` from main `1c9c3877af6d455f51c992cdba5d61a9a5bb7c2b`. The implementation PR and its live checks own final hosted verification and merge state. This record distinguishes the local observations below from hosted and physical-device evidence.

Runtime source fingerprint for the final production comparison: `000d8dd30628f7d8357d0e3dff63a5f159ed58992aba28cdca2b1adf63fecea0`. This hashes actual source/configuration/package bytes, including dirty edits, rather than claiming that the starting Git commit contains the new code. The run manifests also retain commit, dirty state, content identity, Node version, scenario/fixture/policy versions and ordered evidence. Final GitHub CI qualifies the published PR head separately.

Environment: Linux, Node 24.22.3, npm 11.19.1, real isolated PostgreSQL 18.7. No gameplay or server authority files, balance constants, save migrations, normal player accounts or deployed server were changed by this lab task.

## Implemented

- Local typed lab API and CLI: list, run, smoke, report, replay, compare and content validation.
- Five official-SDK MCP tools over local stdio, scenario resource and player/lab/all profiles.
- Typed normal-login player HTTP client with original command UUID/receipt semantics and explicit unknown completion.
- Seven scenarios and thirteen variants covering independent production, storage recovery, activity replacement, offline time, first working Bud, four public-state policies and bounded action sequences.
- Passive cloned observations, preserved foreground allowance, action/event/time/trace budgets, explicit failed/exhausted/inconclusive outcomes, separate per-run JSON/Markdown/trace artifacts and source-sensitive replay.
- Material-reference and prerequisite validation with stated limits. No claim of complete economic or human progression validation.
- Corrected legacy production experiment: unlimited stacks and automatic recovery, no manual abandonment of blocked orders, fixed 24-hour current-mechanics comparison.
- Registered verification commands and hosted lab/content checks. [Usage and contracts](../engineering/EXPERIMENT-LAB.md) are the canonical operational guide.

Reuse: the game's existing rules, Fastify API, session identity, PostgreSQL transactions, tests and fixtures remain authoritative. The official `@modelcontextprotocol/sdk` 1.32.2 and `zod` 4.6.7 are exact development dependencies, both MIT licensed. No custom protocol server, model provider, new service or general job queue was introduced.

## Local observed verification

| Check | Actual result | Evidence scope |
|---|---|---|
| `npm run lint` | PASS | Changed and existing registered source, warnings denied |
| `npm run typecheck` | PASS | Client, server, tools and tests |
| `npm run build` | PASS | Existing production browser bundle still builds |
| `node node_modules/vitest/vitest.mjs run tests/unit tests/tools` | PASS, 84 tests in 12 files | Rules, harness sensitivity, all thirteen scenario variants, content checks, actual SDK stdio calls and existing launcher tests |
| `npm run test:integration` | PASS, 20 tests in 2 files | Existing seventeen server cases plus three actual HTTP/MCP/PostgreSQL cases |
| `npm run lab -- smoke` | PASS, four scenarios | Actual CLI entrypoint, bounded production/inventory/replacement/offline scenarios |
| CLI run and replay of `activity-replacement` | PASS / matched | Separate Node CLI processes reproduce the same saved run |
| CLI comparison of final daily/frequent runs | PASS, comparable inputs | Same source, fixtures, limits and seeds; mean capture-kit difference zero |
| `npm run experiments` | PASS | Existing seeded system baselines plus current production variants, fifteen production cases |
| `npm run lab:content` | PASS | 23 items, 14 nodes, 16 recipes, 15 species; no static errors/warnings |
| `python3 tools/repo.py check --tests` | PASS, 75 helper tests | Repository infrastructure and documentation integrity |
| `python3 tools/repo.py docs budget --strict` | PASS | Configured instruction/context budgets |
| `python3 tools/validate_migration.py` | PASS | Preserved imported source integrity |
| `npm audit --audit-level=high` | PASS | Zero high/critical; three existing moderate development migration-chain advisories remain |

The full current browser/LAN suite is a hosted merge qualification, not a new local physical-device claim. [Web validation](https://github.com/silveralcid/Idle-Buds/actions/workflows/web-validation.yml) and the implementation PR expose actual hosted status. This implementation adds no scheduled or paid AI runs.

### Failure sensitivity exercised

A false assertion fails. An assertion-free run is inconclusive. Action, event and simulated-time exhaustion retain partial evidence and cannot pass. Changed/corrupt traces and incompatible source are detected. Invalid activity replacement retains the previous order and earned rewards. A deliberately duplicated pending reward makes its scenario fail. A deliberately lost HTTP response after a committed transaction returns unknown completion; retrying the original UUID recovers exactly one receipt. Player observations omit private RNG and egg genetics.

Independent review found a persistent-process provenance error before publication: old cached modules could have been attributed to edited source bytes. The fix fingerprints loaded source at initialization. A real SDK regression starts MCP in an isolated copied runtime, runs successfully, edits that copy, verifies that the stale process rejects a new run and replay as inconclusive, then verifies success after a fresh MCP start. The test does not edit shared application source.

## Production finding and decision

Question: does the prepared independent mining/crafting chain require frequent visits or manual restarts?

Same synthetic roster, resources, earned capacity and five starting seeds, over 24 simulated hours:

| Variant | Capture kits, matching seeds | Mean | Manual restarts | Tender XP |
|---|---|---:|---:|---:|
| Daily return | 9,217; 10,893; 9,715; 9,217; 10,893 | 9,987 | 0 | 0 |
| Four returns | 9,217; 10,893; 9,715; 9,217; 10,893 | 9,987 | 0 | 0 |
| Deliberately paused craft | 0; 0; 0; 0; 0 | 0 | 0 | 0 |

**Disposition: retain the automatic-recovery behavior.** More visits added no output to this unchanged production plan. Manual pause stayed paused, and Bud production did not train the Tender. The quantity is a pacing observation for later economic work, not approval to tune output, stack rules or upgrade prices. These prepared fixtures do not establish the cost of earning that setup from a fresh start, long-term market demand, human engagement or retention.

Individual final production runs:

- `daily`: `20261126T153503485Z-36bf0a80-a054-40c1-9d76-1d6a454e3646`
- `frequent`: `20261126T153509886Z-f24f0c2a-e28b-4d78-816e-1f9ecf7799c7`
- `paused`: `20261126T153515814Z-f641e897-3cc3-44e0-b99c-0c29992e21b5`

Raw files remain under ignored `.repo-local/lab/runs/`. Local verification logs include `.repo-local/lab-final-unit-tools.log`, `.repo-local/lab-final-experiments.log`, `.repo-local/lab-final-cli.json` and `.repo-local/lab-final-comparison.json`. Run IDs locate local artifacts; they are not hosted download links.

## Remaining boundaries

Physical phone/controller qualification and observed combat comprehension remain human tasks. Remote MCP hosting, a live model playing the game, long-horizon market cohorts, contextual UI bug reporting, stable game-wide blocker codes and automatic trace minimization are not implemented by this increment. Reproduction currently reruns a registered scenario and compares its exact fixture/actions/assertions/terminal evidence under matching source. Cancellation is cooperative; wall deadlines are checked at operation/engine-step boundaries. These limits are explicit in the operational guide.

Use the delivered lab to investigate a concrete observed problem before expanding it. No new issues were created, and no remote continuation agent was dispatched.
