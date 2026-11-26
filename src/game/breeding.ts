import { SPECIES, TRAITS } from '../data/catalog.ts'
import { MAX_BUDS, MAX_EGGS, requireRule } from './limits.ts'
import { budSlotsUsed, itemCount, takeItems } from './progression.ts'
import { eventRandom, instanceId, pick } from './random.ts'
import type { Random } from './random.ts'
import type { Activity, Bud, EggGenetics, GameState, PlayerView, Species } from './types.ts'

export const BREEDING_MS = 90_000
export const INCUBATION_MS = 120_000
const IV_KEYS = ['attack', 'health', 'gather', 'craft'] as const

export function activityAssigned(activity: Activity | undefined): boolean {
  return activity !== undefined && (activity.remainingCount !== 0 || activity.queue.length > 0)
}

export function isBudCommitted(state: PlayerView, budId: string): boolean {
  return state.formation.includes(budId) || (Object.hasOwn(state.activities, budId) && activityAssigned(state.activities[budId]))
    || state.breeding?.primaryId === budId || state.breeding?.secondaryId === budId
}

export function breedingPreview(state: PlayerView, primaryId: string, secondaryId: string): { speciesId: string | null; reason: string | null } {
  const primary = state.buds.find((bud) => bud.id === primaryId)
  const secondary = state.buds.find((bud) => bud.id === secondaryId)
  if (!primary || !secondary || primaryId === secondaryId) return { speciesId: null, reason: 'Choose two different owned Buds.' }

  const primarySpecies = SPECIES[primary.speciesId]
  const secondarySpecies = SPECIES[secondary.speciesId]
  if (primarySpecies.breedingGroup !== secondarySpecies.breedingGroup) return { speciesId: null, reason: 'These species are in different breeding groups.' }
  if (primary.sex === secondary.sex && primary.sex !== 'Asexual') return { speciesId: null, reason: 'This breeding group requires a male and female.' }
  if (isBudCommitted(state, primaryId) || isBudCommitted(state, secondaryId)) return { speciesId: primary.speciesId, reason: 'Remove both Buds from work and formation first.' }
  if (state.breeding) return { speciesId: primary.speciesId, reason: 'Breeding is already in progress.' }
  if (state.eggs.length >= MAX_EGGS) return { speciesId: primary.speciesId, reason: 'Your egg storage is full.' }
  return { speciesId: primary.speciesId, reason: null }
}

export function startBreeding(state: GameState, primaryId: string, secondaryId: string, enhanced: boolean, at: number): void {
  const { speciesId, reason } = breedingPreview(state, primaryId, secondaryId)
  requireRule(speciesId !== null && reason === null, reason ?? 'Choose eligible parents.')
  if (enhanced) {
    requireRule(itemCount(state, 'brood-tonic') > 0, 'A Brood Tonic is required to enhance breeding.')
    takeItems(state, { 'brood-tonic': 1 })
  }
  state.breeding = { primaryId, secondaryId, speciesId, readyAt: at + BREEDING_MS, enhanced }
}

function randomIv(random: Random): number {
  return Math.floor(random() * 11)
}

export function rollGenetics(species: Species, random: Random, parents?: { primary: Bud; secondary: Bud; enhanced: boolean }): EggGenetics {
  const parentWeight = parents?.enhanced ? 0.45 : 0.4
  const ivs = Object.fromEntries(IV_KEYS.map((iv) => {
    const roll = random()
    const value = parents && roll < parentWeight * 2
      ? (roll < parentWeight ? parents.primary : parents.secondary).ivs[iv]
      : randomIv(random)
    return [iv, value]
  })) as EggGenetics['ivs']
  const traitRoll = random()
  const trait = parents && traitRoll < 0.8
    ? (traitRoll < 0.4 ? parents.primary : parents.secondary).trait
    : pick(random, TRAITS)
  const sex = species.asexual ? 'Asexual' : random() < 0.5 ? 'Female' : 'Male'
  return { ivs, trait, sex }
}

export function addBud(state: GameState, speciesId: string, genetics: EggGenetics): void {
  requireRule(budSlotsUsed(state) < MAX_BUDS, 'Your collection is full.')
  state.buds.push({ id: instanceId(state, 'bud'), speciesId, ...genetics, xp: 0, protected: false, bond: 0 })
}

export function addEgg(state: GameState, speciesId: string, genetics: EggGenetics, at: number, source: 'wild' | 'bred'): void {
  const id = instanceId(state, 'egg')
  state.eggs.push({ id, speciesId, source, readyAt: at + INCUBATION_MS })
  state.eggGenetics[id] = genetics
}

export function completeBreeding(state: GameState, at: number): void {
  const breeding = state.breeding
  requireRule(breeding && breeding.readyAt === at, 'No breeding completion is due.')
  const { primaryId, secondaryId, speciesId, enhanced } = breeding
  const primary = state.buds.find((bud) => bud.id === primaryId)
  const secondary = state.buds.find((bud) => bud.id === secondaryId)
  requireRule(primary && secondary && state.eggs.length < MAX_EGGS, 'Breeding parents or reserved egg storage are missing.')
  const genetics = rollGenetics(SPECIES[speciesId], eventRandom(state, 'breed'), { primary, secondary, enhanced })
  addEgg(state, speciesId, genetics, at, 'bred')
  state.breeding = null
}

export function hatchEgg(state: GameState, eggId: string, at: number): void {
  const egg = state.eggs.find((entry) => entry.id === eggId)
  requireRule(egg, 'This egg is unavailable.')
  requireRule(egg.readyAt <= at, 'This egg is still incubating.')
  const genetics = state.eggGenetics[egg.id]
  requireRule(genetics, 'Egg genetics are missing.')
  addBud(state, egg.speciesId, genetics)
  state.eggs = state.eggs.filter((entry) => entry.id !== egg.id)
  delete state.eggGenetics[egg.id]
  state.stats.hatched += 1
}
