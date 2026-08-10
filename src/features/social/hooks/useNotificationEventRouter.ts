/**
 * `useNotificationEventRouter` — social-aware notification event router.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E6.
 *
 * ## Purpose
 *
 * Wraps the Phase 5 `notification:sent` event with social-aware
 * re-routing. When a notification arrives whose `data.kind` is one of
 * the social kinds (`friend_request`, `follow`, `block`), the hook
 * dispatches `mutateCarefully` for the matching social SWR cache key
 * so the badge count and the related lists stay in lockstep with the
 * server-emitted notification.
 *
 * All other kinds (e.g. `instance_invite`, `tournament_start`) fall
 * through to a no-op here — the generic Phase 5 unread-count listener
 * (mounted by `useUnreadNotificationCount`) handles the badge bump
 * for the unsupported kinds.
 *
 * The hook is consumed by `BadgeSyncLayer` (TKT-6.10.E8), which is
 * the side-effect-only shell that mounts all the badge listeners.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The hook NEVER carries `friendshipId` or `followId` in any
 * breadcrumb payload. The wire format does not include those fields
 * (per Epic 6.8.G3 / 6.6.G1 / 6.7.G1 deferral notes).
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
import {
  NOTIFICATIONS_NAMESPACE,
  NOTIFICATION_SENT,
  useRealtimeEvent,
} from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { mutateCarefully } from "@/lib/swr/mutate-carefully";
import {
  addSocialRealtimeBreadcrumb,
} from "@/lib/social/social-realtime-sentry";

import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * The set of social notification kinds the hook recognises. Any other
 * kind falls through to a no-op (the generic Phase 5 unread-count
 * listener handles the badge bump).
 *
 * BACKEND_CONFIRM: `data.kind` strings. These align with the canonical
 * notification types emitted by the backend's social subsystem.
 */
const SOCIAL_NOTIFICATION_KINDS = new Set<string>([
  "friend_request",
  "follow",
  "block",
]);

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Subscribe to `notification:sent` and re-route social kinds to the
 * matching SWR cache key.
 *
 * The hook signature is `useNotificationEventRouter(): void` —
 * side-effect only; no return value.
 *
 * @example
 * ```tsx
 * function BadgeSyncLayer() {
 *   useNotificationEventRouter();
 *   // ... other badge listeners ...
 *   return null;
 * }
 * ```
 */
export function useNotificationEventRouter(): void {
  const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
  const realtimeEnabled = flagValue !== "placeholder";

  const { socket } = useSocket(NOTIFICATIONS_NAMESPACE, {
    autoConnect: realtimeEnabled,
    enabled: realtimeEnabled,
  });

  const handleNotificationSent = useCallback((raw: unknown) => {
    if (raw === null || raw === undefined || typeof raw !== "object") {
      return;
    }

    const payload = raw as Record<string, unknown>;

    // Extract the kind. The wire shape (Phase 5 `NotificationSentPayload`)
    // is `{ type: 'friend_request', data?: { ... } }` — the canonical
    // discriminator lives on `type`, not on `data.kind`. Accept `data.kind`
    // as a fallback for forward-compatibility.
    const kindCandidate =
      typeof payload["type"] === "string"
        ? (payload["type"] as string)
        : typeof (payload["data"] as Record<string, unknown> | undefined)?.["kind"] === "string"
          ? ((payload["data"] as Record<string, unknown>)["kind"] as string)
          : undefined;

    if (kindCandidate === undefined || !SOCIAL_NOTIFICATION_KINDS.has(kindCandidate)) {
      // Drop unknown / non-social kinds silently.
      return;
    }

    const keys: string[] = [];
    switch (kindCandidate) {
      case "friend_request": {
        const incomingRequestsKey = SOCIAL_CACHE_KEYS.makeIncomingRequestsKey();
        mutateCarefully(incomingRequestsKey);
        keys.push(incomingRequestsKey.join("/"));
        break;
      }
      case "follow": {
        // `notification:sent` for a `follow` event does not carry the
        // actor / target user ids in a stable shape — invalidate the
        // generic unread-count SWR key so the badge bumps. A future
        // H-ticket can narrow this to a viewer-scoped key.
        mutateCarefully(["notifications", "unread-count"]);
        keys.push("notifications/unread-count");
        break;
      }
      case "block": {
        const blockedKey = SOCIAL_CACHE_KEYS.makeBlockedKey();
        mutateCarefully(blockedKey);
        keys.push(blockedKey.join("/"));
        break;
      }
    }

    addSocialRealtimeBreadcrumb({
      eventType: NOTIFICATION_SENT,
      reason: `notification-routed:${kindCandidate}`,
      invalidationKeys: keys,
    });
  }, []);

  useRealtimeEvent(
    realtimeEnabled ? socket : null,
    realtimeEnabled ? NOTIFICATION_SENT : null,
    handleNotificationSent,
    { enabled: realtimeEnabled },
  );
}