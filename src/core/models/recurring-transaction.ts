import type { TransactionType } from './enums'
import type { RecurrenceFrequency, SuggestionStatus } from './enums'

export interface TransactionTemplate {
  type: TransactionType
  amount: string
  currencyCode: string
  categoryId?: string
  accountId: string
  destinationAccountId?: string
  note?: string
  merchantOrPayee?: string
  tags: string[]
}

export interface RecurringTransaction {
  id: string
  template: TransactionTemplate
  frequency: RecurrenceFrequency
  startDate: string
  endDate?: string
  nextDueDate: string
  isActive: boolean
  autoPost: boolean
  reminderDaysBefore?: number
  createdAt: string
  updatedAt: string
}

export interface PendingRecurringSuggestion {
  id: string
  recurringTransactionId: string
  suggestedDate: string
  suggestedAmount: string
  status: SuggestionStatus
  modifiedAmount?: string
  postedTransactionId?: string
  createdAt: string
}

export function newRecurring(
  partial: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'autoPost'>
  & Partial<Pick<RecurringTransaction, 'isActive' | 'autoPost'>>
): RecurringTransaction {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    isActive: true,
    autoPost: false,
    ...partial,
    createdAt: now,
    updatedAt: now,
  }
}
