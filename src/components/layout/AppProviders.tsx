'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from './AppShell'
import { useAppStore } from '@/store/app-store'
import { seedIfEmpty, restoreFromCloud } from '@/core/database/seed'
import { db } from '@/core/database/db'
import { recurringRepo } from '@/core/repositories/recurring-repo'
import { executeRecurringTool } from '@/core/tools/recurring-tool'

export function AppProviders({ children, devBypass = false }: { children: React.ReactNode; devBypass?: boolean }) {
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

  // On every load when already onboarded: restore cloud data into Dexie, then run recurring engine
  useEffect(() => {
    if (!onboardingDone) return
    restoreFromCloud()
      .then(() => seedIfEmpty(userName))
      .then(async () => {
        // Generate pending suggestions for overdue recurring transactions
        const [recurrings, suggestions] = await Promise.all([
          recurringRepo.fetchActive(),
          recurringRepo.fetchPending(),
        ])
        const { newSuggestions, updatedRecurrings } = executeRecurringTool(recurrings, suggestions, new Date())
        await Promise.all([
          ...newSuggestions.map((s) => recurringRepo.insertSuggestion(s)),
          ...updatedRecurrings.map((r) => db.recurringTransactions.put(r)),
        ])
        // Auto-post if enabled
        for (const s of newSuggestions) {
          const rt = recurrings.find((r) => r.id === s.recurringTransactionId)
          if (!rt?.autoPost) continue
          const { newTransaction } = await import('@/core/models/transaction')
          const { syncUpsert } = await import('@/lib/cloud-sync')
          const tx = newTransaction({
            type: rt.template.type,
            amount: s.suggestedAmount,
            accountId: rt.template.accountId,
            categoryId: rt.template.categoryId,
            merchantOrPayee: rt.template.merchantOrPayee,
            note: rt.template.note,
            date: s.suggestedDate.slice(0, 10),
          })
          await db.transactions.add(tx)
          syncUpsert('transactions', tx)
          await recurringRepo.updateSuggestion({ ...s, status: 'accepted', postedTransactionId: tx.id })
        }
      })
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

  return <AppShell devBypass={devBypass}>{children}</AppShell>
}
