import type { Pool, PoolClient } from 'pg'
import { advance, OFFLINE_CAP_MS, refreshActivities } from '../src/game/index.ts'
import type { AdvanceSummary, GameState } from '../src/game/types.ts'
import { requireRule } from './errors.ts'

interface PlayerRow {
  state: GameState
  foreground_at: string | null
  pending_summary: AdvanceSummary | null
}

export async function transaction<T>(pool: Pool, run: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await pool.connect()
  let discard = false
  try {
    await db.query('BEGIN')
    const result = await run(db)
    await db.query('COMMIT')
    return result
  } catch (error) {
    try {
      await db.query('ROLLBACK')
    } catch {
      discard = true
    }
    throw error
  } finally {
    db.release(discard)
  }
}

export async function lockRawPlayer(db: PoolClient, playerId: string): Promise<PlayerRow> {
  const { rows: [row] } = await db.query<PlayerRow>(
    'SELECT state, foreground_at, pending_summary FROM players WHERE account_id = $1 FOR UPDATE', [playerId],
  )
  requireRule(row, 'This player is unavailable.', 404)
  // Reserve escrow slots, including listings posted by older save versions.
  const { rows: reservations } = await db.query<{ id: string; asset_kind: 'item' | 'gear' | 'bud'; item_id: string | null }>(
    `SELECT id, asset_kind, item_id FROM market_listings
      WHERE owner_id = $1 AND side = 'sell' AND remaining > 0`, [playerId],
  )
  row.state.storageReservations = Object.fromEntries(reservations.map((entry) => [entry.id,
    entry.asset_kind === 'item' ? { kind: 'item' as const, itemId: entry.item_id! } : { kind: entry.asset_kind },
  ]))
  return row
}

function addDeltas(previous: Record<string, number | undefined>, next: Record<string, number | undefined>) {
  const result: Record<string, number> = {}
  for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
    const total = (previous[key] ?? 0) + (next[key] ?? 0)
    if (total !== 0) result[key] = total
  }
  return result
}

function mergeSummary(previous: AdvanceSummary | null, next: AdvanceSummary): AdvanceSummary {
  if (!previous) return next
  const stopped = [...new Map(
    [...previous.stopped, ...next.stopped].map((entry) => [entry.workerId, entry]),
  ).values()]
  return {
    from: previous.from,
    to: next.to,
    simulatedMs: previous.simulatedMs + next.simulatedMs,
    discardedMs: previous.discardedMs + next.discardedMs,
    cycles: previous.cycles + next.cycles,
    items: addDeltas(previous.items, next.items),
    xp: addDeltas(previous.xp, next.xp),
    budXp: addDeltas(previous.budXp, next.budXp),
    coins: previous.coins + next.coins,
    catches: previous.catches + next.catches,
    eggs: previous.eggs + next.eggs,
    stopped,
  }
}

export function reconcilePlayer(row: PlayerRow, now: number) {
  const foregroundAt = row.foreground_at === null ? row.state.lastAt : Number(row.foreground_at)
  // A remote market settlement can reconcile an absent player, but only their own
  // foreground request opens a new offline catch-up window or delivers its summary.
  const budget = OFFLINE_CAP_MS - Math.min(OFFLINE_CAP_MS, row.state.lastAt - foregroundAt)
  const { state, summary } = advance(row.state, Math.max(now, row.state.lastAt), budget)
  return { state, summary: mergeSummary(row.pending_summary, summary), foregroundAt }
}

export async function savePlayer(
  db: PoolClient, playerId: string, state: GameState, foregroundAt: number, pendingSummary: AdvanceSummary | null = null,
) {
  refreshActivities(state, state.lastAt)
  await db.query(
    'UPDATE players SET state = $2, foreground_at = $3, pending_summary = $4 WHERE account_id = $1',
    [playerId, state, foregroundAt, pendingSummary],
  )
}
