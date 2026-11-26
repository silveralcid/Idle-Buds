import { PRODUCTION_SKILLS, ZONES } from '../data/catalog.ts'
import { MAX_COINS, requireRule } from './limits.ts'
import type { GameState, Gear, PlayerView, Skill, ZoneId } from './types.ts'

export const MAX_XP = 1_000_000
const BASE_STORAGE = 24

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

/** Shared slots. Quantities within an existing item stack do not use slots. */
export function inventoryCapacity(state: PlayerView): number {
  return BASE_STORAGE + state.upgrades.storage * 8
}

/** Compatibility name for older consumers; this is now a slot limit. */
export const itemCapacity = inventoryCapacity

export function inventorySlotsUsed(state: PlayerView): number {
  const items = new Set(Object.entries(state.inventory).filter(([, count]) => count > 0).map(([id]) => id))
  let gear = state.equipment.filter((entry) => !Object.values(state.loadout).includes(entry.id)).length
  for (const reservation of Object.values(state.storageReservations ?? {})) {
    if (reservation.kind === 'item') items.add(reservation.itemId)
    else if (reservation.kind === 'gear') gear += 1
  }
  return items.size + gear
}

export function budSlotsUsed(state: PlayerView): number {
  return state.buds.length + Object.values(state.storageReservations ?? {}).filter((entry) => entry.kind === 'bud').length
}

function reservedItems(state: PlayerView): Set<string> {
  return new Set(Object.values(state.storageReservations ?? {}).flatMap((entry) => entry.kind === 'item' ? [entry.itemId] : []))
}

export function canReceiveItems(state: PlayerView, items: Readonly<Record<string, number>>): boolean {
  const reserved = reservedItems(state)
  let newSlots = 0
  for (const [item, amount] of Object.entries(items)) {
    if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(itemCount(state, item) + amount)) return false
    if (amount > 0 && itemCount(state, item) === 0 && !reserved.has(item)) newSlots += 1
  }
  return newSlots === 0 || inventorySlotsUsed(state) + newSlots <= inventoryCapacity(state)
}

export function canReceiveGear(state: PlayerView, count = 1): boolean {
  return inventorySlotsUsed(state) + count <= inventoryCapacity(state)
}

export function workerCapacity(state: PlayerView): number {
  return Number(state.stats.catches > 0) + state.upgrades.worker
}

export function earnXp(state: GameState, skill: Skill, amount: number): void {
  state.xp[skill] = Math.min(MAX_XP, state.xp[skill] + amount)
}

export function earnCoins(state: GameState, amount: number): void {
  const earned = Math.max(0, Math.min(MAX_COINS - state.coins, amount))
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

/** Strict insertion for purchases/transfers. Earned output uses awardItems instead. */
export function addItems(state: GameState, item: string, amount: number): number {
  requireRule(canReceiveItems(state, { [item]: amount }), 'Your inventory is full. Free a slot for this item.')
  if (amount > 0) state.inventory[item] = itemCount(state, item) + amount
  return amount
}

/** One completed roll may wait per activity lane; no rerolling or hidden clipping. */
export function awardItems(state: GameState, lane: string, item: string, amount: number): void {
  if (canReceiveItems(state, { [item]: amount })) {
    addItems(state, item, amount)
    return
  }
  const pending = state.pendingRewards[lane] ??= { items: {}, gear: [] }
  requireRule(!pending.items[item], 'Collect this lane’s pending output before completing another cycle.')
  pending.items[item] = amount
}

export function awardGear(state: GameState, lane: string, gear: Gear): void {
  if (canReceiveGear(state)) state.equipment.push(gear)
  else {
    const pending = state.pendingRewards[lane] ??= { items: {}, gear: [] }
    requireRule(pending.gear.length === 0, 'Collect this lane’s pending equipment before completing another cycle.')
    pending.gear.push(gear)
  }
}

export function claimPendingRewards(state: GameState): void {
  if (state.pendingRefundCoins) {
    const refund = Math.min(state.pendingRefundCoins, Math.max(0, MAX_COINS - state.coins))
    state.coins += refund
    state.pendingRefundCoins -= refund
    if (state.pendingRefundCoins === 0) delete state.pendingRefundCoins
  }
  for (const lane of Object.keys(state.pendingRewards).sort()) {
    const pending = state.pendingRewards[lane]
    for (const [item, amount] of Object.entries(pending.items)) {
      if (canReceiveItems(state, { [item]: amount })) {
        addItems(state, item, amount)
        delete pending.items[item]
      }
    }
    if (pending.gear.length > 0 && canReceiveGear(state, pending.gear.length)) {
      state.equipment.push(...pending.gear)
      pending.gear = []
    }
    if (Object.keys(pending.items).length === 0 && pending.gear.length === 0) delete state.pendingRewards[lane]
  }
}

export function unlockEligibleZones(state: GameState): void {
  for (const zoneId of Object.keys(ZONES) as ZoneId[]) {
    if (state.unlockedZones.includes(zoneId)) continue
    const access = ZONES[zoneId].access
    if (access && state.unlockedZones.includes(access.previous)
      && (PRODUCTION_SKILLS.some((skill) => levelForXp(state.xp[skill]) >= access.productionLevel)
        || state.stats.zoneWins[access.previous] >= access.wins)) state.unlockedZones.push(zoneId)
  }
}
