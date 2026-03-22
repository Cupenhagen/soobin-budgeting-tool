'use client'
import { useState } from 'react'
import Link from 'next/link'
import { RefreshCw, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import { formatPHP } from '@/lib/php-formatter'
import { relativeDay } from '@/lib/date-helpers'
import { addDays } from 'date-fns'
import type { RecurringTransaction } from '@/core/models/recurring-transaction'
import type { Category } from '@/core/models/category'

interface Props {
  recurrings: RecurringTransaction[]
  categories: Category[]
}

export function RecurringScheduleCard({ recurrings, categories }: Props) {
  const [showAll, setShowAll] = useState(false)
  const now = new Date()
  const cutoff = addDays(now, 30)

  const upcoming = recurrings
    .filter((r) => r.isActive)
    .filter((r) => {
      const due = new Date(r.nextDueDate)
      return due >= now && due <= cutoff
    })
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())

  if (upcoming.length === 0) return null

  const income   = upcoming.filter((r) => r.template.type === 'income')
  const expenses = upcoming.filter((r) => r.template.type === 'expense')

  const totalIncome   = income.reduce((s, r) => s + parseFloat(r.template.amount), 0)
  const totalExpenses = expenses.reduce((s, r) => s + parseFloat(r.template.amount), 0)

  const displayedExpenses = showAll ? expenses : expenses.slice(0, 4)
  const displayedIncome   = showAll ? income   : income.slice(0, 2)

  const catName = (id?: string) => categories.find((c) => c.id === id)?.name ?? ''

  const RecurringItem = ({ r }: { r: RecurringTransaction }) => {
    const isIncome = r.template.type === 'income'
    const name = r.template.merchantOrPayee ?? catName(r.template.categoryId) ?? 'Recurring'
    const due  = r.nextDueDate.slice(0, 10)
    return (
      <div className="flex items-center gap-3 py-2.5 border-b border-[var(--separator)] last:border-0">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isIncome ? 'bg-income/10' : 'bg-expense/10'
        }`}>
          {isIncome
            ? <TrendingUp size={14} className="text-income" />
            : <TrendingDown size={14} className="text-expense" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Calendar size={10} className="text-[var(--text-tertiary)]" />
            <p className="text-xs text-[var(--text-secondary)]">{relativeDay(due)}</p>
            {r.template.categoryId && (
              <span className="text-xs text-[var(--text-tertiary)]">· {catName(r.template.categoryId)}</span>
            )}
          </div>
        </div>
        <AmountDisplay
          amount={parseFloat(r.template.amount)}
          variant={isIncome ? 'income' : 'expense'}
          compact
          size="small"
        />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Recurring Schedule"
        subtitle="Next 30 days"
        action={
          <Link href="/recurring" className="text-xs text-brand font-medium">Manage</Link>
        }
      />

      {/* Monthly summary chips */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-income/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-income" />
            <p className="text-xs text-[var(--text-secondary)]">Monthly income</p>
          </div>
          <p className="text-base font-bold text-income">{formatPHP(totalIncome)}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{income.length} scheduled</p>
        </div>
        <div className="bg-expense/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={12} className="text-expense" />
            <p className="text-xs text-[var(--text-secondary)]">Monthly committed</p>
          </div>
          <p className="text-base font-bold text-expense">{formatPHP(totalExpenses)}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{expenses.length} scheduled</p>
        </div>
      </div>

      {/* Expense items */}
      {displayedExpenses.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
            Upcoming expenses
          </p>
          {displayedExpenses.map((r) => <RecurringItem key={r.id} r={r} />)}
        </div>
      )}

      {/* Income items */}
      {displayedIncome.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1 mt-3">
            Expected income
          </p>
          {displayedIncome.map((r) => <RecurringItem key={r.id} r={r} />)}
        </div>
      )}

      {/* Show more */}
      {(expenses.length > 4 || income.length > 2) && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-brand font-medium w-full text-center pt-2"
        >
          {showAll ? 'Show less' : `Show all ${upcoming.length} recurring`}
        </button>
      )}
    </Card>
  )
}
