/**
 * `useFriendRequestInvalidation` — socket-driven friend-request cache invalidation.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E2.
 *
 * ## Purpose
 *
 * Owns the invalidation lifecycle for the five friend-request event
 * names emitted over the Phase 5 `/notifications` socket:
 *
 *   - `friend.request.received`   — recipient's incoming-requests list
 *                                   + viewer's social counts.
 *   - `friend.request.responded`  — requester's outgoing-requests list,
 *                                   the requester's relationship with
 *                                   the recipient, and the requester's
 *                                   social counts.
 *   - `friend.request.cancelled`  — recipient's incoming-requests list,
 *                                   the recipient's relationship, and
 *                                   the recipient's counts.
 *   - `friend.added`              — both viewers' friends lists, both
 *                                   relationships, both outgoing /
 *                                   incoming lists (as appropriate),
 *                                   and both counts.
 *   - `friend.removed`            — symmetric to `friend.added`.
 *
 * Each event triggers its own invalidation set per the Epic 6.8.G3
 * deferral note table. The shared dedup primitive (TKT-6.10.D1) drops
 * re-emissions; the shared sequence guard (TKT-6.10.D2) drops
 * out-of-order deliveries.
 *
 * ## Cross-emission rule
 *
 * The server emits both `friend.request.responded` (accept) and
 * `friend.added` for the same accept cycle. The hook treats them as
 * independent events; the per-event handler independence means each
 * fires its own invalidation set. The dedup primitive catches
 * re-emissions of the same `correlationId`.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The wire format does NOT carry `friendshipId` (per Epic 6.8.G3).
 * The hook NEVER constructs or carries `friendshipId` or `followId`
 * in any breadcrumb payload or cross-tab envelope.
 *
 * ## SSR
 *
 * The hook no-ops during SSR because the underlying `useSocket`
 * short-circuits when `typeof window === "undefined"`. The flag
 * gate adds an early return when the feature flag is `'placeholder'`.
 */

"use client";

import { useCallback, useMemo } from "react";

import { useSocket } from "@/lib/realtime/useSocket";
import { NOTIFICATIONS_NAMESPACE } from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { mutateCarefully } from "@/lib/swr/mutate-carefully";
import {
  addSocialRealtimeBreadcrumb,
} from "@/lib/social/social-realtime-sentry";
import {
  postFriendRequestInvalidation,
} from "@/lib/realtime/cross-tab-invalidation";

import { useSocialRealtimeEvent } from "@/features/social/realtime";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";
import type {
  FriendAddedPayload,
  FriendRemovedPayload,
  FriendRequestCancelledPayload,
  FriendRequestReceivedPayload,
  FriendRequestRespondedPayload,
} from "@/features/social/realtime";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Flatten an `as const` SWR-key tuple to a string for breadcrumb payloads.
 */
