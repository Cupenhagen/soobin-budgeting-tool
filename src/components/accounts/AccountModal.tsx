'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { accountRepo } from '@/core/repositories/account-repo'
import { newAccount } from '@/core/models/account'
import { ACCOUNT_TYPE_LABELS, type AccountType } from '@/core/models/enums'
import type { Account } from '@/core/models/account'

interface Props {
  onClose: () => void
  editAccount?: Account
}

const ACCOUNT_TYPES = Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]

export function AccountModal({ onClose, editAccount }: Props) {
  const [name, setName] = useState(editAccount?.name ?? '')
  const [type, setType] = useState<AccountType>(editAccount?.type ?? 'cash')
  const [balance, setBalance] = useState(editAccount ? parseFloat(editAccount.currentBalance).toString() : '0')
  const [creditLimit, setCreditLimit] = useState(editAccount?.creditLimit ?? '')
  const [institution, setInstitution] = useState(editAccount?.institution ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (editAccount) {
        await accountRepo.update({
          ...editAccount,
          name: name.trim(),
          type,
          institution: institution || undefined,
          currentBalance: parseFloat(balance).toString(),
          creditLimit: creditLimit ? parseFloat(creditLimit as string).toString() : undefined,
        })
      } else {
        const acc = newAccount({
          name: name.trim(),
          type,
          institution: institution || undefined,
          currentBalance: parseFloat(balance).toString(),
          creditLimit: creditLimit ? parseFloat(creditLimit as string).toString() : undefined,
        })
        await accountRepo.insert(acc)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editAccount || !confirm('Delete this account?')) return
    await accountRepo.delete(editAccount.id)
    onClose()
  }

  const isCredit = type === 'creditCard' || type === 'loan'

  return (
    <Modal
      title={editAccount ? 'Edit Account' : 'Add Account'}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          {editAccount && <Button variant="danger" onClick={handleDelete}>Delete</Button>}
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={saving} onClick={handleSave}>Save</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input label="Name" placeholder="e.g. GCash, BDO Savings…" value={name} onChange={(e) => setName(e.target.value)} />

        <Select label="Type" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
          {ACCOUNT_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>

        <Input label="Institution (optional)" placeholder="e.g. BDO, BPI…" value={institution} onChange={(e) => setInstitution(e.target.value)} />

        {/* Opening balance only for new accounts — balance is computed from transactions when editing */}
        {!editAccount && (
          <Input
            label={isCredit ? 'Opening Balance Owed (₱)' : 'Opening Balance (₱)'}
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        )}

        {isCredit && (
          <Input
            label="Credit Limit (₱)"
            type="number"
            step="0.01"
            value={creditLimit as string}
            onChange={(e) => setCreditLimit(e.target.value)}
          />
        )}
      </div>
    </Modal>
  )
}
