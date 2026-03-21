'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/database/db'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatPHP } from '@/lib/php-formatter'
import { startOfMonth, endOfMonth } from 'date-fns'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { CHART_COLORS } from '@/lib/constants'

export default function ReportsPage() {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd   = endOfMonth(now)

  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const categories   = useLiveQuery(() => db.categories.toArray(), [])

  const monthlyTx = (transactions ?? []).filter((t) => {
    const d = new Date(t.date)
    return d >= monthStart && d <= monthEnd
  })

  const totalIncome   = monthlyTx.filter((t) => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
  const totalExpenses = monthlyTx.filter((t) => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)

  // Spending by category
  const byCategory: Record<string, { name: string; total: number; color: string }> = {}
  for (const tx of monthlyTx.filter((t) => t.type === 'expense')) {
    const cat = (categories ?? []).find((c) => c.id === tx.categoryId)
    const key = cat?.id ?? 'other'
    if (!byCategory[key]) byCategory[key] = { name: cat?.name ?? 'Other', total: 0, color: cat?.colorHex ?? '#A9A9A9' }
    byCategory[key].total += parseFloat(tx.amount)
  }
  const pieData = Object.values(byCategory).sort((a, b) => b.total - a.total).slice(0, 8)

  // Daily spending
  const dailyMap: Record<string, number> = {}
  for (const tx of monthlyTx.filter((t) => t.type === 'expense')) {
    const day = new Date(tx.date).toISOString().slice(0, 10)
    dailyMap[day] = (dailyMap[day] ?? 0) + parseFloat(tx.amount)
  }
  const barData = Object.entries(dailyMap).sort().map(([d, amt]) => ({
    day: new Date(d).getDate().toString(),
    amount: amt,
  }))

  return (
    <div className="max-w-2xl mx-auto px-m py-m space-y-m">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Reports</h1>

      {/* Monthly summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-[var(--text-secondary)] mb-1">Income</p>
          <p className="text-lg font-bold text-income">{formatPHP(totalIncome)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-secondary)] mb-1">Expenses</p>
          <p className="text-lg font-bold text-expense">{formatPHP(totalExpenses)}</p>
        </Card>
      </div>

      {/* Spending by category */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader title="Spending by Category" subtitle={now.toLocaleString('en-PH', { month: 'long', year: 'numeric' })} />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatPHP(v)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Daily spending */}
      {barData.length > 0 && (
        <Card>
          <CardHeader title="Daily Spending" />
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatPHP(v)} />
              <Bar dataKey="amount" fill="#7C3AED" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
