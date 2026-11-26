import type { PoolClient } from 'pg'
import type { GameState } from '../src/game/types.ts'
import { requireRule } from './errors.ts'
import { canTrade, marketCommand, marketView, storeCommand, storeView } from './market.ts'
import { canRank, pvpCommand, pvpView } from './pvp.ts'
import { clanCommand, clanView, socialCommand, socialView } from './social.ts'
import type { WorldCommand, WorldView } from './world-types.ts'

export async function lockWorld(db: PoolClient) {
  // Global mutations can touch multiple players. Acquire this lock before any player row.
  await db.query('SELECT pg_advisory_xact_lock(4108, 1)')
}

export async function applyWorldCommand(
  db: PoolClient, playerId: string, state: GameState, command: WorldCommand, now: number,
): Promise<string> {
  switch (command.type) {
    case 'market.list':
    case 'market.order':
    case 'market.fill':
    case 'market.cancel':
      return marketCommand(db, playerId, state, command, now)
    case 'store.buy':
    case 'store.sell':
      return storeCommand(db, state, command, now)
    case 'chat.send':
    case 'chat.report':
    case 'social.friend':
    case 'social.unfriend':
    case 'social.block':
    case 'social.unblock':
    case 'social.mute':
    case 'social.unmute':
      return socialCommand(db, playerId, state, command, now)
    case 'clan.create':
    case 'clan.join':
    case 'clan.leave':
    case 'clan.contribute':
      return clanCommand(db, playerId, state, command, now)
    case 'pvp.publish':
    case 'pvp.match':
      return pvpCommand(db, playerId, state, command, now)
  }
}

export async function worldView(db: PoolClient, playerId: string, now: number): Promise<WorldView> {
  const { rows: [player] } = await db.query<{ state: GameState }>('SELECT state FROM players WHERE account_id = $1', [playerId])
  requireRule(player, 'This player is unavailable.', 404)
  const state = player.state
  return {
    tradingUnlocked: canTrade(state),
    budTradeUnlocked: state.stats.catches > 0,
    communityUnlocked: canTrade(state),
    rankedUnlocked: canRank(state),
    listings: await marketView(db, playerId),
    store: await storeView(db, now),
    ...await socialView(db, playerId),
    ...await clanView(db, playerId),
    ranked: await pvpView(db, playerId),
  }
}
