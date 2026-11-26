import { NODES, SPECIES } from '../../src/data/catalog.ts'
import { activityAssigned, addBud, rollGenetics } from '../../src/game/breeding.ts'
import { orderSkill } from '../../src/game/activities.ts'
import { advance, applyCommand, createPlayer, inventoryCapacity, inventorySlotsUsed, MAX_COINS, OFFLINE_CAP_MS, workerCapacity } from '../../src/game/index.ts'
import { sourceFor } from '../../src/game/random.ts'
import type { ActivityOrder, GameCommand, GameState, Gear, PlayerView } from '../../src/game/types.ts'
import { POLICIES, POLICY_IDS, policyActions } from './policies.ts'
import type { PolicyId } from './policies.ts'
import type { ScenarioContext, ScenarioDefinition } from './types.ts'

const HOUR = 3_600_000
const DAY = OFFLINE_CAP_MS
const limits = { maxActions: 200, maxEvents: 150_000, maxSimulatedMs: 2 * DAY, maxWallMs: 60_000 }

function workerFixture(seed: string, workers = 2): GameState {
  const state = createPlayer('Lab Tender', 0, seed)
  for (const [index, speciesId] of ['pebbleback', 'pebbleback', 'spriglet'].slice(0, workers).entries()) {
    addBud(state, speciesId, rollGenetics(SPECIES[speciesId], sourceFor(seed, 'lab-workers', index)))
  }
  state.stats.catches = workers
  state.upgrades.worker = Math.max(0, workers - 1)
  return state
}

function gear(id: string): Gear {
  return { id, definitionId: 'scrap-blade', slot: 'weapon', bonus: 2, technique: 'Guard' }
}

function act(context: ScenarioContext, command: GameCommand, id: string): void {
  const result = context.act(command)
  context.check(id, result.accepted, result.message)
}

function finish(context: ScenarioContext, order: ActivityOrder): void {
  act(context, { type: 'startActivity', order }, 'finite-order-started')
  // This helper only executes finite orders. Continuous orders belong to explicit-horizon scenarios.
  for (let events = 0; events < 100; events += 1) {
    const activity = context.observe().activities.tender
    if (!activity || activity.nextAt === null) return
    context.advanceTo(activity.nextAt)
  }
  context.check('finite-order-completed-within-bound', false, 'A finite setup order exceeded 100 events.')
}

function finalMetrics(context: ScenarioContext, before: PlayerView): void {
  const state = context.observe()
  context.metric('gathered', state.stats.gathered - before.stats.gathered)
  context.metric('crafted', state.stats.crafted - before.stats.crafted)
  context.metric('battles', state.stats.battles - before.stats.battles)
  context.metric('wins', state.stats.wins - before.stats.wins)
  context.metric('catches', state.stats.catches - before.stats.catches)
  context.metric('captureKits', state.inventory['capture-kit'] ?? 0)
  context.metric('coinsEarned', state.stats.coinsEarned - before.stats.coinsEarned)
  context.metric('inventorySlots', inventorySlotsUsed(state))
  context.metric('inventoryCapacity', inventoryCapacity(state))
  context.metric('pendingOutputs', Object.values(state.pendingRewards).reduce((sum, pending) =>
    sum + pending.gear.length + Object.values(pending.items).reduce((a, b) => a + b, 0), 0))
  context.metric('budXp', state.buds.reduce((sum, bud) => sum + bud.xp, 0) - before.buds.reduce((sum, bud) => sum + bud.xp, 0))
  context.metric('tenderXp', Object.values(state.xp).reduce((a, b) => a + b, 0) - Object.values(before.xp).reduce((a, b) => a + b, 0))
  context.metric('blockedWorkersAtEnd', Object.values(state.activities).filter((activity) => activity.status === 'blocked').length)
  context.note('Blocked-worker counts are endpoint observations, not measured blocked-time durations. Resource totals do not establish market value or human enjoyment.')
}

