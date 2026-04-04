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
  const composerPaneContainerRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<ConversationComposerHandle>(null)
  const dragDepthRef = useRef(0)
  const composerPaneHeightRef = useRef(DEFAULT_COMPOSER_PANE_HEIGHT)
  const preferredHeightRef = useRef(DEFAULT_COMPOSER_PANE_HEIGHT)
  const hasComposerAttachmentsRef = useRef(false)
  const resizeDragRef = useRef<{
    pointerId: number
    startY: number
    startComposerHeight: number
  } | null>(null)
  const historyPaneRef = useRef<ConversationHistoryPaneHandle>(null)
  const [isDropActive, setIsDropActive] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  const applyComposerHeight = useCallback((height: number) => {
    const bodyHeight = bodyRef.current?.clientHeight ?? 0
    const maxHeight = bodyHeight > 0
      ? Math.max(MIN_COMPOSER_PANE_HEIGHT, bodyHeight - MIN_HISTORY_PANE_HEIGHT - SPLITTER_HEIGHT)
      : height
    const clamped = Math.min(height, maxHeight)
    composerPaneHeightRef.current = clamped
    if (composerPaneContainerRef.current) {
      composerPaneContainerRef.current.style.height = `${clamped}px`
    }
  }, [])

  // Re-clamp composer height when the container resizes (e.g. window resize)
  useEffect(() => {
    const element = bodyRef.current
    if (!element) {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      applyComposerHeight(composerPaneHeightRef.current)
    })

    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [applyComposerHeight])

  const handleSendMessage = useCallback((payload: ConversationComposerSubmitPayload) => {
    onSendMessage(payload)
    historyPaneRef.current?.scrollToBottom()
  }, [onSendMessage])

  const handleComposerLayoutStateChange = useCallback(({
    hasAttachments,
    contentHeight,
  }: {
    hasAttachments: boolean
    contentHeight: number
  }) => {
    hasComposerAttachmentsRef.current = hasAttachments
    const minHeight = hasAttachments
      ? MIN_COMPOSER_PANE_HEIGHT_WITH_ATTACHMENTS
      : MIN_COMPOSER_PANE_HEIGHT

    // Reset preferred height when attachments change
    preferredHeightRef.current = hasAttachments
      ? Math.max(preferredHeightRef.current, MIN_COMPOSER_PANE_HEIGHT_WITH_ATTACHMENTS)
      : MIN_COMPOSER_PANE_HEIGHT

    const desiredHeight = Math.max(preferredHeightRef.current, minHeight, contentHeight)
    applyComposerHeight(desiredHeight)
  }, [applyComposerHeight])

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
    resizeDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startComposerHeight: composerPaneHeightRef.current,
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
    const minHeight = hasComposerAttachmentsRef.current
      ? MIN_COMPOSER_PANE_HEIGHT_WITH_ATTACHMENTS
      : MIN_COMPOSER_PANE_HEIGHT
    const clamped = Math.max(nextHeight, minHeight)
    preferredHeightRef.current = clamped
    applyComposerHeight(clamped)
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
          className="flex flex-1 min-h-0 flex-col"
          style={{ minHeight: MIN_HISTORY_PANE_HEIGHT }}
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
