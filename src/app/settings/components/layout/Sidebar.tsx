import { Settings, Palette, Network, Shield, Code } from 'lucide-react'
import { useI18n } from '../../../../i18n/provider'

const navItems = [
  { key: 'general', icon: Settings, labelKey: 'settings.nav.general', label: 'General' },
  { key: 'appearance', icon: Palette, labelKey: 'settings.nav.appearance', label: 'Appearance' },
  { key: 'cluster', icon: Network, labelKey: 'settings.nav.cluster', label: 'Cluster Manager' },
  { key: 'privacy', icon: Shield, labelKey: 'settings.nav.privacy', label: 'Privacy' },
  { key: 'developer', icon: Code, labelKey: 'settings.nav.developer', label: 'Developer Mode' },
] as const

export type SettingsPage = (typeof navItems)[number]['key']

interface SidebarProps {
  currentPage: SettingsPage
  onNavigate: (page: SettingsPage) => void
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { t } = useI18n()

  return (
    <nav
      className="flex flex-col w-52 shrink-0 h-full py-3 overflow-y-auto"
      style={{ borderRight: '1px solid var(--cp-border)' }}
    >
      <div
        className="px-5 pb-3 mb-1 text-sm font-semibold"
        style={{ color: 'var(--cp-text)' }}
      >
        {t('settings.title', 'Settings')}
      </div>
      {navItems.map((item) => {
        const active = currentPage === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.key)}
            className="flex items-center gap-3 px-5 py-2 mx-2 rounded-lg text-sm transition-colors"
            style={{
              background: active ? 'var(--cp-surface-2)' : 'transparent',
              color: active ? 'var(--cp-text)' : 'var(--cp-muted)',
              borderLeft: active ? '2px solid var(--cp-accent)' : '2px solid transparent',
            }}
          >
            <item.icon size={16} />
            <span>{t(item.labelKey, item.label)}</span>
          </button>
        )
      })}
    </nav>
  )
}
