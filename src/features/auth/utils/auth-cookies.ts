type CookieOptions = {
days?: number
path?: string
}

export type ClearAuthTokenFn = (path?: string) => void;

const DEFAULT_COOKIE_DAYS = 7
const DEFAULT_PATH = '/'
const AUTH_STATE_EVENT = 'auth-state-change'
const AUTH_TOKEN_NAME = 'auth_token'
const REFRESH_TOKEN_NAME = 'refresh_token'

const STORAGE_SYNC_TOKEN_REFRESHED = 'auth_sync_TOKEN_REFRESHED'
const STORAGE_SYNC_LOGGED_OUT = 'auth_sync_LOGGED_OUT'
const STORAGE_SYNC_LOGGED_IN = 'auth_sync_LOGGED_IN'

function decodeBase64(input: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64').toString()
  }
  if (typeof atob === 'function') {
    return atob(input)
  }
  throw new Error('No base64 decoder available')
}

function notifyAuthStateChange() {
if (typeof window === 'undefined') return
window.dispatchEvent(new Event(AUTH_STATE_EVENT))
}

function writeSyncPayload(key: string, payload: Record<string, unknown>) {
if (typeof localStorage === 'undefined') return
try {
localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function getAuthTokenFromRequest(request: Request): string | null {
const cookieHeader = request.headers.get('cookie') ?? ''
const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_TOKEN_NAME}=([^;]*)`))
return match ? decodeURIComponent(match[1]) : null
}

/**
 * Lightweight session-eligibility check for server-side route gating.
 *
 * This is NOT authentication. It only determines whether the request has
 * a structurally valid, non-expired token cookie. The backend remains
 * the authoritative verifier on every protected API call.
 *
 * Use this only for early UI eligibility decisions (e.g. redirecting
 * before rendering a protected layout). Never treat its return value
 * as proof that a user is authenticated or authorized.
 */
export function hasUsableSession(request: Request): boolean {
const token = getAuthTokenFromRequest(request)
if (!token) return false

const parts = token.split('.')
if (parts.length !== 3) return false

try {
const payloadPart = parts[1].replace(/-/g, '+').replace(/_/g, '/')
const payload = JSON.parse(decodeBase64(payloadPart)) as { exp?: unknown }

if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
const expiryMs = payload.exp * 1000
if (Date.now() >= expiryMs) return false
}

return true
  } catch {
return false
  }
}

export function getAuthToken(): string | null {
if (typeof document === 'undefined') return null
const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${AUTH_TOKEN_NAME}=([^;]*)`))
return match ? decodeURIComponent(match[1]) : null
}

export function setAuthToken(token: string, options: CookieOptions = {}) {
if (typeof document === 'undefined') return

const days = options.days ?? DEFAULT_COOKIE_DAYS
const path = options.path ?? DEFAULT_PATH
const expires = new Date(Date.now() + days * 864e5).toUTCString()

const isSecure = window.location.protocol === 'https:'

const cookieParts = [
`${AUTH_TOKEN_NAME}=${encodeURIComponent(token)}`,
`expires=${expires}`,
`path=${path}`,
'SameSite=Lax',
  ]

if (isSecure) {
cookieParts.push('Secure')
  }

document.cookie = cookieParts.join('; ')

writeSyncPayload(STORAGE_SYNC_TOKEN_REFRESHED, {
type: 'TOKEN_REFRESHED',
accessToken: token,
timestamp: Date.now(),
tabId: 'cookie-sync',
  })

notifyAuthStateChange()
}

export function setRefreshToken(token: string, options: CookieOptions = {}) {
if (typeof document === 'undefined') return

const days = options.days ?? 30
const path = options.path ?? DEFAULT_PATH
const expires = new Date(Date.now() + days * 864e5).toUTCString()

const isSecure = window.location.protocol === 'https:'

const cookieParts = [
`${REFRESH_TOKEN_NAME}=${encodeURIComponent(token)}`,
`expires=${expires}`,
`path=${path}`,
'SameSite=Lax',
'HttpOnly', // refresh token is never needed in JS
  ]

if (isSecure) {
cookieParts.push('Secure')
  }

document.cookie = cookieParts.join('; ')
notifyAuthStateChange()
}

export function clearAuthToken(path: string = DEFAULT_PATH) {
if (typeof document === 'undefined') return

document.cookie = `${AUTH_TOKEN_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`

document.cookie = `${REFRESH_TOKEN_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`

writeSyncPayload(STORAGE_SYNC_LOGGED_OUT, {
type: 'LOGGED_OUT',
timestamp: Date.now(),
tabId: 'cookie-sync',
  })

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

export function writeLoginSync(userId: string, accessToken: string): void {
writeSyncPayload(STORAGE_SYNC_LOGGED_IN, {
type: 'LOGGED_IN',
userId,
accessToken,
timestamp: Date.now(),
tabId: 'cookie-sync',
  })
}
