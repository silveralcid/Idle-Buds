import type { BattleEvent, BattleResult, BattleTeam, BattleUnit } from './types.ts'

export interface PlaybackUnit extends BattleUnit {
  hp: number
  shield: number
  defeated: boolean
  commander: boolean
}

export interface PlaybackFrame {
  left: PlaybackUnit[]
  right: PlaybackUnit[]
  event: BattleEvent | null
  finished: boolean
}

/** Projects a recorded result only. It never resolves combat or grants rewards. */
export function battleFrame(result: BattleResult, eventCount: number): PlaybackFrame | null {
  if (!result.initial) return null
  const units = (team: BattleTeam, side: string): PlaybackUnit[] => [...team.buds, team.commander].map((unit, index) => ({
    ...unit, id: `${side}:${unit.id}`, hp: unit.health, shield: 0, defeated: false, commander: index === team.buds.length,
  }))
  const left = units(result.initial.left, 'left')
  const right = units(result.initial.right, 'right')
  const byId = new Map([...left, ...right].map((unit) => [unit.id, unit]))
  const count = Math.max(0, Math.min(result.events.length, Math.floor(eventCount)))
  for (const event of result.events.slice(0, count)) {
    const actor = event.actor ? byId.get(event.actor) : undefined
    const target = event.target ? byId.get(event.target) : undefined
    if (event.type === 'hit' && target) {
      target.hp = event.health ?? Math.max(0, target.hp - (event.amount ?? 0))
      target.shield = 0
    } else if (event.type === 'ability' && event.effect === 'Mend' && target) {
      target.hp = event.health ?? Math.min(target.health, target.hp + (event.amount ?? 0))
    } else if (event.type === 'ability' && event.effect === 'Guard' && actor) {
      actor.shield = event.amount ?? 0
    } else if (event.type === 'defeat' && actor) {
      actor.hp = 0
      actor.defeated = true
    }
  }
  return { left, right, event: result.events[count - 1] ?? null, finished: count === result.events.length }
}
