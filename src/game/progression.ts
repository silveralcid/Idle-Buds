import { MAX_COINS, requireRule } from './limits.ts'
import type { GameState, PlayerView, Skill } from './types.ts'

export const MAX_XP = 1_000_000
const BASE_STORAGE = 100

function levelForTrack(xp: number, factor: number): number {
  let level = 1
  while (level < 99 && xp >= factor * level * (level + 1)) level += 1
  return level
}

export function levelForXp(xp: number): number {
  return levelForTrack(xp, 8)
}

export function budLevelForXp(xp: number): number {
  return levelForTrack(xp, 10)
}

export function itemCapacity(state: PlayerView): number {
  return BASE_STORAGE * (1 + state.upgrades.storage)
}

export function workerCapacity(state: PlayerView): number {
  return Number(state.stats.catches > 0) + state.upgrades.worker
}

export function earnXp(state: GameState, skill: Skill, amount: number): void {
  state.xp[skill] = Math.min(MAX_XP, state.xp[skill] + amount)
}

export function earnCoins(state: GameState, amount: number): void {
  const earned = Math.min(MAX_COINS - state.coins, amount)
  state.coins += earned
  state.stats.coinsEarned = Math.min(Number.MAX_SAFE_INTEGER, state.stats.coinsEarned + earned)
}

export function spendCoins(state: GameState, amount: number): void {
  requireRule(state.coins >= amount, 'You need more coins.')
  state.coins -= amount
  state.stats.coinsSpent = Math.min(Number.MAX_SAFE_INTEGER, state.stats.coinsSpent + amount)
}

export function itemCount(state: PlayerView, item: string): number {
  return Object.hasOwn(state.inventory, item) ? state.inventory[item] : 0
}

export function hasItems(state: PlayerView, inputs: Readonly<Record<string, number>>): boolean {
  return Object.entries(inputs).every(([item, amount]) => itemCount(state, item) >= amount)
}

export function takeItems(state: GameState, inputs: Readonly<Record<string, number>>): void {
  requireRule(hasItems(state, inputs), 'Missing required inputs.')
  for (const [item, amount] of Object.entries(inputs)) {
    const remainder = itemCount(state, item) - amount
    if (remainder === 0) delete state.inventory[item]
    else state.inventory[item] = remainder
  }
}

export function addItems(state: GameState, item: string, amount: number): number {
  const before = itemCount(state, item)
  const actual = Math.min(itemCapacity(state) - before, amount)
  if (actual > 0) state.inventory[item] = before + actual
  return actual
}
