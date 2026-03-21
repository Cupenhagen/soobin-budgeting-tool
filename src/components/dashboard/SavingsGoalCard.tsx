import { Card, CardHeader } from '@/components/ui/Card'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import type { SavingsGoalResult } from '@/core/tools/savings-goal-tool'

export function SavingsGoalCard({ goalResults }: { goalResults: SavingsGoalResult[] }) {
  return (
    <Card>
      <CardHeader title="Savings Goals" />
      <div className="space-y-4">
        {goalResults.slice(0, 3).map((r) => (
          <div key={r.goal.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-[var(--text-primary)]">{r.goal.name}</span>
              <span className="text-xs text-[var(--text-secondary)]">{Math.round(r.progress * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-brand rounded-full transition-all"
                style={{ width: `${Math.min(r.progress * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--text-secondary)]">
              <AmountDisplay amount={parseFloat(r.goal.currentAmount)} compact className="text-xs" />
              <AmountDisplay amount={parseFloat(r.goal.targetAmount)} compact className="text-xs" />
            </div>
            {r.impactMessage && (
              <p className="text-xs text-brand mt-1 italic">{r.impactMessage}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
