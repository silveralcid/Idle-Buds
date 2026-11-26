import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createPlayer, OFFLINE_CAP_MS } from '../../src/game/index.ts'
import { compareRuns, executeScenario, readReport, replayRun, runScenario } from '../../tools/lab/runner.ts'
import { digest } from '../../tools/lab/provenance.ts'
import type { ScenarioDefinition } from '../../tools/lab/types.ts'

const scratch: string[] = []
async function artifactRoot() {
  const path = await mkdtemp(join(tmpdir(), 'idle-buds-lab-'))
  scratch.push(path)
  return path
}
afterEach(async () => { await Promise.all(scratch.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

function scenario(run: ScenarioDefinition['run']): ScenarioDefinition {
  return { id: 'harness-sensitivity', version: 1, fixtureVersion: 1, policyVersion: 1, description: 'Harness qualification',
    question: 'Does the runner detect incorrect or incomplete evidence?', variants: ['default'],
    limits: { maxActions: 10, maxEvents: 100, maxSimulatedMs: 2 * OFFLINE_CAP_MS, maxWallMs: 5_000 },
    create: seed => createPlayer('Harness', 0, seed), run }
}
function execute(definition: ScenarioDefinition) { return executeScenario(definition, 'qualification', 'default', definition.limits) }

describe('lab harness sensitivity and clocks', () => {
  it('records a false assertion as failure and does not accept an empty scenario', () => {
    const failed = execute(scenario(context => { context.check('earned-one-scrap', context.observe().inventory.scrap === 1) }))
    expect(failed.status).toBe('failed')
    expect(failed.assertions).toEqual([{ id: 'earned-one-scrap', passed: false }])
    expect(execute(scenario(() => {})).status).toBe('inconclusive')
    const brokenFixture = scenario(context => context.check('unreachable', true))
    brokenFixture.create = () => { throw new Error('fixture unavailable') }
    expect(execute(brokenFixture)).toMatchObject({ status: 'failed', error: 'Fixture failed: fixture unavailable', trace: [] })
  })

  it('preserves a single offline allowance across passive inspection and background reconciliation', () => {
    const absent = execute(scenario(context => {
      context.act({ type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: 1 } })
      context.advanceTo(OFFLINE_CAP_MS, 'background')
      const copy = context.inspect()
      const originalCoins = copy.coins
      copy.coins = originalCoins + 42
      for (let index = 0; index < 100; index += 1) context.observe()
      context.advanceTo(2 * OFFLINE_CAP_MS, 'background')
      context.check('snapshot-is-passive-and-cloned', context.inspect().coins === originalCoins)
      context.check('public-state-hides-randomness', !Object.hasOwn(context.observe(), 'seed'))
      context.check('reward-once', context.observe().inventory.scrap === 1)
    }))
    expect(absent.status).toBe('passed')
    expect(absent.counts).toMatchObject({ simulatedMs: OFFLINE_CAP_MS, discardedMs: OFFLINE_CAP_MS, events: 1 })
    expect(absent.finalForegroundAt).toBe(0)
    const daily = execute(scenario(context => {
      context.advanceTo(OFFLINE_CAP_MS)
      context.advanceTo(2 * OFFLINE_CAP_MS)
      context.check('daily-check-ins', true)
    }))
    expect(daily.counts).toMatchObject({ simulatedMs: 2 * OFFLINE_CAP_MS, discardedMs: 0 })
    expect(daily.finalForegroundAt).toBe(2 * OFFLINE_CAP_MS)
  })

  it('records rejected replacement without erasing prior earned rewards or the active order', () => {
    const result = execute(scenario(context => {
      context.act({ type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } })
      context.advanceTo(4_000)
      const rejected = context.act({ type: 'startActivity', order: { kind: 'gather', nodeId: 'glass-quartz' } })
      context.check('locked-order-rejected', !rejected.accepted)
      const order = context.observe().activities.tender.order
      context.check('old-order-preserved', order.kind === 'gather' && order.nodeId === 'earth-scrap')
      context.check('earned-output-preserved', context.observe().inventory.scrap === 1)
    }))
    expect(result.status).toBe('passed')
    expect(result.trace.filter(entry => entry.kind === 'command').map(entry => entry.accepted)).toEqual([true, false])
  })

  it('enforces action, event, and simulated-time limits with retained partial evidence', () => {
    const commands = scenario(context => {
      context.act({ type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } })
      context.act({ type: 'stopActivity' })
      context.check('must-not-reach', true)
    })
    commands.limits.maxActions = 1
    expect(execute(commands)).toMatchObject({ status: 'budget_exhausted', counts: { actions: 1 }, error: 'Action budget exhausted.' })
    const events = scenario(context => {
      context.act({ type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } })
      context.advanceTo(12_000)
      context.check('must-not-reach', true)
    })
    events.limits.maxEvents = 1
    const partial = execute(events)
    expect(partial).toMatchObject({ status: 'budget_exhausted', counts: { events: 1 }, error: 'Event budget exhausted.' })
    expect(partial.trace.at(-1)).toMatchObject({ kind: 'advance', target: 12_000, at: 4_000, completed: false })
    const time = scenario(context => context.advanceTo(100))
    time.limits.maxSimulatedMs = 99
    expect(execute(time)).toMatchObject({ status: 'budget_exhausted', error: 'Simulated-time budget exhausted.' })
  })

  it('honors cooperative cancellation and a wall deadline without calling the scenario body', () => {
    const definition = scenario(() => { throw new Error('must not execute') })
    const aborted = new AbortController()
    aborted.abort()
    expect(executeScenario(definition, 'abort', 'default', definition.limits, { signal: aborted.signal }).status).toBe('cancelled')
    expect(executeScenario(definition, 'timeout', 'default', definition.limits, { deadline: 0 })).toMatchObject({ status: 'budget_exhausted', error: 'Wall-time budget exhausted.' })
  })
})

