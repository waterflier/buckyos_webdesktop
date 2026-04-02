import { expect, test } from '@playwright/test'

function boxesOverlap(
  left: { x: number; y: number; width: number; height: number } | null,
  right: { x: number; y: number; width: number; height: number } | null,
) {
  if (!left || !right) {
    return false
  }

  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  )
}

test('desktop flow opens settings window and supports locale switch', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await page.goto('/?scenario=normal')

  await expect(page.getByText('BuckyOS')).toBeVisible()
  await expect(page.getByText('Clock')).toBeVisible()
  await expect(page.getByText('Notepad')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Prototype Lab' })).toHaveCount(0)
  await expect(page.getByTestId('drag-settings')).toHaveCount(0)

  const settingsIcon = page.getByTestId('desktop-app-settings')
  const beforeDrag = await settingsIcon.boundingBox()
  await settingsIcon.hover()
  await page.mouse.down()
  await page.mouse.move((beforeDrag?.x ?? 0) + 120, (beforeDrag?.y ?? 0) + 120, {
    steps: 12,
  })
  await page.mouse.up()
  const afterDrag = await settingsIcon.boundingBox()
  expect(afterDrag?.x).not.toBe(beforeDrag?.x)

  const notepadWidget = page.getByTestId('desktop-item-widget-notepad')
  const widgetBeforeDrag = await notepadWidget.boundingBox()
  await notepadWidget.hover()
  await page.mouse.down()
  await page.mouse.move((widgetBeforeDrag?.x ?? 0) + 220, (widgetBeforeDrag?.y ?? 0) - 120, {
    steps: 14,
  })
  await page.mouse.up()
  const settingsAfterWidgetDrag = await page.getByTestId('desktop-app-settings').boundingBox()
  const filesAfterWidgetDrag = await page.getByTestId('desktop-app-files').boundingBox()
  expect(boxesOverlap(settingsAfterWidgetDrag, filesAfterWidgetDrag)).toBeFalsy()

  await page.getByTestId('desktop-app-settings').click()
  await expect(page.getByText('System defaults')).toBeVisible()
  const windowBeforeDrag = await page.getByTestId('window-settings').boundingBox()
  await page.getByTestId('window-drag-settings').hover()
  await page.mouse.down()
  await page.mouse.move((windowBeforeDrag?.x ?? 0) + 180, (windowBeforeDrag?.y ?? 0) + 96, {
    steps: 16,
  })
  await page.mouse.up()
  const windowAfterDrag = await page.getByTestId('window-settings').boundingBox()
  expect(windowAfterDrag?.x).not.toBe(windowBeforeDrag?.x)
  const windowBeforeResize = await page.getByTestId('window-settings').boundingBox()
  await page.getByTestId('window-resize-settings').hover()
  await page.mouse.down()
  await page.mouse.move(
    (windowBeforeResize?.x ?? 0) + (windowBeforeResize?.width ?? 0) + 120,
    (windowBeforeResize?.y ?? 0) + (windowBeforeResize?.height ?? 0) + 90,
    { steps: 14 },
  )
  await page.mouse.up()
  const windowAfterResize = await page.getByTestId('window-settings').boundingBox()
  expect(windowAfterResize?.width).toBeGreaterThan(windowBeforeResize?.width ?? 0)
  expect(windowAfterResize?.height).toBeGreaterThan(windowBeforeResize?.height ?? 0)
  await page.getByRole('combobox', { name: 'Language' }).selectOption('zh-CN')
  await page.getByRole('button', { name: 'Save' }).last().click()
  await expect(page.getByText('系统默认项')).toBeVisible()
  await page.getByLabel('关闭').click()

  expect(consoleErrors).toEqual([])
})

test('empty and error states render', async ({ page }) => {
  await page.goto('/?scenario=empty')
  await expect(page.getByText('Layout is empty')).toBeVisible()

  await page.goto('/?scenario=error')
  await expect(page.getByText('Mock data failed')).toBeVisible()
})
