import { GEAR_DEFINITIONS, NODES, RECIPES, SPECIES, ZONES } from '../data/catalog.ts'
import { activityAssigned } from './breeding.ts'
import { completeEncounter } from './encounters.ts'
import { MAX_QUEUE, requireRule, RuleError, TENDER_ID } from './limits.ts'
import {
  awardGear, awardItems, budLevelForXp, canReceiveGear, canReceiveItems, claimPendingRewards, earnCoins, earnXp,
  hasItems, levelForXp, MAX_XP, takeItems, unlockEligibleZones, workerCapacity,
} from './progression.ts'
import { eventRandom, instanceId, pick } from './random.ts'
import type { Activity, ActivityOrder, Bud, GameState, PlayerView, ProductionSkill, ZoneId } from './types.ts'

export function getBud(state: PlayerView, workerId: string): Bud {
  const bud = state.buds.find((entry) => entry.id === workerId)
  requireRule(bud, 'This Bud is unavailable.')
  return bud
}

function workerBud(state: PlayerView, workerId: string): Bud | undefined {
  return workerId === TENDER_ID ? undefined : getBud(state, workerId)
}

export function orderSkill(order: ActivityOrder): ProductionSkill | null {
  if (order.kind === 'battle') return null
  return order.kind === 'gather' ? NODES[order.nodeId].skill : RECIPES[order.recipeId].skill
}

export function activityLane(workerId: string, order: ActivityOrder): string {
  return workerId === TENDER_ID ? TENDER_ID : orderSkill(order)!
}

function ensureEligible(state: GameState, workerId: string, order: ActivityOrder): void {
  const bud = workerBud(state, workerId)
  if (bud) {
    requireRule(!state.formation.includes(bud.id), 'Remove this Bud from the battle formation first.')
    requireRule(state.breeding?.primaryId !== bud.id && state.breeding?.secondaryId !== bud.id, 'This Bud is breeding.')
  }
  if (order.kind === 'battle') {
    requireRule(!bud, 'The Tender must lead a battle.')
    requireRule(state.unlockedZones.includes(order.zoneId), 'Meet this area’s combat or production requirement first.')
    return
  }
  const work = order.kind === 'gather' ? NODES[order.nodeId] : RECIPES[order.recipeId]
  requireRule(levelForXp(state.xp[work.skill]) >= work.level, `Requires ${work.skill} level ${work.level}.`)
  if (bud) requireRule(SPECIES[bud.speciesId].aptitudes.includes(work.skill), 'This Bud lacks the required work aptitude.')
  if (order.kind === 'gather') {
    requireRule(state.unlockedZones.includes(NODES[order.nodeId].zoneId), 'Meet this area’s combat or production requirement first.')
  } else {
    const discovery = RECIPES[order.recipeId].discovery
    requireRule(!discovery || state.discoveries.includes(discovery), 'Discover this recipe before crafting it.')
  }
}

function replacingWorkers(state: GameState, workerId: string, order: ActivityOrder): string[] {
  if (workerId === TENDER_ID) return []
  const skill = orderSkill(order)
  return Object.values(state.activities).filter((activity) => activity.workerId !== TENDER_ID
    && activity.workerId !== workerId && activityAssigned(activity) && orderSkill(activity.order) === skill)
    .map((activity) => activity.workerId)
}

function ensureWorkerSlot(state: GameState, workerId: string, replacing: string[]): void {
  if (workerId === TENDER_ID) return
  const otherWorkers = Object.values(state.activities).filter((activity) => activity.workerId !== TENDER_ID
    && activity.workerId !== workerId && !replacing.includes(activity.workerId) && activityAssigned(activity)).length
  requireRule(otherWorkers < workerCapacity(state), 'All Bud work slots are assigned.')
}

function efficiency(bud: Bud, kind: 'gather' | 'craft'): number {
  const trait = kind === 'gather' ? 'Diligent' : 'Precise'
  return bud.ivs[kind] * 20 + Math.min(180, budLevelForXp(bud.xp) * 9) + Number(bud.trait === trait) * 100 + bud.bond * 40
}

export function activityDuration(state: PlayerView, workerId: string, order: ActivityOrder): number {
  if (order.kind === 'battle') return ZONES[order.zoneId].durationMs
  const work = order.kind === 'gather' ? NODES[order.nodeId] : RECIPES[order.recipeId]
  const bud = workerBud(state, workerId)
  if (!bud) return work.durationMs
  return Math.ceil(work.durationMs * (1_000 - efficiency(bud, order.kind)) / 1_000)
}

