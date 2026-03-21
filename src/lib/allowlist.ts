/**
 * Access control helpers.
 *
 * An account is considered approved if ANY of the following are true:
 *  1. Their primary email is in the APPROVED_EMAILS env var (comma-separated).
 *  2. Their Clerk publicMetadata has { approved: true }
 *     (set this via Clerk Dashboard → Users → select user → publicMetadata).
 *
 * To REVOKE access: remove the email from APPROVED_EMAILS *and* set
 * publicMetadata { approved: false } in the Clerk Dashboard.
 */

/** Check whether an email address is on the server-side allowlist. */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false
  const raw = process.env.APPROVED_EMAILS ?? ''
  if (!raw.trim()) return false
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase())
}

/** Check the publicMetadata flag (set manually via Clerk Dashboard or API). */
export function isMetadataApproved(
  publicMetadata: Record<string, unknown> | null | undefined,
): boolean {
  return publicMetadata?.approved === true
}

/** Combined check — either condition grants access. */
export function isUserApproved(
  email: string | null | undefined,
  publicMetadata: Record<string, unknown> | null | undefined,
): boolean {
  return isEmailAllowed(email) || isMetadataApproved(publicMetadata)
}
