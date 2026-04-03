import type {
  LayoutState,
  SystemPreferencesInput,
  ThemeMode,
} from '../../../models/ui'
import { AppContentRenderer } from '../apps/registry'
import type { DesktopAppItem } from '../apps/types'
import {
  WindowDialogProvider,
  resolveWindowDialogPermissions,
} from './dialogs'

export function MobileWindowSheet({
  activityLog,
  app,
  deadZone,
  layoutState,
  locale,
  onSaveSettings,
  runtimeContainer,
  safeAreaBottom = 0,
  themeMode,
  topInset,
}: {
  activityLog: string[]
  app?: DesktopAppItem
  deadZone: LayoutState['deadZone']
  layoutState: LayoutState
  locale: string
  onSaveSettings: (values: SystemPreferencesInput) => void
  runtimeContainer: string
  safeAreaBottom?: number
  themeMode: ThemeMode
  topInset: number
}) {
  if (!app) {
    return null
  }

  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-[color:color-mix(in_srgb,var(--cp-bg)_94%,var(--cp-surface))]">
      <WindowDialogProvider
        permissions={resolveWindowDialogPermissions(app)}
        surface="mobile"
      >
        <div
          className="flex h-full min-h-0 flex-col"
          style={{
            paddingBottom: safeAreaBottom + deadZone.bottom,
          }}
        >
          <div
            className="desktop-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
            style={{ paddingTop: topInset > 0 ? topInset + 14 : 14 }}
          >
            <AppContentRenderer
              activityLog={activityLog}
              app={app}
              layoutState={layoutState}
              locale={locale}
              onSaveSettings={onSaveSettings}
              runtimeContainer={runtimeContainer}
              themeMode={themeMode}
            />
          </div>
        </div>
      </WindowDialogProvider>
    </div>
  )
}
