"use client";

/**
 * `useDeleteNotification` — delete a single notification.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.B6.
 *
 * ## What this hook owns
 *
 * - Call `DELETE /api/v1/notifications/:id` for the authenticated user
 *   via the service layer.
 * - Map domain-specific error codes (`NOTIFICATION_NOT_FOUND`,
 *   `NOTIFICATION_FORBIDDEN`, `NOTIFICATION_DELETION_FORBIDDEN`, …) to
 *   typed `ApiError`.
 * - Optimistically remove the row from the SWR list cache so the UI
 *   reflects the deletion immediately, then revalidate on completion.
 * - Revalidate the unread-count SWR key on success so the bell badge
 *   reflects the new total.
 * - Double-click prevention: while `state === 'pending'`, subsequent
 *   `deleteNotification()` calls are a no-op.
 * - Feature-flag gating via `notifications_live`.
 *
 * ## Optimistic update
 *
 * The optimistic path bypasses the SWR `mutate(filter, next)` helper
 * because the list cache may be paginated across multiple keys. We
 * filter each cached page that contains the row in place. If any
 * mutation step fails, the cache is left in its prior state — SWR's
 * revalidation on the next focus / reconnection cycle will reconcile
 * it with the server.
 *
 * ## Unread count
 *
 * The unread count is server-authoritative. The hook never optimistically
 * decrements the cached count; it relies on the server response (and the
 * subsequent `getUnreadCount` revalidation) to converge to the right
 * value.
 *
 * ## Auth
 *
 * When unauthenticated, `deleteNotification()` returns a rejected
 * promise with a `GLOBAL_UNAUTHENTICATED` `ApiError.code` so the CTA
 * can trigger the sign-in flow.
 */

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate, useSWRConfig } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import { deleteNotification } from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type Notification,
  type NotificationListPage,
  type NotificationMutationState,
} from "@/features/notifications/types/notification.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseDeleteNotificationResult {
  deleteNotification: () => Promise<void>;
  state: NotificationMutationState;
  error: ApiError | null;
  reset: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Delete a single notification.
 *
 * @param notificationId - The notification ID to delete. Pass `null`
 *   to disable the hook (when the notification row has not loaded yet).
 */
export function useDeleteNotification(
  notificationId: string | null,
): UseDeleteNotificationResult {
  const flagValue = getFeatureFlagValue("notifications_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  // Ref to track if a mutation is in flight (prevents concurrent calls
  // even when React batches state updates).
  const inFlightRef = useRef(false);

  // `useSWRConfig` exposes the same cache (and the bound `mutate`)
  // used by `useNotifications`. We use it to find the actual
  // `$inf$<hash>` cache key SWRInfinite registered, then trigger a
  // revalidation via the bound revalidator. Mutating per-page cache
  // entries alone leaves the SWRInfinite hook reading stale `data`,
  // because SWRInfinite fetches per-page data into its own
  // array and does not re-read from the per-page cache on mutation.
  const swrConfig = useSWRConfig();

  const deleteNotificationAction = useCallback(async (): Promise<void> => {
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

    // ── Optimistic removal ────────────────────────────────────────────
    //
    // The notification list is backed by `useCursorPaginated`, which
    // delegates to `useSWRInfinite`. SWRInfinite registers a real
    // revalidator only on the combined infinite-key entry
    // (`$inf$<hash>`); per-page entries in the cache have no
    // revalidator, so a predicate mutation against the per-page keys
    // does NOT produce an HTTP refetch on its own.
    //
    // Strategy:
    //   1. Sweep the SWR cache for `$inf$<hash>` entries whose stored
    //      `data` is the array shape SWRInfinite produces.
    //      SWRInfinite stores `_k = '$inf$<hash>'` (a string, not an
    //      array), so the predicate must check the cache-key prefix
    //      plus the shape of `data` to confirm the entry belongs to
    //      the notifications list.
    //   2. Optimistically splice the row out of every per-page cache
    //      entry — UI updates immediately on re-render.
    //   3. After the DELETE resolves, revalidate the matched
    //      `$inf$<hash>` keys so the SWRInfinite fetcher runs and the
    //      server-confirmed list replaces the optimistic UI.
    const matchedInfiniteKeys: string[] = [];
    try {
      const cache = swrConfig.cache as {
        keys?: () => IterableIterator<string>;
        get: (k: string) => { _k?: unknown; data?: unknown } | undefined;
      };
      const iter = cache.keys?.bind(cache);
      if (iter) {
        for (const cacheKey of iter()) {
          if (!cacheKey.startsWith('$inf$')) continue;
          const entry = cache.get(cacheKey);
          const data = entry?.data;
          if (!Array.isArray(data) || data.length === 0) continue;
          // The first page in `data` is a `NotificationListPage`
          // object (`{ items, nextCursor, hasNextPage, limit }`).
          // If it has an `items` field, this SWRInfinite entry
          // belongs to the notification list.
          const firstPage = data[0] as { items?: unknown } | null;
          if (
            firstPage &&
            typeof firstPage === 'object' &&
            'items' in firstPage
          ) {
            matchedInfiniteKeys.push(cacheKey);
          }
        }
      }
    } catch {
      // Fail-open: skip the cache sweep. The next mount / focus will
      // reconcile.
    }

    // Optimistic splice across all cached pages.
    await globalMutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === "notifications" &&
        key[1] === "list",
      (current: unknown) => {
        if (!current) return current;
        const page = current as NotificationListPage;
        if (!page.items) return current;
        const filtered = page.items.filter(
          (n: Notification) => n.id !== notificationId,
        );
        if (filtered.length === page.items.length) return current;
        return {
          ...page,
          items: filtered,
        };
      },
      { revalidate: false },
    );

    try {
      // The backend returns `void`; awaiting the request is sufficient.
      await deleteNotification(notificationId);

      // ── Revalidate ──────────────────────────────────────────────
      //
      // Re-fetch every cached page so the user sees the server's
      // canonical list. The matched `$inf$<hash>` keys have a bound
      // revalidator that triggers the SWRInfinite fetcher; the per-page
      // keys do not. We mutate both — neither call is harmful when the
      // key does not exist in the cache.
      const revalidateListEntries = matchedInfiniteKeys.map((cacheKey) =>
        swrConfig.mutate(cacheKey, undefined, { revalidate: true }),
      );
      await Promise.all([
        ...revalidateListEntries,
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
      // Roll back the optimistic removal on error.
      await globalMutate(
        (key) =>
          Array.isArray(key) &&
          key[0] === "notifications" &&
          key[1] === "list",
        undefined,
        { revalidate: true },
      );

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
    deleteNotification: deleteNotificationAction,
    state,
    error,
    reset,
  };
}
