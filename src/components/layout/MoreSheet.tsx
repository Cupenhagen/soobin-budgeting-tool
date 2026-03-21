'use client'
import Link from 'next/link'
import { Wallet, PiggyBank, CreditCard, RefreshCw, MessageCircle, BarChart3, Settings, X } from 'lucide-react'

const MORE_ITEMS = [
  { href: '/accounts',  label: 'Accounts',        icon: Wallet },
  { href: '/savings',   label: 'Savings Goals',   icon: PiggyBank },
  { href: '/debts',     label: 'Debts',           icon: CreditCard },
  { href: '/recurring', label: 'Recurring',       icon: RefreshCw },
  { href: '/chat',      label: 'Chat with Soobin',icon: MessageCircle },
  { href: '/reports',   label: 'Reports',         icon: BarChart3 },
  { href: '/settings',  label: 'Settings',        icon: Settings },
]

export function MoreSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-t-2xl p-4 pb-safe">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-[var(--text-primary)]">More</span>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)]">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {MORE_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-medium text-[var(--text-primary)] text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                <Icon size={18} className="text-brand" />
              </div>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
