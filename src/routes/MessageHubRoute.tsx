import { useState, useCallback, useMemo } from 'react'
import { useMediaQuery } from '@mui/material'
import { MessageSquare } from 'lucide-react'
import { useI18n } from '../i18n/provider'
import { EntityList } from '../components/messagehub/EntityList'
import { ConversationView } from '../components/messagehub/ConversationView'
import { EntityDetails } from '../components/messagehub/EntityDetails'
import { SessionSidebar } from '../components/messagehub/SessionSidebar'
import {
  mockEntities,
  mockSessions,
  mockMessages,
  mockEntityDetails,
} from '../components/messagehub/mock/data'
import type {
  EntityFilter,
  MobileView,
  Message,
} from '../components/messagehub/types'

export function MessageHubRoute() {
  const { t } = useI18n()
  const isDesktop = useMediaQuery('(min-width: 769px)')

  // Core state
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [filter, setFilter] = useState<EntityFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileView, setMobileView] = useState<MobileView>('entity-list')
  const [showSessionSidebar, setShowSessionSidebar] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Local message state for sending
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>(
    () => ({ ...mockMessages }),
  )

  // Derived data
  const selectedEntity = useMemo(
    () => mockEntities.find((e) => e.id === selectedEntityId) ?? null,
    [selectedEntityId],
  )

  const sessions = useMemo(
    () => (selectedEntityId ? mockSessions[selectedEntityId] ?? [] : []),
    [selectedEntityId],
  )

  const activeSession = useMemo(() => {
    if (selectedSessionId) return sessions.find((s) => s.id === selectedSessionId) ?? null
    return sessions[0] ?? null
  }, [sessions, selectedSessionId])

  const messages = useMemo(() => {
    const sid = activeSession?.id
    return sid ? localMessages[sid] ?? [] : []
  }, [activeSession, localMessages])

  const entityDetail = useMemo(
    () => (selectedEntityId ? mockEntityDetails[selectedEntityId] ?? null : null),
    [selectedEntityId],
  )

  // Handlers
  const handleSelectEntity = useCallback(
    (id: string) => {
      setSelectedEntityId(id)
      const entitySessions = mockSessions[id]
      setSelectedSessionId(entitySessions?.[0]?.id ?? null)
      setShowDetails(false)
      setShowSessionSidebar(false)
      if (!isDesktop) setMobileView('conversation')
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
      setShowDetails((v) => !v)
    } else {
      setMobileView('details')
    }
  }, [isDesktop])

  const handleCloseDetails = useCallback(() => {
    if (isDesktop) {
      setShowDetails(false)
    } else {
      setMobileView('conversation')
    }
  }, [isDesktop])

  const handleSelectSession = useCallback((id: string) => {
    setSelectedSessionId(id)
    setShowSessionSidebar(false)
  }, [])

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!activeSession) return
      const newMsg: Message = {
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
        [activeSession.id]: [...(prev[activeSession.id] ?? []), newMsg],
      }))
    },
    [activeSession],
  )

  // ── Mobile Layout ──
  if (!isDesktop) {
    return (
      <div className="h-dvh w-full relative" style={{ background: 'var(--cp-bg)', position: 'relative', zIndex: 1 }}>
        {/* Entity List */}
        {mobileView === 'entity-list' && (
          <EntityList
            entities={mockEntities}
            selectedEntityId={selectedEntityId}
            filter={filter}
            searchQuery={searchQuery}
            onSelectEntity={handleSelectEntity}
            onFilterChange={setFilter}
            onSearchChange={setSearchQuery}
          />
        )}

        {/* Conversation */}
        {mobileView === 'conversation' && selectedEntity && (
          <div className="h-full relative">
            <ConversationView
              entity={selectedEntity}
              session={activeSession}
              messages={messages}
              onBack={handleBack}
              onOpenSessionSidebar={() => setShowSessionSidebar(true)}
              onOpenDetails={handleOpenDetails}
              onSendMessage={handleSendMessage}
              sessionCount={sessions.length}
            />

            {/* Session sidebar overlay */}
            {showSessionSidebar && (
              <>
                <div
                  className="absolute inset-0 z-40"
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                  onClick={() => setShowSessionSidebar(false)}
                />
                <div
                  className="absolute top-0 left-0 bottom-0 z-50"
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
            )}
          </div>
        )}

        {/* Details */}
        {mobileView === 'details' && entityDetail && (
          <div className="h-full">
            <EntityDetails
              entity={entityDetail}
              onClose={handleCloseDetails}
            />
          </div>
        )}
      </div>
    )
  }

  // ── Desktop Layout ──
  return (
    <div className="h-dvh w-full flex" style={{ background: 'var(--cp-bg)', position: 'relative', zIndex: 1 }}>
      {/* Panel A: Entity List */}
      <div
        className="flex-shrink-0 h-full"
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

      {/* Session sidebar (desktop: collapsible left of conversation) */}
      {showSessionSidebar && sessions.length > 1 && (
        <div
          className="flex-shrink-0 h-full"
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
      )}

      {/* Panel B: Conversation View */}
      <div className="flex-1 h-full min-w-0">
        {selectedEntity ? (
          <ConversationView
            entity={selectedEntity}
            session={activeSession}
            messages={messages}
            onBack={handleBack}
            onOpenSessionSidebar={() =>
              setShowSessionSidebar((v) => !v)
            }
            onOpenDetails={handleOpenDetails}
            onSendMessage={handleSendMessage}
            sessionCount={sessions.length}
          />
        ) : (
          <EmptyConversation />
        )}
      </div>

      {/* Panel C: Details */}
      {showDetails && entityDetail && (
        <div
          className="flex-shrink-0 h-full"
          style={{
            width: 320,
            borderLeft: '1px solid var(--cp-border)',
          }}
        >
          <EntityDetails
            entity={entityDetail}
            onClose={handleCloseDetails}
          />
        </div>
      )}
    </div>
  )
}

function EmptyConversation() {
  const { t } = useI18n()
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-3"
      style={{ color: 'var(--cp-muted)' }}
    >
      <MessageSquare size={48} strokeWidth={1.2} />
      <p className="text-sm">
        {t('messagehub.selectConversation', 'Select a conversation to start')}
      </p>
    </div>
  )
}
