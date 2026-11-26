import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import { ITEM_DEFINITIONS } from '../src/data/index.ts'
import { isBudCommitted, itemCapacity, MAX_BUDS, MAX_COINS, MAX_GEAR } from '../src/game/index.ts'
import type { Bud, GameState, Gear } from '../src/game/types.ts'
import { lockRawPlayer, reconcilePlayer, savePlayer } from './db.ts'
import { requireRule } from './errors.ts'
import type { MarketAsset, MarketListing, MarketSide, StoreLine, WorldCommand } from './world-types.ts'

interface ListingRow {
  id: string
  owner_id: string
  username?: string
  side: MarketSide
  asset_kind: 'item' | 'bud' | 'gear'
  item_id: string | null
  instance_id: string | null
  instance: Bud | Gear | null
  remaining: number
  unit_price: number
}

const MAX_LISTINGS = 20
const RESTOCK_INTERVAL_MS = 300_000

const STORE: StoreLine[] = [
  { itemId: 'scrap', quantity: 16, maxStock: 40, buyPrice: 6, sellPrice: 1 },
  { itemId: 'fiber', quantity: 16, maxStock: 40, buyPrice: 7, sellPrice: 1 },
  { itemId: 'minnow', quantity: 10, maxStock: 30, buyPrice: 8, sellPrice: 2 },
]

export const canTrade = (state: GameState) => state.stats.gathered >= 5 || state.stats.crafted > 0

export function takeItem(state: GameState, itemId: string, quantity: number) {
  requireRule(Object.hasOwn(ITEM_DEFINITIONS, itemId), 'Unknown item.', 400)
  const have = state.inventory[itemId] ?? 0
  requireRule(have >= quantity, 'You do not have enough of this item.')
  state.inventory[itemId] = have - quantity
}

function addItem(state: GameState, itemId: string, quantity: number) {
  const next = (state.inventory[itemId] ?? 0) + quantity
  requireRule(next <= itemCapacity(state), 'There is not enough storage space for this item.')
  state.inventory[itemId] = next
}

function takeCoins(state: GameState, coins: number) {
  requireRule(state.coins >= coins, 'You do not have enough credits.')
  state.coins -= coins
}

function addCoins(state: GameState, coins: number) {
  requireRule(state.coins + coins <= MAX_COINS, 'This payment would exceed the wallet limit.')
  state.coins += coins
}

function takeUnique(state: GameState, asset: Exclude<MarketAsset, { kind: 'item' }>) {
  if (asset.kind === 'bud') {
    const bud = state.buds.find((candidate) => candidate.id === asset.instanceId)
    requireRule(bud && !bud.protected && !isBudCommitted(state, bud.id), 'Choose an owned Bud without protection or an active assignment.')
    state.buds = state.buds.filter((candidate) => candidate.id !== bud.id)
    delete state.activities[bud.id]
    return bud
  }
  const gear = state.equipment.find((candidate) => candidate.id === asset.instanceId)
  requireRule(gear && !Object.values(state.loadout).includes(gear.id), 'Choose owned, unequipped gear.')
  state.equipment = state.equipment.filter((candidate) => candidate.id !== gear.id)
  return gear
}

function giveEscrow(state: GameState, listing: ListingRow, quantity: number) {
  if (listing.asset_kind === 'item' && listing.item_id) {
    addItem(state, listing.item_id, quantity)
  } else if (listing.asset_kind === 'bud' && listing.instance) {
    requireRule(state.buds.length < MAX_BUDS, 'Your Bud collection is full.')
    state.buds.push(listing.instance as Bud)
  } else if (listing.asset_kind === 'gear' && listing.instance) {
    requireRule(state.equipment.length < MAX_GEAR, 'Your equipment collection is full.')
    state.equipment.push(listing.instance as Gear)
  } else {
    throw new Error('Market escrow does not match the asset.')
  }
}

