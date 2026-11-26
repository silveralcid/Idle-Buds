import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import type { OutgoingHttpHeaders } from 'node:http'
import { Pool } from 'pg'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../server/app.ts'
import { moderate, reports } from '../../server/moderation.ts'
import type { WorldCommand, WorldView } from '../../server/world-types.ts'
import { NODES } from '../../src/data/index.ts'
import { OFFLINE_CAP_MS, resolveBattle, inventorySlotsUsed, SAVE_VERSION } from '../../src/game/index.ts'
import type { AdvanceSummary, BattleResult, BattleTeam, GameCommand, GameState, PlayerView } from '../../src/game/types.ts'
import { FIXTURE_PASSWORD, progressedFixture } from '../../tools/fixtures.ts'

const testUrl = process.env.DATABASE_URL
if (!testUrl || process.env.IDLE_BUDS_TEST_DATABASE !== '1') throw new Error('Run integration tests with npm run test:integration.')
const destination = new URL(testUrl)
if (!['postgres:', 'postgresql:'].includes(destination.protocol)
  || !['127.0.0.1', 'localhost', '[::1]'].includes(destination.hostname)
  || destination.pathname !== '/idle_buds_test' || destination.search || destination.hash) {
  throw new Error('Integration fixtures require the disposable loopback idle_buds_test database.')
}

const pool = new Pool({ connectionString: testUrl, max: 12 })
const origin = 'http://127.0.0.1:4173'
let now: number
let app: Awaited<ReturnType<typeof buildApp>>

interface StateResponse {
  username: string
  state: PlayerView
  summary: AdvanceSummary
  message?: string
}

type Command = GameCommand | WorldCommand

function headers(cookie?: string) {
  return cookie ? { origin, cookie, 'content-type': 'application/json' } : { origin, 'content-type': 'application/json' }
}

function post(path: string, body: Record<string, unknown>, cookie?: string) {
  return app.inject({ method: 'POST', url: '/api/' + path, headers: headers(cookie), payload: body })
}

function sessionFrom(response: { headers: OutgoingHttpHeaders }) {
  const entry = response.headers['set-cookie']
  return (Array.isArray(entry) ? entry[0] : entry)?.split(';')[0] ?? ''
}

async function register(username: string, progressed = false) {
  const response = await post('register', { username, password: FIXTURE_PASSWORD })
  expect(response.statusCode, response.body).toBe(200)
  const cookie = sessionFrom(response)
  expect(cookie).toMatch(/^idle_buds_session=[0-9A-Za-z_-]{43}$/)
  if (progressed) {
    const fixture = progressedFixture(username, now)
    fixture.stats.gathered = 25
    await pool.query('UPDATE players p SET state = $2 FROM accounts a WHERE p.account_id = a.id AND a.username = $1',
      [username, fixture])
  }
  return cookie
}

function send(cookie: string, command: Command, id: string = randomUUID()) {
  return post('command', { id, command }, cookie)
}

async function command(cookie: string, input: Command, id?: string) {
  const response = await send(cookie, input, id)
  expect(response.statusCode, response.body).toBe(200)
  return response.json<StateResponse>()
}

async function player(cookie: string) {
  const response = await app.inject({ method: 'GET', url: '/api/state', headers: { cookie } })
  expect(response.statusCode, response.body).toBe(200)
  return response.json<StateResponse>()
}

async function world(cookie: string) {
  const response = await app.inject({ method: 'GET', url: '/api/world', headers: { cookie } })
  expect(response.statusCode, response.body).toBe(200)
  return response.json<WorldView>()
}

beforeEach(async () => {
  const { rows: [target] } = await pool.query<{ name: string; host: string }>(
    'SELECT current_database() AS name, host(inet_server_addr()) AS host',
  )
  if (target.name !== 'idle_buds_test' || !['127.0.0.1', '::1'].includes(target.host)) {
    throw new Error('Refusing to clear nonlocal or non-test data.')
  }
  await pool.query('TRUNCATE accounts, clans, store_stock CASCADE')
  now = Date.parse('2026-11-26T10:00:00.000Z')
  app = await buildApp({ pool, clock: () => now, allowedOrigin: origin })
})

