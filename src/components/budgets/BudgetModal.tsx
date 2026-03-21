'use client'
import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { db } from '@/core/database/db'
import { budgetRepo } from '@/core/repositories/budget-repo'
import { newBudget } from '@/core/models/budget'
import { BUDGET_PERIOD_LABELS, type BudgetPeriod } from '@/core/models/enums'
import type { Budget } from '@/core/models/budget'

const PERIODS = Object.entries(BUDGET_PERIOD_LABELS) as [BudgetPeriod, string][]

export function BudgetModal({ onClose, editBudget }: { onClose: () => void; editBudget?: Budget }) {
  const categories = useLiveQuery(() => db.categories.where('type').anyOf(['expense','both']).sortBy('sortOrder'), [])

  const [categoryId, setCategoryId] = useState(editBudget?.categoryId ?? '')
  const [amount, setAmount] = useState(editBudget ? parseFloat(editBudget.amount).toString() : '')
  const [period, setPeriod] = useState<BudgetPeriod>(editBudget?.period ?? 'monthly')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setSaving(true)
    try {
      if (editBudget) {
        await budgetRepo.update({ ...editBudget, categoryId: categoryId || undefined, amount: parseFloat(amount).toString(), period })
      } else {
        await budgetRepo.insert(newBudget({ categoryId: categoryId || undefined, amount: parseFloat(amount).toString(), period, startDate: new Date().toISOString() }))
      }
      onClose()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!editBudget || !confirm('Delete this budget?')) return
    await budgetRepo.delete(editBudget.id)
    onClose()
  }

  return (
    <Modal
      title={editBudget ? 'Edit Budget' : 'Create Budget'}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          {editBudget && <Button variant="danger" onClick={handleDelete}>Delete</Button>}
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={saving} onClick={handleSave}>Save</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Overall (all categories)</option>
          {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input label="Budget Amount (₱)" type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Select label="Period" value={period} onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}>
          {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>
    </Modal>
  )
}
