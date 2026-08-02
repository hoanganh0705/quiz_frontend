/**
 * Bookmarks Broadcast Channel — user-scoped cross-tab bookmark
 * invalidation.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.F1.
 *
 * ## Purpose
 *
 * Mirrors the design of `broadcast-channel.ts` (Epic 2.7) for the
 * bookmark feature: cross-tab notification of bookmark membership
 * mutations so every tab can revalidate its SWR membership cache.
 *
 * The auth channel (`broadcast-channel.ts`) and this bookmark channel
 * are independent modules. They share the same tab-identity storage
 * key (`auth_tab_id`) so a tab's identity is stable across both
 * channels — a `LOGGED_OUT` from the auth channel and a
 * `bookmarks/invalidated` from the bookmark channel both reference the
 * same `tabId`. Sharing the identity storage key is safe because both
 * modules only READ the tab id; only the auth module writes it.
 *
 * ## Why a separate channel name
 *
 * Using `bookmarks` as the channel name keeps the channel `MessageEvent`
 * payload type homogeneous (`BookmarksInvalidatedEvent`) so the message
 * handler can validate the event structurally without union-dispatching
 * across unrelated event types. The auth channel continues to handle
 * only auth events.
 *
 * ## Message Types
 *
 * | Type | Direction | Payload |
 * |------|-----------|---------|
 * | `bookmarks/invalidated` | → other tabs | `userId`, `tabId`, `timestamp` |
 *
 * The event is published by the bookmark mutation hooks (F2 — C1
 * `useBookmarkQuiz`, C2 `useUnbookmarkQuiz`) after the server confirms
 * the mutation. Receiving tabs (F3) revalidate their membership SWR
 * cache and rerender any subscribed `<BookmarkButton />` /
 * `<BookmarkButtonSlot />` components.
 *
 * ## User scoping
 *
 * The payload carries `userId` so receiving tabs (F3) can ignore
 * events published by other users (e.g. when the user switches in
 * another tab). The auth `LOGGED_OUT` event already clears caches on
 * logout; the bookmark channel does NOT need its own logout event.
 *
 * ## Same-tab filtering
 *
 * Each tab has a unique `tabId` so it can ignore its own broadcasts
 * (preventing event loops). The tab identity is shared with the auth
 * channel via `getCurrentTabId()`.
 *
 * ## Graceful degradation
 *
 * Falls back gracefully when `BroadcastChannel` is unavailable (older
 * browsers, private browsing, server-side rendering). Subscribers
 * simply never receive the event in those environments; the local
 * mutation's `mutate(key)` invalidation still runs so the source tab
 * is correct.
 */

import {
  getCurrentTabId,
} from '@/lib/api/core/broadcast-channel';

/**
 * Channel name used for all bookmark broadcasts.
 *
 * Distinct from the auth channel (`AUTH_CHANNEL_NAME = 'auth'`) so the
 * two channels' messages are independent BroadcastChannels at the
 * browser level. A single browser session opens two channels — one per
 * feature scope — and the bookmark channel is a logical sibling of the
 * auth channel.
 */
export const BOOKMARKS_CHANNEL_NAME = 'bookmarks';

/**
 * Event types for bookmark broadcast messages.
 *
 * Currently a single event type; the union exists so future bookmark
 * events (e.g. `bookmarks/collection-renamed`) can be added without
 * breaking the discriminated-union contract.
 */
export type BookmarkEventType = 'bookmarks/invalidated';

/**
 * Base interface for all bookmark broadcast events.
 */
export interface BaseBookmarkEvent {
  type: BookmarkEventType;
  /** The tab that sent this event. Used for same-tab filtering. */
  tabId: string;
  /** Unix timestamp when the event was created. */
  timestamp: number;
}

/**
 * Event emitted when a bookmark membership mutation has been
 * confirmed by the server. Receiving tabs revalidate their SWR
 * membership cache and rerender any subscribed bookmark UI.
 *
 * The `userId` payload scopes the invalidation: receiving tabs ignore
 * events published by other users (a tab whose currently-authenticated
 * user is `userId === 'A'` must NOT revalidate when `userId === 'B'`
 * publishes the event).
 */
export interface BookmarksInvalidatedEvent extends BaseBookmarkEvent {
  type: 'bookmarks/invalidated';
  /** The authenticated user's ID whose membership changed. */
  userId: string;
}

/**
 * Union of all possible bookmark broadcast events.
 */
export type BookmarkEvent = BookmarksInvalidatedEvent;

// ─── Channel Singleton ───────────────────────────────────────────────────────

/**
 * The singleton BroadcastChannel instance for bookmark events.
 * Lazily initialized on first access.
 */
let bookmarksChannel: BroadcastChannel | null = null;

/**
 * Flag indicating whether BroadcastChannel is available for the
 * bookmarks channel. Same availability check as the auth channel.
 */
let isBookmarksBroadcastChannelAvailable: boolean | null = null;

/**
 * Check if BroadcastChannel is available.
 */
function checkBroadcastChannelAvailable(): boolean {
  if (isBookmarksBroadcastChannelAvailable !== null) {
    return isBookmarksBroadcastChannelAvailable;
  }

  if (typeof BroadcastChannel === 'undefined') {
    isBookmarksBroadcastChannelAvailable = false;
    return false;
  }

  try {
    // Try to construct to verify it works (some browsers have the
    // global but it throws on construction).
    new BroadcastChannel('test');
    isBookmarksBroadcastChannelAvailable = true;
  } catch {
    isBookmarksBroadcastChannelAvailable = false;
  }

  return isBookmarksBroadcastChannelAvailable;
}