describe('lab artifacts and replay', () => {
  it('retains independent runs, matches normalized gameplay, and replays the ordered trace', async () => {
    const options = { artifactRoot: await artifactRoot() }
    const request = { scenarioId: 'activity-replacement' }
    const first = await runScenario(request, options)
    const second = await runScenario(request, options)
    expect(first.status).toBe('passed')
    expect(first.runId).not.toBe(second.runId)
    expect(first.gameplayDigest).toBe(second.gameplayDigest)
    expect(await readReport(first.runId, options)).toEqual(first)
    expect(await readFile(first.artifacts.markdown, 'utf8')).toContain('activity-replacement: passed')
    expect(await replayRun(first.runId, options)).toMatchObject({ status: 'matched' })
    expect(await compareRuns(first.runId, second.runId, options)).toMatchObject({ comparable: true, reasons: [] })
  })

  it('rejects unknown inputs and raises limits only by editing the registered scenario', async () => {
    const options = { artifactRoot: await artifactRoot() }
    await expect(runScenario({ scenarioId: 'does-not-exist' }, options)).rejects.toThrow()
    await expect(runScenario({ scenarioId: 'activity-replacement', seedSetId: 'constructor' }, options)).rejects.toThrow('Unknown seed set')
    await expect(runScenario({ scenarioId: 'activity-replacement', limits: { maxActions: Number.MAX_SAFE_INTEGER } }, options)).rejects.toThrow('scenario limit')
    await expect(readReport('../another-directory', options)).rejects.toThrow('Invalid lab run ID')
  })

  it('identifies tampering and refuses replay with a different runtime source', async () => {
    const options = { artifactRoot: await artifactRoot() }
    const report = await runScenario({ scenarioId: 'activity-replacement' }, options)
    const original = JSON.stringify(report)
    report.cases[0].trace[0].stateHash = 'modified'
    await writeFile(report.artifacts.report, JSON.stringify(report))
    expect(await replayRun(report.runId, options)).toMatchObject({ status: 'diverged' })
    const restored = JSON.parse(original) as typeof report
    restored.provenance.sourceDigest = 'different-source'
    await writeFile(report.artifacts.report, JSON.stringify(restored))
    expect(await replayRun(report.runId, options)).toMatchObject({ status: 'inconclusive' })
  })

  it('reports the first divergence even when a modified trace has a recomputed integrity digest', async () => {
    const options = { artifactRoot: await artifactRoot() }
    const report = await runScenario({ scenarioId: 'activity-replacement' }, options)
    report.cases[0].trace[0].stateHash = 'modified'
    report.gameplayDigest = digest(report.cases.map(result => ({
      seed: result.seed, status: result.status, initialStateHash: result.initialStateHash, finalStateHash: result.finalStateHash,
      finalForegroundAt: result.finalForegroundAt, trace: result.trace, assertions: result.assertions, metrics: result.metrics, counts: result.counts,
    })))
    await writeFile(report.artifacts.report, JSON.stringify(report))
    const replay = await replayRun(report.runId, options)
    expect(replay).toMatchObject({ status: 'diverged', firstDivergence: { index: 0, seed: report.cases[0].seed } })
  })

  it('does not present differently bounded or exhausted runs as directly comparable', async () => {
    const options = { artifactRoot: await artifactRoot() }
    const baseline = await runScenario({ scenarioId: 'activity-replacement' }, options)
    const partial = await runScenario({ scenarioId: 'activity-replacement', limits: { maxActions: 1 } }, options)
    expect(partial.status).toBe('budget_exhausted')
    const comparison = await compareRuns(baseline.runId, partial.runId, options)
    expect(comparison.comparable).toBe(false)
    expect(comparison.reasons).toContain('Execution limits differ.')
    expect(comparison.reasons).toContain('At least one run is failed or incomplete.')
    expect(await replayRun(partial.runId, options)).toMatchObject({ status: 'matched' })
  })
})
