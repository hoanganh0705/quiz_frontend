// Server-side fetch utility for public (no-auth) API calls.
// Use this only in Next.js Server Components / Server Actions.
// For client components, use the apiClient instead.

const BACKEND_URL =
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1`

export type CacheStrategy = {
  /** Seconds to revalidate; undefined means opt out of ISR caching */
  revalidate?: number
  /** Request cache mode (default, no-store, etc.) */
  cache?: RequestCache
}

// Cache profiles for common endpoint types
export const cacheProfiles = {
  /** Stable data that rarely changes (categories, tags) */
  stable: { revalidate: 3600 },
  /** Frequently changing data (leaderboard) */
  frequent: { revalidate: 30 },
  /** User-specific or dynamic data — opt out of ISR */
  dynamic: { revalidate: undefined, cache: 'no-store' }
} as const

export async function serverGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  cache: CacheStrategy = { revalidate: 60 }
): Promise<T> {
  const url = new URL(`${BACKEND_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    ...(cache.revalidate !== undefined
      ? { next: { revalidate: cache.revalidate } }
      : { cache: cache.cache ?? 'no-store' })
  })

  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}
