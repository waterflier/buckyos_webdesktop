import clsx from 'clsx'
import {
  Bug,
  House,
  MonitorSmartphone,
  PanelLeft,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from 'lucide-react'
import { useI18n } from '../../i18n/provider'
import type { AppDefinition, LayoutState, WindowRecord } from '../../models/ui'
import { AppIcon, TierBadge } from './DesktopVisuals'
import { appIconSurfaceStyle } from './DesktopVisualTokens'
import {
  connectionLabel,
  type ConnectionState,
} from './shell'

export function SystemSidebar({
  apps,
  connectionState,
  currentAppId,
  deadZone,
  onClose,
  onOpenApp,
  onReturnDesktop,
  open,
  runtimeContainer,
  safeAreaTop = 0,
  safeAreaBottom = 0,
  windows,
}: {
  apps: AppDefinition[]
  connectionState: ConnectionState
  currentAppId?: string
  deadZone: LayoutState['deadZone']
  onClose: () => void
  onOpenApp: (appId: string) => void
  onReturnDesktop: () => void
  open: boolean
  runtimeContainer: string
  safeAreaTop?: number
  safeAreaBottom?: number
  windows: WindowRecord[]
}) {
  const { t } = useI18n()
  const runningAppIds = new Set(
    windows
      .filter((windowItem) => windowItem.state !== 'minimized')
      .map((windowItem) => windowItem.appId),
  )
  const launcherApps = apps.filter(
    (app) => app.id !== 'settings' && app.id !== 'diagnostics',
  )
  const connectionIcon =
    connectionState === 'online'
      ? ShieldCheck
      : connectionState === 'degraded'
        ? ShieldAlert
        : ShieldX
  const ConnectionIcon = connectionIcon

  return (
    <div
      className={clsx(
        'absolute inset-0 z-[60] transition-opacity duration-200 ease-[var(--cp-ease-emphasis)]',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={t('common.cancel')}
        onClick={onClose}
        className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--cp-shadow)_32%,transparent)] backdrop-blur-[2px]"
      />
      <aside
        className={clsx(
          'absolute inset-y-0 left-0 w-[min(86vw,340px)] border-r border-[color:color-mix(in_srgb,var(--cp-border)_92%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--cp-surface)_96%,transparent),color-mix(in_srgb,var(--cp-surface-2)_94%,transparent))] shadow-[0_24px_80px_color-mix(in_srgb,var(--cp-shadow)_26%,transparent)] backdrop-blur-2xl transition-transform duration-250 ease-[var(--cp-ease-emphasis)]',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          className="desktop-scrollbar flex h-full flex-col gap-5 overflow-y-auto px-4 pb-5 pt-4 sm:px-5"
          style={{
            paddingTop: safeAreaTop + deadZone.top + 14,
            paddingBottom: safeAreaBottom + deadZone.bottom + 18,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="shell-kicker">{t('shell.systemPanel', 'System Panel')}</p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--cp-border)_88%,transparent)] bg-[color:color-mix(in_srgb,var(--cp-surface)_80%,transparent)] text-[color:var(--cp-muted)]"
            >
              <PanelLeft className="size-4" />
            </button>
          </div>

          <section className="shell-panel px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--cp-accent)_78%,white),color-mix(in_srgb,var(--cp-accent)_28%,var(--cp-surface)))] font-display text-lg font-semibold text-white shadow-[0_16px_28px_color-mix(in_srgb,var(--cp-shadow)_16%,transparent)]">
                B
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-[color:var(--cp-text)]">
                  bucky@local
                </p>
                <p className="truncate text-sm text-[color:var(--cp-muted)]">
                  {t(`runtime.${runtimeContainer}`, runtimeContainer)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="shell-pill px-3 py-1.5 text-[11px]">
                <ConnectionIcon className="size-3.5" />
                {connectionLabel(connectionState, t)}
              </span>
              <span className="shell-pill px-3 py-1.5 text-[11px]">
                <MonitorSmartphone className="size-3.5" />
                BuckyOS Shell
              </span>
            </div>
          </section>

          <button
            type="button"
            onClick={onReturnDesktop}
            className="inline-flex items-center justify-between rounded-[24px] border border-[color:color-mix(in_srgb,var(--cp-border)_88%,transparent)] bg-[color:color-mix(in_srgb,var(--cp-surface)_84%,transparent)] px-4 py-3 text-left text-sm font-medium text-[color:var(--cp-text)] transition-transform duration-150 ease-[var(--cp-ease-emphasis)] active:scale-[0.99]"
          >
            <span className="inline-flex items-center gap-2">
              <House className="size-4" />
              {t('shell.returnDesktop', 'Return to desktop')}
            </span>
            <span className="text-[color:var(--cp-muted)]">{runningAppIds.size}</span>
          </button>

          <div className="h-px bg-[color:color-mix(in_srgb,var(--cp-border)_78%,transparent)]" />

          <section className="space-y-2">
            <p className="shell-kicker">{t('shell.switchApps', 'Switch apps')}</p>
            {launcherApps.map((app) => {
              const isRunning = runningAppIds.has(app.id)
              const isCurrent = currentAppId === app.id

              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onOpenApp(app.id)}
                  className={clsx(
                    'flex w-full items-center justify-between rounded-[24px] border px-4 py-3 text-left transition-[transform,border-color,background-color] duration-150 ease-[var(--cp-ease-emphasis)] active:scale-[0.99]',
                    isCurrent
                      ? 'border-[color:color-mix(in_srgb,var(--cp-accent)_42%,transparent)] bg-[color:color-mix(in_srgb,var(--cp-accent-soft)_12%,var(--cp-surface))]'
                      : 'border-[color:color-mix(in_srgb,var(--cp-border)_88%,transparent)] bg-[color:color-mix(in_srgb,var(--cp-surface)_82%,transparent)]',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-[16px] border"
                      style={appIconSurfaceStyle(app.accent, 'window')}
                    >
                      <AppIcon iconKey={app.iconKey} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[color:var(--cp-text)]">
                        {t(app.labelKey)}
                      </span>
                      <span className="block truncate text-xs text-[color:var(--cp-muted)]">
                        {t(app.summaryKey)}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {isRunning ? (
                      <span className="rounded-full bg-[color:color-mix(in_srgb,var(--cp-success)_14%,var(--cp-surface))] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cp-success)]">
                        {t('shell.running', 'Live')}
                      </span>
                    ) : null}
                    <TierBadge tier={app.tier} />
                  </span>
                </button>
              )
            })}
          </section>

          <div className="h-px bg-[color:color-mix(in_srgb,var(--cp-border)_78%,transparent)]" />

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onOpenApp('settings')}
              className="flex w-full items-center justify-between rounded-[22px] border border-[color:color-mix(in_srgb,var(--cp-border)_88%,transparent)] bg-[color:color-mix(in_srgb,var(--cp-surface)_82%,transparent)] px-4 py-3 text-left text-sm font-medium text-[color:var(--cp-text)]"
            >
              <span className="inline-flex items-center gap-2">
                <Settings className="size-4" />
                {t('apps.settings')}
              </span>
              <span className="text-[color:var(--cp-muted)]">{t('shell.system', 'System')}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenApp('diagnostics')}
              className="flex w-full items-center justify-between rounded-[22px] border border-[color:color-mix(in_srgb,var(--cp-border)_88%,transparent)] bg-[color:color-mix(in_srgb,var(--cp-surface)_82%,transparent)] px-4 py-3 text-left text-sm font-medium text-[color:var(--cp-text)]"
            >
              <span className="inline-flex items-center gap-2">
                <Bug className="size-4" />
                {t('shell.systemInfo', 'System info')}
              </span>
              <span className="text-[color:var(--cp-muted)]">{t('apps.diagnostics')}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
