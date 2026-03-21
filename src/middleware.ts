import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/access-denied(.*)',
  '/auth/callback(.*)',    // server-side approval check
  '/auth/refreshing(.*)', // client-side JWT reload after first approval
])

// DEV BYPASS: skip all auth when NEXT_PUBLIC_DEV_BYPASS_AUTH=true
// Remove this before going to production.
const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

export default clerkMiddleware(async (auth, req) => {
  if (DEV_BYPASS) return NextResponse.next()
  if (isPublicRoute(req)) return NextResponse.next()

  const { userId, sessionClaims } = await auth()

  if (!userId) {
    const url = new URL('/sign-in', req.url)
    url.searchParams.set('redirect_url', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  const metadata = sessionClaims?.publicMetadata as Record<string, unknown> | undefined
  const isApproved = metadata?.approved === true

  if (!isApproved) {
    return NextResponse.redirect(new URL('/access-denied', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
