/**
 * Social-domain Socket.IO event payload DTOs — Story 6.10 wire format.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.C2.
 *
 * ## Purpose
 *
 * Defines the nine typed payload interfaces for social socket events
 * delivered over the Phase 5 `/notifications` namespace. Each payload
 * is the **frontend projection** of the wire envelope that
 * `NotificationSocketEvent.data` resolves to for the nine documented
 * social event names.
 *
 * The payload shapes mirror the integration specs in:
 *
 *   - `projectDocs/Tickets/Phase6/evidence/EPIC_6_7_G1.md`
 *     (`blocked.changed`, `relationship.changed`)
 *   - `projectDocs/Tickets/Phase6/evidence/EPIC_6_8_G3.md`
 *     (five friend-request events)
 *
 * ## Common fields
 *
 * Every payload carries the same four common fields:
 *
 *   - `version: 1`         — wire format version; consumers reject
 *                            anything other than `1`.
 *   - `actorUserId: string` — the user who initiated the action.
 *   - `targetUserId: string`— the user the action was directed at.
 *   - `correlationId: string`— the dedup primitive; identical payloads
 *                            with identical correlation ids are
 *                            duplicates of the same server-side
 *                            mutation.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * `friendshipId` and `followId` are **unstable internal ids** and
 * MUST NEVER appear on the wire. The lint script
 * (`scripts/phase6-lint-invariants.mjs`, TKT-6.10.G3) verifies this
 * invariant by grepping every file under
 * `src/features/social/realtime/`. Adding `friendshipId` or `followId`
 * to any payload below will fail lint.
 *
 * ## Cross-feature reference
 *
 * The `Relationship` field on `RelationshipChangedPayload` and
 * `BlockedChangedPayload` is imported from
 * `@/features/social/types/relationship.ts`. This is the **only**
 * cross-feature import in the social realtime layer — every other
 * dependency is on `@/lib/realtime/**`.
 */

import type { Relationship } from "@/features/social/types/relationship";

// ─── Common field set ────────────────────────────────────────────────────────

/**
 * The four common fields every social-event payload carries. Used as
 * an `extends` clause for the per-event payloads below; not exported
 * as a stand-alone type because consumers should always branch on the
 * full discriminated union.
 */
interface SocialSocketEventBasePayload {
  /** Wire format version. MUST be `1`. */
  version: 1;
  /** The user who initiated the action. */
  actorUserId: string;
  /** The user the action was directed at. */
  targetUserId: string;
  /**
   * Unique correlation id of the server-side mutation. Used by the
   * `EventDeduplicator` (TKT-6.10.D1) to drop duplicate deliveries.
   */
  correlationId: string;
}

// ─── Per-event payload DTOs ──────────────────────────────────────────────────

/**
 * `relationship.changed` — emitted whenever any mutation flips the
 * `Relationship` projection between the viewer and a target user
 * (block, unblock, follow, unfollow, friend-request accept/decline,
 * etc.).
 *
 * The new `relationship` snapshot is the canonical state; consumers
 * MUST apply it directly and trigger SWR revalidation. The
 * `Relationship` enum is imported from
 * `@/features/social/types/relationship.ts`.
 */
export interface RelationshipChangedPayload extends SocialSocketEventBasePayload {
  /** The new relationship value between the viewer and the target. */
  relationship: Relationship;
  /** The previous relationship value (for diff-based UIs). */
  previousRelationship: Relationship;
  /** ISO 8601 timestamp of the server-side mutation. */
  changedAt: string;
}

/**
 * `blocked.changed` — emitted when the blocklist row changes (block
 * or unblock). The `relationship` snapshot is included so consumers
 * can update the relationship projection in lockstep with the
 * blocklist.
 */
export interface BlockedChangedPayload extends SocialSocketEventBasePayload {
  /** The new relationship value between the viewer and the target. */
  relationship: Relationship;
  /** Whether the viewer now blocks the target. */
  isBlocked: boolean;
  /** ISO 8601 timestamp of the server-side mutation. */
  changedAt: string;
}

/**
 * `friend.request.received` — emitted on the recipient's
 * notifications socket when a new friend request arrives.
 *
 * `requesterUserId` is the user who sent the request;
 * `recipientUserId` is the user who received it (the viewer of the
 * incoming-requests list).
 */
export interface FriendRequestReceivedPayload
  extends SocialSocketEventBasePayload {
  /** The user who sent the request. */
  requesterUserId: string;
  /** The user who received the request (the socket's viewer). */
  recipientUserId: string;
  /** ISO 8601 timestamp of the server-side mutation. */
  requestedAt: string;
}

