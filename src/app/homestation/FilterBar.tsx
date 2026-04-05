import {
  Eye,
  FileText,
  Globe,
  Image,
  LayoutGrid,
  MonitorPlay,
  Newspaper,
  Users,
  Video,
} from 'lucide-react'
import type { FeedFilter, ReadingMode, Topic } from './types'

const filterOptions: { id: FeedFilter; labelKey: string; fallback: string; icon: React.ReactNode }[] = [
  { id: 'all', labelKey: 'homestation.filterAll', fallback: 'All', icon: <Globe size={14} /> },
  { id: 'following', labelKey: 'homestation.filterFollowing', fallback: 'Following', icon: <Users size={14} /> },
  { id: 'news', labelKey: 'homestation.filterNews', fallback: 'News', icon: <Newspaper size={14} /> },
  { id: 'images', labelKey: 'homestation.filterImages', fallback: 'Images', icon: <Image size={14} /> },
  { id: 'videos', labelKey: 'homestation.filterVideos', fallback: 'Videos', icon: <Video size={14} /> },
  { id: 'longform', labelKey: 'homestation.filterLongform', fallback: 'Long-form', icon: <FileText size={14} /> },
]

const readingModeOptions: { id: ReadingMode; labelKey: string; fallback: string; icon: React.ReactNode }[] = [
  { id: 'standard', labelKey: 'homestation.modeStandard', fallback: 'Standard', icon: <LayoutGrid size={14} /> },
  { id: 'image', labelKey: 'homestation.modeImage', fallback: 'Image', icon: <Image size={14} /> },
  { id: 'longform', labelKey: 'homestation.modeLongform', fallback: 'Longform', icon: <FileText size={14} /> },
  { id: 'immersive-video', labelKey: 'homestation.modeVideo', fallback: 'Video', icon: <MonitorPlay size={14} /> },
]

interface FilterBarProps {
  activeFilter: FeedFilter
  activeTopicId: string | null
  readingMode: ReadingMode
  topics: Topic[]
  t: (key: string, fallback: string) => string
  onFilterChange: (filter: FeedFilter) => void
  onTopicSelect: (topicId: string | null) => void
  onReadingModeChange: (mode: ReadingMode) => void
}

export function FilterBar({
  activeFilter,
  activeTopicId,
  readingMode,
  topics,
  t,
  onFilterChange,
  onTopicSelect,
  onReadingModeChange,
}: FilterBarProps) {
  const subscribedTopics = topics.filter((tp) => tp.isSubscribed)

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto px-4 py-2"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Filter chips */}
      {filterOptions.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => {
            onFilterChange(opt.id)
            onTopicSelect(null)
          }}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: activeFilter === opt.id && !activeTopicId
              ? 'var(--cp-accent)'
              : 'color-mix(in srgb, var(--cp-text) 8%, transparent)',
            color: activeFilter === opt.id && !activeTopicId
              ? 'white'
              : 'var(--cp-text)',
          }}
        >
          {opt.icon}
          {t(opt.labelKey, opt.fallback)}
        </button>
      ))}

      {/* Topic chips */}
      {subscribedTopics.map((topic) => (
        <button
          key={topic.id}
          type="button"
          onClick={() => {
            onTopicSelect(activeTopicId === topic.id ? null : topic.id)
            onFilterChange('all')
          }}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: activeTopicId === topic.id
              ? 'var(--cp-accent)'
              : 'color-mix(in srgb, var(--cp-text) 8%, transparent)',
            color: activeTopicId === topic.id
              ? 'white'
              : 'var(--cp-text)',
          }}
        >
          {topic.name}
        </button>
      ))}

      {/* Separator */}
      <div
        className="mx-1 h-5 w-px flex-shrink-0"
        style={{ background: 'var(--cp-border)' }}
      />

      {/* Reading mode toggle */}
      <div className="flex flex-shrink-0 items-center gap-1 rounded-full p-0.5" style={{ background: 'color-mix(in srgb, var(--cp-text) 6%, transparent)' }}>
        {readingModeOptions.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onReadingModeChange(mode.id)}
            className="flex items-center justify-center rounded-full p-1.5 transition-colors"
            style={{
              background: readingMode === mode.id
                ? 'color-mix(in srgb, var(--cp-accent) 18%, transparent)'
                : 'transparent',
              color: readingMode === mode.id
                ? 'var(--cp-accent)'
                : 'var(--cp-muted)',
            }}
            title={t(mode.labelKey, mode.fallback)}
          >
            {mode.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
