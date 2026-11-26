import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { createServer, createConnection } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { Pool } from 'pg'
import { describe, expect, it } from 'vitest'
import { localDatabase, migrate } from '../../tools/db-local.mjs'

const root = resolve('.')

async function freePort() {
  const server = createServer()
  await new Promise<void>((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept) })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No free TCP port.')
  await new Promise<void>((accept, reject) => server.close((error) => error ? reject(error) : accept()))
  return address.port
}

async function reachable(port: number): Promise<boolean> {
  return await new Promise((accept) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    const done = (result: boolean) => { socket.destroy(); accept(result) }
    socket.once('connect', () => done(true)); socket.once('error', () => done(false)); socket.setTimeout(500, () => done(false))
  })
}

function processResult(child: ChildProcess) {
  let output = ''
  child.stdout?.on('data', (value) => { output += String(value) })
  child.stderr?.on('data', (value) => { output += String(value) })
  const exited = new Promise<{ code: number | null; signal: string | null }>((accept, reject) => {
    child.once('close', (code, signal) => accept({ code, signal }))
    child.once('error', reject)
  })
  return { child, exited, output: () => output }
}

function launch(cwd: string, port: number, databaseUrl?: string, pgPort?: number) {
  const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(port), HOST: '127.0.0.1', ALLOWED_ORIGIN: `http://127.0.0.1:${port}`, NODE_ENV: 'test', IDLE_BUDS_INVITE: '' }
  delete env.DATABASE_URL
  if (databaseUrl) env.DATABASE_URL = databaseUrl
  if (pgPort) env.LOCAL_PG_PORT = String(pgPort)
  return processResult(spawn(process.execPath, [join(root, 'tools/play.mjs')], {
    cwd, env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], detached: process.platform !== 'win32',
  }))
}

async function ready(server: ReturnType<typeof launch>, port: number) {
  await expect.poll(async () => {
    if (server.child.exitCode !== null) throw new Error(server.output())
    try { return (await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(500) })).ok }
    catch { return false }
  }, { timeout: 15_000 }).toBe(true)
  await expect.poll(server.output).toContain('Idle Buds is listening')
}

async function stop(server: ReturnType<typeof launch>, ipc = false) {
  if (ipc || process.platform === 'win32') server.child.send('shutdown')
  else server.child.kill('SIGINT')
  expect(await server.exited, server.output()).toEqual({ code: 0, signal: null })
  expect(server.output()).toContain('Shutdown complete.')
}

async function forceCleanup(server: ReturnType<typeof processResult> | undefined) {
  if (!server?.child.pid) return
  if (server.child.connected) server.child.disconnect()
  if (server.child.exitCode === null && server.child.signalCode === null) server.child.kill('SIGKILL')
  if (process.platform !== 'win32') {
    try { process.kill(-server.child.pid, 'SIGKILL') } catch { /* Its process group already exited. */ }
  }
  await server.exited
}

async function workspace() {
  const directory = await mkdtemp(join(tmpdir(), 'idle-buds-lifecycle-'))
  // Only new disposable directories are used; existing development saves are never touched.
  await symlink(join(root, 'server'), join(directory, 'server'), 'junction')
  await symlink(join(root, 'migrations'), join(directory, 'migrations'), 'junction')
  return directory
}

describe('launcher lifecycle with real loopback processes', () => {
  it('gracefully stops with a supplied database and leaves that database running', async () => {
    const database = await localDatabase({ temporary: true })
    let server: ReturnType<typeof launch> | undefined
    const pool = new Pool({ connectionString: database.url })
    try {
      await migrate(database.url)
      const port = await freePort()
      server = launch(root, port, database.url)
      await ready(server, port)
      await stop(server)
      expect(await reachable(port)).toBe(false)
      expect((await pool.query('SELECT 1 AS alive')).rows[0].alive).toBe(1)
    } finally {
      await forceCleanup(server)
      await pool.end()
      await database.stop()
    }
  })

  it('stops its owned database after HTTP, preserves saves, and restarts using signal or IPC shutdown', async () => {
    const directory = await workspace()
    const port = await freePort(), pgPort = await freePort()
    let server: ReturnType<typeof launch> | undefined
    const origin = `http://127.0.0.1:${port}`
    const username = 'lifecycle_tender', password = 'Lifecycle test password 2026!'
    try {
      server = launch(directory, port, undefined, pgPort)
      await ready(server, port)
      const registered = await fetch(origin + '/api/register', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) })
      expect(registered.status).toBe(200)
      const cookie = registered.headers.get('set-cookie')!.split(';')[0]
      const command = await fetch(origin + '/api/command', { method: 'POST', headers: { origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify({ id: randomUUID(), command: { type: 'setCaptureFilters', filters: [] } }) })
      expect(command.status).toBe(200)
      expect(await reachable(pgPort)).toBe(true)
      await stop(server)
      expect(await reachable(port)).toBe(false)
      expect(await reachable(pgPort)).toBe(false)
      expect(await readFile(join(directory, '.repo-local/postgres/data/PG_VERSION'), 'utf8')).toMatch(/^18/)

      server = launch(directory, port, undefined, pgPort)
      await ready(server, port)
      const login = await fetch(origin + '/api/login', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) })
      expect(login.status).toBe(200)
      expect((await login.json() as { state: { captureFilters: unknown[] } }).state.captureFilters).toEqual([])
      await stop(server, true)
      expect(await reachable(port)).toBe(false)
      expect(await reachable(pgPort)).toBe(false)
    } finally {
      await forceCleanup(server)
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('closes owned HTTP and PostgreSQL processes when the launcher disappears', async () => {
    const directory = await workspace()
    const port = await freePort(), pgPort = await freePort()
    let server: ReturnType<typeof launch> | undefined
    try {
      server = launch(directory, port, undefined, pgPort)
      await ready(server, port)
      expect(await reachable(pgPort)).toBe(true)
      // Kill just the supervisor, not its process group; both children must handle IPC loss.
      server.child.kill('SIGKILL')
      await server.exited
      await expect.poll(() => reachable(port), { timeout: 10_000 }).toBe(false)
      await expect.poll(() => reachable(pgPort), { timeout: 10_000 }).toBe(false)
    } finally {
      await forceCleanup(server)
      await rm(directory, { recursive: true, force: true })
    }
  })
})
