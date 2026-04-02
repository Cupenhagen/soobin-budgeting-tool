/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-instance deployments (Vercel serverless resets between cold starts,
 * so this is best-effort — upgrade to Redis/Upstash for stricter enforcement).
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Periodically clean up stale entries to prevent memory leaks
const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  const cutoff = now - windowMs
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
    if (entry.timestamps.length === 0) store.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs: number | null
}

/**
 * Check whether a request is allowed under the rate limit.
 * @param key   Unique identifier (e.g. userId or IP)
 * @param limit Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  cleanup(windowMs)

  const now = Date.now()
  const cutoff = now - windowMs
  let entry = store.get(key)

  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0]
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: oldest + windowMs - now,
    }
  }

  entry.timestamps.push(now)
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    retryAfterMs: null,
  }
}
