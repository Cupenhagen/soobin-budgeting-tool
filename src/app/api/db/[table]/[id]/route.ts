import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, TABLES, dbTable, type TableName } from '@/lib/supabase-server'
import { getUserId } from '@/lib/get-user-id'
import { rateLimit } from '@/lib/rate-limit'

function isAllowed(table: string): table is TableName {
  return TABLES.includes(table as TableName)
}

/** DELETE /api/db/[table]/[id] — delete a single row */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> },
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 30 deletes per minute per user
  const rl = rateLimit(`db-write:${userId}`, 30, 60_000)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { table, id } = await params
  if (!isAllowed(table)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = createServerClient()
  const { error } = await supabase
    .from(dbTable(table))
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error(`[api/db/${table}/${id}] DELETE error:`, error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
