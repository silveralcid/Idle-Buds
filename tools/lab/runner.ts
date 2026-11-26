import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, stat, writeFile, realpath } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { setImmediate } from 'node:timers/promises'
import { performance } from 'node:perf_hooks'
import { advance, applyCommand, createPlayer, publicState, RuleError } from '../../src/game/index.ts'
import { OFFLINE_CAP_MS } from '../../src/game/limits.ts'
import type { GameCommand, GameState } from '../../src/game/types.ts'
import type { MetricValue, RunLimits, RunRequest, RunStatus, ScenarioContext, ScenarioDefinition } from './types.ts'
import { captureProvenance, digest, REPOSITORY_ROOT, stableJson } from './provenance.ts'
import { getScenario } from './scenarios.ts'
import { renderReport } from './report.ts'
import type { AssertionResult, CaseReport, ComparisonReport, MetricAggregate, ReplayReport, RunReport, TraceEntry } from './report.ts'

export type { CaseReport, ComparisonReport, ReplayReport, RunReport } from './report.ts'
export { summarizeReport } from './report.ts'
export interface RunOptions { artifactRoot?: string; signal?: AbortSignal }
const MAX_TRACE_ENTRIES = 4_096
const MAX_REPORT_BYTES = 16 * 1024 * 1024
// A long-lived MCP process keeps the imported game/scenario modules cached. Reading
// only current disk bytes per run would incorrectly attribute cached code to a later edit.
const LOADED_PROVENANCE = await captureProvenance()
const RESTART_MESSAGE = 'Runtime source changed since this process started. Restart the CLI or MCP process before running or replaying experiments.'
const SEED_SETS: Readonly<Record<string, readonly string[]>> = {
  smoke: ['idle-buds-lab-baseline-0'],
  baseline: Array.from({ length: 5 }, (_, index) => `idle-buds-lab-baseline-${index}`),
  holdout: Array.from({ length: 5 }, (_, index) => `idle-buds-lab-holdout-${index}`),
}
export function listSeedSets() { return Object.entries(SEED_SETS).map(([id, seeds]) => ({ id, count: seeds.length })) }

class Halt extends Error {
  readonly status: RunStatus
  constructor(status: RunStatus, message: string) { super(message); this.status = status }
}

function boundedText(value: string, limit: number): string { return value.slice(0, limit) }

function validateRequest(request: RunRequest) {
  if (!request || typeof request !== 'object' || Array.isArray(request)
    || Object.keys(request).some(key => !['scenarioId', 'seedSetId', 'variant', 'limits'].includes(key))) throw new Error('Invalid lab run request.')
  const definition = getScenario(request.scenarioId)
  const seedSetId = request.seedSetId ?? 'smoke'
  if (!Object.hasOwn(SEED_SETS, seedSetId)) throw new Error('Unknown seed set. Use smoke, baseline, or holdout.')
  const variant = request.variant ?? definition.variants[0]
  if (!definition.variants.includes(variant)) throw new Error(`Unknown variant for ${definition.id}.`)
  const limits = { ...definition.limits }
  if (request.limits !== undefined) {
    if (!request.limits || typeof request.limits !== 'object' || Array.isArray(request.limits)) throw new Error('Invalid run limits.')
    for (const [key, value] of Object.entries(request.limits)) {
      if (!Object.hasOwn(limits, key) || !Number.isSafeInteger(value) || value <= 0 || value > limits[key as keyof RunLimits]) {
        throw new Error(`Limit ${key} must be a positive integer no greater than the scenario limit.`)
      }
      limits[key as keyof RunLimits] = value
    }
  }
  return { definition, seedSetId, variant, limits }
}

