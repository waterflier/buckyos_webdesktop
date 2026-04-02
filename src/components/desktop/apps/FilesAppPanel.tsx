import { useI18n } from '../../../i18n/provider'
import { MetricCard, PanelIntro } from './AppPanelPrimitives'
import type { AppContentLoaderProps } from './types'

export function FilesAppPanel({ layoutState }: AppContentLoaderProps) {
  const { t } = useI18n()
  const totalItems = layoutState.pages.reduce((sum, page) => sum + page.items.length, 0)

  return (
    <div className="space-y-4">
      <PanelIntro
        kicker="Inventory"
        title={t('files.title')}
        body={t('files.scopeBody')}
      />
      <div className="grid gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,1.2fr)]">
        <MetricCard label={t('files.pages')} tone="accent" value={layoutState.pages.length} />
        <MetricCard label={t('files.items')} tone="success" value={totalItems} />
        <div className="shell-subtle-panel px-4 py-4">
          <p className="shell-kicker">{t('files.scope')}</p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--cp-muted)]">{t('files.scopeBody')}</p>
        </div>
      </div>
      {layoutState.pages.map((page) => (
        <section key={page.id} className="shell-subtle-panel p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-lg font-semibold">{page.id}</p>
            <span className="shell-pill px-3 py-1 text-xs">{page.items.length}</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {page.items.length > 0 ? (
              page.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-[color:color-mix(in_srgb,var(--cp-border)_84%,transparent)] bg-[color:color-mix(in_srgb,var(--cp-surface)_90%,transparent)] px-3 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-medium text-[color:var(--cp-text)]">{item.id}</span>
                    <span className="rounded-full bg-[color:color-mix(in_srgb,var(--cp-accent-soft)_14%,var(--cp-surface))] px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-[color:var(--cp-muted)]">
                      {item.type}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[color:var(--cp-muted)]">
                    {item.w} × {item.h}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] bg-[color:color-mix(in_srgb,var(--cp-surface)_88%,transparent)] px-4 py-4 text-sm text-[color:var(--cp-muted)]">
                {t('states.emptyBody')}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
