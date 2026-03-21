'use client'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, PiggyBank } from 'lucide-react'
import { db } from '@/core/database/db'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import { SavingsGoalModal } from '@/components/savings/SavingsGoalModal'
import { executeSavingsGoalTool } from '@/core/tools/savings-goal-tool'
import type { SavingsGoal } from '@/core/models/savings-goal'

export default function SavingsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null)

  const goals = useLiveQuery(() => db.savingsGoals.toArray(), [])
  const results = (goals ?? []).map((g) => executeSavingsGoalTool(g, new Date()))

  return (
    <div className="max-w-2xl mx-auto px-m py-m">
      <div className="flex items-center justify-between mb-m">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Savings Goals</h1>
        <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-full bg-brand flex items-center justify-center">
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No savings goals yet"
          description="Set a goal and track your progress toward it."
          action={{ label: 'Add Goal', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <Card key={r.goal.id} onClick={() => setEditGoal(r.goal)}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{r.goal.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{Math.round(r.progress * 100)}% complete</p>
                </div>
                <div className="text-right">
                  <AmountDisplay amount={parseFloat(r.goal.currentAmount)} compact />
                  <p className="text-xs text-[var(--text-secondary)]">of <span className="font-medium">{new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP', minimumFractionDigits:0 }).format(parseFloat(r.goal.targetAmount))}</span></p>
                </div>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(r.progress * 100, 100)}%` }} />
              </div>
              {r.impactMessage && <p className="text-xs text-brand mt-2 italic">{r.impactMessage}</p>}
            </Card>
          ))}
        </div>
      )}

      {(showAdd || editGoal) && (
        <SavingsGoalModal onClose={() => { setShowAdd(false); setEditGoal(null) }} editGoal={editGoal ?? undefined} />
      )}
    </div>
  )
}
