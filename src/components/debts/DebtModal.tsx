'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { debtRepo } from '@/core/repositories/debt-repo'
import { newDebt } from '@/core/models/debt'
import { DEBT_TYPE_LABELS, type DebtType } from '@/core/models/enums'
import type { DebtBalance } from '@/core/models/debt'

const DEBT_TYPES = Object.entries(DEBT_TYPE_LABELS) as [DebtType, string][]

export function DebtModal({ onClose, editDebt }: { onClose: () => void; editDebt?: DebtBalance }) {
  const [name, setName]                 = useState(editDebt?.name ?? '')
  const [type, setType]                 = useState<DebtType>(editDebt?.type ?? 'personalLoan')
  const [principal, setPrincipal]       = useState(editDebt ? parseFloat(editDebt.principalAmount).toString() : '')
  const [balance, setBalance]           = useState(editDebt ? parseFloat(editDebt.currentBalance).toString() : '')
  const [minPayment, setMinPayment]     = useState(editDebt?.minimumPayment ? parseFloat(editDebt.minimumPayment).toString() : '')
  const [dueDay, setDueDay]             = useState(editDebt?.dueDay?.toString() ?? '')
  const [creditor, setCreditor]         = useState(editDebt?.creditorName ?? '')
  const [saving, setSaving]             = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !balance) return
    setSaving(true)
    try {
      const data = {
        name: name.trim(), type,
        principalAmount: parseFloat(principal || balance).toString(),
        currentBalance: parseFloat(balance).toString(),
        minimumPayment: minPayment ? parseFloat(minPayment).toString() : undefined,
        dueDay: dueDay ? parseInt(dueDay) : undefined,
        creditorName: creditor || undefined,
      }
      if (editDebt) {
        await debtRepo.update({ ...editDebt, ...data })
      } else {
        await debtRepo.insert(newDebt(data))
      }
      onClose()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!editDebt || !confirm('Delete this debt?')) return
    await debtRepo.delete(editDebt.id)
    onClose()
  }

  return (
    <Modal
      title={editDebt ? 'Edit Debt' : 'Add Debt'}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          {editDebt && <Button variant="danger" onClick={handleDelete}>Delete</Button>}
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={saving} onClick={handleSave}>Save</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input label="Debt Name" placeholder="e.g. SSS Loan, Utang kay Mama…" value={name} onChange={(e) => setName(e.target.value)} />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value as DebtType)}>
          {DEBT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Input label="Original Amount (₱)" type="number" step="0.01" min="0" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
        <Input label="Current Balance (₱)" type="number" step="0.01" min="0" value={balance} onChange={(e) => setBalance(e.target.value)} />
        <Input label="Minimum Payment (₱, optional)" type="number" step="0.01" min="0" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} />
        <Input label="Due Day of Month (optional)" type="number" min="1" max="31" placeholder="e.g. 5" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        <Input label="Creditor (optional)" placeholder="e.g. BDO, SSS…" value={creditor} onChange={(e) => setCreditor(e.target.value)} />
      </div>
    </Modal>
  )
}
