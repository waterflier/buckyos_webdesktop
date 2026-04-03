import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConversationView } from '../messagehub/ConversationView'
import { InMemoryConversationMessageReader } from '../messagehub/conversation/history/data-source'
import type { AppendableConversationMessageReader } from '../messagehub/conversation/history/types'
import { EntityDetails } from '../messagehub/EntityDetails'
import {
  createOutgoingMockMessage,
  MOCK_SELF_DID,
  mockEntities,
  mockEntityDetails,
  mockSessions,
} from '../messagehub/mock/data'
import { SessionSidebar } from '../messagehub/SessionSidebar'
import type { AppContentLoaderProps } from '../types'
import { createCodeAssistantMockReaders } from './mockHistory'

const codeAssistantEntityId = 'agent-coder'
const EMPTY_READER = InMemoryConversationMessageReader.empty()

export function CodeAssistantAppPanel(props: AppContentLoaderProps) {
  void props
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    () => mockSessions[codeAssistantEntityId]?.[0]?.id ?? null,
  )
  const [showSessionSidebar, setShowSessionSidebar] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [localReaders, setLocalReaders] = useState<Record<string, AppendableConversationMessageReader>>(
    {},
  )

  useEffect(() => {
    let cancelled = false

    void createCodeAssistantMockReaders().then((readers) => {
      if (!cancelled) {
        setLocalReaders(readers)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

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
  const messageReader = useMemo(() => {
    const sessionId = activeSession?.id
    return sessionId ? localReaders[sessionId] ?? EMPTY_READER : EMPTY_READER
  }, [activeSession, localReaders])
  const entityDetail = useMemo(
    () => mockEntityDetails[codeAssistantEntityId] ?? null,
    [],
  )

  const handleSendMessage = useCallback((content: string) => {
    if (!activeSession) {
      return
    }

    const newMessage = createOutgoingMockMessage({
      sessionId: activeSession.id,
      entityId: codeAssistantEntityId,
      content,
      createdAtMs: Date.now(),
    })

    setLocalReaders((prev) => ({
      ...prev,
      [activeSession.id]: (prev[activeSession.id] ?? EMPTY_READER).append(newMessage),
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
          messageReader={messageReader}
          selfDid={MOCK_SELF_DID}
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
