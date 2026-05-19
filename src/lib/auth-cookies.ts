type CookieOptions = {
  days?: number
  path?: string
}

const DEFAULT_COOKIE_DAYS = 7
const DEFAULT_PATH = '/'

export function setAuthToken(token: string, options: CookieOptions = {}) {
  if (typeof document === 'undefined') return

  const days = options.days ?? DEFAULT_COOKIE_DAYS
  const path = options.path ?? DEFAULT_PATH
  const expires = new Date(Date.now() + days * 864e5).toUTCString()

  document.cookie = `auth_token=${encodeURIComponent(token)}; expires=${expires}; path=${path}`
}

export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null

  const match = document.cookie.match(/(?:^|; )auth_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function clearAuthToken(path: string = DEFAULT_PATH) {
  if (typeof document === 'undefined') return

  document.cookie = `auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
}
