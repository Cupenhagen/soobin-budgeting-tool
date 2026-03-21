/**
 * Thin client-side helpers for syncing data to Supabase via API routes.
 * All writes go to Dexie first (immediate UI update), then fire-and-forget here.
 */

export type SyncTable =
  | 'accounts' | 'transactions' | 'budgets' | 'categories'
  | 'savings_goals' | 'debts' | 'recurring_transactions' | 'chat_messages'

/** Upsert one or many records into Supabase (fire-and-forget) */
export function syncUpsert(table: SyncTable, rows: object | object[]) {
  fetch(`/api/db/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  }).catch((e) => console.warn(`[cloud-sync] upsert ${table} failed:`, e))
}

/** Delete a record from Supabase (fire-and-forget) */
export function syncDelete(table: SyncTable, id: string) {
  fetch(`/api/db/${table}/${id}`, { method: 'DELETE' })
    .catch((e) => console.warn(`[cloud-sync] delete ${table}/${id} failed:`, e))
}

/** Pull all data for a table from Supabase */
export async function cloudFetch<T>(table: SyncTable): Promise<T[]> {
  const res = await fetch(`/api/db/${table}`)
  if (!res.ok) throw new Error(`cloudFetch ${table} failed: ${res.status}`)
  return res.json()
}
