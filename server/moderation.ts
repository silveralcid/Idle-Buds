import { Pool } from 'pg'
import { USERNAME, UUID } from './commands.ts'

type ModerationAction = 'hide' | 'unhide' | 'ban' | 'unban'

export async function reports(pool: Pool) {
  const { rows } = await pool.query(
    `SELECT m.id AS message_id, sender.username AS sender, m.body AS message, m.hidden_at,
      sender.banned_at AS sender_banned_at, reporter.username AS reporter, r.reason, r.reported_at
      FROM chat_reports r JOIN chat_messages m ON m.id = r.message_id
      JOIN accounts sender ON sender.id = m.sender_id
      JOIN accounts reporter ON reporter.id = r.reporter_id
      ORDER BY r.reported_at DESC, m.id LIMIT 100`,
  )
  return rows
}

export async function moderate(pool: Pool, action: ModerationAction, target: string) {
  switch (action) {
    case 'hide':
    case 'unhide': {
      if (!UUID.test(target)) throw new Error('Enter the exact message UUID from reports.')
      const result = await pool.query(
        'UPDATE chat_messages SET hidden_at = CASE WHEN $2 THEN coalesce(hidden_at, now()) ELSE NULL END WHERE id = $1',
        [target, action === 'hide'],
      )
      return result.rowCount === 1
    }
    case 'ban':
    case 'unban': {
      if (!USERNAME.test(target)) throw new Error('Enter the exact lowercase username.')
      const result = await pool.query(
        `UPDATE accounts SET banned_at = CASE WHEN $2 THEN coalesce(banned_at, now()) ELSE NULL END,
          session_generation = session_generation + CASE WHEN $2 AND banned_at IS NULL THEN 1 ELSE 0 END
          WHERE username = $1`,
        [target, action === 'ban'],
      )
      return result.rowCount === 1
    }
  }
}

if (import.meta.main) {
  const [action, target, ...extra] = process.argv.slice(2)
  const isMutation = action === 'hide' || action === 'unhide' || action === 'ban' || action === 'unban'
  if (extra.length || !(action === 'reports' && !target) && !(isMutation && target)) {
    console.error('Usage: moderation.ts reports | hide UUID | unhide UUID | ban USERNAME | unban USERNAME')
    process.exitCode = 1
  } else if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL to the intended playtest database.')
    process.exitCode = 1
  } else {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5_000 })
    try {
      if (action === 'reports') console.log(JSON.stringify(await reports(pool), null, 2))
      else if (isMutation && target) {
        if (await moderate(pool, action, target)) console.log('Moderation action applied.')
        else {
          console.error('No record matched the specified identifier.')
          process.exitCode = 1
        }
      }
    } catch {
      console.error('Moderation failed. Check the identifier and database configuration.')
      process.exitCode = 1
    } finally {
      await pool.end()
    }
  }
}
