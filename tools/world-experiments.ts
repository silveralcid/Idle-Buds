import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { Pool } from 'pg'
import { buildApp } from '../server/app.ts'
import type { WorldCommand, WorldView } from '../server/world-types.ts'
import { ITEM_DEFINITIONS } from '../src/data/index.ts'
import { RULES_VERSION } from '../src/game/index.ts'
import type { AdvanceSummary, GameCommand, PlayerView } from '../src/game/types.ts'
import { assertTestDatabase } from './database-guard.ts'
import { FIXTURE_PASSWORD, progressedFixture } from './fixtures.ts'

const COHORTS = ['empty', 'low', 'active'] as const
const ACCOUNT_NAMES = ['alpha', 'beta'] as const
const DAY_MS = 86_400_000
const START = Date.parse('2026-11-26T00:00:00Z')
const ORIGIN = 'http://127.0.0.1:3000'
const OUTPUT = '.repo-local/world-experiments.json'

type Cohort = (typeof COHORTS)[number]
type Name = (typeof ACCOUNT_NAMES)[number]
type Command = GameCommand | WorldCommand
type Items = Record<string, number>

interface StateResponse {
  state: PlayerView
  summary: AdvanceSummary
}

interface Ledger {
  gatherCredits: number
  npcBuybackCredits: number
  npcPurchaseCredits: number
  marketFills: number
  marketUnits: number
  marketGrossCredits: number
  marketTaxCredits: number
  gatheredItems: Items
  boughtFromNpc: Items
  soldToNpc: Items
}

function addCounts(target: Items, delta: Items) {
  for (const [id, amount] of Object.entries(delta)) target[id] = (target[id] ?? 0) + amount
}

