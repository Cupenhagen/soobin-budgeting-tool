'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { db } from '@/core/database/db'
import { newTransaction } from '@/core/models/transaction'
import { transactionRepo } from '@/core/repositories/transaction-repo'
import { validateTransaction } from '@/core/tools/transaction-tool'
import { toISODate } from '@/lib/date-helpers'
import type { Transaction } from '@/core/models/transaction'
import type { Account } from '@/core/models/account'
import type { Category } from '@/core/models/category'
import { useLiveQuery } from 'dexie-react-hooks'

interface Props {
  onClose: () => void
  editTransaction?: Transaction
}

export function TransactionModal({ onClose, editTransaction }: Props) {
  const accounts   = useLiveQuery(() => db.accounts.toArray().then(r => r.filter(a => !a.isArchived).sort((a,b) => a.sortOrder - b.sortOrder)), [])
  const categories = useLiveQuery(() => db.categories.toArray().then(r => r.filter(c => !c.isHidden).sort((a,b) => a.sortOrder - b.sortOrder)), [])

  const [type, setType] = useState<'expense' | 'income' | 'transfer'>(editTransaction?.type ?? 'expense')
  const [amount, setAmount] = useState(editTransaction ? parseFloat(editTransaction.amount).toString() : '')
  const [categoryId, setCategoryId] = useState(editTransaction?.categoryId ?? '')
  const [accountId, setAccountId] = useState(editTransaction?.accountId ?? '')
  const [destAccountId, setDestAccountId] = useState(editTransaction?.destinationAccountId ?? '')
  const [date, setDate] = useState(editTransaction ? editTransaction.date.slice(0, 10) : toISODate(new Date()))
  const [note, setNote] = useState(editTransaction?.note ?? '')
  const [merchant, setMerchant] = useState(editTransaction?.merchantOrPayee ?? '')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Default to first account
  useEffect(() => {
    if (accounts?.length && !accountId) setAccountId(accounts[0].id)
  }, [accounts, accountId])

  const filteredCategories = (categories ?? []).filter((c) =>
    type === 'transfer' ? false : c.type === type || c.type === 'both'
  )

  const handleSave = async () => {
    const validation = validateTransaction({
      amount: parseFloat(amount),
      type,
      accountId,
      destinationAccountId: type === 'transfer' ? destAccountId : undefined,
      date: new Date(date).toISOString(),
    })
    if (!validation.isValid) { setErrors(validation.errors); return }

    setSaving(true)
    try {
      if (editTransaction) {
        await transactionRepo.update({
          ...editTransaction,
          type,
          amount: parseFloat(amount).toString(),
          categoryId: categoryId || undefined,
          accountId,
          destinationAccountId: type === 'transfer' ? destAccountId : undefined,
          date: new Date(date).toISOString(),
          note: note || undefined,
          merchantOrPayee: merchant || undefined,
        })
      } else {
        const tx = newTransaction({
          type,
          amount: parseFloat(amount).toString(),
          categoryId: categoryId || undefined,
          accountId,
          destinationAccountId: type === 'transfer' ? destAccountId : undefined,
          date: new Date(date).toISOString(),
          note: note || undefined,
          merchantOrPayee: merchant || undefined,
          sourceMetadata: { source: 'manual' },
        })
        await transactionRepo.insert(tx)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={editTransaction ? 'Edit Transaction' : 'Add Transaction'}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={saving} onClick={handleSave}>
            {editTransaction ? 'Save Changes' : 'Add'}
          </Button>
        </div>
      }
    >
      {/* Type selector */}
      <div className="flex rounded-xl overflow-hidden border border-[var(--border)] mb-4">
        {(['expense', 'income', 'transfer'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
              type === t
                ? t === 'income' ? 'bg-income text-white' : t === 'expense' ? 'bg-expense text-white' : 'bg-transfer text-white'
                : 'text-[var(--text-secondary)] hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {errors.length > 0 && (
          <div className="p-3 bg-expense/10 rounded-xl text-xs text-expense space-y-1">
            {errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        <Input
          label="Amount (₱)"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <Select label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {(accounts ?? []).map((a: Account) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>

        {type === 'transfer' && (
          <Select label="To Account" value={destAccountId} onChange={(e) => setDestAccountId(e.target.value)}>
            {(accounts ?? []).filter((a: Account) => a.id !== accountId).map((a: Account) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        )}

        {type !== 'transfer' && (
          <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {filteredCategories.map((c: Category) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        )}

        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Merchant / Payee" placeholder="e.g. Jollibee, Meralco…" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
        <Input label="Note" placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  )
}
