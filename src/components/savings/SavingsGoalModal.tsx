'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { savingsGoalRepo } from '@/core/repositories/savings-goal-repo'
import { newSavingsGoal } from '@/core/models/savings-goal'
import type { SavingsGoal } from '@/core/models/savings-goal'

export function SavingsGoalModal({ onClose, editGoal }: { onClose: () => void; editGoal?: SavingsGoal }) {
  const [name, setName]           = useState(editGoal?.name ?? '')
  const [target, setTarget]       = useState(editGoal ? parseFloat(editGoal.targetAmount).toString() : '')
  const [current, setCurrent]     = useState(editGoal ? parseFloat(editGoal.currentAmount).toString() : '0')
  const [targetDate, setTargetDate] = useState(editGoal?.targetDate?.slice(0,10) ?? '')
  const [saving, setSaving]       = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !target) return
    setSaving(true)
    try {
      if (editGoal) {
        await savingsGoalRepo.update({ ...editGoal, name: name.trim(), targetAmount: parseFloat(target).toString(), currentAmount: parseFloat(current).toString(), targetDate: targetDate ? new Date(targetDate).toISOString() : undefined })
      } else {
        await savingsGoalRepo.insert(newSavingsGoal({ name: name.trim(), targetAmount: parseFloat(target).toString(), currentAmount: parseFloat(current).toString(), targetDate: targetDate ? new Date(targetDate).toISOString() : undefined }))
      }
      onClose()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!editGoal || !confirm('Delete this goal?')) return
    await savingsGoalRepo.delete(editGoal.id)
    onClose()
  }

  return (
    <Modal
      title={editGoal ? 'Edit Goal' : 'Add Savings Goal'}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          {editGoal && <Button variant="danger" onClick={handleDelete}>Delete</Button>}
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={saving} onClick={handleSave}>Save</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input label="Goal Name" placeholder="e.g. Emergency Fund, Laptop…" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Target Amount (₱)" type="number" step="0.01" min="0" value={target} onChange={(e) => setTarget(e.target.value)} />
        <Input label="Current Amount (₱)" type="number" step="0.01" min="0" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input label="Target Date (optional)" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>
    </Modal>
  )
}
