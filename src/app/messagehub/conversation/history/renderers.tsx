import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
} from 'lucide-react'
import {
  getMessageDeliveryStatus,
  getMessageSenderName,
  type DID,
  type MessageDeliveryStatus,
  type MessageObject,
} from '../../protocol/msgobj'
import type { ConversationListItem } from './types'

interface MessageRenderContext {
  isGroup: boolean
  selfDid: DID
}

type MessageRenderer = (
  message: MessageObject,
  context: MessageRenderContext,
) => React.ReactNode | null

const messageRenderers: readonly MessageRenderer[] = [
  renderTextMessage,
  renderFallbackMessage,
]

export function ConversationListRow({
  item,
  isGroup,
  selfDid,
}: {
  item: ConversationListItem
  isGroup: boolean
  selfDid: DID
}) {
  if (item.kind === 'timestamp') {
    return (
      <div className="flex justify-center py-3">
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            background: 'color-mix(in srgb, var(--cp-text) 8%, transparent)',
            color: 'var(--cp-muted)',
          }}
        >
          {formatDateSeparator(item.date)}
        </span>
      </div>
    )
  }

  if (item.kind === 'status') {
    return (
      <div className="flex justify-center py-2">
        <span
          className="px-3 py-1 rounded-full text-xs"
          style={{
            background: 'color-mix(in srgb, var(--cp-text) 6%, transparent)',
            color: 'var(--cp-muted)',
          }}
        >
          {item.label}
        </span>
      </div>
    )
  }

  return (
    <>
      {messageRenderers.map((renderer) => renderer(item.data, { isGroup, selfDid })).find(Boolean)}
    </>
  )
}

function renderTextMessage(
  message: MessageObject,
  { isGroup, selfDid }: MessageRenderContext,
) {
  const format = message.content.format ?? 'text/plain'

  if (
    format !== 'text/plain'
    && format !== 'text/markdown'
    && format !== 'text/html'
  ) {
    return null
  }

  const isSelf = message.from === selfDid
  const senderName = getMessageSenderName(message)
  const deliveryStatus = getMessageDeliveryStatus(message)

  return (
    <div
      className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-1`}
      key={`${message.from}:${message.created_at_ms}`}
    >
      <div
        className="max-w-[75%] min-w-[80px]"
        style={{
          background: isSelf
            ? 'var(--cp-accent)'
            : 'color-mix(in srgb, var(--cp-text) 8%, transparent)',
          color: isSelf ? '#fff' : 'var(--cp-text)',
          borderRadius: isSelf
            ? '18px 18px 4px 18px'
            : '18px 18px 18px 4px',
          padding: '8px 12px',
        }}
      >
        {!isSelf && isGroup ? (
          <p
            className="text-xs font-semibold mb-1"
            style={{ color: 'var(--cp-accent)' }}
          >
            {senderName}
          </p>
        ) : null}
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {message.content.content}
        </p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span
            className="text-[10px]"
            style={{
              color: isSelf
                ? 'rgba(255,255,255,0.66)'
                : 'var(--cp-muted)',
            }}
          >
            {formatMessageTime(message.created_at_ms)}
          </span>
          {isSelf ? <MessageStatusIcon status={deliveryStatus} /> : null}
        </div>
      </div>
    </div>
  )
}

function renderFallbackMessage(
  message: MessageObject,
  { selfDid }: MessageRenderContext,
) {
  const isSelf = message.from === selfDid

  return (
    <div
      className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-1`}
      key={`${message.from}:${message.created_at_ms}:fallback`}
    >
      <div
        className="max-w-[75%] min-w-[120px]"
        style={{
          background: 'color-mix(in srgb, var(--cp-text) 8%, transparent)',
          color: 'var(--cp-text)',
          borderRadius: '18px',
          padding: '8px 12px',
        }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--cp-muted)' }}>
          {message.content.format ?? 'unknown content'}
        </p>
        <pre className="text-xs whitespace-pre-wrap break-words leading-relaxed">
          {message.content.content}
        </pre>
      </div>
    </div>
  )
}

function MessageStatusIcon({
  status,
}: {
  status?: MessageDeliveryStatus
}) {
  switch (status) {
    case 'sending':
      return <Clock size={14} style={{ color: 'var(--cp-muted)' }} />
    case 'sent':
      return <Check size={14} style={{ color: 'var(--cp-muted)' }} />
    case 'delivered':
      return <CheckCheck size={14} style={{ color: 'var(--cp-muted)' }} />
    case 'read':
      return <CheckCheck size={14} style={{ color: 'var(--cp-accent)' }} />
    case 'failed':
      return <AlertCircle size={14} style={{ color: 'var(--cp-danger)' }} />
    default:
      return null
  }
}

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateSeparator(date: Date): string {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}
