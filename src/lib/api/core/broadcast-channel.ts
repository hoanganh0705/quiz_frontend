/**
 * Broadcast Channel Manager — centralized cross-tab auth event handling.
 *
 * Source epic: Epic 2.7 — Access-token refresh and cross-tab session synchronization.
 * Source tickets: 2.7.T10, 2.7.T11, 2.7.T12.
 *
 * ## Purpose
 *
 * Centralizes `BroadcastChannel` creation, event handling, and message typing
 * in a single module. Before this, the broadcast logic was scattered across
 * `custom-instance.ts` and `auth.service.ts`.
 *
 * ## Design
 *
 * - **Singleton channel**: `getAuthChannel()` returns the same `BroadcastChannel`
 *   instance on every call, preventing duplicate listeners.
 * - **Typed messages**: All auth events are typed as a union, preventing typos.
 * - **Same-tab filtering**: Each tab has a unique `tabId` so it can ignore its own
 *   broadcasts (preventing event loops).
 * - **Graceful degradation**: Falls back gracefully when `BroadcastChannel` is
 *   unavailable (older browsers, private browsing).
 * - **External subscribers**: Other code can subscribe to auth events via
 *   `subscribeToAuthEvents()` without coupling to the internals.
 *
 * ## Message Types
 *
 * | Type | Direction | Payload |
 * |------|-----------|---------|
 * | `TOKEN_REFRESHED` | → other tabs | `accessToken`, `timestamp`, `tabId` |
 * | `LOGGED_OUT` | → other tabs | `tabId` |
 * | `LOGGED_IN` | → other tabs | `userId`, `accessToken`, `timestamp`, `tabId` |
 *
 * ## Usage
 *
 * ```typescript
 * // Broadcasting an event
 * import { broadcastAuthEvent } from './broadcast-channel';
 * broadcastAuthEvent({ type: 'LOGGED_OUT', tabId });
 *
 * // Subscribing to events
 * import { subscribeToAuthEvents } from './broadcast-channel';
 * const unsubscribe = subscribeToAuthEvents((event) => {
 *   if (event.type === 'LOGGED_OUT') {
 *     // Handle logout
 *   }
 * });
 * ```
 */

/**
 * Channel name used for all auth broadcasts.
 */
export const AUTH_CHANNEL_NAME = 'auth';

/**
 * Storage key for persisting the tab ID across refreshes.
 */
const TAB_ID_STORAGE_KEY = 'auth_tab_id';

/**
 * Generate a unique tab ID.
 */
function generateTabId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get or create the unique tab ID for this tab.
 * Persisted in sessionStorage so it survives navigation but not across tabs.
 */
function getTabId(): string {
  if (typeof sessionStorage === 'undefined') {
    return generateTabId();
  }

  let tabId = sessionStorage.getItem(TAB_ID_STORAGE_KEY);
  if (!tabId) {
    tabId = generateTabId();
    sessionStorage.setItem(TAB_ID_STORAGE_KEY, tabId);
  }
  return tabId;
}

// ─── Message Types ───────────────────────────────────────────────────────────

/**
 * Event types for auth broadcast messages.
 */
export type AuthEventType = 'TOKEN_REFRESHED' | 'LOGGED_OUT' | 'LOGGED_IN';

/**
 * Base interface for all auth broadcast events.
 */
export interface BaseAuthEvent {
  type: AuthEventType;
  /** The tab that sent this event. Used for same-tab filtering. */
  tabId: string;
  /** Unix timestamp when the event was created. */
  timestamp: number;
}

/**
 * Event emitted when a token is successfully refreshed.
 */
export interface TokenRefreshedEvent extends BaseAuthEvent {
  type: 'TOKEN_REFRESHED';
  /** The new access token. */
  accessToken: string;
}

/**
 * Event emitted when a user logs out.
 */
export interface LoggedOutEvent extends BaseAuthEvent {
  type: 'LOGGED_OUT';
}

/**
 * Event emitted when a user logs in.
 */
export interface LoggedInEvent extends BaseAuthEvent {
  type: 'LOGGED_IN';
  /** The authenticated user's ID. */
  userId: string;
  /** The access token for the new session. */
  accessToken: string;
}

/**
 * Union of all possible auth broadcast events.
 */
export type AuthEvent = TokenRefreshedEvent | LoggedOutEvent | LoggedInEvent;

// ─── Channel Singleton ───────────────────────────────────────────────────────

/**
 * The singleton BroadcastChannel instance.
 * Lazily initialized on first access.
 */
let authChannel: BroadcastChannel | null = null;

/**
 * Flag indicating whether BroadcastChannel is available in this environment.
 */
let isBroadcastChannelAvailable: boolean | null = null;

/**
 * Check if BroadcastChannel is available.
 */
function checkBroadcastChannelAvailable(): boolean {
  if (isBroadcastChannelAvailable !== null) {
    return isBroadcastChannelAvailable;
  }

  if (typeof BroadcastChannel === 'undefined') {
    isBroadcastChannelAvailable = false;
    return false;
  }

  try {
    // Try to construct to verify it works (some browsers have the global but it throws)
    new BroadcastChannel('test');
    isBroadcastChannelAvailable = true;
  } catch {
    isBroadcastChannelAvailable = false;
  }

  return isBroadcastChannelAvailable;
}

/**
 * Get the singleton auth BroadcastChannel.
 *
 * Lazily creates the channel on first call. Subsequent calls return the
 * same instance.
 *
 * @returns The BroadcastChannel instance, or null if unavailable
 */
