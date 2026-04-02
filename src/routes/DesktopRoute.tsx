import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  useMediaQuery,
} from '@mui/material'
import clsx from 'clsx'
import { Maximize2, Minimize2, Square, X } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import GridLayoutBase, {
  type Layout,
  type LayoutItem as GridLayoutItem,
  noCompactor,
} from 'react-grid-layout'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import useSWR from 'swr'
import {
  AppIcon,
  TierBadge,
} from '../components/desktop/DesktopVisuals'
import {
  appIconSurfaceStyle,
  panelToneClasses,
} from '../components/desktop/DesktopVisualTokens'
import { StatusBar } from '../components/desktop/StatusBar'
import { SystemSidebar } from '../components/desktop/SystemSidebar'
import {
  mobileStatusBarMode,
  shellStatusBarHeight,
  type ConnectionState,
  type StatusTrayState,
  useMinuteClock,
} from '../components/desktop/shell'
import { useI18n } from '../i18n/provider'
import { defaultDeadZone, localeLabels } from '../mock/data'
import { fetchDesktopPayload } from '../mock/provider'
import {
  noteInputSchema,
  supportedLocales,
  systemPreferencesInputSchema,
} from '../models/ui'
import type {
  AppDefinition,
  DesktopPageState,
  FormFactor,
  LayoutItem,
  LayoutState,
  MockScenario,
  NoteInput,
  SupportedLocale,
  SystemPreferencesInput,
  ThemeMode,
  WindowRecord,
} from '../models/ui'
import { useThemeMode } from '../theme/provider'

const runtimeStorageKey = 'buckyos.prototype.runtime.v1'

const gridSpec = {
  desktop: { cols: 8, rows: 5, rowHeight: 112 },
  mobile: { cols: 4, rows: 6, rowHeight: 96 },
} as const

function useConnectionState(runtimeContainer: string): ConnectionState {
  const [isNavigatorOnline, setIsNavigatorOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsNavigatorOnline(true)
    const handleOffline = () => setIsNavigatorOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isNavigatorOnline) {
    return 'offline'
  }

  return runtimeContainer === 'browser' ? 'degraded' : 'online'
}

function nextSupportedLocale(locale: SupportedLocale) {
  const currentIndex = supportedLocales.indexOf(locale)
  return supportedLocales[(currentIndex + 1) % supportedLocales.length]
}

