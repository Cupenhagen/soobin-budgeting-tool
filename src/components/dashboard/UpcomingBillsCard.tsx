import { AlertTriangle, Clock } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import type { DebtResult } from '@/core/tools/debt-tool'

interface Props {
  debtResult: DebtResult
  billsTotal: number
}

export function UpcomingBillsCard({ debtResult, billsTotal }: Props) {
  const alerts = debtResult.statuses.filter((s) => s.isOverdue || s.isDueSoon)

  return (
    <Card>
      <CardHeader title="Upcoming Bills" />

      {billsTotal > 0 && (
        <div className="flex items-center gap-2 mb-3 p-3 bg-warning/10 rounded-xl">
          <Clock size={14} className="text-warning flex-shrink-0" />
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-medium"><AmountDisplay amount={billsTotal} compact className="text-sm" /></span>
            <span className="text-[var(--text-secondary)]"> due in next 7 days</span>
          </p>
        </div>
      )}

      {alerts.map((s) => (
        <div key={s.debt.id} className="flex items-start gap-2 py-2">
          <AlertTriangle size={14} className={s.isOverdue ? 'text-expense mt-0.5' : 'text-warning mt-0.5'} />
          <p className="text-sm text-[var(--text-primary)]">{s.reminderMessage}</p>
        </div>
      ))}
    </Card>
  )
}
