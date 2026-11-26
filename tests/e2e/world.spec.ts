import { Pool } from 'pg'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { advance, applyCommand, BREEDING_MS, INCUBATION_MS } from '../../src/game/index.ts'
import type { GameState } from '../../src/game/types.ts'
import { FIXTURE_PASSWORD, progressedFixture, seedPlaytest } from '../../tools/fixtures.ts'

test.use({ actionTimeout: 15_000 })

async function signIn(page: Page, username: string) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(FIXTURE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in to outpost' }).click()
  await expect(page.getByRole('heading', { name: 'Your outpost', level: 1 })).toBeVisible()
}

async function expectNoHorizontalOverflow(section: string, ...pages: Page[]) {
  for (const page of pages) {
    const { clientWidth, scrollWidth } = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(scrollWidth, `Horizontal overflow in ${section} at ${clientWidth}px`).toBeLessThanOrEqual(clientWidth)
  }
}

async function fixture() {
  const url = process.env.DATABASE_URL
  if (!url || process.env.IDLE_BUDS_TEST_DATABASE !== '1') throw new Error('Run the browser suite with npm run test:browser.')
  const pool = new Pool({ connectionString: url })
  try {
    // Integration tests use the same fixture usernames in the disposable database.
    await seedPlaytest(pool, url, true)
    const now = Date.now()
    const startAt = now - BREEDING_MS - INCUBATION_MS - 1_000
    const beta = progressedFixture('beta', startAt)
    const started = applyCommand(beta, { type: 'breed', primaryId: beta.buds[0].id, secondaryId: beta.buds[1].id }, startAt)
    const progressed: GameState = advance(started.state, now).state
    await pool.query('UPDATE players SET state = $1, foreground_at = $2 WHERE account_id = (SELECT id FROM accounts WHERE username = $3)', [progressed, now, beta.name])
  } finally {
    await pool.end()
  }
}

