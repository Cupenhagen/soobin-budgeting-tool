'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '@/core/database/db'
import { executeBalanceTool } from '@/core/tools/balance-tool'
import { executeBudgetTool } from '@/core/tools/budget-tool'
import { executeSafeToSpendTool } from '@/core/tools/safe-to-spend-tool'
import { executeSavingsGoalTool } from '@/core/tools/savings-goal-tool'
import { executeDebtTool } from '@/core/tools/debt-tool'
import { upcomingBillsTotal } from '@/core/tools/recurring-tool'
import { executeForecastTool } from '@/core/tools/forecast-tool'
import { weekSummary } from '@/core/tools/transaction-tool'
import { startOfMonth } from 'date-fns'

export function useDashboard() {
  const now = useMemo(() => new Date(), [])

  // Use JS-side filter for booleans — IndexedDB stores true/false, not 1/0
  const accounts     = useLiveQuery(() => db.accounts.toArray().then(r => r.filter(a => !a.isArchived)), [])
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().limit(500).toArray(), [])
  const budgets      = useLiveQuery(() => db.budgets.toArray().then(r => r.filter(b => b.isActive)), [])
  const categories   = useLiveQuery(() => db.categories.toArray(), [])
  const goals        = useLiveQuery(() => db.savingsGoals.toArray().then(r => r.filter(g => !g.isCompleted)), [])
  const debts        = useLiveQuery(() => db.debts.toArray().then(r => r.filter(d => d.isActive)), [])
  const recurrings   = useLiveQuery(() => db.recurringTransactions.toArray().then(r => r.filter(t => t.isActive)), [])

  const loading = !accounts || !transactions || !budgets || !categories || !goals || !debts || !recurrings

  const data = useMemo(() => {
    if (loading) return null

    const balanceResult = executeBalanceTool({ transactions, accounts })
    const budgetResult  = executeBudgetTool({ budgets, transactions, categories, referenceDate: now })
    const billsTotal    = upcomingBillsTotal(recurrings, 7, now)
    const goalResults   = goals.map((g) => executeSavingsGoalTool(g, now))
    const savingsContrib = goalResults.reduce((s, r) => s + (r.weeklyRequired ?? 0) * 4, 0)
    const safeToSpend   = executeSafeToSpendTool({ totalBalance: balanceResult.totalBalance, budgetResult, upcomingBillsTotal: billsTotal, savingsGoalTarget: savingsContrib, referenceDate: now })
    const debtResult    = executeDebtTool(debts, now)
    const forecast      = executeForecastTool(transactions, budgets, now)
    const weeklySummary = weekSummary(transactions, now)

    // Calendar heatmap data — current month expenses by day
    const monthStart = startOfMonth(now)
    const calendarData: Record<string, number> = {}
    for (const tx of transactions.filter((t) => t.type === 'expense' && new Date(t.date) >= monthStart)) {
      const day = new Date(tx.date).toISOString().slice(0, 10)
      calendarData[day] = (calendarData[day] ?? 0) + parseFloat(tx.amount)
    }

    const recentTransactions = transactions.slice(0, 20)

    // Coach message
    const coachMessage = budgetResult.overBudgetCategories.length > 0
      ? `You've exceeded your ${budgetResult.overBudgetCategories.slice(0, 2).map((c) => c.categoryName ?? 'budget').join(' and ')} budget. Adjust this week to recover.`
      : budgetResult.warningCategories.length > 0
      ? budgetResult.warningCategories[0].weeklyPacingMessage
      : forecast.coachMessage

    return {
      balanceResult, budgetResult, billsTotal, goalResults,
      safeToSpend, debtResult, forecast, weeklySummary,
      calendarData, recentTransactions, coachMessage,
      accounts, categories,
    }
  }, [loading, accounts, transactions, budgets, categories, goals, debts, recurrings, now])

  return { data, loading }
}
