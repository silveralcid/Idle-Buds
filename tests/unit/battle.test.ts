import { describe, expect, it } from 'vitest'
import { advance, applyCommand, buildFormation, createPlayer, MAX_BATTLE_ROUNDS, resolveBattle } from '../../src/game/index.ts'
import { addBud } from '../../src/game/breeding.ts'
import type { BattleTeam, BattleUnit, GameState } from '../../src/game/types.ts'

function unit(id: string, attack: number, health: number): BattleUnit {
  return { id, name: id, attack, health }
}

function duel(id: string, attack: number, health: number): BattleTeam {
  return { buds: [], commander: unit(id, attack, health) }
}

function battle(state: GameState, at = 0) {
  return applyCommand(state, { type: 'startActivity', order: { kind: 'battle', zoneId: 'earth' } }, at).state
}

describe('the shared battle engine', () => {
  it('produces the same ordered replay without mutating snapshots and handles shared defeat', () => {
    const left = duel('A', 2, 2)
    const right = duel('B', 2, 2)
    const result = resolveBattle(left, right, 'golden')
    expect(result).toEqual(resolveBattle(left, right, 'golden'))
    expect(result).toMatchObject({ winner: 'draw', rounds: 1 })
    expect(result.events.map((event) => event.type)).toEqual(['enter', 'enter', 'hit', 'hit', 'defeat', 'defeat', 'end'])
    expect(left.commander).toEqual(unit('A', 2, 2))
  })

  it('protects the commander behind its Buds, supports once, and then enters the frontline', () => {
    const left = { buds: [unit('guard', 1, 5)], commander: { ...unit('commander', 6, 10), ability: 'Mend' as const } }
    const result = resolveBattle(left, duel('rival', 3, 6), 'commander')
    const support = result.events.find((event) => event.actor === 'left:commander' && event.type === 'ability')
    const firstHit = result.events.find((event) => event.type === 'hit' && event.target === 'left:commander')
    const budDefeat = result.events.find((event) => event.type === 'defeat' && event.actor === 'left:guard')
    const entry = result.events.find((event) => event.type === 'enter' && event.actor === 'left:commander')
    expect(support).toMatchObject({ round: 1, target: 'left:guard', amount: 2 })
    expect(entry?.round).toBe((budDefeat?.round ?? 0) + 1)
    expect(firstHit?.round).toBe(entry?.round)
    expect(result.winner).toBe('left')
  })

  it('terminates stalled fights and allows effects to change deterministic outcomes', () => {
    const stalled = resolveBattle(duel('zero', 0, 2), duel('zero', 0, 2), 'stalled')
    expect(stalled).toMatchObject({ winner: 'draw', rounds: MAX_BATTLE_ROUNDS })
    const left = { buds: [], commander: { ...unit('farmer', 1, 2), technique: 'Strike' as const } }
    const right = duel('rival', 1, 2)
    expect(resolveBattle(left, right, 'baseline', { effects: false }).winner).toBe('draw')
    expect(resolveBattle(left, right, 'baseline').winner).toBe('left')
  })

  it('gives participation XP to all assigned Buds and freezes changes through a running order', () => {
    let state = createPlayer('Tender', 0, 'participants')
    addBud(state, 'pebbleback', { trait: 'Stalwart', sex: 'Female', ivs: { attack: 6, health: 10, gather: 0, craft: 0 } })
    addBud(state, 'spriglet', { trait: 'Diligent', sex: 'Male', ivs: { attack: 0, health: 1, gather: 0, craft: 0 } })
    state = applyCommand(state, { type: 'setFormation', budIds: state.buds.map((bud) => bud.id) }, 0).state
    const startingTeam = buildFormation(state)
    state = battle(state)
    expect(buildFormation(state).buds.map((bud) => bud.id)).toEqual(state.formation)
    expect(() => applyCommand(state, { type: 'setFormation', budIds: [] }, 1)).toThrow('Stop the current battle order')
    const after = advance(state, 12_000).state
    expect(after.buds.map((bud) => bud.xp)).toEqual([12, 12])
    expect(after.xp.Melee).toBe(12)
    expect(after.xp.Vitality).toBe(6)
    expect(after.lastEncounter?.battle.initial?.left).toEqual(startingTeam)
    expect(after.lastEncounter).toMatchObject({ id: 'encounter-1', completedAt: 12_000 })
  })
})

describe('capture filters and cost', () => {
  it('uses the first match, reports unavailable supplies, and skips without using items', () => {
    let state = createPlayer('Tender', 0, 'priority')
    state.inventory['capture-kit'] = 2
    state = applyCommand(state, {
      type: 'setCaptureFilters', filters: [{ condition: 'any', itemId: 'skip' }, { condition: 'new', itemId: 'capture-kit' }],
    }, 0).state
    state = advance(battle(state), 12_000).state
    expect(state.lastEncounter?.capture.outcome).toBe('skipped')
    expect(state.inventory['capture-kit']).toBe(2)

    state = applyCommand(state, {
      type: 'setCaptureFilters', filters: [{ condition: 'new', itemId: 'prism-kit' }, { condition: 'any', itemId: 'capture-kit' }],
    }, 12_000).state
    state = advance(battle(state, 12_000), 24_000).state
    expect(state.lastEncounter?.capture.outcome).toBe('unavailable')
    expect(state.inventory['capture-kit']).toBe(2)
    expect(state.buds).toHaveLength(0)
  })

  it('uses no item or reward on a loss against a stronger late-zone wild team', () => {
    let state = createPlayer('Tender', 0, 'loser')
    state.unlockedZones.push('glassreach', 'hollowtide')
    state.zoneId = 'hollowtide'
    state.inventory['capture-kit'] = 1
    state = applyCommand(state, { type: 'startActivity', order: { kind: 'battle', zoneId: 'hollowtide' } }, 0).state
    state = advance(state, 20_000).state
    expect(state.lastEncounter?.battle.winner).toBe('right')
    expect(state.lastEncounter?.capture.outcome).toBe('skipped')
    expect(state.inventory).toEqual({ 'capture-kit': 1 })
    expect(state.coins).toBe(0)
  })
})
