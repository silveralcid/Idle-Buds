import { SKILLS } from '../data/catalog.ts'
import { completeActivity, refreshActivities } from './activities.ts'
import { completeBreeding } from './breeding.ts'
import { executeCommand } from './commands.ts'
import { OFFLINE_CAP_MS, requireRule, SAVE_VERSION } from './limits.ts'
import { migrateState } from './migrate.ts'
import { assertGameCommand } from './validate.ts'
import type { AdvanceSummary, GameCommand, GameState, PlayerView, Skill } from './types.ts'

function validateTime(now: number): void {
  requireRule(Number.isSafeInteger(now) && now >= 0 && now <= Number.MAX_SAFE_INTEGER - 2 * OFFLINE_CAP_MS, 'Invalid server time.')
}

export function createPlayer(name: string, now: number, seed: string): GameState {
  validateTime(now)
  requireRule(typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 32, 'Enter a Tender name of 1 to 32 letters.')
  requireRule(!/[\p{Cc}\p{Cf}]/u.test(name), 'Invalid Tender name.')
  requireRule(typeof seed === 'string' && seed.length > 0 && seed.length <= 512, 'Invalid server seed.')
  return {
    version: SAVE_VERSION,
    name: name.trim(),
    lastAt: now,
    zoneId: 'earth',
    unlockedZones: ['earth'],
    discoveries: [],
    inventory: {},
    pendingRewards: {},
    storageReservations: {},
    coins: 0,
    xp: Object.fromEntries(SKILLS.map((skill) => [skill, 0])) as Record<Skill, number>,
    buds: [],
    equipment: [],
    eggs: [],
    formation: [],
    loadout: {},
    activities: {},
    upgrades: { tool: 0, worker: 0, storage: 0, remote: 0 },
    captureFilters: [{ condition: 'any', itemId: 'capture-kit' }],
    breeding: null,
    lastEncounter: null,
    stats: { catches: 0, battles: 0, wins: 0, zoneWins: { earth: 0, glassreach: 0, hollowtide: 0 }, gathered: 0, crafted: 0, hatched: 0, coinsEarned: 0, coinsSpent: 0 },
    foodUntil: 0,
    seed,
    rngCounter: 0,
    nextId: 0,
    eggGenetics: {},
  }
}

export function publicState(state: GameState): PlayerView {
  const { seed: _seed, rngCounter: _rngCounter, nextId: _nextId, eggGenetics: _eggGenetics, ...view } = structuredClone(state)
  return view
}

function nextEvent(state: GameState, cutoff: number): { at: number; workerId?: string } | undefined {
  let next: { at: number; workerId?: string } | undefined
  if (state.breeding && state.breeding.readyAt <= cutoff) next = { at: state.breeding.readyAt }
  for (const workerId of Object.keys(state.activities).sort()) {
    const at = state.activities[workerId].nextAt
    if (at !== null && at <= cutoff && (!next || at < next.at)) next = { at, workerId }
  }
  return next
}

function shiftDeadlines(state: GameState, cutoff: number, skipped: number): void {
  if (!skipped) return
  for (const active of Object.values(state.activities)) {
    if (active.nextAt !== null) active.nextAt += skipped
  }
  if (state.breeding) state.breeding.readyAt += skipped
  for (const egg of state.eggs) {
    if (egg.readyAt > cutoff) egg.readyAt += skipped
  }
  if (state.foodUntil > cutoff) state.foodUntil += skipped
}

export function advance(previous: GameState, now: number, budgetMs = OFFLINE_CAP_MS): { state: GameState; summary: AdvanceSummary } {
  validateTime(now)
  requireRule(Number.isSafeInteger(budgetMs) && budgetMs >= 0 && budgetMs <= OFFLINE_CAP_MS, 'Invalid simulation budget.')
  requireRule(now >= previous.lastAt, 'Server time cannot move backward.')
  const cutoff = Math.min(previous.lastAt + budgetMs, now)
  const state = migrateState(previous)
  refreshActivities(state, previous.lastAt)
  const stopped: AdvanceSummary['stopped'] = []
  let cycles = 0
  let event = nextEvent(state, cutoff)
  while (event) {
    if (event.workerId === undefined) {
      completeBreeding(state, event.at)
      cycles += 1
    } else {
      cycles += Number(completeActivity(state, event.workerId, event.at))
      const active = state.activities[event.workerId]
      if (active.nextAt === null && active.stopReason) stopped.push({ workerId: event.workerId, reason: active.stopReason })
    }
    refreshActivities(state, event.at)
    event = nextEvent(state, cutoff)
  }

  shiftDeadlines(state, cutoff, now - cutoff)
  state.lastAt = now
  for (const activity of Object.values(state.activities)) {
    if (activity.nextAt !== null) activity.remainingMs = activity.nextAt - now
  }

  const items: AdvanceSummary['items'] = {}
  for (const item of new Set([...Object.keys(previous.inventory), ...Object.keys(state.inventory)])) {
    const delta = (state.inventory[item] ?? 0) - (previous.inventory[item] ?? 0)
    if (delta) items[item] = delta
  }
  const xp: AdvanceSummary['xp'] = {}
  for (const skill of SKILLS) {
    const delta = state.xp[skill] - previous.xp[skill]
    if (delta) xp[skill] = delta
  }
  const budXp: AdvanceSummary['budXp'] = {}
  const previousBudXp = new Map(previous.buds.map((bud) => [bud.id, bud.xp]))
  for (const bud of state.buds) {
    const delta = bud.xp - (previousBudXp.get(bud.id) ?? 0)
    if (delta) budXp[bud.id] = delta
  }
  return {
    state,
    summary: {
      from: previous.lastAt,
      to: now,
      simulatedMs: cutoff - previous.lastAt,
      discardedMs: now - cutoff,
      cycles,
      items,
      xp,
      budXp,
      coins: state.coins - previous.coins,
      catches: state.stats.catches - previous.stats.catches,
      eggs: state.eggs.length - previous.eggs.length,
      stopped,
    },
  }
}

export function applyCommand(previous: GameState, command: GameCommand, now: number): { state: GameState; message: string } {
  assertGameCommand(command)
  const { state } = advance(previous, now)
  const message = executeCommand(state, structuredClone(command), now)
  refreshActivities(state, now)
  return { state, message }
}
