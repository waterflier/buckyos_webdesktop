import {
  forwardRef,
  startTransition,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { DID } from '../../protocol/msgobj'
import {
  buildConversationProjection,
  extendConversationProjection,
  materializeConversationWindow,
} from './data-source'
import { ConversationListRow } from './renderers'
import type {
  ConversationListItem,
  ConversationMaterializedWindow,
  ConversationMessageReader,
  ConversationStatusDescriptor,
} from './types'

const DEFAULT_VISIBLE_ITEM_COUNT = 12

export interface ConversationHistoryPaneHandle {
  scrollToBottom: () => void
}

export const ConversationHistoryPane = forwardRef<ConversationHistoryPaneHandle, {
  reader: ConversationMessageReader
  selfDid: DID
  isGroup: boolean
  statusItems?: readonly ConversationStatusDescriptor[]
}>(function ConversationHistoryPane({
  reader,
  selfDid,
  isGroup,
  statusItems,
}, ref) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [projection, setProjection] = useState<Awaited<ReturnType<typeof buildConversationProjection>> | null>(null)
  const [windowState, setWindowState] = useState<ConversationMaterializedWindow | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const previousTotalCountRef = useRef(0)
  const projectionRef = useRef<Awaited<ReturnType<typeof buildConversationProjection>> | null>(null)
  const stickyScrollDeadlineRef = useRef(0)
  const isMobileViewport = viewportWidth > 0 && viewportWidth < 769
  const effectiveViewportHeight = isMobileViewport
    ? Math.round(viewportHeight * 7)
    : viewportHeight
  const visibleItemCount = Math.max(
    DEFAULT_VISIBLE_ITEM_COUNT,
    Math.ceil(effectiveViewportHeight / 88),
  )
  const itemsByIndex = useMemo(() => {
    const map = new Map<number, ConversationListItem>()

    windowState?.items.forEach((item) => {
      map.set(item.index, item)
    })

    return map
  }, [windowState])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setViewportWidth(entry.contentRect.width)
        setViewportHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(element)
    setViewportWidth(element.clientWidth)
    setViewportHeight(element.clientHeight)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    projectionRef.current = projection
  }, [projection])

  useEffect(() => {
    let cancelled = false
    const currentProjection = projectionRef.current
    const statusItemsSignature = getStatusItemsSignature(statusItems)
    const isAppendOnlyUpdate = Boolean(
      currentProjection
      && currentProjection.readerKey === reader.readerKey
      && currentProjection.statusItemsSignature === statusItemsSignature
      && reader.totalCount > currentProjection.messageCount
    )

    if (currentProjection
      && currentProjection.readerKey === reader.readerKey
      && currentProjection.statusItemsSignature === statusItemsSignature
      && reader.totalCount === currentProjection.messageCount) {
      return () => {
        cancelled = true
      }
    }

    if (isAppendOnlyUpdate && currentProjection) {
      const appendStartIndex = currentProjection.messageCount
      const appendedCount = reader.totalCount - currentProjection.messageCount

      void reader.readRange(appendStartIndex, appendedCount).then((messages) => {
        if (cancelled || messages.length !== appendedCount) {
          return
        }

        startTransition(() => {
          setProjection((activeProjection) => {
            if (!activeProjection) {
              return activeProjection
            }

            if (activeProjection.readerKey !== currentProjection.readerKey
              || activeProjection.statusItemsSignature !== statusItemsSignature) {
              return activeProjection
            }

            const consumedCount = Math.max(0, activeProjection.messageCount - appendStartIndex)
            const remainingMessages = messages.slice(consumedCount)

            if (remainingMessages.length === 0) {
              return activeProjection
            }

            return extendConversationProjection(activeProjection, remainingMessages, statusItems)
          })
        })
      })

      return () => {
        cancelled = true
      }
    }

    setProjection(null)
    setWindowState(null)

    void buildConversationProjection(reader, statusItems).then((nextProjection) => {
      if (cancelled) {
        return
      }

      startTransition(() => {
        setProjection(nextProjection)
        setCurrentIndex(Math.max(0, nextProjection.totalCount - 1))
      })
    })

    return () => {
      cancelled = true
    }
  }, [reader, statusItems])

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: projection?.totalCount ?? 0,
    getScrollElement: () => scrollRef.current,
    getItemKey: (index) => projection?.entries[index]?.key ?? index,
    estimateSize: (index) => {
      const entry = projection?.entries[index]
      return getListEntryEstimate(entry?.kind, itemsByIndex.get(index))
    },
    overscan: isMobileViewport
      ? Math.max(visibleItemCount * 5, 72)
      : Math.max(visibleItemCount * 3, 36),
    useFlushSync: false,
  })

  useEffect(() => {
    virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (_item, delta, instance) => {
      if (Math.abs(delta) < 4) {
        return false
      }

      if (instance.isScrolling) {
        return false
      }

      return instance.scrollDirection === 'backward'
    }
  }, [virtualizer])

  const virtualItems = virtualizer.getVirtualItems()
  const firstVirtualItem = virtualItems[0]

  useImperativeHandle(ref, () => ({
    scrollToBottom() {
      stickyScrollDeadlineRef.current = Date.now() + 1500
      scheduleStickToBottom(scrollRef.current, stickyScrollDeadlineRef)
    },
  }), [])

  useEffect(() => {
    if (!projection || virtualItems.length === 0) {
      return
    }

    const firstVisibleIndex = virtualItems[0].index
    const lastVisibleIndex = virtualItems[virtualItems.length - 1].index
    const nextCurrentIndex = Math.floor((firstVisibleIndex + lastVisibleIndex) / 2)
    const buffer = visibleItemCount * 2
    const startIndex = Math.max(0, firstVisibleIndex - buffer)
    const endIndex = Math.min(
      projection.totalCount,
      lastVisibleIndex + buffer + visibleItemCount,
    )

    setCurrentIndex(nextCurrentIndex)

    if (hasWindowCoverage(windowState, startIndex, endIndex)) {
      return
    }

    let cancelled = false

    void materializeConversationWindow(
      projection,
      reader,
      startIndex,
      endIndex,
    ).then((nextWindow) => {
      if (!cancelled) {
        setWindowState(nextWindow)
      }
    })

    return () => {
      cancelled = true
    }
  }, [projection, reader, virtualItems, visibleItemCount, windowState])

  useEffect(() => {
    if (!projection || projection.totalCount === 0) {
      previousTotalCountRef.current = 0
      return
    }

    const previousTotalCount = previousTotalCountRef.current
    const shouldScrollToBottom = previousTotalCount === 0 || currentIndex >= previousTotalCount - 4

    previousTotalCountRef.current = projection.totalCount

    if (shouldScrollToBottom) {
      stickyScrollDeadlineRef.current = Date.now() + 200
      scheduleStickToBottom(scrollRef.current, stickyScrollDeadlineRef, [0, 32, 80, 160])
    }
  }, [currentIndex, projection, virtualizer])

  if (!projection) {
    return (
      <div
        className="flex-1 overflow-hidden px-3 py-2"
        style={{ background: 'var(--cp-bg)' }}
      >
        <div className="h-full animate-pulse rounded-3xl" style={{
          background: 'color-mix(in srgb, var(--cp-text) 4%, transparent)',
        }}
        />
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-3 py-2 shell-scrollbar"
      style={{
        contain: 'strict',
        overflowAnchor: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${firstVirtualItem?.start ?? 0}px)`,
          }}
        >
          {virtualItems.map((virtualItem) => {
            const item = itemsByIndex.get(virtualItem.index)

            return (
              <div
                key={item?.key ?? `placeholder:${virtualItem.index}`}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
              >
                {item ? (
                  <ConversationListRow
                    item={item}
                    isGroup={isGroup}
                    selfDid={selfDid}
                  />
                ) : (
                  <ListItemPlaceholder />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

function getStatusItemsSignature(
  statusItems: readonly ConversationStatusDescriptor[] = [],
) {
  return statusItems.map((item) => (
    `${item.id}:${item.position ?? 'tail'}:${item.status}:${item.label}:${item.createdAtMs ?? ''}`
  )).join('|')
}

function stickToBottom(scrollElement: HTMLDivElement | null) {
  if (!scrollElement) {
    return
  }

  scrollElement.scrollTop = scrollElement.scrollHeight
}

function scheduleStickToBottom(
  scrollElement: HTMLDivElement | null,
  stickyScrollDeadlineRef: { current: number },
  delaysMs = [0, 48, 120, 240, 420, 720, 1100, 1600],
) {
  delaysMs.forEach((delayMs) => {
    window.setTimeout(() => {
      if (stickyScrollDeadlineRef.current <= Date.now()) {
        return
      }

      stickToBottom(scrollElement)
    }, delayMs)
  })
}

function hasWindowCoverage(
  windowState: ConversationMaterializedWindow | null,
  startIndex: number,
  endIndex: number,
) {
  if (!windowState) {
    return false
  }

  return (
    windowState.startIndex <= startIndex
    && windowState.endIndex >= endIndex
  )
}

function ListItemPlaceholder() {
  return (
    <div className="py-2">
      <div
        className="h-14 rounded-3xl"
        style={{
          background: 'color-mix(in srgb, var(--cp-text) 5%, transparent)',
        }}
      />
    </div>
  )
}

function getListEntryEstimate(
  kind: ConversationListItem['kind'] | undefined,
  item?: ConversationListItem,
) {
  switch (kind) {
    case 'timestamp':
      return 52
    case 'status': {
      if (item?.kind === 'status') {
        return Math.min(72, 40 + Math.ceil(item.label.length / 32) * 12)
      }
      return 52
    }
    case 'message': {
      if (item?.kind === 'message') {
        const format = item.data.content.format ?? 'text/plain'
        if (format.startsWith('image/')) {
          return 280
        }

        const contentLength = item.data.content.content.length
        return Math.min(420, Math.max(132, 96 + Math.ceil(contentLength / 90) * 24))
      }

      return 180
    }
    default:
      return 180
  }
}