/**
 * `friend.request.responded` — emitted on the requester's
 * notifications socket after the recipient accepts or declines.
 */
export interface FriendRequestRespondedPayload
  extends SocialSocketEventBasePayload {
  /** The user who originally sent the request. */
  requesterUserId: string;
  /** The user who responded (the recipient). */
  recipientUserId: string;
  /** Whether the request was accepted or declined. */
  decision: "accept" | "decline";
  /** ISO 8601 timestamp of the server-side mutation. */
  respondedAt: string;
}

/**
 * `friend.request.cancelled` — emitted on the requester's
 * notifications socket after the requester cancels a pending request.
 */
export interface FriendRequestCancelledPayload
  extends SocialSocketEventBasePayload {
  /** The user who cancelled the request (the original requester). */
  requesterUserId: string;
  /** The user the request was directed at. */
  recipientUserId: string;
  /** ISO 8601 timestamp of the server-side mutation. */
  cancelledAt: string;
}

/**
 * `friend.added` — emitted on both viewers' notifications sockets
 * after a friend request is accepted. The `mutual` flag is always
 * `true`; it is included for symmetry with other events and to make
 * it easy for consumers to filter on `mutual: true` when projecting
 * friend-list rows.
 */
export interface FriendAddedPayload extends SocialSocketEventBasePayload {
  /** The user who accepted the request. */
  actorUserId: string;
  /** The user who originally sent the request. */
  targetUserId: string;
  /** Always `true`; the two users are now mutual friends. */
  mutual: true;
  /** ISO 8601 timestamp of the server-side mutation. */
  addedAt: string;
}

/**
 * `friend.removed` — emitted on both viewers' notifications sockets
 * after an unfriend. The `mutual` flag is always `false`; included
 * for symmetry with `friend.added`.
 */
export interface FriendRemovedPayload extends SocialSocketEventBasePayload {
  /** The user who initiated the unfriend. */
  actorUserId: string;
  /** The user the unfriend was directed at. */
  targetUserId: string;
  /** Always `false`; the two users are no longer friends. */
  mutual: false;
  /** ISO 8601 timestamp of the server-side mutation. */
  removedAt: string;
}

/**
 * `follow.received` — emitted on the target user's notifications
 * socket when the viewer follows them. `followerUserId` is the actor;
 * `targetUserId` is the followee.
 */
export interface FollowReceivedPayload extends SocialSocketEventBasePayload {
  /** The user who followed (the actor). */
  followerUserId: string;
  /** The user who was followed (the followee). */
  targetUserId: string;
  /** ISO 8601 timestamp of the server-side mutation. */
  followedAt: string;
}

/**
 * `feed.item.added` — emitted on the viewer's notifications socket
 * when a new item is added to the social feed (badge earned, rank
 * milestone, friend activity, etc.).
 *
 * `feedItemId` is the SWR cache-key suffix for the paginated feed
 * page the item belongs to; consumers invalidate
 * `SOCIAL_CACHE_KEYS.makeFeedKey(viewerUserId)` after applying the
 * event.
 */
export interface FeedItemAddedPayload extends SocialSocketEventBasePayload {
  /** The id of the new feed item. */
  feedItemId: string;
  /** The activity type — see `SocialFeedItemType`. */
  feedItemType: string;
  /** ISO 8601 timestamp of the server-side mutation. */
  addedAt: string;
}

// ─── Discriminated union ────────────────────────────────────────────────────

/**
 * The discriminated union of all nine social-event payload DTOs.
 *
 * Discriminator: the `kind` field on `RoutedSocialEvent`
 * (TKT-6.10.C1). Consumers should branch on
 * `RoutedSocialEvent.kind`, not on this union directly — the router
 * is the single point that narrows `unknown` payloads into typed
 * variants.
 */
export type SocialSocketEventPayload =
  | RelationshipChangedPayload
  | BlockedChangedPayload
  | FriendRequestReceivedPayload
  | FriendRequestRespondedPayload
  | FriendRequestCancelledPayload
  | FriendAddedPayload
  | FriendRemovedPayload
  | FollowReceivedPayload
  | FeedItemAddedPayload;

/**
 * The string literal type of every social-event kind. Mirrors the
 * nine event names consumed by `routeSocialSocketEvent`
 * (TKT-6.10.C1).
 */
export type SocialEventKind =
  | "relationship.changed"
  | "blocked.changed"
  | "friend.request.received"
  | "friend.request.responded"
  | "friend.request.cancelled"
  | "friend.added"
  | "friend.removed"
  | "follow.received"
  | "feed.item.added";