'use client'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, CreditCard, AlertTriangle } from 'lucide-react'
import { db } from '@/core/database/db'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import { DebtModal } from '@/components/debts/DebtModal'
import { executeDebtTool } from '@/core/tools/debt-tool'
import { DEBT_TYPE_LABELS } from '@/core/models/enums'
import { clsx } from 'clsx'
import type { DebtBalance } from '@/core/models/debt'

export default function DebtsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editDebt, setEditDebt] = useState<DebtBalance | null>(null)

  const debts = useLiveQuery(() => db.debts.toArray().then(r => r.filter(d => d.isActive)), [])
  const result = debts ? executeDebtTool(debts, new Date()) : null

  return (
    <div className="max-w-2xl mx-auto px-m py-m">
      <div className="flex items-center justify-between mb-m">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Debts</h1>
        <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-full bg-brand flex items-center justify-center">
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {result && result.totalDebt > 0 && (
        <div className="bg-expense/10 rounded-card p-m mb-m">
          <p className="text-sm text-[var(--text-secondary)] mb-1">Total Debt</p>
          <AmountDisplay amount={result.totalDebt} size="large" variant="expense" />
          {result.totalMinimumPayments > 0 && (
            <p className="text-xs text-[var(--text-secondary)] mt-1">Min. payments: <AmountDisplay amount={result.totalMinimumPayments} compact className="text-xs" /></p>
          )}
        </div>
      )}

      {!result || result.statuses.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No debts tracked"
          description="Track your credit cards, loans, and utang here."
          action={{ label: 'Add Debt', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="space-y-3">
          {result.statuses.map((s) => (
            <Card key={s.debt.id} onClick={() => setEditDebt(s.debt)}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{s.debt.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{DEBT_TYPE_LABELS[s.debt.type]}</p>
                </div>
                <AmountDisplay amount={parseFloat(s.debt.currentBalance)} size="large" variant="expense" />
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-expense rounded-full"
                  style={{ width: `${Math.min((parseFloat(s.debt.currentBalance) / parseFloat(s.debt.principalAmount)) * 100, 100)}%` }}
                />
              </div>

              {s.reminderMessage && (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={12} className={clsx(s.isOverdue ? 'text-expense' : 'text-warning')} />
                  <p className="text-xs text-[var(--text-secondary)]">{s.reminderMessage}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {(showAdd || editDebt) && (
        <DebtModal onClose={() => { setShowAdd(false); setEditDebt(null) }} editDebt={editDebt ?? undefined} />
      )}
    </div>
  )
}
