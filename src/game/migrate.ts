import { UPGRADES } from '../data/catalog.ts'
import { orderSkill } from './activities.ts'
import { MAX_COINS, SAVE_VERSION, TENDER_ID, requireRule } from './limits.ts'
import { unlockEligibleZones } from './progression.ts'
import type { Activity, GameState } from './types.ts'

/** Version 1 remains recoverable in PostgreSQL until the transaction commits this copy. */
export function migrateState(previous: GameState): GameState {
  requireRule(previous.version === 1 || previous.version === SAVE_VERSION, 'Unsupported game state version.')
  const state = structuredClone(previous)
  if (state.version === SAVE_VERSION) return state
  state.pendingRewards = {}
  state.storageReservations ??= {}
  const usedSkills = new Set<string>()
  for (const workerId of Object.keys(state.activities).sort()) {
    const activity = state.activities[workerId]
    const skill = orderSkill(activity.order)
    if (workerId !== TENDER_ID && skill && activity.remainingCount !== 0) {
      if (usedSkills.has(skill)) {
        // Previously several nodes in one skill could each have a Bud. Keep one assignment.
        delete state.activities[workerId]
        continue
      }
      usedSkills.add(skill)
    }
    if (workerId !== TENDER_ID) {
      // V1 queued Bud work could change skills. Keep its current skill reservation
      // for the whole queue so a later order cannot add a second Bud to another skill.
      activity.queue = activity.queue.filter((order) => orderSkill(order) === skill)
    }
    activity.status = legacyStatus(activity)
  }
  for (const [id, count] of Object.entries(state.inventory)) {
    requireRule(Number.isSafeInteger(count) && count >= 0, 'Invalid saved item quantity.')
    if (count === 0) delete state.inventory[id]
  }
  // The removed relay no longer provides a benefit. Refund its exact paid costs once.
  for (let rank = 1; rank <= state.upgrades.remote; rank += 1) {
    const cost = UPGRADES.remote.coins * rank
    const refund = Math.min(cost, Math.max(0, MAX_COINS - state.coins))
    state.coins += refund
    if (refund < cost) state.pendingRefundCoins = (state.pendingRefundCoins ?? 0) + cost - refund
    for (const [item, amount] of Object.entries(UPGRADES.remote.items)) {
      state.inventory[item] = (state.inventory[item] ?? 0) + amount * rank
    }
  }
  state.upgrades.remote = 0
  state.version = SAVE_VERSION
  unlockEligibleZones(state)
  return state
}

function legacyStatus(activity: Activity): Activity['status'] {
  if (activity.nextAt !== null) return 'running'
  if (activity.remainingCount === 0 && activity.queue.length === 0) return 'complete'
  return activity.stopReason === 'Paused.' ? 'paused' : 'blocked'
}
