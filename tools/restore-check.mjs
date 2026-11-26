import assert from 'node:assert/strict'
import { cp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { Pool } from 'pg'
import { localDatabase, migrate } from './db-local.mjs'
import { seedPlaytest } from './fixtures.ts'

// Standard cold PostgreSQL backup/restore, confined to a newly created disposable
// cluster. This is verification, not an online production backup implementation.
const local = await localDatabase({ temporary: true })
let pool = new Pool({ connectionString: local.url })
try {
  await migrate(local.url)
  await seedPlaytest(pool, local.url)
  const query = `SELECT a.username, p.state FROM accounts a JOIN players p ON p.account_id=a.id ORDER BY a.username`
  const before = (await pool.query(query)).rows
  assert.equal(before.length, 3)
  await pool.end()
  await local.shutdown()
  const backup = join(local.directory, 'cold-backup')
  await cp(local.dataPath, backup, { recursive: true })
  // Removing only the temporary cluster's data demonstrates an actual restore.
  await rm(local.dataPath, { recursive: true })
  await cp(backup, local.dataPath, { recursive: true })
  await local.restart()
  pool = new Pool({ connectionString: local.url })
  const after = (await pool.query(query)).rows
  assert.deepEqual(after, before)
  await migrate(local.url)
  const { rows } = await pool.query('SELECT count(*)::integer AS count FROM pgmigrations')
  assert.ok(rows[0].count > 0)
  console.log('PASS: cold PostgreSQL backup restored into an empty data directory; three accounts, full player states and migration history preserved.')
} finally {
  if (!pool.ended) await pool.end()
  await local.stop()
}
