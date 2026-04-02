import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, TABLES, dbTable, type TableName } from '@/lib/supabase-server'
import { getUserId } from '@/lib/get-user-id'
import { rateLimit } from '@/lib/rate-limit'

const MAX_ROWS = 100

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

  // Rate limit: 60 reads per minute per user
  const rl = rateLimit(`db-read:${userId}`, 60, 60_000)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { table } = params
  if (!isAllowed(table)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from(dbTable(table))
    .select('data')
    .eq('user_id', userId)

  if (error) {
    console.error(`[api/db/${table}] GET error:`, error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  return NextResponse.json(data.map((r) => r.data))
}

/** POST /api/db/[table] — upsert one or many rows for the current user */
export async function POST(
  req: NextRequest,
  { params }: { params: { table: string } },
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 30 writes per minute per user
  const rl = rateLimit(`db-write:${userId}`, 30, 60_000)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { table } = params
  if (!isAllowed(table)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rows = Array.isArray(body) ? body : [body]

  if (rows.length === 0) return NextResponse.json({ error: 'Empty payload' }, { status: 400 })
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 })

  for (const row of rows) {
    if (typeof row !== 'object' || row === null || typeof (row as Record<string, unknown>).id !== 'string') {
      return NextResponse.json({ error: 'Each row must be an object with a string "id"' }, { status: 400 })
    }
  }

  const validRows = rows as Array<{ id: string }>
  const supabase = createServerClient()
  const { error } = await supabase
    .from(dbTable(table))
    .upsert(validRows.map((r) => ({ id: r.id, user_id: userId, data: r })), { onConflict: 'id' })

  if (error) {
    console.error(`[api/db/${table}] POST error:`, error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
