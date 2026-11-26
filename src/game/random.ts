import seedrandom from 'seedrandom'
import type { GameState } from './types.ts'

export type Random = () => number

export function sourceFor(seed: string, domain: string, index = 0): seedrandom.PRNG {
  return seedrandom(JSON.stringify([seed, domain, index]))
}

export function eventRandom(state: GameState, domain: string): Random {
  state.rngCounter += 1
  return sourceFor(state.seed, domain, state.rngCounter)
}

export function instanceId(state: GameState, type: 'bud' | 'gear' | 'egg'): string {
  state.nextId += 1
  const stream = sourceFor(state.seed, 'identity', state.nextId)
  const hex = Array.from({ length: 4 }, () => (stream.int32() >>> 0).toString(16).padStart(8, '0')).join('')
  return `${type}-${hex}`
}

export function pick<T>(random: Random, options: readonly T[]): T {
  return options[Math.floor(random() * options.length)]
}
