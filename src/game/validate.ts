import { AFFINITIES, CAPTURE_ITEMS, FOOD_DURATION, NODES, RECIPES, SPECIES, UPGRADES, ZONES } from '../data/catalog.ts'
import { MAX_CAPTURE_RULES, MAX_ORDER_COUNT, requireRule } from './limits.ts'
import type { GameCommand } from './types.ts'

const TECHNIQUES = ['Guard', 'Strike', 'Mend']
const RARITIES = ['Common', 'Uncommon', 'Rare']

function record(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function keys(value: Record<string, unknown>, names: readonly string[]): boolean {
  return Reflect.ownKeys(value).every((key) => typeof key === 'string' && names.includes(key))
}

function id(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
}

function definedId(definitions: object, value: unknown): boolean {
  return id(value) && Object.hasOwn(definitions, value)
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean'
}

function order(value: unknown): boolean {
  if (!record(value)) return false
  const { count } = value
  if (count !== undefined && !(typeof count === 'number' && Number.isSafeInteger(count) && count >= 1 && count <= MAX_ORDER_COUNT)) return false
  switch (value.kind) {
    case 'gather': return keys(value, ['kind', 'count', 'nodeId']) && definedId(NODES, value.nodeId)
    case 'craft':
      return keys(value, ['kind', 'count', 'recipeId', 'markMaker']) && definedId(RECIPES, value.recipeId) && optionalBoolean(value.markMaker)
    case 'battle': return keys(value, ['kind', 'count', 'zoneId']) && definedId(ZONES, value.zoneId)
    default: return false
  }
}

function captureFilter(value: unknown): boolean {
  if (!record(value) || !keys(value, ['condition', 'itemId', 'value'])) return false
  if (value.itemId !== 'skip' && !definedId(CAPTURE_ITEMS, value.itemId)) return false
  switch (value.condition) {
    case 'new':
    case 'any': return value.value === undefined
    case 'rarity': return RARITIES.some((rarity) => rarity === value.value)
    case 'affinity': return AFFINITIES.some((affinity) => affinity === value.value)
    case 'species': return definedId(SPECIES, value.value)
    default: return false
  }
}

function arrayOf(value: unknown, limit: number, validate: (entry: unknown) => boolean): boolean {
  return Array.isArray(value) && value.length <= limit && Array.from(value).every(validate)
}

function command(value: Record<string, unknown>): boolean {
  const matches = (...fields: string[]) => keys(value, ['type', ...fields])
  const worker = value.workerId === undefined || id(value.workerId)
  switch (value.type) {
    case 'startActivity':
    case 'queueActivity': return matches('order', 'workerId') && worker && order(value.order)
    case 'pauseActivity':
    case 'resumeActivity':
    case 'stopActivity': return matches('workerId') && worker
    case 'travel':
    case 'unlockZone': return matches('zoneId') && definedId(ZONES, value.zoneId)
    case 'buyUpgrade': return matches('upgrade') && definedId(UPGRADES, value.upgrade)
    case 'setFormation': return matches('budIds') && arrayOf(value.budIds, 5, id)
    case 'equip':
      return matches('slot', 'gearId') && (value.slot === 'weapon' || value.slot === 'armor') && (value.gearId === null || id(value.gearId))
    case 'setCaptureFilters': return matches('filters') && arrayOf(value.filters, MAX_CAPTURE_RULES, captureFilter)
    case 'protectBud': return matches('budId', 'protected') && id(value.budId) && typeof value.protected === 'boolean'
    case 'releaseBud': return matches('budId', 'confirm') && id(value.budId) && value.confirm === true
    case 'condenseBud': return matches('budId', 'donorId', 'confirm') && id(value.budId) && id(value.donorId) && value.confirm === true
    case 'teachBud':
      return matches('budId', 'technique') && id(value.budId) && TECHNIQUES.some((technique) => technique === value.technique)
    case 'breed': return matches('primaryId', 'secondaryId', 'enhanced') && id(value.primaryId) && id(value.secondaryId) && optionalBoolean(value.enhanced)
    case 'hatch': return matches('eggId') && id(value.eggId)
    case 'eat': return matches('itemId') && definedId(FOOD_DURATION, value.itemId)
    default: return false
  }
}

export function assertGameCommand(value: unknown): asserts value is GameCommand {
  requireRule(record(value) && command(value), 'Invalid game command.')
}
