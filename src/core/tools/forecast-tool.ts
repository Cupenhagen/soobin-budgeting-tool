import { startOfMonth, getDaysInMonth, differenceInDays } from 'date-fns'
import type { Transaction } from '../models/transaction'
import type { Budget } from '../models/budget'
import { toNumber } from '@/lib/php-formatter'
import type { ForecastRisk } from '../models/enums'

export interface CategoryForecast {
  categoryId?: string
  spentToDate: number
  projectedMonthEnd: number
  budgetLimit?: number
  projectedOverspend: number
  riskLevel: ForecastRisk
}

export interface ForecastResult {
  forecasts: CategoryForecast[]
  projectedTotalSpend: number
  highRiskCategories: CategoryForecast[]
  coachMessage: string
}

export function executeForecastTool(
  transactions: Transaction[],
  budgets: Budget[],
  referenceDate: Date
): ForecastResult {
  const monthStart = startOfMonth(referenceDate)
  const daysInMonth = getDaysInMonth(referenceDate)
  const dayOfMonth = Math.max(differenceInDays(referenceDate, monthStart) + 1, 1)

  const monthlyExpenses = transactions.filter(
    (tx) => tx.type === 'expense' && new Date(tx.date) >= monthStart
  )

  const byCategory = new Map<string | undefined, number>()
  for (const tx of monthlyExpenses) {
    const key = tx.categoryId
    byCategory.set(key, (byCategory.get(key) ?? 0) + toNumber(tx.amount))
  }

  const forecasts: CategoryForecast[] = []
  let projectedTotal = 0

  for (const [categoryId, spent] of byCategory) {
    const dailyRate = spent / dayOfMonth
    const projected = dailyRate * daysInMonth
    projectedTotal += projected

    const budget = budgets.find((b) => b.categoryId === categoryId)
    const limit = budget ? toNumber(budget.amount) : undefined
    const overspend = limit != null ? Math.max(projected - limit, 0) : 0

    let riskLevel: ForecastRisk = 'low'
    if (limit != null) {
      const ratio = projected / limit
      riskLevel = ratio > 1.1 ? 'high' : ratio > 0.85 ? 'medium' : 'low'
    }

    forecasts.push({ categoryId, spentToDate: spent, projectedMonthEnd: projected, budgetLimit: limit, projectedOverspend: overspend, riskLevel })
  }

  const highRisk = forecasts.filter((f) => f.riskLevel === 'high')
  const coachMessage =
    highRisk.length === 0
      ? "You're on track this month. Keep it up!"
      : `${highRisk.length} spending ${highRisk.length === 1 ? 'category' : 'categories'} may go over budget this month. Consider adjusting.`

  return { forecasts, projectedTotalSpend: projectedTotal, highRiskCategories: highRisk, coachMessage }
}
