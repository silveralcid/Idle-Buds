import { describe, expect, it } from 'vitest'
import { applyCommand, publicState } from '../../src/game/index.ts'
import { policyActions } from '../../tools/lab/policies.ts'
import { executeScenario } from '../../tools/lab/runner.ts'
import { getScenario, SCENARIOS } from '../../tools/lab/scenarios.ts'

const seed = 'idle-buds-lab-baseline-0'

describe('current game scenarios', () => {
  for (const scenario of SCENARIOS) {
    for (const variant of scenario.variants) {
      it(`${scenario.id}/${variant} qualifies its declared behavior`, () => {
        const result = executeScenario(scenario, seed, variant, scenario.limits)
        expect(result.status, JSON.stringify({ error: result.error, failures: result.assertions.filter(check => !check.passed) })).toBe('passed')
        expect(result.assertions.length).toBeGreaterThan(0)
        expect(result.metrics.goalReached).toBe(true)
        if (scenario.id === 'offline-return') {
          expect(result.counts.simulatedMs).toBe(variant === 'daily' ? 172_800_000 : 86_400_000)
          expect(result.counts.discardedMs).toBe(variant === 'daily' ? 0 : 86_400_000)
        }
        if (scenario.id === 'production-recovery' && variant !== 'paused') {
          expect(result.metrics.manualRestarts).toBe(0)
          expect(result.metrics.tenderXp).toBe(0)
        }
      })
    }
  }

  it('detects a duplicated completed output instead of approving a regenerated fixture', () => {
    const scenario = getScenario('inventory-recovery')
    const broken = {
      ...scenario,
      create(input: string, variant: string) {
        const state = scenario.create(input, variant)
        state.pendingRewards.tender.gear.push(structuredClone(state.pendingRewards.tender.gear[0]))
        return state
      },
    }
    const result = executeScenario(broken, seed, 'default', broken.limits)
    expect(result.status).toBe('failed')
    expect(result.assertions.some(check => check.id === 'pending-output-cleared' && !check.passed)).toBe(true)
  })

  it('keeps paused work across a generalist rotation and does not mutate public observations', () => {
    const scenario = getScenario('policy-progression')
    let state = scenario.create(seed, 'generalist')
    state = applyCommand(state, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-fiber' } }, 0).state
    state = applyCommand(state, { type: 'pauseActivity' }, 0).state
    const view = publicState(state)
    const before = structuredClone(view)
    const choices = policyActions('generalist', view, 1)
    expect(choices.every(command => command.type !== 'startActivity' || command.workerId !== undefined)).toBe(true)
    expect(view).toEqual(before)
    expect(view).not.toHaveProperty('seed')
    expect(view).not.toHaveProperty('rngCounter')
    expect(view).not.toHaveProperty('eggGenetics')
  })

  it('retains ingredient-blocked work instead of restarting it on every visit', () => {
    const scenario = getScenario('policy-progression')
    let state = scenario.create(seed, 'casual')
    state.inventory = {}
    for (const command of policyActions('casual', publicState(state), 0)) {
      state = applyCommand(state, command, 0).state
    }
    const crafter = state.buds[1]
    expect(state.activities[crafter.id].status).toBe('blocked')
    expect(policyActions('casual', publicState(state), 1)).toEqual([])
  })
})
