import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { buildApp } from './app.ts'
import { assertLanDatabase, assertLanDatabaseUrl, lanAddresses, localOrigins } from './lan.ts'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('Set DATABASE_URL or launch with npm run play.')
const port = Number(process.env.PORT ?? 3000)
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('PORT must be a valid TCP port.')
const lan = process.argv.includes('--lan')
const addresses = lan ? lanAddresses() : []
if (lan && !addresses.length) throw new Error('No private LAN IPv4 address found. Connect to your home network and try again.')
if (lan) assertLanDatabaseUrl(connectionString)
const host = lan ? '0.0.0.0' : (process.env.HOST ?? '127.0.0.1')
const local = ['127.0.0.1', 'localhost', '::1'].includes(host)
const inviteCode = lan ? undefined : process.env.IDLE_BUDS_INVITE
const allowedOrigin = lan ? undefined : process.env.ALLOWED_ORIGIN
const localOrigin = !allowedOrigin || ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(allowedOrigin).hostname)
if (!lan && !local && (!inviteCode || inviteCode.length < 12 || !allowedOrigin?.startsWith('https://'))) {
  throw new Error('Nonloopback binding requires an HTTPS ALLOWED_ORIGIN and IDLE_BUDS_INVITE of at least 12 characters.')
}
const dir = fileURLToPath(new URL('../dist/', import.meta.url))
const pool = new Pool({ connectionString, connectionTimeoutMillis: 5_000, max: 12 })
pool.on('error', () => console.error('An idle PostgreSQL connection was lost.'))

try {
  const { rows: [database] } = await pool.query<{ name: string }>('SELECT current_database() AS name')
  if (database.name === 'idle_buds_test' && (!local || !localOrigin)) {
    throw new Error('The disposable playtest database is restricted to a loopback listener and origin.')
  }
  if (lan) await assertLanDatabase(pool)
  await pool.query('SELECT 1 FROM players LIMIT 0')
  const app = await buildApp({
    pool, inviteCode, lan, logger: process.env.NODE_ENV !== 'test',
    allowedOrigin: allowedOrigin || [...localOrigins(port), ...addresses.map((address) => `http://${address}:${port}`)],
    distRoot: existsSync(fileURLToPath(new URL('../dist/index.html', import.meta.url))) ? dir : undefined,
  })
  app.addHook('onClose', async () => pool.end())
  let stopping = false
  const shutdown = () => {
    if (stopping) return
    stopping = true
    void app.close().catch(() => { process.exitCode = 1 }).finally(() => {
      if (process.connected) process.disconnect?.()
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  if (lan && process.connected) process.on('message', (message) => { if (message === 'shutdown') shutdown() })
  const address = await app.listen({ host, port })
  if (lan) {
    console.log(['', '========================================', 'IDLE BUDS | LAN PLAYTEST', '========================================',
      'Server ready.', '', `Local: http://localhost:${port}`, '', 'Network:',
      ...addresses.map((ip) => `http://${ip}:${port}`), '',
      'Connect to the same home network and open a URL above.', 'Register or sign in to begin playing.',
      'Database: Development (persistent)', 'Press Ctrl+C to stop.', '========================================', ''].join('\n'))
  } else console.log(`Idle Buds is listening at ${address}`)
} catch (error) {
  await pool.end()
  throw error
}
