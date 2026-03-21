'use client'
import { Sidebar } from './Sidebar'
import { BottomTabs } from './BottomTabs'
import { QuickAddFAB } from './QuickAddFAB'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-grouped)]">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom tabs */}
      <BottomTabs />

      {/* Quick-add FAB */}
      <QuickAddFAB />
    </div>
  )
}
