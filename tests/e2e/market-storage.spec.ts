import { Pool } from 'pg'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { PlayerView } from '../../src/game/types.ts'
import { progressedFixture } from '../../tools/fixtures.ts'
import { assertTestDatabase } from '../../tools/database-guard.ts'

test.use({ actionTimeout: 15_000, screenshot: 'on' })

async function fullInventory(page: Page) {
  const url = process.env.DATABASE_URL
  if (!url || process.env.IDLE_BUDS_TEST_DATABASE !== '1') throw new Error('Run with npm run test:browser.')
  assertTestDatabase(url)
  const username = `store_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
  await page.goto('/')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill('Store storage acceptance 2026!')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your outpost', level: 1 })).toBeVisible()

  const now = Date.now()
  const state = progressedFixture(username, now)
  state.upgrades.storage = 0
  state.inventory = { scrap: 100, minnow: 1 }
  // Two item types and 22 unequipped pieces occupy all 24 shared slots.
  state.equipment = Array.from({ length: 22 }, (_, index) => ({
    id: `store-gear-${index}`, definitionId: 'scrap-blade', slot: 'weapon', bonus: 1,
  }))
  const pool = new Pool({ connectionString: url })
  try {
    await pool.query('TRUNCATE store_stock')
    await pool.query(
      'UPDATE players SET state = $1, foreground_at = $2 WHERE account_id = (SELECT id FROM accounts WHERE username = $3)',
      [state, now, username],
    )
  } finally { await pool.end() }

  await page.goto('/#market')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Market', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'General store', exact: true }).click()
}

async function savedState(page: Page): Promise<PlayerView> {
  const response = await page.request.get('/api/state')
  expect(response.ok()).toBe(true)
  return (await response.json() as { state: PlayerView }).state
}

test('the store adds to an existing large stack when every inventory slot is occupied', async ({ page }) => {
  await fullInventory(page)
  const scrap = page.getByRole('article', { name: 'Scrap general store' })
  await expect(scrap.getByText(/100 owned/)).toBeVisible()
  await expect(scrap.getByText('Can buy 16 · Can sell 24', { exact: true })).toBeVisible()
  await scrap.getByLabel('Quantity').fill('5')
  await expect(scrap.getByRole('button', { name: 'Buy for 30', exact: true })).toBeEnabled()
  await scrap.getByRole('button', { name: 'Buy for 30', exact: true }).click()
  await expect(scrap.getByText(/105 owned/)).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'General store', exact: true }).click()
  await expect(scrap.getByText(/105 owned/)).toBeVisible()
  const state = await savedState(page)
  expect(state.inventory.scrap).toBe(105)
  expect(state.coins).toBe(970)
  expect(state.equipment).toHaveLength(22)
})

test('the store refuses a new item type until selling the last stack frees a slot', async ({ page }) => {
  await fullInventory(page)
  const fiber = page.getByRole('article', { name: 'Fiber general store' })
  const buyFiber = fiber.getByRole('button', { name: 'Buy for 7', exact: true })
  await expect(buyFiber).toBeDisabled()
  await expect(fiber.getByText('Can buy 0 · Can sell 0', { exact: true })).toBeVisible()

  // The UI is advisory: bypassing it must still preserve the full inventory and wallet.
  const denied = await page.request.post('/api/command', {
    headers: { Origin: new URL(page.url()).origin },
    data: { id: crypto.randomUUID(), command: { type: 'store.buy', itemId: 'fiber', quantity: 1 } },
  })
  expect(denied.status()).toBe(409)
  const unchanged = await savedState(page)
  expect(unchanged.coins).toBe(1_000)
  expect(unchanged.inventory).toEqual({ scrap: 100, minnow: 1 })

  const minnow = page.getByRole('article', { name: 'Copperfin general store' })
  await minnow.getByRole('button', { name: 'Sell for 2', exact: true }).click()
  await expect(buyFiber).toBeEnabled()
  await buyFiber.click()
  await expect(fiber.getByText(/1 owned/)).toBeVisible()
  const state = await savedState(page)
  expect(state.inventory).toEqual({ scrap: 100, fiber: 1 })
  expect(state.coins).toBe(995)
  expect(state.equipment).toHaveLength(22)
})
