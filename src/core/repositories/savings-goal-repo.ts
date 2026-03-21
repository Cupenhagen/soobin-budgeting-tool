import { db } from '../database/db'
import { syncUpsert, syncDelete } from '@/lib/cloud-sync'
import type { SavingsGoal } from '../models/savings-goal'

export const savingsGoalRepo = {
  fetchAll:    () => db.savingsGoals.toArray(),
  fetchActive: () => db.savingsGoals.toArray().then(r => r.filter(g => !g.isCompleted)),
  fetchById:   (id: string) => db.savingsGoals.get(id),

  insert: async (goal: SavingsGoal) => {
    await db.savingsGoals.add(goal)
    syncUpsert('savings_goals', goal)
  },
  update: async (goal: SavingsGoal) => {
    await db.savingsGoals.put(goal)
    syncUpsert('savings_goals', goal)
  },
  delete: async (id: string) => {
    await db.savingsGoals.delete(id)
    syncDelete('savings_goals', id)
  },
}