function readJson<T>(key: string) {
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function layoutStorageKey(formFactor: FormFactor) {
  return `buckyos.layout.${formFactor}.v1`
}

function legacyDeadZone(formFactor: FormFactor) {
  return formFactor === 'desktop'
    ? { top: 64, bottom: 24, left: 20, right: 20 }
    : { top: 52, bottom: 20, left: 12, right: 12 }
}

function matchesDeadZone(
  target: LayoutState['deadZone'] | undefined,
  expected: LayoutState['deadZone'],
) {
  return (
    target?.top === expected.top &&
    target?.bottom === expected.bottom &&
    target?.left === expected.left &&
    target?.right === expected.right
  )
}

function migrateDeadZone(layout: LayoutState, formFactor: FormFactor) {
  if (!matchesDeadZone(layout.deadZone, legacyDeadZone(formFactor))) {
    return layout
  }

  return {
    ...layout,
    deadZone: { ...defaultDeadZone },
  }
}

function appById(apps: AppDefinition[], appId: string) {
  return apps.find((app) => app.id === appId)
}

function getPageIndex(layoutState: LayoutState, itemId: string) {
  return layoutState.pages.findIndex((page) =>
    page.items.some((item) => item.id === itemId),
  )
}

function fits(
  page: DesktopPageState,
  x: number,
  y: number,
  w: number,
  h: number,
  cols: number,
  rows: number,
  excludeId?: string,
) {
  if (x + w > cols || y + h > rows) {
    return false
  }

  return !page.items.some((item) => {
    if (item.id === excludeId) {
      return false
    }

    return !(
      x + w <= item.x ||
      item.x + item.w <= x ||
      y + h <= item.y ||
      item.y + item.h <= y
    )
  })
}

function findNextSlot(
  page: DesktopPageState,
  item: LayoutItem,
  formFactor: FormFactor,
) {
  const spec = gridSpec[formFactor]

  for (let y = 0; y < spec.rows; y += 1) {
    for (let x = 0; x < spec.cols; x += 1) {
      if (fits(page, x, y, item.w, item.h, spec.cols, spec.rows, item.id)) {
        return { x, y }
      }
    }
  }

  return { x: 0, y: 0 }
}

function mapPageToGrid(page: DesktopPageState): GridLayoutItem[] {
  return page.items.map((item) => ({
    i: item.id,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    static: false,
  }))
}

function clampToGrid(item: LayoutItem, formFactor: FormFactor) {
  const spec = gridSpec[formFactor]

  return {
    x: Math.max(0, Math.min(item.x, spec.cols - item.w)),
    y: Math.max(0, Math.min(item.y, spec.rows - item.h)),
  }
}

function normalizePageItems(
  page: DesktopPageState,
  formFactor: FormFactor,
  prioritizedItemId?: string,
) {
  const placements = new Map<string, { x: number; y: number }>()
  const workingPage: DesktopPageState = { ...page, items: [] }
  const stableOrder = new Map(page.items.map((item, index) => [item.id, index]))
  const orderedItems = [...page.items].sort((left, right) => {
    if (left.id === prioritizedItemId) {
      return -1
    }

    if (right.id === prioritizedItemId) {
      return 1
    }

    if (left.y !== right.y) {
      return left.y - right.y
    }

    if (left.x !== right.x) {
      return left.x - right.x
    }

    return (stableOrder.get(left.id) ?? 0) - (stableOrder.get(right.id) ?? 0)
  })

  orderedItems.forEach((item) => {
    const clamped = clampToGrid(item, formFactor)
    const target =
      fits(
        workingPage,
        clamped.x,
        clamped.y,
        item.w,
        item.h,
        gridSpec[formFactor].cols,
        gridSpec[formFactor].rows,
        item.id,
      )
        ? clamped
        : findNextSlot(
            workingPage,
            { ...item, x: clamped.x, y: clamped.y },
            formFactor,
          )

    placements.set(item.id, target)
    workingPage.items.push({ ...item, x: target.x, y: target.y })
  })

  return {
    ...page,
    items: page.items.map((item) => {
      const target = placements.get(item.id)
      return target ? { ...item, x: target.x, y: target.y } : item
    }),
  }
}

function updatePageFromGrid(
  page: DesktopPageState,
  nextLayout: Layout,
  formFactor: FormFactor,
) {
  const layoutMap = new Map(nextLayout.map((entry) => [entry.i, entry]))
  const prioritizedItemId = nextLayout.find((entry) => entry.moved)?.i
  const nextPage = {
    ...page,
    items: page.items.map((item) => {
      const positioned = layoutMap.get(item.id)

      if (!positioned) {
        return item
      }

      return {
        ...item,
        x: positioned.x,
        y: positioned.y,
        w: positioned.w,
        h: positioned.h,
      }
    }),
  }

  return normalizePageItems(nextPage, formFactor, prioritizedItemId)
}

function createWindowRecord(
  app: AppDefinition,
  index: number,
): WindowRecord {
  return {
    id: `${app.id}-${Date.now()}`,
    appId: app.id,
    state: app.manifest.defaultMode === 'windowed' ? 'windowed' : 'maximized',
    titleKey: app.labelKey,
    x: 48 + (index % 4) * 36,
    y: 54 + (index % 3) * 32,
    width: 540,
    height: 380,
    zIndex: 10 + index,
  }
}

export function DesktopRoute() {
  const { locale, setLocale, t } = useI18n()
  const { themeMode, setThemeMode } = useThemeMode()
  const isMobile = useMediaQuery('(max-width:768px)')
  const formFactor: FormFactor = isMobile ? 'mobile' : 'desktop'
  const [searchParams, setSearchParams] = useSearchParams()
  const initialScenario =
    (searchParams.get('scenario') as MockScenario | null) ?? 'normal'
  const [scenario] = useState<MockScenario>(initialScenario)
  const [layoutState, setLayoutState] = useState<LayoutState | null>(null)
  const [windows, setWindows] = useState<WindowRecord[]>([])
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [activityLog, setActivityLog] = useState<string[]>([])
  const [isSystemSidebarOpen, setIsSystemSidebarOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [runtimeContainer, setRuntimeContainer] = useState(() => {
    return (
      (window.localStorage.getItem(runtimeStorageKey) as
        | 'browser'
        | 'desktop-app'
        | 'mobile-app'
        | null) ?? 'browser'
    )
  })
  const [contextMenu, setContextMenu] = useState<{
    itemId: string
    mouseX: number
    mouseY: number
  } | null>(null)
  const suppressOpenItemId = useRef<string | null>(null)
  const draggedOpenBlockItemId = useRef<string | null>(null)
  const draggedOpenBlockTimeoutId = useRef<number | null>(null)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const [workspaceSize, setWorkspaceSize] = useState({ width: 960, height: 720 })

  const { data, error, isLoading, mutate } = useSWR(
    ['desktop-payload', formFactor, scenario],
    ([, nextFormFactor, nextScenario]) =>
      fetchDesktopPayload({
        formFactor: nextFormFactor as FormFactor,
        scenario: nextScenario as MockScenario,
      }),
  )

  const apps = data?.apps ?? []
  const connectionState = useConnectionState(runtimeContainer)
  const currentSpec = gridSpec[formFactor]
  const resetViewportState = () => {
    setWindows([])
  }
  const applyResolvedLayout = (nextLayout: LayoutState) => {
    setLayoutState(nextLayout)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetViewportState()
    setIsSystemSidebarOpen(false)
  }, [formFactor])

  useEffect(() => {
    window.localStorage.setItem(runtimeStorageKey, runtimeContainer)
  }, [runtimeContainer])

  useEffect(() => {
    return () => {
      if (draggedOpenBlockTimeoutId.current) {
        window.clearTimeout(draggedOpenBlockTimeoutId.current)
      }
    }
  }, [])

  useEffect(() => {
    const current = searchParams.get('scenario') ?? 'normal'
    if (current === scenario) {
      return
    }

    const params = new URLSearchParams(searchParams)
    params.set('scenario', scenario)
    setSearchParams(params, { replace: true })
  }, [scenario, searchParams, setSearchParams])

  useEffect(() => {
    if (!data) {
      return
    }

    if (scenario === 'normal') {
      const stored = readJson<LayoutState>(layoutStorageKey(formFactor))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      applyResolvedLayout(stored ? migrateDeadZone(stored, formFactor) : data.layout)
      return
    }
    applyResolvedLayout(data.layout)
  }, [data, formFactor, scenario])

  useEffect(() => {
    if (!layoutState || scenario !== 'normal') {
      return
    }

    writeJson(layoutStorageKey(formFactor), layoutState)
  }, [formFactor, layoutState, scenario])

  useEffect(() => {
    if (!workspaceRef.current) {
      return
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (!entry) {
        return
      }

      setWorkspaceSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })

    resizeObserver.observe(workspaceRef.current)

    return () => resizeObserver.disconnect()
  }, [])

  const resolvedDeadZone = layoutState?.deadZone ?? data?.layout.deadZone ?? {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
  const workspaceInnerWidth = Math.max(
    workspaceSize.width - resolvedDeadZone.left - resolvedDeadZone.right,
    320,
  )

  const logActivity = (message: string) => {
    const stamp = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date())

    setActivityLog((prev) => [`${stamp} · ${message}`, ...prev].slice(0, 8))
  }

  const restoreDefaults = () => {
    if (!data) {
      return
    }

    window.localStorage.removeItem(layoutStorageKey(formFactor))
    setLayoutState(structuredClone(data.layout))
    setWindows([])
  }

  const handleOpenApp = (appId: string) => {
    const app = appById(apps, appId)

    if (!app) {
      return
    }

    if (app.manifest.placement === 'new-container' || app.tier === 'external') {
      const message = t('activity.external', 'Requested new-container launch for {{name}}', {
        name: t(app.labelKey, app.id),
      })
      logActivity(message)
      setSnackbar(t('external.body'))
      return
    }

    setWindows((prev) => {
      const existing = prev.find((windowItem) => windowItem.appId === appId)

      if (existing) {
        return prev.map((windowItem, index) =>
          windowItem.id === existing.id
            ? {
                ...windowItem,
                state:
                  app.manifest.defaultMode === 'windowed'
                    ? 'windowed'
                    : 'maximized',
                zIndex: prev.length + 10,
              }
            : { ...windowItem, zIndex: 10 + index },
        )
      }

      return [...prev, createWindowRecord(app, prev.length)]
    })
    logActivity(
      t('activity.opened', 'Opened {{name}}', { name: t(app.labelKey, app.id) }),
    )
  }

  const handleCloseWindow = (windowId: string) => {
    const closing = windows.find((windowItem) => windowItem.id === windowId)
    if (closing) {
      const app = appById(apps, closing.appId)
      logActivity(
        t('activity.closed', 'Closed {{name}}', {
          name: t(app?.labelKey ?? closing.titleKey),
        }),
      )
    }

    setWindows((prev) => prev.filter((windowItem) => windowItem.id !== windowId))
  }

  const focusWindow = (windowId: string) => {
    setWindows((prev) => {
      const top = prev.length + 12
      return prev.map((windowItem, index) =>
        windowItem.id === windowId
          ? { ...windowItem, zIndex: top }
          : { ...windowItem, zIndex: 10 + index },
      )
    })
  }

  const toggleMaximizeWindow = (windowId: string) => {
    const target = windows.find((windowItem) => windowItem.id === windowId)
    if (!target) {
      return
    }

    const app = appById(apps, target.appId)
    logActivity(
      t('activity.maximized', 'Toggled maximize for {{name}}', {
        name: t(app?.labelKey ?? target.titleKey),
      }),
    )
    setWindows((prev) =>
      prev.map((windowItem) =>
        windowItem.id === windowId
          ? {
              ...windowItem,
              state:
                windowItem.state === 'maximized' ? 'windowed' : 'maximized',
            }
          : windowItem,
      ),
    )
  }

  const minimizeWindow = (windowId: string) => {
    const target = windows.find((windowItem) => windowItem.id === windowId)
    if (!target) {
      return
    }

    const app = appById(apps, target.appId)
    logActivity(
      t('activity.minimized', 'Minimized {{name}}', {
        name: t(app?.labelKey ?? target.titleKey),
      }),
    )

    setWindows((prev) =>
      prev.map((windowItem) =>
        windowItem.id === windowId
          ? { ...windowItem, state: 'minimized' }
          : windowItem,
      ),
    )
  }

  const handleLayoutChange = (pageId: string, nextLayout: Layout) => {
    setLayoutState((prev) => {
      if (!prev) {
        return prev
      }

      return {
        ...prev,
        pages: prev.pages.map((page) =>
          page.id === pageId ? updatePageFromGrid(page, nextLayout, formFactor) : page,
        ),
      }
    })
  }

  const suppressNextOpen = (itemId: string) => {
    suppressOpenItemId.current = itemId
    window.setTimeout(() => {
      if (suppressOpenItemId.current === itemId) {
        suppressOpenItemId.current = null
      }
    }, 180)
  }

  const blockOpenAfterDrag = (itemId: string) => {
    draggedOpenBlockItemId.current = itemId
    if (draggedOpenBlockTimeoutId.current) {
      window.clearTimeout(draggedOpenBlockTimeoutId.current)
    }
    draggedOpenBlockTimeoutId.current = window.setTimeout(() => {
      if (draggedOpenBlockItemId.current === itemId) {
        draggedOpenBlockItemId.current = null
      }
      draggedOpenBlockTimeoutId.current = null
    }, 240)
  }

  const consumeOpenBlock = (itemId: string) => {
    if (draggedOpenBlockItemId.current === itemId) {
      draggedOpenBlockItemId.current = null
      if (draggedOpenBlockTimeoutId.current) {
        window.clearTimeout(draggedOpenBlockTimeoutId.current)
        draggedOpenBlockTimeoutId.current = null
      }
      return true
    }

    if (suppressOpenItemId.current === itemId) {
      suppressOpenItemId.current = null
      return true
    }

    return false
  }

  const handleGridDragStart = (
    _pageId: string,
    oldItem: GridLayoutItem | null,
    newItem: GridLayoutItem | null,
  ) => {
    const itemId = newItem?.i ?? oldItem?.i
    if (!itemId) {
      return
    }

    blockOpenAfterDrag(itemId)
    suppressNextOpen(itemId)
  }

  const handleGridDragStop = (
    pageId: string,
    oldItem: GridLayoutItem | null,
    newItem: GridLayoutItem | null,
  ) => {
    const itemId = newItem?.i ?? oldItem?.i
    if (itemId) {
      blockOpenAfterDrag(itemId)
      suppressNextOpen(itemId)
    }

    if (!newItem) {
      return
    }

    const positionChanged =
      !oldItem ||
      oldItem.x !== newItem.x ||
      oldItem.y !== newItem.y ||
      oldItem.w !== newItem.w ||
      oldItem.h !== newItem.h

    if (!positionChanged) {
      return
    }

    setLayoutState((prev) => {
      if (!prev) {
        return prev
      }

      return {
        ...prev,
        pages: prev.pages.map((page) =>
          page.id === pageId ? normalizePageItems(page, formFactor, newItem.i) : page,
        ),
      }
    })

  }

  const moveItemBetweenPages = (itemId: string, direction: -1 | 1) => {
    setLayoutState((prev) => {
      if (!prev) {
        return prev
      }

      const pageIndex = getPageIndex(prev, itemId)
      if (pageIndex < 0) {
        return prev
      }

      const sourcePage = prev.pages[pageIndex]
      const item = sourcePage.items.find((entry) => entry.id === itemId)
      if (!item) {
        return prev
      }

      const targetPageIndex = pageIndex + direction
      const nextPages = prev.pages.map((page) => ({
        ...page,
        items: [...page.items],
      }))

      if (targetPageIndex < 0) {
        return prev
      }

      if (targetPageIndex >= nextPages.length) {
        nextPages.push({
          id: `${formFactor}-page-${nextPages.length + 1}`,
          items: [],
        })
      }

      const sourceItems = nextPages[pageIndex].items.filter((entry) => entry.id !== itemId)
      nextPages[pageIndex].items = sourceItems

      const targetPage = nextPages[targetPageIndex]
      const slot = findNextSlot(targetPage, item, formFactor)
      targetPage.items = [...targetPage.items, { ...item, x: slot.x, y: slot.y }]

      return {
        ...prev,
        pages: nextPages,
      }
    })
    setContextMenu(null)
  }

  const updateWidgetNote = (itemId: string, content: string) => {
    setLayoutState((prev) => {
      if (!prev) {
        return prev
      }

      return {
        ...prev,
        pages: prev.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === itemId && item.type === 'widget'
              ? {
                  ...item,
                  config: {
                    ...item.config,
                    content,
                  },
                }
              : item,
          ),
        })),
      }
    })
  }

  const applySettings = (values: SystemPreferencesInput) => {
    setLocale(values.locale)
    setThemeMode(values.theme as ThemeMode)
    setRuntimeContainer(values.runtimeContainer)
    setLayoutState((prev) => {
      if (!prev) {
        return prev
      }

      return {
        ...prev,
        deadZone: {
          top: values.deadZoneTop,
          bottom: values.deadZoneBottom,
          left: values.deadZoneLeft,
          right: values.deadZoneRight,
        },
      }
    })

    logActivity(t('activity.saved'))
    setSnackbar(t('activity.saved'))
  }

  const visibleWindows = useMemo(
    () =>
      [...windows]
        .filter((windowItem) => windowItem.state !== 'minimized')
        .sort((a, b) => a.zIndex - b.zIndex),
    [windows],
  )

  const topMobileWindow = visibleWindows[visibleWindows.length - 1]
  const activeMobileApp =
    formFactor === 'mobile' && topMobileWindow
      ? appById(apps, topMobileWindow.appId)
      : undefined
  const shellBarHeight = shellStatusBarHeight(formFactor, activeMobileApp)
  const desktopWorkspaceTopInset = resolvedDeadZone.top + shellBarHeight
  const mobileSheetTopInset =
    activeMobileApp && mobileStatusBarMode(activeMobileApp) === 'standard'
      ? resolvedDeadZone.top + shellBarHeight
      : 0
  const workspaceTopPadding =
    formFactor === 'mobile' && topMobileWindow ? resolvedDeadZone.top : desktopWorkspaceTopInset
  const workspaceInnerHeight = Math.max(
    workspaceSize.height - workspaceTopPadding - resolvedDeadZone.bottom,
    360,
  )
  const trayState = useMemo<StatusTrayState>(
    () => ({
      backupActive: windows.some(
        (windowItem) =>
          windowItem.appId === 'files' && windowItem.state !== 'minimized',
      ),
      messageCount: Math.min(
        windows.filter((windowItem) => windowItem.state !== 'minimized').length,
        3,
      ),
      notificationCount: Math.min(activityLog.length, 9),
    }),
    [activityLog.length, windows],
  )

  const toggleSidebar = () => setIsSystemSidebarOpen((prev) => !prev)
  const closeSidebar = () => setIsSystemSidebarOpen(false)
  const handleReturnDesktop = () => {
    setWindows((prev) =>
      prev.map((windowItem) =>
        windowItem.state === 'minimized'
          ? windowItem
          : { ...windowItem, state: 'minimized' },
      ),
    )
    closeSidebar()
  }
  const handleSelectSidebarApp = (appId: string) => {
    handleOpenApp(appId)
    closeSidebar()
  }
  const handleCycleLocale = () => setLocale(nextSupportedLocale(locale))
  const handleToggleTheme = () =>
    setThemeMode(themeMode === 'light' ? 'dark' : 'light')

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.42),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_28%)]" />
      <section className="relative min-h-screen overflow-hidden">
        <div className="relative min-h-screen overflow-hidden" ref={workspaceRef}>
          {!isLoading && !error && layoutState ? (
            <>
              <SystemSidebar
                apps={apps}
                connectionState={connectionState}
                currentAppId={activeMobileApp?.id}
                deadZone={resolvedDeadZone}
                onClose={closeSidebar}
                onOpenApp={handleSelectSidebarApp}
                onReturnDesktop={handleReturnDesktop}
                open={isSystemSidebarOpen}
                runtimeContainer={runtimeContainer}
                windows={windows}
              />
              <StatusBar
                activeApp={activeMobileApp}
                connectionState={connectionState}
                deadZone={resolvedDeadZone}
                formFactor={formFactor}
                onCycleLocale={handleCycleLocale}
                onMinimizeWindow={
                  isMobile && topMobileWindow
                    ? () => minimizeWindow(topMobileWindow.id)
                    : undefined
                }
                onOpenDiagnostics={() => handleSelectSidebarApp('diagnostics')}
                onOpenSettings={() => handleSelectSidebarApp('settings')}
                onOpenSidebar={toggleSidebar}
                onToggleTheme={handleToggleTheme}
                themeMode={themeMode}
                trayState={trayState}
              />
              <div
                className="relative"
                style={{
                  paddingTop: workspaceTopPadding,
                  paddingBottom: resolvedDeadZone.bottom,
                  paddingLeft: resolvedDeadZone.left,
                  paddingRight: resolvedDeadZone.right,
                }}
              >
                {layoutState.pages.length === 0 ||
                layoutState.pages.every((page) => page.items.length === 0) ? (
                  <EmptyState onRestore={restoreDefaults} />
                ) : (
                  <Swiper
                    modules={[Pagination]}
                    allowTouchMove={isMobile}
                    pagination={{ clickable: true }}
                    className="h-full"
                    style={{ height: workspaceInnerHeight }}
                  >
                    {layoutState.pages.map((page) => (
                      <SwiperSlide key={page.id} className="h-full">
                        <div className="h-full px-4 pb-16 pt-6 sm:px-6">
                          <GridLayoutBase
                            className="layout h-full"
                            gridConfig={{
                              cols: currentSpec.cols,
                              rowHeight: currentSpec.rowHeight,
                              margin: isMobile ? [12, 12] : [16, 16],
                              containerPadding: [0, 0],
                              maxRows: currentSpec.rows,
                            }}
                            layout={mapPageToGrid(page)}
                            width={workspaceInnerWidth - (isMobile ? 32 : 48)}
                            resizeConfig={{ enabled: false }}
                            dragConfig={{
                              enabled: true,
                              handle: '.desktop-tile-shell',
                              cancel: '.widget-interactive',
                              threshold: isMobile ? 5 : 4,
                            }}
                            compactor={noCompactor}
                            onDragStart={(_, oldItem, newItem) =>
                              handleGridDragStart(page.id, oldItem, newItem)
                            }
                            onLayoutChange={(next: Layout) =>
                              handleLayoutChange(page.id, next)
                            }
                            onDragStop={(_, oldItem, newItem) =>
                              handleGridDragStop(page.id, oldItem, newItem)
                            }
                          >
                            {page.items.map((item) => (
                              <div key={item.id}>
                                <DesktopTile
                                  app={item.type === 'app' ? appById(apps, item.appId) : undefined}
                                  isDesktop={!isMobile}
                                  item={item}
                                  isSelected={selectedItemId === item.id}
                                  onOpen={() =>
                                    item.type === 'app'
                                      ? consumeOpenBlock(item.id)
                                        ? undefined
                                        : handleOpenApp(item.appId)
                                      : setSelectedItemId(item.id)
                                  }
                                  onOpenContextMenu={(event) => {
                                    event.preventDefault()
                                    setSelectedItemId(item.id)
                                    setContextMenu({
                                      itemId: item.id,
                                      mouseX: event.clientX + 2,
                                      mouseY: event.clientY - 6,
                                    })
                                  }}
                                  onSaveNote={updateWidgetNote}
                                />
                              </div>
                            ))}
                          </GridLayoutBase>
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                )}
              </div>

              {!isMobile && (
                <DesktopWindowLayer
                  apps={apps}
                  deadZone={resolvedDeadZone}
                  onClose={handleCloseWindow}
                  onFocus={focusWindow}
                  onMaximize={toggleMaximizeWindow}
                  onMinimize={minimizeWindow}
                  onSaveSettings={applySettings}
                  runtimeContainer={runtimeContainer}
                  themeMode={themeMode}
                  locale={locale}
                  windows={visibleWindows}
                  workspaceSize={workspaceSize}
                  topInset={desktopWorkspaceTopInset}
                  layoutState={layoutState}
                  activityLog={activityLog}
                />
              )}

              {isMobile && topMobileWindow && (
                <MobileWindowSheet
                  app={appById(apps, topMobileWindow.appId)}
                  deadZone={resolvedDeadZone}
                  layoutState={layoutState}
                  locale={locale}
                  onSaveSettings={applySettings}
                  runtimeContainer={runtimeContainer}
                  themeMode={themeMode}
                  topInset={mobileSheetTopInset}
                  activityLog={activityLog}
                />
              )}
            </>
          ) : null}

          {isLoading ? <LoadingState /> : null}
          {error ? <ErrorState onRetry={() => void mutate()} /> : null}
        </div>
      </section>

      <Menu
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            const pageIndex = contextMenu && layoutState ? getPageIndex(layoutState, contextMenu.itemId) : -1
            const item = pageIndex >= 0 ? layoutState?.pages[pageIndex].items.find((entry) => entry.id === contextMenu?.itemId) : null
            if (item?.type === 'app') {
              handleOpenApp(item.appId)
            }
            setContextMenu(null)
          }}
        >
          {t('common.open')}
        </MenuItem>
        <MenuItem
          disabled={!contextMenu || !layoutState || getPageIndex(layoutState, contextMenu.itemId) <= 0}
          onClick={() => contextMenu && moveItemBetweenPages(contextMenu.itemId, -1)}
        >
          {t('common.movePrev')}
        </MenuItem>
        <MenuItem
          disabled={!contextMenu || !layoutState}
          onClick={() => contextMenu && moveItemBetweenPages(contextMenu.itemId, 1)}
        >
          {t('common.moveNext')}
        </MenuItem>
      </Menu>

      <Alert
        severity="success"
        onClose={() => setSnackbar(null)}
        sx={{
          display: snackbar ? 'flex' : 'none',
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 2000,
          bgcolor: 'var(--cp-surface)',
          color: 'var(--cp-text)',
        }}
      >
        {snackbar}
      </Alert>
    </main>
  )
}

