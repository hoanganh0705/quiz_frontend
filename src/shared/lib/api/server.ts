// Server-side fetch utility for public (no-auth) API calls.
// Use this only in Next.js Server Components / Server Actions.
// For client components, use the apiClient instead.

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export async function serverGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
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
    // next.js server cache — revalidate every 60 seconds
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}
