import type { DebtType } from './enums'

export interface DebtBalance {
  id: string
  name: string
  type: DebtType
  principalAmount: string
  currentBalance: string
  interestRateAnnual?: string
  minimumPayment?: string
  dueDay?: number           // day of month
  linkedAccountId?: string
  creditorName?: string
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function newDebt(
  partial: Omit<DebtBalance, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>
  & Partial<Pick<DebtBalance, 'isActive'>>
): DebtBalance {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    isActive: true,
    ...partial,
    createdAt: now,
    updatedAt: now,
  }
}