function LoadingState() {
  const { t } = useI18n()
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--cp-surface)]/72 backdrop-blur-xl">
      <div className="shell-panel max-w-lg px-7 py-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cp-accent-soft)_16%,var(--cp-surface))]">
          <div className="h-11 w-11 animate-pulse rounded-full border border-[color:color-mix(in_srgb,var(--cp-accent)_26%,transparent)] bg-[radial-gradient(circle_at_30%_30%,color-mix(in_srgb,var(--cp-accent-soft)_65%,white),color-mix(in_srgb,var(--cp-accent)_88%,transparent))]" />
        </div>
        <p className="shell-kicker">Prototype</p>
        <p className="mt-2 font-display text-2xl font-semibold sm:text-[2rem]">
          {t('states.loadingTitle')}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[color:var(--cp-muted)]">
          {t('states.loadingBody')}
        </p>
      </div>
    </div>
  )
}

function PanelIntro({
  aside,
  body,
  kicker,
  title,
}: {
  aside?: ReactNode
  body: string
  kicker?: string
  title: string
}) {
  return (
    <section className="shell-panel px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          {kicker ? <p className="shell-kicker">{kicker}</p> : null}
          <p className="mt-2 font-display text-xl font-semibold sm:text-2xl">{title}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--cp-muted)]">{body}</p>
        </div>
        {aside ? <div className="hidden sm:block sm:shrink-0">{aside}</div> : null}
      </div>
    </section>
  )
}

