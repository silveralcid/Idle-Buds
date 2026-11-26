import { GEAR_DEFINITIONS, NODES, RECIPES, SPECIES, ZONES } from '../data/catalog.ts'
import { activityAssigned } from './breeding.ts'
import { completeEncounter } from './encounters.ts'
import { MAX_GEAR, MAX_QUEUE, requireRule, RuleError, TENDER_ID } from './limits.ts'
import {
  addItems, budLevelForXp, earnCoins, earnXp, hasItems, itemCapacity, itemCount, levelForXp, MAX_XP, takeItems, workerCapacity,
} from './progression.ts'
import { eventRandom, instanceId, pick } from './random.ts'
import type { Activity, ActivityOrder, Bud, GameState, ProductionSkill, ZoneId } from './types.ts'

export function getBud(state: GameState, workerId: string): Bud {
  const bud = state.buds.find((entry) => entry.id === workerId)
  requireRule(bud, 'This Bud is unavailable.')
  return bud
}

function workerBud(state: GameState, workerId: string): Bud | undefined {
  return workerId === TENDER_ID ? undefined : getBud(state, workerId)
}

function orderKey(order: ActivityOrder): string {
  if (order.kind === 'gather') return order.nodeId
  if (order.kind === 'craft') return `station-${RECIPES[order.recipeId].skill}`
  return 'battle'
}

function ensureEligible(state: GameState, workerId: string, order: ActivityOrder): void {
  const bud = workerBud(state, workerId)
  if (bud) {
    requireRule(!state.formation.includes(bud.id), 'Remove this Bud from the battle formation first.')
    requireRule(state.breeding?.primaryId !== bud.id && state.breeding?.secondaryId !== bud.id, 'This Bud is breeding.')
  }

  if (order.kind === 'battle') {
    requireRule(!bud, 'The Tender must lead a battle.')
    requireRule(state.zoneId === order.zoneId, 'Travel to this zone before battling.')
    return
  }

  const work = order.kind === 'gather' ? NODES[order.nodeId] : RECIPES[order.recipeId]
  requireRule(levelForXp(state.xp[work.skill]) >= work.level, `Requires ${work.skill} level ${work.level}.`)
  if (bud) requireRule(SPECIES[bud.speciesId].aptitudes.includes(work.skill), 'This Bud lacks the required work aptitude.')
  if (order.kind === 'gather') {
    const zoneId = NODES[order.nodeId].zoneId
    requireRule(state.unlockedZones.includes(zoneId), 'This zone has not been unlocked.')
    requireRule(state.zoneId === zoneId || (bud && state.upgrades.remote > 0), 'This assignment requires a local worker or a Remote Relay.')
  } else {
    const discovery = RECIPES[order.recipeId].discovery
    requireRule(!discovery || state.discoveries.includes(discovery), 'Discover this recipe before crafting it.')
  }
}

function ensureNodeFree(state: GameState, workerId: string, order: ActivityOrder): void {
  const key = orderKey(order)
  requireRule(!Object.values(state.activities).some(
    (activity) => activity.workerId !== workerId && activity.nextAt !== null && orderKey(activity.order) === key,
  ), 'This node already has a running activity.')
}

function ensureWorkerSlot(state: GameState, workerId: string): void {
  if (workerId === TENDER_ID) return
  const otherWorkers = Object.values(state.activities).filter(
    (activity) => activity.workerId !== TENDER_ID && activity.workerId !== workerId && activityAssigned(activity),
  ).length
  requireRule(otherWorkers < workerCapacity(state), 'All Bud work slots are assigned.')
}

function efficiency(bud: Bud, kind: 'gather' | 'craft'): number {
  const trait = kind === 'gather' ? 'Diligent' : 'Precise'
  return bud.ivs[kind] * 20 + Math.min(180, budLevelForXp(bud.xp) * 9) + Number(bud.trait === trait) * 100 + bud.bond * 40
}

