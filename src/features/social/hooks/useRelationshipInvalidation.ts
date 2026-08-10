/**
 * `useRelationshipInvalidation` — socket-driven relationship cache invalidation.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E1.
 *
 * ## Purpose
 *
 * Owns the `relationship.changed` invalidation lifecycle. The hook
 * consumes the shared `useSocialRealtimeEvent` wrapper (TKT-6.10.E7)
 * so the dedup / sequence / validation trio is centralised; the hook
 * itself only declares the invalidation set (the two SWR keys that
 * represent the relationship projection between the viewer and
 * `targetUserId`).
 *
 * On every accepted event the hook:
 *
 *   1. Calls `mutateCarefully` for the per-target relationship key.
 *   2. Calls `mutateCarefully` for the per-target social counts key
 *      (relationship changes affect counts).
 *   3. Emits a `social:6.10` breadcrumb via `social-realtime-sentry`.
 *   4. Posts a `relationship-invalidation` cross-tab envelope via
 *      `postRelationshipInvalidation` (TKT-6.10.D3).
 *
 * On drop (deduplicated, out-of-order, or invalid payload), the
 * wrapper emits the breadcrumb; the hook does nothing further.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The hook NEVER carries `friendshipId` or `followId` in any
 * breadcrumb payload or cross-tab envelope. The lint script
 * (`scripts/social-lint-invariants.mjs`, TKT-6.10.G3) greps every
 * file under `src/features/social/**` and fails the build if any
 * field named `friendshipId` / `followId` is added.
 *
 * ## SSR
 *
 * The hook no-ops during SSR because the underlying `useSocket`
 * short-circuits when `typeof window === "undefined"`. The flag
 * gate adds an early return when the feature flag is `'placeholder'`.
 */

"use client";

import { useCallback } from "react";

import { useSocket } from "@/lib/realtime/useSocket";
import { NOTIFICATIONS_NAMESPACE } from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { mutateCarefully } from "@/lib/swr/mutate-carefully";
import {
  addSocialRealtimeBreadcrumb,
} from "@/lib/social/social-realtime-sentry";
import { postRelationshipInvalidation } from "@/lib/realtime/cross-tab-invalidation";

import { useSocialRealtimeEvent } from "@/features/social/realtime";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";
import type { RelationshipChangedPayload } from "@/features/social/realtime";

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Subscribe to `relationship.changed` and invalidate the SWR cache
 * keys that depend on the relationship projection between the viewer
 * and `targetUserId`.
 *
 * @param targetUserId - The user the relationship is scoped to. The
 *                       hook registers one listener per unique
 *                       `targetUserId`; multiple instances of the
 *                       hook do not duplicate listeners for the same
 *                       target.
 *
 * @example
 * ```tsx
 * function RelationshipCard({ targetUserId }: { targetUserId: string }) {
 *   useRelationshipInvalidation(targetUserId);
 *   const { data } = useRelationship(targetUserId);
 *   return <span>{data?.relationship}</span>;
 * }
 * ```
 */
export function useRelationshipInvalidation(targetUserId: string): void {
  const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
  const realtimeEnabled = flagValue !== "placeholder";

  const { socket } = useSocket(NOTIFICATIONS_NAMESPACE, {
    autoConnect: realtimeEnabled,
    enabled: realtimeEnabled,
  });

  const handleAccepted = useCallback(
    (payload: RelationshipChangedPayload) => {
      const invalidationKeys = [
        ...SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
        ...SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
      ];

      // Invalidate the per-target relationship key.
      mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId));
      // Invalidate the per-target social counts key (relationship
      // changes affect the counts).
      mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId));

      // Broadcast cross-tab so sibling tabs re-hydrate.
      postRelationshipInvalidation(targetUserId);

      // Emit the accepted-event breadcrumb (the wrapper already
      // emitted one with `sequenceGuard: 'allow'`; the listener adds
      // the invalidation-key context).
      addSocialRealtimeBreadcrumb({
        eventType: "relationship.changed",
        actorUserId: payload.actorUserId,
        targetUserId: payload.targetUserId,
        correlationId: payload.correlationId,
        invalidationKeys,
        reason: "relationship-invalidated",
      });
    },
    [targetUserId],
  );

  useSocialRealtimeEvent<RelationshipChangedPayload>(
    realtimeEnabled ? socket : null,
    "relationship.changed",
    handleAccepted,
    { enabled: realtimeEnabled },
  );
}