function keyToString(key: readonly string[]): string {
  return key.join("/");
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Subscribe to the five friend-request event names and invalidate the
 * SWR cache keys that depend on them.
 *
 * The hook signature is `useFriendRequestInvalidation(): void` —
 * side-effect only; no return value.
 *
 * @example
 * ```tsx
 * function FriendRequestListPage() {
 *   useFriendRequestInvalidation();
 *   const { data } = useIncomingRequests();
 *   return <List items={data ?? []} />;
 * }
 * ```
 */
export function useFriendRequestInvalidation(): void {
  const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
  const realtimeEnabled = flagValue !== "placeholder";

  const { socket } = useSocket(NOTIFICATIONS_NAMESPACE, {
    autoConnect: realtimeEnabled,
    enabled: realtimeEnabled,
  });

  // ── friend.request.received ─────────────────────────────────────────────
  const handleReceived = useCallback((payload: FriendRequestReceivedPayload) => {
    const keys = [
      SOCIAL_CACHE_KEYS.makeIncomingRequestsKey(),
      SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId),
    ];
    mutateCarefully(SOCIAL_CACHE_KEYS.makeIncomingRequestsKey());
    mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId));

    postFriendRequestInvalidation({
      requesterUserId: payload.requesterUserId,
      recipientUserId: payload.recipientUserId,
    });

    addSocialRealtimeBreadcrumb({
      eventType: "friend.request.received",
      actorUserId: payload.actorUserId,
      targetUserId: payload.targetUserId,
      correlationId: payload.correlationId,
      invalidationKeys: keys.map(keyToString),
      reason: "friend-request-received-invalidated",
    });
  }, []);

  // ── friend.request.responded ────────────────────────────────────────────
  const handleResponded = useCallback((payload: FriendRequestRespondedPayload) => {
    const keys = [
      SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
      SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.recipientUserId),
      SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId),
    ];
    mutateCarefully(SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey());
    mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.recipientUserId));
    mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId));

    postFriendRequestInvalidation({
      decision: payload.decision,
      requesterUserId: payload.requesterUserId,
      recipientUserId: payload.recipientUserId,
    });

    addSocialRealtimeBreadcrumb({
      eventType: "friend.request.responded",
      actorUserId: payload.actorUserId,
      targetUserId: payload.targetUserId,
      correlationId: payload.correlationId,
      invalidationKeys: keys.map(keyToString),
      reason: "friend-request-responded-invalidated",
    });
  }, []);

  // ── friend.request.cancelled ────────────────────────────────────────────
  const handleCancelled = useCallback((payload: FriendRequestCancelledPayload) => {
    const keys = [
      SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
      SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.recipientUserId),
      SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId),
    ];
    mutateCarefully(SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey());
    mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.recipientUserId));
    mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId));

    postFriendRequestInvalidation({
      decision: "cancel",
      requesterUserId: payload.requesterUserId,
      recipientUserId: payload.recipientUserId,
    });

    addSocialRealtimeBreadcrumb({
      eventType: "friend.request.cancelled",
      actorUserId: payload.actorUserId,
      targetUserId: payload.targetUserId,
      correlationId: payload.correlationId,
      invalidationKeys: keys.map(keyToString),
      reason: "friend-request-cancelled-invalidated",
    });
  }, []);

  // ── friend.added ────────────────────────────────────────────────────────
  const handleAdded = useCallback((payload: FriendAddedPayload) => {
    const keys = [
      SOCIAL_CACHE_KEYS.makeFriendsKey(payload.targetUserId),
      SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.targetUserId),
      SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
      SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.targetUserId),
    ];
    mutateCarefully(SOCIAL_CACHE_KEYS.makeFriendsKey(payload.targetUserId));
    mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.targetUserId));
    mutateCarefully(SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey());
    mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.targetUserId));

    postFriendRequestInvalidation({
      decision: "accept",
      requesterUserId: payload.actorUserId,
      recipientUserId: payload.targetUserId,
    });

    addSocialRealtimeBreadcrumb({
      eventType: "friend.added",
      actorUserId: payload.actorUserId,
      targetUserId: payload.targetUserId,
      correlationId: payload.correlationId,
      invalidationKeys: keys.map(keyToString),
      reason: "friend-added-invalidated",
    });
  }, []);

  // ── friend.removed ──────────────────────────────────────────────────────
  const handleRemoved = useCallback((payload: FriendRemovedPayload) => {
    const keys = [
      SOCIAL_CACHE_KEYS.makeFriendsKey(payload.targetUserId),
      SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.targetUserId),
      SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
      SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.targetUserId),
    ];
    mutateCarefully(SOCIAL_CACHE_KEYS.makeFriendsKey(payload.targetUserId));
    mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.targetUserId));
    mutateCarefully(SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey());
    mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.targetUserId));

    postFriendRequestInvalidation({
      requesterUserId: payload.actorUserId,
      recipientUserId: payload.targetUserId,
    });

    addSocialRealtimeBreadcrumb({
      eventType: "friend.removed",
      actorUserId: payload.actorUserId,
      targetUserId: payload.targetUserId,
      correlationId: payload.correlationId,
      invalidationKeys: keys.map(keyToString),
      reason: "friend-removed-invalidated",
    });
  }, []);

  // `useMemo` the resolved event names so the `useSocialRealtimeEvent`
  // hooks are stable across renders.
  const enabled = realtimeEnabled;

  useSocialRealtimeEvent<FriendRequestReceivedPayload>(
    enabled ? socket : null,
    "friend.request.received",
    handleReceived,
    { enabled },
  );
  useSocialRealtimeEvent<FriendRequestRespondedPayload>(
    enabled ? socket : null,
    "friend.request.responded",
    handleResponded,
    { enabled },
  );
  useSocialRealtimeEvent<FriendRequestCancelledPayload>(
    enabled ? socket : null,
    "friend.request.cancelled",
    handleCancelled,
    { enabled },
  );
  useSocialRealtimeEvent<FriendAddedPayload>(
    enabled ? socket : null,
    "friend.added",
    handleAdded,
    { enabled },
  );
  useSocialRealtimeEvent<FriendRemovedPayload>(
    enabled ? socket : null,
    "friend.removed",
    handleRemoved,
    { enabled },
  );

  // Touch the `useMemo` import so it is not flagged as unused if we
  // ever refactor to extract memoised event-name arrays.
  void useMemo;
}