/** Execute a trusted registered definition. Exported for focused harness tests, not exposed through MCP. */
export function executeScenario(
  definition: ScenarioDefinition, seed: string, variant: string, limits: RunLimits,
  options: { signal?: AbortSignal; deadline?: number } = {},
): CaseReport {
  let initial: GameState
  try { initial = definition.create(seed, variant) }
  catch (failure) {
    const diagnostic = createPlayer('lab_fixture_failure', 0, seed)
    return { seed, status: 'failed', initialState: diagnostic, initialStateHash: digest(diagnostic), finalStateHash: digest(diagnostic),
      finalForegroundAt: 0, trace: [], assertions: [], metrics: {}, notes: ['Fixture creation failed. The empty diagnostic snapshot is not a completed scenario fixture.'],
      counts: { actions: 0, events: 0, simulatedMs: 0, discardedMs: 0 },
      error: boundedText(`Fixture failed: ${failure instanceof Error ? failure.message : String(failure)}`, 2_000) }
  }
  const initialState = structuredClone(initial)
  let state = structuredClone(initial)
  let foregroundAt = state.lastAt
  const startAt = state.lastAt
  const deadline = options.deadline ?? performance.now() + limits.maxWallMs
  const trace: TraceEntry[] = []
  const assertions: AssertionResult[] = []
  const metrics: Record<string, MetricValue> = {}
  const notes: string[] = []
  const counts = { actions: 0, events: 0, simulatedMs: 0, discardedMs: 0 }
  let status: RunStatus = 'passed'
  let error: string | undefined

  function guard() {
    if (options.signal?.aborted) throw new Halt('cancelled', 'Run cancelled before the next operation.')
    if (performance.now() >= deadline) throw new Halt('budget_exhausted', 'Wall-time budget exhausted.')
  }
  function record(entry: Omit<TraceEntry, 'index' | 'at' | 'foregroundAt' | 'stateHash'>) {
    if (trace.length >= MAX_TRACE_ENTRIES) throw new Halt('budget_exhausted', 'Trace-entry budget exhausted.')
    trace.push({ index: trace.length, at: state.lastAt, foregroundAt, stateHash: digest(state), ...entry })
  }
  function reconcile(now: number) {
    const budget = OFFLINE_CAP_MS - Math.min(OFFLINE_CAP_MS, state.lastAt - foregroundAt)
    const result = advance(state, now, budget)
    state = result.state
    counts.simulatedMs += result.summary.simulatedMs
    counts.discardedMs += result.summary.discardedMs
    return result.summary.cycles
  }

  const context: ScenarioContext = {
    seed, variant,
    observe() { guard(); return publicState(state) },
    inspect() { guard(); return structuredClone(state) },
    act(command: GameCommand) {
      guard()
      if (counts.actions >= limits.maxActions) throw new Halt('budget_exhausted', 'Action budget exhausted.')
      counts.actions += 1
      // Match server reconciliation/savepoint behavior: committed elapsed progress survives a rule rejection.
      reconcile(state.lastAt)
      let accepted = true
      let message = ''
      try {
        const result = applyCommand(state, command, state.lastAt)
        state = result.state
        message = result.message
      } catch (failure) {
        if (!(failure instanceof RuleError)) throw failure
        accepted = false
        message = failure.message
      }
      foregroundAt = state.lastAt
      record({ kind: 'command', command: structuredClone(command), accepted, message })
      return { accepted, message }
    },
    advanceTo(now, mode = 'check-in') {
      guard()
      if (!Number.isSafeInteger(now) || now < state.lastAt) throw new Error('Lab time must be a forward safe integer.')
      if (mode !== 'check-in' && mode !== 'background') throw new Error('Invalid time-advance mode.')
      let completed = false
      try {
        if (now - startAt > limits.maxSimulatedMs) throw new Halt('budget_exhausted', 'Simulated-time budget exhausted.')
        const allowance = OFFLINE_CAP_MS - Math.min(OFFLINE_CAP_MS, state.lastAt - foregroundAt)
        const cutoff = Math.min(now, state.lastAt + allowance)
        // Reconcile at existing engine event deadlines to enforce budgets without making artificial player check-ins.
        // A single deadline may finish several simultaneous events; account for those before entering the engine.
        while (state.lastAt <= cutoff) {
          guard()
          const deadlines = Object.values(state.activities).map(activity => activity.nextAt)
            .filter((at): at is number => at !== null && at <= cutoff)
          if (state.breeding && state.breeding.readyAt <= cutoff) deadlines.push(state.breeding.readyAt)
          if (!deadlines.length) break
          const nextAt = Math.min(...deadlines)
          if (nextAt < state.lastAt) throw new Error('Activity deadline moved behind game time.')
          const due = deadlines.filter(at => at === nextAt).length
          if (counts.events + due > limits.maxEvents) throw new Halt('budget_exhausted', 'Event budget exhausted.')
          counts.events += Math.max(due, reconcile(nextAt))
          if (Object.values(state.activities).some(activity => activity.nextAt !== null && activity.nextAt <= nextAt)
            || (state.breeding && state.breeding.readyAt <= nextAt)) throw new Error('Engine event did not advance or resolve.')
        }
        reconcile(now)
        if (mode === 'check-in') foregroundAt = state.lastAt
        completed = true
        guard()
      } finally {
        record({ kind: 'advance', target: now, mode, completed })
      }
    },
    check(id, condition, detail) {
      guard()
      const assertion = { id: boundedText(id, 128), passed: condition === true, ...(detail ? { detail: boundedText(detail, 1_000) } : {}) }
      assertions.push(assertion)
      record({ kind: 'check', assertion })
    },
    metric(name, value) {
      guard()
      if (!/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(name) || name === 'constructor' || name === '__proto__'
        || (!Object.hasOwn(metrics, name) && Object.keys(metrics).length >= 128)
        || (typeof value === 'number' && !Number.isFinite(value)) || (typeof value === 'string' && value.length > 1_000)) {
        throw new Error('Invalid or excessive metric.')
      }
      metrics[name] = value
    },
    note(message) { guard(); if (notes.length < 100) notes.push(boundedText(message, 1_000)) },
  }
  try {
    guard()
    definition.run(context)
    guard()
    if (assertions.some(assertion => !assertion.passed)) status = 'failed'
    else if (assertions.length === 0) { status = 'inconclusive'; error = 'Scenario returned without assertions.' }
  } catch (failure) {
    status = failure instanceof Halt ? failure.status : 'failed'
    error = boundedText(failure instanceof Error ? failure.message : String(failure), 2_000)
    if (assertions.some(assertion => !assertion.passed)) status = 'failed'
  }
  return {
    seed, status, initialState, initialStateHash: digest(initialState), finalStateHash: digest(state), finalForegroundAt: foregroundAt,
    trace, assertions, metrics, notes, counts, ...(error ? { error } : {}),
  }
}

