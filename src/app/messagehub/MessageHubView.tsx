import { useCallback, useMemo, useState } from 'react'
import { useMediaQuery } from '@mui/material'
import { MessageSquare } from 'lucide-react'
import { useI18n } from '../../i18n/provider'
import { ConversationView } from './ConversationView'
import { InMemoryConversationMessageReader } from './conversation/history/data-source'
import { EntityDetails } from './EntityDetails'
import { EntityList } from './EntityList'
import {
  createOutgoingMockMessage,
  MOCK_SELF_DID,
  mockEntities,
  mockEntityDetails,
  mockMessageReaders,
  mockSessions,
} from './mock/data'
import { SessionSidebar } from './SessionSidebar'
import type {
  EntityFilter,
  MobileView,
} from './types'

const EMPTY_READER = InMemoryConversationMessageReader.empty()

function findEntityById(id: string | null) {
  if (!id) {
    return null
  }

  const queue = [...mockEntities]

  while (queue.length > 0) {
    const current = queue.shift()

    if (!current) {
      continue
    }

    if (current.id === id) {
      return current
    }

    if (current.children?.length) {
      queue.push(...current.children)
    }
  }

  return null
}

function getDefaultSessionId(entityId: string | null) {
  return entityId ? mockSessions[entityId]?.[0]?.id ?? null : null
}

