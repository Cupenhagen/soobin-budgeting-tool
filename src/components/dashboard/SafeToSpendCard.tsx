'use client'
import { useState } from 'react'
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Shield } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import { formatPHP } from '@/lib/php-formatter'
import { relativeDay } from '@/lib/date-helpers'
import { computeSafeToSpend, type ProjectionWindow } from '@/core/tools/safe-to-spend-tool'
import type { RecurringTransaction } from '@/core/models/recurring-transaction'

interface Props {
  totalBalance: number
  recurrings: RecurringTransaction[]
  safetyBuffer?: number
}

const WINDOWS: { label: string; value: ProjectionWindow }[] = [
  { label: '7d',  value: 7  },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
]

export function SafeToSpendCard({ totalBalance, recurrings, safetyBuffer = 0 }: Props) {
  const [window, setWindow]     = useState<ProjectionWindow>(7)
  const [expanded, setExpanded] = useState(false)
  const now = new Date()

  const bd = computeSafeToSpend(totalBalance, recurrings, window, safetyBuffer, now)

  return (
    <Card>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-card-title text-[var(--text-primary)]">Safe to Spend</h3>
        {/* Window selector */}
        <div className="flex gap-1 bg-[var(--surface-secondary)] rounded-lg p-0.5">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWindow(w.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                window === w.value
                  ? 'bg-white dark:bg-slate-700 text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Big safe-to-spend number */}
      <div className={`rounded-2xl p-4 mb-3 ${
        bd.isNegative
          ? 'bg-expense/10 border border-expense/20'
          : 'bg-income/10 border border-income/20'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          {bd.isNegative
            ? <AlertTriangle size={16} className="text-expense" />
            : <CheckCircle size={16} className="text-income" />
          }
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {bd.isNegative ? 'Projected shortfall' : `Available next ${window} days`}
          </span>
        </div>
        <p className={`text-3xl font-bold ${bd.isNegative ? 'text-expense' : 'text-income'}`}>
          {bd.isNegative ? '-' : ''}{formatPHP(Math.abs(bd.safeToSpend))}
        </p>
        {bd.isNegative && (
          <p className="text-xs text-expense mt-1">
            Your upcoming expenses exceed your available funds for this period.
          </p>
        )}
      </div>

      {/* Quick summary chips */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[var(--surface-secondary)] rounded-xl p-2.5 text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-0.5">Balance</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{formatPHP(bd.currentBalance)}</p>
        </div>
        <div className="bg-income/10 rounded-xl p-2.5 text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-0.5">+ Income</p>
          <p className="text-sm font-semibold text-income">{formatPHP(bd.expectedIncome)}</p>
        </div>
        <div className="bg-expense/10 rounded-xl p-2.5 text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-0.5">− Expenses</p>
          <p className="text-sm font-semibold text-expense">{formatPHP(bd.expectedExpenses)}</p>
        </div>
      </div>

      {/* Expand toggle */}
      {(bd.incomeItems.length > 0 || bd.expenseItems.length > 0 || safetyBuffer > 0) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-brand font-medium w-full justify-center py-1"
        >
          {expanded ? 'Hide breakdown' : 'Show breakdown'}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}

      {/* Breakdown detail */}
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-[var(--separator)] pt-3">
          {/* Formula row */}
          <div className="text-xs text-[var(--text-secondary)] bg-[var(--surface-secondary)] rounded-xl p-3 font-mono leading-relaxed">
            <span className="text-[var(--text-primary)]">{formatPHP(bd.currentBalance)}</span>
            {' (balance)'}
            {bd.expectedIncome > 0 && <> + <span className="text-income">{formatPHP(bd.expectedIncome)}</span>{' (income)'}</>}
            {bd.expectedExpenses > 0 && <> − <span className="text-expense">{formatPHP(bd.expectedExpenses)}</span>{' (expenses)'}</>}
            {safetyBuffer > 0 && <> − <span className="text-warning">{formatPHP(safetyBuffer)}</span>{' (buffer)'}</>}
            {' = '}
            <span className={bd.isNegative ? 'text-expense' : 'text-income'}>
              {formatPHP(bd.safeToSpend)}
            </span>
          </div>

          {/* Income items */}
          {bd.incomeItems.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp size={12} className="text-income" />
                <span className="text-xs font-semibold text-income">Expected Income</span>
              </div>
              <div className="space-y-1">
                {bd.incomeItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-xs font-medium text-[var(--text-primary)]">{item.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{relativeDay(item.dueDate)}</p>
                    </div>
                    <span className="text-xs font-semibold text-income">+{formatPHP(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense items */}
          {bd.expenseItems.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingDown size={12} className="text-expense" />
                <span className="text-xs font-semibold text-expense">Upcoming Expenses</span>
              </div>
              <div className="space-y-1">
                {bd.expenseItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-xs font-medium text-[var(--text-primary)]">{item.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{relativeDay(item.dueDate)}</p>
                    </div>
                    <span className="text-xs font-semibold text-expense">−{formatPHP(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buffer */}
          {safetyBuffer > 0 && (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-1.5">
                <Shield size={12} className="text-warning" />
                <span className="text-xs font-medium text-[var(--text-primary)]">Safety buffer</span>
              </div>
              <span className="text-xs font-semibold text-warning">−{formatPHP(safetyBuffer)}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
