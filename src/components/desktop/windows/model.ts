import type { AppDefinition, WindowRecord } from '../../../models/ui'
import { findDesktopAppById } from '../apps/registry'
import type { DesktopAppItem } from '../apps/types'
import type { DesktopWindowDataModel, DesktopWindowLayerDataModel } from './types'

export function createWindowRecord(
  app: AppDefinition,
  index: number,
): WindowRecord {
  return {
    id: `${app.id}-${Date.now()}`,
    appId: app.id,
    state: app.manifest.defaultMode === 'windowed' ? 'windowed' : 'maximized',
    minimizedOrder: null,
    titleKey: app.labelKey,
    x: 48 + (index % 4) * 36,
    y: 54 + (index % 3) * 32,
    width: 540,
    height: 380,
    zIndex: 10 + index,
  }
}

export function createDesktopWindowLayerDataModel(
  apps: DesktopAppItem[],
  windows: WindowRecord[],
): DesktopWindowLayerDataModel {
  const visibleWindows = windows
    .filter((windowItem) => windowItem.state !== 'minimized')
    .map((windowItem) => {
      const app = findDesktopAppById(apps, windowItem.appId)

      if (!app) {
        return null
      }

      return {
        ...windowItem,
        app,
      }
    })
    .filter((windowItem): windowItem is DesktopWindowDataModel => Boolean(windowItem))
    .sort((left, right) => left.zIndex - right.zIndex)

  return {
    windows: visibleWindows,
    topWindow: visibleWindows[visibleWindows.length - 1],
  }
}