function MetricCard({
  label,
  tone = 'neutral',
  value,
}: {
  label: string
  tone?: keyof typeof panelToneClasses
  value: ReactNode
}) {
  return (
    <div className="shell-subtle-panel px-4 py-4">
      <div
        className={clsx(
          'mb-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
          panelToneClasses[tone],
        )}
      >
        {label}
      </div>
      <div className="font-display text-2xl font-semibold text-[color:var(--cp-text)]">
        {value}
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--cp-surface)]/78 backdrop-blur-xl">
      <div className="shell-panel max-w-lg px-7 py-8 text-center">
        <p className="shell-kicker">Recovery</p>
        <p className="mt-2 font-display text-2xl font-semibold">{t('states.errorTitle')}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[color:var(--cp-muted)]">
          {t('states.errorBody')}
        </p>
        <Button onClick={onRetry} className="!mt-6">
          {t('common.retry')}
        </Button>
      </div>
    </div>
  )
}

function EmptyState({ onRestore }: { onRestore: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="shell-panel max-w-lg border-dashed px-7 py-8 text-center">
        <p className="shell-kicker">Layout</p>
        <p className="mt-2 font-display text-2xl font-semibold">{t('states.emptyTitle')}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[color:var(--cp-muted)]">
          {t('states.emptyBody')}
        </p>
        <Button onClick={onRestore} className="!mt-6" variant="outlined">
          {t('shell.restore')}
        </Button>
      </div>
    </div>
  )
}

