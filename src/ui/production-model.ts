import { NODES, RECIPES } from '../data/index.ts'
import { levelForXp } from '../game/progression.ts'
import type { ActivityOrder, PlayerView, ProductionSkill } from '../game/types.ts'
import { itemName, zoneEligibility } from './view-model.ts'

export interface ProductionOption {
  key: string
  label: string
  itemId: string
  order: ActivityOrder
  skill: ProductionSkill
  level: number
  durationMs: number
  xp: number
  inputs?: Readonly<Record<string, number>>
  quantity: number
  gear: boolean
  requirement?: string
}

export function productionOptions(state: PlayerView, skill: ProductionSkill): ProductionOption[] {
  const level = levelForXp(state.xp[skill])
  // Geography no longer makes the slower duplicate sources a distinct choice.
  const nodes = Object.entries(NODES).filter(([, node]) => node.skill === skill)
    .filter(([id, node], _, entries) => !entries.some(([otherId, other]) => otherId !== id && other.itemId === node.itemId && other.durationMs < node.durationMs && other.level <= node.level))
    .map(([id, node]): ProductionOption => {
      const access = zoneEligibility(state, node.zoneId)
      return { key: id, label: itemName(node.itemId), itemId: node.itemId, order: { kind: 'gather', nodeId: id }, skill, level: node.level, durationMs: node.durationMs, xp: node.xp, quantity: 1, gear: false,
        requirement: level < node.level ? `${skill} Lv ${node.level}` : !access.unlocked && !access.eligible ? access.requirement : undefined }
    })
  const recipes = Object.entries(RECIPES).filter(([, recipe]) => recipe.skill === skill).map(([id, recipe]): ProductionOption => {
    const { output } = recipe
    const gear = 'gearId' in output
    return { key: id, label: recipe.name, itemId: 'gearId' in output ? output.gearId : output.itemId, order: { kind: 'craft', recipeId: id }, skill, level: recipe.level, durationMs: recipe.durationMs, xp: recipe.xp, quantity: 'quantity' in output ? output.quantity : 1, gear, inputs: recipe.inputs,
      requirement: level < recipe.level ? `${skill} Lv ${recipe.level}` : recipe.discovery && !state.discoveries.includes(recipe.discovery) ? 'Hollowtide blueprint' : undefined }
  })
  return [...nodes, ...recipes]
}

export function sameOrder(left: ActivityOrder | undefined, right: ActivityOrder) {
  return left?.kind === 'gather' && right.kind === 'gather' ? left.nodeId === right.nodeId
    : left?.kind === 'craft' && right.kind === 'craft' ? left.recipeId === right.recipeId
      : left?.kind === 'battle' && right.kind === 'battle' && left.zoneId === right.zoneId
}
