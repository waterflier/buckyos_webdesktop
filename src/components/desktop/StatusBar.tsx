import { IconButton, Menu, MenuItem } from '@mui/material'
import clsx from 'clsx'
import {
  BellDot,
  Ellipsis,
  HardDriveDownload,
  MessageCircle,
  Minimize2,
} from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../../i18n/provider'
import type { AppDefinition, FormFactor, LayoutState, ThemeMode } from '../../models/ui'
import {
  connectionLabel,
  connectionTone,
  mobileStatusBarMode,
  shellStatusBarHeight,
  type ConnectionState,
  type StatusTrayState,
  useMinuteClock,
} from './shell'

function StatusLogoButton({
  connectionState,
  highlightBorder = false,
  onClick,
}: {
  connectionState: ConnectionState
  highlightBorder?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label="BuckyOS"
      onClick={onClick}
      className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border bg-[color:color-mix(in_srgb,var(--cp-surface)_88%,transparent)] font-display text-sm font-semibold tracking-[-0.04em] text-[color:var(--cp-text)] shadow-[0_10px_24px_color-mix(in_srgb,var(--cp-shadow)_12%,transparent)] transition-transform duration-150 ease-[var(--cp-ease-emphasis)] active:scale-[0.96]"
      style={{
        borderColor: highlightBorder
          ? `color-mix(in srgb, ${connectionTone(connectionState)} 76%, var(--cp-border))`
          : 'color-mix(in srgb, var(--cp-border) 82%, transparent)',
      }}
    >
      B
    </button>
  )
}

function StatusTray({
  compact = false,
  locale,
  now,
  trayState,
}: {
  compact?: boolean
  locale: string
  now: Date
  trayState: StatusTrayState
}) {
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(now)

  return (
    <div
      className={clsx(
        'shell-pill ml-auto shrink-0 px-3 py-1.5 text-xs',
        compact ? 'gap-2 px-2.5 py-1.5' : '',
      )}
    >
      {trayState.backupActive ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--cp-warning)_14%,var(--cp-surface))] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cp-warning)]">
          <HardDriveDownload className="size-3.5" />
          <span className="hidden sm:inline">Backup</span>
        </span>
      ) : null}
      <span className="relative inline-flex items-center justify-center text-[color:var(--cp-text)]">
        <MessageCircle className="size-4" />
        {trayState.messageCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--cp-accent)] px-1 text-[9px] font-semibold text-white">
            {trayState.messageCount}
          </span>
        ) : null}
      </span>
      <span className="relative inline-flex items-center justify-center text-[color:var(--cp-text)]">
        <BellDot className="size-4" />
        {trayState.notificationCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--cp-danger)] px-1 text-[9px] font-semibold text-white">
            {trayState.notificationCount}
          </span>
        ) : null}
      </span>
      <span className="font-medium text-[color:var(--cp-text)]">{timeLabel}</span>
    </div>
  )
}

