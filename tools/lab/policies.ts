import { SPECIES } from '../../src/data/catalog.ts'
import type { ActivityOrder, GameCommand, PlayerView, ProductionSkill } from '../../src/game/types.ts'

export const POLICY_IDS = ['casual', 'generalist', 'producer', 'battler'] as const
export type PolicyId = typeof POLICY_IDS[number]

export const POLICIES: Readonly<Record<PolicyId, { description: string; checkInMs: number }>> = {
  casual: { description: 'Daily return; keep a simple capture-kit chain and gather fiber.', checkInMs: 86_400_000 },
  generalist: { description: 'Four returns per day; rotate Tender gathering while Buds supply capture kits.', checkInMs: 21_600_000 },
  producer: { description: 'Four returns per day; maintain three distinct production skills and gather greens.', checkInMs: 21_600_000 },
  battler: { description: 'Four returns per day; Buds supply capture kits while the Tender battles on Earth.', checkInMs: 21_600_000 },
}

/** A small policy reads only the same public view as a player. It cannot inspect RNG or egg genetics. */
export function policyActions(policy: PolicyId, view: PlayerView, visit: number): GameCommand[] {
  const commands: GameCommand[] = []
  const assigned = new Set<string>()
  function worker(skill: ProductionSkill): string | undefined {
    const bud = view.buds.find((candidate) => !assigned.has(candidate.id)
      && !view.formation.includes(candidate.id)
      && view.breeding?.primaryId !== candidate.id && view.breeding?.secondaryId !== candidate.id
      && SPECIES[candidate.speciesId].aptitudes.includes(skill))
    if (bud) assigned.add(bud.id)
    return bud?.id
  }
  function start(order: ActivityOrder, workerId?: string) {
    const current = view.activities[workerId ?? 'tender']
    // Blocked work is deliberately retained. The game resumes it when requirements return.
    // A manual pause also remains deliberate; these policies never repair it behind the player's back.
    if (current?.status === 'paused') return
    if (current && current.status !== 'complete' && JSON.stringify(current.order) === JSON.stringify(order)) return
    commands.push({ type: 'startActivity', order, ...(workerId ? { workerId } : {}) })
  }
  const miner = worker('Mining')
  const crafter = worker('Crafting')
  if (miner) start({ kind: 'gather', nodeId: 'earth-scrap' }, miner)
  if (crafter) start({ kind: 'craft', recipeId: 'capture-kit', count: null }, crafter)
  if (policy === 'producer') {
    const woodcutter = worker('Woodcutting')
    if (woodcutter) start({ kind: 'gather', nodeId: 'earth-fiber' }, woodcutter)
  }
  const order: ActivityOrder = policy === 'battler' ? { kind: 'battle', zoneId: 'earth' }
    : policy === 'producer' ? { kind: 'gather', nodeId: 'earth-greens' }
      : policy === 'generalist' ? { kind: 'gather', nodeId: ['earth-fiber', 'earth-minnow', 'earth-greens'][visit % 3] }
        : { kind: 'gather', nodeId: 'earth-fiber' }
  start(order)
  return commands
}
