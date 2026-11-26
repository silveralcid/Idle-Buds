import { describe, expect, it } from 'vitest'
import {
  AFFINITIES, CAPTURE_ITEMS, GEAR_DEFINITIONS, ITEM_DEFINITIONS, NODES, PRODUCTION_SKILLS, RECIPES, SPECIES, UPGRADES, ZONES,
} from '../../src/data/catalog.ts'
import {
  advance, applyCommand, breedingPreview, BREEDING_MS, createPlayer, INCUBATION_MS, isBudCommitted, MAX_QUEUE, publicState,
} from '../../src/game/index.ts'
import { addBud, rollGenetics } from '../../src/game/breeding.ts'
import { sourceFor } from '../../src/game/random.ts'
import type { GameCommand, GameState } from '../../src/game/types.ts'

function apply(state: GameState, command: GameCommand, now = state.lastAt) {
  return applyCommand(state, command, now).state
}

function hasOwn(object: object, key: string): boolean {
  return Object.hasOwn(object, key)
}

function parents(seed = 'parents') {
  const state = createPlayer('Tester', 0, seed)
  addBud(state, 'pebbleback', { ivs: { attack: 0, health: 0, gather: 0, craft: 0 }, sex: 'Female', trait: 'Stalwart' })
  addBud(state, 'spriglet', { ivs: { attack: 10, health: 10, gather: 10, craft: 10 }, sex: 'Male', trait: 'Diligent' })
  state.stats.catches = 2
  return state
}

