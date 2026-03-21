import { startOfWeek, endOfWeek, startOfDay } from 'date-fns'
import type { Transaction } from '../models/transaction'
import { toNumber } from '@/lib/php-formatter'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateTransaction(tx: {
  amount: number
  type: string
  accountId: string
  destinationAccountId?: string
  date: string
}): ValidationResult {
  const errors: string[] = []
  if (tx.amount <= 0) errors.push('Amount must be greater than zero.')
  if (tx.type === 'transfer' && !tx.destinationAccountId) errors.push('Transfer requires a destination account.')
  if (tx.type === 'transfer' && tx.accountId === tx.destinationAccountId) errors.push('Source and destination accounts must be different.')
  if (new Date(tx.date) > new Date(Date.now() + 60_000)) errors.push('Date cannot be in the future.')
  return { isValid: errors.length === 0, errors }
}

export interface WeeklySummary {
  weekStart: Date
  weekEnd: Date
  totalIncome: number
  totalExpenses: number
  netChange: number
  dailyBreakdown: Record<string, number>  // ISO date string → total expenses
}

export function weekSummary(transactions: Transaction[], referenceDate: Date): WeeklySummary {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 })

  const weekly = transactions.filter((t) => {
    const d = new Date(t.date)
    return d >= weekStart && d <= weekEnd
  })

  const totalIncome = weekly.filter((t) => t.type === 'income').reduce((s, t) => s + toNumber(t.amount), 0)
  const totalExpenses = weekly.filter((t) => t.type === 'expense').reduce((s, t) => s + toNumber(t.amount), 0)

  const dailyBreakdown: Record<string, number> = {}
  for (const tx of weekly.filter((t) => t.type === 'expense')) {
    const day = startOfDay(new Date(tx.date)).toISOString()
    dailyBreakdown[day] = (dailyBreakdown[day] ?? 0) + toNumber(tx.amount)
  }

  return { weekStart, weekEnd, totalIncome, totalExpenses, netChange: totalIncome - totalExpenses, dailyBreakdown }
}

export interface CategorySpendResult {
  categoryId?: string
  totalSpent: number
  transactionCount: number
  averageAmount: number
  largestAmount: number
}

export function calculateCategorySpend(
  transactions: Transaction[],
  categoryId: string | undefined,
  startDate: Date,
  endDate: Date
): CategorySpendResult {
  const filtered = transactions.filter(
    (tx) =>
      tx.type === 'expense' &&
      new Date(tx.date) >= startDate &&
      new Date(tx.date) <= endDate &&
      (categoryId == null || tx.categoryId === categoryId)
  )
  const total = filtered.reduce((s, t) => s + toNumber(t.amount), 0)
  const count = filtered.length
  return {
    categoryId,
    totalSpent: total,
    transactionCount: count,
    averageAmount: count > 0 ? total / count : 0,
    largestAmount: filtered.reduce((m, t) => Math.max(m, toNumber(t.amount)), 0),
  }
}
