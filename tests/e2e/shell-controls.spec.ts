import { Pool } from 'pg'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { PlayerView } from '../../src/game/types.ts'
import { progressedFixture } from '../../tools/fixtures.ts'
import { assertTestDatabase } from '../../tools/database-guard.ts'

test.use({ actionTimeout: 15_000 })

async function register(page: Page) {
  const username = `shell_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
  await page.goto('/')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill('Shell control acceptance 2026!')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your outpost', level: 1 })).toBeVisible()
  return username
}

async function openNavigation(page: Page) {
  const toggle = page.getByRole('button', { name: 'Toggle navigation' })
  if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
  return page.getByRole('navigation', { name: 'Outpost navigation' })
}

async function closeNavigation(page: Page) {
  const scrim = page.getByRole('button', { name: 'Close navigation' })
  if (await scrim.isVisible()) {
    const bounds = await scrim.boundingBox()
    await scrim.click({ position: { x: bounds!.width - 8, y: 8 } })
  }
}

async function state(page: Page): Promise<PlayerView> {
  return (await (await page.request.get('/api/state')).json() as { state: PlayerView }).state
}

async function expectNoOverflow(page: Page) {
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(widths.content).toBeLessThanOrEqual(widths.viewport)
}

test('sidebar order persists and activity icons remain independent from the collapsed rail', async ({ page }) => {
  await register(page)
  let nav = await openNavigation(page)
  await nav.getByRole('button', { name: 'Arrange sidebar', exact: true }).click()
  await nav.getByRole('button', { name: 'Move Mining up', exact: true }).click()
  await nav.getByRole('button', { name: 'Move Inventory up', exact: true }).click()
  await nav.getByRole('button', { name: 'Move Activities category up', exact: true }).click()
  await nav.getByRole('button', { name: 'Move Activities category up', exact: true }).click()
  await nav.getByRole('button', { name: 'Finish arranging sidebar', exact: true }).click()

  const groupOrder = () => nav.locator(':scope > section').evaluateAll((sections) => sections.map((section) => section.getAttribute('aria-label')))
  expect(await groupOrder()).toEqual(['Activities navigation', 'Account navigation', 'Community navigation'])
  await expect(nav.getByRole('region', { name: 'Activities navigation' }).getByRole('link').first()).toHaveAttribute('aria-label', 'Mining')
  await expect(nav.getByRole('region', { name: 'Account navigation' }).getByRole('link').first()).toHaveAttribute('aria-label', 'Inventory')

  await nav.getByRole('button', { name: 'Show activity icons' }).click()
  const activities = nav.getByRole('region', { name: 'Activities navigation' })
  await expect(nav.getByRole('button', { name: 'Show activity labels' })).toHaveAttribute('aria-pressed', 'true')
  const first = await activities.getByRole('link').nth(0).boundingBox()
  const second = await activities.getByRole('link').nth(1).boundingBox()
  expect(first && second).toBeTruthy()
  expect(second!.x).toBeGreaterThan(first!.x)
  expect(Math.abs(second!.y - first!.y)).toBeLessThan(2)

  await nav.getByRole('button', { name: 'Collapse sidebar' }).click()
  await expect(nav).toHaveClass(/is-collapsed/)
  await expect(nav.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-pressed', 'true')
  await closeNavigation(page)
  expect((await nav.boundingBox())!.width).toBeLessThan(85)
  await expectNoOverflow(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your outpost', level: 1 })).toBeVisible()
  nav = await openNavigation(page)
  await expect(nav).toHaveClass(/is-collapsed/)
  expect(await groupOrder()).toEqual(['Activities navigation', 'Account navigation', 'Community navigation'])
  await expect(nav.getByRole('region', { name: 'Activities navigation' }).getByRole('link').first()).toHaveAttribute('aria-label', 'Mining')
  await expect(nav.getByRole('region', { name: 'Account navigation' }).getByRole('link').first()).toHaveAttribute('aria-label', 'Inventory')
  await nav.getByRole('button', { name: 'Expand sidebar' }).click()
  await expect(nav).not.toHaveClass(/is-collapsed/)
  await expect(nav.getByRole('button', { name: 'Show activity labels' })).toHaveAttribute('aria-pressed', 'true')
  await nav.getByRole('button', { name: 'Show activity labels' }).click()
  await expect(nav.getByRole('button', { name: 'Show activity icons' })).toHaveAttribute('aria-pressed', 'false')
  await expect(nav).not.toHaveClass(/is-collapsed/)
  await closeNavigation(page)
})

test('menu reports acknowledged saves, settings use real preferences, and chat docks at the bottom', async ({ page }) => {
  const confirmed = new Set<string>()
  page.on('response', async (response) => {
    if (!/\/api\/(state|register)$/.test(response.url()) || response.status() !== 200) return
    const body = await response.json().catch(() => null) as { state?: PlayerView } | null
    if (body?.state) confirmed.add(new Date(body.state.lastAt).toISOString())
  })
  await register(page)
  await expect(page.locator('.topbar').getByRole('button', { name: 'Sign out' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const menu = page.getByRole('dialog', { name: 'Menu', exact: true })
  await expect(menu.getByRole('button', { name: 'Sign out' })).toBeVisible()
  await expect(menu.getByRole('button', { name: /Report a bug/ })).toBeDisabled()
  const savedTime = menu.locator('.save-status time')
  await expect.poll(async () => confirmed.has(await savedTime.getAttribute('datetime') ?? '')).toBe(true)
  await expect(menu.getByText('Saved to server', { exact: true })).toBeVisible()

  // A failed read must retain the last acknowledgement, not manufacture a newer save time.
  await page.route('**/api/state', (route) => route.abort('failed'))
  await expect(menu.getByText('Connection interrupted', { exact: true })).toBeVisible({ timeout: 8_000 })
  const frozen = await savedTime.getAttribute('datetime')
  await page.waitForTimeout(1_100)
  await expect(savedTime).toHaveAttribute('datetime', frozen!)
  await page.unroute('**/api/state')
  await expect(menu.getByText('Saved to server', { exact: true })).toBeVisible({ timeout: 8_000 })
  await expect.poll(async () => Date.parse(await savedTime.getAttribute('datetime') ?? '')).toBeGreaterThan(Date.parse(frozen!))

  await menu.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
  await settings.getByLabel('Reduce motion').check()
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true')
  await expect(settings.getByRole('button', { name: /save|load|export|import/i })).toHaveCount(0)
  await settings.getByRole('button', { name: 'Back', exact: true }).click()
  await menu.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your outpost', level: 1 })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true')

  await page.getByRole('button', { name: 'Chat', exact: true }).click()
  const chat = page.getByRole('complementary', { name: 'Chat panel' })
  await expect(chat.getByLabel('Message', { exact: true })).toBeVisible()
  const bounds = await chat.boundingBox()
  expect(bounds).toBeTruthy()
  expect(bounds!.y + bounds!.height).toBeGreaterThan(page.viewportSize()!.height - 50)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  await chat.getByLabel('Message', { exact: true }).fill('Keep this unfinished draft')
  await chat.getByRole('button', { name: /Global chat/ }).click()
  await expect(chat.getByRole('button', { name: 'Expand chat' })).toBeVisible()
  await expect(chat.getByLabel('Message', { exact: true })).toHaveCount(0)
  await chat.getByRole('button', { name: 'Expand chat' }).click()
  await expect(chat.getByLabel('Message', { exact: true })).toHaveValue('Keep this unfinished draft')
  await expectNoOverflow(page)
  await chat.getByRole('button', { name: 'Close chat' }).click()
  await expect(chat).toHaveCount(0)
  await page.getByRole('button', { name: 'Chat', exact: true }).click()
  await expect(chat.getByLabel('Message', { exact: true })).toHaveValue('Keep this unfinished draft')
  await chat.getByRole('button', { name: 'Close chat' }).click()

  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await menu.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeVisible()
  expect((await page.request.get('/api/state')).status()).toBe(401)
})

test('keyboard focus does not gather until Enter confirms the resource', async ({ page }) => {
  const commands: unknown[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/command')) commands.push(request.postDataJSON())
  })
  await register(page)
  await page.getByRole('link', { name: 'Mining', exact: true }).click()
  const gather = page.getByRole('button', { name: 'Gather Scrap', exact: true })
  await gather.focus()
  await expect(gather).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(gather).toBeFocused()
  expect(commands).toHaveLength(0)
  expect((await state(page)).activities).toEqual({})
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await state(page)).activities.tender?.order).toEqual({ kind: 'gather', nodeId: 'earth-scrap' })
  expect(commands).toHaveLength(1)
  await expect(page.getByRole('region', { name: 'Tender activity' }).getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
})

type TestPadButton = { pressed: boolean; touched: boolean; value: number }
type TestWindow = Window & { shellTestPad: TestPadButton[] }

async function pressPad(page: Page, button: number) {
  await page.evaluate(async (index) => {
    const pad = (window as unknown as TestWindow).shellTestPad
    const frames = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    pad[index] = { pressed: true, touched: true, value: 1 }
    await frames()
    pad[index] = { pressed: false, touched: false, value: 0 }
    await frames()
  }, button)
}

async function installPad(page: Page) {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }))
    ;(window as unknown as TestWindow).shellTestPad = buttons
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => [{ id: 'Acceptance standard gamepad', index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons, timestamp: performance.now() }],
    })
  })
}

test('standard gamepad moves focus, confirms actions, edits selectors, and opens or closes the menu', async ({ page }) => {
  await installPad(page)
  const commands: { command: unknown }[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/command')) commands.push(request.postDataJSON() as { command: unknown })
  })
  await register(page)
  await page.getByRole('link', { name: 'Mining', exact: true }).click()
  const gather = page.getByRole('button', { name: 'Gather Scrap', exact: true })
  const menuButton = page.getByRole('button', { name: 'Menu', exact: true })
  const activeWork = page.getByRole('button', { name: 'Active work', exact: true })
  for (const [button, anchor] of [[12, gather], [13, menuButton], [14, menuButton], [15, activeWork]] as const) {
    await anchor.focus()
    await pressPad(page, button)
    await expect(anchor).not.toBeFocused()
    expect(await page.evaluate(() => document.activeElement?.matches('button,a[href],input,select,summary'))).toBe(true)
  }
  expect(commands).toHaveLength(0)
  expect((await state(page)).activities).toEqual({})

  await gather.focus()
  await pressPad(page, 0)
  await expect.poll(async () => (await state(page)).activities.tender?.order).toEqual({ kind: 'gather', nodeId: 'earth-scrap' })
  expect(commands).toHaveLength(1)
  await pressPad(page, 9)
  await expect(page.getByRole('dialog', { name: 'Menu', exact: true })).toBeVisible()
  await pressPad(page, 1)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('link', { name: 'Crafting', exact: true }).click()
  const quantityMode = page.getByRole('combobox', { name: 'Make', exact: true })
  await quantityMode.focus()
  await pressPad(page, 0)
  await expect(quantityMode).toHaveAttribute('data-controller-edit', 'true')
  await pressPad(page, 13)
  await expect(page.locator('.controller-choice').getByText('Continuously', { exact: true })).toBeVisible()
  await expect(quantityMode).toHaveValue('quantity')
  await pressPad(page, 12)
  await expect(quantityMode).toHaveValue('quantity')
  await pressPad(page, 15)
  await expect(page.locator('.controller-choice').getByText('Continuously', { exact: true })).toBeVisible()
  await expect(quantityMode).toHaveValue('quantity')
  await pressPad(page, 0)
  await expect(quantityMode).not.toHaveAttribute('data-controller-edit')
  await expect(quantityMode).toHaveValue('continuous')
  expect(commands).toHaveLength(1)
  await page.getByRole('button', { name: 'Make Capture Kit', exact: true }).focus()
  await pressPad(page, 0)
  await expect.poll(async () => (await state(page)).activities.tender?.order).toEqual({ kind: 'craft', recipeId: 'capture-kit', count: null })
  expect(commands).toHaveLength(2)
  expect(commands[1].command).toMatchObject({ type: 'startActivity', order: { kind: 'craft', recipeId: 'capture-kit', count: null } })
  await expectNoOverflow(page)
})


test('gamepad equipment selection sends one command only on confirmation and Back cancels its draft', async ({ page }) => {
  await installPad(page)
  const username = await register(page)
  const url = process.env.DATABASE_URL
  if (!url || process.env.IDLE_BUDS_TEST_DATABASE !== '1') throw new Error('Use the disposable browser test database.')
  assertTestDatabase(url)
  const pool = new Pool({ connectionString: url })
  try {
    const fixture = progressedFixture(username, Date.now())
    fixture.equipment = [
      { id: 'pad-blade', definitionId: 'scrap-blade', slot: 'weapon', bonus: 2, technique: 'Guard' },
      { id: 'pad-slinger', definitionId: 'bolt-slinger', slot: 'weapon', bonus: 2, technique: 'Strike' },
    ]
    await pool.query('UPDATE players SET state = $1 WHERE account_id = (SELECT id FROM accounts WHERE username = $2)', [fixture, username])
  } finally { await pool.end() }
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your outpost', level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Formation', exact: true }).click()
  const weapon = page.getByRole('combobox', { name: 'Weapon', exact: true })
  const commands: { command: unknown }[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/command')) commands.push(request.postDataJSON() as { command: unknown })
  })
  await weapon.focus()
  await pressPad(page, 0)
  await pressPad(page, 13)
  await expect(weapon).toHaveValue('')
  expect(commands).toHaveLength(0)
  expect((await state(page)).loadout.weapon).toBeUndefined()
  await pressPad(page, 1)
  await expect(weapon).not.toHaveAttribute('data-controller-edit')
  await expect(weapon).toHaveValue('')
  expect(commands).toHaveLength(0)

  await pressPad(page, 0)
  await pressPad(page, 13)
  expect(commands).toHaveLength(0)
  await pressPad(page, 0)
  await expect.poll(async () => (await state(page)).loadout.weapon).toBe('pad-blade')
  await expect(weapon).toHaveValue('pad-blade')
  expect(commands).toHaveLength(1)
  expect(commands[0].command).toEqual({ type: 'equip', slot: 'weapon', gearId: 'pad-blade' })
  await expectNoOverflow(page)
})
