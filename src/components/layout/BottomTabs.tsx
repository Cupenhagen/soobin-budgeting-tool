'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, Target, MoreHorizontal } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { MoreSheet } from './MoreSheet'

const TABS = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions',  icon: ArrowLeftRight },
  { href: '/budgets',      label: 'Budget',        icon: Target },
]

export function BottomTabs() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-[var(--border)] pb-safe z-40">
        <div className="flex">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                  active ? 'text-brand' : 'text-[var(--text-secondary)]'
                )}
              >
                <Icon size={22} />
                {label}
              </Link>
            )
          })}
          <button
            onClick={() => setShowMore(true)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-[var(--text-secondary)]"
          >
            <MoreHorizontal size={22} />
            More
          </button>
        </div>
      </nav>

      {showMore && <MoreSheet onClose={() => setShowMore(false)} />}
    </>
  )
}