afterEach(async () => { await app.close() })
afterAll(async () => { await pool.end() })

describe('durable authority and sessions', () => {
  it('isolates two accounts and keeps saves, live sessions, and receipts across server restart', async () => {
    const a = await register('alpha')
    const b = await register('beta')
    const base = await player(a)
    const order = { kind: 'gather', nodeId: 'earth-scrap', count: 4 } as const
    const receiptId = randomUUID()
    const input = { type: 'startActivity', order } as const
    const started = await command(a, input, receiptId)
    expect(started.state.activities.tender.order).toEqual(order)
    const { rows: [auth] } = await pool.query<{ password_hash: string; token_hash: string }>(
      `SELECT a.password_hash, s.token_hash FROM accounts a JOIN sessions s ON s.account_id = a.id WHERE a.username = 'alpha'`,
    )
    expect(auth.password_hash).toMatch(/^\$2[aby]\$12\$/)
    expect(auth.token_hash).toEqual(createHash('sha256').update(a.split('=')[1]).digest('hex'))
    expect(started.state).not.toHaveProperty('seed')
    expect(started.state).not.toHaveProperty('rngCounter')
    expect(started.state).not.toHaveProperty('eggGenetics')

    await app.close()
    app = await buildApp({ pool, clock: () => now, allowedOrigin: origin })
    now += NODES['earth-scrap'].durationMs * 2
    const returned = await player(a)
    expect(returned.state.inventory.scrap - (base.state.inventory.scrap ?? 0)).toBe(2)
    expect(returned.summary.items.scrap).toBe(2)
    expect(returned.summary.cycles).toBe(2)
    const other = await player(b)
    expect(other.state.inventory.scrap ?? 0).toBe(base.state.inventory.scrap ?? 0)
    expect(other.state.activities).toEqual({})
    expect(await command(a, input, receiptId)).toEqual(started)
    expect((await player(a)).state.inventory.scrap).toBe(returned.state.inventory.scrap)
  })

  it('requires a matching origin, JSON, a strong password and valid authenticated sessions', async () => {
    const payload = { username: 'alpha', password: FIXTURE_PASSWORD }
    const foreign = await app.inject({
      method: 'POST', url: '/api/register',
      headers: { 'content-type': 'application/json', origin: 'https://unrelated.example' }, payload,
    })
    expect(foreign.statusCode).toBe(403)
    expect((await app.inject({ method: 'GET', url: '/api/state' })).statusCode).toBe(401)
    expect((await app.inject({
      method: 'POST', url: '/api/register', headers: { origin, 'content-type': 'text/plain' }, payload: 'invalid',
    })).statusCode).toBe(415)
    expect((await post('register', { username: 'alpha', password: 'small' })).statusCode).toBe(400)
    expect((await post('register', { username: 'alpha', password: 'é'.repeat(37) })).statusCode).toBe(400)

    const a = await register('alpha')
    expect((await post('login', { username: 'alpha', password: 'invalid-password-2026' })).statusCode).toBe(401)
    const login = await post('login', payload, a)
    expect(login.statusCode, login.body).toBe(200)
    expect(String(login.headers['set-cookie'])).toMatch(/HttpOnly.*SameSite=Strict/i)
    const rotated = sessionFrom(login)
    expect(rotated).not.toBe(a)
    expect((await app.inject({ method: 'GET', url: '/api/state', headers: { cookie: a } })).statusCode).toBe(401)
    expect((await post('logout', {}, rotated)).statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: '/api/world', headers: { cookie: rotated } })).statusCode).toBe(401)
    const expired = sessionFrom(await post('login', payload))
    await pool.query("UPDATE sessions SET expires_at = now() - interval '1 second'")
    expect((await app.inject({ method: 'GET', url: '/api/state', headers: { cookie: expired } })).statusCode).toBe(401)
  })

  it('keeps a disposable database behind a loopback origin even with an external invite', () => {
    const boot = spawnSync(process.execPath, ['server/index.ts'], {
      env: { ...process.env, HOST: '127.0.0.1', ALLOWED_ORIGIN: 'https://public.example', IDLE_BUDS_INVITE: 'private-check-invite' },
      timeout: 5_000,
      encoding: 'utf8',
    })
    expect(boot.status).toBe(1)
    expect(boot.stderr).toContain('disposable playtest database is restricted')
  })

  it('requires invites off loopback and issues a Secure cookie for the configured origin', async () => {
    await app.close()
    const external = 'https://playtest.example'
    const inviteCode = 'fixture-invite-long-enough'
    await expect(buildApp({ pool, allowedOrigin: external })).rejects.toThrow(/invite/)
    app = await buildApp({ pool, clock: () => now, allowedOrigin: external, inviteCode })
    const payload = { username: 'invited', password: FIXTURE_PASSWORD }
    const request = (invite?: string) => app.inject({
      method: 'POST', url: '/api/register',
      headers: { 'content-type': 'application/json', origin: external }, payload: { ...payload, invite },
    })
    expect((await request()).statusCode).toBe(403)
    const allowed = await request(inviteCode)
    expect(allowed.statusCode, allowed.body).toBe(200)
    expect(String(allowed.headers['set-cookie'])).toMatch(/Secure/i)
  })

  it('keeps a rejected command receipt immutable after the player becomes eligible', async () => {
    const a = await register('alpha')
    const id = randomUUID()
    const craft = { type: 'startActivity', order: { kind: 'gather', nodeId: 'glass-quartz' } } as const
    const rejected = await send(a, craft, id)
    expect(rejected.statusCode, rejected.body).toBe(409)
    await command(a, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: 6 } })
    now += NODES['earth-scrap'].durationMs * 6
    expect((await player(a)).state.inventory.scrap).toBe(6)
    const retried = await send(a, craft, id)
    expect(retried.statusCode).toBe(409)
    expect(retried.json()).toEqual(rejected.json())
    expect((await command(a, craft)).state.activities.tender.order).toEqual(craft.order)
  })

  it('rejects forged authority fields, treats equivalent JSON retries alike, and rejects UUID reuse for different commands', async () => {
    const a = await register('alpha')
    const id = randomUUID()
    const order = { kind: 'gather', nodeId: 'earth-scrap', count: 5 } as const
    expect((await post('command', { id, playerId: 'beta', command: { type: 'startActivity', order } }, a)).statusCode).toBe(400)
    expect((await post('command', { id, command: { type: 'startActivity', order, time: now + 99_000, coins: 1000 } }, a)).statusCode).toBe(400)
    expect((await post('command', { id, command: { type: 'startActivity', order: { ...order, nodeId: 'constructor' } } }, a)).statusCode).toBe(400)
    const [first, duplicate] = await Promise.all([
      post('command', { id, command: { type: 'startActivity', order } }, a),
      post('command', { command: { order: { count: 5, nodeId: 'earth-scrap', kind: 'gather' }, type: 'startActivity' }, id }, a),
    ])
    expect(first.statusCode, first.body).toBe(200)
    expect(duplicate.statusCode, duplicate.body).toBe(200)
    expect(duplicate.json()).toEqual(first.json())
    expect((await send(a, { type: 'stopActivity' }, id)).statusCode).toBe(409)
    expect((await player(a)).state.activities.tender.order).toEqual(order)
    const count = await pool.query<{ n: number }>('SELECT count(*)::integer AS n FROM command_receipts')
    expect(count.rows[0].n).toBe(1)
  })
})

