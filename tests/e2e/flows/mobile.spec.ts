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

test('mobile demos exposes dialog trigger and opens centered dialog', async ({
  page,
}) => {
  await page.goto('/?scenario=normal')

  const demosButton = page.getByRole('button', { name: 'Demos' })
  const demosBox = await demosButton.boundingBox()
  expect(demosBox).not.toBeNull()

  const startX = (demosBox?.x ?? 0) + (demosBox?.width ?? 0) / 2
  const startY = (demosBox?.y ?? 0) + (demosBox?.height ?? 0) / 2

  await demosButton.dispatchEvent('pointerdown', {
    bubbles: true,
    clientX: startX,
    clientY: startY,
    pointerId: 2,
    pointerType: 'touch',
  })
  await page.locator('body').dispatchEvent('pointerup', {
    bubbles: true,
    clientX: startX + 6,
    clientY: startY + 5,
    pointerId: 2,
    pointerType: 'touch',
  })

  await expect(page.getByText('Control gallery', { exact: true })).toBeVisible()
  const trigger = page.getByRole('button', { name: 'Window modal' }).last()
  await expect(trigger).toBeVisible()
  await trigger.tap()
  const dialog = page.getByRole('dialog', { name: 'Scoped window modal' })
  await expect(dialog).toBeVisible()

  const viewport = page.viewportSize()
  const dialogBox = await dialog.boundingBox()
  expect(viewport).not.toBeNull()
  expect(dialogBox).not.toBeNull()

  const viewportCenterX = (viewport?.width ?? 0) / 2
  const viewportCenterY = (viewport?.height ?? 0) / 2
  const dialogCenterX = (dialogBox?.x ?? 0) + (dialogBox?.width ?? 0) / 2
  const dialogCenterY = (dialogBox?.y ?? 0) + (dialogBox?.height ?? 0) / 2

  expect(Math.abs(dialogCenterX - viewportCenterX)).toBeLessThan(24)
  expect(Math.abs(dialogCenterY - viewportCenterY)).toBeLessThan(40)
})
