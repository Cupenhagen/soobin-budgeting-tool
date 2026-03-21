import { db } from './db'
import { DEFAULT_CATEGORIES } from '../models/category'
import { newAccount } from '../models/account'
import { cloudFetch, syncUpsert } from '@/lib/cloud-sync'
import type { Category } from '../models/category'
import type { Account } from '../models/account'

/**
 * On first run: check Supabase for existing data.
 * - If cloud data exists → load it into Dexie (returning user on new browser)
 * - If cloud is empty → seed defaults and push to cloud (brand new user)
 */
export async function seedIfEmpty(userName: string): Promise<void> {
  try {
    // Pull existing cloud data
    const [cloudCategories, cloudAccounts] = await Promise.all([
      cloudFetch<Category>('categories'),
      cloudFetch<Account>('accounts'),
    ])

    if (cloudCategories.length > 0) {
      // Returning user on a fresh browser — restore from cloud
      await Promise.all([
        db.categories.bulkPut(cloudCategories),
        db.accounts.bulkPut(cloudAccounts),
      ])
      return
    }
  } catch (e) {
    console.warn('[seed] cloud check failed, falling back to local seed:', e)
  }

  // Brand new user — seed defaults locally and push to cloud
  const [catCount, accCount] = await Promise.all([
    db.categories.count(),
    db.accounts.count(),
  ])

  if (catCount === 0) {
    const now = new Date().toISOString()
    const categories = DEFAULT_CATEGORIES.map((def, index) => ({
      id: crypto.randomUUID(),
      name: def.name,
      iconName: def.icon,
      colorHex: def.color,
      type: def.type,
      isBuiltIn: true,
      isHidden: false,
      sortOrder: index,
      createdAt: now,
    }))
    await db.categories.bulkAdd(categories)
    syncUpsert('categories', categories)
  }

  if (accCount === 0) {
    // Default accounts are set in onboarding — nothing to seed here
  }
}

/**
 * Full cloud restore — call on every app load after onboarding.
 * Pulls all tables from Supabase into Dexie so useLiveQuery works.
 */
export async function restoreFromCloud(): Promise<void> {
  try {
    const [accounts, transactions, budgets, categories, goals, debts, recurrings] =
      await Promise.all([
        cloudFetch('accounts'),
        cloudFetch('transactions'),
        cloudFetch('budgets'),
        cloudFetch('categories'),
        cloudFetch('savings_goals'),
        cloudFetch('debts'),
        cloudFetch('recurring_transactions'),
      ])

    await Promise.all([
      db.accounts.bulkPut(accounts as never[]),
      db.transactions.bulkPut(transactions as never[]),
      db.budgets.bulkPut(budgets as never[]),
      db.categories.bulkPut(categories as never[]),
      db.savingsGoals.bulkPut(goals as never[]),
      db.debts.bulkPut(debts as never[]),
      db.recurringTransactions.bulkPut(recurrings as never[]),
    ])
  } catch (e) {
    console.warn('[seed] restoreFromCloud failed (offline?):', e)
  }
}
