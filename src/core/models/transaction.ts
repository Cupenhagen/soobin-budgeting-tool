import type { TransactionType, TransactionSource } from './enums'

export interface TransactionSourceMetadata {
  source: TransactionSource
  importSessionId?: string
  rawText?: string
  confidence?: number
  createdBy?: string
}

export interface Transaction {
  id: string
  type: TransactionType
  /** Always positive; type determines sign */
  amount: string          // stored as string for IndexedDB precision
  currencyCode: string    // 'PHP'
  categoryId?: string
  accountId: string
  destinationAccountId?: string
  date: string            // ISO string
  note?: string
  merchantOrPayee?: string
  tags: string[]
  isRecurringInstance: boolean
  recurringTransactionId?: string
  sourceMetadata?: TransactionSourceMetadata
  createdAt: string
  updatedAt: string
}

export function newTransaction(
  partial: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'currencyCode' | 'tags' | 'isRecurringInstance'>
  & Partial<Pick<Transaction, 'tags' | 'isRecurringInstance'>>
): Transaction {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    currencyCode: 'PHP',
    tags: [],
    isRecurringInstance: false,
    ...partial,
    createdAt: now,
    updatedAt: now,
  }
}
