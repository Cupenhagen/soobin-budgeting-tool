'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from './AppShell'
import { useAppStore } from '@/store/app-store'
import { seedIfEmpty, restoreFromCloud } from '@/core/database/seed'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { theme, onboardingDone, userName } = useAppStore()
  const router = useRouter()

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // system
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      root.classList.toggle('dark', mq.matches)
      const handler = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  // On every load: restore cloud data into Dexie, then seed if brand new
  useEffect(() => {
    if (!onboardingDone) return
    restoreFromCloud()
      .then(() => seedIfEmpty(userName))
      .catch(console.error)
  }, [onboardingDone, userName])

  // Redirect to onboarding if needed
  useEffect(() => {
    if (!onboardingDone && typeof window !== 'undefined') {
      if (window.location.pathname !== '/onboarding') {
        router.replace('/onboarding')
      }
    }
  }, [onboardingDone, router])

  if (!onboardingDone) return <>{children}</>

  return <AppShell>{children}</AppShell>
}