export function activityDuration(state: GameState, workerId: string, order: ActivityOrder): number {
  if (order.kind === 'battle') return ZONES[order.zoneId].durationMs
  const work = order.kind === 'gather' ? NODES[order.nodeId] : RECIPES[order.recipeId]
  const bud = workerBud(state, workerId)
  if (!bud) return work.durationMs
  return Math.ceil(work.durationMs * (1_000 - efficiency(bud, order.kind)) / 1_000)
}

function blockedReason(state: GameState, order: ActivityOrder): string | undefined {
  if (order.kind === 'gather') {
    if (itemCount(state, NODES[order.nodeId].itemId) >= itemCapacity(state)) return 'Storage is full for this resource.'
    return
  }
  if (order.kind === 'craft') {
    const recipe = RECIPES[order.recipeId]
    if (!hasItems(state, recipe.inputs)) return 'Missing required inputs.'
    if ('gearId' in recipe.output) {
      if (state.equipment.length >= MAX_GEAR) return 'Gear storage is full.'
      return
    }
    if (itemCount(state, recipe.output.itemId) + recipe.output.quantity > itemCapacity(state)) return 'Storage is full for this item.'
  }
}

function createActivity(state: GameState, workerId: string, order: ActivityOrder, at: number, queue: ActivityOrder[] = []): Activity {
  const durationMs = activityDuration(state, workerId, order)
  return {
    workerId, order, durationMs, nextAt: at + durationMs, remainingMs: durationMs,
    remainingCount: order.count ?? (order.kind === 'gather' ? null : 1), queue,
  }
}

export function startActivity(state: GameState, workerId: string, order: ActivityOrder, at: number): string {
  ensureEligible(state, workerId, order)
  requireRule(!activityAssigned(state.activities[workerId]), 'Stop or queue behind the current activity.')
  ensureWorkerSlot(state, workerId)
  ensureNodeFree(state, workerId, order)
  const blocked = blockedReason(state, order)
  requireRule(!blocked, blocked ?? 'This activity is unavailable.')
  state.activities[workerId] = createActivity(state, workerId, order, at)
  return 'Activity started.'
}

export function queueActivity(state: GameState, workerId: string, order: ActivityOrder): string {
  ensureEligible(state, workerId, order)
  const active = state.activities[workerId]
  requireRule(active && activityAssigned(active), 'Start an activity before queuing another.')
  requireRule(active.remainingCount !== null, 'Choose a finite order before adding to its queue.')
  requireRule(order.count !== undefined || order.kind !== 'gather', 'Queued gathering orders need a cycle count.')
  requireRule(active.queue.length < MAX_QUEUE, 'This work queue is full.')
  active.queue.push(order)
  return 'Activity queued.'
}

export function pauseActivity(state: GameState, workerId: string, at: number): string {
  workerBud(state, workerId)
  const active = state.activities[workerId]
  requireRule(active && active.nextAt !== null, 'No running activity to pause.')
  active.remainingMs = active.nextAt - at
  active.nextAt = null
  active.stopReason = 'Paused.'
  return 'Activity paused.'
}

export function resumeActivity(state: GameState, workerId: string, at: number): string {
  workerBud(state, workerId)
  const active = state.activities[workerId]
  requireRule(active && active.nextAt === null && activityAssigned(active), 'No paused activity to resume.')
  ensureEligible(state, workerId, active.order)
  ensureNodeFree(state, workerId, active.order)
  const blocked = blockedReason(state, active.order)
  requireRule(!blocked, blocked ?? 'This activity is unavailable.')
  active.nextAt = at + active.remainingMs
  delete active.stopReason
  return 'Activity resumed.'
}

export function stopActivity(state: GameState, workerId: string): string {
  workerBud(state, workerId)
  requireRule(state.activities[workerId] && activityAssigned(state.activities[workerId]), 'No activity to stop.')
  delete state.activities[workerId]
  return 'Activity stopped.'
}

