type CookieOptions = {
  days?: number
  path?: string
}

/**
 * The function signature of `clearAuthToken`. Exported so it can be
 * used as a dependency-injection type in submit functions and hooks.
 */
export type ClearAuthTokenFn = (path?: string) => void;

const DEFAULT_COOKIE_DAYS = 7
const DEFAULT_PATH = '/'
const AUTH_STATE_EVENT = 'auth-state-change'
const AUTH_TOKEN_NAME = 'auth_token'
const REFRESH_TOKEN_NAME = 'refresh_token'

function notifyAuthStateChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_STATE_EVENT))
}

// ── Server-side utilities (for use in middleware / Server Components) ───────────

/**
 * Read auth_token from a Next.js NextRequest.
 * Safe to use in middleware — does not access document.cookie.
 */
export function getAuthTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_TOKEN_NAME}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

// ── Client-side utilities (accesses document.cookie) ─────────────────────────

/**
 * Read auth_token from document.cookie.
 * Only call this in the browser — never in middleware or server code.
 */
export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${AUTH_TOKEN_NAME}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Set auth_token on the client side.
 *
 * Note: This is intentionally NOT HttpOnly here so that the client can read
 * the token (e.g. for SSR auth checks via useSyncExternalStore).
 * In a fully hardened setup, HttpOnly tokens should be set only by the
 * server via middleware Response cookies, and the client should never need to
 * read the raw token. Consider migrating to that model once the backend
 * supports setting HttpOnly cookies via its login endpoint.
 *
 * SameSite=Lax prevents CSRF while allowing normal navigation.
 * Secure ensures the cookie is only sent over HTTPS.
 */
export function setAuthToken(token: string, options: CookieOptions = {}) {
  if (typeof document === 'undefined') return

  const days = options.days ?? DEFAULT_COOKIE_DAYS
  const path = options.path ?? DEFAULT_PATH
  const expires = new Date(Date.now() + days * 864e5).toUTCString()

  document.cookie = [
    `${AUTH_TOKEN_NAME}=${encodeURIComponent(token)}`,
    `expires=${expires}`,
    `path=${path}`,
    'SameSite=Lax',
    'Secure'
  ].join('; ')
  notifyAuthStateChange()
}

/**
 * Also set a refresh_token cookie alongside the access token.
 * Called after a successful login / token refresh.
 */
export function setRefreshToken(token: string, options: CookieOptions = {}) {
  if (typeof document === 'undefined') return

  const days = options.days ?? 30
  const path = options.path ?? DEFAULT_PATH
  const expires = new Date(Date.now() + days * 864e5).toUTCString()

  document.cookie = [
    `${REFRESH_TOKEN_NAME}=${encodeURIComponent(token)}`,
    `expires=${expires}`,
    `path=${path}`,
    'SameSite=Lax',
    'Secure',
    'HttpOnly' // refresh token is never needed in JS
  ].join('; ')
  notifyAuthStateChange()
}

export function clearAuthToken(path: string = DEFAULT_PATH) {
  if (typeof document === 'undefined') return

  // Clear access token
  document.cookie = `${AUTH_TOKEN_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
  // Clear refresh token
  document.cookie = `${REFRESH_TOKEN_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
  notifyAuthStateChange()
}

export function subscribeToAuthChanges(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener(AUTH_STATE_EVENT, listener)
  window.addEventListener('storage', listener)

  return () => {
    window.removeEventListener(AUTH_STATE_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}