describe('experience save and capacity integrity', () => {
  it('migrates an old full save on a real request, once, without deleting any assets', async () => {
    const cookie = await register('legacy', true)
    const fixture = progressedFixture('legacy', now)
    fixture.version = 1
    fixture.upgrades.remote = 1
    Reflect.deleteProperty(fixture, 'pendingRewards')
    Reflect.deleteProperty(fixture, 'storageReservations')
    fixture.equipment = Array.from({ length: 50 }, (_, index) => ({
      id: `legacy-${index}`, definitionId: 'scrap-blade', slot: 'weapon' as const, bonus: 2,
    }))
    await pool.query('UPDATE players p SET state = $2 FROM accounts a WHERE p.account_id = a.id AND a.username = $1', ['legacy', fixture])
    const migrated = await player(cookie)
    expect(migrated.state.version).toBe(SAVE_VERSION)
    expect(migrated.state.equipment).toEqual(fixture.equipment)
    expect(migrated.state.inventory.quartz).toBe(32)
    expect(migrated.state.inventory['portal-compound']).toBe(32)
    expect(migrated.state.coins).toBe(1045)
    expect(migrated.state.upgrades.remote).toBe(0)
    await app.close()
    app = await buildApp({ pool, clock: () => now, allowedOrigin: origin })
    expect((await player(cookie)).state).toEqual(migrated.state)
    expect((await command(cookie, { type: 'store.buy', itemId: 'scrap', quantity: 2 })).state.inventory.scrap).toBe(32)
  })

  it('keeps one completed gear roll through a server restart and retries, then automatically stores it when equipped gear frees a slot', async () => {
    const cookie = await register('pending', true)
    const fixture = progressedFixture('pending', now)
    fixture.upgrades.storage = 0
    fixture.inventory = { scrap: 30, fiber: 30 }
    fixture.equipment = Array.from({ length: 21 }, (_, index) => ({
      id: `existing-${index}`, definitionId: 'scrap-blade', slot: 'weapon' as const, bonus: 2,
    }))
    await pool.query('UPDATE players p SET state = $2 FROM accounts a WHERE p.account_id = a.id AND a.username = $1', ['pending', fixture])
    await command(cookie, { type: 'startActivity', order: { kind: 'craft', recipeId: 'scrap-blade', markMaker: true } })
    const { rows: [row] } = await pool.query<{ state: GameState }>('SELECT p.state FROM players p JOIN accounts a ON a.id = p.account_id WHERE a.username = $1', ['pending'])
    row.state.equipment.push({ id: 'new-arrival', definitionId: 'fiber-vest', slot: 'armor', bonus: 2 })
    await pool.query('UPDATE players p SET state = $2 FROM accounts a WHERE p.account_id = a.id AND a.username = $1', ['pending', row.state])
    now += 7_000
    const blocked = await player(cookie)
    expect(blocked.state.pendingRewards.tender.gear).toHaveLength(1)
    const earned = blocked.state.pendingRewards.tender.gear[0]
    await app.close()
    app = await buildApp({ pool, clock: () => now, allowedOrigin: origin })
    now += 90_000
    expect((await player(cookie)).state.pendingRewards.tender.gear).toEqual([earned])
    const id = randomUUID()
    const equip = { type: 'equip', slot: 'weapon', gearId: 'existing-0' } as const
    const released = await command(cookie, equip, id)
    expect(released.state.pendingRewards).toEqual({})
    expect(released.state.equipment.filter((entry) => entry.id === earned.id)).toEqual([earned])
    expect(released.state.stats.crafted).toBe(fixture.stats.crafted + 1)
    expect(await command(cookie, equip, id)).toEqual(released)
    expect((await player(cookie)).state.equipment.filter((entry) => entry.id === earned.id)).toHaveLength(1)
  })

  it('reserves sell-escrow slots and returns cancelled gear without loss while a full inventory waits', async () => {
    const cookie = await register('seller', true)
    const fixture = progressedFixture('seller', now)
    fixture.upgrades.storage = 0
    fixture.inventory = { scrap: 30 }
    fixture.equipment = Array.from({ length: 23 }, (_, index) => ({
      id: `escrow-${index}`, definitionId: 'scrap-blade', slot: 'weapon' as const, bonus: 2,
    }))
    await pool.query('UPDATE players p SET state = $2 FROM accounts a WHERE p.account_id = a.id AND a.username = $1', ['seller', fixture])
    const listed = await command(cookie, { type: 'market.list', asset: { kind: 'gear', instanceId: 'escrow-0' }, quantity: 1, unitPrice: 10 })
    expect(inventorySlotsUsed(listed.state)).toBe(24)
    expect(listed.state.equipment).toHaveLength(22)
    const [listing] = (await world(cookie)).listings
    const waiting = await command(cookie, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-fiber' } })
    expect(waiting.state.activities.tender.status).toBe('blocked')
    expect((await send(cookie, { type: 'store.buy', itemId: 'fiber', quantity: 1 })).statusCode).toBe(409)
    const returned = await command(cookie, { type: 'market.cancel', listingId: listing.id })
    expect(returned.state.equipment).toHaveLength(23)
    expect(returned.state.equipment.find((entry) => entry.id === 'escrow-0')).toEqual(fixture.equipment[0])
    expect(returned.state.storageReservations).toEqual({})
    expect(inventorySlotsUsed(returned.state)).toBe(24)
    expect((await world(cookie)).listings).toEqual([])
    const freed = await command(cookie, { type: 'equip', slot: 'weapon', gearId: 'escrow-0' })
    expect(freed.state.activities.tender.status).toBe('running')
  })
})

describe('multiplayer settlements', () => {
  it('funds buy orders, handles partial fills and retries, and returns exact residual escrow', async () => {
    const a = await register('alpha', true)
    const b = await register('beta', true)
    const funded = await command(a, { type: 'market.order', itemId: 'fiber', quantity: 8, unitPrice: 10 })
    expect(funded.state.coins).toBe(920)
    const [listing] = (await world(b)).listings
    expect(listing).toMatchObject({ side: 'buy', owner: 'alpha', remaining: 8 })
    const id = randomUUID()
    const fill = { type: 'market.fill', listingId: listing.id, quantity: 3 } as const
    const first = await command(b, fill, id)
    expect(first.state.coins).toBe(1028)
    expect(first.state.inventory.fiber).toBe(27)
    expect(await command(b, fill, id)).toEqual(first)
    expect((await world(a)).listings[0].remaining).toBe(5)
    expect((await send(b, { type: 'market.cancel', listingId: listing.id })).statusCode).toBe(403)
    const cancelled = await command(a, { type: 'market.cancel', listingId: listing.id })
    expect(cancelled.state.inventory.fiber).toBe(33)
    expect(cancelled.state.coins).toBe(970)
    expect((await world(a)).listings).toHaveLength(0)
    expect((await send(b, fill)).statusCode).toBe(404)
    const { rows: fills } = await pool.query('SELECT gross, tax, quantity FROM market_fills')
    expect(fills).toEqual([{ gross: 30, tax: 2, quantity: 3 }])
    expect(cancelled.state.coins + (await player(b)).state.coins).toBe(1998)
  })

  it('keeps several remote trades within one offline limit and delivers the return summary once', async () => {
    const a = await register('alpha', true)
    const b = await register('beta', true)
    await command(a, { type: 'market.list', asset: { kind: 'item', itemId: 'fiber' }, quantity: 3, unitPrice: 10 })
    const [listing] = (await world(b)).listings
    const started = await command(a, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: 4 } })
    const originTime = now
    const interval = started.state.activities.tender.durationMs
    const fill = { type: 'market.fill', listingId: listing.id, quantity: 1 } as const
    now = originTime + interval
    await command(b, fill)
    now = originTime + OFFLINE_CAP_MS + interval
    await command(b, fill)
    now += interval
    const returned = await player(a)
    expect(returned.summary.from).toBe(originTime)
    expect(returned.summary.simulatedMs).toBe(OFFLINE_CAP_MS)
    expect(returned.summary.discardedMs).toBe(interval * 2)
    expect(returned.summary.cycles).toBe(4)
    expect(returned.summary.items.scrap).toBe(8)
    expect(returned.state.inventory.scrap).toBe(38)
    expect(returned.state.coins).toBeGreaterThan(1018)
    expect((await player(a)).summary).toMatchObject({ simulatedMs: 0, cycles: 0, items: {} })
    now -= 1000
    expect((await player(a)).state.lastAt).toBe(returned.state.lastAt)
  })

  it('escrows crafted equipment, rejects an equipped sale and preserves its maker on transfer', async () => {
    const a = await register('alpha', true)
    const b = await register('beta', true)
    const started = await command(a, {
      type: 'startActivity', order: { kind: 'craft', recipeId: 'scrap-blade', markMaker: true },
    })
    now += started.state.activities.tender.durationMs
    const before = await player(a)
    const gear = before.state.equipment[0]
    expect(gear).toMatchObject({ definitionId: 'scrap-blade', maker: 'alpha' })
    await command(a, { type: 'equip', slot: 'weapon', gearId: gear.id })
    const list = { type: 'market.list', asset: { kind: 'gear', instanceId: gear.id }, quantity: 1, unitPrice: 70 } as const
    expect((await send(a, list)).statusCode).toBe(409)
    await command(a, { type: 'equip', slot: 'weapon', gearId: null })
    const escrow = await command(a, list)
    expect(escrow.state.equipment).toEqual([])
    const [listing] = (await world(b)).listings
    expect(listing.gear).toEqual(gear)
    const bought = await command(b, { type: 'market.fill', listingId: listing.id, quantity: 1 })
    expect(bought.state.equipment).toEqual([gear])
    expect(bought.state.coins).toBe(930)
    expect((await player(a)).state.coins).toBe(before.state.coins + 66)
  })

  it('awards exactly one owner after 100 concurrent unique Bud fills', async () => {
    const seller = await register('seller', true)
    const a = await register('alpha', true)
    const b = await register('beta', true)
    const fresh = await register('fresh')
    // Unlock ordinary trading while keeping the earned-catch requirement unsatisfied.
    await pool.query("UPDATE players p SET state = jsonb_set(state, '{stats,gathered}', '5') FROM accounts a WHERE p.account_id = a.id AND a.username = 'fresh'")
    const original = (await player(seller)).state.buds[0]
    const committed = (await player(seller)).state.formation[0]
    expect((await send(seller, { type: 'market.list', asset: { kind: 'bud', instanceId: committed }, quantity: 1, unitPrice: 100 })).statusCode).toBe(409)
    await command(seller, { type: 'market.list', asset: { kind: 'bud', instanceId: original.id }, quantity: 1, unitPrice: 100 })
    const listing = (await world(a)).listings[0]
    expect(listing.bud).toEqual(original)
    const fill = { type: 'market.fill', listingId: listing.id, quantity: 1 } as const
    expect((await send(fresh, fill)).statusCode).toBe(409)

    const responses = await Promise.all(Array.from({ length: 100 }, (_value, index) => send(index % 2 ? a : b, fill)))
    expect(responses.filter((response) => response.statusCode === 200)).toHaveLength(1)
    expect(responses.filter((response) => response.statusCode === 404)).toHaveLength(99)
    const [aState, bState, sellerState] = await Promise.all([player(a), player(b), player(seller)])
    const all = [aState.state, bState.state, sellerState.state]
    const owners = all.filter((state) => state.buds.some((bud) => bud.id === original.id))
    expect(owners).toHaveLength(1)
    expect(owners[0].buds.find((bud) => bud.id === original.id)).toEqual(original)
    expect(owners[0].coins).toBe(900)
    expect(sellerState.state.coins).toBe(1095)
    expect(all.reduce((total, state) => total + state.coins, 0)).toBe(2995)
    expect((await world(seller)).listings).toHaveLength(0)
  })

  it('keeps resource fill/cancel races and fallback stock consistent', async () => {
    const a = await register('alpha', true)
    const b = await register('beta', true)
    await command(a, { type: 'market.list', asset: { kind: 'item', itemId: 'fiber' }, quantity: 5, unitPrice: 10 })
    const [listing] = (await world(a)).listings
    const options = await Promise.all([
      send(a, { type: 'market.cancel', listingId: listing.id }),
      send(b, { type: 'market.fill', listingId: listing.id, quantity: 5 }),
    ])
    expect(options.map((response) => response.statusCode).sort()).toEqual([200, 404])
    const aView = (await player(a)).state
    const bView = (await player(b)).state
    expect(aView.inventory.fiber + bView.inventory.fiber).toBe(60)
    expect(aView.coins + bView.coins).toBe(options[1].statusCode === 200 ? 1997 : 2000)

    const initial = (await world(b)).store.find((line) => line.itemId === 'scrap')!
    await command(b, { type: 'store.buy', itemId: 'scrap', quantity: initial.quantity })
    expect((await world(a)).store.find((line) => line.itemId === 'scrap')?.quantity).toBe(0)
    expect((await send(a, { type: 'store.buy', itemId: 'scrap', quantity: 1 })).statusCode).toBe(409)
    now += 300_000
    expect((await world(a)).store.find((line) => line.itemId === 'scrap')?.quantity).toBe(1)
    await command(b, { type: 'store.sell', itemId: 'scrap', quantity: 1 })
    const after = (await player(b)).state
    expect(after.coins).toBe(bView.coins - initial.quantity * initial.buyPrice + initial.sellPrice)
    expect((await world(a)).store.find((line) => line.itemId === 'scrap')?.quantity).toBe(2)
  })
})

