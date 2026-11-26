import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { migrate, assertTestDatabase } from './db-local.mjs'
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
let local
let child
let stopping = false
const shutdown = () => {
  if (stopping) return
  stopping = true
  if (child?.connected) child.send('shutdown', () => {})
  else child?.kill('SIGINT')
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
if (process.connected) process.on('message', (message) => { if (message === 'shutdown') shutdown() })
try {
  local = process.env.DATABASE_URL ? null : await startOwnedDatabase()
  const url = process.env.DATABASE_URL ?? local.url
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
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      env: { ...process.env, DATABASE_URL: url },
    })
    const code = await new Promise((accept, reject) => {
      child.once('error', reject); child.once('exit', (code) => accept(code ?? (stopping ? 0 : 1)))
    })
    process.exitCode = code || process.exitCode || 0
  }
} finally {
  await local?.stop()
  if (stopping) console.log(lan ? 'LAN shutdown complete.' : 'Shutdown complete.')
  if (process.connected) process.disconnect?.()
}

// Keep the embedded package's global exit hooks out of the server supervisor.
// Its process group is separate so terminal Ctrl+C cannot stop PostgreSQL before HTTP drains.
async function startOwnedDatabase() {
  const database = spawn(process.execPath, [fileURLToPath(new URL('./play-db.mjs', import.meta.url)), ...(fixtures ? ['--fixtures'] : [])], {
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'], detached: true, windowsHide: true,
    env: process.env,
  })
  let ready = false, requestedStop = false
  const exited = new Promise((resolve) => database.once('exit', (code, signal) => {
    resolve({ code, signal })
    if (ready && !requestedStop) { process.exitCode = 1; shutdown() }
  }))
  const url = await new Promise((resolve, reject) => {
    database.once('error', reject)
    database.once('exit', () => { if (!ready) reject(new Error('Local database helper stopped before startup completed.')) })
    database.on('message', (message) => {
      if (message?.type === 'ready' && typeof message.url === 'string') { ready = true; resolve(message.url) }
    })
  })
  return {
    url,
    async stop() {
      requestedStop = true
      if (database.connected) database.send({ type: 'stop' }, () => {})
      const result = await exited
      if (result.code !== 0) throw new Error(`Local database helper failed to close cleanly (${result.code ?? result.signal}).`)
    },
  }
}
