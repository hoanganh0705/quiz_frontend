/**
 * Relationship Broadcast Channel — cross-tab social relationship
 * invalidation.
 *
 * Source epic:   Epic 6.1 — Social graph & discovery hub.
 * Source story:  Story 6.1 — SDK coverage, Relationship enum, and
 *                useRelationship hook.
 * Source ticket: TKT-6.1.B2.
 *
 * ## Purpose
 *
 * Phase 6 needs cross-tab invalidation for social relationship
 * mutations so a follow / unfollow / block / unblock / friend-request
 * action in one tab is reflected in sibling tabs without a full
 * refresh. This module provides a dedicated `BroadcastChannel` for
 * the five Phase 6 invalidation kinds consumed by Stories 6.6, 6.7,
 * 6.8, and 6.10:
 *
 *   1. `relationship.changed` — generic catch-all for follow,
 *      unfollow, block, unblock, and unfriend.
 *   2. `friend_request.changed` — friend request sent, accepted,
 *      declined, or cancelled.
 *   3. `blocklist.changed` — block / unblock on the current user's
 *      blocklist (mutates the block list cache).
 *   4. `follow.changed` — follow / unfollow (mutates the
 *      follower / following caches).
 *   5. `unfriended` — the inverse of friend-accepted (someone
 *      removed the friendship).
 *
 * ## Why a separate channel name
 *
 * Using `social/relationship` as the channel name keeps the channel
 * `MessageEvent` payload type homogeneous
 * (`SocialRelationshipInvalidationPayload`) so the message handler
 * can validate the event structurally without union-dispatching
 * across unrelated event types. The auth channel
 * (`broadcast-channel.ts`), the bookmarks channel
 * (`bookmarks-broadcast-channel.ts`), the attempts / profile
 * channels (Phase 4), and the Phase 5 invalidation channel
 * (`phase5-broadcast.ts`) all continue to handle their own events.
 *
 * ## Same-tab filtering
 *
 * Each tab has a unique `tabId` (shared with the auth / bookmarks
 * channels via `getCurrentTabId()`) so a tab that emits via
 * `publishSocialRelationshipInvalidation` will not see its own
 * message routed back through any
 * `subscribeSocialRelationshipInvalidation` listener.
 *
 * ## SSR safety
 *
 * The module is SSR-safe. `getSocialRelationshipChannel()` checks
 * `typeof window === 'undefined'` before constructing the channel,
 * so importing this module from a server component does not throw.
 *
 * ## Graceful degradation
 *
 * Falls back gracefully when `BroadcastChannel` is unavailable
 * (older browsers, private browsing, server-side rendering).
 * Subscribers simply never receive the event in those environments;
 * the local mutation's `mutate(key)` invalidation still runs so the
 * source tab is correct.
 */

import { getCurrentTabId } from '@/lib/api/core/broadcast-channel';

// ─── Channel name ────────────────────────────────────────────────────────────

/**
 * Channel name used for all social relationship broadcasts.
 *
 * Distinct from the auth channel (`AUTH_CHANNEL_NAME = 'auth'`),
 * the bookmarks channel (`BOOKMARKS_CHANNEL_NAME = 'bookmarks'`),
 * the Phase 5 invalidation channel (`phase5/invalidation`), and the
 * Phase 4 per-feature channels (`attempts/changed`, `profile/updated`)
 * so the five channels' messages are independent BroadcastChannels at
 * the browser level. A single browser session opens one channel per
 * feature scope.
 */
export const SOCIAL_RELATIONSHIP_CHANNEL_NAME = 'social/relationship';

// ─── Event types ────────────────────────────────────────────────────────────

/**
 * The five documented event kinds that travel on the social
 * relationship broadcast channel.
 *
 * - `relationship.changed` — generic catch-all for any relationship
 *   mutation (follow, unfollow, block, unblock, unfriend).
 * - `friend_request.changed` — friend request sent, accepted,
 *   declined, or cancelled.
 * - `blocklist.changed` — block / unblock on the current user's
 *   blocklist.
 * - `follow.changed` — follow / unfollow.
 * - `unfriended` — someone removed the friendship.
 */
export type SocialRelationshipInvalidationKind =
  | 'relationship.changed'
  | 'friend_request.changed'
  | 'blocklist.changed'
  | 'follow.changed'
  | 'unfriended';

/**
 * Base interface for all social relationship invalidation events.
 */
