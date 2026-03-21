import Link from 'next/link'
import { SignOutButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { ShieldOff } from 'lucide-react'

export default async function AccessDeniedPage() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-grouped)] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-expense/10 flex items-center justify-center mx-auto mb-5">
        <ShieldOff size={28} className="text-expense" />
      </div>

      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h1>
      <p className="text-[var(--text-secondary)] max-w-sm mb-1">
        Your account hasn&apos;t been granted access to Soobin yet.
      </p>
      <p className="text-sm text-[var(--text-tertiary)] max-w-sm mb-8">
        Contact the admin to be added to the approved list. If you believe this is a mistake,
        try signing out and back in once the admin has granted you access.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {userId ? (
          <SignOutButton redirectUrl="/sign-in">
            <button className="w-full py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors">
              Sign Out
            </button>
          </SignOutButton>
        ) : (
          <Link
            href="/sign-in"
            className="w-full py-3 rounded-xl bg-brand text-white font-semibold text-sm text-center hover:bg-brand-dark transition-colors"
          >
            Sign In
          </Link>
        )}
        <p className="text-xs text-[var(--text-tertiary)]">
          Admin: add the email to <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">APPROVED_EMAILS</code> in{' '}
          <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">.env.local</code>{' '}
          or set{' '}
          <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">publicMetadata: &#123;&quot;approved&quot;: true&#125;</code>{' '}
          in the Clerk Dashboard.
        </p>
      </div>
    </div>
  )
}
