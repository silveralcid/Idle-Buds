import { describe, expect, it } from 'vitest'
import { SPECIES } from '../../src/data/catalog.ts'
import {
  advance, applyCommand, createPlayer, isBudCommitted, itemCapacity, OFFLINE_CAP_MS, publicState, RuleError,
} from '../../src/game/index.ts'
import { addBud } from '../../src/game/breeding.ts'
import type { ActivityOrder, GameCommand, GameState } from '../../src/game/types.ts'

function start(state: GameState, at: number, order: ActivityOrder, workerId?: string) {
  return applyCommand(state, { type: 'startActivity', order, workerId }, at).state
}

function starter(seed = 'first-loop') {
  return createPlayer('Tester', 0, seed)
}

describe('a fresh Tender', () => {
  it('earns a first Bud, then puts it to work without sharing its XP', () => {
    const elapsed: number[] = []
    let failedAttempts = 0
    for (let seed = 0; seed < 100; seed += 1) {
      let state = starter(`onboard-${seed}`)
      let now = 0
      expect(state.buds).toHaveLength(0)
      for (let attempt = 0; attempt < 10 && state.buds.length === 0; attempt += 1) {
        state = start(state, now, { kind: 'gather', nodeId: 'earth-scrap', count: 3 })
        now += 12_000
        state = start(state, now, { kind: 'craft', recipeId: 'capture-kit' })
        now += 5_000
        state = start(state, now, { kind: 'battle', zoneId: 'earth' })
        now += 12_000
        state = advance(state, now).state
        expect(state.lastEncounter?.battle.winner).toBe('left')
        expect(state.inventory['capture-kit']).toBeUndefined()
        if (state.lastEncounter?.capture.outcome === 'failed') failedAttempts += 1
      }
      expect(state.buds).toHaveLength(1)
      expect(state.stats.catches).toBe(1)
      const bud = state.buds[0]
      const nodeId = SPECIES[bud.speciesId].aptitudes.includes('Mining') ? 'earth-scrap' : 'earth-fiber'
      state = start(state, now, { kind: 'gather', nodeId }, bud.id)
      expect(isBudCommitted(state, bud.id)).toBe(true)
      const restored = JSON.parse(JSON.stringify(state)) as GameState
      const offline = advance(restored, now + 20_000)
      expect(offline.state.xp).toEqual(state.xp)
      expect(offline.state.buds[0].xp).toBeGreaterThan(0)
      expect(offline.summary.budXp[bud.id]).toBe(offline.state.buds[0].xp)
      elapsed.push(now)
    }
    elapsed.sort((left, right) => left - right)
    expect(failedAttempts).toBeGreaterThan(0)
    expect(elapsed[49]).toBeLessThanOrEqual(60_000)
    expect(elapsed[89]).toBeLessThanOrEqual(120_000)
    expect(elapsed[99]).toBeLessThanOrEqual(300_000)
  })

  it('exposes a detached view without sequence seeds, counters or hidden genetics', () => {
    const state = starter()
    const view = publicState(state)
    expect('seed' in view).toBe(false)
    expect('rngCounter' in view).toBe(false)
    expect('nextId' in view).toBe(false)
    expect('eggGenetics' in view).toBe(false)
    view.inventory.scrap = 3
    expect(state.inventory.scrap).toBeUndefined()
  })
})

