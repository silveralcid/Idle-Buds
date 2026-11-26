import { describe, expect, it } from 'vitest'
import { battleFrame } from '../../src/game/battle-playback.ts'
import { resolveBattle } from '../../src/game/battle.ts'
import type { BattleResult, BattleTeam } from '../../src/game/types.ts'

const team = (id: string): BattleTeam => ({ buds: [], commander: { id, name: id, attack: 4, health: 10 } })

describe('recorded battle playback', () => {
  it('projects recorded damage and healing without re-resolving or mutating the result', () => {
    const result: BattleResult = {
      version: 1, winner: 'left', rounds: 2,
      initial: { left: team('tender'), right: team('wild') },
      events: [
        { type: 'enter', round: 1, actor: 'left:tender', text: 'Ready' },
        { type: 'ability', round: 1, actor: 'left:tender', effect: 'Guard', amount: 1, text: 'Shield' },
        // The recorded damage intentionally differs from Attack. Playback follows the server result.
        { type: 'hit', round: 1, actor: 'right:wild', target: 'left:tender', amount: 7, health: 3, text: 'Hit' },
        { type: 'ability', round: 1, actor: 'left:tender', target: 'left:tender', effect: 'Mend', amount: 2, health: 5, text: 'Heal' },
        { type: 'hit', round: 2, actor: 'left:tender', target: 'right:wild', amount: 20, health: 0, text: 'Hit' },
        { type: 'defeat', round: 2, actor: 'right:wild', text: 'Defeat' },
        { type: 'end', round: 2, text: 'Victory' },
      ],
    }
    const saved = structuredClone(result)
    expect(battleFrame(result, 0)?.left[0].hp).toBe(10)
    expect(battleFrame(result, 2)?.left[0].shield).toBe(1)
    expect(battleFrame(result, 3)?.left[0]).toMatchObject({ hp: 3, shield: 0 })
    expect(battleFrame(result, 4)?.left[0].hp).toBe(5)
    expect(battleFrame(result, 5)?.right[0]).toMatchObject({ hp: 0, defeated: false })
    expect(battleFrame(result, 6)?.right[0]).toMatchObject({ hp: 0, defeated: true })
    expect(battleFrame(result, 7)?.finished).toBe(true)
    expect(battleFrame(result, 3)?.left[0].hp).toBe(3)
    expect(result).toEqual(saved)
  })

  it('advances the frontline only at the recorded defeat, preserving shared attacks', () => {
    const left: BattleTeam = { buds: [{ id: 'bud', name: 'Bud', attack: 10, health: 1 }], commander: team('tender').commander }
    const result = resolveBattle(left, { buds: [], commander: { id: 'wild', name: 'Wild', attack: 1, health: 10 } }, 'shared')
    const hitIndex = result.events.findIndex((event) => event.type === 'hit' && event.target === 'left:bud')
    const defeatIndex = result.events.findIndex((event) => event.type === 'defeat' && event.actor === 'left:bud')
    expect(result.events.filter((event) => event.type === 'hit')).toHaveLength(2)
    expect(battleFrame(result, hitIndex + 1)?.left.find((unit) => !unit.defeated)?.id).toBe('left:bud')
    expect(battleFrame(result, defeatIndex + 1)?.left.find((unit) => !unit.defeated)?.id).toBe('left:tender')
    expect(battleFrame(result, result.events.length)?.right[0].hp).toBe(0)
  })

  it('copies starting snapshots, emits typed effects, and retains authoritative final health', () => {
    const left = team('tender')
    left.commander.ability = 'Mend'
    left.commander.technique = 'Guard'
    const result = resolveBattle(left, team('wild'), 'effects')
    expect(result.initial).toEqual({ left, right: team('wild') })
    left.commander.health = 100
    expect(result.initial?.left.commander.health).toBe(10)
    expect(result.events.find((event) => event.effect === 'Guard')).toMatchObject({ amount: 1 })
    expect(result.events.find((event) => event.effect === 'Mend')).toMatchObject({ amount: 2, health: 9 })
    expect(result.events.filter((event) => event.type === 'hit').every((event) => Number.isInteger(event.health) && event.health! >= 0)).toBe(true)
  })

  it('keeps old PvE logs readable without fabricating their initial formation', () => {
    expect(battleFrame({ version: 1, winner: 'draw', rounds: 1, events: [] }, 0)).toBeNull()
  })
})
