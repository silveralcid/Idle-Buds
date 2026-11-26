import { randomBytes, randomInt, randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import { buildFormation, resolveBattle, RULES_VERSION } from '../src/game/index.ts'
import type { BattleResult, BattleTeam, GameState } from '../src/game/types.ts'
import { requireRule } from './errors.ts'
import type { WorldCommand, WorldView } from './world-types.ts'

export const canRank = (state: GameState) => state.stats.catches > 0 && state.stats.wins >= 3

const RATING_BAND = 200
const MIN_RATING = 100
const MAX_RATING = 3000
const MATCH_INTERVAL_MS = 30_000
const OPPONENT_INTERVAL_MS = 300_000
const WIN_BADGE = 'Portal Vanguard'
const BADGE_WINS = 3

interface RatedPlayer {
  rating: number
  ranked_wins: number
}

function teamStrength(team: BattleTeam) {
  return [...team.buds, team.commander].reduce((total, unit) => total + unit.attack * 2 + unit.health, 0)
}

function eloChange(attacker: number, defender: number, winner: BattleResult['winner']) {
  const expected = 1 / (1 + 10 ** ((defender - attacker) / 400))
  const actual = winner === 'left' ? 1 : winner === 'draw' ? 0.5 : 0
  const change = Math.round(32 * (actual - expected))
  const maxGain = Math.min(MAX_RATING - attacker, defender - MIN_RATING)
  const maxLoss = Math.min(attacker - MIN_RATING, MAX_RATING - defender)
  return Math.min(maxGain, Math.max(-maxLoss, change))
}

export async function pvpCommand(
  db: PoolClient, playerId: string, state: GameState,
  command: Extract<WorldCommand, { type: 'pvp.publish' | 'pvp.match' }>, now: number,
): Promise<string> {
  requireRule(canRank(state), 'Catch a wild Bud and win three encounters to unlock ranked play.')
  const team = buildFormation(state)
  requireRule(team.buds.length > 0, 'Add at least one Bud to your formation for ranked play.')
  const strength = teamStrength(team)
  const progression = state.unlockedZones.length
  if (command.type === 'pvp.publish') {
    await db.query(
      `INSERT INTO pvp_defenses (account_id, team, rules_version, progression, strength, published_at)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (account_id) DO UPDATE SET
        team = EXCLUDED.team, rules_version = EXCLUDED.rules_version, progression = EXCLUDED.progression,
        strength = EXCLUDED.strength, published_at = EXCLUDED.published_at`,
      [playerId, team, RULES_VERSION, progression, strength, new Date(now)],
    )
    return 'Defense snapshot published.'
  }

  const { rows: [recent] } = await db.query(
    'SELECT 1 FROM pvp_matches WHERE attacker_id = $1 AND played_at > $2 LIMIT 1',
    [playerId, new Date(now - MATCH_INTERVAL_MS)],
  )
  requireRule(!recent, 'Wait 30 seconds between ranked challenges.', 429)
  const { rows: [rank] } = await db.query<RatedPlayer>('SELECT rating, ranked_wins FROM players WHERE account_id = $1', [playerId])
  const { rows: candidates } = await db.query<RatedPlayer & { id: string; username: string; team: BattleTeam }>(
    `SELECT d.account_id AS id, d.team, a.username, p.rating, p.ranked_wins
      FROM pvp_defenses d JOIN players p ON p.account_id = d.account_id JOIN accounts a ON a.id = d.account_id
      WHERE d.account_id <> $1 AND a.banned_at IS NULL AND d.rules_version = $2 AND d.progression = $3
        AND d.strength BETWEEN $4 AND $5 AND p.rating BETWEEN $6 AND $7
        AND NOT EXISTS (
          SELECT 1 FROM pvp_matches m WHERE m.played_at > $8 AND
            ((m.attacker_id = $1 AND m.defender_id = d.account_id) OR (m.defender_id = $1 AND m.attacker_id = d.account_id))
        )
        AND NOT EXISTS (
          SELECT 1 FROM social_controls s WHERE s.kind = 'block' AND
            ((s.account_id = $1 AND s.target_id = d.account_id) OR (s.target_id = $1 AND s.account_id = d.account_id))
        )
      ORDER BY abs(p.rating - $9), d.account_id LIMIT 12 FOR SHARE OF a`,
    [playerId, RULES_VERSION, progression, Math.ceil(strength * 0.65), Math.floor(strength / 0.65),
      rank.rating - RATING_BAND, rank.rating + RATING_BAND, new Date(now - OPPONENT_INTERVAL_MS), rank.rating],
  )
  requireRule(candidates.length > 0, 'No eligible ranked defense is available right now.')
  const opponent = candidates[randomInt(candidates.length)]
  const seed = randomBytes(24).toString('hex')
  const result = resolveBattle(team, opponent.team, seed)
  const change = eloChange(rank.rating, opponent.rating, result.winner)
  await db.query(
    `UPDATE players SET rating = rating + $2, ranked_wins = ranked_wins + $3 WHERE account_id = $1`,
    [playerId, change, result.winner === 'left' ? 1 : 0],
  )
  await db.query(
    `UPDATE players SET rating = rating + $2, ranked_wins = ranked_wins + $3 WHERE account_id = $1`,
    [opponent.id, -change, result.winner === 'right' ? 1 : 0],
  )
  await db.query(
    `INSERT INTO pvp_matches (
        id, attacker_id, defender_id, attacker_team, defender_team, rules_version, seed,
        result, attacker_change, defender_change, played_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [randomUUID(), playerId, opponent.id, team, opponent.team, RULES_VERSION, seed, result, change, -change, new Date(now)],
  )
  const outcome = result.winner === 'left' ? 'Won' : result.winner === 'right' ? 'Lost' : 'Drew'
  return `${outcome} against ${opponent.username} (${change > 0 ? '+' : ''}${change} rating).`
}

interface HistoryRow {
  id: string
  username: string
  result: BattleResult
  is_attacker: boolean
  played_at: Date
  rating_change: number
  attacker_team: BattleTeam
  defender_team: BattleTeam
}

export async function pvpView(db: PoolClient, playerId: string): Promise<WorldView['ranked']> {
  const { rows: [rank] } = await db.query<RatedPlayer & { published: boolean }>(
    `SELECT p.rating, p.ranked_wins, d.account_id IS NOT NULL AS published FROM players p
      LEFT JOIN pvp_defenses d ON d.account_id = p.account_id AND d.rules_version = $2 WHERE p.account_id = $1`,
    [playerId, RULES_VERSION],
  )
  const { rows: leaders } = await db.query<RatedPlayer & { username: string }>(
    `SELECT a.username, p.rating, p.ranked_wins FROM players p
      JOIN pvp_defenses d ON d.account_id = p.account_id AND d.rules_version = $1 JOIN accounts a ON a.id = p.account_id
      WHERE a.banned_at IS NULL ORDER BY p.rating DESC, a.username LIMIT 30`,
    [RULES_VERSION],
  )
  const { rows: history } = await db.query<HistoryRow>(
    `SELECT m.id, a.username, m.result, m.played_at, m.attacker_team, m.defender_team, m.attacker_id = $1 AS is_attacker,
        CASE WHEN m.attacker_id = $1 THEN m.attacker_change ELSE m.defender_change END AS rating_change
      FROM pvp_matches m JOIN accounts a ON a.id = CASE WHEN m.attacker_id = $1 THEN m.defender_id ELSE m.attacker_id END
      WHERE m.attacker_id = $1 OR m.defender_id = $1 ORDER BY played_at DESC, m.id LIMIT 12`,
    [playerId],
  )
  return {
    rating: rank.rating,
    published: rank.published,
    prestige: rank.ranked_wins >= BADGE_WINS ? WIN_BADGE : null,
    leaders: leaders.map((player) => ({
      username: player.username,
      rating: player.rating,
      prestige: player.ranked_wins >= BADGE_WINS ? WIN_BADGE : null,
    })),
    history: history.map((match) => ({
      id: match.id,
      opponent: match.username,
      isAttacker: match.is_attacker,
      playedAt: match.played_at.getTime(),
      ratingChange: match.rating_change,
      result: match.result.initial ? match.result : {
        ...match.result,
        initial: { left: match.attacker_team, right: match.defender_team },
        // In rules v1, the only ability event with a target is Mend. No prose parsing or re-resolution.
        events: match.result.events.map((event) => event.type === 'ability' && event.target
          ? { ...event, effect: 'Mend' as const } : event),
      },
    })),
  }
}
