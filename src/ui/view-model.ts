import { ITEM_DEFINITIONS, RECIPES, NODES, PRODUCTION_SKILLS, SPECIES, ZONES } from '../data/index.ts'
import { TENDER_ID } from '../game/limits.ts'
import { budLevelForXp, levelForXp } from '../game/progression.ts'
import type { ActivityOrder, Bud, PlayerView, ProductionSkill, ZoneId } from '../game/types.ts'

const numbers = new Intl.NumberFormat('en-US')
export const number = (value: number) => numbers.format(value)
const resourceNames: Record<string, string> = {
  scrap: 'Scrap', fiber: 'Fiber', minnow: 'Copperfin', greens: 'Greens', quartz: 'Quartz',
  resin: 'Resin', skater: 'Glass Skater', 'mirror-bloom': 'Mirror Bloom', basalt: 'Basalt',
  driftwood: 'Wood', eel: 'Lantern Eel', 'tide-kelp': 'Kelp',
}
export const itemName = (id: string) => resourceNames[id] ?? ITEM_DEFINITIONS[id]?.name ?? id
export const speciesName = (id: string) => SPECIES[id]?.name ?? id
export const budName = (state: PlayerView, id: string) => id === TENDER_ID ? 'Tender' : speciesName(state.buds.find((bud) => bud.id === id)?.speciesId ?? id)
export const budOptionLabel = (state: PlayerView, bud: Bud) => `${speciesName(bud.speciesId)} · Lv ${budLevelForXp(bud.xp)}${state.buds.filter((entry) => entry.speciesId === bud.speciesId).length > 1 ? ` · #${bud.id.slice(-4)}` : ''}`

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
    case 'gather': return NODES[order.nodeId] ? itemName(NODES[order.nodeId].itemId) : order.nodeId
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
    requirement: previous ? `Production Lv ${access.productionLevel} or ${access.wins} ${ZONES[access.previous].name} wins` : `${ZONES[access.previous].name} access`,
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
