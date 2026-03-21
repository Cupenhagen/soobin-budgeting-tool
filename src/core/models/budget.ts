import type { BudgetPeriod, BudgetStatusLevel } from './enums'

export interface Budget {
  id: string
  categoryId?: string   // undefined = overall budget
  amount: string        // stored as string
  period: BudgetPeriod
  startDate: string
  rolloverUnspent: boolean
  alertThresholdPercent: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function newBudget(
  partial: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'rolloverUnspent' | 'alertThresholdPercent'>
  & Partial<Pick<Budget, 'isActive' | 'rolloverUnspent' | 'alertThresholdPercent'>>
): Budget {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    isActive: true,
    rolloverUnspent: false,
    alertThresholdPercent: 80,
    ...partial,
    createdAt: now,
    updatedAt: now,
  }
}

export interface BudgetStatus {
  budget: Budget
  categoryName?: string
  limitAmount: number
  spentAmount: number
  remainingAmount: number
  progress: number          // 0.0 … 1.0+
  isOverspent: boolean
  isWarning: boolean
  weeklyPacingMessage: string
  projectedMonthEnd: number
  statusLevel: BudgetStatusLevel
}
