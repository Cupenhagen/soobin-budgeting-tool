'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Pencil, TrendingUp, TrendingDown } from 'lucide-react'
import { db } from '@/core/database/db'
import { AccountModal } from '@/components/accounts/AccountModal'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { ACCOUNT_TYPE_LABELS } from '@/core/models/enums'
import { formatPHP } from '@/lib/php-formatter'
import { relativeDay, timeOnly } from '@/lib/date-helpers'
import { ArrowLeftRight } from 'lucide-react'

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)

  const account = useLiveQuery(() => db.accounts.get(id), [id])
  const transactions = useLiveQuery(
    () => db.transactions
      .where('accountId').equals(id)
      .reverse()
      .sortBy('date'),
    [id]
  )
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  if (account === undefined || transactions === undefined) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" /></div>
  }
  if (!account) {
    return <div className="p-6 text-center text-[var(--text-secondary)]">Account not found.</div>
  }

  const catMap = Object.fromEntries((categories ?? []).map((c) => [c.id, c]))

  // Compute balance from transactions (income adds, expense subtracts)
  const computed = transactions.reduce((sum, tx) => {
    if (tx.type === 'income') return sum + parseFloat(tx.amount)
    if (tx.type === 'expense') return sum - parseFloat(tx.amount)
    return sum
  }, parseFloat(account.currentBalance))

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg-grouped)] px-4 pt-4 pb-2 flex items-center gap-3 border-b border-[var(--border)]">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft size={18} className="text-[var(--text-primary)]" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-[var(--text-primary)]">{account.name}</h1>
          <p className="text-xs text-[var(--text-secondary)]">{ACCOUNT_TYPE_LABELS[account.type]}{account.institution ? ` · ${account.institution}` : ''}</p>
        </div>
        <button onClick={() => setShowEdit(true)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <Pencil size={16} className="text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Balance hero */}
      <div className="px-4 py-6 bg-gradient-to-br from-brand to-brand-dark text-white">
        <p className="text-sm text-white/70 mb-1">Current Balance</p>
        <p className="text-4xl font-bold">{formatPHP(computed)}</p>
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-xs text-white/60 flex items-center gap-1"><TrendingUp size={12} /> Income</p>
            <p className="text-sm font-semibold text-green-300">{formatPHP(income)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60 flex items-center gap-1"><TrendingDown size={12} /> Expenses</p>
            <p className="text-sm font-semibold text-red-300">{formatPHP(expenses)}</p>
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Transaction History</h2>

        {transactions.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="No transactions yet" description="Transactions for this account will appear here." />
        ) : (
          <div className="space-y-0 rounded-2xl overflow-hidden border border-[var(--border)] bg-white dark:bg-slate-900">
            {transactions.map((tx, i) => {
              const cat = catMap[tx.categoryId ?? '']
              const isLast = i === transactions.length - 1
              return (
                <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-[var(--border)]' : ''}`}>
                  <CategoryIcon
                    iconName={cat?.iconName ?? 'Tag'}
                    colorHex={cat?.colorHex ?? '#8B5CF6'}
                    size={18}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {tx.merchantOrPayee || cat?.name || 'Transaction'}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {relativeDay(new Date(tx.date))} · {timeOnly(new Date(tx.date))}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${
                    tx.type === 'income' ? 'text-income' : tx.type === 'expense' ? 'text-expense' : 'text-[var(--text-secondary)]'
                  }`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatPHP(parseFloat(tx.amount))}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showEdit && (
        <AccountModal
          onClose={() => setShowEdit(false)}
          editAccount={account}
        />
      )}
    </div>
  )
}
