import { zodResolver } from '@hookform/resolvers/zod'
import { Button, TextField } from '@mui/material'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { MetricCard, PanelIntro } from '../../components/AppPanelPrimitives'
import { useI18n } from '../../i18n/provider'
import { localeLabels } from '../../mock/data'
import {
  systemPreferencesInputSchema,
  type SystemPreferencesInput,
} from '../../models/ui'
import type { AppContentLoaderProps } from '../types'
import { beginSiteDataReset } from './siteDataReset'

export function SettingsAppPanel({
  layoutState,
  onSaveSettings,
  runtimeContainer,
  themeMode,
}: AppContentLoaderProps) {
  const { locale, t } = useI18n()
  const appearanceSchema = systemPreferencesInputSchema.pick({
    locale: true,
    theme: true,
  })
  const form = useForm<Pick<SystemPreferencesInput, 'locale' | 'theme'>>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      locale,
      theme: themeMode,
    },
  })

  useEffect(() => {
    form.reset({
      locale,
      theme: themeMode,
    })
  }, [form, locale, themeMode])

  const runtimeLabel = t(`runtime.${runtimeContainer}`, runtimeContainer)
  const themeLabel = t(themeMode === 'light' ? 'common.light' : 'common.dark')
  const { deadZone } = layoutState
  const [isResettingSiteData, setIsResettingSiteData] = useState(false)

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        onSaveSettings({
          ...values,
          runtimeContainer: runtimeContainer as SystemPreferencesInput['runtimeContainer'],
          deadZoneTop: deadZone.top,
          deadZoneBottom: deadZone.bottom,
          deadZoneLeft: deadZone.left,
          deadZoneRight: deadZone.right,
        }),
      )}
      className="space-y-4"
    >
      <PanelIntro
        kicker="Appearance"
        title={t('settings.title')}
        body={t('settings.body')}
        aside={<span className="shell-pill px-3 py-1.5 text-xs">{runtimeLabel}</span>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <section className="shell-subtle-panel p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="locale"
              render={({ field }) => (
                <TextField {...field} label={t('common.language')} select SelectProps={{ native: true }}>
                  {Object.entries(localeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </TextField>
              )}
            />
            <Controller
              control={form.control}
              name="theme"
              render={({ field }) => (
                <TextField {...field} label={t('common.theme')} select SelectProps={{ native: true }}>
                  <option value="light">{t('common.light')}</option>
                  <option value="dark">{t('common.dark')}</option>
                </TextField>
              )}
            />
          </div>

          <p className="mt-4 text-sm leading-6 text-[color:var(--cp-muted)]">
            {t('settings.helper')}
          </p>

          <div className="mt-5 flex justify-end">
            <Button type="submit" disabled={!form.formState.isDirty}>
              {t('common.save')}
            </Button>
          </div>
        </section>

        <div className="grid gap-3">
          <MetricCard label={t('common.theme')} tone="accent" value={themeLabel} />
          <MetricCard
            label={t('common.language')}
            tone="neutral"
            value={localeLabels[locale as keyof typeof localeLabels] ?? locale}
          />
          <MetricCard label={t('common.runtime')} tone="success" value={runtimeLabel} />
          <div className="shell-subtle-panel px-4 py-4">
            <p className="shell-kicker">{t('shell.deadZone')}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[color:var(--cp-muted)]">
              <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--cp-surface)_82%,transparent)] px-3 py-2">
                {t('settings.deadZoneTop')} <span className="font-semibold text-[color:var(--cp-text)]">{deadZone.top}</span>
              </div>
              <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--cp-surface)_82%,transparent)] px-3 py-2">
                {t('settings.deadZoneBottom')} <span className="font-semibold text-[color:var(--cp-text)]">{deadZone.bottom}</span>
              </div>
              <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--cp-surface)_82%,transparent)] px-3 py-2">
                {t('settings.deadZoneLeft')} <span className="font-semibold text-[color:var(--cp-text)]">{deadZone.left}</span>
              </div>
              <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--cp-surface)_82%,transparent)] px-3 py-2">
                {t('settings.deadZoneRight')} <span className="font-semibold text-[color:var(--cp-text)]">{deadZone.right}</span>
              </div>
            </div>
          </div>
          <div className="shell-subtle-panel px-4 py-4">
            <p className="shell-kicker">
              {t('settings.testingDataKicker', 'Testing Data')}
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--cp-muted)]">
              {t(
                'settings.testingDataBody',
                'Clear all site-level test data, including LocalStorage, SessionStorage, cookies, caches, and IndexedDB, then reload the page to rebuild mock state.',
              )}
            </p>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                color="error"
                disabled={isResettingSiteData}
                onClick={() => {
                  setIsResettingSiteData(true)
                  beginSiteDataReset()
                }}
              >
                {isResettingSiteData
                  ? t('settings.testingDataResetting', 'Resetting...')
                  : t('settings.testingDataReset', 'Reset Site Test Data')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
