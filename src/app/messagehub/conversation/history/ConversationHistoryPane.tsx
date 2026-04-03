import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { DID } from '../../protocol/msgobj'
import {
  buildConversationProjection,
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

export function ConversationHistoryPane({
  reader,
  selfDid,
  isGroup,
  statusItems,
}: {
  reader: ConversationMessageReader
  selfDid: DID
  isGroup: boolean
  statusItems?: readonly ConversationStatusDescriptor[]
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [projection, setProjection] = useState<Awaited<ReturnType<typeof buildConversationProjection>> | null>(null)
  const [windowState, setWindowState] = useState<ConversationMaterializedWindow | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const previousTotalCountRef = useRef(0)
  const visibleItemCount = Math.max(
    DEFAULT_VISIBLE_ITEM_COUNT,
    Math.ceil(viewportHeight / 88),
  )

  useEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setViewportHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(element)
    setViewportHeight(element.clientHeight)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    setProjection(null)
    setWindowState(null)

    void buildConversationProjection(reader, statusItems).then((nextProjection) => {
      if (!cancelled) {
        setProjection(nextProjection)
        setCurrentIndex(Math.max(0, nextProjection.totalCount - 1))
      }
    })

    return () => {
      cancelled = true
    }
  }, [reader, statusItems])

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: projection?.totalCount ?? 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const entry = projection?.entries[index]
      return entry ? getListEntryEstimate(entry.kind) : 88
    },
    overscan: Math.max(visibleItemCount * 2, 24),
  })

  const virtualItems = virtualizer.getVirtualItems()
  const itemsByIndex = useMemo(() => {
    const map = new Map<number, ConversationListItem>()

    windowState?.items.forEach((item) => {
      map.set(item.index, item)
    })

    return map
  }, [windowState])

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
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(Math.max(0, projection.totalCount - 1), {
          align: 'end',
        })
      })
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
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = itemsByIndex.get(virtualItem.index)

          return (
            <div
              key={item?.key ?? `placeholder:${virtualItem.index}`}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
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
  )
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

function getListEntryEstimate(kind: ConversationListItem['kind']) {
  switch (kind) {
    case 'timestamp':
      return 48
    case 'status':
      return 40
    default:
      return 88
  }
}