describe('progression and content', () => {
  it('covers the declared skills, tiers and affinities with reachable catalog references', () => {
    expect(Object.keys(SPECIES)).toHaveLength(15)
    expect(new Set(Object.values(SPECIES).map((species) => species.affinity))).toEqual(new Set(AFFINITIES))
    expect(new Set(Object.values(ITEM_DEFINITIONS).map((item) => item.tier))).toEqual(new Set([1, 2, 3]))
    expect(Object.keys(ZONES)).toHaveLength(3)
    const encountered = new Set<string>()
    for (const zone of Object.values(ZONES)) {
      for (const [id, weight] of Object.entries(zone.encounters)) {
        expect(hasOwn(SPECIES, id)).toBe(true)
        expect(Number.isSafeInteger(weight) && weight > 0).toBe(true)
        encountered.add(id)
      }
    }
    expect(encountered).toEqual(new Set(Object.keys(SPECIES)))

    const producible = new Set(Object.values(NODES).map((node) => node.itemId).concat('portal-dust'))
    const paths = new Set(Object.values(NODES).map((node) => node.skill))
    for (const node of Object.values(NODES)) {
      expect(hasOwn(ITEM_DEFINITIONS, node.itemId)).toBe(true)
      expect(hasOwn(ZONES, node.zoneId)).toBe(true)
    }
    let pending = Object.values(RECIPES)
    while (pending.length > 0) {
      const reachable = pending.filter((recipe) => Object.keys(recipe.inputs).every((id) => producible.has(id)))
      expect(reachable.length).toBeGreaterThan(0)
      pending = pending.filter((recipe) => !reachable.includes(recipe))
      for (const recipe of reachable) {
        paths.add(recipe.skill)
        expect(Object.values(recipe.inputs).every((quantity) => Number.isSafeInteger(quantity) && quantity > 0)).toBe(true)
        if ('gearId' in recipe.output) expect(hasOwn(GEAR_DEFINITIONS, recipe.output.gearId)).toBe(true)
        else {
          expect(hasOwn(ITEM_DEFINITIONS, recipe.output.itemId)).toBe(true)
          producible.add(recipe.output.itemId)
        }
      }
    }
    expect(paths).toEqual(new Set(PRODUCTION_SKILLS))
    expect(producible).toEqual(new Set(Object.keys(ITEM_DEFINITIONS)))
    expect(Object.keys(CAPTURE_ITEMS).every((item) => hasOwn(RECIPES, item))).toBe(true)
    expect(Object.values(UPGRADES).flatMap((upgrade) => Object.keys(upgrade.items)).every((id) => producible.has(id))).toBe(true)
  })

  it('permanently unlocks a portal through either skill mastery or victories', () => {
    let production = createPlayer('Tester', 0, 'miner')
    expect(() => apply(production, { type: 'unlockZone', zoneId: 'glassreach' })).toThrow('combat or production')
    production = apply(production, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: 6 } })
    production = apply(production, { type: 'unlockZone', zoneId: 'glassreach' }, 24_000)
    expect(production.stats.wins).toBe(0)
    expect(production.unlockedZones).toEqual(['earth', 'glassreach'])
    production = apply(production, { type: 'travel', zoneId: 'glassreach' })
    expect(production.zoneId).toBe('glassreach')
    expect(() => apply(production, { type: 'startActivity', order: { kind: 'gather', nodeId: 'glass-resin' } })).toThrow('Woodcutting level 3')
    expect(apply(production, { type: 'startActivity', order: { kind: 'gather', nodeId: 'glass-quartz' } }).activities.tender.nextAt).toBe(30_000)

    let combat = createPlayer('Tester', 0, 'battler')
    combat = apply(combat, { type: 'startActivity', order: { kind: 'battle', zoneId: 'earth', count: 5 } })
    combat = apply(combat, { type: 'unlockZone', zoneId: 'glassreach' }, 60_000)
    expect(combat.xp.Mining).toBe(0)
    expect(combat.unlockedZones).toEqual(['earth', 'glassreach'])
  })

  it('enforces Bud work slots and aptitude while Tender can share a node', () => {
    let state = parents()
    const [miner, planter] = state.buds
    state = apply(state, { type: 'startActivity', workerId: miner.id, order: { kind: 'gather', nodeId: 'earth-scrap' } })
    state = apply(state, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } })
    expect(state.activities.tender.status).toBe('running')
    expect(() => apply(state, { type: 'startActivity', workerId: planter.id, order: { kind: 'gather', nodeId: 'earth-fiber' } })).toThrow('All Bud work slots')
    expect(() => apply(state, { type: 'setFormation', budIds: [miner.id] })).toThrow('committed')
    state = apply(state, { type: 'pauseActivity', workerId: miner.id }, 1)
    expect(isBudCommitted(state, miner.id)).toBe(true)
    state = apply(state, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: 1 } })
    state = apply(state, { type: 'resumeActivity', workerId: miner.id })
    expect(state.activities[miner.id].nextAt).toBeGreaterThan(1)
    expect(state.activities.tender.status).toBe('running')
    expect(() => apply(state, { type: 'startActivity', workerId: planter.id, order: { kind: 'gather', nodeId: 'earth-minnow' } })).toThrow('aptitude')
  })

  it('caps the queue and gives a persistent item and maker identity to marked equipment', () => {
    let state = createPlayer('Tester', 0, 'gear-a')
    state.inventory = { scrap: 18, fiber: 3 }
    const recipe = { kind: 'craft', recipeId: 'scrap-blade', markMaker: true } as const
    state = apply(state, { type: 'startActivity', order: recipe })
    for (let step = 0; step < MAX_QUEUE; step += 1) {
      state = apply(state, { type: 'queueActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: 1 } })
    }
    expect(() => apply(state, { type: 'queueActivity', order: recipe })).toThrow('queue is full')
    const response = advance(state, 7_000)
    expect(response.state.inventory).toEqual({ scrap: 14, fiber: 2 })
    expect(response.state.equipment[0]).toMatchObject({ definitionId: 'scrap-blade', maker: 'Tester', slot: 'weapon' })
    expect(GEAR_DEFINITIONS['scrap-blade'].techniques).toContain(response.state.equipment[0].technique)
    const other = createPlayer('Tester', 0, 'gear-b')
    other.inventory = state.inventory
    const second = advance(apply(other, { type: 'startActivity', order: recipe }), 7_000)
    expect(second.state.equipment[0].id).not.toBe(response.state.equipment[0].id)
  })
})

