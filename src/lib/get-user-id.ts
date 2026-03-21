const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'
export const DEV_USER_ID = 'dev-bypass-user'

/**
 * Returns the current user's ID for use in server-side API routes.
 * In dev bypass mode returns a fixed ID so the app works without Clerk.
 */
export async function getUserId(): Promise<string | null> {
  if (DEV_BYPASS) return DEV_USER_ID
  // Dynamically import so Clerk isn't bundled when bypassed
  const { auth } = await import('@clerk/nextjs/server')
  const { userId } = await auth()
  return userId ?? null
}
