import { Settings, Palette, Network, Shield, Code, ChevronRight } from 'lucide-react'
import { useI18n } from '../../../../i18n/provider'
import { useSettingsSnapshot } from '../../hooks/use-settings-store'
import type { SettingsPage } from './Sidebar'

interface MobileSettingsListProps {
  onNavigate: (page: SettingsPage) => void
}

export function MobileSettingsList({ onNavigate }: MobileSettingsListProps) {
  const { t } = useI18n()
  const snapshot = useSettingsSnapshot()

  const { general, session, cluster, developer } = snapshot

  const groups: {
    title: string
    items: {
      key: SettingsPage
      icon: typeof Settings
      label: string
      value?: string
    }[]
  }[] = [
    {
      title: t('settings.mobile.system', 'System'),
      items: [
        {
          key: 'general',
          icon: Settings,
          label: t('settings.nav.general', 'General'),
          value: `v${general.software.version}`,
        },
        {
          key: 'appearance',
          icon: Palette,
          label: t('settings.nav.appearance', 'Appearance'),
          value: [
            session.appearance.theme === 'dark' ? t('common.dark', 'Dark') : t('common.light', 'Light'),
            session.appearance.language.toUpperCase(),
          ].join(' · '),
        },
      ],
    },
    {
      title: t('settings.mobile.networkSecurity', 'Network & Security'),
      items: [
        {
          key: 'cluster',
          icon: Network,
          label: t('settings.nav.cluster', 'Cluster Manager'),
          value: cluster.overview.clusterMode === 'single_node'
            ? t('settings.cluster.singleNode', 'Single Node')
            : `${cluster.overview.nodeCount} ${t('settings.cluster.nodes', 'Nodes')}`,
        },
        {
          key: 'privacy',
          icon: Shield,
          label: t('settings.nav.privacy', 'Privacy'),
        },
      ],
    },
    {
      title: t('settings.mobile.advanced', 'Advanced'),
      items: [
        {
          key: 'developer',
          icon: Code,
          label: t('settings.nav.developer', 'Developer Mode'),
          value: developer.modeEnabled
            ? t('settings.developer.on', 'On')
            : t('settings.developer.off', 'Off'),
        },
      ],
    },
  ]

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Header */}
      <h1 className="text-xl font-bold px-1" style={{ color: 'var(--cp-text)' }}>
        {t('settings.title', 'Settings')}
      </h1>

      {/* Groups */}
      {groups.map((group) => (
        <div key={group.title}>
          <p
            className="text-xs font-medium uppercase tracking-wide px-1 mb-1.5"
            style={{ color: 'var(--cp-muted)' }}
          >
            {group.title}
          </p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'color-mix(in srgb, var(--cp-surface) 90%, transparent)' }}
          >
            {group.items.map((item, idx) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors active:opacity-70"
                style={{
                  borderTop: idx > 0 ? '1px solid var(--cp-border)' : undefined,
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--cp-accent) 14%, transparent)',
                    color: 'var(--cp-accent)',
                  }}
                >
                  <item.icon size={16} />
                </div>
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                  {item.label}
                </span>
                {item.value && (
                  <span className="text-xs mr-1" style={{ color: 'var(--cp-muted)' }}>
                    {item.value}
                  </span>
                )}
                <ChevronRight size={16} style={{ color: 'var(--cp-muted)' }} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
