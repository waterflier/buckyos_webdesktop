import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMediaQuery } from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  Hash,
  PenSquare,
  Rss,
  Search,
  X,
} from 'lucide-react'
import { useI18n } from '../../i18n/provider'
import { FeedList } from './FeedList'
import { FilterBar } from './FilterBar'
import { SidebarPanel } from './SidebarPanel'
import { InfoPanel } from './InfoPanel'
import { ImmersiveVideoMode } from './ImmersiveVideoMode'
import { PublicProfileView } from './PublicProfileView'
import { ArticleDetail } from './detail/ArticleDetail'
import { ImageDetail } from './detail/ImageDetail'
import { VideoDetail } from './detail/VideoDetail'
import { QuickPublishComposer } from './publish/QuickPublishComposer'
import { SourceManager } from './source/SourceManager'
import {
  filterFeedObjects,
  mockFeedObjects,
  mockSources,
  mockTopics,
  mockUserProfile,
} from './mock/data'
import {
  INFO_PANEL_DEFAULT_WIDTH,
  INFO_PANEL_MAX_WIDTH,
  INFO_PANEL_MIN_WIDTH,
  PANEL_SPLITTER_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from './layout'
import type {
  FeedFilter,
  FeedObject,
  MobileView,
  ReadingMode,
  ViewPerspective,
} from './types'

export function HomeStationView() {
  const { t } = useI18n()
  const isDesktop = useMediaQuery('(min-width: 769px)')

  /* ── Core State ��─ */
  const [perspective, setPerspective] = useState<ViewPerspective>('owner')
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all')
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null)
  const [readingMode, setReadingMode] = useState<ReadingMode>('standard')
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  /* ── Feed State (mutable for interactions) ── */
  const [feedObjects, setFeedObjects] = useState<FeedObject[]>(() => [...mockFeedObjects])

  /* ── Mobile State ── */
  const [mobileView, setMobileView] = useState<MobileView>('feed')

  /* ── Desktop Panel State ���─ */
  const [showSidebar, setShowSidebar] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showInfoPanel, setShowInfoPanel] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH)
  const [infoPanelWidth, setInfoPanelWidth] = useState(INFO_PANEL_DEFAULT_WIDTH)
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const [isResizingInfoPanel, setIsResizingInfoPanel] = useState(false)

  /* ── Refs ── */
  const desktopLayoutRef = useRef<HTMLDivElement>(null)
  const sidebarWidthRef = useRef(SIDEBAR_DEFAULT_WIDTH)
  const infoPanelWidthRef = useRef(INFO_PANEL_DEFAULT_WIDTH)
  const sidebarResizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const infoPanelResizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)

  /* ── Derived Data ── */
  const filteredFeeds = useMemo(
    () => filterFeedObjects(feedObjects, activeFilter, activeTopicId),
    [feedObjects, activeFilter, activeTopicId],
  )

  const selectedFeed = useMemo(
    () => (selectedFeedId ? feedObjects.find((f) => f.id === selectedFeedId) ?? null : null),
    [selectedFeedId, feedObjects],
  )

  /* ── Clamp Helpers ── */
  const clampSidebarWidth = useCallback(
    (w: number) => Math.min(Math.max(w, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH), [],
  )
  const clampInfoPanelWidth = useCallback(
    (w: number) => Math.min(Math.max(w, INFO_PANEL_MIN_WIDTH), INFO_PANEL_MAX_WIDTH), [],
  )

  /* ── Sync refs ── */
  useEffect(() => { sidebarWidthRef.current = sidebarWidth }, [sidebarWidth])
  useEffect(() => { infoPanelWidthRef.current = infoPanelWidth }, [infoPanelWidth])

  useEffect(() => {
    const el = desktopLayoutRef.current
    if (!isDesktop || !el) return

    const ro = new ResizeObserver(() => {
      setSidebarWidth((prev) => clampSidebarWidth(prev))
      setInfoPanelWidth((prev) => clampInfoPanelWidth(prev))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [clampSidebarWidth, clampInfoPanelWidth, isDesktop])

  /* ── Interaction Handlers ── */
  const handleToggleLike = useCallback((id: string) => {
    setFeedObjects((prev) =>
      prev.map((f) =>
        f.id !== id
          ? f
          : {
            ...f,
            interactions: {
              ...f.interactions,
              isLiked: !f.interactions.isLiked,
              likeCount: f.interactions.likeCount + (f.interactions.isLiked ? -1 : 1),
            },
          },
      ),
    )
  }, [])

  const handleToggleBookmark = useCallback((id: string) => {
    setFeedObjects((prev) =>
      prev.map((f) =>
        f.id !== id
          ? f
          : {
            ...f,
            interactions: {
              ...f.interactions,
              isBookmarked: !f.interactions.isBookmarked,
            },
          },
      ),
    )
  }, [])

  const handleRepost = useCallback((id: string) => {
    setFeedObjects((prev) =>
      prev.map((f) =>
        f.id !== id
          ? f
          : {
            ...f,
            interactions: {
              ...f.interactions,
              isReposted: !f.interactions.isReposted,
              repostCount: f.interactions.repostCount + (f.interactions.isReposted ? -1 : 1),
            },
          },
      ),
    )
  }, [])

  const handleSelectFeed = useCallback((id: string) => {
    setSelectedFeedId(id)
    if (!isDesktop) setMobileView('detail')
  }, [isDesktop])

  const handleBack = useCallback(() => {
    setSelectedFeedId(null)
    setMobileView('feed')
  }, [])

  const handlePublish = useCallback((text: string) => {
    const newFeed: FeedObject = {
      id: `feed-new-${Date.now()}`,
      author: { id: mockUserProfile.id, name: mockUserProfile.name, sourceType: 'did', isVerified: true },
      contentType: 'text',
      text,
      media: [],
      topics: [],
      interactions: { likeCount: 0, commentCount: 0, repostCount: 0, isLiked: false, isBookmarked: false, isReposted: false },
      createdAt: Date.now(),
      sourceId: 'self',
    }
    setFeedObjects((prev) => [newFeed, ...prev])
    if (!isDesktop) {
      setMobileView('feed')
    }
  }, [isDesktop])

  const handleReadingModeChange = useCallback((mode: ReadingMode) => {
    if (mode === 'immersive-video') {
      if (!isDesktop) setMobileView('immersive')
      else setReadingMode(mode)
    }
    setReadingMode(mode)
  }, [isDesktop])

  /* ── Sidebar Splitter ── */
  const handleSidebarSplitterPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (isSidebarCollapsed) return
    sidebarResizeRef.current = { pointerId: e.pointerId, startX: e.clientX, startWidth: sidebarWidthRef.current }
    setIsResizingSidebar(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [isSidebarCollapsed])

  const handleSidebarSplitterPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!sidebarResizeRef.current || sidebarResizeRef.current.pointerId !== e.pointerId) return
    const next = clampSidebarWidth(sidebarResizeRef.current.startWidth + (e.clientX - sidebarResizeRef.current.startX))
    sidebarWidthRef.current = next
    setSidebarWidth(next)
  }, [clampSidebarWidth])

  const handleSidebarSplitterPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!sidebarResizeRef.current || sidebarResizeRef.current.pointerId !== e.pointerId) return
    sidebarResizeRef.current = null
    setIsResizingSidebar(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  /* ── Info Panel Splitter ── */
  const handleInfoPanelSplitterPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    infoPanelResizeRef.current = { pointerId: e.pointerId, startX: e.clientX, startWidth: infoPanelWidthRef.current }
    setIsResizingInfoPanel(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [])

  const handleInfoPanelSplitterPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!infoPanelResizeRef.current || infoPanelResizeRef.current.pointerId !== e.pointerId) return
    const next = clampInfoPanelWidth(infoPanelResizeRef.current.startWidth - (e.clientX - infoPanelResizeRef.current.startX))
    infoPanelWidthRef.current = next
    setInfoPanelWidth(next)
  }, [clampInfoPanelWidth])

  const handleInfoPanelSplitterPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!infoPanelResizeRef.current || infoPanelResizeRef.current.pointerId !== e.pointerId) return
    infoPanelResizeRef.current = null
    setIsResizingInfoPanel(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  /* ── Immersive overlay ── */
  if (readingMode === 'immersive-video' && isDesktop) {
    const videoFeeds = feedObjects.filter(
      (f) => f.contentType === 'video' || f.media.some((m) => m.type === 'video'),
    )
    return (
      <ImmersiveVideoMode
        feeds={videoFeeds.length > 0 ? videoFeeds : feedObjects}
        t={t}
        onToggleLike={handleToggleLike}
        onToggleBookmark={handleToggleBookmark}
        onRepost={handleRepost}
        onClose={() => setReadingMode('standard')}
      />
    )
  }

  /* ── Mobile Layout ── */
  if (!isDesktop) {
    return (
      <div className="relative flex h-full w-full flex-col" style={{ background: 'var(--cp-bg)' }}>
        {/* Immersive mode overlay */}
        {mobileView === 'immersive' ? (
          <ImmersiveVideoMode
            feeds={feedObjects.filter(
              (f) => f.contentType === 'video' || f.media.some((m) => m.type === 'video'),
            )}
            t={t}
            onToggleLike={handleToggleLike}
            onToggleBookmark={handleToggleBookmark}
            onRepost={handleRepost}
            onClose={() => { setMobileView('feed'); setReadingMode('standard') }}
          />
        ) : null}

        {/* Detail view */}
        {mobileView === 'detail' && selectedFeed ? (
          <div className="h-full">
            {selectedFeed.contentType === 'article' && selectedFeed.body ? (
              <ArticleDetail feed={selectedFeed} t={t} onBack={handleBack} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} />
            ) : selectedFeed.media.some((m) => m.type === 'video') ? (
              <VideoDetail feed={selectedFeed} t={t} onBack={handleBack} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} />
            ) : selectedFeed.media.some((m) => m.type === 'image') ? (
              <ImageDetail feed={selectedFeed} t={t} onBack={handleBack} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} />
            ) : (
              <ArticleDetail feed={selectedFeed} t={t} onBack={handleBack} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} />
            )}
          </div>
        ) : null}

        {/* Profile view */}
        {mobileView === 'profile' ? (
          <div className="flex h-full flex-col">
            {/* Back header */}
            <div className="flex items-center gap-2 px-2 py-2" style={{ borderBottom: '1px solid var(--cp-border)' }}>
              <button
                type="button"
                onClick={() => { setMobileView('feed'); setPerspective('owner') }}
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ color: 'var(--cp-text)' }}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                {t('homestation.profile', 'Profile')}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PublicProfileView
                profile={mockUserProfile}
                feeds={feedObjects.filter((f) => f.author.id === mockUserProfile.id)}
                t={t}
                onSelectFeed={handleSelectFeed}
                onToggleLike={handleToggleLike}
                onToggleBookmark={handleToggleBookmark}
                onRepost={handleRepost}
              />
              {/* Sources entry */}
              <div className="px-4 pb-6">
                <button
                  type="button"
                  onClick={() => setMobileView('sources')}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'color-mix(in srgb, var(--cp-text) 5%, transparent)' }}
                >
                  <Rss size={18} style={{ color: 'var(--cp-accent)' }} />
                  <span className="flex-1 text-left text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                    {t('homestation.manageSources', 'Manage Sources')}
                  </span>
                  <ChevronRight size={16} style={{ color: 'var(--cp-muted)' }} />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Publish view */}
        {mobileView === 'publish' ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 px-2 py-2" style={{ borderBottom: '1px solid var(--cp-border)' }}>
              <button type="button" onClick={() => setMobileView('feed')} className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: 'var(--cp-text)' }}>
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>{t('homestation.tabPublish', 'Publish')}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuickPublishComposer t={t} onPublish={handlePublish} />
            </div>
          </div>
        ) : null}

        {/* Sources view */}
        {mobileView === 'sources' ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 px-2 py-2" style={{ borderBottom: '1px solid var(--cp-border)' }}>
              <button type="button" onClick={() => { setMobileView('profile'); setPerspective('visitor') }} className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: 'var(--cp-text)' }}>
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>{t('homestation.tabSources', 'Sources')}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SourceManager sources={mockSources} t={t} />
            </div>
          </div>
        ) : null}

        {/* Feed view (default) */}
        {mobileView === 'feed' ? (
          <>
            {/* Top bar: avatar + name + search */}
            <div className="flex items-center gap-3 px-4 py-2" style={{ borderBottom: '1px solid var(--cp-border)' }}>
              <button
                type="button"
                onClick={() => { setPerspective('visitor'); setMobileView('profile') }}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--cp-accent) 15%, transparent)',
                  color: 'var(--cp-accent)',
                }}
              >
                {mockUserProfile.name.charAt(0)}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>{mockUserProfile.name}</p>
                <p className="truncate text-[11px]" style={{ color: 'var(--cp-muted)' }}>
                  {mockUserProfile.bio ?? t('homestation.title', 'HomeStation')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSearch((v) => !v)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ color: 'var(--cp-muted)', background: 'color-mix(in srgb, var(--cp-text) 7%, transparent)' }}
              >
                <Search size={18} />
              </button>
            </div>

            {/* Search panel with Topics (conditional) */}
            {showSearch ? (
              <div style={{ borderBottom: '1px solid var(--cp-border)' }}>
                <div className="flex items-center gap-2 px-4 py-2">
                  <Search size={16} style={{ color: 'var(--cp-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('homestation.searchPlaceholder', 'Search feeds...')}
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--cp-text)' }}
                    autoFocus
                  />
                  <button type="button" onClick={() => { setShowSearch(false); setSearchQuery('') }} style={{ color: 'var(--cp-muted)' }}>
                    <X size={16} />
                  </button>
                </div>
                {/* Topics list */}
                <div className="flex flex-wrap gap-2 px-4 pb-3 pt-1">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--cp-muted)', lineHeight: '28px' }}>
                    {t('homestation.topics', 'Topics')}:
                  </span>
                  {mockTopics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        setActiveTopicId(activeTopicId === topic.id ? null : topic.id)
                        setActiveFilter('all')
                        setShowSearch(false)
                        setSearchQuery('')
                      }}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                      style={{
                        background: activeTopicId === topic.id
                          ? 'var(--cp-accent)'
                          : 'color-mix(in srgb, var(--cp-text) 8%, transparent)',
                        color: activeTopicId === topic.id ? 'white' : 'var(--cp-text)',
                      }}
                    >
                      <Hash size={12} />
                      {topic.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Feed list with filter bar (scrolls together) */}
            <div className="flex-1 overflow-y-auto">
              <FilterBar
                activeFilter={activeFilter}
                activeTopicId={activeTopicId}
                readingMode={readingMode}
                topics={mockTopics}
                t={t}
                onFilterChange={setActiveFilter}
                onTopicSelect={setActiveTopicId}
                onReadingModeChange={handleReadingModeChange}
                isMobile
              />
              <FeedList
                feeds={filteredFeeds}
                readingMode={readingMode}
                t={t}
                onSelectFeed={handleSelectFeed}
                onToggleLike={handleToggleLike}
                onToggleBookmark={handleToggleBookmark}
                onRepost={handleRepost}
                scrollable={false}
              />
            </div>

            {/* FAB */}
            <button
              type="button"
              onClick={() => setMobileView('publish')}
              className="absolute z-20 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
              style={{
                right: 16,
                bottom: 16,
                background: 'var(--cp-accent)',
                color: 'white',
              }}
            >
              <PenSquare size={22} />
            </button>
          </>
        ) : null}

      </div>
    )
  }

  /* ── Desktop Layout ── */
  return (
    <div
      ref={desktopLayoutRef}
      className="flex h-full w-full"
      style={{
        background: 'var(--cp-bg)',
        zIndex: 1,
        cursor: isResizingSidebar || isResizingInfoPanel ? 'col-resize' : 'default',
      }}
    >
      {/* Left sidebar */}
      {showSidebar ? (
        <div
          className="h-full flex-shrink-0"
          style={{
            width: isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth,
            minWidth: isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MIN_WIDTH,
            maxWidth: isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MAX_WIDTH,
            borderRight: '1px solid var(--cp-border)',
            background: 'var(--cp-surface)',
            transition: isResizingSidebar ? 'none' : 'width 220ms var(--cp-ease-emphasis)',
          }}
        >
          {isSidebarCollapsed ? (
            <div
              className="flex h-full flex-col items-center gap-3 px-2 py-4"
              style={{
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--cp-surface) 96%, transparent), color-mix(in srgb, var(--cp-surface-2) 94%, transparent))',
              }}
            >
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ color: 'var(--cp-accent)', background: 'color-mix(in srgb, var(--cp-accent) 12%, transparent)' }}
                title={t('homestation.expandSidebar', 'Expand sidebar')}
              >
                <ChevronRight size={18} />
              </button>
              <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--cp-muted)' }}>
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                  {t('homestation.title', 'HomeStation')}
                </span>
              </div>
            </div>
          ) : (
            <SidebarPanel
              profile={mockUserProfile}
              topics={mockTopics}
              sources={mockSources}
              activeTopicId={activeTopicId}
              t={t}
              onSelectTopic={(id) => { setActiveTopicId(id); setActiveFilter('all') }}
              onViewProfile={() => setPerspective(perspective === 'visitor' ? 'owner' : 'visitor')}
              headerActions={
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ color: 'var(--cp-muted)', background: 'color-mix(in srgb, var(--cp-text) 7%, transparent)' }}
                  title={t('homestation.collapseSidebar', 'Collapse sidebar')}
                >
                  <ChevronLeft size={18} />
                </button>
              }
            />
          )}
        </div>
      ) : null}

      {/* Sidebar splitter */}
      {showSidebar ? (
        <button
          type="button"
          disabled={isSidebarCollapsed}
          className="group relative h-full flex-shrink-0"
          onPointerDown={handleSidebarSplitterPointerDown}
          onPointerMove={handleSidebarSplitterPointerMove}
          onPointerUp={handleSidebarSplitterPointerUp}
          onPointerCancel={handleSidebarSplitterPointerUp}
          aria-hidden={isSidebarCollapsed}
          tabIndex={isSidebarCollapsed ? -1 : 0}
          title={t('homestation.resizeSidebar', 'Resize sidebar')}
          style={{
            width: PANEL_SPLITTER_WIDTH,
            marginLeft: -(PANEL_SPLITTER_WIDTH / 2),
            marginRight: -(PANEL_SPLITTER_WIDTH / 2),
            cursor: isSidebarCollapsed ? 'default' : 'col-resize',
            background: isResizingSidebar ? 'color-mix(in srgb, var(--cp-accent) 8%, transparent)' : 'transparent',
            zIndex: 10,
            touchAction: 'none',
          }}
        >
          <span
            className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-150"
            style={{
              width: isResizingSidebar ? 3 : 1,
              top: 18,
              bottom: 18,
              background: isResizingSidebar ? 'var(--cp-accent)' : 'color-mix(in srgb, var(--cp-border) 92%, transparent)',
              boxShadow: isResizingSidebar ? '0 0 0 4px color-mix(in srgb, var(--cp-accent) 12%, transparent)' : 'none',
            }}
          />
        </button>
      ) : null}

      {/* Center: Feed column */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Desktop top bar */}
        <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--cp-border)' }}>
          <h1 className="flex-1 text-base font-bold" style={{ color: 'var(--cp-text)' }}>
            {perspective === 'visitor'
              ? t('homestation.publicProfile', 'Public Profile')
              : t('homestation.title', 'HomeStation')}
          </h1>
          <div className="flex items-center gap-1 rounded-xl px-2 py-1" style={{ background: 'color-mix(in srgb, var(--cp-text) 6%, transparent)' }}>
            <Search size={14} style={{ color: 'var(--cp-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('homestation.searchPlaceholder', 'Search feeds...')}
              className="w-48 bg-transparent text-xs outline-none"
              style={{ color: 'var(--cp-text)' }}
            />
          </div>
          {!showSidebar ? (
            <button
              type="button"
              onClick={() => setShowSidebar(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ color: 'var(--cp-muted)', background: 'color-mix(in srgb, var(--cp-text) 7%, transparent)' }}
              title={t('homestation.showSidebar', 'Show sidebar')}
            >
              <ChevronRight size={16} />
            </button>
          ) : null}
          {!showInfoPanel ? (
            <button
              type="button"
              onClick={() => setShowInfoPanel(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ color: 'var(--cp-muted)', background: 'color-mix(in srgb, var(--cp-text) 7%, transparent)' }}
              title={t('homestation.showInfoPanel', 'Show info panel')}
            >
              <ChevronLeft size={16} />
            </button>
          ) : null}
        </div>

        {perspective === 'visitor' ? (
          <div className="flex-1 overflow-y-auto">
            <PublicProfileView
              profile={mockUserProfile}
              feeds={feedObjects.filter((f) => f.author.id === mockUserProfile.id)}
              t={t}
              onSelectFeed={handleSelectFeed}
              onToggleLike={handleToggleLike}
              onToggleBookmark={handleToggleBookmark}
              onRepost={handleRepost}
            />
          </div>
        ) : selectedFeed ? (
          <div className="flex-1 overflow-y-auto">
            {selectedFeed.contentType === 'article' && selectedFeed.body ? (
              <ArticleDetail feed={selectedFeed} t={t} onBack={handleBack} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} />
            ) : selectedFeed.media.some((m) => m.type === 'video') ? (
              <VideoDetail feed={selectedFeed} t={t} onBack={handleBack} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} />
            ) : selectedFeed.media.some((m) => m.type === 'image') ? (
              <ImageDetail feed={selectedFeed} t={t} onBack={handleBack} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} />
            ) : (
              <ArticleDetail feed={selectedFeed} t={t} onBack={handleBack} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} />
            )}
          </div>
        ) : (
          <>
            <FilterBar
              activeFilter={activeFilter}
              activeTopicId={activeTopicId}
              readingMode={readingMode}
              topics={mockTopics}
              t={t}
              onFilterChange={setActiveFilter}
              onTopicSelect={setActiveTopicId}
              onReadingModeChange={handleReadingModeChange}
            />
            <div className="flex-1 overflow-hidden">
              <FeedList
                feeds={filteredFeeds}
                readingMode={readingMode}
                t={t}
                onSelectFeed={handleSelectFeed}
                onToggleLike={handleToggleLike}
                onToggleBookmark={handleToggleBookmark}
                onRepost={handleRepost}
              />
            </div>
          </>
        )}
      </div>

      {/* Info panel splitter */}
      {showInfoPanel ? (
        <button
          type="button"
          className="group relative h-full flex-shrink-0"
          onPointerDown={handleInfoPanelSplitterPointerDown}
          onPointerMove={handleInfoPanelSplitterPointerMove}
          onPointerUp={handleInfoPanelSplitterPointerUp}
          onPointerCancel={handleInfoPanelSplitterPointerUp}
          title={t('homestation.resizeInfoPanel', 'Resize info panel')}
          style={{
            width: PANEL_SPLITTER_WIDTH,
            marginLeft: -(PANEL_SPLITTER_WIDTH / 2),
            marginRight: -(PANEL_SPLITTER_WIDTH / 2),
            cursor: 'col-resize',
            background: isResizingInfoPanel ? 'color-mix(in srgb, var(--cp-accent) 8%, transparent)' : 'transparent',
            zIndex: 10,
            touchAction: 'none',
          }}
        >
          <span
            className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-150"
            style={{
              width: isResizingInfoPanel ? 3 : 1,
              top: 18,
              bottom: 18,
              background: isResizingInfoPanel ? 'var(--cp-accent)' : 'color-mix(in srgb, var(--cp-border) 92%, transparent)',
              boxShadow: isResizingInfoPanel ? '0 0 0 4px color-mix(in srgb, var(--cp-accent) 12%, transparent)' : 'none',
            }}
          />
        </button>
      ) : null}

      {/* Right info panel */}
      {showInfoPanel ? (
        <div
          className="h-full flex-shrink-0"
          style={{
            width: infoPanelWidth,
            minWidth: INFO_PANEL_MIN_WIDTH,
            maxWidth: INFO_PANEL_MAX_WIDTH,
            borderLeft: '1px solid var(--cp-border)',
            background: 'var(--cp-surface)',
            transition: isResizingInfoPanel ? 'none' : 'width 220ms var(--cp-ease-emphasis)',
          }}
        >
          <InfoPanel
            activeFilter={activeFilter}
            activeTopicId={activeTopicId}
            readingMode={readingMode}
            topics={mockTopics}
            t={t}
            onPublish={handlePublish}
            onSelectTopic={(id) => { setActiveTopicId(id); setActiveFilter('all') }}
            onClose={() => setShowInfoPanel(false)}
          />
        </div>
      ) : null}
    </div>
  )
}


