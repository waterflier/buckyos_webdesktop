import { ChevronLeft } from 'lucide-react'
import { useI18n } from '../../../../i18n/provider'

interface MobileDetailHeaderProps {
  onBack: () => void
}

export function MobileDetailHeader({ onBack }: MobileDetailHeaderProps) {
  const { t } = useI18n()

  return (
    <div
      className="flex items-center gap-1 shrink-0 px-2 py-2"
      style={{ borderBottom: '1px solid var(--cp-border)' }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-sm transition-colors active:opacity-70"
        style={{ color: 'var(--cp-accent)' }}
      >
        <ChevronLeft size={18} />
        <span>{t('settings.mobile.back', 'Settings')}</span>
      </button>
    </div>
  )
}
