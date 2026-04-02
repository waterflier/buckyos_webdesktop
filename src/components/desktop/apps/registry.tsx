import type { AppDefinition } from '../../../models/ui'
import { DemosAppPanel } from './DemosAppPanel'
import { DiagnosticsAppPanel } from './DiagnosticsAppPanel'
import { FilesAppPanel } from './FilesAppPanel'
import { MarketAppPanel } from './MarketAppPanel'
import { SettingsAppPanel } from './SettingsAppPanel'
import { StudioAppPanel } from './StudioAppPanel'
import { UnsupportedAppPanel } from './UnsupportedAppPanel'
import type { AppContentLoaderProps, DesktopAppItem } from './types'

const appLoaders = {
  settings: SettingsAppPanel,
  files: FilesAppPanel,
  studio: StudioAppPanel,
  market: MarketAppPanel,
  diagnostics: DiagnosticsAppPanel,
  demos: DemosAppPanel,
} as const

export function resolveDesktopApps(apps: AppDefinition[]): DesktopAppItem[] {
  return apps.map((app) => ({
    ...app,
    loader: appLoaders[app.id as keyof typeof appLoaders],
  }))
}

export function findDesktopAppById(
  apps: DesktopAppItem[],
  appId: string,
) {
  return apps.find((app) => app.id === appId)
}

export function AppContentRenderer(props: AppContentLoaderProps & { app: DesktopAppItem }) {
  const Loader = props.app.loader ?? UnsupportedAppPanel
  return <Loader {...props} />
}
