/**
 * Bookmarks Broadcast Channel — user-scoped cross-tab bookmark
 * invalidation.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.F1.
 * Phase 4 (cross-tab infra): rewritten on top of
 *   `createBroadcastChannel` (TKT-Phase-4.A1). The event types,
 *   validation, and the public subscribe / publish surface are
 *   preserved; the singleton / listener / same-tab boilerplate
 *   is now owned by the factory.
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

import { createBroadcastChannel } from '@/lib/broadcast';

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

// ─── Factory-backed channel ───────────────────────────────────────────────

/**
 * Singleton factory instance for the `bookmarks` channel.
 */
const bookmarksChannel = createBroadcastChannel<BookmarkEvent>(BOOKMARKS_CHANNEL_NAME, {
  validate: (data): BookmarkEvent | null => {
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Partial<BookmarksInvalidatedEvent>;
    if (d.type !== 'bookmarks/invalidated') return null;
    if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
    if (typeof d.userId !== 'string' || d.userId.length === 0) return null;
    return d as BookmarkEvent;
  },
});

// ─── Public API ──────────────────────────────────────────────────────────

/** Close the bookmarks channel (for cleanup/testing). */
export function closeBookmarksChannel(): void {
  bookmarksChannel.closeChannel();
}

/**
 * Back-compat accessor for the singleton channel. Returns the
 * underlying `BroadcastChannel` instance (or `null` in SSR /
 * when the API is unavailable).
 *
 * Phase 4 (TKT-Phase-4.A1): most callers should use
 * `subscribeToBookmarkEvents` instead. The accessor remains
 * exported so test harnesses can probe the channel instance.
 */
export function getBookmarksChannel(): BroadcastChannel | null {
  return bookmarksChannel.getChannel();
}

/**
 * Back-compat initializer. The factory installs the listener on
 * first `subscribe` call, so explicit init is rarely needed.
 */
export function initBookmarksChannel(): boolean {
  // The factory's `subscribe` is the canonical entry point; this
  // helper exists for tests that probe the listener-install side
  // effect.
  return bookmarksChannel.isAvailable();
}

/**
 * Subscribe to bookmark broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab events
 * are filtered out by the factory's same-tab filter).
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
  handler: (event: BookmarkEvent) => void,
): () => void {
  return bookmarksChannel.subscribe(handler);
}

/**
 * Broadcast a bookmark membership invalidation to all other tabs.
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
  // Always instantiate the channel up-front (mirrors the original
  // module's behavior) so callers / test harnesses can probe the
  // channel instance even when the publish is dropped by the
  // userId-validation guard below.
  bookmarksChannel.ensureChannel();
  if (!params.userId || typeof params.userId !== 'string') {
    // Defensive: never publish an event without a userId. Receiving
    // tabs require the userId to scope the revalidation.
    return;
  }
  bookmarksChannel.publish({
    type: 'bookmarks/invalidated',
    userId: params.userId,
  });
}
