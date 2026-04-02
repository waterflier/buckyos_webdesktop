import clsx from 'clsx'
import {
  BookOpen,
  Clock3,
  FolderOpen,
  LayoutGrid,
  Settings,
  SlidersHorizontal,
  StickyNote,
  Store,
  Wrench,
} from 'lucide-react'
import type { AppDefinition } from '../../models/ui'
import { panelToneClasses } from './DesktopVisualTokens'

const iconMap = {
  settings: Settings,
  files: FolderOpen,
  studio: Wrench,
  market: Store,
  diagnostics: LayoutGrid,
  demos: SlidersHorizontal,
  docs: BookOpen,
  clock: Clock3,
  notepad: StickyNote,
}

export function TierBadge({ tier }: { tier: AppDefinition['tier'] }) {
  const tone: keyof typeof panelToneClasses =
    tier === 'system' ? 'accent' : tier === 'sdk' ? 'success' : 'warning'

  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
        panelToneClasses[tone],
      )}
    >
      {tier}
    </span>
  )
}

export function AppIcon({
  iconKey,
  className,
}: {
  iconKey: string
  className?: string
}) {
  const Icon = iconMap[iconKey as keyof typeof iconMap] ?? LayoutGrid
  return (
    <Icon
      className={clsx('relative z-10 size-7 text-white sm:size-8', className)}
    />
  )
}