function blockedReason(state: GameState, workerId: string, order: ActivityOrder): string | undefined {
  if (state.pendingRewards[activityLane(workerId, order)]) return 'Inventory full. Completed output is waiting.'
  if (order.kind === 'gather') {
    if (!canReceiveItems(state, { [NODES[order.nodeId].itemId]: 1 })) return 'Inventory full. Free a slot to continue.'
  }
  if (order.kind === 'craft') {
    const recipe = RECIPES[order.recipeId]
    if (!hasItems(state, recipe.inputs)) return 'Missing required inputs.'
    // Inputs spent at completion may release the slot used by its output.
    const afterInputs = { ...state, inventory: { ...state.inventory } }
    takeItems(afterInputs, recipe.inputs)
    const room = 'gearId' in recipe.output ? canReceiveGear(afterInputs)
      : canReceiveItems(afterInputs, { [recipe.output.itemId]: recipe.output.quantity })
    if (!room) return 'Inventory full. Free a slot to continue.'
  }
}

function createActivity(state: GameState, workerId: string, order: ActivityOrder, at: number, queue: ActivityOrder[] = []): Activity {
  const durationMs = activityDuration(state, workerId, order)
  return {
    workerId, status: 'running', order, durationMs, nextAt: at + durationMs, remainingMs: durationMs,
    remainingCount: order.count === null ? null : order.count ?? (order.kind === 'craft' ? 1 : null), queue,
  }
}

export function startActivity(state: GameState, workerId: string, order: ActivityOrder, at: number): string {
  ensureEligible(state, workerId, order)
  const replacing = replacingWorkers(state, workerId, order)
  ensureWorkerSlot(state, workerId, replacing)
  // Validate before discarding any incomplete cycle or replacing a skill helper.
  const next = createActivity(state, workerId, order, at)
  for (const previous of replacing) delete state.activities[previous]
  state.activities[workerId] = next
  if (workerId === TENDER_ID && order.kind !== 'craft') {
    state.zoneId = order.kind === 'battle' ? order.zoneId : NODES[order.nodeId].zoneId
  }
  scheduleNext(state, next, at)
  return next.status === 'blocked' ? 'Activity assigned and waiting.' : 'Activity started.'
}

export function queueActivity(state: GameState, workerId: string, order: ActivityOrder): string {
  ensureEligible(state, workerId, order)
  const active = state.activities[workerId]
  requireRule(active && activityAssigned(active), 'Start an activity before queuing another.')
  requireRule(active.remainingCount !== null, 'Choose a finite order before adding to its queue.')
  requireRule(order.count !== null && (order.count !== undefined || order.kind === 'craft'), 'Queued orders need a finite cycle count.')
  requireRule(workerId === TENDER_ID || orderSkill(active.order) === orderSkill(order), 'A Bud’s queue stays within its assigned skill.')
  requireRule(active.queue.length < MAX_QUEUE, 'This work queue is full.')
  active.queue.push(order)
  return 'Activity queued.'
}

export function pauseActivity(state: GameState, workerId: string, at: number): string {
  workerBud(state, workerId)
  const active = state.activities[workerId]
  requireRule(active && activityAssigned(active) && active.status !== 'paused', 'No active assignment to pause.')
  if (active.nextAt !== null) active.remainingMs = active.nextAt - at
  active.nextAt = null
  active.status = 'paused'
  active.stopReason = 'Paused.'
  return 'Activity paused.'
}

export function resumeActivity(state: GameState, workerId: string, at: number): string {
  workerBud(state, workerId)
  const active = state.activities[workerId]
  requireRule(active && active.nextAt === null && activityAssigned(active), 'No paused activity to resume.')
  ensureEligible(state, workerId, active.order)
  const blocked = blockedReason(state, workerId, active.order)
  if (blocked) halt(active, blocked)
  else {
    active.nextAt = at + active.remainingMs
    active.status = 'running'
    delete active.stopReason
  }
  return blocked ? 'Activity will resume when ready.' : 'Activity resumed.'
}

export function stopActivity(state: GameState, workerId: string): string {
  workerBud(state, workerId)
  requireRule(state.activities[workerId], 'No activity to stop.')
  delete state.activities[workerId]
  return 'Activity stopped.'
}

