import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import type { GameState } from '../src/game/types.ts'
import { CLAN_NAME, USERNAME } from './commands.ts'
import { requireRule } from './errors.ts'
import { canTrade, takeItem } from './market.ts'
import type { WorldCommand, WorldView } from './world-types.ts'

type SocialCommand = Extract<WorldCommand, { type: `chat.${string}` | `social.${string}` }>
type ClanCommand = Extract<WorldCommand, { type: `clan.${string}` }>

export const CLAN_GOAL = 40
export const CLAN_ITEM = 'fiber'

function cleanText(value: string, limit: number) {
  const normalized = value.normalize('NFC').trim()
  requireRule(normalized && !/[\p{Cc}\p{Cf}]/u.test(normalized), 'Use a single line of plain text.', 400)
  requireRule(normalized.length <= limit, `Keep the message within ${limit} characters.`, 400)
  return normalized
}

export async function socialCommand(
  db: PoolClient, playerId: string, state: GameState, command: SocialCommand, now: number,
): Promise<string> {
  if (command.type === 'chat.send') {
    requireRule(canTrade(state), 'Gather five items or finish a recipe to unlock chat.')
    const body = cleanText(command.text, 240)
    const { rows: [recent] } = await db.query(
      'SELECT 1 FROM chat_messages WHERE sender_id = $1 AND sent_at > $2 LIMIT 1', [playerId, new Date(now - 2_500)],
    )
    requireRule(!recent, 'Wait a moment before sending another message.', 429)
    await db.query(
      'INSERT INTO chat_messages (id, sender_id, body, sent_at) VALUES ($1,$2,$3,$4)',
      [randomUUID(), playerId, body, new Date(now)],
    )
    return 'Message sent.'
  }

  if (command.type === 'chat.report') {
    const { rows: [message] } = await db.query<{ sender_id: string }>(
      'SELECT sender_id FROM chat_messages WHERE id = $1', [command.messageId],
    )
    requireRule(message && message.sender_id !== playerId, 'Choose a message from another player.', 404)
    const reason = cleanText(command.reason, 120)
    await db.query(
      `INSERT INTO chat_reports (message_id, reporter_id, reason, reported_at) VALUES ($1,$2,$3,$4)
        ON CONFLICT (message_id, reporter_id) DO NOTHING`,
      [command.messageId, playerId, reason, new Date(now)],
    )
    return 'Report filed for review.'
  }

  const username = command.username.trim().toLowerCase()
  requireRule(USERNAME.test(username), 'Enter a valid username.', 400)
  const { rows: [target] } = await db.query<{ id: string }>('SELECT id FROM accounts WHERE username = $1 AND banned_at IS NULL FOR SHARE', [username])
  requireRule(target && target.id !== playerId, 'That player is unavailable.', 404)
  const [first, second] = [playerId, target.id].sort()
  switch (command.type) {
    case 'social.friend': {
      requireRule(canTrade(state), 'Gather five items or finish a recipe to unlock friend requests.')
      const { rows: [blocked] } = await db.query(
        `SELECT 1 FROM social_controls WHERE kind = 'block'
          AND ((account_id = $1 AND target_id = $2) OR (account_id = $2 AND target_id = $1))`,
        [playerId, target.id],
      )
      requireRule(!blocked, 'This friend request is unavailable.')
      const { rows: [friendship] } = await db.query<{ accepted: boolean }>(
        `INSERT INTO friendships (account_a, account_b, requester_id)
          VALUES ($1,$2,$3) ON CONFLICT (account_a, account_b) DO UPDATE
          SET accepted = friendships.accepted OR friendships.requester_id <> EXCLUDED.requester_id
          RETURNING accepted`,
        [first, second, playerId],
      )
      return friendship.accepted ? `You and ${username} are friends.` : `Friend request sent to ${username}.`
    }
    case 'social.unfriend':
      await db.query('DELETE FROM friendships WHERE account_a = $1 AND account_b = $2', [first, second])
      return 'Friend entry removed.'
    case 'social.block':
    case 'social.mute': {
      const block = command.type === 'social.block'
      await db.query(
        'INSERT INTO social_controls (account_id, target_id, kind) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [playerId, target.id, block ? 'block' : 'mute'],
      )
      if (block) await db.query('DELETE FROM friendships WHERE account_a = $1 AND account_b = $2', [first, second])
      return block ? `${username} blocked.` : `${username} muted.`
    }
    case 'social.unblock':
    case 'social.unmute':
      await db.query('DELETE FROM social_controls WHERE account_id = $1 AND target_id = $2 AND kind = $3',
        [playerId, target.id, command.type === 'social.unblock' ? 'block' : 'mute'])
      return 'Player control removed.'
  }
}