const production: ScenarioDefinition = {
  id: 'production-recovery', version: 1, fixtureVersion: 1, policyVersion: 1,
  description: 'Two eligible Buds maintain mining and crafting while the Tender is free.',
  question: 'Does ingredient-blocked Bud crafting resume without manual restarts, and does manual pause remain deliberate?',
  variants: ['daily', 'frequent', 'paused'], limits,
  create: seed => workerFixture(seed),
  run(context) {
    const before = context.observe()
    const [miner, crafter] = before.buds
    act(context, { type: 'startActivity', workerId: miner.id, order: { kind: 'gather', nodeId: 'earth-scrap' } }, 'miner-started')
    act(context, { type: 'startActivity', workerId: crafter.id, order: { kind: 'craft', recipeId: 'capture-kit', count: null } }, 'crafter-assigned')
    context.check('crafter-initially-waits-for-input', context.observe().activities[crafter.id].status === 'blocked')
    if (context.variant === 'paused') act(context, { type: 'pauseActivity', workerId: crafter.id }, 'manual-pause-accepted')
    const visits = context.variant === 'frequent' ? 4 : 1
    for (let visit = 1; visit <= visits; visit += 1) context.advanceTo(visit * DAY / visits)
    const after = context.observe()
    context.check('tender-presence-not-required', after.activities.tender === undefined)
    context.check('bud-work-does-not-train-tender', JSON.stringify(after.xp) === JSON.stringify(before.xp))
    context.check('independent-mining-continues', after.buds[0].xp > 0)
    if (context.variant === 'paused') {
      context.check('manual-pause-retained', after.activities[crafter.id].status === 'paused')
      context.check('paused-work-produces-nothing', after.stats.crafted === 0)
    } else {
      context.check('blocked-work-recovers-without-restart', after.stats.crafted > 0)
      context.check('crafted-output-accounted-for', after.inventory['capture-kit'] === after.stats.crafted)
    }
    context.metric('checkIns', visits + 1)
    context.metric('setupActions', context.variant === 'paused' ? 3 : 2)
    context.metric('manualRestarts', 0)
    context.metric('goalReached', context.variant === 'paused' ? after.stats.crafted === 0 : after.stats.crafted > 0)
    finalMetrics(context, before)
    context.note('Synthetic fixture has two captured Buds and one earned worker upgrade. Daily versus frequent changes check-in cadence only; neither policy replans the chain.')
  },
}

const inventory: ScenarioDefinition = {
  id: 'inventory-recovery', version: 1, fixtureVersion: 1, policyVersion: 1,
  description: 'A completed unique craft waits in a full bag, survives replacement, then claims once.',
  question: 'Is a completed gear roll retained exactly once until a legal action frees storage?',
  variants: ['default'], limits: { ...limits, maxEvents: 100, maxSimulatedMs: HOUR },
  create(seed) {
    let state = createPlayer('Lab Tender', 0, seed)
    state.inventory = { scrap: 100, fiber: 100 }
    while (inventorySlotsUsed(state) < inventoryCapacity(state) - 1) state.equipment.push(gear(`lab-gear-${state.equipment.length}`))
    state = applyCommand(state, { type: 'startActivity', order: { kind: 'craft', recipeId: 'scrap-blade', markMaker: true } }, 0).state
    // Simulate another asset arriving after the cycle started, as exercised by existing ownership tests.
    state.equipment.push(gear('lab-arrival'))
    state = advance(state, 7_000).state
    return JSON.parse(JSON.stringify(state)) as GameState
  },
  run(context) {
    const before = context.inspect()
    const rolled = before.pendingRewards.tender?.gear[0]
    context.check('fixture-has-completed-pending-roll', Boolean(rolled) && before.stats.crafted === 1)
    if (!rolled) return
    act(context, { type: 'stopActivity' }, 'stop-accepted')
    act(context, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } }, 'replacement-accepted')
    context.advanceTo(70_000)
    const waiting = context.inspect()
    context.check('completed-roll-not-rerolled', JSON.stringify(waiting.pendingRewards.tender?.gear[0]) === JSON.stringify(rolled))
    context.check('waiting-consumes-no-randomness', waiting.rngCounter === before.rngCounter)
    act(context, { type: 'equip', slot: 'weapon', gearId: before.equipment[0].id }, 'equip-frees-slot')
    const after = context.inspect()
    context.check('completed-output-claimed-once', after.equipment.filter(item => item.id === rolled.id).length === 1)
    context.check('claimed-roll-unchanged', JSON.stringify(after.equipment.find(item => item.id === rolled.id)) === JSON.stringify(rolled))
    context.check('pending-output-cleared', Object.keys(after.pendingRewards).length === 0)
    context.check('claim-does-not-craft-again', after.stats.crafted === 1 && after.rngCounter === before.rngCounter)
    context.check('replacement-resumes', after.activities.tender.status === 'running')
    context.advanceTo(after.lastAt)
    context.check('repeat-reconcile-does-not-duplicate', context.observe().equipment.filter(item => item.id === rolled.id).length === 1)
    context.metric('preservedGearId', rolled.id)
    context.metric('goalReached', after.equipment.some(item => item.id === rolled.id))
    finalMetrics(context, before)
    context.note('The initial fixture is a JSON round trip of a real completed craft. Live server restart, escrow return, and receipt retries remain database integration qualifications.')
  },
}