function aggregateMetrics(cases: CaseReport[]): Record<string, MetricAggregate> {
  const result: Record<string, MetricAggregate> = {}
  for (const key of [...new Set(cases.flatMap(value => Object.keys(value.metrics)))].sort()) {
    const values = cases.map(value => value.metrics[key] ?? null)
    const numbers = values.filter((value): value is number => typeof value === 'number')
    result[key] = { values, ...(numbers.length ? {
      min: Math.min(...numbers), max: Math.max(...numbers), mean: numbers.reduce((sum, value) => sum + value, 0) / numbers.length,
    } : {}) }
  }
  return result
}
function statusOf(cases: CaseReport[]): RunStatus {
  for (const status of ['failed', 'cancelled', 'budget_exhausted', 'inconclusive'] as const) if (cases.some(value => value.status === status)) return status
  return cases.length ? 'passed' : 'inconclusive'
}
function gameplay(cases: CaseReport[]) {
  return cases.map(result => ({
    seed: result.seed, status: result.status, initialStateHash: result.initialStateHash, finalStateHash: result.finalStateHash,
    finalForegroundAt: result.finalForegroundAt, trace: result.trace, assertions: result.assertions, metrics: result.metrics, counts: result.counts,
  }))
}
function root(options: RunOptions): string { return resolve(options.artifactRoot ?? join(REPOSITORY_ROOT, '.repo-local/lab/runs')) }
function validRunId(runId: string): void {
  if (typeof runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{1,100}$/.test(runId)) throw new Error('Invalid lab run ID.')
}
async function atomicWrite(path: string, content: string) {
  if (Buffer.byteLength(content) > MAX_REPORT_BYTES) throw new Error('Lab artifact exceeds its size budget.')
  const temporary = path + '.tmp'
  await writeFile(temporary, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  await rename(temporary, path)
}

export async function runScenario(request: RunRequest, options: RunOptions = {}): Promise<RunReport> {
  const provenance = await captureProvenance()
  if (provenance.sourceDigest !== LOADED_PROVENANCE.sourceDigest) throw new Error(RESTART_MESSAGE)
  const { definition, seedSetId, variant, limits } = validateRequest(request)
  const startedAt = new Date().toISOString()
  const runId = startedAt.replaceAll(/[-:.]/g, '') + '-' + randomUUID()
  const directory = join(root(options), runId)
  await mkdir(root(options), { recursive: true, mode: 0o700 })
  await mkdir(directory, { mode: 0o700 })
  await atomicWrite(join(directory, 'started.json'), JSON.stringify({ runId, startedAt, request, provenance, status: 'running' }, null, 2) + '\n')
  const started = performance.now()
  const cases: CaseReport[] = []
  for (const seed of SEED_SETS[seedSetId]) {
    await setImmediate() // Allows a local caller to cancel between cases; each synchronous case also checks its wall deadline.
    cases.push(executeScenario(definition, seed, variant, limits, { signal: options.signal, deadline: started + limits.maxWallMs }))
  }
  const after = await captureProvenance()
  const sourceChanged = after.sourceDigest !== provenance.sourceDigest
  const report: RunReport = {
    schemaVersion: 1, runId, scenarioId: definition.id, scenarioVersion: definition.version,
    fixtureVersion: definition.fixtureVersion, policyVersion: definition.policyVersion, variant, seedSetId, question: definition.question,
    status: sourceChanged ? 'inconclusive' : statusOf(cases), limits, provenance,
    startedAt, finishedAt: new Date().toISOString(), durationMs: Math.round(performance.now() - started),
    gameplayDigest: digest(gameplay(cases)),
    summary: {
      cases: cases.length, passed: cases.filter(value => value.status === 'passed').length, failed: cases.filter(value => value.status === 'failed').length,
      incomplete: cases.filter(value => !['passed', 'failed'].includes(value.status)).length,
      assertions: cases.reduce((sum, value) => sum + value.assertions.length, 0),
      failedAssertions: cases.reduce((sum, value) => sum + value.assertions.filter(assertion => !assertion.passed).length, 0),
    },
    metrics: aggregateMetrics(cases), cases,
    artifacts: { report: join(directory, 'report.json'), markdown: join(directory, 'report.md'), trace: join(directory, 'trace.json') },
  }
  if (sourceChanged) for (const result of cases) result.notes.push('Runtime source changed during this run; evidence is inconclusive.')
  await atomicWrite(report.artifacts.trace, JSON.stringify({ schemaVersion: 1, runId, gameplayDigest: report.gameplayDigest, cases }, null, 2) + '\n')
  await atomicWrite(report.artifacts.markdown, renderReport(report))
  await atomicWrite(report.artifacts.report, JSON.stringify(report, null, 2) + '\n')
  return report
}

export async function readReport(runId: string, options: RunOptions = {}): Promise<RunReport> {
  validRunId(runId)
  const base = await realpath(root(options))
  const directory = await realpath(join(base, runId))
  if (directory !== join(base, runId)) throw new Error('Lab run directory must remain within the artifact root.')
  const path = join(directory, 'report.json')
  if (await realpath(path) !== path) throw new Error('Lab report must be a regular file within its run directory.')
  const info = await stat(path)
  if (!info.isFile() || info.size > MAX_REPORT_BYTES) throw new Error('Invalid or excessive lab report.')
  const report = JSON.parse(await readFile(path, 'utf8')) as RunReport
  if (report.schemaVersion !== 1 || report.runId !== runId || !Array.isArray(report.cases) || report.cases.length > 5
    || report.cases.some(value => !Array.isArray(value.trace) || value.trace.length > MAX_TRACE_ENTRIES)) throw new Error('Invalid lab report shape.')
  return report
}

export async function replayRun(runId: string, options: RunOptions = {}): Promise<ReplayReport> {
  const recorded = await readReport(runId, options)
  const current = await captureProvenance()
  if (current.sourceDigest !== LOADED_PROVENANCE.sourceDigest) return { runId, status: 'inconclusive', message: RESTART_MESSAGE }
  if (current.sourceDigest !== recorded.provenance.sourceDigest || current.nodeVersion !== recorded.provenance.nodeVersion) {
    return { runId, status: 'inconclusive', message: 'Runtime source or Node version differs. Restore the recorded source and runtime before replay.' }
  }
  if (recorded.status === 'cancelled' || recorded.cases.some(value => value.error?.startsWith('Wall-time'))) {
    return { runId, status: 'inconclusive', message: 'Wall-time exhaustion and cancellation depend on the execution environment; inspect the retained partial trace.' }
  }
  const { definition } = validateRequest({ scenarioId: recorded.scenarioId, variant: recorded.variant, seedSetId: recorded.seedSetId, limits: recorded.limits })
  if (stableJson(recorded.cases.map(value => value.seed)) !== stableJson(SEED_SETS[recorded.seedSetId])) {
    return { runId, status: 'diverged', message: 'Recorded cases do not match the registered seed set.' }
  }
  if (definition.version !== recorded.scenarioVersion || definition.fixtureVersion !== recorded.fixtureVersion || definition.policyVersion !== recorded.policyVersion) {
    return { runId, status: 'inconclusive', message: 'Scenario, fixture, or policy version differs.' }
  }
  if (digest(gameplay(recorded.cases)) !== recorded.gameplayDigest) {
    return { runId, status: 'diverged', message: 'Recorded gameplay evidence was modified or corrupted.' }
  }
  async function finish(result: ReplayReport): Promise<ReplayReport> {
    const after = await captureProvenance()
    return after.sourceDigest === LOADED_PROVENANCE.sourceDigest ? result : { runId, status: 'inconclusive', message: RESTART_MESSAGE }
  }
  const deadline = performance.now() + recorded.limits.maxWallMs
  for (const previous of recorded.cases) {
    await setImmediate()
    const replayed = executeScenario(definition, previous.seed, recorded.variant, recorded.limits, { signal: options.signal, deadline })
    if (replayed.status === 'cancelled' || replayed.error?.startsWith('Wall-time')) {
      return finish({ runId, status: 'inconclusive', message: replayed.error ?? 'Replay interrupted.' })
    }
    if (previous.initialStateHash !== replayed.initialStateHash || digest(previous.initialState) !== previous.initialStateHash) {
      return finish({ runId, status: 'diverged', message: 'Initial synthetic state differs.', firstDivergence: { seed: previous.seed, index: -1, expected: previous.initialStateHash, actual: replayed.initialStateHash } })
    }
    for (let index = 0; index < Math.max(previous.trace.length, replayed.trace.length); index += 1) {
      if (stableJson(previous.trace[index]) !== stableJson(replayed.trace[index])) {
        return finish({ runId, status: 'diverged', message: 'Ordered scenario trace diverged.', firstDivergence: { seed: previous.seed, index, expected: previous.trace[index] ?? null, actual: replayed.trace[index] ?? null } })
      }
    }
    if (digest(gameplay([previous])) !== digest(gameplay([replayed]))) {
      const terminal = (result: CaseReport) => ({ status: result.status, stateHash: result.finalStateHash, foregroundAt: result.finalForegroundAt, counts: result.counts, metrics: result.metrics })
      return finish({ runId, status: 'diverged', message: 'Terminal gameplay result or metrics differ.', firstDivergence: { seed: previous.seed, index: previous.trace.length, expected: terminal(previous), actual: terminal(replayed) } })
    }
  }
  return finish({ runId, status: 'matched', message: 'Matching source, fixture, ordered actions, assertions, metrics, and terminal gameplay state reproduced.' })
}

export async function compareRuns(baseline: string, candidate: string, options: RunOptions = {}): Promise<ComparisonReport> {
  const [left, right] = await Promise.all([readReport(baseline, options), readReport(candidate, options)])
  const reasons: string[] = []
  if (left.scenarioId !== right.scenarioId) reasons.push('Different scenarios.')
  if (left.seedSetId !== right.seedSetId) reasons.push('Different seed sets.')
  if (left.fixtureVersion !== right.fixtureVersion || left.policyVersion !== right.policyVersion || left.scenarioVersion !== right.scenarioVersion) reasons.push('Scenario, fixture, or policy versions differ.')
  if (stableJson(left.limits) !== stableJson(right.limits)) reasons.push('Execution limits differ.')
  if (left.provenance.nodeVersion !== right.provenance.nodeVersion) reasons.push('Node runtimes differ.')
  if (stableJson(left.cases.map(value => [value.seed, value.initialStateHash])) !== stableJson(right.cases.map(value => [value.seed, value.initialStateHash]))) reasons.push('Initial fixtures or ordered seeds differ.')
  if (left.provenance.sourceDigest !== right.provenance.sourceDigest) reasons.push('Runtime source differs; this is an exploratory code comparison.')
  if (left.status !== 'passed' || right.status !== 'passed') reasons.push('At least one run is failed or incomplete.')
  const metrics: ComparisonReport['metrics'] = {}
  for (const key of [...new Set([...Object.keys(left.metrics), ...Object.keys(right.metrics)])].sort()) {
    const a = left.metrics[key] ?? null
    const b = right.metrics[key] ?? null
    metrics[key] = { baseline: a, candidate: b, ...(a?.mean !== undefined && b?.mean !== undefined ? { meanDelta: b.mean - a.mean } : {}) }
  }
  return { baseline, candidate, comparable: reasons.length === 0, reasons, metrics,
    note: 'Descriptive comparison only. Shared starting seeds do not align random draws after different actions. Inspect each case and incomplete outcomes; this is not a significance or balance claim.' }
}