function DesktopTile({
  app,
  isDesktop,
  item,
  isSelected,
  onOpen,
  onOpenContextMenu,
  onSaveNote,
}: {
  app?: AppDefinition
  isDesktop: boolean
  item: LayoutItem
  isSelected: boolean
  onOpen: () => void
  onOpenContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void
  onSaveNote: (itemId: string, content: string) => void
}) {
  const { t, locale } = useI18n()
  const isCompactAppTile = !isDesktop && item.type === 'app'
  const touchStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const releaseAppPointerRef = useRef<(() => void) | null>(null)
  const now = useMinuteClock()

  useEffect(() => {
    return () => {
      releaseAppPointerRef.current?.()
      releaseAppPointerRef.current = null
    }
  }, [])

  const clearAppPointer = () => {
    touchStartRef.current = null
    releaseAppPointerRef.current?.()
    releaseAppPointerRef.current = null
  }

  const completeAppPointer = (
    pointerId: number,
    clientX: number,
    clientY: number,
    pointerType: string,
  ) => {
    if (isDesktop || pointerType === 'mouse') {
      return
    }

    const start = touchStartRef.current
    clearAppPointer()

    if (!start || start.pointerId !== pointerId) {
      return
    }

    const distance = Math.hypot(clientX - start.x, clientY - start.y)
    if (distance <= 12) {
      onOpen()
    }
  }

  const handleAppPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (isDesktop || event.pointerType === 'mouse') {
      return
    }

    clearAppPointer()
    touchStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    }

    const handleWindowPointerUp = (pointerEvent: PointerEvent) => {
      completeAppPointer(
        pointerEvent.pointerId,
        pointerEvent.clientX,
        pointerEvent.clientY,
        pointerEvent.pointerType,
      )
    }

    const handleWindowPointerCancel = (pointerEvent: PointerEvent) => {
      if (touchStartRef.current?.pointerId === pointerEvent.pointerId) {
        clearAppPointer()
      }
    }

    window.addEventListener('pointerup', handleWindowPointerUp)
    window.addEventListener('pointercancel', handleWindowPointerCancel)
    releaseAppPointerRef.current = () => {
      window.removeEventListener('pointerup', handleWindowPointerUp)
      window.removeEventListener('pointercancel', handleWindowPointerCancel)
    }
  }

  const handleAppPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    completeAppPointer(event.pointerId, event.clientX, event.clientY, event.pointerType)
  }

  return (
    <div
      data-testid={`desktop-item-${item.id}`}
      className={clsx(
        'desktop-tile-shell group relative h-full border border-transparent transition-[transform,border-color,box-shadow,background-color] duration-200 ease-[var(--cp-ease-emphasis)]',
        item.type === 'widget' ? 'rounded-[22px]' : 'rounded-[28px]',
        item.type === 'widget' ? 'overflow-hidden' : 'overflow-visible',
        isDesktop ? 'cursor-grab active:cursor-grabbing' : '',
        isSelected
          ? 'border-[color:color-mix(in_srgb,var(--cp-accent)_46%,transparent)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--cp-accent)_15%,transparent)]'
          : item.type === 'widget'
            ? 'hover:border-[color:color-mix(in_srgb,var(--cp-border)_84%,transparent)]'
            : '',
      )}
      onContextMenu={onOpenContextMenu}
    >
      {item.type === 'app' && app ? (
        <button
          type="button"
          onClick={isDesktop ? onOpen : undefined}
          onPointerDown={handleAppPointerDown}
          onPointerUp={handleAppPointerUp}
          onPointerCancel={clearAppPointer}
          data-testid={`desktop-app-${app.id}`}
          title={t(app.labelKey, app.id)}
          className={clsx(
            'flex h-full w-full flex-col items-center rounded-[28px] bg-transparent text-center transition-[background-color,box-shadow] duration-200 ease-[var(--cp-ease-emphasis)] focus-visible:bg-[color:color-mix(in_srgb,var(--cp-accent-soft)_10%,var(--cp-surface))]',
            isDesktop ? 'cursor-grab active:cursor-grabbing' : '',
            isCompactAppTile ? 'justify-center gap-1.5 px-1 py-2' : 'justify-center gap-2 px-2',
          )}
        >
          <span
            className={clsx(
              'relative flex items-center justify-center overflow-hidden border shadow-[0_16px_28px_color-mix(in_srgb,var(--cp-shadow)_14%,transparent)]',
              isCompactAppTile
                ? 'h-11 w-11 rounded-[15px]'
                : 'h-14 w-14 rounded-[20px] sm:h-16 sm:w-16',
            )}
            style={appIconSurfaceStyle(app.accent)}
          >
            <AppIcon iconKey={app.iconKey} />
          </span>
          <span
            className={clsx(
              'max-w-full font-display font-semibold text-[color:var(--cp-text)]',
              isCompactAppTile
                ? 'max-w-full px-0.5 text-[11px] leading-[1.15] whitespace-normal break-words'
                : 'text-sm leading-tight sm:text-[15px]',
            )}
          >
            {t(app.labelKey, app.id)}
          </span>
        </button>
      ) : null}

      {item.type === 'widget' && item.widgetType === 'clock' ? (
        <div className="flex h-full flex-col justify-between rounded-[22px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--cp-surface-3)_100%,transparent),color-mix(in_srgb,var(--cp-surface-2)_96%,transparent))] p-4">
          <div className="flex justify-end">
            <span className="rounded-full bg-[color:color-mix(in_srgb,var(--cp-surface)_70%,transparent)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--cp-muted)]">
              {new Intl.DateTimeFormat(locale, {
                weekday: 'short',
              }).format(now)}
            </span>
          </div>
          <div className="-mt-1">
            <p className="font-display whitespace-nowrap text-[1.72rem] font-semibold leading-[0.94] tracking-[-0.05em] text-[color:var(--cp-text)] sm:text-[2.8rem] lg:text-5xl">
              {new Intl.DateTimeFormat(locale, {
                hour: '2-digit',
                minute: '2-digit',
              }).format(now)}
            </p>
            <p className="mt-1 text-sm text-[color:var(--cp-muted)]">
              {new Intl.DateTimeFormat(locale, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }).format(now)}
            </p>
          </div>
        </div>
      ) : null}

      {item.type === 'widget' && item.widgetType === 'notepad' ? (
        <NotepadWidget itemId={item.id} value={String(item.config.content ?? '')} onSave={onSaveNote} />
      ) : null}
    </div>
  )
}

