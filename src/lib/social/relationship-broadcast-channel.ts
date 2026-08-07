/**
 * Relationship Broadcast Channel — cross-tab social relationship
 * invalidation.
 *
 * Source epic:   Epic 6.1 — Social graph & discovery hub.
 * Source story:  Story 6.1 — SDK coverage, Relationship enum, and
 *                useRelationship hook.
 * Source ticket: TKT-6.1.B2.
 * Phase 4 (cross-tab infra): rewritten on top of
 *   `createBroadcastChannel` (TKT-Phase-4.A1). The event types,
 *   validation, and the public subscribe / publish surface are
 *   preserved; the singleton / listener / same-tab boilerplate
 *   is now owned by the factory.
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
 * The module is SSR-safe. The factory's `getChannel()` checks
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

import { createBroadcastChannel } from '@/lib/broadcast';

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

const SOCIAL_RELATIONSHIP_VALID_KINDS = new Set<SocialRelationshipInvalidationKind>([
  'relationship.changed',
  'friend_request.changed',
  'blocklist.changed',
  'follow.changed',
  'unfriended',
]);

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

// ─── Factory-backed channel ────────────────────────────────────────────────

/**
 * Singleton factory instance for the `social/relationship` channel.
 */
const socialRelationshipChannel = createBroadcastChannel<SocialRelationshipInvalidationEvent>(
  SOCIAL_RELATIONSHIP_CHANNEL_NAME,
  {
    validate: (data): SocialRelationshipInvalidationEvent | null => {
      if (typeof data !== 'object' || data === null) return null;
      const d = data as Partial<BaseSocialRelationshipInvalidationEvent>;
      if (typeof d.kind !== 'string' || !SOCIAL_RELATIONSHIP_VALID_KINDS.has(d.kind as SocialRelationshipInvalidationKind)) {
        return null;
      }
      if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
      if (typeof d.userId !== 'string' || d.userId.length === 0) return null;
      if (typeof d.at !== 'number') return null;
      return d as SocialRelationshipInvalidationEvent;
    },
    timestampField: 'at',
  },
);

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Close the social relationship channel (for cleanup / testing).
 * After calling this, the factory closes the channel and the next
 * `subscribe` call recreates a fresh channel.
 */
export function closeSocialRelationshipChannel(): void {
  socialRelationshipChannel.closeChannel();
}

/**
 * Subscribe to social relationship broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab
 * events are filtered out by the factory).
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
  handler: (event: SocialRelationshipInvalidationEvent) => void,
): () => void {
  return socialRelationshipChannel.subscribe(handler);
}

/**
 * Publish a social relationship invalidation to all other tabs.
 *
 * Automatically includes the current tab's ID for same-tab filtering
 * via the factory's same-tab filter.
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
  // Always instantiate the channel up-front (mirrors the original
  // module's behavior) so callers / test harnesses can probe the
  // channel instance even when the publish is dropped by the
  // kind-validation guard below.
  socialRelationshipChannel.ensureChannel();
  if (!payload.userId || typeof payload.userId !== 'string') {
    // Defensive: never publish an event without a userId.
    return;
  }
  if (!SOCIAL_RELATIONSHIP_VALID_KINDS.has(payload.kind)) {
    return;
  }
  socialRelationshipChannel.publish({
    kind: payload.kind,
    userId: payload.userId,
  });
}
