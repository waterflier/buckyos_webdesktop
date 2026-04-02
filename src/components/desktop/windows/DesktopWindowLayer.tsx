import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type {
  LayoutState,
  SystemPreferencesInput,
  ThemeMode,
} from '../../../models/ui'
import { AppContentRenderer } from '../apps/registry'
import { DesktopWindowContainer } from './DesktopWindowContainer'
import type {
  DesktopWindowDataModel,
  DesktopWindowLayerDataModel,
  ResizeDirection,
} from './types'

export function DesktopWindowLayer({
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
  safeArea = { top: 0, bottom: 0, left: 0, right: 0 },
  themeMode,
  topInset,
  uiModel,
  workspaceSize,
}: {
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
  safeArea?: { top: number; bottom: number; left: number; right: number }
  themeMode: ThemeMode
  topInset: number
  uiModel: DesktopWindowLayerDataModel
  workspaceSize: { width: number; height: number }
}) {
  const dragState = useRef<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)
  const resizeState = useRef<{
    id: string
    direction: ResizeDirection
    startWidth: number
    startHeight: number
    startX: number
    startY: number
    startWindowX: number
    startWindowY: number
  } | null>(null)
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const sizesRef = useRef<Record<string, { width: number; height: number }>>({})
  const layerRef = useRef<HTMLDivElement | null>(null)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({})
  const windows = uiModel.windows
  const topZIndex = uiModel.topWindow?.zIndex ?? 0

  const handlePointerDown =
    (windowItem: DesktopWindowDataModel) =>
    (event: ReactPointerEvent<HTMLDivElement>) => {
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
    (windowItem: DesktopWindowDataModel, direction: ResizeDirection) =>
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (windowItem.state !== 'windowed') {
        return
      }

      const anchored = positionsRef.current[windowItem.id] ?? {
        x: windowItem.x,
        y: windowItem.y,
      }
      const measured = sizesRef.current[windowItem.id] ?? {
        width: windowItem.width,
        height: windowItem.height,
      }

      resizeState.current = {
        id: windowItem.id,
        direction,
        startWidth: measured.width,
        startHeight: measured.height,
        startX: event.clientX,
        startY: event.clientY,
        startWindowX: anchored.x,
        startWindowY: anchored.y,
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
        const deltaX = event.clientX - activeResize.startX
        const deltaY = event.clientY - activeResize.startY
        const maxRight = layerRect.width - 24
        const maxBottom =
          layerRect.height - safeArea.bottom - deadZone.bottom - 8
        let nextX = activeResize.startWindowX
        let nextWidth = activeResize.startWidth
        let nextHeight = activeResize.startHeight

        if (
          activeResize.direction === 'right' ||
          activeResize.direction === 'bottom-right'
        ) {
          nextWidth = Math.min(
            Math.max(minWidth, activeResize.startWidth + deltaX),
            Math.max(minWidth, maxRight - activeResize.startWindowX),
          )
        }

        if (
          activeResize.direction === 'left' ||
          activeResize.direction === 'bottom-left'
        ) {
          nextX = Math.min(
            Math.max(24, activeResize.startWindowX + deltaX),
            activeResize.startWindowX + activeResize.startWidth - minWidth,
          )
          nextWidth =
            activeResize.startWidth + (activeResize.startWindowX - nextX)
        }

        if (
          activeResize.direction === 'bottom' ||
          activeResize.direction === 'bottom-left' ||
          activeResize.direction === 'bottom-right'
        ) {
          nextHeight = Math.min(
            Math.max(minHeight, activeResize.startHeight + deltaY),
            Math.max(minHeight, maxBottom - activeResize.startWindowY),
          )
        }

        if (
          activeResize.direction === 'left' ||
          activeResize.direction === 'bottom-left'
        ) {
          setPositions((prev) => {
            const next = {
              ...prev,
              [activeResize.id]: {
                x: nextX,
                y: activeResize.startWindowY,
              },
            }
            positionsRef.current = next
            return next
          })
        }

        setSizes((prev) => {
          const next = {
            ...prev,
            [activeResize.id]: {
              width: nextWidth,
              height: nextHeight,
            },
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
          layerRect.height - measured.height - safeArea.bottom - deadZone.bottom - 8,
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
  }, [deadZone.bottom, onFocus, safeArea.bottom, topInset, windows, workspaceSize.height, workspaceSize.width])

  useEffect(() => {
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
  }, [windows])

  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0 z-30">
      {windows.map((windowItem) => {
        const anchored = positions[windowItem.id] ?? {
          x: windowItem.x,
          y: windowItem.y,
        }
        const measured = sizes[windowItem.id] ?? {
          width: windowItem.width,
          height: windowItem.height,
        }
        const isMaximized = windowItem.state === 'maximized'
        const isFront = windowItem.zIndex === topZIndex

        return (
          <DesktopWindowContainer
            key={windowItem.id}
            isFront={isFront}
            onClose={() => onClose(windowItem.id)}
            onDragPointerDown={handlePointerDown(windowItem)}
            onFocus={() => onFocus(windowItem.id)}
            onMaximize={() => onMaximize(windowItem.id)}
            onMinimize={() => onMinimize(windowItem.id)}
            onResizePointerDown={(direction) =>
              handleResizePointerDown(windowItem, direction)
            }
            style={{
              zIndex: windowItem.zIndex,
              left: isMaximized ? safeArea.left + deadZone.left + 12 : anchored.x,
              top: isMaximized ? topInset + 12 : anchored.y,
              width: isMaximized
                ? workspaceSize.width -
                  safeArea.left -
                  deadZone.left -
                  safeArea.right -
                  deadZone.right -
                  24
                : measured.width,
              height: isMaximized
                ? workspaceSize.height - topInset - safeArea.bottom - deadZone.bottom - 24
                : measured.height,
              transform: isFront ? 'translateY(0)' : 'translateY(4px)',
            }}
            themeMode={themeMode}
            uiModel={windowItem}
          >
            <AppContentRenderer
              activityLog={activityLog}
              app={windowItem.app}
              layoutState={layoutState}
              locale={locale}
              onSaveSettings={onSaveSettings}
              runtimeContainer={runtimeContainer}
              themeMode={themeMode}
            />
          </DesktopWindowContainer>
        )
      })}
    </div>
  )
}