function NotepadWidget({
  itemId,
  value,
  onSave,
}: {
  itemId: string
  value: string
  onSave: (itemId: string, content: string) => void
}) {
  const { t } = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const form = useForm<NoteInput>({
    resolver: zodResolver(noteInputSchema),
    defaultValues: {
      content: value || '',
    },
  })
  const { ref: registerTextareaRef, ...textareaField } = form.register('content')
  const noteValue =
    useWatch({
      control: form.control,
      name: 'content',
    }) ?? ''
  const trimmedLength = noteValue.trim().length
  const remaining = 180 - trimmedLength
  const previewContent = noteValue.trim()

  useEffect(() => {
    form.reset({ content: value || '' })
  }, [form, value])

  useEffect(() => {
    if (!isEditing) {
      return
    }

    textareaRef.current?.focus()
  }, [isEditing])

  if (!isEditing) {
    return (
      <button
        type="button"
        data-testid={`notepad-preview-${itemId}`}
        onClick={() => setIsEditing(true)}
        className="flex h-full w-full flex-col rounded-[22px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--cp-surface-3)_86%,transparent),color-mix(in_srgb,var(--cp-surface-2)_96%,transparent))] p-4 text-left"
      >
        <div className="min-h-0 flex-1 overflow-hidden">
          <p
            className={clsx(
              'text-sm leading-6',
              previewContent
                ? 'text-[color:var(--cp-text)]'
                : 'text-[color:var(--cp-muted)]',
            )}
          >
            {previewContent || t('widgets.notesPlaceholder')}
          </p>
        </div>
      </button>
    )
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        if (values.content !== value) {
          onSave(itemId, values.content)
        }
        form.reset({ content: values.content })
        setIsEditing(false)
      })}
      className="flex h-full flex-col rounded-[22px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--cp-surface-3)_86%,transparent),color-mix(in_srgb,var(--cp-surface-2)_96%,transparent))] p-4"
    >
      <textarea
        {...textareaField}
        ref={(node) => {
          registerTextareaRef(node)
          textareaRef.current = node
        }}
        data-testid={`notepad-editor-${itemId}`}
        aria-invalid={form.formState.isSubmitted && !form.formState.isValid}
        className="widget-interactive min-h-0 flex-1 resize-none rounded-[18px] border border-[color:var(--cp-border)] bg-[color:color-mix(in_srgb,var(--cp-surface)_96%,transparent)] p-3 text-sm leading-6 text-[color:var(--cp-text)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_35%,transparent)] outline-none placeholder:text-[color:var(--cp-muted)] focus:border-[color:var(--cp-accent)]"
        placeholder={t('widgets.notesPlaceholder')}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-[color:var(--cp-muted)]">
          {Math.max(remaining, 0)}/180
        </span>
        <Button
          type="submit"
          variant="contained"
          size="small"
          data-testid={`notepad-save-${itemId}`}
          className="widget-interactive"
          disabled={!form.formState.isValid}
        >
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}

