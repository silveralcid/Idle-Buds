import { spawn, spawnSync } from 'node:child_process'
import { createServer, createConnection } from 'node:net'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Pool } from 'pg'
import { lanAddresses } from '../../server/lan.ts'
import type { PlayerView } from '../../src/game/types.ts'
import { assertTestDatabase } from '../../tools/database-guard.ts'

const password = 'LAN browser verification 2026!'

async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Could not reserve a TCP port.')
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  return address.port
}

async function reachable(host: string, port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = createConnection({ host, port })
    const finish = (result: boolean) => { socket.destroy(); resolve(result) }
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
    socket.setTimeout(2_000, () => finish(false))
  })
}

function launch(database: string, port: number, lan: boolean) {
  const child = spawn(process.execPath, ['tools/play.mjs', ...(lan ? ['--lan'] : [])], {
    env: { ...process.env, DATABASE_URL: database, PORT: String(port), HOST: '127.0.0.1',
      ALLOWED_ORIGIN: lan ? 'https://not-used.example' : `http://127.0.0.1:${port}`,
      IDLE_BUDS_INVITE: lan ? 'not-required-in-lan' : '' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  let output = ''
  child.stdout?.on('data', (data) => { output += String(data) })
  child.stderr?.on('data', (data) => { output += String(data) })
  const exited = new Promise<number | null>((resolve) => {
    child.once('exit', (code) => resolve(code))
    child.once('error', (error) => { output += String(error); resolve(null) })
  })
  return {
    async ready(url: string) {
      await expect.poll(async () => {
        if (child.exitCode !== null) throw new Error(output)
        try { return (await fetch(url + '/api/health', { signal: AbortSignal.timeout(1_000) })).ok }
        catch { return false }
      }, { timeout: 60_000, message: 'Launcher health check' }).toBe(true)
      await expect.poll(() => output).toContain(lan ? 'Server ready.' : 'Idle Buds is listening')
      if (lan) {
        expect(output).toContain(url)
        expect(output).toContain(`http://localhost:${port}`)
      }
    },
    async stop() {
      if (child.exitCode === null && child.signalCode === null) {
        if (process.platform === 'win32') child.send('shutdown', () => {})
        else child.kill('SIGINT')
      }
      const code = await exited
      expect(code, output).toBe(0)
    },
  }
}

async function authenticate(page: Page, url: string, username: string, login = false) {
  await page.goto(url)
  if (login) await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: login ? 'Sign in to outpost' : 'Register', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your outpost', level: 1 })).toBeVisible()
}

test('explicit LAN launcher serves nonsecure browsers, retries, multiplayer and persistent development saves', async ({ page, browser }) => {
  // Never expose the fixture database: create an isolated normal-name database
  // inside the disposable test service, and remove it after verification.
  const testUrl = process.env.DATABASE_URL
  if (!testUrl || process.env.IDLE_BUDS_TEST_DATABASE !== '1') throw new Error('Use npm run test:browser.')
  const destination = assertTestDatabase(testUrl)
  const databaseName = 'idle_buds_lan_' + crypto.randomUUID().replaceAll('-', '')
  const admin = new Pool({ connectionString: testUrl })
  const address = lanAddresses()[0]
  expect(address, 'A private IPv4 interface is required for actual LAN browser verification').toBeTruthy()
  const port = await freePort()
  const url = `http://${address}:${port}`
  const localUrl = `http://127.0.0.1:${port}`
  destination.pathname = '/' + databaseName
  const database = destination.toString()
  let server: ReturnType<typeof launch> | undefined
  let created = false
  const other = await browser.newContext({ viewport: page.viewportSize() })
  try {
    await admin.query(`CREATE DATABASE ${databaseName}`)
    created = true
    const fixtureGuard = spawnSync(process.execPath, ['tools/play.mjs', '--lan', '--fixtures'], {
      env: { ...process.env, DATABASE_URL: testUrl }, encoding: 'utf8', timeout: 10_000,
    })
    expect(fixtureGuard.status).toBe(1)
    expect(fixtureGuard.stderr).toContain('LAN play cannot serve public fixture accounts')
    const databaseGuard = spawnSync(process.execPath, ['tools/play.mjs', '--lan'], {
      env: { ...process.env, DATABASE_URL: testUrl }, encoding: 'utf8', timeout: 10_000,
    })
    expect(databaseGuard.status).toBe(1)
    expect(databaseGuard.stderr).toContain('disposable fixture database')
    const remoteGuard = spawnSync(process.execPath, ['server/index.ts'], {
      env: { ...process.env, DATABASE_URL: database, HOST: '0.0.0.0', ALLOWED_ORIGIN: url, IDLE_BUDS_INVITE: '' },
      encoding: 'utf8', timeout: 10_000,
    })
    expect(remoteGuard.status).toBe(1)
    expect(remoteGuard.stderr).toContain('Nonloopback binding requires an HTTPS')

    server = launch(database, port, true)
    await server.ready(url)
    expect(await reachable(address, Number(destination.port || 5432))).toBe(false)
    const beta = await other.newPage()
    await authenticate(page, url, 'lan_alpha')
    await authenticate(beta, url, 'lan_beta')
    expect(await page.evaluate(() => ({ secure: isSecureContext, uuid: typeof crypto.randomUUID,
      random: typeof crypto.getRandomValues }))).toEqual({ secure: false, uuid: 'undefined', random: 'function' })
    const session = (await page.context().cookies(url)).find((cookie) => cookie.name === 'idle_buds_session')
    expect(session).toMatchObject({ httpOnly: true, sameSite: 'Strict', secure: false })
    const foreign = await page.request.post(url + '/api/login', {
      headers: { origin: 'http://unrelated.example' }, data: { username: 'lan_alpha', password },
    })
    expect(foreign.status()).toBe(403)
    const missing = await page.request.post(url + '/api/login', { data: { username: 'lan_alpha', password } })
    expect(missing.status()).toBe(403)

    let firstId: string | undefined
    let retryId: string | undefined
    await page.route('**/api/command', async (route) => {
      const body = route.request().postDataJSON() as { id: string }
      if (!firstId) {
        firstId = body.id
        expect((await route.fetch()).ok()).toBe(true)
        await route.abort('failed')
      } else {
        retryId = body.id
        await route.continue()
      }
    })
    for (const tender of [page, beta]) {
      await tender.getByRole('link', { name: /Mining/ }).first().click()
      const salvage = tender.getByRole('article', { name: 'Salvage Verge' })
      await salvage.getByLabel('Cycles').selectOption('10')
      await salvage.getByRole('button', { name: 'Start gathering' }).click()
      if (tender === page) {
        await page.getByRole('button', { name: 'Retry action' }).click()
        await expect.poll(() => retryId).toEqual(firstId)
        expect(firstId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
        await page.unroute('**/api/command')
      }
    }
    const state = async (tender: Page) =>
      (await (await tender.request.get(url + '/api/state')).json() as { username: string; state: PlayerView })
    await expect.poll(async () => (await state(page)).state.stats.gathered, { timeout: 60_000 }).toBeGreaterThanOrEqual(5)
    await expect.poll(async () => (await state(beta)).state.stats.gathered, { timeout: 60_000 }).toBeGreaterThanOrEqual(5)
    expect((await state(page)).username).toBe('lan_alpha')
    expect((await state(beta)).username).toBe('lan_beta')
    await Promise.all([page.getByRole('link', { name: 'Community' }).click(), beta.getByRole('link', { name: 'Community' }).click()])
    const message = 'LAN multiplayer verification'
    await page.getByLabel('Message', { exact: true }).fill(message)
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(beta.getByText(message, { exact: true })).toBeVisible()
    const gathered = (await state(page)).state.stats.gathered

    await server.stop()
    server = undefined
    expect(await reachable(address, port)).toBe(false)
    server = launch(database, port, false)
    await server.ready(localUrl)
    expect(await reachable(address, port)).toBe(false)
    await authenticate(page, localUrl, 'lan_alpha', true)
    const saved = await (await page.request.get(localUrl + '/api/state')).json() as { state: PlayerView }
    expect(saved.state.stats.gathered).toBeGreaterThanOrEqual(gathered)
    await server.stop()
    server = undefined
    server = launch(database, port, true)
    await server.ready(url)
    await beta.reload()
    await expect(beta.getByRole('heading', { name: 'Community', level: 1 })).toBeVisible()
    await expect(beta.getByText(message, { exact: true })).toBeVisible()
  } finally {
    await other.close()
    try { await server?.stop() }
    finally {
      try { if (created) await admin.query(`DROP DATABASE ${databaseName} WITH (FORCE)`) }
      finally { await admin.end() }
    }
  }
})