export async function marketView(db: PoolClient, playerId: string): Promise<MarketListing[]> {
  const { rows } = await db.query<ListingRow>(
    `SELECT m.*, a.username FROM market_listings m JOIN accounts a ON m.owner_id = a.id
      WHERE m.remaining > 0 AND a.banned_at IS NULL
      ORDER BY (m.owner_id = $1) DESC, m.created_at DESC, m.id
      LIMIT 100`, [playerId],
  )
  return rows.map((row) => ({
    id: row.id,
    owner: row.username!,
    side: row.side,
    asset: row.asset_kind === 'item'
      ? { kind: 'item', itemId: row.item_id! }
      : { kind: row.asset_kind, instanceId: row.instance_id! },
    remaining: row.remaining,
    unitPrice: row.unit_price,
    bud: row.asset_kind === 'bud' ? row.instance as Bud : undefined,
    gear: row.asset_kind === 'gear' ? row.instance as Gear : undefined,
  }))
}

export type MarketCommand = Extract<WorldCommand, { type: `market.${string}` }>

export async function marketCommand(
  db: PoolClient, playerId: string, state: GameState, command: MarketCommand, now: number,
): Promise<string> {
  if (command.type === 'market.list' || command.type === 'market.order') {
    requireRule(canTrade(state), 'Gather five items or finish a recipe to unlock the market.')
    const { rows: [count] } = await db.query<{ total: number }>(
      'SELECT count(*)::integer AS total FROM market_listings WHERE owner_id = $1 AND remaining > 0', [playerId],
    )
    requireRule(count.total < MAX_LISTINGS, 'You can have at most 20 open listings and orders.')
    const asset: MarketAsset = command.type === 'market.list' ? command.asset : { kind: 'item', itemId: command.itemId }
    const { quantity, unitPrice } = command
    let instance: Bud | Gear | null = null
    if (command.type === 'market.order') {
      requireRule(Object.hasOwn(ITEM_DEFINITIONS, command.itemId), 'Unknown item.', 400)
      takeCoins(state, quantity * unitPrice)
    } else if (asset.kind === 'item') {
      takeItem(state, asset.itemId, quantity)
    } else {
      requireRule(quantity === 1, 'List unique Buds and equipment one at a time.', 400)
      instance = takeUnique(state, asset)
    }

    await db.query(
      `INSERT INTO market_listings
        (id, owner_id, side, asset_kind, item_id, instance_id, instance, remaining, unit_price, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [randomUUID(), playerId, command.type === 'market.order' ? 'buy' : 'sell', asset.kind,
        asset.kind === 'item' ? asset.itemId : null, asset.kind === 'item' ? null : asset.instanceId,
        instance, quantity, unitPrice, new Date(now)],
    )
    return command.type === 'market.list' ? 'Listing posted. The goods are held until sale or cancellation.' : 'Buy order posted and fully funded.'
  }

  const { rows: [listing] } = await db.query<ListingRow>(
    `SELECT m.* FROM market_listings m JOIN accounts a ON a.id = m.owner_id
      WHERE m.id = $1 AND m.remaining > 0 AND a.banned_at IS NULL FOR UPDATE OF m FOR SHARE OF a`,
    [command.listingId],
  )
  requireRule(listing, 'This listing is no longer open.', 404)

  if (command.type === 'market.cancel') {
    requireRule(listing.owner_id === playerId, 'Only the listing owner can cancel it.', 403)
    if (listing.side === 'buy') addCoins(state, listing.remaining * listing.unit_price)
    else giveEscrow(state, listing, listing.remaining)
    await db.query('UPDATE market_listings SET remaining = 0 WHERE id = $1', [listing.id])
    return 'Listing cancelled. Remaining goods or credits were returned.'
  }

  requireRule(canTrade(state), 'Gather five items or finish a recipe to unlock the market.')
  requireRule(listing.owner_id !== playerId, 'You cannot fill your own listing.')
  requireRule(command.quantity <= listing.remaining, 'Fewer units are available now.')
  if (listing.asset_kind === 'bud') requireRule(state.stats.catches > 0, 'Catch your first wild Bud to buy Buds.')
  const counterpart = reconcilePlayer(await lockRawPlayer(db, listing.owner_id), now)
  const buying = listing.side === 'sell'
  const seller = buying ? counterpart.state : state
  const buyer = buying ? state : counterpart.state
  const sellerId = buying ? listing.owner_id : playerId
  const { rows: [discount] } = await db.query(
    `SELECT 1 FROM clan_members cm JOIN clans c ON c.id = cm.clan_id
      WHERE cm.account_id = $1 AND c.contributions = 40`, [sellerId],
  )
  const gross = command.quantity * listing.unit_price
  const tax = Math.min(gross - 1, Math.ceil(gross * (discount ? 3 : 5) / 100))
  if (buying) takeCoins(buyer, gross)
  else {
    requireRule(listing.item_id, 'This buy order has no resource.')
    takeItem(seller, listing.item_id, command.quantity)
  }
  giveEscrow(buyer, listing, command.quantity)
  addCoins(seller, gross - tax)
  await savePlayer(db, listing.owner_id, counterpart.state, counterpart.foregroundAt, counterpart.summary)
  await db.query('UPDATE market_listings SET remaining = remaining - $2 WHERE id = $1', [listing.id, command.quantity])
  await db.query(
    `INSERT INTO market_fills (id, listing_id, taker_id, quantity, gross, tax, filled_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [randomUUID(), listing.id, playerId, command.quantity, gross, tax, new Date(now)],
  )
  return `Trade settled for ${gross} credits, including ${tax} credits in tax.`
}

interface StockRow {
  item_id: string
  quantity: number
  restocked_at: Date
}

function restocked(stock: StoreLine, stored: StockRow | undefined, now: number) {
  if (!stored) return { quantity: stock.quantity, at: now }
  const last = stored.restocked_at.getTime()
  const intervals = Math.max(0, Math.floor((now - last) / RESTOCK_INTERVAL_MS))
  return {
    quantity: stored.quantity + Math.min(intervals, Math.max(0, stock.quantity - stored.quantity)),
    at: last + intervals * RESTOCK_INTERVAL_MS,
  }
}

export async function storeView(db: PoolClient, now: number): Promise<StoreLine[]> {
  const { rows } = await db.query<StockRow>('SELECT item_id, quantity, restocked_at FROM store_stock')
  return STORE.map((line) => ({ ...line, quantity: restocked(line, rows.find((row) => row.item_id === line.itemId), now).quantity }))
}

export async function storeCommand(
  db: PoolClient, state: GameState, command: Extract<WorldCommand, { type: 'store.buy' | 'store.sell' }>, now: number,
): Promise<string> {
  const stock = STORE.find((line) => line.itemId === command.itemId)
  requireRule(stock, 'The general store does not carry that item.', 404)
  const { rows: [stored] } = await db.query<StockRow>(
    'SELECT item_id, quantity, restocked_at FROM store_stock WHERE item_id = $1 FOR UPDATE', [stock.itemId],
  )
  const current = restocked(stock, stored, now)
  const buying = command.type === 'store.buy'
  if (buying) {
    requireRule(current.quantity >= command.quantity, 'The store has fewer units in stock.')
    takeCoins(state, stock.buyPrice * command.quantity)
    state.stats.coinsSpent += stock.buyPrice * command.quantity
    addItem(state, stock.itemId, command.quantity)
  } else {
    requireRule(current.quantity + command.quantity <= stock.maxStock, 'The store has reached its buyback stock limit.')
    takeItem(state, stock.itemId, command.quantity)
    addCoins(state, stock.sellPrice * command.quantity)
    state.stats.coinsEarned += stock.sellPrice * command.quantity
  }
  await db.query(
    `INSERT INTO store_stock (item_id, quantity, restocked_at) VALUES ($1,$2,$3)
      ON CONFLICT (item_id) DO UPDATE SET quantity = EXCLUDED.quantity, restocked_at = EXCLUDED.restocked_at`,
    [stock.itemId, current.quantity + (buying ? -command.quantity : command.quantity), new Date(current.at)],
  )
  return buying ? 'General store purchase complete.' : 'Goods sold to the general store.'
}
