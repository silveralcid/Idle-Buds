import { randomUUID } from 'node:crypto'
import { hash } from 'bcryptjs'
import { Pool } from 'pg'
import { expect, test } from '@playwright/test'
import { advance, applyCommand } from '../../src/game/index.ts'
import type { PlayerView } from '../../src/game/types.ts'
import { assertTestDatabase } from '../../tools/database-guard.ts'
import { FIXTURE_PASSWORD, progressedFixture } from '../../tools/fixtures.ts'

async function replayFixture() {
  const url = process.env.DATABASE_URL
  if (!url || process.env.IDLE_BUDS_TEST_DATABASE !== '1') throw new Error('Use the isolated browser test database.')
  assertTestDatabase(url)
  const pool = new Pool({ connectionString: url })
  const id = randomUUID()
  const username = `replay_${id.slice(0, 8)}`
  const now = Date.now()
  const startAt = now - 12_500
  const initial = progressedFixture(username, startAt)
  const state = advance(applyCommand(initial, { type: 'startActivity', order: { kind: 'battle', zoneId: 'earth' } }, startAt).state, now).state
  try {
    await pool.query('INSERT INTO accounts(id, username, password_hash) VALUES ($1,$2,$3)', [id, username, await hash(FIXTURE_PASSWORD, 12)])
    await pool.query('INSERT INTO players(account_id, state, foreground_at) VALUES ($1,$2,$3)', [id, state, now])
  } finally { await pool.end() }
  return { username, state }
}

test('visual battle controls follow the recorded turns while the server patrol continues', async ({ page }, testInfo) => {
  const { username, state } = await replayFixture()
  const errors: string[] = []
  const commands: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/command') commands.push(request.postData() ?? '')
  })
  await page.goto('/#combat')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(FIXTURE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in to outpost' }).click()
  const replay = page.getByRole('region', { name: 'Battle playback' })
  await expect(replay).toBeVisible()
  await expect(replay.locator('.battle-frontline .fighter')).toHaveCount(2)
  await replay.getByRole('button', { name: 'Pause playback' }).click()
  const recordingId = await replay.getAttribute('data-battle-id')
  const beforeStep = await replay.locator('.battle-heading > small').innerText()
  const step = Number(beforeStep.match(/(\d+)\//)?.[1])
  await replay.getByRole('button', { name: 'Step', exact: true }).click()
  await expect(replay.locator('.battle-heading > small')).toContainText(`Paused · ${step + 1}/`)
  for (let i = 0; i < 8 && !/damage/.test(await replay.locator('.battle-caption').innerText()); i += 1) {
    await replay.getByRole('button', { name: 'Step', exact: true }).click()
  }
  await expect(replay.locator('.battle-caption')).toContainText('damage')
  expect(await replay.locator('.battle-frontline meter').evaluateAll((meters) => meters.some((meter) => (meter as HTMLMeterElement).value < (meter as HTMLMeterElement).max))).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('combat-playback.png'), fullPage: true })
  await replay.getByRole('combobox', { name: 'Playback speed' }).selectOption('4')
  await replay.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(replay.locator('.battle-heading > small')).toContainText('Complete')
  await replay.getByRole('button', { name: 'Replay', exact: true }).click()
  await replay.getByRole('button', { name: 'Pause playback' }).click()

  // Read from the real authority until a later encounter completes. Pausing the viewer must not pause this.
  await expect.poll(async () => {
    const reply = await page.request.get('/api/state')
    expect(reply.ok()).toBe(true)
    return ((await reply.json()) as { state: PlayerView }).state.stats.battles
  }, { timeout: 20_000, intervals: [500, 1000] }).toBeGreaterThan(state.stats.battles)
  await expect(replay).toHaveAttribute('data-battle-id', recordingId!)
  await expect(replay.getByRole('button', { name: 'Watch latest battle' })).toBeVisible({ timeout: 5_000 })
  await replay.getByRole('button', { name: 'Watch latest battle' }).click()
  await expect(replay).not.toHaveAttribute('data-battle-id', recordingId!)
  expect(commands).toEqual([])
  const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
  expect(widths[0]).toBeLessThanOrEqual(widths[1])
  expect(errors).toEqual([])
})
