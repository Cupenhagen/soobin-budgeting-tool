'use client'
/**
 * /auth/refreshing — forces a Clerk session token refresh after metadata changes.
 * Called by /auth/callback after setting publicMetadata.approved = true.
 * Without this, the cached JWT won't have the new metadata until the next sign-in.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@clerk/nextjs'

export default function RefreshingPage() {
  const { session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!session) return
    // Force Clerk to re-fetch the session token with updated publicMetadata
    session.reload().then(() => {
      router.replace('/dashboard')
    })
  }, [session, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-grouped)]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[var(--text-secondary)]">Setting up your account…</p>
      </div>
    </div>
  )
}
