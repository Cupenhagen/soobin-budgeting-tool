import { isSameDay, addDays } from 'date-fns'
import type { RecurringTransaction, PendingRecurringSuggestion } from '../models/recurring-transaction'
import { nextRecurrenceDate } from '../models/enums'
import { toNumber } from '@/lib/php-formatter'

export interface RecurringResult {
  newSuggestions: PendingRecurringSuggestion[]
  updatedRecurrings: RecurringTransaction[]
}

export function executeRecurringTool(
  recurrings: RecurringTransaction[],
  existingSuggestions: PendingRecurringSuggestion[],
  referenceDate: Date
): RecurringResult {
  const newSuggestions: PendingRecurringSuggestion[] = []
  const updatedRecurrings: RecurringTransaction[] = []
  const now = referenceDate

  for (const recurring of recurrings.filter((r) => r.isActive)) {
    const dueDate = new Date(recurring.nextDueDate)
    if (dueDate > now) continue

    const alreadyPending = existingSuggestions.some(
      (s) =>
        s.recurringTransactionId === recurring.id &&
        isSameDay(new Date(s.suggestedDate), dueDate) &&
        s.status === 'pending'
    )

    if (!alreadyPending) {
      const suggestion: PendingRecurringSuggestion = {
        id: crypto.randomUUID(),
        recurringTransactionId: recurring.id,
        suggestedDate: dueDate.toISOString(),
        suggestedAmount: recurring.template.amount,
        status: 'pending',
        createdAt: now.toISOString(),
      }
      newSuggestions.push(suggestion)
    }

    const updated: RecurringTransaction = {
      ...recurring,
      nextDueDate: nextRecurrenceDate(recurring.frequency, dueDate).toISOString(),
      updatedAt: now.toISOString(),
    }
    updatedRecurrings.push(updated)
  }

  return { newSuggestions, updatedRecurrings }
}

export function upcomingBillsTotal(
  recurrings: RecurringTransaction[],
  withinDays: number,
  referenceDate: Date
): number {
  const cutoff = addDays(referenceDate, withinDays)
  return recurrings
    .filter((r) => {
      const due = new Date(r.nextDueDate)
      return r.isActive && r.template.type === 'expense' && due >= referenceDate && due <= cutoff
    })
    .reduce((s, r) => s + toNumber(r.template.amount), 0)
}
