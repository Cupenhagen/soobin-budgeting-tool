import { db } from '../database/db'
import { syncUpsert, syncDelete } from '@/lib/cloud-sync'
import type { Account } from '../models/account'

export const accountRepo = {
  fetchAll:    () => db.accounts.toArray().then(r => r.filter(a => !a.isArchived).sort((a, b) => a.sortOrder - b.sortOrder)),
  fetchActive: () => db.accounts.toArray().then(r => r.filter(a => !a.isArchived)),
  fetchById:   (id: string) => db.accounts.get(id),

  insert: async (account: Account) => {
    await db.accounts.add(account)
    syncUpsert('accounts', account)
  },
  update: async (account: Account) => {
    await db.accounts.put(account)
    syncUpsert('accounts', account)
  },
  delete: async (id: string) => {
    await db.accounts.delete(id)
    syncDelete('accounts', id)
  },
  archive: async (account: Account) => {
    const updated = { ...account, isArchived: true }
    await db.accounts.put(updated)
    syncUpsert('accounts', updated)
  },
}
