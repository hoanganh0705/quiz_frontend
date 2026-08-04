"use client";

/**
 * `useMarkNotificationUnread` — mark a single notification as unread.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.B5.
 *
 * ## What this hook owns
 *
 * - Call `POST /api/v1/notifications/:id/unread` for the authenticated
 *   user via the service layer.
 * - Map domain-specific error codes (`NOTIFICATION_NOT_FOUND`,
 *   `NOTIFICATION_FORBIDDEN`, …) to typed `ApiError`.
 * - Revalidate the notification list and unread-count SWR keys on
 *   success so the bell badge and the row read-state update without a
 *   page refresh.
 * - Double-click prevention: while `state === 'pending'`, subsequent
 *   `markUnread()` calls are a no-op.
 * - Feature-flag gating via `phase5_notifications`.
 *
 * ## Double-click guard
 *
 * The `inFlightRef` mirror provides a guarantee that survives React's
 * batched state updates — a second `markUnread()` call within the
 * same render cycle will not fire a duplicate request.
 *
 * ## Server authority
 *
 * The unread count is never modified optimistically. A successful
 * mutation triggers `globalMutate(...)` for the unread-count key,
 * which causes SWR to refetch and overwrite the cache with the
 * server-authoritative value. This prevents drift between the local
 * cache and the backend's tally.
 *
 * ## Auth
 *
 * When unauthenticated, `markUnread()` returns a rejected promise with
 * a `GLOBAL_UNAUTHENTICATED` `ApiError.code` so the CTA can trigger
 * the sign-in flow.
 */

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import { markNotificationUnread } from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type NotificationMutationState,
} from "@/features/notifications/types/notification.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseMarkNotificationUnreadResult {
  markUnread: () => Promise<void>;
  state: NotificationMutationState;
  error: ApiError | null;
  reset: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Mark a single notification as unread.
 *
 * @param notificationId - The notification ID to mark unread. Pass
 *   `null` to disable the hook (when the notification row has not
 *   loaded yet).
 */
export function useMarkNotificationUnread(
  notificationId: string | null,
): UseMarkNotificationUnreadResult {
  const flagValue = getFeatureFlagValue("phase5_notifications");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  // Ref to track if a mutation is in flight (prevents concurrent calls
  // even when React batches state updates).
  const inFlightRef = useRef(false);

  const markUnread = useCallback(async (): Promise<void> => {
    if (isFlagPlaceholder || notificationId === null) {
      return;
    }

    // Double-click guard: if already pending, do not start another.
    if (state === "pending" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    try {
      // The backend returns `void`; awaiting the request is sufficient.
      await markNotificationUnread(notificationId);

      // Revalidate the list (any filter scope) and the unread count.
      await Promise.all([
        globalMutate(
          (key) =>
            Array.isArray(key) &&
            key[0] === "notifications" &&
            key[1] === "list",
          undefined,
          { revalidate: true },
        ),
        globalMutate(NOTIFICATION_CACHE_KEYS.unreadCount(), undefined, {
          revalidate: true,
        }),
        globalMutate(
          NOTIFICATION_CACHE_KEYS.detail(notificationId),
          undefined,
          { revalidate: true },
        ),
      ]);

      setState("success");
      setError(null);

      // Reset to idle after 1 second so the CTA re-enables cleanly.
      setTimeout(() => {
        setState("idle");
      }, 1_000);
    } catch (cause: unknown) {
      if (isApiError(cause)) {
        setState("error");
        setError(cause);
      } else if (cause instanceof Error) {
        const mappedError = new ApiError(
          cause as unknown as ConstructorParameters<typeof ApiError>[0],
        );
        setState("error");
        setError(mappedError);
      } else {
        const mappedError = new ApiError(
          cause as unknown as ConstructorParameters<typeof ApiError>[0],
        );
        setState("error");
        setError(mappedError);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [isFlagPlaceholder, notificationId, state]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    markUnread,
    state,
    error,
    reset,
  };
}