export function MessageHubView({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const isDesktop = useMediaQuery('(min-width: 769px)')
  const resolvedInitialEntityId = findEntityById(initialEntityId)?.id ?? null

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(resolvedInitialEntityId)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    () => getDefaultSessionId(resolvedInitialEntityId),
  )
  const [filter, setFilter] = useState<EntityFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileView, setMobileView] = useState<MobileView>(
    () => (!isDesktop && resolvedInitialEntityId ? 'conversation' : 'entity-list'),
  )
  const [showSessionSidebar, setShowSessionSidebar] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [localReaders, setLocalReaders] = useState<Record<string, InMemoryConversationMessageReader>>(
    () => ({ ...mockMessageReaders }),
  )

  const selectedEntity = useMemo(
    () => findEntityById(selectedEntityId),
    [selectedEntityId],
  )

  const sessions = useMemo(
    () => (selectedEntityId ? mockSessions[selectedEntityId] ?? [] : []),
    [selectedEntityId],
  )

  const activeSession = useMemo(() => {
    if (selectedSessionId) {
      return sessions.find((session) => session.id === selectedSessionId) ?? null
    }

    return sessions[0] ?? null
  }, [selectedSessionId, sessions])

  const messageReader = useMemo(() => {
    const sessionId = activeSession?.id
    return sessionId ? localReaders[sessionId] ?? EMPTY_READER : EMPTY_READER
  }, [activeSession, localReaders])

  const entityDetail = useMemo(
    () => (selectedEntityId ? mockEntityDetails[selectedEntityId] ?? null : null),
    [selectedEntityId],
  )

  const handleSelectEntity = useCallback(
    (id: string) => {
      setSelectedEntityId(id)
      setSelectedSessionId(getDefaultSessionId(id))
      setShowDetails(false)
      setShowSessionSidebar(false)

      if (!isDesktop) {
        setMobileView('conversation')
      }
    },
    [isDesktop],
  )

  const handleBack = useCallback(() => {
    setMobileView('entity-list')
    setShowDetails(false)
    setShowSessionSidebar(false)
  }, [])

  const handleOpenDetails = useCallback(() => {
    if (isDesktop) {
      setShowDetails((prev) => !prev)
      return
    }

    setMobileView('details')
  }, [isDesktop])

  const handleCloseDetails = useCallback(() => {
    if (isDesktop) {
      setShowDetails(false)
      return
    }

    setMobileView('conversation')
  }, [isDesktop])

  const handleSelectSession = useCallback((id: string) => {
    setSelectedSessionId(id)
    setShowSessionSidebar(false)
  }, [])

  const handleSendMessage = useCallback((content: string) => {
    if (!activeSession || !selectedEntityId) {
      return
    }

    const newMessage = createOutgoingMockMessage({
      sessionId: activeSession.id,
      entityId: selectedEntityId,
      content,
      createdAtMs: Date.now(),
    })

    setLocalReaders((prev) => ({
      ...prev,
      [activeSession.id]: (prev[activeSession.id] ?? EMPTY_READER).append(newMessage),
    }))
  }, [activeSession, selectedEntityId])

  if (!isDesktop) {
    return (
      <div className="relative h-full w-full" style={{ background: 'var(--cp-bg)', zIndex: 1 }}>
        {mobileView === 'entity-list' ? (
          <EntityList
            entities={mockEntities}
            selectedEntityId={selectedEntityId}
            filter={filter}
            searchQuery={searchQuery}
            onSelectEntity={handleSelectEntity}
            onFilterChange={setFilter}
            onSearchChange={setSearchQuery}
          />
        ) : null}

        {mobileView === 'conversation' && selectedEntity ? (
          <div className="relative h-full">
            <ConversationView
              entity={selectedEntity}
              session={activeSession}
              messageReader={messageReader}
              selfDid={MOCK_SELF_DID}
              onBack={handleBack}
              onOpenSessionSidebar={() => setShowSessionSidebar(true)}
              onOpenDetails={handleOpenDetails}
              onSendMessage={handleSendMessage}
              sessionCount={sessions.length}
            />

            {showSessionSidebar ? (
              <>
                <div
                  className="absolute inset-0 z-40"
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                  onClick={() => setShowSessionSidebar(false)}
                />
                <div
                  className="absolute bottom-0 left-0 top-0 z-50"
                  style={{ width: 280 }}
                >
                  <SessionSidebar
                    sessions={sessions}
                    activeSessionId={activeSession?.id ?? null}
                    onSelectSession={handleSelectSession}
                    onClose={() => setShowSessionSidebar(false)}
                  />
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {mobileView === 'details' && entityDetail ? (
          <div className="h-full">
            <EntityDetails entity={entityDetail} onClose={handleCloseDetails} />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex h-full w-full" style={{ background: 'var(--cp-bg)', zIndex: 1 }}>
      <div
        className="h-full flex-shrink-0"
        style={{
          width: 340,
          borderRight: '1px solid var(--cp-border)',
        }}
      >
        <EntityList
          entities={mockEntities}
          selectedEntityId={selectedEntityId}
          filter={filter}
          searchQuery={searchQuery}
          onSelectEntity={handleSelectEntity}
          onFilterChange={setFilter}
          onSearchChange={setSearchQuery}
        />
      </div>

      {showSessionSidebar && sessions.length > 1 ? (
        <div
          className="h-full flex-shrink-0"
          style={{
            width: 240,
            borderRight: '1px solid var(--cp-border)',
          }}
        >
          <SessionSidebar
            sessions={sessions}
            activeSessionId={activeSession?.id ?? null}
            onSelectSession={handleSelectSession}
            onClose={() => setShowSessionSidebar(false)}
          />
        </div>
      ) : null}

      <div className="h-full min-w-0 flex-1">
        {selectedEntity ? (
          <ConversationView
            entity={selectedEntity}
            session={activeSession}
            messageReader={messageReader}
            selfDid={MOCK_SELF_DID}
            onBack={handleBack}
            onOpenSessionSidebar={() => setShowSessionSidebar((prev) => !prev)}
            onOpenDetails={handleOpenDetails}
            onSendMessage={handleSendMessage}
            sessionCount={sessions.length}
          />
        ) : (
          <EmptyConversation />
        )}
      </div>

      {showDetails && entityDetail ? (
        <div
          className="h-full flex-shrink-0"
          style={{
            width: 320,
            borderLeft: '1px solid var(--cp-border)',
          }}
        >
          <EntityDetails entity={entityDetail} onClose={handleCloseDetails} />
        </div>
      ) : null}
    </div>
  )
}

function EmptyConversation() {
  const { t } = useI18n()

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3"
      style={{ color: 'var(--cp-muted)' }}
    >
      <MessageSquare size={48} strokeWidth={1.2} />
      <p className="text-sm">
        {t('messagehub.selectConversation', 'Select a conversation to start')}
      </p>
    </div>
  )
}
