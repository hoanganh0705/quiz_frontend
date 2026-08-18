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
