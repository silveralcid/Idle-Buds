# High-ROI repository audit and bounded fixes

**Date:** November 26, 2026. **Status:** audit and scoped implementation complete; local results and the LAN environment limitation are recorded below.

**Baseline:** [`46a0e89`](https://github.com/silveralcid/Idle-Buds/commit/46a0e89), after Experience MVP, LAN playtesting, the experiment lab and disabling GitHub Actions. **Code/test source verified:** local commit `c066bd39a2fa9b49b5d2a0370b9f14625bd4cd21`, published with the identical Git tree `7556dd0ed756a8c9c7a8ee611e5f67cac10a14f4` as [`42a529a`](https://github.com/silveralcid/Idle-Buds/commit/42a529a39325b9467c692ac47d8f4461825ccfc7); subsequent report/index/plan changes are documentation only. The owner's explicit instruction to act and merge supersedes the copied audit-only restriction for this task. The [completed execution plan](../../plans/completed/high-roi-audit.md) records scope and ownership. This is a local/private MVP assessment, not public-launch, penetration-test, physical-device or human-enjoyment qualification.

## Executive assessment

The repository is already sufficiently simple for its current purpose. It has one React/Vite client, one Fastify server, one PostgreSQL database and one authoritative rules implementation. Most reviewed modules have concrete responsibilities. The imported research and repository standards do not enter the browser build. There is no evidence supporting a framework migration, service split, database rewrite, new state library or generic game engine.

The most consequential confirmed weakness is an incomplete consumer update after the approved move to shared storage slots and unlimited item stacks. The general-store UI still treats slot capacity as a per-item quantity limit. This directly blocks valid play. The server already applies the correct rule, so the remedy is a small consumer correction and removal of misleading obsolete exports.

No P0 issue was identified in the reviewed execution paths and exercised tests. Authentication, command receipts, transaction rollback, offline budgets, unique ownership and market races already have substantive coverage. That observation is bounded by this audit; it is not a claim that every exploit or deployment configuration has been tested.

Technical debt is localized. The other meaningful observations concern long-lived client recovery, growth during sustained play, a measured upper-end offline return, and moderate development-tool advisories. None justifies delaying private playtesting or starting a broad refactoring campaign.

## Priorities and highest-ROI decisions

Only **one immediate P1 implementation** met the evidence/benefit/effort bar. The following five opportunities are ordered by present value; the remaining four are explicitly deferred. They are not five new implementation commitments.

| Priority | Opportunity | Decision | Effort if implemented | Regression risk |
| --- | --- | --- | --- | --- |
| P1 | General-store eligibility disagrees with shared inventory rules | Fix now, with real browser regression | Small, approximately half a day including reproduction and verification | Low; server rules and save format unchanged |
| P2 | Cached MCP/player session does not recover from explicit unauthorized responses | Defer until persistent-client use makes restarting a real friction | 1–2 hours | Low if only explicit 401 clears the token and command identity is preserved |
| P2 | A maxed 24-hour return can occupy the server thread for about 1.4–1.5 seconds | Keep the measurement; profile only after representative player/cohort latency warrants it | A few hours to measure; optimization unknown | Potentially high for batching because rewards depend on event order |
| P2 | Full command receipts accumulate indefinitely | Measure real growth before selecting retention semantics | A few hours to measure; about a day for a justified safe retention change | Medium; deleting receipts can allow duplicate execution |
| P2 | Migration-tool dependencies have two moderate advisories | Keep the current lockfile; revisit with a compatible upstream update | Small for a compatible update plus migration checks | Low to medium; forced major overrides/downgrades add avoidable risk |

The store fix outranks the other candidates because it has an observed ordinary-player failure, a clear approved rule, a reused implementation and a tiny production diff. Documentation corrections for the LAN exception and escrow cancellation travel with this package; they do not warrant separate issues or a refactoring milestone.

## F1. P1: general-store storage eligibility

**Problem and evidence.** At baseline, `StoreCard` in [`src/ui/market.tsx`](../../../src/ui/market.tsx) computes `buyMax` using `itemCapacity(state) - owned`. The compatibility name now refers to shared inventory slots. A real browser reproduction with 24 occupied slots and 100 Scrap displays **“Can buy -76”** and disables a legal purchase. The same state offers a new Fiber stack despite having no free slot. This conflicts with the approved unlimited-stack model and the existing server rule in [`server/market.ts`](../../../server/market.ts).

**Smallest remedy.** Compute the stock/affordability/numeric bound, then use the existing `canReceiveItems` predicate in [`progression.ts`](../../../src/game/progression.ts). Remove the misleading `itemCapacity` alias and unused `MAX_GEAR` constant and their barrel exports; neither has another consumer. Do not introduce a second storage model or change server, database or balance behavior.

**Practical benefit.** Players can buy into existing stacks even at full or legacy-overfull storage, while new item types are offered only when their slot fits. Escrow reservations and safe integer bounds follow the same shared predicate as the server. The removal prevents future consumers from reusing a misleading legacy limit.

**Bounded acceptance.** The new [`market-storage.spec.ts`](../../../tests/e2e/market-storage.spec.ts) uses the guarded disposable PostgreSQL database and actual browser controls. It verifies that a full inventory with 100 Scrap can buy five more, the purchase survives reload with the correct 30-coin debit, an absent Fiber stack is disabled, bypassing the UI receives a 409 without wallet/inventory loss, selling the final Copperfin stack frees a slot, and Fiber can then be bought with the correct saved balance. Run at desktop and narrow viewports. No migration or persistent account edit is required.

## F2. P2: long-lived player-client session recovery

**Evidence.** [`tools/player-client.ts`](../../../tools/player-client.ts) treats any cached session as sufficient in `#authenticate()`. Explicit 401 responses from state/world/command requests do not clear that cache. [`server/auth.ts`](../../../server/auth.ts) expires sessions after 14 days and supports revocation. A client configured with credentials can consequently keep sending an invalid token until restarted.

**Recommendation and benefit.** If persistent MCP use makes this visible, clear the cache after an explicit 401 so the next request can authenticate normally. Keep opaque command UUIDs and ambiguous-completion handling intact. This removes a restart requirement; it does not improve current game correctness.

**Acceptance and trigger.** Revoke a disposable client's token, observe the rejection, then verify a subsequent credential-backed operation signs in and succeeds. A token-only client must remain rejected; a lost command response must not generate a new command ID or a duplicate effect. Trigger this work on observed long-lived-client friction. Do not add background auth services or automatic retries for ambiguous writes.

## F3. P2: bounded offline reconciliation cost

**Measured evidence.** [`state.ts`](../../../src/game/state.ts) runs due events synchronously through `advance`. Three in-memory runs of the same legal synthetic state with fully leveled workers took **1,543 ms, 1,355 ms and 1,464 ms** on the shared Linux x64 host using Node 24.22.3. Each reconciled 24 hours and produced identical reported aggregate counts: 147,600 cycles, 7,200 battles and the same inventory totals. Full state equality was not separately checked by this timing probe. The fixture had three independent gathering Buds with level-cap XP, legal IVs of 10, bond 3 and two worker upgrades, plus continuous Earth patrol. No database was touched.

**Meaning and limits.** This is a real upper-end synchronous workload, not a measurement of normal new-player latency, concurrent users or a performance regression. The simpler production-recovery lab smoke also passed 24 simulated hours and 36,870 events in 1,441 ms in its separately instrumented runner; timings from different harnesses are not directly comparable.

**Recommendation and benefit.** Retain exact deterministic behavior. If actual returning-player pauses matter, measure fresh/midgame/maxed returns with a concurrent ordinary request, then profile the demonstrated hot path. This avoids replacing the event loop on conjecture.

**Bounded acceptance.** Any later optimization must preserve complete state equality at fixed seeds and time partitions, including simultaneous events, changing speed, shared inputs, pending output, breeding and the offline cap. Stop when representative latency is acceptable. No worker-thread framework, background service or approximate rewards are justified now. The local probe and original outputs are retained under ignored `.repo-local/audit/offline-probe*` for this investigation.

For reproduction after those temporary files expire, run this in-memory probe from the repository root with `node --input-type=module`:

```js
import { createPlayer, applyCommand, advance, OFFLINE_CAP_MS } from './src/game/index.ts'
import { addBud } from './src/game/breeding.ts'
let state = createPlayer('Audit', 0, 'audit-performance')
state.stats.catches = 100
state.upgrades.worker = 2
for (const species of ['pebbleback', 'spriglet', 'tinwhisker']) {
  addBud(state, species, { ivs: { attack: 10, health: 10, gather: 10, craft: 10 }, sex: 'Female', trait: 'Diligent' })
  Object.assign(state.buds.at(-1), { xp: 1_000_000, bond: 3 })
}
for (const [index, nodeId] of ['earth-scrap', 'earth-fiber', 'earth-minnow'].entries()) {
  state = applyCommand(state, { type: 'startActivity', workerId: state.buds[index].id, order: { kind: 'gather', nodeId } }, 0).state
}
state = applyCommand(state, { type: 'startActivity', order: { kind: 'battle', zoneId: 'earth' } }, 0).state
for (let run = 0; run < 3; run += 1) {
  const started = performance.now()
  const result = advance(state, OFFLINE_CAP_MS)
  console.log({ run, ms: performance.now() - started, cycles: result.summary.cycles,
    battles: result.state.stats.battles, counts: result.state.inventory })
}
```

## F4. P2: receipt storage growth

**Evidence.** [`server/app.ts`](../../../server/app.ts) persists a full response per new command. [`migrations/001_initial.cjs`](../../../migrations/001_initial.cjs) has no creation time or retention policy for `command_receipts`. This provides correct replay behavior but retains repeated state snapshots indefinitely.

**Recommendation and benefit.** Measure bytes per command and table growth during a sustained playtest or a long HTTP experiment. If growth becomes material, select an explicit retry lifetime or retained tombstone semantics before implementing pruning. This could reduce long-term storage without corrupting the economy.

**Bounded acceptance and trigger.** Show that an old command cannot execute again after a receipt is expired or compacted, test the retry boundary and concurrent duplicates, and preserve supported replay behavior. Until measured growth warrants it, retain receipts unchanged. Do not add a scheduler, maintenance service or speculative database migration.

## F5. P2: development dependency advisories

**Observed result.** `npm audit --audit-level=high --json` passes its configured threshold with **zero high/critical findings and three moderate package entries**: `glob`, `minimatch` and their parent `node-pg-migrate`. These represent two underlying advisories, not three independent vulnerabilities. `npm audit --omit=dev --audit-level=high --json` reports zero findings.

The primary advisories concern [glob cancellation continuing traversal](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and [minimatch pattern amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249). Inspection of installed `node-pg-migrate@9.0.0` shows `useGlob` defaults to false and takes `readdir`; [`tools/db-local.mjs`](../../../tools/db-local.mjs) supplies a fixed migrations directory without enabling globbing. No player-controlled pattern reaches this path. This is an exposure assessment of the current application, not a claim that the packages are patched.

**Recommendation and acceptance.** Revisit when the migration package has a compatible supported update. Keep fresh migration, existing schema, player preservation and cold-restore checks passing. Do not accept npm's suggested downgrade to an older major or force a major transitive override merely to make a dashboard green. No new dependency was added to the repository by this audit.

## What should be left alone

| Area reviewed | Evidence and decision |
| --- | --- |
| Architecture and code quality | Concrete modules own rules, HTTP, persistence and UI. No demonstrable God object or reusable abstraction gap warrants a rewrite. |
| Game systems | `advance`/`applyCommand`, deterministic battles, private RNG/genetics, one Bud per production skill and pending-output recovery already serve shared online/offline behavior. Preserve them. |
| Database | One player JSONB row plus normalized shared records is appropriate. Keep explicit save migration and row transactions; do not normalize every stat or replace PostgreSQL. |
| Multiplayer | The single shared-world advisory lock plus player locks is deliberately conservative. Tests exercise 100 buyers racing one Bud, fill/cancel races and remote settlement against one offline budget. Do not shard locks without measured contention. |
| Security and economy | Opaque hashed sessions, exact write origins, strict command decoding, immutable successful/rejected receipts, savepoints and escrow have meaningful coverage. Preserve the authoritative boundary. |
| Testing | Existing pure-rule, real-database, browser, restore and protocol checks already cover major risks. Add the missing store-consumer regression, not arbitrary coverage targets or another testing framework. |
| Experimentation/API/MCP | The CLI and stdio adapter call shared lab operations and the normal authenticated API. Bounded scenarios, cloned observations, source fingerprints and replay already exist. Do not build another agent or simulation platform. |
| Developer experience | Native Node TypeScript, the existing launcher, embedded real PostgreSQL and opt-in LAN mode are sufficient. The browser CDN problem here is an environment limitation with an already documented fallback. |
| Repository hygiene | Entrypoints route into canonical topic owners; research and archived workflows stay outside runtime. Retain provenance and useful historical material. Deleting it does not fix the game. |
| Deployment and costs | Active GitHub workflows are absent. One server/database supports the current private cohort. No hosted automation, new paid infrastructure, Redis, queues or public deployment is warranted. |

**P3: explicitly defer** language/framework migrations, service extraction, a generalized repository layer, state-framework adoption, event-system replacement, broad file splitting for line-count targets, speculative bundle tuning and a content-editor platform. Each adds maintenance or regression risk without a demonstrated current player benefit.

## Cohesive execution package

One package is sufficient: **align the store consumer with the existing rule, remove obsolete limits, verify the real flow, correct adjacent server documentation and merge this audit**. The code change and its browser acceptance are independently understandable and require no schema change. No new issues or dependent PR chain is needed.

The four P2 candidates are trigger-based decisions, not an approved follow-on campaign. Continue normal playtesting after this package. Use observed session friction, return latency, storage growth or a compatible security update to select the next small intervention.

## Verification record

**Environment:** Linux x64, nonroot local account, Node 24.22.3, npm 11.19.1, real PostgreSQL 18.7. The official Playwright Chromium download returned HTTP 403. The host's `/usr/bin/chromium` wrapper lacked its executable. An isolated, uncommitted `@sparticuz/chromium@158.0.0` fallback supplied Chromium 158.0.8127.0 using the existing `PLAYWRIGHT_EXECUTABLE_PATH` option and default Playwright launch arguments. No web-security disabling flags were added.

**LAN limitation and merge judgment.** The full `npm test` invocation exits **1**, not green: 104 Vitest tests and 20 browser cases pass, while both LAN browser cases fail before starting their game flow. The sandbox denies Node's `os.networkInterfaces()` with `ERR_SYSTEM_ERROR`, syscall `uv_interface_addresses`, errno 1. A separate probe reproduced exactly the same failure in raw Node, the `server/lan.ts` file extracted from baseline `46a0e89`, and the current file. The LAN implementation, launcher and LAN test are unchanged. No test was skipped, weakened or given a fake interface. This is an environment-blocked qualification, not evidence of a new store regression. The scoped store change is supported by four real browser cases, database assertions and the remaining suite; actual LAN behavior remains unverified in this environment. Run the existing unchanged LAN cases on a host that permits network-interface enumeration when LAN qualification is needed.

| Check | Observed result |
| --- | --- |
| Baseline `npm ci`, lint and typecheck | PASS |
| Baseline real-database integration | PASS: 20 tests |
| Baseline Vitest during `npm test` | PASS: 104 tests across 14 files |
| Baseline default browser setup / broken system wrapper | BLOCKED: download 403 / executable absent; not product failures |
| New store reproduction on baseline build | CONFIRMED: existing-stack case failed with visible negative buy capacity |
| Final lint and production build | PASS on code/test commit `c066bd39a2fa9b49b5d2a0370b9f14625bd4cd21` |
| Focused store browser regression | PASS: all four desktop/narrow cases; resulting desktop and narrow screenshots inspected |
| Final Vitest rule/database/tool suite | PASS: 104 tests across 14 files on `c066bd3` |
| Final browser suite | 20 PASS, including all four new store cases; two LAN cases FAIL at the blocked OS call before gameplay; 22 attempted, zero skipped |
| Full `npm test` invocation | FAIL, exit 1, solely from the two environment-blocked LAN cases described above |
| Cold restore | PASS: all three fixture accounts, complete player states and migration history restored into an empty data directory |
| Lab smoke and content | PASS: four smoke scenarios; content validation has no errors/warnings |
| Repository tool regression and static checks | PASS: 75 tests |
| Documentation links/budget and imported-source integrity | PASS; documentation checked again after the report and completed-plan update |
| Dependency audit | PASS at high threshold; moderate development-only findings retained as F5 |
| Independent focused review | PASS: two reviewers confirmed reuse of the shared storage predicate and no remaining obsolete-limit consumers |

Raw local logs/screenshots are ignored under `.repo-local/audit/` and `.repo-local/playwright-results/`; durable conclusions and accepted limits are recorded here. All database writes used owned disposable test clusters. No actual player's save, GitHub workflow setting, hosted service or public deployment was changed.

The initial draft of the new-item browser case had a fixture-refresh race and an internal-ID/display-name selector mismatch. Those test-authoring errors were corrected before the four-case focused pass and final suite. Only the observed negative-capacity case is counted as baseline defect reproduction. Physical phones, Steam Deck hardware, Windows/macOS launch and human enjoyment were not tested by this audit.