/** Legacy command compatibility: geography is descriptive and does not pause work. */
export function travel(state: GameState, zoneId: ZoneId): void {
  requireRule(state.unlockedZones.includes(zoneId), 'Meet this area’s combat or production requirement first.')
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
  const lane = activityLane(activity.workerId, activity.order)
  awardItems(state, lane, node.itemId, quantity)
  state.stats.gathered += quantity
  awardWorkXp(state, activity.workerId, node.skill, node.xp)
  if (tender) earnCoins(state, 1)
  if (eventRandom(state, 'gather')() < 0.075) awardItems(state, lane, 'portal-dust', 1)
}

function craft(state: GameState, activity: Activity, order: Extract<ActivityOrder, { kind: 'craft' }>): void {
  const recipe = RECIPES[order.recipeId]
  const lane = activityLane(activity.workerId, order)
  takeItems(state, recipe.inputs)
  if ('itemId' in recipe.output) awardItems(state, lane, recipe.output.itemId, recipe.output.quantity)
  else {
    const definition = GEAR_DEFINITIONS[recipe.output.gearId]
    const random = eventRandom(state, 'gear')
    const range = definition.maxBonus - definition.minBonus + 1
    const masteryRoll = Math.min(0.2, (levelForXp(state.xp.Crafting) - 1) * 0.01)
    const bonusRoll = Math.min(range - 1, Math.floor((random() + masteryRoll) * range))
    awardGear(state, lane, {
      id: instanceId(state, 'gear'), definitionId: recipe.output.gearId, slot: definition.slot,
      bonus: definition.minBonus + bonusRoll, technique: pick(random, definition.techniques),
      ...(order.markMaker ? { maker: state.name } : {}),
    })
  }
  state.stats.crafted += 1
  awardWorkXp(state, activity.workerId, recipe.skill, recipe.xp)
}

function halt(activity: Activity, reason: string): void {
  activity.nextAt = null
  activity.status = 'blocked'
  activity.stopReason = reason
}

function scheduleNext(state: GameState, activity: Activity, at: number): void {
  const { workerId, order } = activity
  activity.durationMs = activityDuration(state, workerId, order)
  activity.remainingMs = activity.durationMs
  try {
    ensureEligible(state, workerId, order)
  } catch (error) {
    if (!(error instanceof RuleError)) throw error
    halt(activity, error.message)
    return
  }
  const blocked = blockedReason(state, workerId, order)
  if (blocked) halt(activity, blocked)
  else {
    activity.nextAt = at + activity.durationMs
    activity.status = 'running'
    delete activity.stopReason
  }
}

function finishOrContinue(state: GameState, activity: Activity, at: number): void {
  if (state.pendingRewards[activityLane(activity.workerId, activity.order)]) {
    activity.remainingMs = activity.durationMs
    halt(activity, 'Inventory full. Completed output is waiting.')
    return
  }
  if (activity.remainingCount === 0) {
    const next = activity.queue.shift()
    if (!next) {
      activity.remainingMs = 0
      activity.nextAt = null
      activity.status = 'complete'
      activity.stopReason = 'Order complete.'
      return
    }
    const replacement = createActivity(state, activity.workerId, next, at, activity.queue)
    state.activities[activity.workerId] = replacement
    scheduleNext(state, replacement, at)
  } else scheduleNext(state, activity, at)
}

/** Called at each event and command, never from a browser polling timer. */
export function refreshActivities(state: GameState, at: number): void {
  unlockEligibleZones(state)
  claimPendingRewards(state)
  for (const workerId of Object.keys(state.activities).sort()) {
    const activity = state.activities[workerId]
    if (activity.status === 'blocked') finishOrContinue(state, activity, at)
  }
}

export function completeActivity(state: GameState, workerId: string, at: number): boolean {
  const activity = state.activities[workerId]
  const order = activity.order
  // A cycle already underway earns its one immutable roll even if inventory filled meanwhile.
  if (state.pendingRewards[activityLane(workerId, order)]) {
    halt(activity, 'Inventory full. Completed output is waiting.')
    return false
  }
  if (order.kind === 'craft' && !hasItems(state, RECIPES[order.recipeId].inputs)) {
    activity.remainingMs = activity.durationMs
    halt(activity, 'Missing required inputs.')
    return false
  }
  if (order.kind === 'gather') gather(state, activity, order.nodeId, at)
  if (order.kind === 'craft') craft(state, activity, order)
  if (order.kind === 'battle') completeEncounter(state, order.zoneId, at)
  if (activity.remainingCount !== null) activity.remainingCount -= 1
  unlockEligibleZones(state)
  finishOrContinue(state, activity, at)
  return true
}
