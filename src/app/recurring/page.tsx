'use client'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, RefreshCw, Bell } from 'lucide-react'
import { db } from '@/core/database/db'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import { recurrenceLabel } from '@/core/models/enums'
import { relativeDay } from '@/lib/date-helpers'

export default function RecurringPage() {
  const recurrings    = useLiveQuery(() => db.recurringTransactions.toArray().then(r => r.filter(t => t.isActive)), [])
  const suggestions   = useLiveQuery(() => db.pendingSuggestions.where('status').equals('pending').toArray(), [])
  const categories    = useLiveQuery(() => db.categories.toArray(), [])

  return (
    <div className="max-w-2xl mx-auto px-m py-m">
      <div className="flex items-center justify-between mb-m">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Recurring</h1>
      </div>

      {/* Pending suggestions */}
      {(suggestions ?? []).length > 0 && (
        <div className="bg-warning/10 rounded-card p-m mb-m">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={16} className="text-warning" />
            <span className="font-semibold text-sm text-[var(--text-primary)]">{suggestions?.length} pending review</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">You have recurring transactions ready to be posted.</p>
        </div>
      )}

      {!recurrings || recurrings.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No recurring transactions"
          description="Set up recurring templates for bills, subscriptions, and salary."
        />
      ) : (
        <div className="space-y-3">
          {recurrings.map((r) => {
            const cat = (categories ?? []).find((c) => c.id === r.template.categoryId)
            return (
              <Card key={r.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{r.template.merchantOrPayee ?? cat?.name ?? r.template.note ?? 'Recurring'}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{recurrenceLabel(r.frequency)} · Next: {relativeDay(r.nextDueDate)}</p>
                  </div>
                  <AmountDisplay amount={parseFloat(r.template.amount)} variant={r.template.type === 'income' ? 'income' : 'expense'} compact />
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
