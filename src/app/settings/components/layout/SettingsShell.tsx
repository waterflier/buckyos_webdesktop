import { useState } from 'react'
import { useMediaQuery } from '@mui/material'
import { Sidebar } from './Sidebar'
import { MobileTabBar } from './MobileTabBar'
import type { SettingsPage } from './Sidebar'

interface SettingsShellProps {
  children: (page: SettingsPage, navigate: (page: SettingsPage) => void) => React.ReactNode
}

export function SettingsShell({ children }: SettingsShellProps) {
  const [currentPage, setCurrentPage] = useState<SettingsPage>('general')
  const isMobile = useMediaQuery('(max-width: 767px)')

  return (
    <div className="flex flex-col h-full w-full" style={{ background: 'var(--cp-bg)' }}>
      {isMobile && (
        <MobileTabBar currentPage={currentPage} onNavigate={setCurrentPage} />
      )}
      <div className="flex flex-1 min-h-0">
        {!isMobile && (
          <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        )}
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: 'var(--cp-bg)' }}
        >
          <div className={isMobile ? 'px-4 py-4' : 'px-6 py-5 max-w-4xl'}>
            {children(currentPage, setCurrentPage)}
          </div>
        </main>
      </div>
    </div>
  )
}
