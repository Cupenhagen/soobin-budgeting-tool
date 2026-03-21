import { db } from '../database/db'
import { syncUpsert, syncDelete } from '@/lib/cloud-sync'
import type { RecurringTransaction, PendingRecurringSuggestion } from '../models/recurring-transaction'

export const recurringRepo = {
  fetchAll:    () => db.recurringTransactions.toArray(),
  fetchActive: () => db.recurringTransactions.toArray().then(r => r.filter(t => t.isActive)),
  fetchById:   (id: string) => db.recurringTransactions.get(id),

  insert: async (rt: RecurringTransaction) => {
    await db.recurringTransactions.add(rt)
    syncUpsert('recurring_transactions', rt)
  },
  update: async (rt: RecurringTransaction) => {
    await db.recurringTransactions.put(rt)
    syncUpsert('recurring_transactions', rt)
  },
  delete: async (id: string) => {
    await db.recurringTransactions.delete(id)
    syncDelete('recurring_transactions', id)
  },

  // Pending suggestions
  fetchPending: () => db.pendingSuggestions.toArray(),
  insertSuggestion: (s: PendingRecurringSuggestion) => db.pendingSuggestions.add(s),
  updateSuggestion: (s: PendingRecurringSuggestion) => db.pendingSuggestions.put(s),
  deleteSuggestion: (id: string) => db.pendingSuggestions.delete(id),
}