async function runCohort(pool: Pool, cohort: Cohort) {
  // The runner verifies the connected database before entering the cohorts.
  await pool.query('TRUNCATE accounts, clans, store_stock CASCADE')
  let now = START
  let day = 0
  const app = await buildApp({ pool, allowedOrigin: ORIGIN, clock: () => now })
  const cookies = new Map<string, string>()
  const commandLog: { day: number; account: string; id: string; command: Command; walletAfter: number }[] = []

  async function register(account: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/register',
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      payload: { username: account, password: FIXTURE_PASSWORD },
    })
    assert.equal(response.statusCode, 200, response.body)
    const entry = response.headers['set-cookie']
    const data = Array.isArray(entry) ? entry[0] : entry
    const cookie = data?.split(';')[0]
    assert.ok(cookie)
    cookies.set(account, cookie)
  }

  async function get<T>(account: string, path: 'state' | 'world') {
    const cookie = cookies.get(account)
    assert.ok(cookie)
    const response = await app.inject({ method: 'GET', url: '/api/' + path, headers: { cookie } })
    assert.equal(response.statusCode, 200, response.body)
    return response.json<T>()
  }

  async function command(account: string, input: Command): Promise<StateResponse> {
    const cookie = cookies.get(account)
    assert.ok(cookie)
    const id = randomUUID()
    const response = await app.inject({
      method: 'POST',
      url: '/api/command',
      headers: { origin: ORIGIN, cookie, 'content-type': 'application/json' },
      payload: { id, command: input },
    })
    assert.equal(response.statusCode, 200, `${cohort} day ${day}, ${account}, ${input.type}: ${response.body}`)
    const data = response.json<StateResponse>()
    commandLog.push({ day, account, id, command: input, walletAfter: data.state.coins })
    return data
  }

  async function runActivity(account: string, order: Extract<GameCommand, { type: 'startActivity' }>['order']) {
    const response = await command(account, { type: 'startActivity', order })
    const activity = response.state.activities.tender
    assert.ok(activity)
    return activity.durationMs * (order.count ?? 1)
  }

  const ledger: Ledger = {
    gatherCredits: 0, npcBuybackCredits: 0, npcPurchaseCredits: 0,
    marketFills: 0, marketUnits: 0, marketGrossCredits: 0, marketTaxCredits: 0,
    gatheredItems: {}, boughtFromNpc: {}, soldToNpc: {},
  }

  async function npc(account: Name, type: 'store.buy' | 'store.sell', itemId: string) {
    const [before, world] = await Promise.all([get<StateResponse>(account, 'state'), get<WorldView>(account, 'world')])
    const quote = world.store.find((line) => line.itemId === itemId)
    assert.ok(quote)
    assert.ok(quote.buyPrice > quote.sellPrice)
    const after = await command(account, { type, itemId, quantity: 1 })
    const buyer = type === 'store.buy'
    assert.equal(after.state.coins - before.state.coins, buyer ? -quote.buyPrice : quote.sellPrice)
    assert.equal((after.state.inventory[itemId] ?? 0) - (before.state.inventory[itemId] ?? 0), buyer ? 1 : -1)
    if (buyer) {
      ledger.npcPurchaseCredits += quote.buyPrice
      addCounts(ledger.boughtFromNpc, { [itemId]: 1 })
    } else {
      ledger.npcBuybackCredits += quote.sellPrice
      addCounts(ledger.soldToNpc, { [itemId]: 1 })
    }
    return after.state.coins
  }

  const days = []
  const roundTripLosses: number[] = []
  let pendingId: string | undefined
  let minnowRestock: { afterPurchase: number; nextDay: number; elapsedMs: number } | undefined
  let freshStart: { marketListings: number; credits: number; craftedCaptureKits: number } | undefined

  try {
    if (cohort === 'empty') {
      await register('fresh')
      now += await runActivity('fresh', { kind: 'gather', nodeId: 'earth-scrap', count: 3 })
      const gathered = await get<StateResponse>('fresh', 'state')
      assert.equal(gathered.state.inventory.scrap, 3)
      now += await runActivity('fresh', { kind: 'craft', recipeId: 'capture-kit' })
      const crafted = await get<StateResponse>('fresh', 'state')
      const world = await get<WorldView>('fresh', 'world')
      assert.equal(world.listings.length, 0)
      assert.equal(crafted.state.inventory['capture-kit'], 1)
      freshStart = { marketListings: 0, credits: crafted.state.coins, craftedCaptureKits: 1 }
    }

    for (const account of ACCOUNT_NAMES) {
      await register(account)
      await pool.query(
        'UPDATE players p SET state = $2 FROM accounts a WHERE a.id = p.account_id AND a.username = $1',
        [account, progressedFixture(account, now)],
      )
    }
    const [alpha, beta] = await Promise.all(ACCOUNT_NAMES.map((name) => get<StateResponse>(name, 'state')))
    const openingCredits = alpha.state.coins + beta.state.coins
    const openingItems = Object.fromEntries(Object.keys(ITEM_DEFINITIONS).map((id) => [
      id, (alpha.state.inventory[id] ?? 0) + (beta.state.inventory[id] ?? 0),
    ]))
    const epoch = now
    let minnowPurchaseTime = now
    for (day = 1; day <= 30; day++) {
      now = epoch + (day - 1) * DAY_MS
      if (pendingId) {
        await command('alpha', { type: 'market.cancel', listingId: pendingId })
        pendingId = undefined
      }
      const gatherTime = await Promise.all([
        runActivity('alpha', { kind: 'gather', nodeId: 'earth-scrap', count: 2 }),
        runActivity('beta', { kind: 'gather', nodeId: 'earth-fiber', count: 2 }),
      ])
      now += Math.max(...gatherTime)
      const gathered = await Promise.all(ACCOUNT_NAMES.map((name) => get<StateResponse>(name, 'state')))
      assert.equal(gathered[0].summary.items.scrap, 4)
      assert.equal(gathered[1].summary.items.fiber, 4)
      for (const { summary } of gathered) {
        assert.equal(summary.cycles, 2)
        assert.equal(summary.coins, 2)
        ledger.gatherCredits += summary.coins
        addCounts(ledger.gatheredItems, summary.items)
      }

      if (day % 7 === 1) {
        const before = gathered[0].state.coins
        await npc('alpha', 'store.buy', 'scrap')
        const after = await npc('alpha', 'store.sell', 'scrap')
        assert.ok(after < before)
        roundTripLosses.push(before - after)
      }
      if (day % 3 === 0) await npc('beta', 'store.sell', 'fiber')
      if (day === 1) {
        const initial = (await get<WorldView>('alpha', 'world')).store.find((line) => line.itemId === 'minnow')
        assert.ok(initial)
        await npc('alpha', 'store.buy', 'minnow')
        const purchased = (await get<WorldView>('alpha', 'world')).store.find((line) => line.itemId === 'minnow')
        assert.equal(purchased?.quantity, initial.quantity - 1)
        minnowPurchaseTime = now
        minnowRestock = { afterPurchase: purchased!.quantity, nextDay: 0, elapsedMs: 0 }
      }
      if (day === 2) {
        const recovered = (await get<WorldView>('alpha', 'world')).store.find((line) => line.itemId === 'minnow')
        assert.ok(minnowRestock)
        assert.equal(recovered?.quantity, minnowRestock.afterPurchase + 1)
        minnowRestock.nextDay = recovered!.quantity
        minnowRestock.elapsedMs = now - minnowPurchaseTime
      }

      const marketDay = cohort === 'active' || (cohort === 'low' && day % 7 === 0)
      if (marketDay) {
        const sellListing = day % 2 === 1
        const unitPrice = sellListing ? 4 : 5
        const input: WorldCommand = sellListing
          ? { type: 'market.list', asset: { kind: 'item', itemId: 'scrap' }, quantity: 5, unitPrice }
          : { type: 'market.order', itemId: 'fiber', quantity: 5, unitPrice }
        await command('alpha', input)
        const { listings } = await get<WorldView>('beta', 'world')
        assert.equal(listings.length, 1)
        assert.equal(listings[0].remaining, 5)
        assert.equal(listings[0].side, sellListing ? 'sell' : 'buy')
        pendingId = listings[0].id
        await command('beta', { type: 'market.fill', listingId: pendingId, quantity: 3 })
        ledger.marketFills += 1
        ledger.marketUnits += 3
        ledger.marketGrossCredits += 3 * unitPrice
        ledger.marketTaxCredits += 1
      }

      const [a, b, world] = await Promise.all([
        get<StateResponse>('alpha', 'state'), get<StateResponse>('beta', 'state'), get<WorldView>('alpha', 'world'),
      ])
      assert.equal(world.listings.length, marketDay ? 1 : 0)
      if (marketDay) assert.equal(world.listings[0].remaining, 2)
      for (const line of world.store) {
        assert.ok(line.quantity >= 0 && line.quantity <= line.maxStock)
        assert.ok(line.buyPrice > line.sellPrice)
      }

      const filled = await pool.query<{ fills: number; units: number; gross: number; tax: number }>(
        `SELECT count(*)::integer AS fills, coalesce(sum(quantity), 0)::integer AS units,
          coalesce(sum(gross), 0)::integer AS gross, coalesce(sum(tax), 0)::integer AS tax FROM market_fills`,
      )
      const expectedFills = {
        fills: ledger.marketFills, units: ledger.marketUnits,
        gross: ledger.marketGrossCredits, tax: ledger.marketTaxCredits,
      }
      assert.deepEqual(filled.rows[0], expectedFills)
      let creditEscrow = 0
      const itemEscrow: Items = {}
      for (const listing of world.listings) {
        assert.equal(listing.asset.kind, 'item')
        if (listing.side === 'buy') creditEscrow += listing.remaining * listing.unitPrice
        else addCounts(itemEscrow, { [listing.asset.itemId]: listing.remaining })
      }

      const walletTotal = a.state.coins + b.state.coins
      const expectedCredits = openingCredits + ledger.gatherCredits + ledger.npcBuybackCredits
        - ledger.npcPurchaseCredits - ledger.marketTaxCredits
      const creditDelta = walletTotal + creditEscrow - expectedCredits
      assert.equal(creditDelta, 0, `${cohort} day ${day} credit conservation`)
      const itemTotals = Object.fromEntries(Object.keys(openingItems).map((id) => {
        const actual = (a.state.inventory[id] ?? 0) + (b.state.inventory[id] ?? 0) + (itemEscrow[id] ?? 0)
        const expected = openingItems[id] + (ledger.gatheredItems[id] ?? 0)
          + (ledger.boughtFromNpc[id] ?? 0) - (ledger.soldToNpc[id] ?? 0)
        assert.equal(actual, expected, `${cohort} day ${day} ${id} conservation`)
        return [id, actual]
      }))
      days.push({
        day, time: new Date(now).toISOString(), wallets: { alpha: a.state.coins, beta: b.state.coins },
        creditEscrow, itemEscrow, totalCredits: walletTotal + creditEscrow, expectedCredits, creditDelta,
        inventory: { alpha: a.state.inventory, beta: b.state.inventory }, itemTotals,
        npcStock: world.store, market: expectedFills, sourcesAndSinks: structuredClone(ledger),
      })
    }
    return {
      cohort,
      opening: { credits: openingCredits, items: openingItems },
      freshStart, minnowRestock, npcRoundTripCreditLosses: roundTripLosses,
      days, commandLog,
    }
  } finally {
    await app.close()
  }
}

