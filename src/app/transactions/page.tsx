'use client'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search } from 'lucide-react'
import { db } from '@/core/database/db'
import { transactionRepo } from '@/core/repositories/transaction-repo'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import { EmptyState } from '@/components/ui/EmptyState'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { relativeDay } from '@/lib/date-helpers'
import type { Transaction } from '@/core/models/transaction'
import { ArrowLeftRight } from 'lucide-react'

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)

  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().limit(200).toArray(), [])
  const categories   = useLiveQuery(() => db.categories.toArray(), [])

  const filtered = (transactions ?? []).filter((tx) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (tx.merchantOrPayee?.toLowerCase().includes(q)) ||
      (tx.note?.toLowerCase().includes(q)) ||
      tx.amount.includes(q)
    )
  })

  const handleDelete = async (id: string) => {
    if (confirm('Delete this transaction?')) await transactionRepo.delete(id)
  }

  return (
    <div className="max-w-2xl mx-auto px-m py-m">
      {/* Header */}
      <div className="flex items-center justify-between mb-m">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Transactions</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="w-9 h-9 rounded-full bg-brand flex items-center justify-center"
        >
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          className="input-field pl-9"
          placeholder="Search transactions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transactions yet"
          description="Add your first transaction to start tracking your finances."
          action={{ label: 'Add Transaction', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-card shadow-card divide-y divide-[var(--separator)]">
          {filtered.map((tx) => {
            const cat = (categories ?? []).find((c) => c.id === tx.categoryId)
            const variant = tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : 'transfer'
            const sign = tx.type === 'income' ? 1 : -1

            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                onClick={() => setEditTx(tx)}
              >
                {cat ? (
                  <CategoryIcon iconName={cat.iconName} colorHex={cat.colorHex} size={16} />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {tx.merchantOrPayee ?? cat?.name ?? tx.note ?? 'Transaction'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{relativeDay(tx.date)}</p>
                </div>
                <AmountDisplay
                  amount={parseFloat(tx.amount) * (tx.type === 'transfer' ? 1 : sign)}
                  variant={variant}
                  size="small"
                />
              </div>
            )
          })}
        </div>
      )}

      {(showAdd || editTx) && (
        <TransactionModal
          onClose={() => { setShowAdd(false); setEditTx(null) }}
          editTransaction={editTx ?? undefined}
        />
      )}
    </div>
  )
}