interface BaseSocialRelationshipInvalidationEvent {
  /**
   * The discriminator for the event. Always one of the five
   * documented `SocialRelationshipInvalidationKind` literals.
   */
  kind: SocialRelationshipInvalidationKind;
  /**
   * The target user id. For `blocklist.changed`, this is the
   * blocked / unblocked user. For `follow.changed`, this is the
   * user being followed / unfollowed. For `friend_request.changed`,
   * this is the requester or the addressee depending on the
   * direction. For `relationship.changed` and `unfriended`, this is
   * the other party in the relationship.
   */
  userId: string;
  /**
   * The tab that sent this event. Used for same-tab filtering.
   */
  tabId: string;
  /**
   * Unix timestamp (ms) when the event was created.
   */
  at: number;
}

/**
 * The shape of every event on the social relationship broadcast
 * channel. Discriminator: `kind`.
 */
export type SocialRelationshipInvalidationEvent =
  BaseSocialRelationshipInvalidationEvent;

/**
 * The payload accepted by `publishSocialRelationshipInvalidation`.
 * Caller supplies `kind` and `userId`; `tabId` and `at` are stamped
 * by the publisher.
 */
export type SocialRelationshipInvalidationPayload = {
  kind: SocialRelationshipInvalidationKind;
  userId: string;
};

// ─── Channel singleton ──────────────────────────────────────────────────────

/**
 * The singleton BroadcastChannel instance for social relationship
 * events. Lazily initialized on first access.
 */
let socialRelationshipChannel: BroadcastChannel | null = null;

/**
 * Flag indicating whether BroadcastChannel is available for the
 * social relationship channel. Same availability check as the auth
 * / bookmarks channels.
 */
let isSocialRelationshipBroadcastChannelAvailable: boolean | null = null;

/**
 * Check if BroadcastChannel is available.
 */
function checkBroadcastChannelAvailable(): boolean {
  if (isSocialRelationshipBroadcastChannelAvailable !== null) {
    return isSocialRelationshipBroadcastChannelAvailable;
  }

  if (typeof BroadcastChannel === 'undefined') {
    isSocialRelationshipBroadcastChannelAvailable = false;
    return false;
  }

  try {
    // Try to construct to verify it works (some browsers have the
    // global but it throws on construction).
    new BroadcastChannel('test');
    isSocialRelationshipBroadcastChannelAvailable = true;
  } catch {
    isSocialRelationshipBroadcastChannelAvailable = false;
  }

  return isSocialRelationshipBroadcastChannelAvailable;
}

/**
 * Get the singleton social relationship BroadcastChannel.
 *
 * Lazily creates the channel on first call. Subsequent calls return
 * the same instance. Returns `null` in SSR or when `BroadcastChannel`
 * is unavailable.
 *
 * @returns The BroadcastChannel instance, or null if unavailable.
 */
export function getSocialRelationshipChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!checkBroadcastChannelAvailable()) {
    return null;
  }

  if (socialRelationshipChannel === null) {
    socialRelationshipChannel = new BroadcastChannel(
      SOCIAL_RELATIONSHIP_CHANNEL_NAME,
    );
  }

  return socialRelationshipChannel;
}

/**
 * Close the social relationship channel (for cleanup / testing).
 * After calling this, `getSocialRelationshipChannel()` will create a
 * fresh channel on the next call.
 */
export function closeSocialRelationshipChannel(): void {
  if (socialRelationshipChannel !== null) {
    socialRelationshipChannel.close();
    socialRelationshipChannel = null;
  }
}

// ─── External subscribers ───────────────────────────────────────────────────

type SocialRelationshipInvalidationHandler = (
  event: SocialRelationshipInvalidationEvent,
) => void;

const socialRelationshipSubscribers = new Set<
  SocialRelationshipInvalidationHandler
>();

/**
 * Subscribe to social relationship broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab
 * events are filtered out by `tabId`).
 *
 * @param handler - Callback invoked for each social relationship
 *   event.
 * @returns Unsubscribe function.
 *
 * @example
 * ```typescript
 * const unsubscribe = subscribeSocialRelationshipInvalidation(
 *   (event) => {
 *     if (event.kind === 'follow.changed') {
 *       // Revalidate the followers / following cache.
 *     }
 *   },
 * );
 *
 * // Later, to unsubscribe:
 * unsubscribe();
 * ```
 */
