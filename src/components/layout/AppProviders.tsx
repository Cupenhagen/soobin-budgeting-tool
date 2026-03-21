'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from './AppShell'
import { useAppStore } from '@/store/app-store'
import { seedIfEmpty, restoreFromCloud } from '@/core/database/seed'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { theme, onboardingDone, userName, setOnboardingDone } = useAppStore()
  const router = useRouter()
  const [cloudChecked, setCloudChecked] = useState(false)

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      root.classList.toggle('dark', mq.matches)
      const handler = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  // On every load when already onboarded: restore cloud data into Dexie
  useEffect(() => {
    if (!onboardingDone) return
    restoreFromCloud()
      .then(() => seedIfEmpty(userName))
      .catch(console.error)
  }, [onboardingDone, userName])

  // When onboarding not done locally: check Clerk publicMetadata (cross-device source of truth)
  useEffect(() => {
    if (onboardingDone) {
      setCloudChecked(true)
      return
    }

    if (typeof window !== 'undefined' && window.location.pathname === '/onboarding') {
      setCloudChecked(true)
      return
    }

    fetch('/api/user/status')
      .then((r) => r.json())
      .then(({ onboarding_done }: { onboarding_done: boolean }) => {
        if (onboarding_done) {
          // Returning user on new device — mark done, restore in background
          setOnboardingDone(true)
          setCloudChecked(true)
          restoreFromCloud()
            .then(() => seedIfEmpty(userName))
            .catch((e) => console.warn('[AppProviders] cloud restore failed:', e))
          // onboardingDone state change will re-render AppShell; stay on current route
        } else {
          // New user — go to onboarding
          setCloudChecked(true)
          router.replace('/onboarding')
        }
      })
      .catch(() => {
        // API failed — default to onboarding (safe for new users)
        setCloudChecked(true)
        router.replace('/onboarding')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingDone])

  // Show nothing while checking (prevents flash of onboarding for returning users)
  if (!onboardingDone && !cloudChecked) return null

  if (!onboardingDone) return <>{children}</>

  return <AppShell>{children}</AppShell>
}
