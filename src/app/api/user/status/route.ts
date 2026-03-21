import { NextResponse } from 'next/server'

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

/** GET /api/user/status — returns { onboarding_done: boolean } from Clerk publicMetadata */
export async function GET() {
  if (DEV_BYPASS) return NextResponse.json({ onboarding_done: false })

  try {
    const { auth, clerkClient } = await import('@clerk/nextjs/server')
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ onboarding_done: false })

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const meta = user.publicMetadata as Record<string, unknown>
    return NextResponse.json({ onboarding_done: meta.onboarding_done === true })
  } catch (e) {
    console.error('[/api/user/status GET]', e)
    return NextResponse.json({ onboarding_done: false })
  }
}

/** POST /api/user/status — sets onboarding_done: true in Clerk publicMetadata */
export async function POST() {
  if (DEV_BYPASS) return NextResponse.json({ ok: true })

  try {
    const { auth, clerkClient } = await import('@clerk/nextjs/server')
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const meta = user.publicMetadata as Record<string, unknown>
    await client.users.updateUser(userId, {
      publicMetadata: { ...meta, onboarding_done: true },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[/api/user/status POST]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