export function StatusBar({
  activeApp,
  connectionState,
  deadZone,
  formFactor,
  onCycleLocale,
  onMinimizeWindow,
  onOpenDiagnostics,
  onOpenSettings,
  onOpenSidebar,
  onToggleTheme,
  themeMode,
  trayState,
}: {
  activeApp?: AppDefinition
  connectionState: ConnectionState
  deadZone: LayoutState['deadZone']
  formFactor: FormFactor
  onCycleLocale: () => void
  onMinimizeWindow?: () => void
  onOpenDiagnostics: () => void
  onOpenSettings: () => void
  onOpenSidebar: () => void
  onToggleTheme: () => void
  themeMode: ThemeMode
  trayState: StatusTrayState
}) {
  const { locale, t } = useI18n()
  const now = useMinuteClock()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const activeMode =
    formFactor === 'mobile' && activeApp ? mobileStatusBarMode(activeApp) : null
  const barHeight = shellStatusBarHeight(formFactor, activeApp)
  const totalHeight = deadZone.top + barHeight
  const isDesktop = formFactor === 'desktop'
  const isMobile = !isDesktop
  const showSurface = isDesktop || activeMode === 'standard'
  const connectionText = connectionLabel(connectionState, t)
  const surfaceStyle =
    activeMode === 'standard' && activeApp
      ? {
          backgroundColor: `color-mix(in srgb, ${activeApp.accent} 14%, var(--cp-surface-2))`,
        }
      : {
          background:
            'linear-gradient(180deg,color-mix(in_srgb,var(--cp-surface)_94%,transparent),color-mix(in_srgb,var(--cp-surface)_72%,transparent))',
        }

  return (
    <div
      aria-label={t('common.statusBar')}
      className={clsx(
        'pointer-events-none inset-x-0 top-0 z-50',
        isMobile ? 'fixed' : 'absolute',
      )}
      style={{ height: totalHeight }}
    >
      {showSurface ? (
        <div
          className="absolute inset-x-0 top-0 backdrop-blur-xl"
          style={{
            height: totalHeight,
            ...surfaceStyle,
          }}
        />
      ) : null}
      {showSurface ? (
        <div
          className="absolute inset-x-0 h-px bg-[color:var(--cp-border)]/80"
          style={{ top: totalHeight }}
        />
      ) : null}

      <div
        className="relative flex items-center justify-between gap-3 px-3 text-[color:var(--cp-text)] sm:px-6"
        style={{
          height: totalHeight,
          paddingTop: deadZone.top,
        }}
      >
        {activeMode === 'standard' && activeApp ? (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <StatusLogoButton connectionState={connectionState} onClick={onOpenSidebar} />
              <button
                type="button"
                onClick={onToggleTheme}
                className="pointer-events-auto hidden rounded-full border border-[color:color-mix(in_srgb,var(--cp-border)_88%,transparent)] bg-[color:color-mix(in_srgb,var(--cp-surface)_78%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cp-muted)] sm:inline-flex"
              >
                {t(themeMode === 'light' ? 'common.light' : 'common.dark')}
              </button>
              <button
                type="button"
                onClick={onCycleLocale}
                className="pointer-events-auto hidden rounded-full border border-[color:color-mix(in_srgb,var(--cp-border)_88%,transparent)] bg-[color:color-mix(in_srgb,var(--cp-surface)_78%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cp-muted)] sm:inline-flex"
              >
                {locale}
              </button>
            </div>
            <div className="absolute left-1/2 top-1/2 flex min-w-0 max-w-[46vw] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
              <p className="truncate font-display text-sm font-semibold text-[color:var(--cp-text)]">
                {t(activeApp.labelKey)}
              </p>
              <p className="line-clamp-1 text-xs text-[color:var(--cp-muted)]">
                {t(activeApp.summaryKey)}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <IconButton
                aria-label={t('shell.appMenu', 'App menu')}
                size="small"
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                sx={{ pointerEvents: 'auto' }}
              >
                <Ellipsis className="size-4" />
              </IconButton>
              {onMinimizeWindow ? (
                <IconButton
                  aria-label={t('common.minimize')}
                  size="small"
                  onClick={onMinimizeWindow}
                  sx={{ pointerEvents: 'auto' }}
                >
                  <Minimize2 className="size-4" />
                </IconButton>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2.5">
              <StatusLogoButton
                connectionState={connectionState}
                highlightBorder={!isDesktop}
                onClick={onOpenSidebar}
              />
              {activeMode === 'compact' && activeApp ? (
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-[color:var(--cp-text)]">
                    {t(activeApp.labelKey)}
                  </p>
                </div>
              ) : null}
              {isDesktop ? (
                <div className="inline-flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: connectionTone(connectionState) }}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--cp-muted)]">
                    {connectionText}
                  </span>
                </div>
              ) : null}
            </div>
            {activeMode === 'compact' && activeApp ? (
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <IconButton
                  aria-label={t('shell.appMenu', 'App menu')}
                  size="small"
                  onClick={(event) => setMenuAnchor(event.currentTarget)}
                  sx={{ pointerEvents: 'auto' }}
                >
                  <Ellipsis className="size-4" />
                </IconButton>
                {onMinimizeWindow ? (
                  <IconButton
                    aria-label={t('common.minimize')}
                    size="small"
                    onClick={onMinimizeWindow}
                    sx={{ pointerEvents: 'auto' }}
                  >
                    <Minimize2 className="size-4" />
                  </IconButton>
                ) : null}
              </div>
            ) : (
              <StatusTray
                compact={!isDesktop}
                locale={locale}
                now={now}
                trayState={trayState}
              />
            )}
          </>
        )}
      </div>

      <Menu
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            onOpenSettings()
          }}
        >
          {t('apps.settings')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            onOpenDiagnostics()
          }}
        >
          {t('shell.systemInfo', 'System info')}
        </MenuItem>
        {onMinimizeWindow ? (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null)
              onMinimizeWindow()
            }}
          >
            {t('common.minimize')}
          </MenuItem>
        ) : null}
      </Menu>
    </div>
  )
}
