'use client'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Target } from 'lucide-react'
import { db } from '@/core/database/db'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { executeBudgetTool } from '@/core/tools/budget-tool'
import { formatPHP } from '@/lib/php-formatter'
import { clsx } from 'clsx'
import { BudgetModal } from '@/components/budgets/BudgetModal'
import type { Budget } from '@/core/models/budget'

export default function BudgetsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editBudget, setEditBudget] = useState<Budget | null>(null)

  const budgets      = useLiveQuery(() => db.budgets.toArray().then(r => r.filter(b => b.isActive)), [])
  const transactions = useLiveQuery(() => db.transactions.limit(500).toArray(), [])
  const categories   = useLiveQuery(() => db.categories.toArray(), [])

  const result = budgets && transactions && categories
    ? executeBudgetTool({ budgets, transactions, categories, referenceDate: new Date() })
    : null

  return (
    <div className="max-w-2xl mx-auto px-m py-m">
      <div className="flex items-center justify-between mb-m">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Budgets</h1>
        <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-full bg-brand flex items-center justify-center">
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {result && result.statuses.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-card shadow-card p-m mb-m">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-secondary)]">Total spent</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {formatPHP(result.totalSpent)} / {formatPHP(result.totalBudgeted)}
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full"
              style={{ width: `${Math.min((result.totalSpent / result.totalBudgeted) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {!result || result.statuses.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No budgets yet"
          description="Create budgets to track your spending by category."
          action={{ label: 'Create Budget', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="space-y-3">
          {result.statuses.map((s) => {
            const cat = (categories ?? []).find((c) => c.id === s.budget.categoryId)
            const barColor = s.statusLevel === 'overBudget' || s.statusLevel === 'critical' ? 'bg-expense'
              : s.statusLevel === 'warning' ? 'bg-warning' : 'bg-income'

            return (
              <Card key={s.budget.id} onClick={() => setEditBudget(s.budget)}>
                <div className="flex items-center gap-3 mb-3">
                  {cat && <CategoryIcon iconName={cat.iconName} colorHex={cat.colorHex} size={16} />}
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{s.categoryName ?? 'Overall'}</span>
                      <span className={clsx('text-xs font-medium', s.isOverspent ? 'text-expense' : 'text-[var(--text-secondary)]')}>
                        {formatPHP(s.spentAmount)} / {formatPHP(s.limitAmount)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full', barColor)} style={{ width: `${Math.min(s.progress * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] italic">{s.weeklyPacingMessage}</p>
              </Card>
            )
          })}
        </div>
      )}

      {(showAdd || editBudget) && (
        <BudgetModal onClose={() => { setShowAdd(false); setEditBudget(null) }} editBudget={editBudget ?? undefined} />
      )}
    </div>
  )
}
