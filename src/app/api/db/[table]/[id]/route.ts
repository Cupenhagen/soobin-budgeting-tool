import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, TABLES, dbTable, type TableName } from '@/lib/supabase-server'
import { getUserId } from '@/lib/get-user-id'

function isAllowed(table: string): table is TableName {
  return TABLES.includes(table as TableName)
}

/** DELETE /api/db/[table]/[id] — delete a single row */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { table: string; id: string } },
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { table, id } = params
  if (!isAllowed(table)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = createServerClient()
  const { error } = await supabase
    .from(dbTable(table))
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
