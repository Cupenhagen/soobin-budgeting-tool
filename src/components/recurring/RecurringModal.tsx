'use client'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/database/db'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { recurringRepo } from '@/core/repositories/recurring-repo'
import { newRecurring } from '@/core/models/recurring-transaction'
import { nextRecurrenceDate, type RecurrenceFrequencyType } from '@/core/models/enums'
import type { RecurringTransaction, TransactionTemplate } from '@/core/models/recurring-transaction'
import type { TransactionType } from '@/core/models/enums'

interface Props {
  onClose: () => void
  edit?: RecurringTransaction
}

const FREQ_LABELS: { value: RecurrenceFrequencyType; label: string }[] = [
  { value: 'daily',     label: 'Daily' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'biweekly',  label: 'Every 2 Weeks' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'yearly',    label: 'Yearly' },
]

export function RecurringModal({ onClose, edit }: Props) {
  const accounts   = useLiveQuery(() => db.accounts.toArray().then(a => a.filter(x => !x.deletedAt && !x.isArchived)), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const today = new Date().toISOString().slice(0, 10)

  const [description, setDescription] = useState(edit?.template.merchantOrPayee ?? '')
  const [amount,      setAmount]       = useState(edit ? parseFloat(edit.template.amount).toString() : '')
  const [txType,      setTxType]       = useState<TransactionType>(edit?.template.type ?? 'expense')
  const [categoryId,  setCategoryId]   = useState(edit?.template.categoryId ?? '')
  const [accountId,   setAccountId]    = useState(edit?.template.accountId ?? '')
  const [freqType,    setFreqType]     = useState<RecurrenceFrequencyType>(edit?.frequency.type ?? 'monthly')
  const [startDate,   setStartDate]    = useState(edit?.startDate ?? today)
  const [endDate,     setEndDate]      = useState(edit?.endDate ?? '')
  const [autoPost,    setAutoPost]     = useState(edit?.autoPost ?? false)
  const [saving,      setSaving]       = useState(false)

  // Build RecurrenceFrequency from selected type + startDate
  const buildFrequency = () => {
    const d = new Date(startDate)
    switch (freqType) {
      case 'weekly':   return { type: freqType, dayOfWeek: d.getDay() }
      case 'biweekly': return { type: freqType, dayOfWeek: d.getDay() }
      case 'monthly':  return { type: freqType, dayOfMonth: d.getDate() }
      case 'yearly':   return { type: freqType, month: d.getMonth() + 1, day: d.getDate() }
      default:         return { type: freqType }
    }
  }

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0 || !accountId) return
    setSaving(true)
    try {
      const freq      = buildFrequency()
      const startDt   = new Date(startDate)
      const nextDue   = nextRecurrenceDate(freq, startDt)

      const template: TransactionTemplate = {
        type: txType,
        amount: amt.toFixed(2),
        currencyCode: 'PHP',
        accountId,
        categoryId: categoryId || undefined,
        merchantOrPayee: description.trim() || undefined,
        tags: [],
      }

      if (edit) {
        const updated: RecurringTransaction = {
          ...edit,
          template,
          frequency: freq,
          startDate,
          endDate: endDate || undefined,
          autoPost,
          nextDueDate: edit.nextDueDate, // keep existing due date when editing
          updatedAt: new Date().toISOString(),
        }
        await recurringRepo.update(updated)
      } else {
        const rt = newRecurring({
          template,
          frequency: freq,
          startDate,
          endDate: endDate || undefined,
          nextDueDate: startDt <= new Date() ? nextDue.toISOString() : startDt.toISOString(),
          autoPost,
        })
        await recurringRepo.insert(rt)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!edit || !confirm('Stop this recurring transaction?')) return
    const paused: RecurringTransaction = { ...edit, isActive: false, updatedAt: new Date().toISOString() }
    await recurringRepo.update(paused)
    onClose()
  }

  return (
    <Modal title={edit ? 'Edit Recurring' : 'New Recurring'} onClose={onClose}>
      <div className="space-y-4">
        <Input
          label="Description"
          placeholder="e.g. Netflix, Rent, Salary"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Type toggle */}
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">Type</p>
          <div className="flex gap-2">
            {(['expense','income'] as TransactionType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTxType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  txType === t
                    ? t === 'income' ? 'bg-income text-white' : 'bg-expense text-white'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Amount"
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">No category</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <Select label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Select account…</option>
          {(accounts ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>

        <Select label="Frequency" value={freqType} onChange={(e) => setFreqType(e.target.value as RecurrenceFrequencyType)}>
          {FREQ_LABELS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </Select>

        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <Input
          label="End Date (optional)"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {/* Auto-post toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setAutoPost(!autoPost)}
            className={`w-10 h-6 rounded-full transition-colors ${autoPost ? 'bg-income' : 'bg-[var(--surface-secondary)]'} relative`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${autoPost ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm text-[var(--text-primary)]">Auto-post when due</span>
        </label>

        <div className="flex gap-2 pt-2">
          {edit && (
            <Button variant="ghost" className="text-expense" onClick={handleDelete}>
              {edit.isActive ? 'Pause' : 'Resume'}
            </Button>
          )}
          <Button className="flex-1" loading={saving} disabled={!amount || !accountId} onClick={handleSave}>
            {edit ? 'Save Changes' : 'Add Recurring'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
