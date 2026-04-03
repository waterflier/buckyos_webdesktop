import { useCallback, useMemo, useState } from 'react'
import { ConversationView } from '../messagehub/ConversationView'
import { EntityDetails } from '../messagehub/EntityDetails'
import {
  mockEntities,
  mockEntityDetails,
  mockMessages,
  mockSessions,
} from '../messagehub/mock/data'
import { SessionSidebar } from '../messagehub/SessionSidebar'
import type { Message } from '../messagehub/types'
import type { AppContentLoaderProps } from '../types'

const codeAssistantEntityId = 'agent-coder'

export function CodeAssistantAppPanel(props: AppContentLoaderProps) {
  void props
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    () => mockSessions[codeAssistantEntityId]?.[0]?.id ?? null,
  )
  const [showSessionSidebar, setShowSessionSidebar] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>(
    () => ({ ...mockMessages }),
  )

  const entity = useMemo(
    () => mockEntities.find((item) => item.id === codeAssistantEntityId) ?? null,
    [],
  )
  const sessions = useMemo(
    () => mockSessions[codeAssistantEntityId] ?? [],
    [],
  )
  const activeSession = useMemo(() => {
    if (!selectedSessionId) {
      return sessions[0] ?? null
    }

    return sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null
  }, [selectedSessionId, sessions])
  const messages = useMemo(() => {
    const sessionId = activeSession?.id
    return sessionId ? localMessages[sessionId] ?? [] : []
  }, [activeSession, localMessages])
  const entityDetail = useMemo(
    () => mockEntityDetails[codeAssistantEntityId] ?? null,
    [],
  )

  const handleSendMessage = useCallback((content: string) => {
    if (!activeSession) {
      return
    }

    const newMessage: Message = {
      id: `msg-local-${Date.now()}`,
      sessionId: activeSession.id,
      role: 'user',
      senderName: 'You',
      contentType: 'text',
      content,
      timestamp: Date.now(),
      status: 'sent',
    }

    setLocalMessages((prev) => ({
      ...prev,
      [activeSession.id]: [...(prev[activeSession.id] ?? []), newMessage],
    }))
  }, [activeSession])

  if (!entity || !entityDetail) {
    return null
  }

  return (
    <div className="flex h-full min-h-0 bg-[color:var(--cp-bg)]">
      {showSessionSidebar && sessions.length > 1 ? (
        <div
          className="h-full w-[240px] flex-shrink-0"
          style={{ borderRight: '1px solid var(--cp-border)' }}
        >
          <SessionSidebar
            sessions={sessions}
            activeSessionId={activeSession?.id ?? null}
            onSelectSession={(sessionId) => {
              setSelectedSessionId(sessionId)
              setShowSessionSidebar(false)
            }}
            onClose={() => setShowSessionSidebar(false)}
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <ConversationView
          entity={entity}
          session={activeSession}
          messages={messages}
          onBack={() => undefined}
          onOpenSessionSidebar={() => setShowSessionSidebar((prev) => !prev)}
          onOpenDetails={() => setShowDetails((prev) => !prev)}
          onSendMessage={handleSendMessage}
          sessionCount={sessions.length}
        />
      </div>

      {showDetails ? (
        <div
          className="h-full w-[320px] flex-shrink-0"
          style={{ borderLeft: '1px solid var(--cp-border)' }}
        >
          <EntityDetails
            entity={entityDetail}
            onClose={() => setShowDetails(false)}
          />
        </div>
      ) : null}
    </div>
  )
}