export function getAuthChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!checkBroadcastChannelAvailable()) {
    return null;
  }

  if (authChannel === null) {
    authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  }

  return authChannel;
}

/**
 * Close the auth channel (for cleanup/testing).
 * After calling this, `getAuthChannel()` will create a new channel.
 */
export function closeAuthChannel(): void {
  if (authChannel !== null) {
    authChannel.close();
    authChannel = null;
  }
}

// ─── External Subscribers ─────────────────────────────────────────────────────

type AuthEventHandler = (event: AuthEvent) => void;

const externalSubscribers = new Set<AuthEventHandler>();

/**
 * Subscribe to auth broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab events
 * are filtered out by `tabId`).
 *
 * @param handler - Callback invoked for each auth event
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = subscribeToAuthEvents((event) => {
 *   if (event.type === 'LOGGED_OUT') {
 *     clearUserSession();
 *   }
 * });
 *
 * // Later, to unsubscribe:
 * unsubscribe();
 * ```
 */
export function subscribeToAuthEvents(handler: AuthEventHandler): () => void {
  externalSubscribers.add(handler);

  return () => {
    externalSubscribers.delete(handler);
  };
}

/**
 * Dispatch an event to all external subscribers.
 * Internal use only — called by the channel message handler.
 */
function dispatchToSubscribers(event: AuthEvent): void {
  externalSubscribers.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      // Prevent a buggy subscriber from breaking other subscribers
      console.error('[auth] Error in auth event subscriber:', err);
    }
  });
}

// ─── Message Handler ─────────────────────────────────────────────────────────

/**
 * Handle an incoming broadcast message.
 * Filters out same-tab messages and dispatches to subscribers.
 */
function handleMessage(event: MessageEvent): void {
  // Validate the message structure
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  const data = event.data as Partial<AuthEvent>;

  // Must have a valid type
  if (!data.type || !['TOKEN_REFRESHED', 'LOGGED_OUT', 'LOGGED_IN'].includes(data.type)) {
    return;
  }

  // Must have a tabId
  if (!data.tabId || typeof data.tabId !== 'string') {
    return;
  }

  // Filter out same-tab broadcasts (prevent event loops)
  const myTabId = getTabId();
  if (data.tabId === myTabId) {
    return;
  }

  // Dispatch to subscribers
  dispatchToSubscribers(data as AuthEvent);
}

// ─── Channel Initialization ───────────────────────────────────────────────────

/**
 * Initialize the broadcast channel listener.
 * Called internally by `broadcastAuthEvent()` but can be called explicitly.
 *
 * @returns true if initialization succeeded, false if BroadcastChannel unavailable
 */
export function initAuthChannel(): boolean {
  const channel = getAuthChannel();

  if (channel === null) {
    return false;
  }

  // Only add listener once (channel is a singleton)
  if (!(channel as unknown as { _listenerAdded?: boolean })._listenerAdded) {
    channel.addEventListener('message', handleMessage);
    (channel as unknown as { _listenerAdded?: boolean })._listenerAdded = true;
  }

  return true;
}

// ─── Broadcasting ───────────────────────────────────────────────────────────

/**
 * Current tab's ID (cached for performance).
 */
let cachedTabId: string | null = null;

/**
 * Get the current tab's ID, creating one if needed.
 */
export function getCurrentTabId(): string {
  if (cachedTabId === null) {
    cachedTabId = getTabId();
  }
  return cachedTabId;
}

/**
 * Broadcast an auth event to all other tabs.
 *
 * Automatically includes the current tab's ID for same-tab filtering.
 *
 * @param event - The event to broadcast (without tabId/timestamp — added automatically)
 *
 * @example
 * ```typescript
 * broadcastAuthEvent({
 *   type: 'TOKEN_REFRESHED',
 *   accessToken: newToken,
 * });
 *
 * broadcastAuthEvent({
 *   type: 'LOGGED_OUT',
 * });
 *
 * broadcastAuthEvent({
 *   type: 'LOGGED_IN',
 *   userId: user.id,
 *   accessToken: token,
 * });
 * ```
 */
export function broadcastAuthEvent(
  event: Omit<TokenRefreshedEvent, 'tabId' | 'timestamp'> |
          Omit<LoggedOutEvent, 'tabId' | 'timestamp'> |
          Omit<LoggedInEvent, 'tabId' | 'timestamp'>
): void {
  // Ensure channel is initialized (sets up listener if not already)
  initAuthChannel();

  const channel = getAuthChannel();
  if (channel === null) {
    // BroadcastChannel unavailable — the storage sync fallback will handle it
    return;
  }

  const fullEvent: AuthEvent = {
    ...event,
    tabId: getCurrentTabId(),
    timestamp: Date.now(),
  } as AuthEvent;

  channel.postMessage(fullEvent);
}

// ─── Convenience Functions ────────────────────────────────────────────────────

/**
 * Broadcast a token refresh event.
 */
export function broadcastTokenRefreshed(accessToken: string): void {
  broadcastAuthEvent({
    type: 'TOKEN_REFRESHED',
    accessToken,
  });
}

/**
 * Broadcast a logout event.
 */
export function broadcastLoggedOut(): void {
  broadcastAuthEvent({
    type: 'LOGGED_OUT',
  });
}

/**
 * Broadcast a login event.
 */
export function broadcastLoggedIn(userId: string, accessToken: string): void {
  broadcastAuthEvent({
    type: 'LOGGED_IN',
    userId,
    accessToken,
  });
}