export async function runWorldExperiments(databaseUrl: string) {
  assertTestDatabase(databaseUrl)
  const pool = new Pool({ connectionString: databaseUrl })
  const startTime = performance.now()
  try {
    const { rows: [target] } = await pool.query<{ name: string; address: string; version: string }>(
      "SELECT current_database() AS name, host(inet_server_addr()) AS address, current_setting('server_version') AS version",
    )
    assert.equal(target.name, 'idle_buds_test')
    assert.ok(['127.0.0.1', '::1'].includes(target.address))
    const results = []
    for (const cohort of COHORTS) results.push(await runCohort(pool, cohort))
    const checkpoints = results.flatMap(({ cohort, days }) => days.filter(({ day }) => day === 7 || day === 30)
      .map(({ day, totalCredits, creditEscrow, itemEscrow, creditDelta, market, sourcesAndSinks }) => ({
        cohort, day, totalCredits, creditEscrow, itemEscrow, creditDelta, market, sourcesAndSinks,
      })))
    const limitations = [
      'Two deterministic progressed inventories per cohort. The empty cohort also includes an independent fresh account.',
      'Each pair gathers four primary items per player each day. Fills exchange three units at assigned prices. These are scripted flows.',
      'The clock advances one day per check-in. Currencies and all catalog resources are conserved daily, including open escrow.',
      'Measures fixed-fixture currency flow and liquidity. Market price discovery, long-run inflation, diverse behavior and live equilibrium require playtest data.',
      'Unique-instance races and retries are covered separately by the PostgreSQL integration suite.',
    ]
    await mkdir('.repo-local', { recursive: true })
    await writeFile(OUTPUT, JSON.stringify({
      postgres: target.version, rulesVersion: RULES_VERSION,
      runtimeMs: Math.round(performance.now() - startTime),
      limitations, checkpoints, cohorts: results,
    }, null, 2) + '\n')
    console.table(checkpoints.map(({ cohort, day, totalCredits, creditEscrow, creditDelta, market }) => ({
      cohort, day, totalCredits, creditEscrow, creditDelta, ...market,
    })))
    console.log(`Daily ledger, inventory, NPC stock and command evidence written to ${OUTPUT}`)
  } finally {
    await pool.end()
  }
}
