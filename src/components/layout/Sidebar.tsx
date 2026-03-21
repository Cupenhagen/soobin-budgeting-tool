'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, Target, Wallet,
  PiggyBank, CreditCard, RefreshCw, MessageCircle,
  BarChart3, Settings,
} from 'lucide-react'
import { APP_NAME } from '@/lib/constants'
import { clsx } from 'clsx'

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions',  icon: ArrowLeftRight },
  { href: '/budgets',      label: 'Budgets',       icon: Target },
  { href: '/accounts',     label: 'Accounts',      icon: Wallet },
  { href: '/savings',      label: 'Savings Goals', icon: PiggyBank },
  { href: '/debts',        label: 'Debts',         icon: CreditCard },
  { href: '/recurring',    label: 'Recurring',     icon: RefreshCw },
  { href: '/chat',         label: 'Chat with Soobin', icon: MessageCircle },
  { href: '/reports',      label: 'Reports',       icon: BarChart3 },
  { href: '/settings',     label: 'Settings',      icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-[var(--border)] z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center">
          <span className="text-white font-bold text-sm">S</span>
        </div>
        <span className="font-bold text-lg text-[var(--text-primary)]">{APP_NAME}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand/10 text-brand'
                  : 'text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--text-primary)]'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User section — only shown when Clerk is active */}
      {!DEV_BYPASS && <SidebarUser />}
    </aside>
  )
}

function SidebarUser() {
  // Dynamically import Clerk hooks so this file compiles in bypass mode too
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { UserButton, useUser } = require('@clerk/nextjs')
  const { user, isLoaded } = useUser()
  if (!isLoaded) return null

  return (
    <div className="border-t border-[var(--border)] px-4 py-4 flex items-center gap-3">
      <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {user?.firstName ?? user?.username ?? 'Account'}
        </p>
        <p className="text-xs text-[var(--text-secondary)] truncate">
          {user?.primaryEmailAddress?.emailAddress}
        </p>
      </div>
    </div>
  )
}
