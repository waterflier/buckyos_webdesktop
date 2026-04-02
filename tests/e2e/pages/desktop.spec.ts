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

  await expect(page.getByRole('button', { name: 'BuckyOS' })).toBeVisible()
  await expect(page.getByTestId('desktop-item-widget-clock')).toBeVisible()
  await expect(page.getByTestId('notepad-preview-widget-notepad')).toBeVisible()
  await expect(page.getByTestId('notepad-editor-widget-notepad')).toHaveCount(0)
  await expect(page.getByTestId('notepad-save-widget-notepad')).toHaveCount(0)
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

  await page.getByTestId('notepad-preview-widget-notepad').click()
  await expect(page.getByTestId('notepad-editor-widget-notepad')).toBeVisible()
  await expect(page.getByTestId('notepad-save-widget-notepad')).toBeVisible()
  await page.getByTestId('notepad-editor-widget-notepad').fill('Updated desktop note.')
  await page.getByTestId('notepad-save-widget-notepad').click()
  await expect(page.getByTestId('notepad-editor-widget-notepad')).toHaveCount(0)
  await expect(page.getByTestId('notepad-preview-widget-notepad')).toContainText(
    'Updated desktop note.',
  )

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
  await page.getByTestId('window-resize-right-settings').hover()
  await page.mouse.down()
  await page.mouse.move(
    (windowBeforeResize?.x ?? 0) + (windowBeforeResize?.width ?? 0) + 120,
    (windowBeforeResize?.y ?? 0) + (windowBeforeResize?.height ?? 0) / 2,
    { steps: 14 },
  )
  await page.mouse.up()
  const windowAfterWidthResize = await page.getByTestId('window-settings').boundingBox()
  expect(windowAfterWidthResize?.width).toBeGreaterThan(windowBeforeResize?.width ?? 0)
  await expect(page.getByTestId('window-resize-bottom-left-settings')).toBeVisible()
  await page.getByTestId('window-resize-bottom-right-settings').hover()
  await page.mouse.down()
  await page.mouse.move(
    (windowAfterWidthResize?.x ?? 0) + (windowAfterWidthResize?.width ?? 0) + 90,
    (windowAfterWidthResize?.y ?? 0) + (windowAfterWidthResize?.height ?? 0) + 90,
    { steps: 14 },
  )
  await page.mouse.up()
  const windowAfterResize = await page.getByTestId('window-settings').boundingBox()
  expect(windowAfterResize?.height).toBeGreaterThan(windowAfterWidthResize?.height ?? 0)
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

test('demos app renders common controls', async ({ page }) => {
  await page.goto('/?scenario=normal')

  await page.getByTestId('desktop-app-demos').click()
  await expect(page.getByTestId('window-demos')).toBeVisible()
  await expect(page.getByText('Control gallery', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Quick menu' }).click()
  await expect(page.getByRole('menuitem', { name: 'Pin to launcher' })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Pin to launcher' }).click()

  await page.getByRole('textbox', { name: 'Search query' }).fill('State matrix')
  await expect(page.getByRole('textbox', { name: 'Search query' })).toHaveValue('State matrix')
  await page.getByRole('tab', { name: 'Status' }).click()
  await expect(page.getByText('Control coverage')).toBeVisible()
})
