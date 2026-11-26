import { FOOD_DURATION, GEAR_DEFINITIONS, SPECIES, UPGRADES, ZONES } from '../data/catalog.ts'
import { getBud, pauseActivity, queueActivity, resumeActivity, startActivity, stopActivity, travel } from './activities.ts'
import { activityAssigned, hatchEgg, isBudCommitted, startBreeding } from './breeding.ts'
import { LEARN_MIN_LEVEL, requireRule, TENDER_ID } from './limits.ts'
import { budLevelForXp, canReceiveGear, hasItems, levelForXp, spendCoins, takeItems, unlockEligibleZones } from './progression.ts'
import type { GameCommand, GameState, ZoneId } from './types.ts'

export function unlockZone(state: GameState, zoneId: ZoneId): void {
  unlockEligibleZones(state)
  requireRule(state.unlockedZones.includes(zoneId), 'Meet this portal’s combat or production requirement first.')
}

function ensureBattleIdle(state: GameState): void {
  const activity = state.activities[TENDER_ID]
  requireRule(activity?.order.kind !== 'battle' || !activityAssigned(activity), 'Stop the current battle order before changing your formation or gear.')
}

export function executeCommand(state: GameState, command: GameCommand, now: number): string {
  switch (command.type) {
    case 'startActivity': return startActivity(state, command.workerId ?? TENDER_ID, command.order, now)
    case 'queueActivity': return queueActivity(state, command.workerId ?? TENDER_ID, command.order)
    case 'pauseActivity': return pauseActivity(state, command.workerId ?? TENDER_ID, now)
    case 'resumeActivity': return resumeActivity(state, command.workerId ?? TENDER_ID, now)
    case 'stopActivity': return stopActivity(state, command.workerId ?? TENDER_ID)
    case 'travel':
      travel(state, command.zoneId)
      return `Traveled to ${ZONES[command.zoneId].name}.`
    case 'unlockZone':
      unlockZone(state, command.zoneId)
      return `${ZONES[command.zoneId].name} unlocked.`
    case 'buyUpgrade': {
      requireRule(command.upgrade !== 'remote', 'Remote access is automatic. No relay is needed.')
      const upgrade = UPGRADES[command.upgrade]
      const current = state.upgrades[command.upgrade]
      requireRule(current < upgrade.maxLevel, 'This upgrade is at its limit.')
      requireRule(command.upgrade !== 'worker' || state.stats.catches > 0, 'Earn your first capture to unlock Bud work.')
      requireRule(levelForXp(state.xp[upgrade.skill]) >= upgrade.level + current, `Requires ${upgrade.skill} level ${upgrade.level + current}.`)
      const multiplier = current + 1
      const items = Object.fromEntries(Object.entries(upgrade.items).map(([id, quantity]) => [id, quantity * multiplier]))
      requireRule(hasItems(state, items), 'Missing required upgrade materials.')
      spendCoins(state, upgrade.coins * multiplier)
      takeItems(state, items)
      state.upgrades[command.upgrade] += 1
      return `${upgrade.name} upgraded.`
    }
    case 'setFormation': {
      ensureBattleIdle(state)
      requireRule(new Set(command.budIds).size === command.budIds.length, 'Formation Buds must be unique.')
      for (const id of command.budIds) {
        const bud = getBud(state, id)
        requireRule(state.formation.includes(bud.id) || !isBudCommitted(state, bud.id), 'A selected Bud is committed to work or breeding.')
      }
      state.formation = command.budIds
      return 'Formation saved.'
    }
    case 'equip': {
      ensureBattleIdle(state)
      if (command.gearId === null) {
        requireRule(!state.loadout[command.slot] || canReceiveGear(state), 'Free an inventory slot before unequipping.')
        delete state.loadout[command.slot]
        return 'Gear unequipped.'
      }
      const gear = state.equipment.find((entry) => entry.id === command.gearId && entry.slot === command.slot)
      requireRule(gear, 'This gear is unavailable for the selected slot.')
      const definition = GEAR_DEFINITIONS[gear.definitionId]
      const skill = definition.skill ?? 'Vitality'
      requireRule(levelForXp(state.xp[skill]) >= definition.level, `Requires ${skill} level ${definition.level}.`)
      state.loadout[command.slot] = gear.id
      return 'Gear equipped.'
    }
    case 'setCaptureFilters':
      state.captureFilters = command.filters
      return 'Capture filters saved in priority order.'
    case 'protectBud':
      getBud(state, command.budId).protected = command.protected
      return command.protected ? 'Bud protected.' : 'Bud protection removed.'
    case 'releaseBud': {
      const bud = getBud(state, command.budId)
      requireRule(!bud.protected && !isBudCommitted(state, bud.id), 'Unprotect this Bud and remove it from activities before release.')
      state.buds = state.buds.filter((entry) => entry.id !== bud.id)
      delete state.activities[bud.id]
      return 'Bud released.'
    }
    case 'condenseBud': {
      const bud = getBud(state, command.budId)
      const donor = getBud(state, command.donorId)
      requireRule(bud.id !== donor.id && bud.speciesId === donor.speciesId, 'Choose a different donor of the same species.')
      requireRule(!donor.protected && !isBudCommitted(state, donor.id) && !isBudCommitted(state, bud.id), 'Both Buds must be unassigned and the donor unprotected.')
      requireRule(bud.bond < 3, 'This Bud has reached its bond limit.')
      state.buds = state.buds.filter((entry) => entry.id !== donor.id)
      delete state.activities[donor.id]
      bud.bond += 1
      return 'Donor consumed. The recipient’s work efficiency improved.'
    }
    case 'teachBud': {
      ensureBattleIdle(state)
      const bud = getBud(state, command.budId)
      requireRule(
        budLevelForXp(bud.xp) >= LEARN_MIN_LEVEL && levelForXp(state.xp.Vitality) >= LEARN_MIN_LEVEL,
        `Requires a level ${LEARN_MIN_LEVEL} Bud and Vitality level ${LEARN_MIN_LEVEL}.`,
      )
      requireRule(SPECIES[bud.speciesId].techniques.includes(command.technique), 'This species cannot learn that technique.')
      requireRule(!isBudCommitted(state, bud.id) || state.formation.includes(bud.id), 'This Bud is currently working or breeding.')
      bud.technique = command.technique
      return `${command.technique} learned and equipped.`
    }
    case 'breed':
      startBreeding(state, command.primaryId, command.secondaryId, command.enhanced === true, now)
      return 'Breeding started.'
    case 'hatch':
      hatchEgg(state, command.eggId, now)
      return 'Egg hatched.'
    case 'eat':
      requireRule(state.foodUntil <= now, 'A food bonus is already active.')
      takeItems(state, { [command.itemId]: 1 })
      state.foodUntil = now + FOOD_DURATION[command.itemId]
      return 'Gathering food bonus activated.'
  }
}
