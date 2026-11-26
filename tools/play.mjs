import { spawn } from 'node:child_process'
import { localDatabase, migrate, assertTestDatabase } from './db-local.mjs'
import { Pool } from 'pg'

const fixtures = process.argv.includes('--fixtures')
const reset = process.argv.includes('--reset')
if (reset && !fixtures) throw new Error('--reset is only valid with --fixtures')
if (fixtures && process.env.DATABASE_URL) assertTestDatabase(process.env.DATABASE_URL)
if (fixtures && process.env.HOST && !['127.0.0.1', 'localhost', '::1'].includes(process.env.HOST)) {
  throw new Error('Public fixture accounts must only be served on loopback')
}
const local = process.env.DATABASE_URL ? null : await localDatabase({ playtest: fixtures })
const url = process.env.DATABASE_URL ?? local.url
try {
  if (fixtures) assertTestDatabase(url)
  await migrate(url)
  if (fixtures) {
    const { seedPlaytest } = await import('./fixtures.ts')
    const pool = new Pool({ connectionString: url })
    try { await seedPlaytest(pool, url, reset) }
    finally { await pool.end() }
  }
  const child = spawn(process.execPath, ['server/index.ts'], {
    stdio: 'inherit', env: { ...process.env, DATABASE_URL: url },
  })
  process.once('SIGINT', () => child.kill('SIGINT'))
  process.once('SIGTERM', () => child.kill('SIGTERM'))
  const code = await new Promise((accept, reject) => {
    child.once('error', reject); child.once('exit', (code) => accept(code ?? 0))
  })
  process.exitCode = code
} finally { await local?.stop() }
