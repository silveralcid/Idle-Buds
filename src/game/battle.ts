import { GEAR_DEFINITIONS, SPECIES } from '../data/catalog.ts'
import { requireRule, RULES_VERSION } from './limits.ts'
import { budLevelForXp, levelForXp } from './progression.ts'
import { sourceFor } from './random.ts'
import type { BattleEvent, BattleResult, BattleTeam, BattleUnit, Bud, CombatSkill, Gear, PlayerView } from './types.ts'

export const MAX_BATTLE_ROUNDS = 30
const MAX_UNIT_STAT = 100

export function getLoadout(state: PlayerView): { weapon?: Gear; armor?: Gear; discipline: CombatSkill; support: boolean } {
  const weapon = state.equipment.find((gear) => gear.id === state.loadout.weapon)
  const armor = state.equipment.find((gear) => gear.id === state.loadout.armor)
  const discipline = weapon ? GEAR_DEFINITIONS[weapon.definitionId].skill ?? 'Melee' : 'Melee'
  const support = armor !== undefined && GEAR_DEFINITIONS[armor.definitionId].skill === 'Resonance'
  return { weapon, armor, discipline, support }
}

export function budCombatStats(bud: Bud): BattleUnit {
  const definition = SPECIES[bud.speciesId]
  const level = budLevelForXp(bud.xp)
  return {
    id: bud.id,
    name: definition.name,
    affinity: definition.affinity,
    attack: definition.attack + Math.floor(bud.ivs.attack / 5) + Math.floor(level / 10) + Number(bud.trait === 'Keen'),
    health: definition.health + Math.floor(bud.ivs.health / 3) + Math.floor(level / 5) + 2 * Number(bud.trait === 'Stalwart'),
    ability: definition.ability,
    technique: bud.technique,
  }
}

export function buildFormation(state: PlayerView): BattleTeam {
  const { weapon, armor, discipline, support } = getLoadout(state)
  return {
    buds: state.formation.map((id) => {
      const bud = state.buds.find((entry) => entry.id === id)
      requireRule(bud, 'A formation member is missing.')
      return budCombatStats(bud)
    }),
    commander: {
      id: 'tender',
      name: state.name,
      attack: 4 + (weapon?.bonus ?? 0) + Math.floor(levelForXp(state.xp[discipline]) / 4),
      health: 16 + (armor?.bonus ?? 0) + Math.floor(levelForXp(state.xp.Vitality) / 2),
      ability: armor?.technique ?? (support ? 'Mend' : undefined),
      technique: weapon?.technique,
    },
  }
}

interface Fighter extends BattleUnit {
  hp: number
  shield: number
  entered: boolean
  strike: number
  mend: number
}

export function resolveBattle(
  left: BattleTeam, right: BattleTeam, seed: string, options: { effects?: boolean } = {},
): BattleResult {
  const random = sourceFor(seed, 'battle', RULES_VERSION)
  const events: BattleEvent[] = []
  const effects = options.effects !== false
  function fighters(team: BattleTeam, side: string): Fighter[] {
    const units = [...team.buds, team.commander]
    requireRule(team.buds.length <= 5 && new Set(units.map((unit) => unit.id)).size === units.length, 'Invalid battle formation.')
    return units.map((unit) => {
      requireRule(
        Number.isSafeInteger(unit.attack) && unit.attack >= 0 && unit.attack <= MAX_UNIT_STAT
        && Number.isSafeInteger(unit.health) && unit.health >= 1 && unit.health <= MAX_UNIT_STAT,
        'Invalid battle stats.',
      )
      const tags = effects ? [unit.ability, unit.technique] : []
      return {
        ...unit, id: `${side}:${unit.id}`, hp: unit.health, entered: false,
        shield: tags.filter((tag) => tag === 'Guard').length,
        strike: tags.filter((tag) => tag === 'Strike').length,
        mend: tags.filter((tag) => tag === 'Mend').length,
      }
    })
  }

  const teams = [fighters(left, 'left'), fighters(right, 'right')]
  const commanders = teams.map((team) => team[team.length - 1])
  let rounds = 0
  for (let round = 1; round <= MAX_BATTLE_ROUNDS; round += 1) {
    if (!teams[0].length || !teams[1].length) break
    rounds = round
    const actors = [teams[0][0], teams[1][0]]
    for (const actor of actors) {
      if (actor.entered) continue
      actor.entered = true
      events.push({ type: 'enter', round, actor: actor.id, text: `${actor.name} enters the frontline.` })
      if (actor.shield) events.push({ type: 'ability', round, actor: actor.id, amount: actor.shield, text: `${actor.name} braces for the first hit.` })
    }

    // Both frontliners attack using their pre-hit stats, including on a shared defeat.
    const first = random.quick() < 0.5 ? 0 : 1
    for (const index of [first, 1 - first]) {
      const actor = actors[index]
      const target = actors[1 - index]
      const damage = Math.max(0, actor.attack + actor.strike - target.shield)
      if (actor.strike) events.push({ type: 'ability', round, actor: actor.id, amount: actor.strike, text: `${actor.name} uses Strike.` })
      actor.strike = 0
      target.shield = 0
      target.hp -= damage
      events.push({ type: 'hit', round, actor: actor.id, target: target.id, amount: damage, text: `${actor.name} deals ${damage} damage to ${target.name}.` })
    }

    for (const index of [first, 1 - first]) {
      const actor = actors[index]
      if (actor.hp <= 0) {
        teams[index].shift()
        events.push({ type: 'defeat', round, actor: actor.id, text: `${actor.name} is defeated.` })
        continue
      }

      const commander = commanders[index]
      const healer = actor.mend > 0 ? actor : commander
      const sameAffinity = actor.affinity !== undefined && teams[index][1]?.affinity === actor.affinity
      const healing = Math.min(actor.health - actor.hp, healer.mend * (sameAffinity ? 3 : 2))
      if (healing > 0) {
        actor.hp += healing
        healer.mend = 0
        events.push({ type: 'ability', round, actor: healer.id, target: actor.id, amount: healing, text: `${healer.name} restores ${healing} health to ${actor.name}.` })
      }
    }
  }

  const remaining = teams.map((team) => team.reduce((total, unit) => total + unit.hp, 0))
  const winner = remaining[0] === remaining[1] || (remaining[0] > 0 && remaining[1] > 0)
    ? 'draw' : remaining[0] > remaining[1] ? 'left' : 'right'
  events.push({ type: 'end', round: rounds, text: winner === 'draw' ? 'The battle is a draw.' : `${winner === 'left' ? 'Left' : 'Right'} team wins.` })
  return { version: RULES_VERSION, winner, rounds, events }
}
