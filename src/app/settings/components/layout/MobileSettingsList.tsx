import { ChevronRight } from 'lucide-react'
import { MetricCard, PanelIntro } from '../../../../components/AppPanelPrimitives'
import { useI18n } from '../../../../i18n/provider'
import { useSettingsSnapshot } from '../../hooks/use-settings-store'
import {
  getSettingsPageGroup,
  settingsPageDefinitions,
  settingsPageGroups,
  type SettingsPage,
} from './navigation'

interface MobileSettingsListProps {
  onNavigate: (page: SettingsPage) => void
}

export function MobileSettingsList({ onNavigate }: MobileSettingsListProps) {
  const { t } = useI18n()
  const snapshot = useSettingsSnapshot()

  const { general, session, cluster, developer } = snapshot
  const itemValues: Partial<Record<SettingsPage, string>> = {
    general: `v${general.software.version}`,
    appearance: [
      session.appearance.theme === 'dark'
        ? t('common.dark', 'Dark')
        : t('common.light', 'Light'),
      session.appearance.language.toUpperCase(),
    ].join(' · '),
    cluster:
      cluster.overview.clusterMode === 'single_node'
        ? t('settings.cluster.singleNode', 'Single Node')
        : `${cluster.overview.nodeCount} ${t('settings.cluster.nodes', 'Nodes')}`,
    developer: developer.modeEnabled
      ? t('settings.developer.on', 'On')
      : t('settings.developer.off', 'Off'),
  }

  const groups = settingsPageGroups.map((group) => ({
    ...group,
    items: settingsPageDefinitions.filter((item) => item.group === group.key),
  }))

  return (
    <div className="space-y-4 px-4 py-4">
      <PanelIntro
        kicker={t('apps.settings', 'Settings')}
        title={t('settings.title', 'Settings')}
        body={t('settings.body', 'Choose the language and appearance for your desktop shell.')}
      />

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label={t('settings.nav.appearance', 'Appearance')}
          tone="accent"
          value={session.appearance.theme === 'dark'
            ? t('common.dark', 'Dark')
            : t('common.light', 'Light')}
        />
        <MetricCard
          label={t('settings.nav.cluster', 'Cluster Manager')}
          tone="success"
          value={cluster.overview.clusterMode === 'single_node'
            ? t('settings.cluster.singleNode', 'Single Node')
            : `${cluster.overview.nodeCount}`}
        />
        <div className="col-span-2">
          <MetricCard
            label={t('settings.nav.developer', 'Developer Mode')}
            tone={developer.modeEnabled ? 'warning' : 'neutral'}
            value={developer.modeEnabled
              ? t('settings.developer.on', 'On')
              : t('settings.developer.off', 'Off')}
          />
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.key} className="shell-subtle-panel p-2">
          <div className="px-3 pb-2 pt-2">
            <p className="shell-kicker">{t(group.labelKey, group.label)}</p>
          </div>
          <div className="space-y-1">
            {group.items.map((item) => {
              const fallbackGroup = getSettingsPageGroup(item.group)

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3.5 text-left transition-colors active:opacity-70"
                  style={{
                    background: 'color-mix(in srgb, var(--cp-surface) 82%, transparent)',
                  }}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px]"
                    style={{
                      background: 'color-mix(in srgb, var(--cp-accent-soft) 18%, var(--cp-surface))',
                      color: 'var(--cp-accent)',
                    }}
                  >
                    <item.icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                      {t(item.labelKey, item.label)}
                    </p>
                    <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {itemValues[item.key] ?? t(fallbackGroup.labelKey, fallbackGroup.label)}
                    </p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--cp-muted)' }} />
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