export function travel(state: GameState, zoneId: ZoneId, at: number): void {
  requireRule(state.unlockedZones.includes(zoneId), 'This zone has not been unlocked.')
  if (state.zoneId === zoneId) return
  for (const activity of Object.values(state.activities)) {
    if (activity.nextAt === null || activity.order.kind === 'craft') continue
    if (activity.order.kind === 'gather' && activity.workerId !== TENDER_ID && state.upgrades.remote > 0) continue
    pauseActivity(state, activity.workerId, at)
    activity.stopReason = 'Paused after travel.'
  }
  state.zoneId = zoneId
}

function awardWorkXp(state: GameState, workerId: string, skill: ProductionSkill, xp: number): void {
  const bud = workerBud(state, workerId)
  if (bud) bud.xp = Math.min(MAX_XP, bud.xp + xp)
  else earnXp(state, skill, xp)
}

function gather(state: GameState, activity: Activity, nodeId: string, at: number): void {
  const node = NODES[nodeId]
  const tender = activity.workerId === TENDER_ID
  const quantity = 1 + (tender ? state.upgrades.tool + Number(state.foodUntil > at) : 0)
  state.stats.gathered += addItems(state, node.itemId, quantity)
  awardWorkXp(state, activity.workerId, node.skill, node.xp)
  if (tender) earnCoins(state, 1)
  if (eventRandom(state, 'gather')() < 0.075) addItems(state, 'portal-dust', 1)
}

function craft(state: GameState, activity: Activity, order: Extract<ActivityOrder, { kind: 'craft' }>): void {
  const recipe = RECIPES[order.recipeId]
  takeItems(state, recipe.inputs)
  if ('itemId' in recipe.output) {
    addItems(state, recipe.output.itemId, recipe.output.quantity)
  } else {
    const definition = GEAR_DEFINITIONS[recipe.output.gearId]
    const random = eventRandom(state, 'gear')
    const range = definition.maxBonus - definition.minBonus + 1
    const masteryRoll = Math.min(0.2, (levelForXp(state.xp.Crafting) - 1) * 0.01)
    const bonusRoll = Math.min(range - 1, Math.floor((random() + masteryRoll) * range))
    state.equipment.push({
      id: instanceId(state, 'gear'),
      definitionId: recipe.output.gearId,
      slot: definition.slot,
      bonus: definition.minBonus + bonusRoll,
      technique: pick(random, definition.techniques),
      ...(order.markMaker ? { maker: state.name } : {}),
    })
  }
  state.stats.crafted += 1
  awardWorkXp(state, activity.workerId, recipe.skill, recipe.xp)
}

function halt(activity: Activity, reason: string): void {
  activity.nextAt = null
  activity.stopReason = reason
}

function scheduleNext(state: GameState, activity: Activity, at: number): void {
  const { workerId, order } = activity
  activity.durationMs = activityDuration(state, workerId, order)
  activity.remainingMs = activity.durationMs
  try {
    ensureEligible(state, workerId, order)
    ensureNodeFree(state, workerId, order)
  } catch (error) {
    if (!(error instanceof RuleError)) throw error
    halt(activity, error.message)
    return
  }
  const blocked = blockedReason(state, order)
  if (blocked) halt(activity, blocked)
  else activity.nextAt = at + activity.durationMs
}

export function completeActivity(state: GameState, workerId: string, at: number): boolean {
  const activity = state.activities[workerId]
  const order = activity.order
  const blocked = blockedReason(state, order)
  if (blocked) {
    activity.remainingMs = activity.durationMs
    halt(activity, blocked)
    return false
  }

  if (order.kind === 'gather') gather(state, activity, order.nodeId, at)
  if (order.kind === 'craft') craft(state, activity, order)
  if (order.kind === 'battle') completeEncounter(state, order.zoneId, at)
  if (activity.remainingCount !== null) activity.remainingCount -= 1

  if (activity.remainingCount === 0) {
    const next = activity.queue.shift()
    if (!next) {
      activity.remainingMs = 0
      halt(activity, 'Order complete.')
      return true
    }
    const replacement = createActivity(state, workerId, next, at, activity.queue)
    state.activities[workerId] = replacement
    scheduleNext(state, replacement, at)
    return true
  }

  scheduleNext(state, activity, at)
  return true
}
