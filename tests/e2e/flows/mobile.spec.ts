import { expect, test } from '@playwright/test'

test.use({
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
})

test('mobile viewport opens in-place app with system title bar', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await page.goto('/?scenario=normal')

  await expect(page.getByTestId('drag-settings')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible()
  await expect(page.getByLabel('Status bar').locator('.shell-pill:visible')).toHaveCount(1)
  await expect(page.getByText('Secure session')).toHaveCount(0)

  const filesTile = page.getByTestId('desktop-item-app-files-mobile')
  const beforeDrag = await filesTile.boundingBox()
  await filesTile.hover()
  await page.mouse.down()
  await page.mouse.move((beforeDrag?.x ?? 0) - 56, (beforeDrag?.y ?? 0) + 108, {
    steps: 14,
  })
  await page.mouse.up()
  const afterDrag = await filesTile.boundingBox()
  expect(afterDrag?.x !== beforeDrag?.x || afterDrag?.y !== beforeDrag?.y).toBeTruthy()

  await page.reload()
  const settingsButton = page.getByRole('button', { name: 'Settings' })
  const settingsBox = await settingsButton.boundingBox()
  expect(settingsBox).not.toBeNull()

  const startX = (settingsBox?.x ?? 0) + (settingsBox?.width ?? 0) / 2
  const startY = (settingsBox?.y ?? 0) + (settingsBox?.height ?? 0) / 2

  await settingsButton.dispatchEvent('pointerdown', {
    bubbles: true,
    clientX: startX,
    clientY: startY,
    pointerId: 1,
    pointerType: 'touch',
  })
  await page.locator('body').dispatchEvent('pointerup', {
    bubbles: true,
    clientX: startX + 7,
    clientY: startY + 6,
    pointerId: 1,
    pointerType: 'touch',
  })
  await expect(page.getByText('System defaults')).toBeVisible()
  await expect(page.getByRole('button', { name: 'App menu' })).toBeVisible()
  const minimizeButton = page.getByRole('button', { name: 'Minimize' })
  await expect(minimizeButton).toBeVisible()
  await minimizeButton.tap()
  await expect(page.getByText('System defaults')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible()

  expect(consoleErrors).toEqual([])
})