describe('breeding and unique commitments', () => {
  it('previews the primary species, reserves both parents, and incubates one egg exactly once', () => {
    let state = parents()
    const [primary, secondary] = state.buds
    expect(breedingPreview(state, primary.id, secondary.id)).toEqual({ speciesId: primary.speciesId, reason: null })
    expect(breedingPreview(state, secondary.id, primary.id)).toEqual({ speciesId: secondary.speciesId, reason: null })
    state = apply(state, { type: 'breed', primaryId: primary.id, secondaryId: secondary.id })
    expect(isBudCommitted(state, primary.id)).toBe(true)
    expect(() => apply(state, { type: 'releaseBud', budId: primary.id, confirm: true })).toThrow('remove it from activities')
    expect(() => apply(state, { type: 'setFormation', budIds: [secondary.id] })).toThrow('committed')
    expect(() => apply(state, { type: 'breed', primaryId: primary.id, secondaryId: secondary.id })).toThrow()

    const almost = advance(state, BREEDING_MS - 1)
    expect(almost.state.eggs).toHaveLength(0)
    const full = advance(state, BREEDING_MS)
    expect(full.state).toEqual(advance(almost.state, BREEDING_MS).state)
    const [egg] = full.state.eggs
    expect(egg).toMatchObject({ source: 'bred', speciesId: primary.speciesId, readyAt: BREEDING_MS + INCUBATION_MS })
    expect(publicState(full.state).eggs[0]).toEqual(egg)
    expect(isBudCommitted(full.state, primary.id)).toBe(false)
    expect(() => apply(full.state, { type: 'hatch', eggId: egg.id }, egg.readyAt - 1)).toThrow('still incubating')
    const done = apply(full.state, { type: 'hatch', eggId: egg.id }, egg.readyAt)
    expect(done.buds).toHaveLength(3)
    expect(done.eggs).toHaveLength(0)
    expect(done.buds[2].speciesId).toBe(primary.speciesId)
    expect(done.stats.hatched).toBe(1)
    expect(() => apply(done, { type: 'hatch', eggId: egg.id })).toThrow('unavailable')
  })

  it('supports eligible cross-species and special pairs, conserving any optional enhancement', () => {
    let state = parents()
    const [first, second] = state.buds
    second.sex = 'Female'
    expect(breedingPreview(state, first.id, second.id).reason).toContain('male and female')
    second.sex = 'Male'
    expect(() => apply(state, { type: 'breed', primaryId: first.id, secondaryId: second.id, enhanced: true })).toThrow('Brood Tonic')
    state.inventory['brood-tonic'] = 1
    state = apply(state, { type: 'breed', primaryId: first.id, secondaryId: second.id, enhanced: true })
    expect(state.breeding?.enhanced).toBe(true)
    expect(state.inventory['brood-tonic']).toBeUndefined()

    state = parents('paired-orbs')
    const ivs = first.ivs
    addBud(state, 'beaconorb', { ivs, sex: 'Asexual', trait: 'Keen' })
    addBud(state, 'roothalo', { ivs, sex: 'Asexual', trait: 'Precise' })
    expect(breedingPreview(state, state.buds[3].id, state.buds[2].id)).toEqual({ speciesId: 'roothalo', reason: null })
    expect(breedingPreview(state, state.buds[3].id, state.buds[0].id).reason).toContain('different breeding groups')
  })

  it('rolls four independent inheritable values with a meaningful mutation and enhancement rate', () => {
    const state = parents()
    const [primary, secondary] = state.buds
    let randomValues = 0
    let enhancedRandomValues = 0
    let mixed = 0
    for (let index = 0; index < 1_000; index += 1) {
      const base = rollGenetics(SPECIES.pebbleback, sourceFor('hatch', 'test', index), { primary, secondary, enhanced: false })
      const enhanced = rollGenetics(SPECIES.pebbleback, sourceFor('hatch', 'test', index), { primary, secondary, enhanced: true })
      const values = Object.values(base.ivs)
      expect(values).toHaveLength(4)
      expect(values.every((value) => Number.isInteger(value) && value >= 0 && value <= 10)).toBe(true)
      randomValues += values.filter((value) => value !== 0 && value !== 10).length
      enhancedRandomValues += Object.values(enhanced.ivs).filter((value) => value !== 0 && value !== 10).length
      if (values.includes(0) && values.includes(10)) mixed += 1
    }
    expect(randomValues).toBeGreaterThan(560)
    expect(randomValues).toBeLessThan(750)
    expect(enhancedRandomValues).toBeGreaterThan(240)
    expect(enhancedRandomValues).toBeLessThan(420)
    expect(mixed).toBeGreaterThan(600)
  })

  it('requires explicit confirmation and an available same-species donor to condense', () => {
    let state = parents()
    const [recipient, unrelated] = state.buds
    addBud(state, recipient.speciesId, { ivs: unrelated.ivs, sex: 'Male', trait: 'Keen' })
    const donor = state.buds[2]
    expect(() => apply(state, { type: 'condenseBud', budId: recipient.id, donorId: unrelated.id, confirm: true })).toThrow('same species')
    state = apply(state, { type: 'protectBud', budId: donor.id, protected: true })
    expect(() => apply(state, { type: 'condenseBud', budId: recipient.id, donorId: donor.id, confirm: true })).toThrow('unprotected')
    state = apply(state, { type: 'protectBud', budId: donor.id, protected: false })
    state = apply(state, { type: 'condenseBud', budId: recipient.id, donorId: donor.id, confirm: true })
    expect(state.buds).toHaveLength(2)
    expect(state.buds[0]).toMatchObject({ ivs: recipient.ivs, bond: 1, speciesId: recipient.speciesId })
  })
})
