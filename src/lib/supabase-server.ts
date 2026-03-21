import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using the service role key.
 * Only use in API routes — never expose the service role key to the browser.
 */
export function createServerClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key, { auth: { persistSession: false } })
}

export const TABLES = [
  'accounts',
  'transactions',
  'budgets',
  'categories',
  'savings_goals',
  'debts',
  'recurring_transactions',
  'chat_messages',
] as const

export type TableName = typeof TABLES[number]

export function dbTable(name: TableName) {
  return `soobin_${name}`
}
