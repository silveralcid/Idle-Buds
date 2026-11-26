import { expect, test } from '@playwright/test'

test('built shell loads without runtime errors or horizontal overflow', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('requestfailed', (request) => errors.push(`Failed request: ${request.url()}`))

  const response = await page.goto('/')
  expect(response?.ok()).toBe(true)
  await expect(page.getByRole('heading', { name: 'Idle Buds', level: 1 })).toBeVisible()
  await expect(page.getByText('This is a development shell. Gameplay has not been implemented.'))
    .toBeVisible()
  await expect(page).toHaveTitle('Idle Buds | Development foundation')

  const layout = await page.evaluate(() => ({
    contentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }))
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth)
  expect(errors).toEqual([])
})
