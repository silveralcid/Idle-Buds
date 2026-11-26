import EmbeddedPostgres from 'embedded-postgres'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile, access, mkdtemp, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createServer } from 'node:net'
import { Pool } from 'pg'
export { assertTestDatabase } from './database-guard.ts'

// Development/test convenience only. Production connects to DATABASE_URL.
// The package runs an actual local PostgreSQL process, not a database emulator.
export async function localDatabase({ temporary = false, playtest = false } = {}) {
  const base = resolve('.repo-local')
  await mkdir(base, { recursive: true })
  const directory = temporary ? await mkdtemp(join(base, 'pg-test-')) : join(base, playtest ? 'postgres-playtest' : 'postgres')
  await mkdir(directory, { recursive: true })
  let password
  const credentials = join(directory, 'local-password')
  try { password = await readFile(credentials, 'utf8') }
  catch {
    password = randomBytes(32).toString('hex')
    await writeFile(credentials, password, { mode: 0o600 })
  }
  const port = temporary ? await freePort() : Number(process.env.LOCAL_PG_PORT ?? (playtest ? 55434 : 55432))
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid LOCAL_PG_PORT')
  const data = join(directory, 'data')
  const logs = []
  const pg = new EmbeddedPostgres({
    databaseDir: data, user: 'idle_buds', password, port,
    authMethod: 'scram-sha-256', persistent: true,
    createPostgresUser: false, autoRehydrateSymlinks: true,
    postgresFlags: ['-h', '127.0.0.1', '-k', ''],
    onLog: (message) => { logs.push(String(message)); if (logs.length > 20) logs.shift() },
    onError: (error) => logs.push(String(error)),
  })
  try { await access(join(data, 'PG_VERSION')) }
  catch { await pg.initialise() }
  try { await pg.start() }
  catch { throw new Error(`Local PostgreSQL failed to start: ${logs.join('\n')}`) }
  const database = temporary || playtest ? 'idle_buds_test' : 'idle_buds_dev'
  const client = pg.getPgClient('postgres', '127.0.0.1')
  try {
    await client.connect()
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])
    if (!found.rowCount) await pg.createDatabase(database)
  } catch (error) { await pg.stop(); throw error }
  finally { await client.end() }
  return {
    url: `postgresql://idle_buds:${password}@127.0.0.1:${port}/${database}`,
    directory, dataPath: data,
    shutdown: () => pg.stop(), restart: () => pg.start(),
    stop: async () => { await pg.stop(); if (temporary) await rm(directory, { recursive: true, force: true }) },
  }
}

export async function migrate(databaseUrl) {
  const { runner } = await import('node-pg-migrate')
  await runner({ databaseUrl, direction: 'up', dir: resolve('migrations'),
    migrationsTable: 'pgmigrations', log: () => {} })
}

// Destructive fixtures/tests must never target a nonlocal or normal player DB.
export async function databaseVersion(url) {
  const pool = new Pool({ connectionString: url })
  try { return (await pool.query('SHOW server_version')).rows[0].server_version }
  finally { await pool.end() }
}

async function freePort() {
  const server = createServer()
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept) })
  const port = server.address().port
  await new Promise((accept, reject) => server.close(error => error ? reject(error) : accept()))
  return port
}
