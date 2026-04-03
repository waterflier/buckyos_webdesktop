import {
  ArrowLeft,
  Bot,
  Menu,
  MoreVertical,
  User,
  Users,
} from 'lucide-react'
import { useI18n } from '../../i18n/provider'
import { ConversationHistoryPane } from './conversation/history/ConversationHistoryPane'
import type { ConversationMessageReader } from './conversation/history/types'
import { ConversationComposer } from './conversation/input/ConversationComposer'
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
  onSendMessage: (content: string) => void
  sessionCount: number
}

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

  return (
    <div
      className="flex flex-col h-full"
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

      <ConversationHistoryPane
        reader={messageReader}
        selfDid={selfDid}
        isGroup={isGroup}
      />

      <ConversationComposer
        placeholder={t('messagehub.inputPlaceholder', 'Message...')}
        onSendMessage={onSendMessage}
      />
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
