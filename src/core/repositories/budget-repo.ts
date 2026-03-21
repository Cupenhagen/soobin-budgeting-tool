import { db } from '../database/db'
import { syncUpsert, syncDelete } from '@/lib/cloud-sync'
import type { Budget } from '../models/budget'

export const budgetRepo = {
  fetchAll:    () => db.budgets.toArray(),
  fetchActive: () => db.budgets.toArray().then(r => r.filter(b => b.isActive)),
  fetchById:   (id: string) => db.budgets.get(id),

  insert: async (budget: Budget) => {
    await db.budgets.add(budget)
    syncUpsert('budgets', budget)
  },
  update: async (budget: Budget) => {
    await db.budgets.put(budget)
    syncUpsert('budgets', budget)
  },
  delete: async (id: string) => {
    await db.budgets.delete(id)
    syncDelete('budgets', id)
  },
}
