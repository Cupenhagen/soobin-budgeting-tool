'use client'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, RefreshCw, Bell, Check, X, Pencil } from 'lucide-react'
import { db } from '@/core/database/db'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import { RecurringModal } from '@/components/recurring/RecurringModal'
import { recurringRepo } from '@/core/repositories/recurring-repo'
import { newTransaction } from '@/core/models/transaction'
import { syncUpsert } from '@/lib/cloud-sync'
import { recurrenceLabel } from '@/core/models/enums'
import { relativeDay } from '@/lib/date-helpers'
import type { RecurringTransaction, PendingRecurringSuggestion } from '@/core/models/recurring-transaction'

export default function RecurringPage() {
  const recurrings  = useLiveQuery(() => db.recurringTransactions.toArray(), [])
  const suggestions = useLiveQuery(() => db.pendingSuggestions.where('status').equals('pending').toArray(), [])
  const categories  = useLiveQuery(() => db.categories.toArray(), [])

  const [modalOpen,  setModalOpen]  = useState(false)
  const [editTarget, setEditTarget] = useState<RecurringTransaction | undefined>()
  const [processing, setProcessing] = useState<string | null>(null)

  const active = (recurrings ?? []).filter((r) => r.isActive)
  const paused = (recurrings ?? []).filter((r) => !r.isActive)

  const openCreate = () => { setEditTarget(undefined); setModalOpen(true) }
  const openEdit   = (r: RecurringTransaction) => { setEditTarget(r); setModalOpen(true) }

  const catName = (id?: string) => (categories ?? []).find((c) => c.id === id)?.name ?? ''

  const acceptSuggestion = async (s: PendingRecurringSuggestion) => {
    setProcessing(s.id)
    try {
      const rt = (recurrings ?? []).find((r) => r.id === s.recurringTransactionId)
      if (!rt) return
      const tx = newTransaction({
        type: rt.template.type,
        amount: s.modifiedAmount ?? s.suggestedAmount,
        accountId: rt.template.accountId,
        categoryId: rt.template.categoryId,
        merchantOrPayee: rt.template.merchantOrPayee,
        note: rt.template.note,
        date: s.suggestedDate.slice(0, 10),
      })
      await db.transactions.add(tx)
      syncUpsert('transactions', tx)
      await recurringRepo.updateSuggestion({ ...s, status: 'accepted', postedTransactionId: tx.id })
    } finally {
      setProcessing(null)
    }
  }

  const skipSuggestion = async (s: PendingRecurringSuggestion) => {
    setProcessing(s.id)
    try {
      await recurringRepo.updateSuggestion({ ...s, status: 'skipped' })
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-m py-m">
      <div className="flex items-center justify-between mb-m">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Recurring</h1>
        <Button size="sm" onClick={openCreate} className="flex items-center gap-1.5">
          <Plus size={14} /> Add
        </Button>
      </div>

      {/* Pending suggestions */}
      {(suggestions ?? []).length > 0 && (
        <div className="mb-m">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={14} className="text-warning" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {suggestions?.length} due — review &amp; post
            </span>
          </div>
          <div className="space-y-2">
            {(suggestions ?? []).map((s) => {
              const rt = (recurrings ?? []).find((r) => r.id === s.recurringTransactionId)
              if (!rt) return null
              return (
                <Card key={s.id} className="border border-warning/30">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                        {rt.template.merchantOrPayee ?? catName(rt.template.categoryId) ?? 'Recurring'}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{relativeDay(s.suggestedDate)}</p>
                    </div>
                    <AmountDisplay
                      amount={parseFloat(s.suggestedAmount)}
                      variant={rt.template.type === 'income' ? 'income' : 'expense'}
                      compact
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => acceptSuggestion(s)}
                        disabled={processing === s.id}
                        className="p-1.5 rounded-lg bg-income/10 text-income hover:bg-income/20 transition-colors disabled:opacity-40"
                        title="Post as transaction"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => skipSuggestion(s)}
                        disabled={processing === s.id}
                        className="p-1.5 rounded-lg bg-expense/10 text-expense hover:bg-expense/20 transition-colors disabled:opacity-40"
                        title="Skip this occurrence"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty */}
      {active.length === 0 && paused.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No recurring transactions"
          description="Set up recurring templates for bills, subscriptions, and salary."
          action={{ label: 'Add Recurring', onClick: openCreate }}
        />
      ) : (
        <>
          {/* Active */}
          {active.length > 0 && (
            <div className="space-y-3 mb-m">
              {active.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--text-primary)] truncate">
                        {r.template.merchantOrPayee ?? catName(r.template.categoryId) ?? 'Recurring'}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {recurrenceLabel(r.frequency)} · Next: {relativeDay(r.nextDueDate)}
                        {r.template.categoryId ? ` · ${catName(r.template.categoryId)}` : ''}
                      </p>
                    </div>
                    <AmountDisplay
                      amount={parseFloat(r.template.amount)}
                      variant={r.template.type === 'income' ? 'income' : 'expense'}
                      compact
                    />
                    <button
                      onClick={() => openEdit(r)}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Paused */}
          {paused.length > 0 && (
            <>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2 mt-m">Paused</p>
              <div className="space-y-3">
                {paused.map((r) => (
                  <Card key={r.id} className="opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate">
                          {r.template.merchantOrPayee ?? catName(r.template.categoryId) ?? 'Recurring'}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">{recurrenceLabel(r.frequency)} · Paused</p>
                      </div>
                      <AmountDisplay
                        amount={parseFloat(r.template.amount)}
                        variant={r.template.type === 'income' ? 'income' : 'expense'}
                        compact
                      />
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {modalOpen && (
        <RecurringModal
          onClose={() => setModalOpen(false)}
          edit={editTarget}
        />
      )}
    </div>
  )
}
