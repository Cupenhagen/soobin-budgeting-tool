import { db } from '../database/db'
import { syncUpsert, syncDelete } from '@/lib/cloud-sync'
import type { Transaction } from '../models/transaction'

export const transactionRepo = {
  fetchRecent: (limit = 50) => db.transactions.orderBy('date').reverse().limit(limit).toArray(),
  fetchAll:    () => db.transactions.orderBy('date').reverse().toArray(),
  fetchForAccount: (accountId: string) => db.transactions.where('accountId').equals(accountId).reverse().sortBy('date'),
  fetchById:   (id: string) => db.transactions.get(id),

  insert: async (tx: Transaction) => {
    await db.transactions.add(tx)
    syncUpsert('transactions', tx)
  },
  update: async (tx: Transaction) => {
    await db.transactions.put(tx)
    syncUpsert('transactions', tx)
  },
  delete: async (id: string) => {
    await db.transactions.delete(id)
    syncDelete('transactions', id)
  },
}
