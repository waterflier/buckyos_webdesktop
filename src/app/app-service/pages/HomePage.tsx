/* ── App Service Home Page ── */

import { useState } from 'react'
import {
  Plus,
  Play,
  AlertTriangle,
  Download,
  Square,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useI18n } from '../../../i18n/provider'
import { useAppServiceStore } from '../hooks/use-app-service-store'
import type { AppServiceItem } from '../mock/types'
import type { AppServiceNav } from '../components/layout/navigation'
import { AppIcon } from '../../../components/DesktopVisuals'

function statusIcon(status: AppServiceItem['status']) {
  switch (status) {
    case 'running':
      return <Play size={12} />
    case 'starting':
      return <Loader2 size={12} className="animate-spin" />
    case 'stopped':
      return <Square size={12} />
    case 'error':
      return <AlertTriangle size={12} />
    case 'installing':
      return <Download size={12} />
    default:
      return <Square size={12} />
  }
}

function statusColor(status: AppServiceItem['status']) {
  switch (status) {
    case 'running':
      return 'var(--cp-success)'
    case 'starting':
      return 'var(--cp-accent)'
    case 'stopped':
      return 'var(--cp-muted)'
    case 'error':
      return 'var(--cp-danger)'
    case 'installing':
      return 'var(--cp-warning)'
    default:
      return 'var(--cp-muted)'
  }
}

function statusLabel(status: AppServiceItem['status'], t: (k: string, f: string) => string) {
  switch (status) {
    case 'running':
      return t('appService.status.running', 'Running')
    case 'starting':
      return t('appService.status.starting', 'Starting')
    case 'stopped':
      return t('appService.status.stopped', 'Stopped')
    case 'error':
      return t('appService.status.error', 'Error')
    case 'installing':
      return t('appService.status.installing', 'Installing')
    default:
      return status
  }
}

/* ── App Card (for app layer) ── */

function AppCard({
  service,
  onOpen,
}: {
  service: AppServiceItem
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl p-4 text-left transition-colors hover:brightness-[1.02]"
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--cp-accent) 10%, var(--cp-surface-2))',
            color: 'var(--cp-text)',
          }}
        >
          <AppIcon iconKey={service.iconKey} className="!size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--cp-text)' }}>
              {service.name}
            </span>
            <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              v{service.version}
            </span>
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--cp-muted)' }}>
            {service.description}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span style={{ color: statusColor(service.status) }}>{statusIcon(service.status)}</span>
            <span
              className="text-xs font-medium"
              style={{ color: statusColor(service.status) }}
            >
              {statusLabel(service.status, (k, f) => f)}
            </span>
          </div>
          <ChevronRight size={14} style={{ color: 'var(--cp-muted)' }} />
        </div>
      </div>
      {service.status === 'installing' && service.installProgress != null && (
        <div className="mt-3">
          <div
            className="h-1.5 w-full rounded-full overflow-hidden"
            style={{ background: 'var(--cp-border)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${service.installProgress}%`,
                background: 'var(--cp-warning)',
              }}
            />
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--cp-muted)' }}>
            {service.installProgress}%
          </div>
        </div>
      )}
    </button>
  )
}

/* ── Service Row (for system/kernel layer) ── */

function ServiceRow({
  service,
  onOpen,
}: {
  service: AppServiceItem
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:brightness-[1.02]"
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-border)',
      }}
    >
      <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--cp-text)' }}>
        {service.name}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span style={{ color: statusColor(service.status) }}>{statusIcon(service.status)}</span>
        <span
          className="text-xs font-medium"
          style={{ color: statusColor(service.status) }}
        >
          {statusLabel(service.status, (k, f) => f)}
        </span>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--cp-muted)' }} />
    </button>
  )
}

/* ── Section Header ── */

function SectionHeader({
  title,
  count,
}: {
  title: string
  count: number
}) {
  return (
    <h2
      className="text-xs font-semibold uppercase tracking-wide mb-2"
      style={{ color: 'var(--cp-muted)' }}
    >
      {title} ({count})
    </h2>
  )
}

/* ── Home Page ── */

interface HomePageProps {
  onNavigate: (nav: AppServiceNav) => void
}

export function HomePage({ onNavigate }: HomePageProps) {
  const store = useAppServiceStore()
  const { t } = useI18n()
  const [, setTick] = useState(0)

  const appServices = store.getByLayer('app')
  const systemServices = store.getByLayer('system')
  const kernelServices = store.getByLayer('kernel')

  const handleOpen = (id: string) => {
    onNavigate({ page: 'detail', serviceId: id })
  }

  const handleInstall = () => {
    onNavigate({ page: 'install', installStep: 1 })
  }

  // Auto-refresh for installing/starting states
  const hasActiveStates = [...appServices, ...systemServices, ...kernelServices].some(
    (s) => s.status === 'installing' || s.status === 'starting',
  )
  if (hasActiveStates) {
    setTimeout(() => setTick((n) => n + 1), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--cp-text)' }}>
            {t('appService.title', 'App Service')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--cp-muted)' }}>
            {t('appService.subtitle', 'System service control panel')}
          </p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            background: 'var(--cp-accent)',
            color: 'white',
          }}
        >
          <Plus size={16} />
          {t('appService.install', 'Install')}
        </button>
      </div>

      {/* App Layer */}
      {appServices.length > 0 && (
        <section>
          <SectionHeader
            title={t('appService.layer.apps', 'Running Apps')}
            count={appServices.length}
          />
          <div className="space-y-2">
            {appServices.map((svc) => (
              <AppCard key={svc.id} service={svc} onOpen={() => handleOpen(svc.id)} />
            ))}
          </div>
        </section>
      )}

      {/* System Services Layer */}
      {systemServices.length > 0 && (
        <section>
          <SectionHeader
            title={t('appService.layer.system', 'System Services')}
            count={systemServices.length}
          />
          <div className="space-y-1.5">
            {systemServices.map((svc) => (
              <ServiceRow key={svc.id} service={svc} onOpen={() => handleOpen(svc.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Kernel Layer */}
      {kernelServices.length > 0 && (
        <section>
          <SectionHeader
            title={t('appService.layer.kernel', 'Kernel')}
            count={kernelServices.length}
          />
          <div className="space-y-1.5">
            {kernelServices.map((svc) => (
              <ServiceRow key={svc.id} service={svc} onOpen={() => handleOpen(svc.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