export async function socialView(db: PoolClient, playerId: string): Promise<Pick<WorldView, 'chat' | 'friends' | 'blocked' | 'muted'>> {
  const { rows: chat } = await db.query<{ id: string; username: string; body: string; sent_at: Date }>(
    `SELECT m.id, a.username, m.body, m.sent_at FROM chat_messages m JOIN accounts a ON a.id = m.sender_id
      WHERE m.hidden_at IS NULL AND a.banned_at IS NULL AND NOT EXISTS (
        SELECT 1 FROM social_controls s WHERE
          (s.account_id = $1 AND s.target_id = m.sender_id)
          OR (s.kind = 'block' AND s.account_id = m.sender_id AND s.target_id = $1)
      ) ORDER BY m.sent_at DESC, m.id DESC LIMIT 50`,
    [playerId],
  )
  const { rows: friends } = await db.query<WorldView['friends'][number]>(
    `SELECT a.username, CASE WHEN f.accepted THEN 'accepted'
        WHEN f.requester_id = $1 THEN 'outgoing' ELSE 'incoming' END AS status
      FROM friendships f JOIN accounts a ON a.id = CASE WHEN f.account_a = $1 THEN f.account_b ELSE f.account_a END
      WHERE (f.account_a = $1 OR f.account_b = $1) AND a.banned_at IS NULL ORDER BY a.username`,
    [playerId],
  )
  const { rows: controls } = await db.query<{ username: string; kind: 'block' | 'mute' }>(
    'SELECT a.username, s.kind FROM social_controls s JOIN accounts a ON a.id = s.target_id WHERE s.account_id = $1 ORDER BY a.username',
    [playerId],
  )
  return {
    chat: chat.reverse().map((m) => ({ id: m.id, username: m.username, text: m.body, sentAt: m.sent_at.getTime() })),
    friends,
    blocked: controls.filter((control) => control.kind === 'block').map((control) => control.username),
    muted: controls.filter((control) => control.kind === 'mute').map((control) => control.username),
  }
}

interface ClanRow {
  id: string
  name: string
  contributions: number
  contributed: number
}

export async function clanCommand(
  db: PoolClient, playerId: string, state: GameState, command: ClanCommand, now: number,
): Promise<string> {
  const { rows: [member] } = await db.query<ClanRow>(
    'SELECT c.*, m.contributed FROM clan_members m JOIN clans c ON c.id = m.clan_id WHERE m.account_id = $1', [playerId],
  )
  switch (command.type) {
    case 'clan.create':
    case 'clan.join': {
      requireRule(canTrade(state), 'Gather five items or finish a recipe to unlock clans.')
      requireRule(!member, 'Leave your existing clan before joining a new one.')
      const name = command.name.trim().toLowerCase().replace(/ +/g, ' ')
      requireRule(CLAN_NAME.test(name), 'Use 3–24 letters, numbers, spaces, hyphens or underscores.', 400)
      const { rows: [clan] } = command.type === 'clan.create'
        ? await db.query<ClanRow>('INSERT INTO clans (id, name) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING id', [randomUUID(), name])
        : await db.query<ClanRow>('SELECT id FROM clans WHERE name = $1', [name])
      requireRule(clan, command.type === 'clan.create' ? 'That clan name is taken.' : 'That clan is unavailable.')
      const { rows: [count] } = await db.query<{ total: number }>(
        'SELECT count(*)::integer AS total FROM clan_members WHERE clan_id = $1', [clan.id],
      )
      requireRule(count.total < 24, 'This clan is full.')
      await db.query(
        `INSERT INTO clan_members (account_id, clan_id, contributed)
          SELECT $1, $2, coalesce(sum(quantity), 0)::integer FROM clan_contributions WHERE account_id = $1 AND clan_id = $2`,
        [playerId, clan.id],
      )
      return `You joined ${name}.`
    }
    case 'clan.leave':
      requireRule(member, 'You are not in a clan.')
      await db.query('DELETE FROM clan_members WHERE account_id = $1', [playerId])
      return 'You left the clan.'
    case 'clan.contribute':
      requireRule(member, 'Join a clan to contribute.')
      requireRule(command.quantity <= CLAN_GOAL - member.contributions, 'Your clan needs fewer units for this goal.')
      takeItem(state, CLAN_ITEM, command.quantity)
      await db.query('UPDATE clans SET contributions = contributions + $2 WHERE id = $1', [member.id, command.quantity])
      await db.query('UPDATE clan_members SET contributed = contributed + $2 WHERE account_id = $1', [playerId, command.quantity])
      await db.query(
        'INSERT INTO clan_contributions (id, account_id, clan_id, quantity, contributed_at) VALUES ($1,$2,$3,$4,$5)',
        [randomUUID(), playerId, member.id, command.quantity, new Date(now)],
      )
      return member.contributions + command.quantity === CLAN_GOAL
        ? 'Clan goal completed. Your clan unlocked a lower marketplace tax.'
        : `Contributed ${command.quantity} Bramble Fiber to the clan goal.`
  }
}

export async function clanView(db: PoolClient, playerId: string): Promise<Pick<WorldView, 'clans' | 'clan'>> {
  const { rows: clans } = await db.query<{ name: string; members: number; contributions: number }>(
    `SELECT c.name, count(m.account_id)::integer AS members, c.contributions
      FROM clans c LEFT JOIN clan_members m ON m.clan_id = c.id
      GROUP BY c.id ORDER BY members DESC, c.name LIMIT 50`,
  )
  const { rows: [member] } = await db.query<ClanRow>(
    'SELECT c.*, m.contributed FROM clan_members m JOIN clans c ON c.id = m.clan_id WHERE m.account_id = $1', [playerId],
  )
  return {
    clans: clans.map((clan) => ({ name: clan.name, members: clan.members, total: clan.contributions, target: CLAN_GOAL })),
    clan: member ? {
      name: member.name,
      total: member.contributions,
      target: CLAN_GOAL,
      contributed: member.contributed,
      bonus: member.contributions >= CLAN_GOAL,
    } : null,
  }
}
