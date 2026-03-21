import { redirect } from 'next/navigation'

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

export default async function AuthCallbackPage() {
  // In dev bypass mode just go straight to the app
  if (DEV_BYPASS) redirect('/dashboard')

  const { auth, clerkClient } = await import('@clerk/nextjs/server')
  const { isUserApproved } = await import('@/lib/allowlist')

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const user = await client.users.getUser(userId)

  const primaryEmail = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId,
  )?.emailAddress

  const metadata = user.publicMetadata as Record<string, unknown>
  const approved = isUserApproved(primaryEmail, metadata)

  if (approved) {
    if (!metadata.approved) {
      // First-time approval — update metadata then redirect through the
      // refresh page so the client reloads the JWT before hitting the dashboard.
      await client.users.updateUser(userId, {
        publicMetadata: { ...metadata, approved: true },
      })
      redirect('/auth/refreshing')
    }
    redirect('/dashboard')
  } else {
    redirect('/access-denied')
  }
}
