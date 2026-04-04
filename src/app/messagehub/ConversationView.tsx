import {
  ArrowLeft,
  Bot,
  FileUp,
  GripHorizontal,
  Menu,
  MoreVertical,
  User,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/provider'
import {
  ConversationHistoryPane,
  type ConversationHistoryPaneHandle,
} from './conversation/history/ConversationHistoryPane'
import type { ConversationMessageReader } from './conversation/history/types'
import {
  ConversationComposer,
  type ConversationComposerHandle,
  type ConversationComposerSubmitPayload,
} from './conversation/input/ConversationComposer'
import { isTransferWithFiles } from './conversation/input/attachmentDraft'
import type { DID } from './protocol/msgobj'
import type { Entity, Session } from './types'

interface ConversationViewProps {
  entity: Entity
  session: Session | null
  messageReader: ConversationMessageReader
  selfDid: DID
  onBack: () => void
  onOpenSessionSidebar: () => void
  onOpenDetails: () => void
  onSendMessage: (payload: ConversationComposerSubmitPayload) => void
  sessionCount: number
}

const MIN_HISTORY_PANE_HEIGHT = 180
const MIN_COMPOSER_PANE_HEIGHT = 72
const MIN_COMPOSER_PANE_HEIGHT_WITH_ATTACHMENTS = 188
const SPLITTER_HEIGHT = 12
const DEFAULT_COMPOSER_PANE_HEIGHT = 196

export function ConversationView({
  entity,
  session,
  messageReader,
  selfDid,
  onBack,
  onOpenSessionSidebar,
  onOpenDetails,
  onSendMessage,
  sessionCount,
}: ConversationViewProps) {
  const { t } = useI18n()
  const isGroup = entity.type === 'group'
  const bodyRef = useRef<HTMLDivElement>(null)
  const historyPaneContainerRef = useRef<HTMLDivElement>(null)
  const composerPaneContainerRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<ConversationComposerHandle>(null)
  const dragDepthRef = useRef(0)
  const layoutFrameRef = useRef<number | null>(null)
  const bodyHeightRef = useRef(0)
  const preferredComposerPaneHeightRef = useRef(DEFAULT_COMPOSER_PANE_HEIGHT)
  const hasComposerAttachmentsRef = useRef(false)
  const resizeDragRef = useRef<{
    pointerId: number
    startY: number
    startComposerHeight: number
  } | null>(null)
  const historyPaneRef = useRef<ConversationHistoryPaneHandle>(null)
  const [isDropActive, setIsDropActive] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  const applyPaneLayout = useCallback(() => {
    const bodyElement = bodyRef.current
    const historyElement = historyPaneContainerRef.current
    const composerElement = composerPaneContainerRef.current

    if (!bodyElement || !historyElement || !composerElement) {
      return
    }

    const nextBodyHeight = Math.round(bodyElement.clientHeight)
    bodyHeightRef.current = nextBodyHeight

    const effectiveComposerPaneHeight = nextBodyHeight > 0
      ? clampComposerPaneHeight(
        preferredComposerPaneHeightRef.current,
        nextBodyHeight,
        hasComposerAttachmentsRef.current,
      )
      : preferredComposerPaneHeightRef.current
    const availableConversationHeight = nextBodyHeight > 0
      ? Math.max(
        MIN_HISTORY_PANE_HEIGHT,
        nextBodyHeight - effectiveComposerPaneHeight - SPLITTER_HEIGHT,
      )
      : MIN_HISTORY_PANE_HEIGHT

    historyElement.style.height = `${availableConversationHeight}px`
    composerElement.style.height = `${effectiveComposerPaneHeight}px`
  }, [])

  const schedulePaneLayout = useCallback(() => {
    if (layoutFrameRef.current !== null) {
      return
    }

    layoutFrameRef.current = window.requestAnimationFrame(() => {
      layoutFrameRef.current = null
      applyPaneLayout()
    })
  }, [applyPaneLayout])

  useEffect(() => {
    const element = bodyRef.current
    if (!element) {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      schedulePaneLayout()
    })

    resizeObserver.observe(element)
    applyPaneLayout()

    return () => {
      resizeObserver.disconnect()
      if (layoutFrameRef.current !== null) {
        window.cancelAnimationFrame(layoutFrameRef.current)
      }
    }
  }, [applyPaneLayout, schedulePaneLayout])

  const handleSendMessage = useCallback((payload: ConversationComposerSubmitPayload) => {
    onSendMessage(payload)
    historyPaneRef.current?.scrollToBottom()
  }, [onSendMessage])

  const handleComposerLayoutStateChange = useCallback(({
    hasAttachments,
  }: {
    hasAttachments: boolean
  }) => {
    hasComposerAttachmentsRef.current = hasAttachments
    preferredComposerPaneHeightRef.current = (
      hasAttachments
        ? Math.max(preferredComposerPaneHeightRef.current, MIN_COMPOSER_PANE_HEIGHT_WITH_ATTACHMENTS)
        : MIN_COMPOSER_PANE_HEIGHT
    )
    schedulePaneLayout()
  }, [schedulePaneLayout])

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isTransferWithFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    dragDepthRef.current += 1
    setIsDropActive(true)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isTransferWithFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDropActive(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isTransferWithFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)

    if (dragDepthRef.current === 0) {
      setIsDropActive(false)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isTransferWithFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    dragDepthRef.current = 0
    setIsDropActive(false)
    void composerRef.current?.addTransferData(event.dataTransfer)
  }

  const handleSplitterPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const bodyHeight = bodyHeightRef.current || Math.round(bodyRef.current?.clientHeight ?? 0)
    if (bodyHeight <= 0) {
      return
    }

    resizeDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startComposerHeight: clampComposerPaneHeight(
        preferredComposerPaneHeightRef.current,
        bodyHeight,
        hasComposerAttachmentsRef.current,
      ),
    }
    setIsResizing(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const handleSplitterPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!resizeDragRef.current || resizeDragRef.current.pointerId !== event.pointerId) {
      return
    }

    const deltaY = event.clientY - resizeDragRef.current.startY
    const nextHeight = resizeDragRef.current.startComposerHeight - deltaY
    const bodyHeight = bodyHeightRef.current || Math.round(bodyRef.current?.clientHeight ?? 0)
    if (bodyHeight <= 0) {
      return
    }

    preferredComposerPaneHeightRef.current = clampComposerPaneHeight(
      nextHeight,
      bodyHeight,
      hasComposerAttachmentsRef.current,
    )
    applyPaneLayout()
  }

  const handleSplitterPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!resizeDragRef.current || resizeDragRef.current.pointerId !== event.pointerId) {
      return
    }

    resizeDragRef.current = null
    setIsResizing(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div
      className="relative flex flex-col h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ background: 'var(--cp-bg)' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{
          borderBottom: '1px solid var(--cp-border)',
          background: 'var(--cp-surface)',
        }}
      >
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg md:hidden"
          style={{ color: 'var(--cp-accent)' }}
          type="button"
        >
          <ArrowLeft size={20} />
        </button>

        {sessionCount > 1 ? (
          <button
            onClick={onOpenSessionSidebar}
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--cp-muted)' }}
            type="button"
          >
            <Menu size={18} />
          </button>
        ) : null}

        <button
          onClick={onOpenDetails}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
          type="button"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <EntityTypeIcon type={entity.type} />
              <span
                className="font-semibold text-sm truncate"
                style={{ color: 'var(--cp-text)' }}
              >
                {entity.name}
              </span>
            </div>
            <p
              className="text-xs truncate"
              style={{ color: 'var(--cp-muted)' }}
            >
              {session?.title !== 'Direct Message'
                ? session?.title
                : entity.statusText}
            </p>
          </div>
        </button>

        <button
          onClick={onOpenDetails}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--cp-muted)' }}
          type="button"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      <div
        ref={bodyRef}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div
          ref={historyPaneContainerRef}
          className="flex min-h-0 flex-col"
          style={{
            height: `calc(100% - ${DEFAULT_COMPOSER_PANE_HEIGHT + SPLITTER_HEIGHT}px)`,
            minHeight: MIN_HISTORY_PANE_HEIGHT,
          }}
        >
          <ConversationHistoryPane
            ref={historyPaneRef}
            reader={messageReader}
            selfDid={selfDid}
            isGroup={isGroup}
          />
        </div>

        <button
          aria-label={t('messagehub.resizeComposer', 'Resize input area')}
          className="group flex w-full flex-shrink-0 items-center justify-center"
          onPointerDown={handleSplitterPointerDown}
          onPointerMove={handleSplitterPointerMove}
          onPointerUp={handleSplitterPointerUp}
          onPointerCancel={handleSplitterPointerUp}
          style={{
            height: SPLITTER_HEIGHT,
            cursor: 'row-resize',
            background: isResizing
              ? 'color-mix(in srgb, var(--cp-accent) 12%, transparent)'
              : 'transparent',
            touchAction: 'none',
          }}
          type="button"
        >
          <div
            className="flex h-2.5 w-16 items-center justify-center rounded-full transition-colors"
            style={{
              background: isResizing
                ? 'color-mix(in srgb, var(--cp-accent) 18%, transparent)'
                : 'transparent',
              color: isResizing
                ? 'var(--cp-accent)'
                : 'color-mix(in srgb, var(--cp-muted) 82%, transparent)',
            }}
          >
            <GripHorizontal size={14} />
          </div>
        </button>

        <div
          ref={composerPaneContainerRef}
          className="min-h-0 flex-shrink-0 overflow-visible"
          style={{ height: DEFAULT_COMPOSER_PANE_HEIGHT }}
        >
          <ConversationComposer
            ref={composerRef}
            placeholder={t('messagehub.inputPlaceholder', 'Message...')}
            onLayoutStateChange={handleComposerLayoutStateChange}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>

      {isDropActive ? (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-5"
          style={{
            background: 'color-mix(in srgb, var(--cp-accent) 12%, transparent)',
          }}
        >
          <div
            className="flex max-w-sm flex-col items-center gap-2 rounded-[28px] px-6 py-5 text-center"
            style={{
              background: 'color-mix(in srgb, var(--cp-surface) 94%, white)',
              border: '1px solid color-mix(in srgb, var(--cp-accent) 26%, var(--cp-border))',
              boxShadow: '0 20px 60px color-mix(in srgb, var(--cp-shadow) 18%, transparent)',
            }}
          >
            <div
              className="rounded-full p-3"
              style={{
                background: 'color-mix(in srgb, var(--cp-accent) 16%, transparent)',
                color: 'var(--cp-accent)',
              }}
            >
              <FileUp size={20} />
            </div>
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--cp-text)' }}
            >
              {t('messagehub.dropFilesTitle', 'Drop files or folders to attach')}
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--cp-muted)' }}
            >
              {t(
                'messagehub.dropFilesHint',
                'Everything you drop here will be added to the current draft.',
              )}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function clampComposerPaneHeight(
  nextHeight: number,
  bodyHeight: number,
  hasAttachments: boolean,
): number {
  const minComposerHeight = hasAttachments
    ? MIN_COMPOSER_PANE_HEIGHT_WITH_ATTACHMENTS
    : MIN_COMPOSER_PANE_HEIGHT
  const maxComposerHeight = Math.max(
    minComposerHeight,
    bodyHeight - MIN_HISTORY_PANE_HEIGHT - SPLITTER_HEIGHT,
  )

  return Math.min(
    Math.max(nextHeight, minComposerHeight),
    maxComposerHeight,
  )
}

function EntityTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'agent':
      return <Bot size={16} />
    case 'group':
      return <Users size={16} />
    default:
      return <User size={16} />
  }
}
