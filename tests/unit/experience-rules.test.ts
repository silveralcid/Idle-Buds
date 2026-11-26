import { describe, expect, it } from 'vitest'
import { ITEM_DEFINITIONS } from '../../src/data/catalog.ts'
import { activityDuration, orderSkill } from '../../src/game/activities.ts'
import { addBud } from '../../src/game/breeding.ts'
import { advance, applyCommand, createPlayer, inventoryCapacity, inventorySlotsUsed, MAX_BUDS, MAX_COINS, SAVE_VERSION } from '../../src/game/index.ts'
import { addItems, canReceiveItems, takeItems } from '../../src/game/progression.ts'
import type { GameCommand, GameState, Gear } from '../../src/game/types.ts'

const apply = (state: GameState, command: GameCommand, at = state.lastAt) => applyCommand(state, command, at).state
function player(seed = 'experience-rules') { return createPlayer('Tester', 0, seed) }
function gear(id: string): Gear { return { id, definitionId: 'scrap-blade', slot: 'weapon', bonus: 2, technique: 'Guard' } }
function fillGear(state: GameState, slots: number) {
  while (inventorySlotsUsed(state) < slots) state.equipment.push(gear(`fixture-${state.equipment.length}`))
}
function bud(state: GameState, speciesId = 'pebbleback') {
  addBud(state, speciesId, { ivs: { attack: 0, health: 0, gather: 0, craft: 0 }, sex: 'Female', trait: 'Stalwart' })
  state.stats.catches += 1
  return state.buds.at(-1)!
}

describe('easy activity control', () => {
  it('replaces unfinished work immediately, preserves completed output, and leaves the previous job on invalid replacement', () => {
    let state = apply(player(), { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } })
    state = apply(state, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-fiber' } }, 5_000)
    expect(state.inventory.scrap).toBe(1)
    expect(state.activities.tender.nextAt).toBe(10_000)
    expect(() => apply(state, { type: 'startActivity', order: { kind: 'gather', nodeId: 'glass-quartz' } })).toThrow('Mining level 3')
    expect(state.activities.tender.order).toEqual({ kind: 'gather', nodeId: 'earth-fiber' })
    expect(advance(state, 10_000).state.inventory).toMatchObject({ scrap: 1, fiber: 1 })
  })

  it('automatically unlocks qualifying areas and starts remote work without a travel command', () => {
    let state = apply(player(), { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: 6 } })
    state = advance(state, 24_000).state
    expect(state.unlockedZones).toEqual(['earth', 'glassreach'])
    state = apply(state, { type: 'startActivity', order: { kind: 'gather', nodeId: 'glass-quartz' } })
    expect(state.zoneId).toBe('glassreach')
    expect(advance(state, 30_000).state.inventory.quartz).toBe(1)
  })

  it('uses one Bud per skill, automatically replacing its old worker even at the worker limit', () => {
    let state = player()
    const first = bud(state)
    const second = bud(state)
    state = apply(state, { type: 'startActivity', workerId: first.id, order: { kind: 'gather', nodeId: 'earth-scrap' } })
    state = apply(state, { type: 'startActivity', workerId: second.id, order: { kind: 'gather', nodeId: 'earth-scrap' } }, 1_000)
    expect(state.activities[first.id]).toBeUndefined()
    expect(Object.keys(state.activities)).toEqual([second.id])
    state = apply(state, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } })
    expect(Object.keys(state.activities)).toHaveLength(2)
  })

  it('lets Tender battle repeatedly while the independent Bud produces, with level affecting speed and not eligibility', () => {
    let state = player()
    const miner = bud(state)
    state.xp.Mining = 48
    state = apply(state, { type: 'startActivity', workerId: miner.id, order: { kind: 'gather', nodeId: 'glass-quartz' } })
    const slow = activityDuration(state, miner.id, state.activities[miner.id].order)
    const leveled = structuredClone(state)
    leveled.buds[0].xp = 10_000
    expect(activityDuration(leveled, miner.id, state.activities[miner.id].order)).toBeLessThan(slow)
    state = apply(state, { type: 'startActivity', order: { kind: 'battle', zoneId: 'earth' } })
    const end = advance(state, 24_000).state
    expect(end.stats.battles).toBe(2)
    expect(end.inventory.quartz).toBeGreaterThan(0)
    expect(end.activities.tender.remainingCount).toBeNull()
    expect(end.activities[miner.id].status).toBe('running')
  })

  it('automatically resumes crafting at the producer event time, identically online and offline', () => {
    let state = player()
    const miner = bud(state)
    state = apply(state, { type: 'startActivity', workerId: miner.id, order: { kind: 'gather', nodeId: 'earth-scrap' } })
    state = apply(state, { type: 'startActivity', order: { kind: 'craft', recipeId: 'capture-kit', count: null } })
    expect(state.activities.tender.status).toBe('blocked')
    const direct = advance(state, 90_000).state
    const steps = [3_000, 5_000, 11_892, 16_892, 25_000, 90_000].reduce((s, at) => advance(s, at).state, state)
    expect(steps).toEqual(direct)
    expect(direct.inventory['capture-kit']).toBeGreaterThan(4)
    expect(direct.stats.crafted).toBe(direct.inventory['capture-kit'])
  })

  it('never auto-resumes a manually paused or stopped job when ingredients arrive', () => {
    let state = player()
    const miner = bud(state)
    state = apply(state, { type: 'startActivity', workerId: miner.id, order: { kind: 'gather', nodeId: 'earth-scrap' } })
    state = apply(state, { type: 'startActivity', order: { kind: 'craft', recipeId: 'capture-kit', count: null } })
    state = apply(state, { type: 'pauseActivity' })
    state = advance(state, 40_000).state
    expect(state.inventory.scrap).toBeGreaterThan(3)
    expect(state.stats.crafted).toBe(0)
    expect(state.activities.tender.status).toBe('paused')
    state = apply(state, { type: 'stopActivity' })
    expect(advance(state, 80_000).state.activities.tender).toBeUndefined()
  })
})