/* ── Mobile Topics View ── */

function MobileTopicsView({
  topics,
  activeTopicId,
  t,
  onSelectTopic,
}: {
  topics: { id: string; name: string; feedCount: number; isSubscribed: boolean; trendScore?: number }[]
  activeTopicId: string | null
  t: (key: string, fallback: string) => string
  onSelectTopic: (id: string) => void
}) {
  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-bold" style={{ color: 'var(--cp-text)' }}>
        {t('homestation.topics', 'Topics')}
      </h2>
      <div className="flex flex-col gap-2">
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelectTopic(topic.id)}
            className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
            style={{
              background: activeTopicId === topic.id
                ? 'color-mix(in srgb, var(--cp-accent) 12%, transparent)'
                : 'color-mix(in srgb, var(--cp-text) 5%, transparent)',
              color: 'var(--cp-text)',
            }}
          >
            <div className="flex items-center gap-3">
              <Hash size={18} style={{ color: 'var(--cp-accent)' }} />
              <div className="text-left">
                <span className="text-sm font-semibold">{topic.name}</span>
                <span className="ml-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
                  {topic.feedCount} {t('homestation.feeds', 'feeds')}
                </span>
              </div>
            </div>
            {topic.trendScore && topic.trendScore >= 70 ? (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: 'color-mix(in srgb, var(--cp-danger) 15%, transparent)', color: 'var(--cp-danger)' }}
              >
                {t('homestation.trending', 'Trending')}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
