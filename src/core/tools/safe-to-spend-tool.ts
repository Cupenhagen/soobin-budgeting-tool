import { addDays } from 'date-fns'
import { formatPHPCompact, toNumber } from '@/lib/php-formatter'
import type { BudgetResult } from './budget-tool'
import type { RecurringTransaction } from '../models/recurring-transaction'

export type ProjectionWindow = 7 | 14 | 30

export interface SafeToSpendBreakdown {
  currentBalance: number
  expectedIncome: number
  expectedExpenses: number
  safetyBuffer: number
  safeToSpend: number
  isNegative: boolean
  incomeItems: { name: string; amount: number; dueDate: string }[]
  expenseItems: { name: string; amount: number; dueDate: string }[]
}

export interface SafeToSpendResult {
  // Legacy fields (kept for chatbot system prompt)
  safeToSpendToday: number
  safeToSpendThisWeek: number
  message: string
  warningMessage?: string
  // Rich breakdown per window
  breakdown7: SafeToSpendBreakdown
  breakdown14: SafeToSpendBreakdown
  breakdown30: SafeToSpendBreakdown
}

export function computeSafeToSpend(
  balance: number,
  recurrings: RecurringTransaction[],
  windowDays: ProjectionWindow,
  safetyBuffer: number,
  referenceDate: Date
): SafeToSpendBreakdown {
  const cutoff = addDays(referenceDate, windowDays)
  const incomeItems: SafeToSpendBreakdown['incomeItems'] = []
  const expenseItems: SafeToSpendBreakdown['expenseItems'] = []

  for (const r of recurrings.filter((r) => r.isActive)) {
    const due = new Date(r.nextDueDate)
    if (due < referenceDate || due > cutoff) continue
    const amount = toNumber(r.template.amount)
    const name = r.template.merchantOrPayee ?? 'Recurring'
    const dueDate = r.nextDueDate.slice(0, 10)
    if (r.template.type === 'income') incomeItems.push({ name, amount, dueDate })
    else if (r.template.type === 'expense') expenseItems.push({ name, amount, dueDate })
  }

  const expectedIncome = incomeItems.reduce((s, i) => s + i.amount, 0)
  const expectedExpenses = expenseItems.reduce((s, i) => s + i.amount, 0)
  const safeToSpend = balance + expectedIncome - expectedExpenses - safetyBuffer

  return {
    currentBalance: balance,
    expectedIncome,
    expectedExpenses,
    safetyBuffer,
    safeToSpend,
    isNegative: safeToSpend < 0,
    incomeItems: incomeItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    expenseItems: expenseItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  }
}

// ─── Legacy tool (kept for chatbot context) ──────────────────────────────────

export interface SafeToSpendInput {
  totalBalance: number
  budgetResult: BudgetResult
  upcomingBillsTotal: number
  savingsGoalTarget: number
  referenceDate: Date
  recurrings?: RecurringTransaction[]
  safetyBuffer?: number
}

export function executeSafeToSpendTool(input: SafeToSpendInput): SafeToSpendResult {
  const recurrings = input.recurrings ?? []
  const safetyBuffer = input.safetyBuffer ?? 0

  const b7  = computeSafeToSpend(input.totalBalance, recurrings, 7,  safetyBuffer, input.referenceDate)
  const b14 = computeSafeToSpend(input.totalBalance, recurrings, 14, safetyBuffer, input.referenceDate)
  const b30 = computeSafeToSpend(input.totalBalance, recurrings, 30, safetyBuffer, input.referenceDate)

  const safeToday     = Math.max(b7.safeToSpend / 7, 0)
  const safeThisWeek  = Math.max(b7.safeToSpend, 0)
  const message       = `You can safely spend ${formatPHPCompact(safeThisWeek)} this week (${formatPHPCompact(safeToday)} today).`
  const warningMessage = b7.isNegative
    ? 'Your upcoming obligations exceed your available balance. Review your recurring expenses.'
    : undefined

  return {
    safeToSpendToday: safeToday,
    safeToSpendThisWeek: safeThisWeek,
    message,
    warningMessage,
    breakdown7: b7,
    breakdown14: b14,
    breakdown30: b30,
  }
}