describe('community and ranked', () => {
  it('persists chat controls, reports, friends and an exactly-once shared clan goal', async () => {
    const a = await register('alpha', true)
    const b = await register('beta', true)
    await command(a, { type: 'social.friend', username: 'beta' })
    expect((await world(b)).friends).toEqual([{ username: 'alpha', status: 'incoming' }])
    await command(b, { type: 'social.friend', username: 'alpha' })
    expect((await world(a)).friends).toEqual([{ username: 'beta', status: 'accepted' }])
    expect((await send(a, { type: 'chat.send', text: 'line 1\nline 2' })).statusCode).toBe(400)
    await command(a, { type: 'chat.send', text: 'Anyone gathering fiber?' })
    expect((await send(a, { type: 'chat.send', text: 'This is too soon.' })).statusCode).toBe(429)
    const [message] = (await world(b)).chat
    expect(message.text).toBe('Anyone gathering fiber?')
    await command(b, { type: 'chat.report', messageId: message.id, reason: 'Please review.' })
    await command(b, { type: 'chat.report', messageId: message.id, reason: 'Duplicate from same reporter.' })
    const { rows: reports } = await pool.query('SELECT reason FROM chat_reports')
    expect(reports).toEqual([{ reason: 'Please review.' }])
    await command(b, { type: 'social.mute', username: 'alpha' })
    expect((await world(b)).chat).toEqual([])
    expect((await world(b)).friends).toHaveLength(1)
    await command(b, { type: 'social.unmute', username: 'alpha' })
    await command(b, { type: 'social.block', username: 'alpha' })
    expect((await world(b)).chat).toEqual([])
    expect((await world(a)).friends).toHaveLength(0)
    expect((await send(a, { type: 'social.friend', username: 'beta' })).statusCode).toBe(409)

    await command(b, { type: 'social.unblock', username: 'alpha' })
    await command(a, { type: 'clan.create', name: 'Fiber Foundry' })
    await command(b, { type: 'clan.join', name: 'fiber foundry' })
    const contributionId = randomUUID()
    const contribution = { type: 'clan.contribute', quantity: 20 } as const
    expect((await command(a, contribution, contributionId)).state.inventory.fiber).toBe(10)
    expect((await command(a, contribution, contributionId)).state.inventory.fiber).toBe(10)
    await command(b, contribution)
    expect((await world(a)).clan).toEqual({
      name: 'fiber foundry', total: 40, target: 40, contributed: 20, bonus: true,
    })
    expect((await send(b, contribution)).statusCode).toBe(409)
    expect((await player(b)).state.inventory.fiber).toBe(10)
  })

  it('lets the database operator review and hide reports and revoke a banned account permanently', async () => {
    const a = await register('alpha', true)
    const b = await register('beta', true)
    await command(b, { type: 'chat.send', text: 'A reportable message.' })
    const [message] = (await world(a)).chat
    await command(a, { type: 'chat.report', messageId: message.id, reason: 'Review requested.' })
    expect(await reports(pool)).toMatchObject([{
      message_id: message.id, sender: 'beta', reporter: 'alpha', reason: 'Review requested.',
    }])
    expect(await moderate(pool, 'hide', message.id)).toBe(true)
    expect((await world(a)).chat).toHaveLength(0)
    expect(await moderate(pool, 'unhide', message.id)).toBe(true)
    expect((await world(a)).chat).toHaveLength(1)
    expect((await post('command', { id: randomUUID(), command: { type: 'moderation.ban', username: 'beta' } }, a)).statusCode).toBe(400)

    await command(b, { type: 'pvp.publish' })
    await command(b, { type: 'market.list', asset: { kind: 'item', itemId: 'scrap' }, quantity: 2, unitPrice: 15 })
    const [listing] = (await world(a)).listings
    expect(await moderate(pool, 'ban', 'beta')).toBe(true)
    expect((await app.inject({ method: 'GET', url: '/api/state', headers: { cookie: b } })).statusCode).toBe(401)
    expect((await post('login', { username: 'beta', password: FIXTURE_PASSWORD })).statusCode).toBe(401)
    const disabled = await world(a)
    expect(disabled).toMatchObject({ chat: [], listings: [], ranked: { leaders: [] } })
    expect((await send(a, { type: 'market.fill', listingId: listing.id, quantity: 1 })).statusCode).toBe(404)

    expect(await moderate(pool, 'unban', 'beta')).toBe(true)
    expect((await app.inject({ method: 'GET', url: '/api/state', headers: { cookie: b } })).statusCode).toBe(401)
    expect((await post('login', { username: 'beta', password: FIXTURE_PASSWORD })).statusCode).toBe(200)
    expect((await world(a)).listings[0].id).toBe(listing.id)
  })

  it('uses blind snapshot matching, honors no-match and cooldown states, and replays the shared battle result', async () => {
    const a = await register('alpha', true)
    const b = await register('beta', true)
    await command(a, { type: 'pvp.publish' })
    expect((await send(a, { type: 'pvp.match' })).statusCode).toBe(409)
    expect((await post('command', { id: randomUUID(), command: { type: 'pvp.match', target: 'beta' } }, a)).statusCode).toBe(400)
    await command(b, { type: 'pvp.publish' })
    const { rows: [snapshot] } = await pool.query<{ team: BattleTeam }>(
      "SELECT d.team FROM pvp_defenses d JOIN accounts a ON a.id = d.account_id WHERE a.username = 'beta'",
    )
    await command(b, { type: 'setFormation', budIds: [] })
    const id = randomUUID()
    const input = { type: 'pvp.match' } as const
    const first = await command(a, input, id)
    expect(await command(a, input, id)).toEqual(first)
    const { rows: matches } = await pool.query<{
      attacker_team: BattleTeam
      defender_team: BattleTeam
      seed: string
      result: BattleResult
      attacker_change: number
      defender_change: number
    }>('SELECT * FROM pvp_matches')
    expect(matches).toHaveLength(1)
    expect(matches[0].defender_team).toEqual(snapshot.team)
    expect(resolveBattle(matches[0].attacker_team, snapshot.team, matches[0].seed)).toEqual(matches[0].result)
    expect(matches[0].attacker_change).toBe(-matches[0].defender_change)
    const [aRank, bRank] = await Promise.all([world(a), world(b)])
    expect(aRank.ranked.rating + bRank.ranked.rating).toBe(2000)
    expect(aRank.ranked.history[0].opponent).toBe('beta')
    expect(bRank.ranked.history[0].isAttacker).toBe(false)
    expect((await send(a, input)).statusCode).toBe(429)
    now += 31_000
    expect((await send(a, input)).statusCode).toBe(409)
  })
})
