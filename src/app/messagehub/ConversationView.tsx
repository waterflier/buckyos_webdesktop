import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft,
  Menu,
  MoreVertical,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Bot,
  Users,
  User,
} from 'lucide-react'
import { useI18n } from '../../i18n/provider'
import type { Entity, Message, Session } from './types'

interface ConversationViewProps {
  entity: Entity
  session: Session | null
  messages: Message[]
  onBack: () => void
  onOpenSessionSidebar: () => void
  onOpenDetails: () => void
  onSendMessage: (content: string) => void
  sessionCount: number
}

function MessageStatusIcon({ status }: { status?: string }) {
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

function shouldShowDateSeparator(
  current: Message,
  previous?: Message,
): boolean {
  if (!previous) return true
  const d1 = new Date(current.timestamp).toDateString()
  const d2 = new Date(previous.timestamp).toDateString()
  return d1 !== d2
}

function formatDateSeparator(ts: number): string {
  const date = new Date(ts)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

function MessageBubble({ message, isGroup }: { message: Message; isGroup: boolean }) {
  const isUser = message.role === 'user'
  const isStatus = message.contentType === 'status'

  if (isStatus) {
    return (
      <div className="flex justify-center py-2">
        <span
          className="px-3 py-1 rounded-full text-xs"
          style={{
            background: 'color-mix(in srgb, var(--cp-text) 6%, transparent)',
            color: 'var(--cp-muted)',
          }}
        >
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}
    >
      <div
        className="max-w-[75%] min-w-[80px]"
        style={{
          background: isUser
            ? 'var(--cp-accent)'
            : 'color-mix(in srgb, var(--cp-text) 8%, transparent)',
          color: isUser ? '#fff' : 'var(--cp-text)',
          borderRadius: isUser
            ? '18px 18px 4px 18px'
            : '18px 18px 18px 4px',
          padding: '8px 12px',
        }}
      >
        {/* Sender name for group chats */}
        {!isUser && isGroup && (
          <p
            className="text-xs font-semibold mb-1"
            style={{
              color: isUser
                ? 'rgba(255,255,255,0.8)'
                : 'var(--cp-accent)',
            }}
          >
            {message.senderName}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
        <div
          className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : 'justify-end'}`}
        >
          <span
            className="text-[10px]"
            style={{
              color: isUser
                ? 'rgba(255,255,255,0.6)'
                : 'var(--cp-muted)',
            }}
          >
            {formatMessageTime(message.timestamp)}
          </span>
          {isUser && <MessageStatusIcon status={message.status} />}
        </div>
      </div>
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

export function ConversationView({
  entity,
  session,
  messages,
  onBack,
  onOpenSessionSidebar,
  onOpenDetails,
  onSendMessage,
  sessionCount,
}: ConversationViewProps) {
  const { t } = useI18n()
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isGroup = entity.type === 'group'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    const text = inputValue.trim()
    if (!text) return
    onSendMessage(text)
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--cp-bg)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{
          borderBottom: '1px solid var(--cp-border)',
          background: 'var(--cp-surface)',
        }}
      >
        {/* Back button (mobile) */}
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg md:hidden"
          style={{ color: 'var(--cp-accent)' }}
        >
          <ArrowLeft size={20} />
        </button>

        {/* Session sidebar toggle */}
        {sessionCount > 1 && (
          <button
            onClick={onOpenSessionSidebar}
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--cp-muted)' }}
          >
            <Menu size={18} />
          </button>
        )}

        {/* Entity info (clickable for details) */}
        <button
          onClick={onOpenDetails}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
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
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 shell-scrollbar">
        {messages.map((msg, i) => (
          <div key={msg.id}>
            {shouldShowDateSeparator(msg, messages[i - 1]) && (
              <div className="flex justify-center py-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    background:
                      'color-mix(in srgb, var(--cp-text) 8%, transparent)',
                    color: 'var(--cp-muted)',
                  }}
                >
                  {formatDateSeparator(msg.timestamp)}
                </span>
              </div>
            )}
            <MessageBubble message={msg} isGroup={isGroup} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="flex-shrink-0 px-3 py-2"
        style={{
          borderTop: '1px solid var(--cp-border)',
          background: 'var(--cp-surface)',
        }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2"
          style={{
            background: 'color-mix(in srgb, var(--cp-text) 5%, transparent)',
          }}
        >
          <button
            className="p-1 rounded-lg flex-shrink-0 self-end mb-0.5"
            style={{ color: 'var(--cp-muted)' }}
          >
            <Paperclip size={18} />
          </button>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('messagehub.inputPlaceholder', 'Message...')}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-sm resize-none"
            style={{
              color: 'var(--cp-text)',
              maxHeight: 120,
              lineHeight: '1.4',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-1.5 rounded-full flex-shrink-0 self-end transition-colors"
            style={{
              background: inputValue.trim()
                ? 'var(--cp-accent)'
                : 'color-mix(in srgb, var(--cp-text) 10%, transparent)',
              color: inputValue.trim() ? '#fff' : 'var(--cp-muted)',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
