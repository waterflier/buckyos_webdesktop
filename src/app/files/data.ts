import type { IEntity, IExtraInfo, IParsedEntity } from '@svar-ui/react-filemanager'
import type { LayoutItem, LayoutState } from '../../models/ui'

export interface FilesEntity extends IEntity {
  owner?: string
  scope?: string
  note?: string
  accent?: string
}

function formatPageItemName(item: LayoutItem) {
  if (item.type === 'app') {
    return `${item.appId}.app`
  }

  return `${item.widgetType}-${item.id}.widget.json`
}

function createDesktopLayoutItems(layoutState?: LayoutState): FilesEntity[] {
  if (!layoutState) {
    return []
  }

  const items: FilesEntity[] = [
    {
      id: '/Desktop/Pages',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 3, 1, 9, 10),
      owner: 'shell',
      scope: layoutState.formFactor,
      note: `Launcher pages for ${layoutState.formFactor}.`,
    },
    {
      id: `/Desktop/Layout/${layoutState.formFactor}-layout.json`,
      type: 'file',
      size: 4_096 + layoutState.pages.length * 512,
      date: new Date(2026, 3, 1, 9, 42),
      owner: 'shell',
      scope: layoutState.formFactor,
      note: 'Serialized launcher layout snapshot.',
    },
  ]

  for (const page of layoutState.pages) {
    items.push({
      id: `/Desktop/Pages/${page.id}`,
      type: 'folder',
      size: 4096,
      date: new Date(2026, 3, 1, 9, 20),
      owner: 'shell',
      scope: layoutState.formFactor,
      note: `Grid items placed on ${page.id}.`,
    })

    for (const item of page.items) {
      items.push({
        id: `/Desktop/Pages/${page.id}/${formatPageItemName(item)}`,
        type: 'file',
        size: item.type === 'app' ? 2048 : 3072,
        date: new Date(2026, 3, 1, 10, 10),
        owner: item.type === 'app' ? 'launcher' : 'widget',
        scope: layoutState.formFactor,
        note:
          item.type === 'app'
            ? `Desktop app icon ${item.appId} placed at ${item.x},${item.y}.`
            : `Widget ${item.widgetType} placed at ${item.x},${item.y}.`,
      })
    }
  }

  return items
}

export function createFilesEntities({
  layoutState,
  locale,
  runtimeContainer,
}: {
  layoutState?: LayoutState
  locale: string
  runtimeContainer?: string
}) {
  const runtimeLabel = runtimeContainer ?? 'browser'
  const desktopLayoutItems = createDesktopLayoutItems(layoutState)

  return [
    {
      id: '/Desktop',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 2, 28, 8, 0),
      owner: 'system',
      scope: 'workspace',
      note: 'Launcher-facing files and shortcuts.',
    },
    {
      id: '/Documents',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 2, 27, 14, 20),
      owner: 'user',
      scope: 'workspace',
      note: 'Editable documents and review notes.',
    },
    {
      id: '/Projects',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 2, 26, 10, 30),
      owner: 'user',
      scope: 'workspace',
      note: 'Source trees and app SDK experiments.',
    },
    {
      id: '/Shared',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 2, 25, 12, 8),
      owner: 'team',
      scope: 'workspace',
      note: 'Review handoff and synced assets.',
    },
    {
      id: '/Media',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 2, 24, 17, 16),
      owner: 'design',
      scope: 'workspace',
      note: 'Wallpapers, previews, and exported visuals.',
    },
    {
      id: '/Desktop/Layout',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 3, 1, 9, 2),
      owner: 'shell',
      scope: layoutState?.formFactor ?? 'desktop',
      note: 'Persisted shell state grouped by form factor.',
    },
    ...desktopLayoutItems,
    {
      id: '/Desktop/Apps',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 2, 28, 8, 4),
      owner: 'system',
      scope: 'workspace',
      note: 'Installed app shortcuts.',
    },
    {
      id: '/Desktop/Apps/Files.app',
      type: 'file',
      size: 3072,
      date: new Date(2026, 3, 3, 10, 8),
      owner: 'system',
      scope: 'workspace',
      note: 'Managed window entry for Files.',
    },
    {
      id: '/Desktop/Apps/MessageHub.app',
      type: 'file',
      size: 3072,
      date: new Date(2026, 3, 2, 19, 10),
      owner: 'system',
      scope: 'workspace',
      note: 'Managed window entry for MessageHub.',
    },
    {
      id: '/Documents/BuckyOS_Web_Desktop_App_SDK_Minimal.md',
      type: 'file',
      size: 15_072,
      date: new Date(2026, 3, 3, 8, 45),
      owner: 'docs',
      scope: 'workspace',
      note: 'Reference for app view, panel adapter, and route adapter layering.',
    },
    {
      id: '/Documents/layout-scope-audit.txt',
      type: 'file',
      size: 1824,
      date: new Date(2026, 3, 3, 9, 18),
      owner: 'qa',
      scope: layoutState?.formFactor ?? 'desktop',
      note: `Current locale ${locale}. Runtime ${runtimeLabel}.`,
    },
    {
      id: '/Documents/release-checklist.todo',
      type: 'file',
      size: 812,
      date: new Date(2026, 3, 2, 16, 12),
      owner: 'pm',
      scope: 'workspace',
      note: 'Preflight checklist for launcher and window QA.',
    },
    {
      id: '/Projects/BuckyOS Web Desktop',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 2, 29, 11, 8),
      owner: 'engineering',
      scope: 'workspace',
      note: 'Web desktop prototype source tree.',
    },
    {
      id: '/Projects/BuckyOS Web Desktop/src',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 2, 29, 11, 10),
      owner: 'engineering',
      scope: 'workspace',
      note: 'Application source files.',
    },
    {
      id: '/Projects/BuckyOS Web Desktop/src/app',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 2, 29, 11, 12),
      owner: 'engineering',
      scope: 'workspace',
      note: 'Managed shell applications.',
    },
    {
      id: '/Projects/BuckyOS Web Desktop/src/app/files',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 3, 3, 10, 12),
      owner: 'engineering',
      scope: 'workspace',
      note: 'Files app view and adapters.',
    },
    {
      id: '/Projects/BuckyOS Web Desktop/src/app/files/FilesView.tsx',
      type: 'file',
      size: 12_288,
      date: new Date(2026, 3, 3, 10, 15),
      owner: 'engineering',
      scope: 'workspace',
      note: 'Business view reusable in desktop and route hosts.',
    },
    {
      id: '/Projects/BuckyOS Web Desktop/src/app/files/FilesRoute.tsx',
      type: 'file',
      size: 4096,
      date: new Date(2026, 3, 3, 10, 16),
      owner: 'engineering',
      scope: 'workspace',
      note: 'Standalone route adapter.',
    },
    {
      id: '/Shared/Review Queue',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 3, 2, 7, 54),
      owner: 'team',
      scope: 'workspace',
      note: 'Shared review artifacts.',
    },
    {
      id: '/Shared/Review Queue/files-window-acceptance.md',
      type: 'file',
      size: 2816,
      date: new Date(2026, 3, 3, 11, 5),
      owner: 'qa',
      scope: 'workspace',
      note: 'Checks standalone route and desktop window embedding.',
    },
    {
      id: '/Media/Desktop',
      type: 'folder',
      size: 4096,
      date: new Date(2026, 2, 24, 17, 20),
      owner: 'design',
      scope: 'workspace',
      note: 'Desktop wallpaper exports.',
    },
    {
      id: '/Media/Desktop/appicon-files.svg',
      type: 'file',
      size: 1688,
      date: new Date(2026, 3, 1, 13, 22),
      owner: 'design',
      scope: 'workspace',
      note: 'Files launcher icon export.',
    },
    {
      id: '/Media/Desktop/wallpaper-panorama.webp',
      type: 'file',
      size: 388_120,
      date: new Date(2026, 3, 1, 13, 30),
      owner: 'design',
      scope: 'workspace',
      note: 'Panoramic shell backdrop.',
    },
  ] satisfies FilesEntity[]
}

