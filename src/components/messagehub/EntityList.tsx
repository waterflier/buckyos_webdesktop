import { useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  Pin,
  Bot,
  Users,
  User,
  BellOff,
} from 'lucide-react'
import { useI18n } from '../../i18n/provider'
import type { Entity, EntityFilter } from './types'

interface EntityListProps {
  entities: Entity[]
  selectedEntityId: string | null
  filter: EntityFilter
  searchQuery: string
  onSelectEntity: (id: string) => void
  onFilterChange: (filter: EntityFilter) => void
  onSearchChange: (query: string) => void
}

const filters: { key: EntityFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'messagehub.filter.all' },
  { key: 'unread', labelKey: 'messagehub.filter.unread' },
  { key: 'people', labelKey: 'messagehub.filter.people' },
  { key: 'agents', labelKey: 'messagehub.filter.agents' },
  { key: 'groups', labelKey: 'messagehub.filter.groups' },
]

function entityMatchesFilter(entity: Entity, filter: EntityFilter): boolean {
  switch (filter) {
    case 'all': return true
    case 'unread': return entity.unreadCount > 0
    case 'pinned': return !!entity.isPinned
    case 'agents': return entity.type === 'agent'
    case 'groups': return entity.type === 'group'
    case 'people': return entity.type === 'person'
  }
}

function entityMatchesSearch(entity: Entity, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    entity.name.toLowerCase().includes(q) ||
    (entity.lastMessage?.text.toLowerCase().includes(q) ?? false)
  )
}

function EntityAvatar({ entity }: { entity: Entity }) {
  const colors: Record<string, string> = {
    person: 'var(--cp-accent)',
    agent: 'var(--cp-success)',
    group: 'var(--cp-warning)',
    service: 'var(--cp-danger)',
  }
  const icons: Record<string, React.ReactNode> = {
    person: <User size={20} />,
    agent: <Bot size={20} />,
    group: <Users size={20} />,
    service: <SlidersHorizontal size={20} />,
  }

  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center rounded-full"
      style={{
        width: 48,
        height: 48,
        background: `color-mix(in srgb, ${colors[entity.type]} 18%, transparent)`,
        color: colors[entity.type],
      }}
    >
      {icons[entity.type]}
      {entity.isOnline && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2"
          style={{
            width: 12,
            height: 12,
            background: 'var(--cp-success)',
            borderColor: 'var(--cp-surface)',
          }}
        />
      )}
    </div>
  )
}

function formatTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(ts).toLocaleDateString()
}

function EntityItem({
  entity,
  isSelected,
  onSelect,
}: {
  entity: Entity
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="flex items-center gap-3 w-full text-left px-3 py-2.5 transition-colors"
      style={{
        borderRadius: 12,
        background: isSelected
          ? 'color-mix(in srgb, var(--cp-accent) 14%, transparent)'
          : 'transparent',
      }}
    >
      <EntityAvatar entity={entity} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="font-semibold text-sm truncate"
              style={{ color: 'var(--cp-text)' }}
            >
              {entity.name}
            </span>
            {entity.isPinned && (
              <Pin size={12} style={{ color: 'var(--cp-muted)' }} />
            )}
            {entity.isMuted && (
              <BellOff size={12} style={{ color: 'var(--cp-muted)' }} />
            )}
          </div>
          {entity.lastMessage && (
            <span
              className="text-xs flex-shrink-0"
              style={{ color: 'var(--cp-muted)' }}
            >
              {formatTime(entity.lastMessage.timestamp)}
            </span>
          )}
        </div>
        {entity.lastMessage && (
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p
              className="text-xs truncate"
              style={{ color: 'var(--cp-muted)' }}
            >
              {entity.lastMessage.senderName && entity.type !== 'person'
                ? `${entity.lastMessage.senderName}: `
                : ''}
              {entity.lastMessage.text}
            </p>
            {entity.unreadCount > 0 && (
              <span
                className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  background: entity.isMuted
                    ? 'color-mix(in srgb, var(--cp-muted) 30%, transparent)'
                    : 'var(--cp-accent)',
                  color: entity.isMuted ? 'var(--cp-muted)' : '#fff',
                }}
              >
                {entity.unreadCount}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

export function EntityList({
  entities,
  selectedEntityId,
  filter,
  searchQuery,
  onSelectEntity,
  onFilterChange,
  onSearchChange,
}: EntityListProps) {
  const { t } = useI18n()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const filtered = entities
    .filter((e) => entityMatchesFilter(e, filter))
    .filter((e) => entityMatchesSearch(e, searchQuery))

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--cp-surface)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1
          className="text-lg font-bold mb-3"
          style={{ color: 'var(--cp-text)' }}
        >
          {t('messagehub.title', 'MessageHub')}
        </h1>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--cp-text) 6%, transparent)',
          }}
        >
          <Search size={16} style={{ color: 'var(--cp-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('messagehub.search', 'Search...')}
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--cp-text)' }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              background:
                filter === f.key
                  ? 'var(--cp-accent)'
                  : 'color-mix(in srgb, var(--cp-text) 8%, transparent)',
              color: filter === f.key ? '#fff' : 'var(--cp-muted)',
            }}
          >
            {t(f.labelKey, f.key)}
          </button>
        ))}
      </div>

      {/* Entity List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 shell-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
              {t('messagehub.noResults', 'No conversations found')}
            </p>
          </div>
        ) : (
          filtered.map((entity) => (
            <div key={entity.id}>
              <EntityItem
                entity={entity}
                isSelected={selectedEntityId === entity.id}
                onSelect={() => {
                  onSelectEntity(entity.id)
                  if (entity.children?.length) toggleGroup(entity.id)
                }}
              />
              {/* Sub-entities (inline expand) */}
              {entity.children &&
                expandedGroups.has(entity.id) &&
                entity.children.map((child) => (
                  <div key={child.id} className="pl-6">
                    <EntityItem
                      entity={child}
                      isSelected={selectedEntityId === child.id}
                      onSelect={() => onSelectEntity(child.id)}
                    />
                  </div>
                ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
