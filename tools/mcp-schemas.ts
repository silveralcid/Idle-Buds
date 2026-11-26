import { z } from 'zod'
import { AFFINITIES, CAPTURE_ITEMS, FOOD_DURATION, NODES, RECIPES, SPECIES, UPGRADES, ZONES } from '../src/data/catalog.ts'
import { MAX_CAPTURE_RULES, MAX_ORDER_COUNT } from '../src/game/limits.ts'

const identifier = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/)
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
const defined = (catalog: object) => z.enum(Object.keys(catalog) as [string, ...string[]])
const amount = (maximum: number) => z.number().int().min(1).max(maximum)
const count = amount(MAX_ORDER_COUNT).optional()
const workerId = identifier.optional()
const order = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('gather'), nodeId: defined(NODES), count }),
  z.strictObject({ kind: z.literal('craft'), recipeId: defined(RECIPES), count: amount(MAX_ORDER_COUNT).nullable().optional(), markMaker: z.boolean().optional() }),
  z.strictObject({ kind: z.literal('battle'), zoneId: defined(ZONES), count }),
])
const captureItem = z.enum(['skip', ...Object.keys(CAPTURE_ITEMS)])
const filter = z.discriminatedUnion('condition', [
  z.strictObject({ condition: z.enum(['new', 'any']), itemId: captureItem }),
  z.strictObject({ condition: z.literal('rarity'), itemId: captureItem, value: z.enum(['Common', 'Uncommon', 'Rare']) }),
  z.strictObject({ condition: z.literal('affinity'), itemId: captureItem, value: z.enum(AFFINITIES) }),
  z.strictObject({ condition: z.literal('species'), itemId: captureItem, value: defined(SPECIES) }),
])
const asset = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('item'), itemId: identifier }),
  z.strictObject({ kind: z.enum(['bud', 'gear']), instanceId: identifier }),
])

/** Descriptive protocol schema; the existing decodeCommand remains the authoritative validator. */
export const commandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.enum(['startActivity', 'queueActivity']), order, workerId }),
  z.strictObject({ type: z.enum(['pauseActivity', 'resumeActivity', 'stopActivity']), workerId }),
  z.strictObject({ type: z.enum(['travel', 'unlockZone']), zoneId: defined(ZONES) }),
  z.strictObject({ type: z.literal('buyUpgrade'), upgrade: defined(UPGRADES) }),
  z.strictObject({ type: z.literal('setFormation'), budIds: z.array(identifier).max(5) }),
  z.strictObject({ type: z.literal('equip'), slot: z.enum(['weapon', 'armor']), gearId: identifier.nullable() }),
  z.strictObject({ type: z.literal('setCaptureFilters'), filters: z.array(filter).max(MAX_CAPTURE_RULES) }),
  z.strictObject({ type: z.literal('protectBud'), budId: identifier, protected: z.boolean() }),
  z.strictObject({ type: z.literal('releaseBud'), budId: identifier, confirm: z.literal(true) }),
  z.strictObject({ type: z.literal('condenseBud'), budId: identifier, donorId: identifier, confirm: z.literal(true) }),
  z.strictObject({ type: z.literal('teachBud'), budId: identifier, technique: z.enum(['Guard', 'Strike', 'Mend']) }),
  z.strictObject({ type: z.literal('breed'), primaryId: identifier, secondaryId: identifier, enhanced: z.boolean().optional() }),
  z.strictObject({ type: z.literal('hatch'), eggId: identifier }),
  z.strictObject({ type: z.literal('eat'), itemId: defined(FOOD_DURATION) }),
  z.strictObject({ type: z.literal('market.list'), asset, quantity: amount(1000), unitPrice: amount(1_000_000) }),
  z.strictObject({ type: z.literal('market.order'), itemId: identifier, quantity: amount(1000), unitPrice: amount(1_000_000) }),
  z.strictObject({ type: z.literal('market.fill'), listingId: uuid, quantity: amount(1000) }),
  z.strictObject({ type: z.literal('market.cancel'), listingId: uuid }),
  z.strictObject({ type: z.enum(['store.buy', 'store.sell']), itemId: identifier, quantity: amount(1000) }),
  z.strictObject({ type: z.literal('chat.send'), text: z.string().min(1).max(240) }),
  z.strictObject({ type: z.literal('chat.report'), messageId: uuid, reason: z.string().min(1).max(120) }),
  z.strictObject({ type: z.enum(['social.friend', 'social.unfriend', 'social.block', 'social.unblock', 'social.mute', 'social.unmute']), username: z.string().min(1).max(24) }),
  z.strictObject({ type: z.enum(['clan.create', 'clan.join']), name: z.string().min(1).max(24) }),
  z.strictObject({ type: z.enum(['clan.leave', 'pvp.publish', 'pvp.match']) }),
  z.strictObject({ type: z.literal('clan.contribute'), quantity: amount(40) }),
])

export const playerObserveSchema = z.strictObject({ sections: z.array(z.enum(['player', 'world'])).min(1).max(2).optional() })
export const playerActSchema = z.strictObject({ commandId: uuid.describe('Game command UUID. Preserve this UUID and exact payload for retries; it is independent of the MCP request ID.'), command: commandSchema })
export const runSchema = z.strictObject({
  scenarioId: identifier, seedSetId: identifier.optional(), variant: identifier.optional(),
  limits: z.strictObject({ maxActions: amount(100_000).optional(), maxEvents: amount(1_000_000).optional(),
    maxSimulatedMs: amount(31 * 86_400_000).optional(), maxWallMs: amount(120_000).optional() }).optional(),
})
export const reportSchema = z.strictObject({ runId: identifier, section: z.enum(['summary', 'metrics', 'failures', 'manifest']).optional() })
export const replaySchema = z.strictObject({ runId: identifier })
export const toolOutputSchema = z.strictObject({ outcome: z.string(), data: z.record(z.string(), z.unknown()) })
