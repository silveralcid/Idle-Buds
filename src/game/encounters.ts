import { CAPTURE_ITEMS, SPECIES, ZONES } from '../data/catalog.ts'
import { buildFormation, getLoadout, resolveBattle } from './battle.ts'
import { addBud, addEgg, rollGenetics } from './breeding.ts'
import { MAX_BUDS, MAX_EGGS } from './limits.ts'
import { addItems, earnCoins, earnXp, itemCount, levelForXp, MAX_XP, takeItems } from './progression.ts'
import { eventRandom } from './random.ts'
import type { Random } from './random.ts'
import type { BattleUnit, CaptureFilter, EncounterResult, GameState, PlayerView, Species, ZoneId } from './types.ts'

export function captureChance(state: PlayerView, speciesId: string, itemId: string): number {
  const species = Object.hasOwn(SPECIES, speciesId) ? SPECIES[speciesId] : undefined
  const bonus = Object.hasOwn(CAPTURE_ITEMS, itemId) ? CAPTURE_ITEMS[itemId] : undefined
  if (!species || bonus === undefined) return 0
  const { discipline } = getLoadout(state)
  const mastery = Math.min(12, levelForXp(state.xp[discipline]) + levelForXp(state.xp.Vitality) - 2)
  return Math.max(5, Math.min(98, 90 - species.capturePenalty + bonus + mastery))
}

function filterMatches(state: PlayerView, filter: CaptureFilter, species: Species): boolean {
  switch (filter.condition) {
    case 'any': return true
    case 'new': return !state.buds.some((bud) => bud.speciesId === species.id)
    case 'affinity': return filter.value === species.affinity
    case 'rarity': return filter.value === species.rarity
    case 'species': return filter.value === species.id
  }
}

function capture(state: GameState, species: Species, random: Random): EncounterResult['capture'] {
  const filter = state.captureFilters.find((entry) => filterMatches(state, entry, species))
  const itemId = filter?.itemId
  if (!itemId || itemId === 'skip') return { outcome: 'skipped', reason: itemId ? 'Matching filter skipped capture.' : 'No capture filter matched.' }
  if (state.buds.length >= MAX_BUDS) return { outcome: 'unavailable', itemId, reason: 'Your collection is full.' }
  if (!itemCount(state, itemId)) return { outcome: 'unavailable', itemId, reason: 'The matching capture item was out of stock.' }

  const chance = captureChance(state, species.id, itemId)
  takeItems(state, { [itemId]: 1 })
  if (random() * 100 >= chance) return { outcome: 'failed', itemId, chance, reason: 'The Bud broke free.' }
  addBud(state, species.id, rollGenetics(species, random))
  state.stats.catches += 1
  return { outcome: 'caught', chance, itemId, reason: `${species.name} joined your collection.` }
}

function chooseSpecies(zoneId: ZoneId, random: Random): Species {
  const species = Object.entries(ZONES[zoneId].encounters)
  let roll = random() * species.reduce((sum, [, weight]) => sum + weight, 0)
  for (const [id, weight] of species) {
    if (roll < weight) return SPECIES[id]
    roll -= weight
  }
  return SPECIES[species[species.length - 1][0]]
}

function wildUnit(species: Species, id: string): BattleUnit {
  return { id, name: species.name, attack: species.attack, health: species.health, affinity: species.affinity, ability: species.ability }
}

export function completeEncounter(state: GameState, zoneId: ZoneId, at: number): void {
  const random = eventRandom(state, 'encounter')
  const zone = ZONES[zoneId]
  const species = chooseSpecies(zoneId, random)
  const encounter = {
    buds: zone.tier > 1 ? [wildUnit(chooseSpecies(zoneId, random), 'escort')] : [],
    commander: wildUnit(species, 'wild'),
  }
  const battle = resolveBattle(buildFormation(state), encounter, random().toString())
  const won = battle.winner === 'left'
  const reward = won ? zone.tier * 12 : zone.tier * 3
  const { discipline, support } = getLoadout(state)
  const supportXp = support && discipline !== 'Resonance' ? Math.floor(reward / 4) : 0
  earnXp(state, discipline, reward - supportXp)
  earnXp(state, 'Vitality', Math.ceil(reward / 2))
  if (supportXp) earnXp(state, 'Resonance', supportXp)
  for (const bud of state.buds) {
    if (state.formation.includes(bud.id)) bud.xp = Math.min(MAX_XP, bud.xp + reward)
  }

  state.stats.battles += 1
  let result: EncounterResult['capture'] = { outcome: 'skipped', reason: 'Capture requires a victory.' }
  if (won) {
    state.stats.wins += 1
    state.stats.zoneWins[zoneId] += 1
    earnCoins(state, 7 * zone.tier)
    addItems(state, 'portal-dust', zone.tier)
    const canFindEgg = state.stats.catches > 0
    result = capture(state, species, random)
    if (canFindEgg && state.eggs.length + Number(state.breeding !== null) < MAX_EGGS && random() < 0.06) {
      addEgg(state, species.id, rollGenetics(species, random), at, 'wild')
    }

    if (zoneId === 'hollowtide' && !state.discoveries.includes('tide-resonator')) {
      state.discoveries.push('tide-resonator')
    }
  }
  state.lastEncounter = { zoneId, speciesId: species.id, battle, capture: result }
}
