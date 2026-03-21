export interface SavingsGoal {
  id: string
  name: string
  targetAmount: string
  currentAmount: string
  targetDate?: string
  linkedAccountId?: string
  iconName?: string
  colorHex?: string
  isCompleted: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export function newSavingsGoal(
  partial: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted' | 'currentAmount'>
  & Partial<Pick<SavingsGoal, 'isCompleted' | 'currentAmount'>>
): SavingsGoal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    currentAmount: '0',
    isCompleted: false,
    ...partial,
    createdAt: now,
    updatedAt: now,
  }
}
