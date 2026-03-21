import { db } from '../database/db'
import { syncUpsert, syncDelete } from '@/lib/cloud-sync'
import type { Account } from '../models/account'

export const accountRepo = {
  fetchAll:    () => db.accounts.toArray().then(r => r.filter(a => !a.isArchived && !a.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder)),
  fetchActive: () => db.accounts.toArray().then(r => r.filter(a => !a.isArchived && !a.deletedAt)),
  fetchTrashed:() => db.accounts.toArray().then(r => r.filter(a => !!a.deletedAt).sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))),
  fetchById:   (id: string) => db.accounts.get(id),

  insert: async (account: Account) => {
    await db.accounts.add(account)
    syncUpsert('accounts', account)
  },
  update: async (account: Account) => {
    await db.accounts.put(account)
    syncUpsert('accounts', account)
  },
  /** Soft-delete: moves account to Trash (recoverable) */
  softDelete: async (account: Account) => {
    const updated = { ...account, deletedAt: new Date().toISOString() }
    await db.accounts.put(updated)
    syncUpsert('accounts', updated)
  },
  /** Restore from Trash */
  restore: async (account: Account) => {
    const updated = { ...account, deletedAt: undefined }
    await db.accounts.put(updated)
    syncUpsert('accounts', updated)
  },
  /** Permanent hard-delete (only from Trash) */
  hardDelete: async (id: string) => {
    await db.accounts.delete(id)
    syncDelete('accounts', id)
  },
  archive: async (account: Account) => {
    const updated = { ...account, isArchived: true }
    await db.accounts.put(updated)
    syncUpsert('accounts', updated)
  },
  /** Find account by name (for chatbot actions) */
  findByName: async (name: string) => {
    const all = await db.accounts.toArray()
    return all.find(a => !a.deletedAt && a.name.toLowerCase() === name.toLowerCase())
      ?? all.find(a => !a.deletedAt && a.name.toLowerCase().includes(name.toLowerCase()))
  },
}
