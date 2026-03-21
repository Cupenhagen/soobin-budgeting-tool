'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from './AppShell'
import { useAppStore } from '@/store/app-store'
import { seedIfEmpty, restoreFromCloud, getCloudAccountCount } from '@/core/database/seed'

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

  // When onboarding not done locally: check cloud first before redirecting.
  // A returning user on a new device will have cloud data but empty localStorage.
  useEffect(() => {
    if (onboardingDone) {
      setCloudChecked(true)
      return
    }

    // Skip check on the onboarding page itself
    if (typeof window !== 'undefined' && window.location.pathname === '/onboarding') {
      setCloudChecked(true)
      return
    }

    getCloudAccountCount().then((count) => {
      if (count > 0) {
        // Returning user on a new device — mark done immediately so we never
        // redirect to onboarding, then restore cloud data in the background.
        setOnboardingDone(true)
        setCloudChecked(true)
        restoreFromCloud()
          .then(() => seedIfEmpty(userName))
          .catch((e) => console.warn('[AppProviders] cloud restore failed (will retry on next load):', e))
        // Navigation is handled by the onboardingDone useEffect above
      } else if (count === 0) {
        // Definitively no cloud data — brand new user
        setCloudChecked(true)
        if (window.location.pathname !== '/onboarding') {
          router.replace('/onboarding')
        }
      } else {
        // count === -1: fetch failed (network/auth error) — don't redirect to onboarding,
        // just show onboarding UI and let user decide
        setCloudChecked(true)
        if (window.location.pathname !== '/onboarding') {
          router.replace('/onboarding')
        }
      }
    }).catch(() => {
      // Unexpected error — fall back to onboarding
      setCloudChecked(true)
      router.replace('/onboarding')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingDone])

  // Show nothing while we're checking cloud (prevents flashing onboarding)
  if (!onboardingDone && !cloudChecked) return null

  if (!onboardingDone) return <>{children}</>

  return <AppShell>{children}</AppShell>
}
