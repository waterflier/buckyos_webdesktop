import { useI18n } from '../../../../i18n/provider'
import {
  settingsPageDefinitions,
  type SettingsPage,
} from './navigation'

interface SidebarProps {
  currentPage: SettingsPage
  onNavigate: (page: SettingsPage) => void
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { t } = useI18n()

  return (
    <nav
      className="flex h-full w-52 shrink-0 flex-col overflow-y-auto px-2.5 py-4"
      style={{ borderRight: '1px solid var(--cp-border)' }}
    >
      <div className="shell-panel px-4 py-4">
        <p className="shell-kicker">{t('apps.settings', 'Settings')}</p>
        <p
          className="mt-2 font-display text-lg font-semibold"
          style={{ color: 'var(--cp-text)' }}
        >
          {t('settings.title', 'Settings')}
        </p>
        <p className="mt-1 text-sm leading-6" style={{ color: 'var(--cp-muted)' }}>
          {t('settings.body', 'Choose the language and appearance for your desktop shell.')}
        </p>
      </div>
      <div className="mt-4 space-y-1">
        {settingsPageDefinitions.map((item) => {
          const active = currentPage === item.key

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm transition-colors"
              style={{
                background: active
                  ? 'color-mix(in srgb, var(--cp-accent-soft) 14%, var(--cp-surface-2))'
                  : 'transparent',
                color: active ? 'var(--cp-text)' : 'var(--cp-muted)',
                border: active
                  ? '1px solid color-mix(in srgb, var(--cp-accent) 22%, var(--cp-border))'
                  : '1px solid transparent',
              }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[14px]"
                style={{
                  background: active
                    ? 'color-mix(in srgb, var(--cp-accent) 16%, transparent)'
                    : 'color-mix(in srgb, var(--cp-surface) 84%, transparent)',
                  color: active ? 'var(--cp-accent)' : 'var(--cp-muted)',
                }}
              >
                <item.icon size={16} />
              </div>
              <span className="font-medium">{t(item.labelKey, item.label)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
