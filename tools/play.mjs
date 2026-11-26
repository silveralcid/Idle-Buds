import { spawn } from 'node:child_process'
import { localDatabase, migrate, assertTestDatabase } from './db-local.mjs'
import { Pool } from 'pg'
import { assertLanDatabase, assertLanDatabaseUrl, lanAddresses } from '../server/lan.ts'

const fixtures = process.argv.includes('--fixtures')
const reset = process.argv.includes('--reset')
const lan = process.argv.includes('--lan')
if (reset && !fixtures) throw new Error('--reset is only valid with --fixtures')
if (lan && fixtures) throw new Error('LAN play cannot serve public fixture accounts')
if (lan && !lanAddresses().length) throw new Error('No private LAN IPv4 address found. Connect to your home network and try again.')
if (lan && process.env.DATABASE_URL) assertLanDatabaseUrl(process.env.DATABASE_URL)
if (fixtures && process.env.DATABASE_URL) assertTestDatabase(process.env.DATABASE_URL)
if (fixtures && process.env.HOST && !['127.0.0.1', 'localhost', '::1'].includes(process.env.HOST)) {
  throw new Error('Public fixture accounts must only be served on loopback')
}
const local = process.env.DATABASE_URL ? null : await localDatabase({ playtest: fixtures })
const url = process.env.DATABASE_URL ?? local.url
let child
let stopping = false
const shutdown = () => {
  if (stopping) return
  stopping = true
  if (lan && child?.connected) child.send('shutdown', () => {})
  else child?.kill('SIGINT')
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
if (process.connected) process.on('message', (message) => { if (message === 'shutdown') shutdown() })
try {
  if (fixtures) assertTestDatabase(url)
  if (lan) {
    assertLanDatabaseUrl(url)
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5_000 })
    try { await assertLanDatabase(pool) }
    finally { await pool.end() }
  }
  if (!stopping) await migrate(url)
  if (fixtures && !stopping) {
    const { seedPlaytest } = await import('./fixtures.ts')
    const pool = new Pool({ connectionString: url })
    try { await seedPlaytest(pool, url, reset) }
    finally { await pool.end() }
  }
  if (!stopping) {
    child = spawn(process.execPath, ['server/index.ts', ...(lan ? ['--lan'] : [])], {
      stdio: lan ? ['inherit', 'inherit', 'inherit', 'ipc'] : 'inherit',
      env: { ...process.env, DATABASE_URL: url },
    })
    const code = await new Promise((accept, reject) => {
      child.once('error', reject); child.once('exit', (code) => accept(code ?? (stopping ? 0 : 1)))
    })
    process.exitCode = code
  }
} finally {
  await local?.stop()
  if (process.connected) process.disconnect?.()
}
