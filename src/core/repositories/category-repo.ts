import { db } from '../database/db'
import { syncUpsert, syncDelete } from '@/lib/cloud-sync'
import type { Category } from '../models/category'

export const categoryRepo = {
  fetchAll:    () => db.categories.toArray(),
  fetchVisible: () => db.categories.toArray().then(r => r.filter(c => !c.isHidden).sort((a, b) => a.sortOrder - b.sortOrder)),
  fetchById:   (id: string) => db.categories.get(id),

  insert: async (cat: Category) => {
    await db.categories.add(cat)
    syncUpsert('categories', cat)
  },
  update: async (cat: Category) => {
    await db.categories.put(cat)
    syncUpsert('categories', cat)
  },
  delete: async (id: string) => {
    await db.categories.delete(id)
    syncDelete('categories', id)
  },
  bulkInsert: async (cats: Category[]) => {
    await db.categories.bulkAdd(cats)
    syncUpsert('categories', cats)
  },
}
