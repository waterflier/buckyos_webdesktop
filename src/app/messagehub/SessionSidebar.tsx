import { X, MessageSquare, Briefcase, Layout, Plus } from 'lucide-react'
import { useI18n } from '../../i18n/provider'
import type { Session } from './types'

interface SessionSidebarProps {
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onClose: () => void
}

function SessionIcon({ type }: { type: string }) {
  switch (type) {
    case 'task':
      return <Briefcase size={16} />
    case 'workspace':
      return <Layout size={16} />
    default:
      return <MessageSquare size={16} />
  }
}

function formatSessionTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onClose,
}: SessionSidebarProps) {
  const { t } = useI18n()

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--cp-surface)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--cp-border)' }}
      >
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--cp-text)' }}
        >
          {t('messagehub.sessions', 'Sessions')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded-lg"
            style={{ color: 'var(--cp-muted)' }}
            title={t('messagehub.newSession', 'New Session')}
          >
            <Plus size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg"
            style={{ color: 'var(--cp-muted)' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 shell-scrollbar">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId
          return (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl transition-colors mb-0.5"
              style={{
                background: isActive
                  ? 'color-mix(in srgb, var(--cp-accent) 14%, transparent)'
                  : 'transparent',
              }}
            >
              <span
                style={{
                  color: isActive
                    ? 'var(--cp-accent)'
                    : 'var(--cp-muted)',
                }}
              >
                <SessionIcon type={session.type} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--cp-text)' }}
                  >
                    {session.title}
                  </span>
                  {session.unreadCount > 0 && (
                    <span
                      className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-semibold"
                      style={{
                        minWidth: 18,
                        height: 18,
                        padding: '0 5px',
                        background: 'var(--cp-accent)',
                        color: '#fff',
                        fontSize: '10px',
                      }}
                    >
                      {session.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {session.source && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background:
                          'color-mix(in srgb, var(--cp-accent) 10%, transparent)',
                        color: 'var(--cp-accent)',
                      }}
                    >
                      {session.source}
                    </span>
                  )}
                  <span
                    className="text-[10px]"
                    style={{ color: 'var(--cp-muted)' }}
                  >
                    {formatSessionTime(session.lastActiveAt)}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
