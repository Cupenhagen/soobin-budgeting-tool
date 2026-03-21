import { Card, CardHeader } from '@/components/ui/Card'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import type { BudgetResult } from '@/core/tools/budget-tool'
import type { Category } from '@/core/models/category'
import { formatPHP } from '@/lib/php-formatter'
import { clsx } from 'clsx'

interface Props {
  budgetResult: BudgetResult
  categories: Category[]
  coachMessage: string
}

export function BudgetSummaryCard({ budgetResult, categories, coachMessage }: Props) {
  if (budgetResult.statuses.length === 0) return null

  return (
    <Card>
      <CardHeader title="Budget" subtitle={`${formatPHP(budgetResult.totalSpent)} of ${formatPHP(budgetResult.totalBudgeted)} spent`} />

      {/* Coach message */}
      <p className="text-xs text-[var(--text-secondary)] mb-4 italic">{coachMessage}</p>

      <div className="space-y-3">
        {budgetResult.statuses.slice(0, 5).map((s) => {
          const cat = categories.find((c) => c.id === s.budget.categoryId)
          const barColor =
            s.statusLevel === 'overBudget' || s.statusLevel === 'critical'
              ? 'bg-expense'
              : s.statusLevel === 'warning'
              ? 'bg-warning'
              : 'bg-income'

          return (
            <div key={s.budget.id}>
              <div className="flex items-center gap-2 mb-1">
                {cat && <CategoryIcon iconName={cat.iconName} colorHex={cat.colorHex} size={14} />}
                <span className="text-sm text-[var(--text-primary)] flex-1">{s.categoryName ?? 'Overall'}</span>
                <span className={clsx('text-xs font-semibold', s.isOverspent ? 'text-expense' : 'text-[var(--text-secondary)]')}>
                  {formatPHP(s.spentAmount)} / {formatPHP(s.limitAmount)}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all', barColor)}
                  style={{ width: `${Math.min(s.progress * 100, 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
