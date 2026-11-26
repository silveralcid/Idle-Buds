import type { GameCommand, GameState } from '../../src/game/types.ts'
import type { Provenance } from './provenance.ts'
import type { MetricValue, RunLimits, RunStatus } from './types.ts'

export interface AssertionResult { id: string; passed: boolean; detail?: string }
export interface TraceEntry {
  index: number
  kind: 'command' | 'advance' | 'check'
  at: number
  foregroundAt: number
  stateHash: string
  command?: GameCommand
  target?: number
  mode?: 'check-in' | 'background'
  completed?: boolean
  accepted?: boolean
  message?: string
  assertion?: AssertionResult
}
export interface CaseReport {
  seed: string
  status: RunStatus
  initialState: GameState
  initialStateHash: string
  finalStateHash: string
  finalForegroundAt: number
  trace: TraceEntry[]
  assertions: AssertionResult[]
  metrics: Record<string, MetricValue>
  notes: string[]
  counts: { actions: number; events: number; simulatedMs: number; discardedMs: number }
  error?: string
}
export interface MetricAggregate { values: MetricValue[]; min?: number; max?: number; mean?: number }
export interface RunReport {
  schemaVersion: 1
  runId: string
  scenarioId: string
  scenarioVersion: number
  fixtureVersion: number
  policyVersion: number
  variant: string
  seedSetId: string
  question: string
  status: RunStatus
  limits: RunLimits
  provenance: Provenance
  startedAt: string
  finishedAt: string
  durationMs: number
  gameplayDigest: string
  summary: { cases: number; passed: number; failed: number; incomplete: number; assertions: number; failedAssertions: number }
  metrics: Record<string, MetricAggregate>
  cases: CaseReport[]
  artifacts: { report: string; markdown: string; trace: string }
}
export interface ReplayReport {
  runId: string
  status: 'matched' | 'diverged' | 'inconclusive'
  message: string
  firstDivergence?: { seed: string; index: number; expected: unknown; actual: unknown }
}
export interface ComparisonReport {
  baseline: string
  candidate: string
  comparable: boolean
  reasons: string[]
  metrics: Record<string, { baseline: MetricAggregate | null; candidate: MetricAggregate | null; meanDelta?: number }>
  note: string
}

export function summarizeReport(report: RunReport) {
  return {
    runId: report.runId, status: report.status, scenarioId: report.scenarioId, variant: report.variant,
    seedSetId: report.seedSetId, question: report.question, summary: report.summary, metrics: report.metrics,
    gameplayDigest: report.gameplayDigest, artifacts: report.artifacts,
  }
}

function cell(value: unknown): string { return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ') }

export function renderReport(report: RunReport): string {
  const failures = report.cases.flatMap(result => [
    ...result.assertions.filter(assertion => !assertion.passed).map(assertion => `${result.seed}: ${assertion.id}${assertion.detail ? ` (${assertion.detail})` : ''}`),
    ...(result.error ? [`${result.seed}: ${result.error}`] : []),
  ])
  const metrics = Object.entries(report.metrics).map(([name, metric]) => `| ${cell(name)} | ${cell(metric.mean ?? metric.values.join(', '))} | ${cell(metric.min ?? '')} | ${cell(metric.max ?? '')} |`)
  return [
    `# ${report.scenarioId}: ${report.status}`, '', report.question, '',
    `Run: \`${report.runId}\`. Variant: \`${report.variant}\`. Seeds: \`${report.seedSetId}\`.`, '',
    '## Outcome', '',
    `${report.summary.passed}/${report.summary.cases} cases passed; ${report.summary.failed} failed; ${report.summary.incomplete} incomplete. `
      + `${report.summary.assertions} assertions, ${report.summary.failedAssertions} failed.`, '',
    report.status === 'passed' ? 'The recorded assertions passed for these synthetic cases. Human usability and economic balance require their own evidence.'
      : 'Inspect the incomplete cases or failures before drawing a design conclusion. An interrupted or exhausted run is not a pass.', '',
    '## Metrics', '', '| Metric | Mean or values | Minimum | Maximum |', '|---|---|---|---|', ...metrics, '',
    '## Failures and incomplete work', '', ...(failures.length ? failures.map(value => `- ${value}`) : ['None recorded.']), '',
    '## Cases', '', '| Seed | Status | Actions | Events | Eligible ms | Discarded ms |', '|---|---|---|---|---|---|',
    ...report.cases.map(result => `| ${cell(result.seed)} | ${result.status} | ${result.counts.actions} | ${result.counts.events} | ${result.counts.simulatedMs} | ${result.counts.discardedMs} |`), '',
    '## Source and reproduction', '',
    `Commit: \`${report.provenance.commit ?? 'unavailable'}\`; dirty: ${report.provenance.dirty}.`, '',
    `Runtime source digest: \`${report.provenance.sourceDigest}\`. Gameplay digest: \`${report.gameplayDigest}\`.`, '',
    `Rules ${report.provenance.rulesVersion}; save ${report.provenance.saveVersion}; scenario ${report.scenarioVersion}; fixture ${report.fixtureVersion}; policy ${report.policyVersion}.`, '',
    `Replay with \`npm run lab -- replay ${report.runId}\` using the same artifact root and matching runtime source.`, '',
    'The game clock is controlled. Passive snapshots never check a player in. This rules run does not exercise HTTP, PostgreSQL, session expiry, rate limits, physical input, or a live model.', '',
    ...report.cases.flatMap(result => result.notes.map(note => `- ${result.seed}: ${note}`)), '',
  ].join('\n')
}
