import { db } from '../database/db'
import { syncUpsert, syncDelete } from '@/lib/cloud-sync'
import type { DebtBalance } from '../models/debt'

export const debtRepo = {
  fetchAll:    () => db.debts.toArray(),
  fetchActive: () => db.debts.toArray().then(r => r.filter(d => d.isActive)),
  fetchById:   (id: string) => db.debts.get(id),

  insert: async (debt: DebtBalance) => {
    await db.debts.add(debt)
    syncUpsert('debts', debt)
  },
  update: async (debt: DebtBalance) => {
    await db.debts.put(debt)
    syncUpsert('debts', debt)
  },
  delete: async (id: string) => {
    await db.debts.delete(id)
    syncDelete('debts', id)
  },
}
