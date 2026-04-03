import { CodeAssistantAppPanel } from './codeassistant/CodeAssistantAppPanel'
import { DemosAppPanel } from './demos/DemosAppPanel'
import { DiagnosticsAppPanel } from './diagnostics/DiagnosticsAppPanel'
import { FilesAppPanel } from './files/FilesAppPanel'
import { MarketAppPanel } from './market/MarketAppPanel'
import { MessageHubAppPanel } from './messagehub/MessageHubAppPanel'
import { SettingsAppPanel } from './settings/SettingsAppPanel'
import { StudioAppPanel } from './studio/StudioAppPanel'
import { UnsupportedAppPanel } from './unsupported/UnsupportedAppPanel'
import type { AppDefinition } from '../models/ui'
import type { AppContentLoaderProps, DesktopAppItem } from './types'

const appLoaders = {
  settings: SettingsAppPanel,
  files: FilesAppPanel,
  studio: StudioAppPanel,
  market: MarketAppPanel,
  diagnostics: DiagnosticsAppPanel,
  demos: DemosAppPanel,
  codeassistant: CodeAssistantAppPanel,
  messagehub: MessageHubAppPanel,
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
