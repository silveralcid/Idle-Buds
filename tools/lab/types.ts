import type { GameCommand, GameState, PlayerView } from '../../src/game/types.ts'

export type RunStatus = 'passed' | 'failed' | 'budget_exhausted' | 'cancelled' | 'inconclusive'
export type MetricValue = number | string | boolean | null
export interface RunLimits { maxActions: number; maxEvents: number; maxSimulatedMs: number; maxWallMs: number }
export interface ScenarioContext {
  readonly seed: string
  readonly variant: string
  /** Cloned public observation. Does not reconcile, check in, or change time. */
  observe(): PlayerView
  /** Private cloned synthetic snapshot for assertions, never supplied to player policies. */
  inspect(): GameState
  /** Acts at the current game time, using the same rules as a foreground command. */
  act(command: GameCommand): { accepted: boolean; message: string }
  /** Only check-in mode renews the offline allowance. Background reconciliation never does. */
  advanceTo(now: number, mode?: 'check-in' | 'background'): void
  check(id: string, condition: boolean, detail?: string): void
  metric(name: string, value: MetricValue): void
  note(message: string): void
}
export interface ScenarioDefinition {
  id: string
  version: number
  description: string
  question: string
  fixtureVersion: number
  policyVersion: number
  variants: readonly string[]
  limits: RunLimits
  create(seed: string, variant: string): GameState
  run(context: ScenarioContext): void
}
export interface RunRequest {
  scenarioId: string
  seedSetId?: string
  variant?: string
  limits?: Partial<RunLimits>
}
