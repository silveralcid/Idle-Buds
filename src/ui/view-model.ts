import { ITEM_DEFINITIONS, RECIPES, NODES, PRODUCTION_SKILLS, SPECIES, ZONES } from '../data/index.ts'
import { TENDER_ID } from '../game/limits.ts'
import { levelForXp } from '../game/progression.ts'
import type { ActivityOrder, PlayerView, ProductionSkill, ZoneId } from '../game/types.ts'

const numbers = new Intl.NumberFormat('en-US')
export const number = (value: number) => numbers.format(value)
export const itemName = (id: string) => ITEM_DEFINITIONS[id]?.name ?? id
export const speciesName = (id: string) => SPECIES[id]?.name ?? id
export const budName = (state: PlayerView, id: string) => id === TENDER_ID ? 'Tender' : speciesName(state.buds.find((bud) => bud.id === id)?.speciesId ?? id)

export function duration(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1_000)
  const hours = Math.floor(seconds / 3_600)
  const minutes = Math.floor(seconds % 3_600 / 60)
  if (hours) return `${hours}h ${minutes}m`
  if (minutes) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export function activityName(order: ActivityOrder) {
  switch (order.kind) {
    case 'gather': return NODES[order.nodeId]?.name ?? order.nodeId
    case 'craft': return RECIPES[order.recipeId]?.name ?? order.recipeId
    case 'battle': return `Patrol · ${ZONES[order.zoneId].name}`
  }
}

export function zoneEligibility(state: PlayerView, zoneId: ZoneId) {
  const access = ZONES[zoneId].access
  if (!access || state.unlockedZones.includes(zoneId)) return { unlocked: true, eligible: true, requirement: '' }
  const previous = state.unlockedZones.includes(access.previous)
  const level = Math.max(...PRODUCTION_SKILLS.map((skill) => levelForXp(state.xp[skill])))
  return {
    unlocked: false,
    eligible: previous && (state.stats.zoneWins[access.previous] >= access.wins || level >= access.productionLevel),
    requirement: `Unlock ${ZONES[access.previous].name}, then win ${access.wins} battles there or reach level ${access.productionLevel} in a production skill.`,
  }
}

export const destinations = [
  ['overview', 'Outpost', '⌂'], ['combat', 'Combat', '✦'], ['buds', 'Collection', '⬢'],
  ['formation', 'Formation', '▦'], ['nursery', 'Nursery', '◇'], ['inventory', 'Inventory', '▣'],
  ['market', 'Market', '⇄'], ['community', 'Community', '◎'], ['ranked', 'Ranked', '△'],
] as const

export type Destination = typeof destinations[number][0] | ProductionSkill

export function readDestination(): Destination {
  const path = window.location.hash.slice(1)
  return PRODUCTION_SKILLS.find((skill) => skill.toLowerCase() === path)
    ?? destinations.find(([key]) => key === path)?.[0]
    ?? 'overview'
}
