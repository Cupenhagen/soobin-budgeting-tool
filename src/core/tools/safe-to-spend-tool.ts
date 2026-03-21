import { formatPHPCompact } from '@/lib/php-formatter'
import type { BudgetResult } from './budget-tool'

export interface SafeToSpendInput {
  totalBalance: number
  budgetResult: BudgetResult
  upcomingBillsTotal: number
  savingsGoalTarget: number
  referenceDate: Date
}

export interface SafeToSpendResult {
  safeToSpendToday: number
  safeToSpendThisWeek: number
  message: string
  warningMessage?: string
}

export function executeSafeToSpendTool(input: SafeToSpendInput): SafeToSpendResult {
  const weekday = input.referenceDate.getDay() // 0=Sun, 6=Sat
  const daysLeftInWeek = Math.max(7 - weekday, 1)

  const discretionary =
    input.budgetResult.totalRemaining - input.upcomingBillsTotal - input.savingsGoalTarget

  const weeklyFraction = daysLeftInWeek / 7
  const safeThisWeek = Math.max(discretionary * weeklyFraction, 0)
  const safeToday = Math.max(safeThisWeek / daysLeftInWeek, 0)

  const message = `You can safely spend ${formatPHPCompact(safeThisWeek)} this week (${formatPHPCompact(safeToday)} today).`

  const warningMessage =
    discretionary < 0
      ? 'Your upcoming bills and savings goals exceed your remaining budget. Review your spending.'
      : undefined

  return { safeToSpendToday: safeToday, safeToSpendThisWeek: safeThisWeek, message, warningMessage }
}