describe('shared storage and completed output', () => {
  it('stacks unlimited quantities while counting each unequipped item and reserving escrow types', () => {
    const state = player()
    state.inventory.scrap = 1_000_000
    fillGear(state, inventoryCapacity(state))
    expect(canReceiveItems(state, { scrap: 1_000_000 })).toBe(true)
    addItems(state, 'scrap', 1_000_000)
    expect(state.inventory.scrap).toBe(2_000_000)
    expect(canReceiveItems(state, { fiber: 1 })).toBe(false)
    expect(() => addItems(state, 'fiber', 1)).toThrow('inventory is full')
    state.loadout.weapon = state.equipment[0].id
    expect(inventorySlotsUsed(state)).toBe(23)
    state.storageReservations.listing = { kind: 'item', itemId: 'fiber' }
    expect(inventorySlotsUsed(state)).toBe(24)
    addItems(state, 'fiber', 5)
    expect(inventorySlotsUsed(state)).toBe(24)
    takeItems(state, { fiber: 5 })
    expect(inventorySlotsUsed(state)).toBe(24)
  })

  it('preserves a completed unique roll through stop, replacement, JSON restart, and space becoming available', () => {
    let state = player('pending-equipment')
    state.inventory = { scrap: 100, fiber: 100 }
    fillGear(state, 23)
    state = apply(state, { type: 'startActivity', order: { kind: 'craft', recipeId: 'scrap-blade', markMaker: true } })
    state.equipment.push(gear('space-filled-during-cycle'))
    state = advance(state, 7_000).state
    expect(state.stats.crafted).toBe(1)
    expect(state.inventory).toEqual({ scrap: 96, fiber: 99 })
    expect(state.pendingRewards.tender.gear).toHaveLength(1)
    const rolled = structuredClone(state.pendingRewards.tender.gear[0])
    expect(rolled).toMatchObject({ maker: 'Tester', definitionId: 'scrap-blade' })
    const counter = state.rngCounter
    state = apply(state, { type: 'stopActivity' })
    state = apply(state, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } })
    state = advance(JSON.parse(JSON.stringify(state)) as GameState, 70_000).state
    expect(state.pendingRewards.tender.gear).toEqual([rolled])
    expect(state.rngCounter).toBe(counter)
    expect(state.stats.crafted).toBe(1)
    state = apply(state, { type: 'equip', slot: 'weapon', gearId: state.equipment[0].id })
    expect(state.pendingRewards).toEqual({})
    expect(state.equipment.filter((entry) => entry.id === rolled.id)).toEqual([rolled])
    expect(state.activities.tender.status).toBe('running')
    expect(state.rngCounter).toBe(counter)
    expect(advance(state, state.lastAt).state.equipment.filter((entry) => entry.id === rolled.id)).toHaveLength(1)
  })

  it('retains a gathered item that finishes after another action fills its last slot', () => {
    let state = player('pending-items')
    fillGear(state, 23)
    state = apply(state, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } })
    state.equipment.push(gear('arrived-before-gather'))
    state = advance(state, 4_000).state
    expect(state.inventory.scrap).toBeUndefined()
    expect(state.pendingRewards.tender.items.scrap).toBe(1)
    expect(state.stats.gathered).toBe(1)
    expect(state.xp.Mining).toBe(8)
    state = apply(state, { type: 'stopActivity' })
    state = advance(JSON.parse(JSON.stringify(state)) as GameState, 40_000).state
    expect(state.stats.gathered).toBe(1)
    state = apply(state, { type: 'equip', slot: 'weapon', gearId: state.equipment[0].id })
    expect(state.inventory.scrap).toBe(1)
    expect(state.pendingRewards.tender?.items.scrap).toBeUndefined()
    expect(state.activities.tender).toBeUndefined()
    expect(state.stats.gathered).toBe(1)
    expect(state.xp.Mining).toBe(8)
  })

  it('requires room to unequip, while swapping equipment needs no additional slot', () => {
    let state = player()
    fillGear(state, 24)
    state = apply(state, { type: 'equip', slot: 'weapon', gearId: state.equipment[0].id })
    addItems(state, 'scrap', 1)
    expect(inventorySlotsUsed(state)).toBe(24)
    expect(() => apply(state, { type: 'equip', slot: 'weapon', gearId: null })).toThrow('Free an inventory slot')
    state = apply(state, { type: 'equip', slot: 'weapon', gearId: state.equipment[1].id })
    expect(inventorySlotsUsed(state)).toBe(24)
    expect(state.loadout.weapon).toBe(state.equipment[1].id)
  })

  it('permits a full bag recipe when consuming its last input releases the needed output slot', () => {
    let state = player()
    state.inventory.scrap = 3
    fillGear(state, 24)
    state = apply(state, { type: 'startActivity', order: { kind: 'craft', recipeId: 'capture-kit' } })
    expect(state.activities.tender.status).toBe('running')
    state = advance(state, 5_000).state
    expect(state.inventory).toEqual({ 'capture-kit': 1 })
    expect(state.pendingRewards).toEqual({})
    expect(inventorySlotsUsed(state)).toBe(24)
  })

  it('reserves a listed Bud’s collection position without using an ordinary inventory slot', () => {
    const state = player()
    for (let index = 0; index < MAX_BUDS - 1; index += 1) bud(state)
    state.storageReservations.listedBud = { kind: 'bud' }
    expect(inventorySlotsUsed(state)).toBe(0)
    expect(() => bud(state)).toThrow('collection is full')
    delete state.storageReservations.listedBud
    bud(state)
    expect(state.buds).toHaveLength(MAX_BUDS)
  })

  it('stops numeric overflow without silently clipping any earned or purchased amount', () => {
    const state = player()
    state.inventory.scrap = Number.MAX_SAFE_INTEGER
    expect(() => addItems(state, 'scrap', 1)).toThrow()
    expect(state.inventory.scrap).toBe(Number.MAX_SAFE_INTEGER)
  })
})

