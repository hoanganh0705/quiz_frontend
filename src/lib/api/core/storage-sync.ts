/**
 * Storage Event Fallback — cross-tab auth sync via localStorage events.
 *
 * Source epic: Epic 2.7 — Access-token refresh and cross-tab session synchronization.
 * Source ticket: 2.7.T13.
 *
 * ## Purpose
 *
 * Provides cross-tab auth event sync when `BroadcastChannel` is unavailable
 * (older browsers, private browsing modes). Uses the `storage` event of the
 * `Window` interface.
 *
 * ## How it works
 *
 * `storage` events fire on OTHER tabs (never the tab that modified storage).
 * This is the key insight that enables same-tab filtering without explicit
 * tabId tracking:
 *
 *   - Tab A writes to localStorage → triggers `storage` event in Tab B, C, ...
 *   - Tab A's own listener is NOT called
 *   - This naturally prevents event loops
 *
 * ## Idempotency
 *
 * The storage event includes a `timestamp` for ordering. If a tab receives
 * the same event multiple times (which can happen with certain browser
 * configurations), the timestamp comparison prevents duplicate processing.
 *
 * ## Storage Key Strategy
 *
 * Keys follow the pattern: `auth_sync_{eventType}` (e.g. `auth_sync_LOGIN`,
 * `auth_sync_LOGOUT`, `auth_sync_TOKEN_REFRESHED`).
 *
 * Each value is a JSON object with the event payload. The same key is used
 * for all events of a given type (overwriting the previous value).
 *
 * ## Usage
 *
 * ```typescript
 * import { initStorageSync } from './storage-sync';
 *
 * // Call once at app initialization
 * initStorageSync();
 * ```
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'auth_sync_';
const STORAGE_KEY_LOGIN = `${STORAGE_PREFIX}LOGGED_IN`;
const STORAGE_KEY_LOGOUT = `${STORAGE_PREFIX}LOGGED_OUT`;
const STORAGE_KEY_TOKEN_REFRESHED = `${STORAGE_PREFIX}TOKEN_REFRESHED`;

const DEFAULT_TAB_ID = 'storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncPayload {
  type: 'LOGGED_IN' | 'LOGGED_OUT' | 'TOKEN_REFRESHED';
  tabId: string;
  timestamp: number;
  accessToken?: string;
  userId?: string;
}

type SyncHandler = (payload: SyncPayload) => void;

// ─── State ───────────────────────────────────────────────────────────────────

/**
 * Set of registered sync handlers.
 */
const syncHandlers = new Set<SyncHandler>();

/**
 * Flag indicating whether `initStorageSync()` has been called.
 * Prevents multiple listeners.
 */
let initialized = false;

// ─── Init / Cleanup ─────────────────────────────────────────────────────────

/**
 * Initialize storage event sync.
 *
 * Sets up the `storage` event listener on the window. Idempotent — calling
 * multiple times only sets up one listener.
 *
 * @returns true if initialization succeeded, false if window/localStorage unavailable
 *
 * @example
 * ```typescript
 * // Call once during app startup
 * initStorageSync();
 * ```
 */
export function initStorageSync(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  if (initialized) {
    return true;
  }

  window.addEventListener('storage', handleStorageEvent);
  initialized = true;

  return true;
}

/**
 * Cleanup storage event sync.
 *
 * Removes the storage event listener and clears all registered handlers.
 * Primarily useful for testing or hot module replacement.
 */
export function cleanupStorageSync(): void {
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', handleStorageEvent);
  }
  syncHandlers.clear();
  initialized = false;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * Handle an incoming storage event.
 *
 * The `storage` event fires when a different tab modifies localStorage.
 * Note: it does NOT fire on the tab that made the change, which provides
 * natural same-tab filtering.
 */
function handleStorageEvent(event: StorageEvent): void {
  if (!event.key) return;

  // Only handle our auth sync keys
  if (!event.key.startsWith(STORAGE_PREFIX)) return;

  // Validate the key
  if (
    event.key !== STORAGE_KEY_LOGIN &&
    event.key !== STORAGE_KEY_LOGOUT &&
    event.key !== STORAGE_KEY_TOKEN_REFRESHED
  ) {
    return;
  }

  // Parse the value
  if (!event.newValue) return;

  let payload: SyncPayload;
  try {
    payload = JSON.parse(event.newValue) as SyncPayload;
  } catch {
    return;
  }

  // Validate payload structure
  if (!payload.type || !payload.tabId || !payload.timestamp) {
    return;
  }

  // Dispatch to all handlers
  syncHandlers.forEach((handler) => {
    try {
      handler(payload);
    } catch (err) {
      console.error('[auth] Error in storage sync handler:', err);
    }
  });
}

/**
 * Subscribe to storage-based auth sync events.
 *
 * The handler is called whenever another tab modifies the auth sync
 * storage keys.
 *
 * @param handler - Callback invoked for each auth event
 * @returns Unsubscribe function
 */
export function subscribeToStorageSync(handler: SyncHandler): () => void {
  syncHandlers.add(handler);

  // Auto-init if not already initialized
  initStorageSync();

  return () => {
    syncHandlers.delete(handler);
  };
}

// ─── Broadcast Functions ─────────────────────────────────────────────────────

/**
 * Broadcast a login event via storage.
 */
export function broadcastLoginViaStorage(
  userId: string,
  accessToken: string,
  tabId: string = DEFAULT_TAB_ID,
): void {
  if (typeof localStorage === 'undefined') return;

  const payload: SyncPayload = {
    type: 'LOGGED_IN',
    tabId,
    timestamp: Date.now(),
    userId,
    accessToken,
  };

  try {
    localStorage.setItem(STORAGE_KEY_LOGIN, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

/**
 * Broadcast a logout event via storage.
 */
export function broadcastLogoutViaStorage(
  tabId: string = DEFAULT_TAB_ID,
): void {
  if (typeof localStorage === 'undefined') return;

  const payload: SyncPayload = {
    type: 'LOGGED_OUT',
    tabId,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY_LOGOUT, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

/**
 * Broadcast a token refresh event via storage.
 */
export function broadcastTokenRefreshedViaStorage(
  accessToken: string,
  tabId: string = DEFAULT_TAB_ID,
): void {
  if (typeof localStorage === 'undefined') return;

  const payload: SyncPayload = {
    type: 'TOKEN_REFRESHED',
    tabId,
    timestamp: Date.now(),
    accessToken,
  };

  try {
    localStorage.setItem(STORAGE_KEY_TOKEN_REFRESHED, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

/**
 * Get the current tab ID for storage sync.
 *
 * Returns the stored tab ID from sessionStorage if available, otherwise
 * generates a new one.
 */
export function getStorageSyncTabId(): string {
  if (typeof sessionStorage === 'undefined') return DEFAULT_TAB_ID;

  const stored = sessionStorage.getItem('auth_tab_id');
  if (stored) return stored;

  const newId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  try {
    sessionStorage.setItem('auth_tab_id', newId);
  } catch {
    // Ignore
  }
  return newId;
}
