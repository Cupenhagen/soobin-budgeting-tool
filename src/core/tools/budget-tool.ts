import { startOfMonth, endOfMonth, differenceInDays } from 'date-fns'
import type { Budget, BudgetStatus } from '../models/budget'
import type { Category } from '../models/category'
import type { Transaction } from '../models/transaction'
import { toNumber, formatPHPCompact } from '@/lib/php-formatter'
import type { BudgetStatusLevel } from '../models/enums'

export interface BudgetInput {
  budgets: Budget[]
  transactions: Transaction[]
  categories: Category[]
  referenceDate: Date
}

export interface BudgetResult {
  statuses: BudgetStatus[]
  totalBudgeted: number
  totalSpent: number
  totalRemaining: number
  overBudgetCategories: BudgetStatus[]
  warningCategories: BudgetStatus[]
}

function statusLevel(progress: number, threshold: number, isOverspent: boolean): BudgetStatusLevel {
  if (isOverspent)            return 'overBudget'
  if (progress >= 0.90)       return 'critical'
  if (progress >= threshold)  return 'warning'
  return 'onTrack'
}

function pacingMessage(spent: number, limit: number, daysRemaining: number, name: string): string {
  const remaining = limit - spent
  if (remaining <= 0) return `You've exceeded your ${name} budget.`
  if (daysRemaining <= 0) return 'Budget period ending soon.'
  const weeksLeft = daysRemaining / 7
  const weeklyAllowance = remaining / weeksLeft
  return `You can still spend ${formatPHPCompact(weeklyAllowance)} on ${name} per week.`
}

export function executeBudgetTool(input: BudgetInput): BudgetResult {
  const now = input.referenceDate
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const daysInMonth = differenceInDays(monthEnd, monthStart) + 1
  const dayOfMonth = differenceInDays(now, monthStart) + 1
  const daysRemaining = Math.max(daysInMonth - dayOfMonth, 1)

  const statuses: BudgetStatus[] = []

  for (const budget of input.budgets.filter((b) => b.isActive)) {
    const category = input.categories.find((c) => c.id === budget.categoryId)
    const limit = toNumber(budget.amount)

    const spent = input.transactions
      .filter(
        (tx) =>
          tx.type === 'expense' &&
          new Date(tx.date) >= monthStart &&
          new Date(tx.date) <= monthEnd &&
          (budget.categoryId == null || tx.categoryId === budget.categoryId)
      )
      .reduce((s, tx) => s + toNumber(tx.amount), 0)

    const remaining = limit - spent
    const progress = limit > 0 ? spent / limit : 0
    const isOverspent = spent > limit
    const threshold = (budget.alertThresholdPercent ?? 80) / 100
    const isWarning = progress >= threshold
    const dailyRate = dayOfMonth > 0 ? spent / dayOfMonth : 0
    const projected = dailyRate * daysInMonth
    const catName = category?.name ?? 'this budget'

    statuses.push({
      budget,
      categoryName: category?.name,
      limitAmount: limit,
      spentAmount: spent,
      remainingAmount: remaining,
      progress,
      isOverspent,
      isWarning,
      weeklyPacingMessage: pacingMessage(spent, limit, daysRemaining, catName),
      projectedMonthEnd: projected,
      statusLevel: statusLevel(progress, threshold, isOverspent),
    })
  }

  const totalBudgeted = input.budgets.filter((b) => b.isActive).reduce((s, b) => s + toNumber(b.amount), 0)
  const totalSpent = statuses.reduce((s, b) => s + b.spentAmount, 0)

  return {
    statuses,
    totalBudgeted,
    totalSpent,
    totalRemaining: totalBudgeted - totalSpent,
    overBudgetCategories: statuses.filter((s) => s.isOverspent),
    warningCategories: statuses.filter((s) => s.isWarning && !s.isOverspent),
  }
}