describe('version one migration', () => {
  it('retains same-skill legacy Bud queues without allowing a queued second worker in another skill', () => {
    let old = player('legacy-cross-skill-queue')
    const miner = bud(old)
    const crafter = bud(old)
    old.upgrades.worker = 1
    old.inventory = { scrap: 30, 'capture-kit': 2 }
    old = apply(old, { type: 'startActivity', workerId: miner.id, order: { kind: 'gather', nodeId: 'earth-scrap', count: 1 } })
    old = apply(old, { type: 'startActivity', workerId: crafter.id, order: { kind: 'craft', recipeId: 'capture-kit', count: 10 } })
    old = apply(old, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-fiber', count: 1 } })
    old = apply(old, { type: 'queueActivity', order: { kind: 'craft', recipeId: 'capture-kit', count: 1 } })
    old = advance(old, 1_000).state
    // V1 allowed this finite cross-skill Bud queue. Both jobs and their inputs were eligible.
    old.activities[miner.id].queue = [
      { kind: 'craft', recipeId: 'capture-kit', count: 2 },
      { kind: 'gather', nodeId: 'earth-scrap', count: 2 },
    ]
    old.version = 1
    Reflect.deleteProperty(old, 'pendingRewards')
    Reflect.deleteProperty(old, 'storageReservations')
    for (const activity of Object.values(old.activities)) Reflect.deleteProperty(activity, 'status')
    const before = structuredClone(old)
    const migrated = advance(old, 1_000).state
    expect(migrated.activities[miner.id].queue).toEqual([{ kind: 'gather', nodeId: 'earth-scrap', count: 2 }])
    expect(migrated.activities.tender.queue).toEqual(before.activities.tender.queue)
    expect(migrated.activities[miner.id].nextAt).toBe(before.activities[miner.id].nextAt)
    expect(migrated.activities[miner.id].remainingMs).toBe(before.activities[miner.id].remainingMs)
    expect(migrated.activities[crafter.id].order).toEqual(before.activities[crafter.id].order)
    expect(migrated.inventory).toEqual(before.inventory)
    expect(migrated.buds).toEqual(before.buds)
    expect(old).toEqual(before)

    const boundary = advance(migrated, migrated.activities[miner.id].nextAt!).state
    const craftingBuds = Object.values(boundary.activities).filter((activity) => activity.workerId !== 'tender' && orderSkill(activity.order) === 'Crafting')
    expect(craftingBuds.map((activity) => activity.workerId)).toEqual([crafter.id])
    expect(boundary.activities[miner.id].order).toEqual({ kind: 'gather', nodeId: 'earth-scrap', count: 2 })
    const completed = advance(boundary, 12_000).state
    expect(completed.activities[miner.id]).toMatchObject({ status: 'complete', remainingCount: 0, queue: [] })
    expect(completed.buds.find((entry) => entry.id === miner.id)?.xp).toBe(24)
  })

  it('preserves overfull items, gear, upgrades and progress and refunds the retired relay exactly once', () => {
    const old = player()
    old.version = 1
    Reflect.deleteProperty(old, 'pendingRewards')
    Reflect.deleteProperty(old, 'storageReservations')
    old.inventory = Object.fromEntries(Object.keys(ITEM_DEFINITIONS).map((id) => [id, 200]))
    old.equipment = Array.from({ length: 50 }, (_, index) => gear(`legacy-${index}`))
    old.upgrades = { storage: 3, tool: 2, worker: 2, remote: 1 }
    old.coins = 100
    old.xp.Mining = 500
    const migrated = advance(old, 0).state
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.inventory.scrap).toBe(200)
    expect(migrated.inventory.quartz).toBe(202)
    expect(migrated.inventory['portal-compound']).toBe(202)
    expect(migrated.equipment).toEqual(old.equipment)
    expect(migrated.coins).toBe(145)
    expect(migrated.upgrades).toEqual({ storage: 3, tool: 2, worker: 2, remote: 0 })
    expect(migrated.unlockedZones).toEqual(['earth', 'glassreach', 'hollowtide'])
    expect(inventorySlotsUsed(migrated)).toBeGreaterThan(inventoryCapacity(migrated))
    expect(canReceiveItems(migrated, { scrap: 1 })).toBe(true)
    expect(advance(migrated, 0).state).toEqual(migrated)
    expect(old.version).toBe(1)
  })

  it('retains a relay refund above the wallet cap and pays it once when spending makes room', () => {
    const old = player()
    old.version = 1
    old.coins = MAX_COINS
    old.upgrades.remote = 1
    old.xp.Mining = 16
    old.inventory = { scrap: 4, fiber: 2 }
    let migrated = advance(old, 0).state
    expect(migrated.coins).toBe(MAX_COINS)
    expect(migrated.pendingRefundCoins).toBe(45)
    migrated = apply(migrated, { type: 'buyUpgrade', upgrade: 'tool' })
    expect(migrated.coins).toBe(MAX_COINS)
    expect(migrated.pendingRefundCoins).toBe(30)
    expect(advance(migrated, 0).state.pendingRefundCoins).toBe(30)
    expect(migrated.upgrades.tool).toBe(1)
  })

  it('distinguishes legacy manual pauses from blocked work and rejects unsupported saves', () => {
    let old = player()
    old = apply(old, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } })
    old = apply(old, { type: 'pauseActivity' }, 2_000)
    old.version = 1
    Reflect.deleteProperty(old.activities.tender, 'status')
    const migrated = advance(old, 20_000).state
    expect(migrated.activities.tender).toMatchObject({ status: 'paused', remainingMs: 2_000, nextAt: null })
    expect(migrated.inventory.scrap).toBeUndefined()
    expect(() => advance({ ...old, version: 99 }, 20_000)).toThrow('Unsupported game state version')
  })
})
