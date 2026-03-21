import Dexie, { type Table } from 'dexie'
import type { Transaction } from '../models/transaction'
import type { Account } from '../models/account'
import type { Budget } from '../models/budget'
import type { Category } from '../models/category'
import type { SavingsGoal } from '../models/savings-goal'
import type { DebtBalance } from '../models/debt'
import type { RecurringTransaction, PendingRecurringSuggestion } from '../models/recurring-transaction'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  attachedImageData?: string   // base64
  attachedFileName?: string
}

class SoobinDatabase extends Dexie {
  transactions!: Table<Transaction>
  accounts!: Table<Account>
  budgets!: Table<Budget>
  categories!: Table<Category>
  savingsGoals!: Table<SavingsGoal>
  debts!: Table<DebtBalance>
  recurringTransactions!: Table<RecurringTransaction>
  pendingSuggestions!: Table<PendingRecurringSuggestion>
  chatMessages!: Table<ChatMessage>

  constructor() {
    super('soobin')

    this.version(1).stores({
      transactions:         'id, type, accountId, destinationAccountId, categoryId, date, createdAt',
      accounts:             'id, type, sortOrder, isArchived',
      budgets:              'id, categoryId, isActive',
      categories:           'id, type, isBuiltIn, isHidden, sortOrder',
      savingsGoals:         'id, isCompleted',
      debts:                'id, type, isActive',
      recurringTransactions:'id, nextDueDate, isActive',
      pendingSuggestions:   'id, recurringTransactionId, status',
      chatMessages:         'id, timestamp',
    })

    // v2: keep schema in sync with browser (must stay here — never downgrade)
    this.version(2).stores({
      transactions:         'id, type, accountId, destinationAccountId, categoryId, date, createdAt',
      accounts:             'id, type, sortOrder, isArchived',
      budgets:              'id, categoryId, isActive',
      categories:           'id, type, isBuiltIn, isHidden, sortOrder',
      savingsGoals:         'id, isCompleted',
      debts:                'id, type, isActive',
      recurringTransactions:'id, nextDueDate, isActive',
      pendingSuggestions:   'id, recurringTransactionId, status',
      chatMessages:         'id, timestamp',
    })

    // v3: add deletedAt index to accounts for soft-delete / recycle bin
    this.version(3).stores({
      transactions:         'id, type, accountId, destinationAccountId, categoryId, date, createdAt',
      accounts:             'id, type, sortOrder, isArchived, deletedAt',
      budgets:              'id, categoryId, isActive',
      categories:           'id, type, isBuiltIn, isHidden, sortOrder',
      savingsGoals:         'id, isCompleted',
      debts:                'id, type, isActive',
      recurringTransactions:'id, nextDueDate, isActive',
      pendingSuggestions:   'id, recurringTransactionId, status',
      chatMessages:         'id, timestamp',
    })
  }
}

// Singleton — safe to call on every import
export const db = new SoobinDatabase()
