import { setTimeout } from 'node:timers/promises'
import { expect, test } from '@playwright/test'
import type { PlayerView } from '../../src/game/types.ts'

test('a new Tender gathers, crafts, catches, and returns to independent offline Bud work', async ({ page, context, browser }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const read = async () => (await (await page.request.get('/api/state')).json() as { state: PlayerView }).state
  await page.goto('/')
  await expect(page).toHaveTitle('Idle Buds')
  await expect(page.getByRole('heading', { name: 'Idle Buds', level: 1 })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Create account' })).toBeFocused()
  await page.getByLabel('Username').fill(`tender_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`)
  await page.getByLabel('Password').fill('Frontier expedition test 2026!')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your outpost', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'First expedition' })).toBeVisible()

  let firstCommandId: string | undefined
  let retriedCommandId: string | undefined
  await page.route('**/api/command', async (route) => {
    const body = route.request().postDataJSON() as { id: string }
    if (!firstCommandId) {
      firstCommandId = body.id
      expect((await route.fetch()).ok()).toBe(true)
      await route.abort('failed')
    } else { retriedCommandId = body.id; await route.continue() }
  })
  let caught = false
  for (let attempt = 0; attempt < 5 && !caught; attempt += 1) {
    await page.getByRole('navigation', { name: 'Outpost navigation' }).getByRole('link', { name: 'Mining', exact: true }).click()
    await expect(page.getByLabel('Cycles')).toHaveCount(0)
    await page.getByRole('button', { name: 'Gather Scrap', exact: true }).click()
    if (attempt === 0) {
      await page.getByRole('button', { name: 'Retry action' }).click()
      await expect.poll(() => retriedCommandId).toEqual(firstCommandId)
      await page.unroute('**/api/command')
    }
    await expect(page.getByRole('region', { name: 'Tender activity' }).getByRole('progressbar', { name: 'Scrap cycle progress' })).toBeVisible()
    await expect.poll(async () => (await read()).inventory.scrap ?? 0, { timeout: 20_000 }).toBeGreaterThanOrEqual(3)
    expect((await read()).activities.tender.remainingCount).toBeNull()

    await page.getByRole('navigation', { name: 'Outpost navigation' }).getByRole('link', { name: 'Crafting', exact: true }).click()
    await page.getByRole('button', { name: 'Select Capture Kit', exact: true }).click()
    await page.getByRole('button', { name: 'Make Capture Kit', exact: true }).click()
    await expect.poll(async () => (await read()).inventory['capture-kit'] ?? 0, { timeout: 12_000 }).toBeGreaterThanOrEqual(1)
    const battles = (await read()).stats.battles
    await page.getByRole('navigation', { name: 'Outpost navigation' }).getByRole('link', { name: 'Combat', exact: true }).click()
    await page.getByRole('button', { name: 'Patrol Earth', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Active patrol' })).toBeVisible()
    await expect.poll(async () => (await read()).stats.battles, { timeout: 20_000 }).toBeGreaterThan(battles)
    await expect(page.getByRole('region', { name: 'Battle playback' })).toBeVisible()
    caught = (await read()).buds.length > 0
  }
  expect(caught).toBe(true)

  await page.getByRole('navigation', { name: 'Outpost navigation' }).getByRole('link', { name: 'Collection', exact: true }).click()
  const gatherOption = page.getByLabel('Work assignment').first().getByRole('option').filter({ hasText: /^(Mining|Woodcutting|Fishing|Farming) ·/ }).first()
  const choice = await gatherOption.getAttribute('value')
  expect(choice).toBeTruthy()
  await page.getByLabel('Work assignment').first().selectOption(choice!)
  await page.getByRole('button', { name: /^Assign / }).first().click()
  await expect(page.getByText(/^Assigned to /)).toBeVisible()
  const before = await read()
  expect(before.buds).toHaveLength(1)
  const budId = before.buds[0].id
  expect(before.activities[budId].status).toBe('running')
  expect(before.activities.tender.order.kind).toBe('battle')
  const savedSession = await context.storageState()
  const viewport = page.viewportSize()
  const baseURL = new URL(page.url()).origin
  await page.close()
  await setTimeout(6_000)

  const resumedContext = await browser.newContext({ storageState: savedSession, viewport, baseURL })
  try {
    const resumed = await resumedContext.newPage()
    resumed.on('pageerror', (error) => errors.push(error.message))
    await resumed.goto('/#buds')
    await expect(resumed.getByRole('heading', { name: 'Collection', level: 1 })).toBeVisible()
    await expect(resumed.getByRole('heading', { name: 'While you were away' })).toBeVisible()
    await expect(resumed.getByText(/^Assigned to /)).toBeVisible()
    const after = (await (await resumed.request.get('/api/state')).json() as { state: PlayerView }).state
    expect(after.buds[0].id).toBe(budId)
    expect(after.buds[0].xp).toBeGreaterThan(before.buds[0].xp)
    expect(after.stats.gathered).toBeGreaterThan(before.stats.gathered)
    await resumed.getByRole('button', { name: 'Dismiss summary' }).click()
    for (const name of ['Inventory', 'Formation', 'Nursery', 'Market', 'Community', 'Ranked']) {
      await resumed.getByRole('navigation', { name: 'Outpost navigation' }).getByRole('link', { name, exact: true }).click()
      await expect(resumed.getByRole('heading', { name, level: 1 })).toBeVisible()
      const widths = await resumed.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
      expect(widths[0]).toBeLessThanOrEqual(widths[1])
    }
    if (viewport?.width === 390) {
      const nav = await resumed.getByRole('navigation', { name: 'Outpost navigation' }).boundingBox()
      expect(nav?.width).toBeLessThan(65)
      await resumed.setViewportSize({ width: 844, height: 390 })
      await resumed.getByRole('navigation', { name: 'Outpost navigation' }).getByRole('link', { name: 'Combat', exact: true }).click()
      const patrol = resumed.getByRole('region', { name: 'Active patrol' })
      await patrol.scrollIntoViewIfNeeded()
      await expect(patrol).toBeInViewport()
      const widths = await resumed.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
      expect(widths[0]).toBeLessThanOrEqual(widths[1])
    }
    expect(errors).toEqual([])
  } finally { await resumedContext.close() }
})
