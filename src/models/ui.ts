import { z } from 'zod'

export const supportedLocales = [
  'en',
  'zh-CN',
  'ja',
  'ko',
  'fr',
  'de',
  'es',
  'ar',
] as const

export type SupportedLocale = (typeof supportedLocales)[number]
export type ThemeMode = 'light' | 'dark'
export type RuntimeContainer = 'browser' | 'desktop-app' | 'mobile-app'
export type FormFactor = 'desktop' | 'mobile'
export type MockScenario = 'normal' | 'empty' | 'error'
export type DesktopItemType = 'app' | 'widget'
export type WidgetType = 'clock' | 'notepad'
export type DisplayMode = 'windowed' | 'maximized' | 'fullscreen'
export type WindowState = 'windowed' | 'maximized' | 'minimized'
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'
export type IntegrationTier = 'system' | 'sdk' | 'external'

export interface DeadZone {
  top: number
  bottom: number
  left: number
  right: number
}

export interface LayoutItemBase {
  id: string
  type: DesktopItemType
  x: number
  y: number
  w: number
  h: number
}

export interface AppIconItem extends LayoutItemBase {
  type: 'app'
  appId: string
}

export interface WidgetItem extends LayoutItemBase {
  type: 'widget'
  widgetType: WidgetType
  config: Record<string, unknown>
}

export type LayoutItem = AppIconItem | WidgetItem

export interface DesktopPageState {
  id: string
  items: LayoutItem[]
}

export interface LayoutState {
  version: number
  formFactor: FormFactor
  deadZone: DeadZone
  pages: DesktopPageState[]
}

export interface WindowManifest {
  defaultMode: DisplayMode
  allowMinimize: boolean
  allowMaximize: boolean
  allowClose: boolean
  allowFullscreen: boolean
  mobileFullscreenBehavior: 'cover_dead_zone' | 'keep_dead_zone'
  titleBarMode: 'system' | 'custom'
  placement: 'inplace' | 'new-container'
}

export interface AppDefinition {
  id: string
  iconKey: string
  labelKey: string
  summaryKey: string
  accent: string
  tier: IntegrationTier
  manifest: WindowManifest
}

export interface DesktopPayload {
  overview: {
    titleKey: string
    subtitleKey: string
  }
  apps: AppDefinition[]
  layout: LayoutState
}

export interface DataState<T> {
  status: LoadingState
  data: T | null
  error: string | null
}

export const systemPreferencesInputSchema = z.object({
  locale: z.enum(supportedLocales),
  theme: z.enum(['light', 'dark']),
  runtimeContainer: z.enum(['browser', 'desktop-app', 'mobile-app']),
  deadZoneTop: z.coerce.number().int().min(0).max(96),
  deadZoneBottom: z.coerce.number().int().min(0).max(120),
  deadZoneLeft: z.coerce.number().int().min(0).max(72),
  deadZoneRight: z.coerce.number().int().min(0).max(72),
})

export type SystemPreferencesInput = z.infer<typeof systemPreferencesInputSchema>

export const noteInputSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1)
    .max(180),
})

export type NoteInput = z.infer<typeof noteInputSchema>

export interface WindowRecord {
  id: string
  appId: string
  state: WindowState
  titleKey: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}