export function subscribeSocialRelationshipInvalidation(
  handler: SocialRelationshipInvalidationHandler,
): () => void {
  socialRelationshipSubscribers.add(handler);

  return () => {
    socialRelationshipSubscribers.delete(handler);
  };
}

/**
 * Dispatch an event to all external subscribers. Internal use only —
 * called by the channel message handler.
 */
function dispatchToSocialRelationshipSubscribers(
  event: SocialRelationshipInvalidationEvent,
): void {
  socialRelationshipSubscribers.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      // Prevent a buggy subscriber from breaking other subscribers.
      console.error(
        '[social/relationship] Error in subscriber:',
        err,
      );
    }
  });
}

// ─── Message handler ────────────────────────────────────────────────────────

/**
 * Handle an incoming social relationship broadcast message. Filters
 * out same-tab messages and dispatches to subscribers.
 */
function handleSocialRelationshipMessage(event: MessageEvent): void {
  // Validate the message structure.
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  const data = event.data as Partial<BaseSocialRelationshipInvalidationEvent>;

  // Must have a valid `kind` discriminator.
  const validKinds: SocialRelationshipInvalidationKind[] = [
    'relationship.changed',
    'friend_request.changed',
    'blocklist.changed',
    'follow.changed',
    'unfriended',
  ];
  if (!data.kind || !validKinds.includes(data.kind as SocialRelationshipInvalidationKind)) {
    return;
  }

  // Must have a tabId.
  if (!data.tabId || typeof data.tabId !== 'string') {
    return;
  }

  // Must have a userId.
  if (!data.userId || typeof data.userId !== 'string') {
    return;
  }

  // Filter out same-tab broadcasts (prevent event loops).
  const myTabId = getCurrentTabId();
  if (data.tabId === myTabId) {
    return;
  }

  // Dispatch to subscribers.
  dispatchToSocialRelationshipSubscribers(
    data as SocialRelationshipInvalidationEvent,
  );
}

// ─── Channel initialization ──────────────────────────────────────────────────

/**
 * Initialize the social relationship channel listener.
 * Called internally by `publishSocialRelationshipInvalidation()` but
 * can be called explicitly.
 *
 * @returns true if initialization succeeded, false if
 *   `BroadcastChannel` is unavailable.
 */
export function initSocialRelationshipChannel(): boolean {
  const channel = getSocialRelationshipChannel();

  if (channel === null) {
    return false;
  }

  // Only add listener once (channel is a singleton).
  if (!(channel as unknown as { _listenerAdded?: boolean })._listenerAdded) {
    channel.addEventListener('message', handleSocialRelationshipMessage);
    (channel as unknown as { _listenerAdded?: boolean })._listenerAdded = true;
  }

  return true;
}

// ─── Broadcasting ───────────────────────────────────────────────────────────

/**
 * Publish a social relationship invalidation to all other tabs.
 *
 * Automatically includes the current tab's ID for same-tab filtering
 * via `getCurrentTabId()` (re-exported from the auth channel so the
 * tab identity is shared across all channels).
 *
 * @param payload - The event payload (without `tabId` or `at`).
 * @param payload.kind - The event discriminator.
 * @param payload.userId - The target user id.
 *
 * @example
 * ```typescript
 * publishSocialRelationshipInvalidation({
 *   kind: 'follow.changed',
 *   userId: 'user-1',
 * });
 * ```
 */
export function publishSocialRelationshipInvalidation(
  payload: SocialRelationshipInvalidationPayload,
): void {
  // Ensure channel is initialized (sets up listener if not already).
  initSocialRelationshipChannel();

  const channel = getSocialRelationshipChannel();
  if (channel === null) {
    // BroadcastChannel unavailable — the local mutation's
    // `mutate(key)` invalidation still runs so the source tab is
    // correct.
    return;
  }

  if (!payload.userId || typeof payload.userId !== 'string') {
    // Defensive: never publish an event without a userId.
    return;
  }

  const validKinds: SocialRelationshipInvalidationKind[] = [
    'relationship.changed',
    'friend_request.changed',
    'blocklist.changed',
    'follow.changed',
    'unfriended',
  ];
  if (!validKinds.includes(payload.kind)) {
    // Defensive: unknown kinds are dropped at the publisher.
    return;
  }

  const fullEvent: SocialRelationshipInvalidationEvent = {
    kind: payload.kind,
    userId: payload.userId,
    tabId: getCurrentTabId(),
    at: Date.now(),
  };

  channel.postMessage(fullEvent);
}