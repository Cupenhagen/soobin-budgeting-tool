import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, TABLES, dbTable, type TableName } from '@/lib/supabase-server'
import { getUserId } from '@/lib/get-user-id'

function isAllowed(table: string): table is TableName {
  return TABLES.includes(table as TableName)
}

/** GET /api/db/[table] — fetch all rows for the current user */
export async function GET(
  _req: NextRequest,
  { params }: { params: { table: string } },
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { table } = params
  if (!isAllowed(table)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from(dbTable(table))
    .select('data')
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data.map((r) => r.data))
}

/** POST /api/db/[table] — upsert one or many rows for the current user */
export async function POST(
  req: NextRequest,
  { params }: { params: { table: string } },
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { table } = params
  if (!isAllowed(table)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const rows = (Array.isArray(body) ? body : [body]) as Array<{ id: string }>

  const supabase = createServerClient()
  const { error } = await supabase
    .from(dbTable(table))
    .upsert(rows.map((r) => ({ id: r.id, user_id: userId, data: r })), { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