const replacement: ScenarioDefinition = {
  id: 'activity-replacement', version: 1, fixtureVersion: 1, policyVersion: 1,
  description: 'Valid replacement preserves earned output; invalid replacement preserves current work.',
  question: 'Can the Tender change activity directly while independent Bud work remains intact?',
  variants: ['default'], limits: { ...limits, maxEvents: 100, maxSimulatedMs: HOUR },
  create(seed) {
    const state = createPlayer('Lab Tender', 0, seed)
    addBud(state, 'spriglet', rollGenetics(SPECIES.spriglet, sourceFor(seed, 'lab-worker')))
    state.stats.catches = 1
    return state
  },
  run(context) {
    const before = context.observe()
    const workerId = before.buds[0].id
    act(context, { type: 'startActivity', workerId, order: { kind: 'gather', nodeId: 'earth-greens' } }, 'bud-started')
    act(context, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } }, 'tender-started')
    context.advanceTo(5_000)
    const old = context.observe()
    const rejection = context.act({ type: 'startActivity', order: { kind: 'gather', nodeId: 'glass-quartz' } })
    context.check('ineligible-replacement-rejected', !rejection.accepted)
    context.check('rejection-preserves-current-order', JSON.stringify(context.observe().activities.tender) === JSON.stringify(old.activities.tender))
    act(context, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-fiber' } }, 'valid-replacement-accepted')
    const replaced = context.observe()
    context.check('earned-scrap-preserved', replaced.inventory.scrap === 1)
    context.check('bud-assignment-preserved', JSON.stringify(replaced.activities[workerId]) === JSON.stringify(old.activities[workerId]))
    context.advanceTo(10_000)
    const after = context.observe()
    context.check('new-gather-produced', after.inventory.fiber === 1)
    context.check('old-gather-stopped', after.inventory.scrap === 1)
    context.check('independent-bud-progressed', after.buds[0].xp > old.buds[0].xp)
    context.metric('goalReached', after.inventory.fiber === 1 && after.inventory.scrap === 1)
    finalMetrics(context, before)
  },
}

const offline: ScenarioDefinition = {
  id: 'offline-return', version: 1, fixtureVersion: 1, policyVersion: 1,
  description: 'Passive research inspection does not renew an absent player’s offline budget.',
  question: 'Does one 48-hour absence retain the 24-hour cap while actual daily returns renew it?',
  variants: ['absent', 'daily'], limits,
  create: seed => createPlayer('Lab Tender', 0, seed),
  run(context) {
    const before = context.observe()
    act(context, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } }, 'gather-started')
    if (context.variant === 'daily') {
      context.advanceTo(DAY)
      context.advanceTo(2 * DAY)
    } else {
      context.advanceTo(12 * HOUR, 'background')
      const snapshot = JSON.stringify(context.inspect())
      for (let read = 0; read < 20; read += 1) context.observe()
      context.check('passive-inspection-has-no-effects', JSON.stringify(context.inspect()) === snapshot)
      context.advanceTo(DAY, 'background')
      context.advanceTo(2 * DAY)
    }
    const after = context.observe()
    const expected = context.variant === 'daily' ? 43_200 : 21_600
    context.check('offline-cap-matches-real-checkins', after.inventory.scrap === expected, `Expected ${expected} completed four-second cycles.`)
    context.check('time-reaches-return', after.lastAt === 2 * DAY)
    context.metric('checkIns', context.variant === 'daily' ? 3 : 2)
    context.metric('eligibleHours', context.variant === 'daily' ? 48 : 24)
    context.metric('discardedHours', context.variant === 'daily' ? 0 : 24)
    context.metric('goalReached', after.inventory.scrap === expected)
    finalMetrics(context, before)
  },
}

