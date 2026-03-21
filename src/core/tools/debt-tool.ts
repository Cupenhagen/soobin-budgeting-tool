import { differenceInDays, setDate } from 'date-fns'
import type { DebtBalance } from '../models/debt'
import { toNumber, formatPHP } from '@/lib/php-formatter'

export interface DebtStatus {
  debt: DebtBalance
  daysUntilDue?: number
  isOverdue: boolean
  isDueSoon: boolean          // within 3 days
  reminderMessage?: string
}

export interface DebtResult {
  statuses: DebtStatus[]
  totalDebt: number
  totalMinimumPayments: number
  overdueCount: number
  dueSoonCount: number
}

export function executeDebtTool(debts: DebtBalance[], referenceDate: Date): DebtResult {
  const statuses: DebtStatus[] = []

  for (const debt of debts.filter((d) => d.isActive)) {
    let daysUntilDue: number | undefined
    let isOverdue = false
    let isDueSoon = false
    let reminderMessage: string | undefined

    if (debt.dueDay != null) {
      // Compute this month's due date
      const dueDate = setDate(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1), debt.dueDay)
      const diff = differenceInDays(dueDate, referenceDate)
      daysUntilDue = diff
      isOverdue = diff < 0
      isDueSoon = diff >= 0 && diff <= 3

      if (isOverdue) {
        reminderMessage = `Your ${debt.name} payment is overdue!`
      } else if (isDueSoon) {
        const minPay = debt.minimumPayment ? ` (${formatPHP(toNumber(debt.minimumPayment))})` : ''
        const dayStr = diff === 0 ? 'today' : `in ${diff} day${diff > 1 ? 's' : ''}`
        reminderMessage = `${debt.name} payment${minPay} due ${dayStr}.`
      }
    }

    statuses.push({ debt, daysUntilDue, isOverdue, isDueSoon, reminderMessage })
  }

  const activeDebts = debts.filter((d) => d.isActive)
  const totalDebt = activeDebts.reduce((s, d) => s + toNumber(d.currentBalance), 0)
  const totalMin  = activeDebts.reduce((s, d) => s + toNumber(d.minimumPayment), 0)

  return {
    statuses,
    totalDebt,
    totalMinimumPayments: totalMin,
    overdueCount: statuses.filter((s) => s.isOverdue).length,
    dueSoonCount: statuses.filter((s) => s.isDueSoon).length,
  }
}