function DesktopWindowLayer({
  apps,
  activityLog,
  deadZone,
  layoutState,
  locale,
  onClose,
  onFocus,
  onMaximize,
  onMinimize,
  onSaveSettings,
  runtimeContainer,
  themeMode,
  topInset,
  windows,
  workspaceSize,
}: {
  apps: AppDefinition[]
  activityLog: string[]
  deadZone: LayoutState['deadZone']
  layoutState: LayoutState
  locale: string
  onClose: (windowId: string) => void
  onFocus: (windowId: string) => void
  onMaximize: (windowId: string) => void
  onMinimize: (windowId: string) => void
  onSaveSettings: (values: SystemPreferencesInput) => void
  runtimeContainer: string
  themeMode: ThemeMode
  topInset: number
  windows: WindowRecord[]
  workspaceSize: { width: number; height: number }
}) {
  const dragState = useRef<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)
  const resizeState = useRef<{
    id: string
    startWidth: number
    startHeight: number
    startX: number
    startY: number
  } | null>(null)
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const sizesRef = useRef<Record<string, { width: number; height: number }>>({})
  const layerRef = useRef<HTMLDivElement | null>(null)
  const { t } = useI18n()
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({})
  const topZIndex = windows.reduce(
    (highest, windowItem) => Math.max(highest, windowItem.zIndex),
    0,
  )

  const handlePointerDown =
    (windowItem: WindowRecord) => (event: ReactPointerEvent<HTMLDivElement>) => {
      if (windowItem.state !== 'windowed') {
        onFocus(windowItem.id)
        return
      }

      const layerRect = layerRef.current?.getBoundingClientRect()
      if (!layerRect) {
        return
      }

      const anchored = positionsRef.current[windowItem.id] ?? {
        x: windowItem.x,
        y: windowItem.y,
      }

      dragState.current = {
        id: windowItem.id,
        offsetX: event.clientX - layerRect.left - anchored.x,
        offsetY: event.clientY - layerRect.top - anchored.y,
      }
      onFocus(windowItem.id)
      event.preventDefault()
    }

  const handleResizePointerDown =
    (windowItem: WindowRecord) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (windowItem.state !== 'windowed') {
        return
      }

      const measured = sizesRef.current[windowItem.id] ?? {
        width: windowItem.width,
        height: windowItem.height,
      }

      resizeState.current = {
        id: windowItem.id,
        startWidth: measured.width,
        startHeight: measured.height,
        startX: event.clientX,
        startY: event.clientY,
      }
      onFocus(windowItem.id)
      event.preventDefault()
      event.stopPropagation()
    }

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const layerRect = layerRef.current?.getBoundingClientRect()
      if (!layerRect) {
        return
      }

      const activeResize = resizeState.current
      if (activeResize) {
        const minWidth = 420
        const minHeight = 280
        const maxWidth = Math.max(520, workspaceSize.width - 48)
        const maxHeight = Math.max(320, workspaceSize.height - topInset - deadZone.bottom - 24)
        const nextWidth = Math.min(
          Math.max(
            minWidth,
            activeResize.startWidth + (event.clientX - activeResize.startX),
          ),
          maxWidth,
        )
        const nextHeight = Math.min(
          Math.max(
            minHeight,
            activeResize.startHeight + (event.clientY - activeResize.startY),
          ),
          maxHeight,
        )
        setSizes((prev) => {
          const next = {
            ...prev,
            [activeResize.id]: { width: nextWidth, height: nextHeight },
          }
          sizesRef.current = next
          return next
        })
        return
      }

      const activeDrag = dragState.current
      if (activeDrag) {
        const draggingWindow = windows.find(
          (windowItem) => windowItem.id === activeDrag.id,
        )
        const measured = draggingWindow
          ? sizesRef.current[draggingWindow.id] ?? {
              width: draggingWindow.width,
              height: draggingWindow.height,
            }
          : { width: 540, height: 380 }
        const maxX = Math.max(24, layerRect.width - measured.width - 24)
        const maxY = Math.max(
          topInset + 8,
          layerRect.height - measured.height - deadZone.bottom - 8,
        )

        const nextX = Math.min(
          Math.max(24, event.clientX - layerRect.left - activeDrag.offsetX),
          maxX,
        )
        const nextY = Math.min(
          Math.max(
            topInset + 8,
            event.clientY - layerRect.top - activeDrag.offsetY,
          ),
          maxY,
        )
        setPositions((prev) => {
          const next = {
            ...prev,
            [activeDrag.id]: { x: nextX, y: nextY },
          }
          positionsRef.current = next
          return next
        })
      }
    }

    const handleUp = () => {
      dragState.current = null
      resizeState.current = null
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [deadZone.bottom, onFocus, topInset, windows, workspaceSize.height, workspaceSize.width])

  useEffect(() => {
    const sync = () => {
      setPositions((prev) => {
        const next = { ...prev }
        windows.forEach((windowItem) => {
          next[windowItem.id] ??= { x: windowItem.x, y: windowItem.y }
        })
        positionsRef.current = next
        return next
      })
      setSizes((prev) => {
        const next = { ...prev }
        windows.forEach((windowItem) => {
          next[windowItem.id] ??= {
            width: windowItem.width,
            height: windowItem.height,
          }
        })
        sizesRef.current = next
        return next
      })
    }

    sync()
  }, [windows])

  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0 z-30">
      {windows.map((windowItem) => {
        const app = appById(apps, windowItem.appId)
        if (!app) {
          return null
        }

        const anchored = positions[windowItem.id] ?? { x: windowItem.x, y: windowItem.y }
        const measured = sizes[windowItem.id] ?? {
          width: windowItem.width,
          height: windowItem.height,
        }
        const maximized = windowItem.state === 'maximized'
        const isFront = windowItem.zIndex === topZIndex

        return (
          <div
            key={windowItem.id}
            data-testid={`window-${app.id}`}
            className={clsx(
              'pointer-events-auto shell-window absolute flex flex-col overflow-hidden rounded-[30px] border transition-[transform,box-shadow,border-color,opacity] duration-200 ease-[var(--cp-ease-emphasis)]',
              isFront
                ? 'border-[color:color-mix(in_srgb,var(--cp-accent)_28%,var(--cp-border))]'
                : 'border-[color:var(--cp-border)] opacity-[0.98]',
            )}
            style={{
              zIndex: windowItem.zIndex,
              left: maximized ? deadZone.left + 12 : anchored.x,
              top: maximized ? topInset + 12 : anchored.y,
              width: maximized
                ? workspaceSize.width - deadZone.left - deadZone.right - 24
                : measured.width,
              height: maximized
                ? workspaceSize.height - topInset - deadZone.bottom - 24
                : measured.height,
              display: windowItem.state === 'minimized' ? 'none' : 'block',
              transform: isFront ? 'translateY(0)' : 'translateY(4px)',
            }}
            onMouseDown={() => onFocus(windowItem.id)}
          >
            <div
              data-testid={`window-drag-${app.id}`}
              className="flex cursor-move items-center justify-between gap-4 border-b border-[color:var(--cp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--cp-surface-2)_94%,transparent),color-mix(in_srgb,var(--cp-surface)_92%,transparent))] px-4 py-3.5"
              onPointerDown={handlePointerDown(windowItem)}
            >
              <div className="min-w-0 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-[16px] border shadow-[0_10px_18px_color-mix(in_srgb,var(--cp-shadow)_14%,transparent)]"
                  style={appIconSurfaceStyle(app.accent, 'window')}
                >
                  <AppIcon iconKey={app.iconKey} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-sm font-semibold text-[color:var(--cp-text)]">
                      {t(app.labelKey)}
                    </p>
                    <TierBadge tier={app.tier} />
                  </div>
                  <p className="truncate text-xs text-[color:var(--cp-muted)]">
                    {t(app.summaryKey)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {app.manifest.allowMinimize ? (
                  <IconButton
                    aria-label={t('common.minimize')}
                    size="small"
                    onClick={() => onMinimize(windowItem.id)}
                  >
                    <Minimize2 className="size-4" />
                  </IconButton>
                ) : null}
                {app.manifest.allowMaximize ? (
                  <IconButton
                    aria-label={
                      windowItem.state === 'maximized'
                        ? t('common.restoreWindow')
                        : t('common.maximize')
                    }
                    size="small"
                    onClick={() => onMaximize(windowItem.id)}
                  >
                    {windowItem.state === 'maximized' ? (
                      <Square className="size-4" />
                    ) : (
                      <Maximize2 className="size-4" />
                    )}
                  </IconButton>
                ) : null}
                <IconButton
                  aria-label={t('common.close')}
                  size="small"
                  onClick={() => onClose(windowItem.id)}
                >
                  <X className="size-4" />
                </IconButton>
              </div>
            </div>
            <div className="desktop-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
              <AppPanelContent
                activityLog={activityLog}
                app={app}
                layoutState={layoutState}
                locale={locale}
                onSaveSettings={onSaveSettings}
                runtimeContainer={runtimeContainer}
                themeMode={themeMode}
              />
            </div>
            {!maximized ? (
              <button
                aria-label={`Resize ${t(app.labelKey)}`}
                data-testid={`window-resize-${app.id}`}
                className="absolute bottom-2 right-2 h-6 w-6 cursor-se-resize rounded-full border border-[color:var(--cp-border)] bg-[color:color-mix(in_srgb,var(--cp-surface)_86%,transparent)] text-transparent shadow-[0_10px_18px_color-mix(in_srgb,var(--cp-shadow)_10%,transparent)]"
                onPointerDown={handleResizePointerDown(windowItem)}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function MobileWindowSheet({
  activityLog,
  app,
  deadZone,
  layoutState,
  locale,
  onSaveSettings,
  runtimeContainer,
  themeMode,
  topInset,
}: {
  activityLog: string[]
  app?: AppDefinition
  deadZone: LayoutState['deadZone']
  layoutState: LayoutState
  locale: string
  onSaveSettings: (values: SystemPreferencesInput) => void
  runtimeContainer: string
  themeMode: ThemeMode
  topInset: number
}) {
  if (!app) {
    return null
  }

  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-[color:color-mix(in_srgb,var(--cp-bg)_94%,var(--cp-surface))]">
      <div
        className="flex h-full min-h-0 flex-col"
        style={{
          paddingBottom: deadZone.bottom,
        }}
      >
        <div
          className="desktop-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
          style={{ paddingTop: topInset > 0 ? topInset + 14 : 14 }}
        >
          <AppPanelContent
            activityLog={activityLog}
            app={app}
            layoutState={layoutState}
            locale={locale}
            onSaveSettings={onSaveSettings}
            runtimeContainer={runtimeContainer}
            themeMode={themeMode}
          />
        </div>
      </div>
    </div>
  )
}

function AppPanelContent({
  activityLog,
  app,
  layoutState,
  locale,
  onSaveSettings,
  runtimeContainer,
  themeMode,
}: {
  activityLog: string[]
  app: AppDefinition
  layoutState: LayoutState
  locale: string
  onSaveSettings: (values: SystemPreferencesInput) => void
  runtimeContainer: string
  themeMode: ThemeMode
}) {
  const { t } = useI18n()

  switch (app.id) {
    case 'settings':
      return (
        <SettingsPanel
          deadZone={layoutState.deadZone}
          onSave={onSaveSettings}
          runtimeContainer={runtimeContainer}
          themeMode={themeMode}
        />
      )
    case 'files':
      return <FilesPanel layoutState={layoutState} />
    case 'studio':
      return <StudioPanel />
    case 'market':
      return <MarketPanel />
    case 'diagnostics':
      return <DiagnosticsPanel activityLog={activityLog} layoutState={layoutState} locale={locale} />
    default:
      return (
        <div className="shell-subtle-panel p-4">
          <p>{t('common.unsupportedPanel')}</p>
        </div>
      )
  }
}

function SettingsPanel({
  deadZone,
  onSave,
  runtimeContainer,
  themeMode,
}: {
  deadZone: LayoutState['deadZone']
  onSave: (values: SystemPreferencesInput) => void
  runtimeContainer: string
  themeMode: ThemeMode
}) {
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

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        onSave({
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
        </div>
      </div>
    </form>
  )
}

function FilesPanel({ layoutState }: { layoutState: LayoutState }) {
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

function StudioPanel() {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <PanelIntro
        kicker="Manifest"
        title={t('studio.title')}
        body={t('studio.body')}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {[
          'studio.point1',
          'studio.point2',
          'studio.point3',
          'studio.point4',
        ].map((key, index) => (
          <div key={key} className="shell-subtle-panel p-4 text-sm leading-6 text-[color:var(--cp-text)]">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cp-accent-soft)_16%,var(--cp-surface))] font-display text-sm font-semibold text-[color:var(--cp-accent)]">
                {index + 1}
              </span>
              <span className="shell-kicker">Rule</span>
            </div>
            {t(key)}
          </div>
        ))}
      </div>
    </div>
  )
}

function MarketPanel() {
  const { t } = useI18n()
  const cards = [
    {
      id: 'settings',
      labelKey: 'apps.settings',
      bodyKey: 'market.card.settings.body',
      iconKey: 'settings',
      accent: 'var(--cp-accent)',
      tier: 'system' as const,
    },
    {
      id: 'files',
      labelKey: 'apps.files',
      bodyKey: 'market.card.files.body',
      iconKey: 'files',
      accent: 'var(--cp-success)',
      tier: 'sdk' as const,
    },
    {
      id: 'studio',
      labelKey: 'apps.studio',
      bodyKey: 'market.card.studio.body',
      iconKey: 'studio',
      accent: 'var(--cp-warning)',
      tier: 'sdk' as const,
    },
    {
      id: 'docs',
      labelKey: 'apps.docs',
      bodyKey: 'market.card.docs.body',
      iconKey: 'docs',
      accent: 'var(--cp-accent-soft)',
      tier: 'external' as const,
    },
  ]

  return (
    <div className="space-y-4">
      <PanelIntro
        kicker="Launcher"
        title={t('market.title')}
        body={t('market.body')}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((app) => {
          return (
            <div key={app.id} className="shell-subtle-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-[18px] border shadow-[0_14px_28px_color-mix(in_srgb,var(--cp-shadow)_12%,transparent)]"
                    style={{
                      borderColor: `color-mix(in srgb, ${app.accent} 26%, white)`,
                      background: `linear-gradient(165deg, color-mix(in srgb, ${app.accent} 78%, white), color-mix(in srgb, ${app.accent} 24%, var(--cp-bg)))`,
                    }}
                  >
                    <AppIcon iconKey={app.iconKey} />
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold">{t(app.labelKey)}</p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--cp-muted)]">
                      {t(app.bodyKey)}
                    </p>
                  </div>
                </div>
                <TierBadge tier={app.tier} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DiagnosticsPanel({
  activityLog,
  layoutState,
  locale,
}: {
  activityLog: string[]
  layoutState: LayoutState
  locale: string
}) {
  const { t } = useI18n()
  const totalItems = layoutState.pages.reduce((sum, page) => sum + page.items.length, 0)

  return (
    <div className="space-y-4">
      <PanelIntro
        kicker="Telemetry"
        title={t('diagnostics.title')}
        body={t('diagnostics.body')}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label={t('diagnostics.locale')} tone="accent" value={locale} />
        <MetricCard label={t('files.pages')} tone="neutral" value={layoutState.pages.length} />
        <MetricCard label={t('files.items')} tone="success" value={totalItems} />
      </div>
      <div className="shell-subtle-panel p-4">
        <p className="shell-kicker">{t('shell.activity')}</p>
        <div className="mt-4 space-y-2">
          {activityLog.length > 0 ? (
            activityLog.map((entry) => (
              <div
                key={entry}
                className="flex items-start gap-3 rounded-[20px] bg-[color:color-mix(in_srgb,var(--cp-surface)_88%,transparent)] px-3 py-3 text-sm"
              >
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[color:var(--cp-success)]" />
                <span>{entry}</span>
              </div>
            ))
          ) : (
            <div className="rounded-[20px] bg-[color:color-mix(in_srgb,var(--cp-surface)_88%,transparent)] px-4 py-4 text-sm text-[color:var(--cp-muted)]">
              {t('shell.noRunningApps')}
            </div>
          )}
        </div>
      </div>
      <pre className="shell-scrollbar overflow-x-auto rounded-[24px] bg-[color:var(--cp-bg-strong)] p-4 text-xs text-[color:var(--cp-text)]">
        {JSON.stringify(layoutState, null, 2)}
      </pre>
    </div>
  )
}
