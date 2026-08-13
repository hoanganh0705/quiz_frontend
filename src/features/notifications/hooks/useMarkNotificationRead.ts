"use client";

/**
 * `useMarkNotificationRead` — mark a single notification as read.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.B4.
 *
 * ## What this hook owns
 *
 * - Call `POST /api/v1/notifications/:id/read` for the authenticated
 *   user via the service layer.
 * - Map domain-specific error codes (`NOTIFICATION_NOT_FOUND`,
 *   `NOTIFICATION_FORBIDDEN`, …) to typed `ApiError`.
 * - Revalidate the notification list and unread-count SWR keys on
 *   success so the bell badge and the row read-state update without a
 *   page refresh.
 * - Double-click prevention: while `state === 'pending'`, subsequent
 *   `markRead()` calls are a no-op.
 * - Feature-flag gating via `notifications_live`.
 *
 * ## No blind retry
 *
 * Mark-read failures are surfaced as typed errors. The CTA re-enables
 * after `state` returns to `'error'`. The user must act intentionally
 * to retry.
 *
 * ## Auth
 *
 * When unauthenticated, `markRead()` returns a rejected promise with
 * a `GLOBAL_UNAUTHENTICATED` `ApiError.code` so the CTA can trigger
 * the sign-in flow.
 */

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate, useSWRConfig } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import { markNotificationRead } from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type NotificationMutationState,
} from "@/features/notifications/types/notification.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import {
  buildNotificationListRevalidations,
  findNotificationInfiniteKeys,
} from "@/features/notifications/utils/swr-infinite-cache";

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseMarkNotificationReadResult {
  markRead: () => Promise<void>;
  state: NotificationMutationState;
  error: ApiError | null;
  reset: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 *
 * @param notificationId - The notification ID to mark read. Pass `null`
 *   to disable the hook (when the notification row has not loaded yet).
 */
export function useMarkNotificationRead(
  notificationId: string | null,
): UseMarkNotificationReadResult {
  const flagValue = getFeatureFlagValue("notifications_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  // Ref to track if a mutation is in flight (prevents concurrent calls
  // even when React batches state updates).
  const inFlightRef = useRef(false);

  // `useSWRConfig` exposes the same cache (and the bound `mutate`)
  // used by `useNotifications`. We use it to find the actual
  // `$inf$<hash>` cache keys SWRInfinite registered, then trigger
  // revalidation via the bound revalidator. Mutating per-page cache
  // entries alone leaves SWRInfinite reading stale `data`, because
  // SWRInfinite holds its own page array and does not re-read from
  // the per-page cache on mutation.
  const swrConfig = useSWRConfig();

  const markRead = useCallback(async (): Promise<void> => {
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
      // The backend returns `void`; the service wrapper awaits the
      // request without producing a usable payload.
      await markNotificationRead(notificationId);

      // Sweep for SWRInfinite aggregate keys whose stored data is a
      // notification list, then revalidate each one so SWRInfinite
      // re-runs its fetcher and rebuilds its page array from the
      // server's canonical list. See `swr-infinite-cache.ts` for the
      // rationale.
      const infiniteKeys = findNotificationInfiniteKeys(swrConfig.cache);

      // Revalidate the list (any filter scope) and the unread count.
      await Promise.all([
        ...buildNotificationListRevalidations(swrConfig, infiniteKeys),
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
  }, [isFlagPlaceholder, notificationId, state, swrConfig]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    markRead,
    state,
    error,
    reset,
  };
}