test('two Tenders breed and hatch, trade, cooperate, and play a blind ranked match', async ({ page: alpha, browser }, testInfo) => {
  await fixture()
  const other = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: alpha.viewportSize() })
  const beta = await other.newPage()
  const errors: string[] = []
  for (const page of [alpha, beta]) page.on('pageerror', (error) => errors.push(error.message))
  try {
    await Promise.all([signIn(alpha, 'alpha'), signIn(beta, 'beta')])
    await Promise.all([alpha.getByRole('link', { name: 'Nursery', exact: true }).click(), beta.getByRole('link', { name: 'Nursery', exact: true }).click()])
    const primary = await alpha.getByLabel('Primary parent').getByRole('option', { name: /Pebbleback/ }).getAttribute('value')
    const partner = await alpha.getByLabel('Partner').getByRole('option', { name: /Coilbit/ }).getAttribute('value')
    expect(primary && partner).toBeTruthy()
    await alpha.getByLabel('Primary parent').selectOption(primary!)
    await alpha.getByLabel('Partner').selectOption(partner!)
    await expect(alpha.getByText('Offspring species · Pebbleback')).toBeVisible()
    await expect(beta.getByText('Pebbleback egg')).toBeVisible()
    await expectNoHorizontalOverflow('Nursery', alpha, beta)
    await alpha.getByLabel(/Use one Brood Tonic/).check()
    await alpha.getByRole('button', { name: 'Begin breeding' }).click()
    await expect(alpha.getByText('Pebbleback × Coilbit')).toBeVisible()
    await beta.getByRole('button', { name: 'Hatch egg' }).click()
    await expect(beta.getByText('No eggs incubating.', { exact: false })).toBeVisible()

    await Promise.all([alpha.getByRole('link', { name: 'Market', exact: true }).click(), beta.getByRole('link', { name: 'Market', exact: true }).click()])
    await alpha.getByRole('button', { name: 'Post listing', exact: true }).click()
    const listing = alpha.getByRole('heading', { name: 'Post a sell listing' }).locator('..')
    await listing.getByRole('combobox', { name: 'Supply', exact: true }).selectOption('scrap')
    await listing.getByLabel('Quantity').fill('3')
    await listing.getByLabel('Price per unit in coins').fill('5')
    await listing.getByRole('button', { name: 'Post listing', exact: true }).click()
    const scrapSale = beta.getByRole('article', { name: 'Scrap by alpha' })
    await expect(scrapSale.getByText('3 available', { exact: false })).toBeVisible()
    await expectNoHorizontalOverflow('Market', alpha, beta)
    await scrapSale.getByRole('button', { name: 'Buy', exact: true }).click()
    await expect(scrapSale.getByText('2 available', { exact: false })).toBeVisible()
    await alpha.getByRole('button', { name: 'Listings', exact: true }).click()
    await alpha.getByRole('article', { name: 'Scrap by alpha' }).getByRole('button', { name: 'Cancel listing' }).click()
    await expect(alpha.getByRole('article', { name: 'Scrap by alpha' })).toHaveCount(0)

    await beta.getByRole('button', { name: 'Fund buy order' }).click()
    await beta.getByRole('combobox', { name: 'Supply', exact: true }).selectOption('fiber')
    await beta.getByLabel('Quantity').fill('2')
    await beta.getByLabel('Price per unit in coins').fill('6')
    await beta.getByRole('button', { name: 'Place buy order' }).click()
    const fiberOrder = alpha.getByRole('article', { name: 'Fiber by beta' })
    await fiberOrder.getByLabel('Quantity').fill('2')
    await expectNoHorizontalOverflow('Market buy orders', alpha, beta)
    await fiberOrder.getByRole('button', { name: 'Fill buy order' }).click()
    await expect(fiberOrder).toHaveCount(0)

    await Promise.all([alpha.getByRole('link', { name: 'Community', exact: true }).click(), beta.getByRole('link', { name: 'Community', exact: true }).click()])
    await Promise.all([alpha.getByRole('button', { name: 'Chat', exact: true }).click(), beta.getByRole('button', { name: 'Chat', exact: true }).click()])
    const message = 'Relay station check from alpha'
    await alpha.getByLabel('Message', { exact: true }).fill(message)
    await alpha.getByRole('button', { name: 'Send message' }).click()
    await expect(beta.getByText(message, { exact: true })).toBeVisible()
    await expect(alpha.getByText('Message sent.', { exact: true })).toHaveCount(0)
    await beta.getByLabel("Actions for alpha's message", { exact: true }).first().click()
    await beta.getByRole('button', { name: 'Mute alpha', exact: true }).click()
    await expect(beta.getByText(message, { exact: true })).toHaveCount(0)
    await Promise.all([alpha.getByRole('button', { name: 'Close chat' }).click(), beta.getByRole('button', { name: 'Close chat' }).click()])
    await beta.getByRole('button', { name: 'Unmute', exact: true }).click()
    await beta.getByRole('button', { name: 'Chat', exact: true }).click()
    await expect(beta.getByText(message, { exact: true })).toBeVisible()
    await beta.getByRole('button', { name: 'Close chat' }).click()
    await beta.getByLabel('Tender username').fill('alpha')
    await beta.getByRole('button', { name: 'Send friend request' }).click()
    await alpha.getByRole('button', { name: 'Accept', exact: true }).click()
    await expect(beta.getByText('Friend', { exact: true })).toBeVisible()

    const clan = `relay ${crypto.randomUUID().slice(0, 8)}`
    await alpha.getByLabel('New clan name').fill(clan)
    await alpha.getByRole('button', { name: 'Create clan' }).click()
    await beta.getByRole('button', { name: `Join ${clan}` }).click()
    for (const page of [alpha, beta]) {
      await page.getByLabel(/Fiber to contribute/).fill('20')
      await expectNoHorizontalOverflow('Community', page)
      await page.getByRole('button', { name: 'Contribute fiber' }).click()
    }
    await expect(alpha.getByText(/Goal complete/)).toBeVisible()
    await expect(beta.getByText(/Goal complete/)).toBeVisible()

    await Promise.all([alpha.getByRole('link', { name: 'Ranked', exact: true }).click(), beta.getByRole('link', { name: 'Ranked', exact: true }).click()])
    for (const page of [alpha, beta]) await expect(page.getByText('No ranked matches yet.')).toBeVisible()
    await alpha.getByRole('button', { name: 'Publish defense' }).click()
    await beta.getByRole('button', { name: 'Publish defense' }).click()
    await expect(beta.getByRole('button', { name: 'Update defense' })).toBeVisible()
    await alpha.getByRole('button', { name: 'Find ranked match' }).click()
    await expect(alpha.getByText(/^(Win|Loss|Draw) against beta$/)).toBeVisible()
    await expect(beta.getByText(/^(Win|Loss|Draw) against alpha$/)).toBeVisible()
    await expectNoHorizontalOverflow('Ranked', alpha, beta)
    expect(errors).toEqual([])
  } finally {
    await other.close()
  }
})