const onboarding: ScenarioDefinition = {
  id: 'first-bud-working', version: 1, fixtureVersion: 1, policyVersion: 1,
  description: 'Acquire a first Bud through ordinary gathering, crafting and combat, then assign work.',
  question: 'Does a fresh player reach a working Bud within eight capture attempts?',
  variants: ['default'], limits: { ...limits, maxEvents: 200, maxSimulatedMs: HOUR },
  create: seed => createPlayer('Lab Tender', 0, seed),
  run(context) {
    const before = context.observe()
    let attempts = 0
    while (!context.observe().buds.length && attempts < 8) {
      finish(context, { kind: 'gather', nodeId: 'earth-scrap', count: 3 })
      finish(context, { kind: 'craft', recipeId: 'capture-kit', count: 1 })
      finish(context, { kind: 'battle', zoneId: 'earth', count: 1 })
      attempts += 1
    }
    const caught = context.observe()
    const bud = caught.buds[0]
    context.metric('captureAttempts', attempts)
    context.metric('firstCatchMs', bud ? caught.lastAt : null)
    context.check('first-bud-acquired-within-attempt-bound', Boolean(bud), 'A missed goal within eight attempts is an experiment outcome, not proof of a mechanics defect.')
    if (bud) {
      const nodeId = Object.keys(NODES).find(id => NODES[id].zoneId === 'earth' && SPECIES[bud.speciesId].aptitudes.includes(NODES[id].skill))!
      act(context, { type: 'startActivity', workerId: bud.id, order: { kind: 'gather', nodeId, count: 5 } }, 'first-bud-assigned')
      context.advanceTo(caught.lastAt + 30_000)
      const working = context.observe()
      context.check('first-bud-earns-work-xp', working.buds[0].xp > 0)
      context.check('bud-work-leaves-tender-xp', JSON.stringify(working.xp) === JSON.stringify(caught.xp))
    }
    context.metric('goalReached', Boolean(bud) && context.observe().buds[0].xp > 0)
    finalMetrics(context, before)
    context.note('Times are simulated system time and omit human reading, navigation and decision time. All unsuccessful attempts remain recorded.')
  },
}

const progression: ScenarioDefinition = {
  id: 'policy-progression', version: 1, fixtureVersion: 1, policyVersion: 1,
  description: 'Four public-state policies pursue distinct production or combat goals over one day.',
  question: 'What do simple daily and frequent-return policies produce, consume, and leave blocked?',
  variants: POLICY_IDS, limits,
  create(seed) {
    const state = workerFixture(seed, 3)
    state.inventory = { scrap: 30, fiber: 10, 'capture-kit': 5 }
    return state
  },
  run(context) {
    const policy = context.variant as PolicyId
    const before = context.observe()
    let actions = 0
    let rejected = 0
    let visits = 0
    for (let at = 0; at < DAY; at += POLICIES[policy].checkInMs) {
      if (at) context.advanceTo(at)
      for (const command of policyActions(policy, context.observe(), visits)) {
        const result = context.act(command)
        actions += 1
        rejected += Number(!result.accepted)
        context.check('policy-command-accepted', result.accepted, result.message)
      }
      visits += 1
    }
    context.advanceTo(DAY)
    const after = context.observe()
    context.check('policy-retains-one-bud-per-skill', uniqueWorkerSkills(after))
    context.check('policy-produces-useful-progress', policy === 'battler' ? after.stats.battles > before.stats.battles : after.stats.crafted > before.stats.crafted)
    context.metric('goalReached', policy === 'battler' ? after.stats.wins > before.stats.wins : after.stats.crafted > before.stats.crafted)
    context.metric('playerActions', actions)
    context.metric('rejectedActions', rejected)
    context.metric('checkIns', visits + 1)
    context.metric('policy', policy)
    finalMetrics(context, before)
    context.note('Policies see only public state. Initial resources and roster are identical. Goals and return schedules differ, so raw output is not a fair balance ranking. No simulated market sales or stock resets occur.')
  },
}

