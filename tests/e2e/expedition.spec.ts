import { setTimeout } from 'node:timers/promises'
import { expect, test } from '@playwright/test'
import type { PlayerView } from '../../src/game/types.ts'

test('a new Tender gathers, crafts, catches, and returns to offline Bud work', async ({ page, context, browser }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page).toHaveTitle('Idle Buds')
  await expect(page.getByRole('heading', { name: 'Idle Buds', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Create account' })).toBeFocused()
  await page.getByLabel('Username').fill(`tender_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`)
  await page.getByLabel('Password').fill('Frontier expedition test 2026!')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your outpost', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'First expedition' })).toBeVisible()

  const assignments = page.getByRole('region', { name: 'Active assignments' })
  let firstCommandId: string | undefined
  let retriedCommandId: string | undefined
  await page.route('**/api/command', async (route) => {
    const body = route.request().postDataJSON() as { id: string }
    if (!firstCommandId) {
      firstCommandId = body.id
      expect((await route.fetch()).ok()).toBe(true)
      await route.abort('failed')
    } else {
      retriedCommandId = body.id
      await route.continue()
    }
  })
  let caught = false
  for (let attempt = 0; attempt < 5 && !caught; attempt += 1) {
    await page.getByRole('link', { name: /Mining/ }).first().click()
    const salvage = page.getByRole('article', { name: 'Salvage Verge' })
    await salvage.getByLabel('Cycles').selectOption('3')
    await salvage.getByRole('button', { name: 'Start gathering' }).click()
    if (attempt === 0) {
      await page.getByRole('button', { name: 'Retry action' }).click()
      await expect.poll(() => retriedCommandId).toEqual(firstCommandId)
      await page.unroute('**/api/command')
    }
    await expect(assignments.getByRole('progressbar', { name: 'Salvage Verge cycle progress' })).toBeVisible()
    await expect(assignments.getByText('Order complete.')).toBeVisible({ timeout: 18_000 })
    await expect(salvage.getByText('3 in inventory')).toBeVisible()

    await page.getByRole('link', { name: /Crafting/ }).first().click()
    const recipe = page.getByRole('article', { name: 'Capture Kit', exact: true })
    await recipe.getByRole('button', { name: 'Make Capture Kit' }).click()
    await expect(recipe.getByText('1 in inventory')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('link', { name: 'Combat', exact: true }).click()
    await page.getByRole('button', { name: 'Patrol Earth' }).click()
    await expect(assignments.getByRole('progressbar', { name: /Patrol · Earth cycle progress/ })).toBeVisible()
    await expect(assignments.getByText('Order complete.')).toBeVisible({ timeout: 18_000 })
    await expect(page.getByRole('article', { name: 'Latest encounter' })).toBeVisible()
    caught = await page.getByRole('article', { name: 'Latest encounter' }).getByText(/joined your collection/).isVisible()
  }
  expect(caught).toBe(true)

  await page.getByRole('link', { name: 'Collection', exact: true }).click()
  await page.getByRole('button', { name: /^Assign to / }).first().click()
  await expect(page.getByText(/^Assigned to /)).toBeVisible()
  const before = (await (await page.request.get('/api/state')).json() as { state: PlayerView }).state
  expect(before.buds).toHaveLength(1)
  const budId = before.buds[0].id
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
    await expect(resumed.getByRole('region', { name: 'Active assignments' }).getByRole('button', { name: 'Pause' })).toBeVisible()
    const after = (await (await resumed.request.get('/api/state')).json() as { state: PlayerView }).state
    expect(after.buds[0].id).toBe(budId)
    expect(after.buds[0].xp).toBeGreaterThan(before.buds[0].xp)
    expect(after.stats.gathered).toBeGreaterThan(before.stats.gathered)
    for (const name of ['Inventory', 'Formation', 'Nursery', 'Market', 'Community', 'Ranked']) {
      await resumed.getByRole('link', { name, exact: true }).click()
      await expect(resumed.getByRole('heading', { name, level: 1 })).toBeVisible()
      const widths = await resumed.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
      expect(widths[0]).toBeLessThanOrEqual(widths[1])
    }
    if (viewport?.width === 390) {
      const nav = await resumed.getByRole('navigation', { name: 'Outpost navigation' }).boundingBox()
      expect(nav?.height).toBeLessThan(150)
      await resumed.setViewportSize({ width: 844, height: 390 })
      await resumed.getByRole('link', { name: 'Combat', exact: true }).click()
      const patrol = resumed.getByRole('button', { name: 'Patrol Earth' })
      await patrol.scrollIntoViewIfNeeded()
      await expect(patrol).toBeInViewport()
      const widths = await resumed.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
      expect(widths[0]).toBeLessThanOrEqual(widths[1])
    }
    expect(errors).toEqual([])
  } finally {
    await resumedContext.close()
  }
})