function serializeSvg(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function resolveAccent(entity: FilePreviewSeed) {
  if (entity.type === 'folder') {
    return {
      primary: entity.accent ?? '#5f67e8',
      secondary: '#d7defc',
      label: 'DIR',
    }
  }

  const extension = entity.ext?.toUpperCase()

  if (extension === 'MD' || extension === 'TXT') {
    return {
      primary: '#3d84c6',
      secondary: '#d8edf9',
      label: extension,
    }
  }

  if (extension === 'JSON' || extension === 'TODO') {
    return {
      primary: '#b67a2c',
      secondary: '#f4e5cc',
      label: extension,
    }
  }

  if (extension === 'SVG' || extension === 'WEBP' || extension === 'PNG') {
    return {
      primary: '#3e9b79',
      secondary: '#d7efe5',
      label: extension,
    }
  }

  return {
    primary: '#6c6f88',
    secondary: '#e6e7ef',
    label: extension ?? 'FILE',
  }
}

type FilePreviewSeed = IParsedEntity & {
  accent?: string
}

export function createFilePreview(entity: FilePreviewSeed, width: number, height: number) {
  const palette = resolveAccent(entity)
  const safeWidth = Math.max(width, 160)
  const safeHeight = Math.max(height, 120)
  const label = entity.type === 'folder' ? entity.name : palette.label
  const title = entity.name.length > 18 ? `${entity.name.slice(0, 16)}…` : entity.name
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.secondary}" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="${safeWidth}" height="${safeHeight}" rx="18" fill="url(#bg)" />
      <rect x="16" y="18" width="${safeWidth - 32}" height="${safeHeight - 36}" rx="16" fill="rgba(255,255,255,0.72)" />
      <rect x="28" y="32" width="78" height="28" rx="14" fill="${palette.primary}" opacity="0.92" />
      <text x="67" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#ffffff">${label}</text>
      <text x="28" y="${safeHeight - 42}" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#24283b">${title}</text>
      <text x="28" y="${safeHeight - 18}" font-family="Arial, sans-serif" font-size="12" fill="#69708a">${entity.parent}</text>
    </svg>
  `

  return serializeSvg(svg)
}

export function createExtraInfo(file: IParsedEntity): IExtraInfo {
  const entity = file as IParsedEntity & FilesEntity

  return {
    Size: entity.type === 'folder' ? '--' : String(entity.size ?? 0),
    Type: entity.type === 'folder' ? 'Folder' : 'File',
    Location: entity.parent,
    Scope: entity.scope ?? 'workspace',
    Owner: entity.owner ?? 'user',
    Count: entity.type === 'folder' ? String(entity.data?.length ?? 0) : '1',
    Note: entity.note ?? 'No extra note.',
  }
}
