import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/access-denied(.*)',
  '/auth/callback(.*)',    // server-side approval check
  '/auth/refreshing(.*)', // client-side JWT reload after first approval
])

// DEV BYPASS: skip all auth when DEV_BYPASS_AUTH=true (server-only env var).
// Remove this before going to production.
const DEV_BYPASS = process.env.DEV_BYPASS_AUTH === 'true'

export default clerkMiddleware(async (auth, req) => {
  if (DEV_BYPASS) return NextResponse.next()
  if (isPublicRoute(req)) return NextResponse.next()

  const { userId, sessionClaims } = await auth()

  if (!userId) {
    const url = new URL('/sign-in', req.url)
    url.searchParams.set('redirect_url', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Fast path: publicMetadata is in the JWT (requires Clerk JWT template customisation —
  // see README). If already approved here, skip the API call.
  const jwtMeta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined
  if (jwtMeta?.approved === true) return NextResponse.next()

  // Fallback: JWT doesn't contain publicMetadata yet (Clerk default).
  // Make one backend API call to check approval directly from Clerk + env allowlist.
  try {
    const { clerkClient } = await import('@clerk/nextjs/server')
    const { isUserApproved } = await import('@/lib/allowlist')

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId,
    )?.emailAddress

    if (isUserApproved(primaryEmail, user.publicMetadata as Record<string, unknown>)) {
      return NextResponse.next()
    }
  } catch (e) {
    console.error('[middleware] approval check failed:', e)
  }

  return NextResponse.redirect(new URL('/access-denied', req.url))
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