function uniqueWorkerSkills(state: PlayerView): boolean {
  const skills = Object.values(state.activities).filter(activity => activity.workerId !== 'tender' && activityAssigned(activity))
    .map(activity => orderSkill(activity.order))
  return new Set(skills).size === skills.length && skills.length <= workerCapacity(state)
}

const sequences: ScenarioDefinition = {
  id: 'action-sequences', version: 1, fixtureVersion: 1, policyVersion: 1,
  description: 'Seeded short action sequences exercise assignment, pauses, rejection, storage and elapsed time.',
  question: 'Do ownership and activity invariants survive bounded combinations of valid and invalid player actions?',
  variants: ['default'], limits: { ...limits, maxEvents: 1_000, maxSimulatedMs: HOUR },
  create(seed) {
    const state = workerFixture(seed)
    state.inventory = { scrap: 50, fiber: 50 }
    state.equipment = [gear('lab-owned-gear')]
    return state
  },
  run(context) {
    const before = context.observe()
    const random = sourceFor(context.seed, 'lab-action-sequence')
    let rejected = 0
    let invariantsHeld = true
    function check(id: string, condition: boolean) {
      invariantsHeld = invariantsHeld && condition
      context.check(id, condition)
    }
    for (let step = 0; step < 64; step += 1) {
      const view = context.observe()
      const workerId = [undefined, ...view.buds.map(bud => bud.id)][Math.floor(random() * 3)]
      const commands: GameCommand[] = [
        { type: 'startActivity', workerId, order: { kind: 'gather', nodeId: 'earth-scrap' } },
        { type: 'startActivity', workerId, order: { kind: 'craft', recipeId: 'capture-kit', count: null } },
        { type: 'startActivity', workerId, order: { kind: 'gather', nodeId: 'tide-basalt' } },
        { type: 'pauseActivity', workerId }, { type: 'resumeActivity', workerId }, { type: 'stopActivity', workerId },
        { type: 'equip', slot: 'weapon', gearId: random() < 0.5 ? 'lab-owned-gear' : null },
      ]
      const result = context.act(commands[Math.floor(random() * commands.length)])
      rejected += Number(!result.accepted)
      const paused = Object.values(context.observe().activities).filter(activity => activity.status === 'paused').map(activity => activity.workerId)
      context.advanceTo(view.lastAt + 1 + Math.floor(random() * 4_000), 'background')
      const state = context.observe()
      check(`quantities-${step}`, Object.values(state.inventory).every(quantity => Number.isSafeInteger(quantity) && quantity >= 0))
      check(`coins-${step}`, Number.isSafeInteger(state.coins) && state.coins >= 0 && state.coins <= MAX_COINS)
      const identities = [...state.buds, ...state.eggs, ...state.equipment,
        ...Object.values(state.pendingRewards).flatMap(pending => pending.gear)].map(item => item.id)
      check(`unique-ownership-${step}`, identities.length === new Set(identities).size)
      check(`worker-skills-${step}`, uniqueWorkerSkills(state))
      check(`manual-pause-${step}`, paused.every(id => state.activities[id]?.status === 'paused'))
      check(`clock-${step}`, state.lastAt > view.lastAt)
    }
    context.metric('sequenceSteps', 64)
    context.metric('rejectedActions', rejected)
    context.metric('goalReached', invariantsHeld)
    finalMetrics(context, before)
    context.note('The scenario seed chooses an adversarial action sequence; this is a correctness probe, not a simulated human. Rejected actions are expected and remain in the trace.')
  },
}

export const SCENARIOS: readonly ScenarioDefinition[] = [production, inventory, replacement, offline, onboarding, progression, sequences]

export function getScenario(id: string): ScenarioDefinition {
  const scenario = SCENARIOS.find(candidate => candidate.id === id)
  if (!scenario) throw new Error(`Unknown scenario: ${id}. Choose ${SCENARIOS.map(candidate => candidate.id).join(', ')}.`)
  return scenario
}
