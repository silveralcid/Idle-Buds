import { assertGameCommand, RuleError } from '../src/game/index.ts'
import type { GameCommand } from '../src/game/types.ts'
import { ApiError, requireRule } from './errors.ts'
import type { WorldCommand } from './world-types.ts'

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const USERNAME = /^[a-z0-9_]{3,24}$/
export const CLAN_NAME = /^[a-z0-9 _-]{3,24}$/

const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
  && !Object.hasOwn(Object.prototype, value)
const uuid = (value: unknown) => typeof value === 'string' && UUID.test(value)
const text = (value: unknown, max: number) => typeof value === 'string' && value.length > 0 && value.length <= max
const amount = (value: unknown, max: number) => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max
const oneOf = (value: unknown, options: readonly string[]) => typeof value === 'string' && options.includes(value)

export function object(value: unknown, keys: readonly string[]) {
  requireRule(value && typeof value === 'object' && !Array.isArray(value), 'Expected a JSON object.', 400)
  const record = value as Record<string, unknown>
  requireRule(Object.keys(record).every((key) => keys.includes(key)), 'Unexpected request field.', 400)
  return record
}

function listingAsset(value: unknown) {
  const asset = object(value, ['kind', 'itemId', 'instanceId'])
  return asset.kind === 'item'
    ? id(asset.itemId) && asset.instanceId === undefined
    : oneOf(asset.kind, ['bud', 'gear']) && id(asset.instanceId) && asset.itemId === undefined
}

function validWorldCommand(type: string, value: unknown) {
  const shape = (keys: string[]) => object(value, ['type', ...keys])
  switch (type) {
    case 'market.list': {
      const c = shape(['asset', 'quantity', 'unitPrice'])
      return listingAsset(c.asset) && amount(c.quantity, 1000) && amount(c.unitPrice, 1_000_000)
    }
    case 'market.order': {
      const c = shape(['itemId', 'quantity', 'unitPrice'])
      return id(c.itemId) && amount(c.quantity, 1000) && amount(c.unitPrice, 1_000_000)
    }
    case 'market.fill': {
      const c = shape(['listingId', 'quantity'])
      return uuid(c.listingId) && amount(c.quantity, 1000)
    }
    case 'market.cancel':
      return uuid(shape(['listingId']).listingId)
    case 'store.buy':
    case 'store.sell': {
      const c = shape(['itemId', 'quantity'])
      return id(c.itemId) && amount(c.quantity, 1000)
    }
    case 'chat.send':
      return text(shape(['text']).text, 240)
    case 'chat.report': {
      const c = shape(['messageId', 'reason'])
      return uuid(c.messageId) && text(c.reason, 120)
    }
    case 'social.friend':
    case 'social.unfriend':
    case 'social.block':
    case 'social.unblock':
    case 'social.mute':
    case 'social.unmute':
      return text(shape(['username']).username, 24)
    case 'clan.create':
    case 'clan.join':
      return text(shape(['name']).name, 24)
    case 'clan.leave':
    case 'pvp.publish':
    case 'pvp.match':
      shape([])
      return true
    case 'clan.contribute':
      return amount(shape(['quantity']).quantity, 40)
    default:
      return false
  }
}

export function decodeCommand(body: unknown): { id: string; command: GameCommand | WorldCommand } {
  const envelope = object(body, ['id', 'command'])
  requireRule(typeof envelope.id === 'string' && UUID.test(envelope.id), 'Command ID must be a UUID.', 400)
  const candidate = envelope.command as { type?: unknown } | undefined
  const id = envelope.id.toLowerCase()
  if (typeof candidate?.type === 'string' && candidate.type.includes('.')) {
    requireRule(validWorldCommand(candidate.type, candidate), 'Invalid world command or arguments.', 400)
    return { id, command: candidate as WorldCommand }
  }
  try {
    assertGameCommand(candidate)
  } catch (error) {
    if (error instanceof RuleError) throw new ApiError(400, error.message)
    throw error
  }
  return { id, command: candidate }
}

export function isWorldCommand(command: GameCommand | WorldCommand): command is WorldCommand {
  return command.type.includes('.')
}