describe('shared activity clock', () => {
  it('resolves exactly one cycle at its boundary and preserves pause remainder', () => {
    let state = start(starter(), 0, { kind: 'gather', nodeId: 'earth-scrap', count: 1 })
    const partial = advance(state, 3_999)
    expect(partial.summary.cycles).toBe(0)
    expect(partial.state.activities.tender.remainingMs).toBe(1)
    state = applyCommand(partial.state, { type: 'pauseActivity' }, 3_999).state
    expect(advance(state, 7_000).summary.cycles).toBe(0)
    state = applyCommand(state, { type: 'resumeActivity' }, 7_000).state
    const completed = advance(state, 7_001)
    expect(completed.summary).toMatchObject({ cycles: 1, coins: 1, items: { scrap: 1 }, xp: { Mining: 8 } })
    expect(advance(completed.state, 7_001).summary.cycles).toBe(0)
    expect(state.inventory.scrap).toBeUndefined()
    expect(() => advance(completed.state, 7_000)).toThrow(RuleError)
  })

  it('is exactly partition-invariant through queued actions, capture rolls and independent Bud work', () => {
    let state = starter()
    addBud(state, 'spriglet', { sex: 'Female', trait: 'Diligent', ivs: { attack: 1, health: 9, gather: 7, craft: 3 } })
    state.stats.catches = 1
    state = start(state, 0, { kind: 'gather', nodeId: 'earth-fiber' }, state.buds[0].id)
    state = start(state, 0, { kind: 'gather', nodeId: 'earth-scrap', count: 6 })
    state = applyCommand(state, { type: 'queueActivity', order: { kind: 'craft', recipeId: 'capture-kit', count: 2 } }, 1).state
    state = applyCommand(state, { type: 'queueActivity', order: { kind: 'battle', zoneId: 'earth', count: 3 } }, 2).state

    for (const endpoint of [2, 3_999, 4_000, 29_000, 300_000, 3_600_000, OFFLINE_CAP_MS]) {
      const offline = advance(state, endpoint)
      const marks = [...new Set([2, ...[3_999, 4_000, 23_999, 24_000, 29_000, 34_000, 60_133, 300_000].filter((at) => at < endpoint), endpoint])]
      const online = marks.reduce((snapshot, at) => advance(snapshot, at).state, state)
      expect(online).toEqual(offline.state)
    }
  })

  it('discards elapsed time past 24 hours and preserves the unfinished cycle for future work', () => {
    let state = starter('offline-cap')
    state = applyCommand(state, { type: 'setCaptureFilters', filters: [] }, 0).state
    state = start(state, 0, { kind: 'battle', zoneId: 'earth', count: 10_000 })
    state = advance(state, 5_000).state
    const exact = advance(state, state.lastAt + OFFLINE_CAP_MS)
    const beyond = advance(state, state.lastAt + OFFLINE_CAP_MS + 60_000)
    expect(exact.summary.cycles).toBe(7_200)
    expect(beyond.summary).toMatchObject({ cycles: 7_200, simulatedMs: OFFLINE_CAP_MS, discardedMs: 60_000 })
    expect(beyond.state.rngCounter).toBe(exact.state.rngCounter)
    expect(beyond.state.stats).toEqual(exact.state.stats)
    expect(beyond.state.activities.tender.remainingMs).toBe(7_000)
    expect(advance(beyond.state, beyond.state.lastAt + 6_999).summary.cycles).toBe(0)
    expect(advance(beyond.state, beyond.state.lastAt + 7_000).summary.cycles).toBe(1)
  })

  it('preserves exact progress across intermediate reconciles that share one simulation budget', () => {
    const state = start(starter('shared-budget'), 0, { kind: 'gather', nodeId: 'earth-scrap', count: 5 })
    const direct = advance(state, 40_000, 8_250)
    const first = advance(state, 5_000, 8_250)
    const second = advance(first.state, 11_000, 3_250)
    const third = advance(second.state, 40_000, 0)
    expect(third.state).toEqual(direct.state)
    expect(third.summary.cycles).toBe(0)
    expect(third.state.activities.tender.remainingMs).toBe(3_750)
    expect(() => advance(state, 40_000, -1)).toThrow('simulation budget')
    expect(() => advance(state, 40_000, OFFLINE_CAP_MS + 1)).toThrow('simulation budget')
  })

  it('halts on capacity and resumes without carrying discarded progress', () => {
    let state = starter('full-storage')
    state.inventory.scrap = itemCapacity(state) - 1
    state = start(state, 0, { kind: 'gather', nodeId: 'earth-scrap' })
    const completed = advance(state, 9_999)
    expect(completed.state.inventory.scrap).toBe(itemCapacity(state))
    expect(completed.summary.cycles).toBe(1)
    expect(completed.summary.stopped).toEqual([{ workerId: 'tender', reason: 'Storage is full for this resource.' }])
    completed.state.inventory.scrap -= 1
    state = applyCommand(completed.state, { type: 'resumeActivity' }, 9_999).state
    expect(advance(state, 13_998).summary.cycles).toBe(0)
    expect(advance(state, 13_999).summary.cycles).toBe(1)
  })

  it('rechecks shared inputs when concurrent jobs complete and stops the blocked order', () => {
    let state = starter()
    state.inventory = { minnow: 1, greens: 1, 'portal-dust': 1 }
    addBud(state, 'tinwhisker', { sex: 'Male', trait: 'Precise', ivs: { attack: 1, health: 9, gather: 7, craft: 3 } })
    state.stats.catches = 1
    state = start(state, 0, { kind: 'craft', recipeId: 'trail-stew' }, state.buds[0].id)
    state = start(state, 0, { kind: 'craft', recipeId: 'portal-compound' })
    const end = advance(state, 6_000)
    expect(end.summary.cycles).toBe(1)
    expect(end.state.inventory).toEqual({ 'trail-stew': 1, 'portal-dust': 1 })
    expect(end.state.activities.tender).toMatchObject({ nextAt: null, stopReason: 'Missing required inputs.' })
    expect(end.state.xp.Synthesis).toBe(0)
    expect(end.state.xp.Cooking).toBe(0)
  })

  it('rejects malformed and unexpected commands, unknown catalog IDs and unsafe timing', () => {
    for (const input of [
      null,
      { type: 'startActivity', order: { kind: 'gather', nodeId: '__proto__' } },
      { type: 'startActivity', order: { kind: 'craft', recipeId: 'constructor' } },
      { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: Infinity } },
      { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: 0 } },
      { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: 1.5 } },
      { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: 10_001 } },
      { type: 'travel', zoneId: 'earth', clientTime: 20_000 },
      { type: 'setCaptureFilters', filters: [{ condition: 'affinity', itemId: 'capture-kit', value: 'unknown' }] },
      { type: 'releaseBud', budId: 'test', confirm: false },
    ]) {
      expect(() => applyCommand(starter(), input as GameCommand, 0)).toThrow(RuleError)
    }
    expect(() => advance(starter(), NaN)).toThrow(RuleError)
    expect(() => advance(starter(), Number.MAX_SAFE_INTEGER)).toThrow(RuleError)
    expect(() => start(starter(), 0, { kind: 'craft', recipeId: 'capture-kit' })).toThrow('Missing required inputs.')
  })
})
