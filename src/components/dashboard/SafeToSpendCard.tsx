import { AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import type { SafeToSpendResult } from '@/core/tools/safe-to-spend-tool'
import type { WeeklySummary } from '@/core/tools/transaction-tool'

interface Props {
  safe: SafeToSpendResult
  weekly: WeeklySummary
}

export function SafeToSpendCard({ safe, weekly }: Props) {
  return (
    <Card>
      <CardHeader title="Safe to Spend" />

      <div className="flex gap-4 mb-4">
        <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Today</p>
          <AmountDisplay amount={safe.safeToSpendToday} size="large" variant="income" compact />
        </div>
        <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-1">This Week</p>
          <AmountDisplay amount={safe.safeToSpendThisWeek} size="large" variant="income" compact />
        </div>
      </div>

      {safe.warningMessage ? (
        <div className="flex items-start gap-2 p-3 bg-expense/10 rounded-xl">
          <AlertTriangle size={14} className="text-expense mt-0.5 flex-shrink-0" />
          <p className="text-xs text-expense">{safe.warningMessage}</p>
        </div>
      ) : (
        <div className="flex items-start gap-2 p-3 bg-income/10 rounded-xl">
          <CheckCircle size={14} className="text-income mt-0.5 flex-shrink-0" />
          <p className="text-xs text-income">{safe.message}</p>
        </div>
      )}

      {/* Week summary row */}
      <div className="flex gap-4 mt-4 pt-4 border-t border-[var(--separator)]">
        <div className="flex-1 text-center">
          <p className="text-xs text-[var(--text-secondary)]">Income</p>
          <AmountDisplay amount={weekly.totalIncome} variant="income" compact className="text-sm" />
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-[var(--text-secondary)]">Expenses</p>
          <AmountDisplay amount={weekly.totalExpenses} variant="expense" compact className="text-sm" />
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-[var(--text-secondary)]">Net</p>
          <AmountDisplay amount={weekly.netChange} variant="auto" compact className="text-sm" />
        </div>
      </div>
    </Card>
  )
}