/**
 * Get the singleton bookmarks BroadcastChannel.
 *
 * Lazily creates the channel on first call. Subsequent calls return
 * the same instance.
 *
 * @returns The BroadcastChannel instance, or null if unavailable
 */
export function getBookmarksChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!checkBroadcastChannelAvailable()) {
    return null;
  }

  if (bookmarksChannel === null) {
    bookmarksChannel = new BroadcastChannel(BOOKMARKS_CHANNEL_NAME);
  }

  return bookmarksChannel;
}

/**
 * Close the bookmarks channel (for cleanup/testing).
 * After calling this, `getBookmarksChannel()` will create a new channel.
 */
export function closeBookmarksChannel(): void {
  if (bookmarksChannel !== null) {
    bookmarksChannel.close();
    bookmarksChannel = null;
  }
}

// ─── External Subscribers ─────────────────────────────────────────────────────

type BookmarkEventHandler = (event: BookmarkEvent) => void;

const bookmarkSubscribers = new Set<BookmarkEventHandler>();

/**
 * Subscribe to bookmark broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab events
 * are filtered out by `tabId`).
 *
 * @param handler - Callback invoked for each bookmark event
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = subscribeToBookmarkEvents((event) => {
 *   if (event.type === 'bookmarks/invalidated') {
 *     // Revalidate membership cache for `event.userId`.
 *   }
 * });
 *
 * // Later, to unsubscribe:
 * unsubscribe();
 * ```
 */
export function subscribeToBookmarkEvents(
  handler: BookmarkEventHandler,
): () => void {
  bookmarkSubscribers.add(handler);

  return () => {
    bookmarkSubscribers.delete(handler);
  };
}

/**
 * Dispatch an event to all external subscribers.
 * Internal use only — called by the channel message handler.
 */
function dispatchToBookmarkSubscribers(event: BookmarkEvent): void {
  bookmarkSubscribers.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      // Prevent a buggy subscriber from breaking other subscribers
      console.error('[bookmarks] Error in bookmark event subscriber:', err);
    }
  });
}

// ─── Message Handler ─────────────────────────────────────────────────────────

/**
 * Handle an incoming bookmark broadcast message.
 * Filters out same-tab messages and dispatches to subscribers.
 */
function handleBookmarksMessage(event: MessageEvent): void {
  // Validate the message structure
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  const data = event.data as Partial<BookmarksInvalidatedEvent>;

  // Must have a valid type
  if (!data.type || data.type !== 'bookmarks/invalidated') {
    return;
  }

  // Must have a tabId
  if (!data.tabId || typeof data.tabId !== 'string') {
    return;
  }

  // Must have a userId
  if (!data.userId || typeof data.userId !== 'string') {
    return;
  }

  // Filter out same-tab broadcasts (prevent event loops)
  const myTabId = getCurrentTabId();
  if (data.tabId === myTabId) {
    return;
  }

  // Dispatch to subscribers
  dispatchToBookmarkSubscribers(data as BookmarkEvent);
}

// ─── Channel Initialization ───────────────────────────────────────────────────

/**
 * Initialize the bookmark channel listener.
 * Called internally by `broadcastBookmarksInvalidated()` but can be
 * called explicitly.
 *
 * @returns true if initialization succeeded, false if BroadcastChannel unavailable
 */
export function initBookmarksChannel(): boolean {
  const channel = getBookmarksChannel();

  if (channel === null) {
    return false;
  }

  // Only add listener once (channel is a singleton)
  if (!(channel as unknown as { _listenerAdded?: boolean })._listenerAdded) {
    channel.addEventListener('message', handleBookmarksMessage);
    (channel as unknown as { _listenerAdded?: boolean })._listenerAdded = true;
  }

  return true;
}

// ─── Broadcasting ───────────────────────────────────────────────────────────

/**
 * Broadcast a bookmark membership invalidation to all other tabs.
 *
 * Automatically includes the current tab's ID for same-tab filtering
 * via `getCurrentTabId()` (re-exported from the auth channel so the
 * tab identity is shared across both channels).
 *
 * @param params - The event payload
 * @param params.userId - The authenticated user ID whose membership
 *   changed. Receiving tabs ignore events for other users.
 *
 * @example
 * ```typescript
 * broadcastBookmarksInvalidated({ userId: 'user-1' });
 * ```
 */
export function broadcastBookmarksInvalidated(params: {
  userId: string;
}): void {
  // Ensure channel is initialized (sets up listener if not already)
  initBookmarksChannel();

  const channel = getBookmarksChannel();
  if (channel === null) {
    // BroadcastChannel unavailable — the local mutation's
    // `mutate(key)` invalidation still runs so the source tab is
    // correct.
    return;
  }

  if (!params.userId || typeof params.userId !== 'string') {
    // Defensive: never publish an event without a userId. Receiving
    // tabs require the userId to scope the revalidation.
    return;
  }

  const fullEvent: BookmarksInvalidatedEvent = {
    type: 'bookmarks/invalidated',
    userId: params.userId,
    tabId: getCurrentTabId(),
    timestamp: Date.now(),
  };

  channel.postMessage(fullEvent);
}
