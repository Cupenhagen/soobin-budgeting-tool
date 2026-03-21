import type { AccountType } from './enums'

export interface Account {
  id: string
  name: string
  type: AccountType
  institution?: string
  /** Stored as string for precision */
  currentBalance: string
  isBalanceManual: boolean
  iconName?: string
  colorHex?: string
  isArchived: boolean
  sortOrder: number
  creditLimit?: string
  statementDay?: number
  dueDay?: number
  createdAt: string
  updatedAt: string
}

export function newAccount(
  partial: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'sortOrder' | 'isBalanceManual' | 'currentBalance'>
  & Partial<Pick<Account, 'isArchived' | 'sortOrder' | 'isBalanceManual' | 'currentBalance'>>
): Account {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    currentBalance: '0',
    isBalanceManual: true,
    isArchived: false,
    sortOrder: 0,
    ...partial,
    createdAt: now,
    updatedAt: now,
  }
}
