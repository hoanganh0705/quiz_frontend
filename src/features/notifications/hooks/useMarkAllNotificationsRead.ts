"use client";

/**
 * `useMarkAllNotificationsRead` — bulk-mark every notification as read.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.B7.
 *
 * ## What this hook owns
 *
 * - Call `POST /api/v1/notifications/read-all` for the authenticated
 *   user via the service layer.
 * - Optimistically flip `isRead: true` on every cached notification list
 *   page so the UI updates immediately across tabs / filters.
 * - Revalidate the SWRInfinite aggregate cache keys so SWRInfinite
 *   re-runs its fetcher and rebuilds its page array from the
 *   server-confirmed list. Per-page `mutate` is NOT enough because
 *   SWRInfinite stores its own page array in memory.
 * - Revalidate the unread-count SWR key on success so the bell badge
 *   drops to zero without a page refresh.
 * - Double-click prevention: while `state === 'pending'`, subsequent
 *   `markAllRead()` calls are a no-op.
 * - Feature-flag gating via `notifications_live`.
 *
 * ## SWRInfinite revalidation (the bug this hook exists to fix)
 *
 * `useNotifications` is backed by `useCursorPaginated`, which delegates
 * to `useSWRInfinite`. SWRInfinite registers a real fetcher only on a
 * synthetic aggregate cache key (`$inf$<hash>`); per-page entries have
 * no bound revalidator. A predicate-based `globalMutate` that matches
 * the per-page `["notifications", "list", ...]` keys therefore does
 * NOT trigger a refetch — SWRInfinite serves the user from its own
 * `data` array, which never refreshes from the per-page cache.
 *
 * The naive pattern that produced the bug:
 *
 *   ```ts
 *   await markAllNotificationsRead();
 *   await globalMutate(
 *     (k) => Array.isArray(k) && k[0] === "notifications" && k[1] === "list",
 *     undefined,
 *     { revalidate: true },
 *   );
 *   ```
 *
 * Symptoms in the UI:
 *   - The `Unread` tab keeps showing items that the backend has
 *     already marked read (read state was rolled server-side, but
 *     SWRInfinite's `data` array is stale).
 *   - Clicking a row's "mark as unread" button on a `Read` tab moves
 *     the row client-side but the `Unread` tab never refetches.
 *
 * Fix: sweep `useSWRConfig().cache` for `$inf$<hash>` keys whose
 * stored `data` starts with a `NotificationListPage`, then call
 * `swrConfig.mutate(<key>, undefined, { revalidate: true })` for
 * each. The bound fetcher re-runs and SWRInfinite rebuilds its page
 * array. See `swr-infinite-cache.ts` for the shared helpers.
 *
 * ## Server authority
 *
 * The unread count is never modified optimistically. A successful
 * mutation triggers `globalMutate(...)` for the unread-count key,
 * which causes SWR to refetch and overwrite the cache with the
 * server-authoritative value.
 *
 * ## Auth
 *
 * When unauthenticated, `markAllRead()` returns a rejected promise
 * with a `GLOBAL_UNAUTHENTICATED` `ApiError.code` so the CTA can
 * trigger the sign-in flow.
 */

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate, useSWRConfig } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import { markAllNotificationsRead } from "@/features/notifications/services/notifications.service";
import {
  NOTIFICATION_CACHE_KEYS,
  type Notification,
  type NotificationListPage,
  type NotificationMutationState,
} from "@/features/notifications/types/notification.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import {
  buildNotificationListRevalidations,
  findNotificationInfiniteKeys,
} from "@/features/notifications/utils/swr-infinite-cache";

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseMarkAllNotificationsReadResult {
  markAllRead: () => Promise<void>;
  state: NotificationMutationState;
  error: ApiError | null;
  reset: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useMarkAllNotificationsRead(): UseMarkAllNotificationsReadResult {
  const flagValue = getFeatureFlagValue("notifications_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [state, setState] = useState<NotificationMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  // Ref to track if a mutation is in flight (prevents concurrent calls
  // even when React batches state updates).
  const inFlightRef = useRef(false);

  // `useSWRConfig` exposes the same cache (and the bound `mutate`)
  // used by `useNotifications`. See the file header for why we need it.
  const swrConfig = useSWRConfig();

  const markAllRead = useCallback(async (): Promise<void> => {
    if (isFlagPlaceholder) {
      return;
    }

    // Double-click guard.
    if (state === "pending" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    // ── Optimistic flip ───────────────────────────────────────────────
    //
    // Walk every cached page and flip `isRead: true` on its items so
    // the UI updates immediately, regardless of which filter scope is
    // currently mounted. This is a per-page mutation (no revalidate)
    // because SWRInfinite's per-page keys have no fetcher; the real
    // revalidation step below targets the `$inf$<hash>` aggregate keys.
    await globalMutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === "notifications" &&
        key[1] === "list",
      (current: unknown) => {
        if (!current) return current;
        const page = current as NotificationListPage;
        if (!page.items) return current;
        const items = page.items;
        const nextItems = items.map((n: Notification) =>
          n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() },
        );
        if (nextItems === items) return current;
        return { ...page, items: nextItems };
      },
      { revalidate: false },
    );

    try {
      await markAllNotificationsRead();

      // ── SWRInfinite aggregate revalidation ─────────────────────────
      //
      // Sweep for the `$inf$<hash>` keys that own the live notification
      // list scopes (Unread, All, Read — each filter combination gets
      // its own `$inf$<hash>`). For each, call the bound revalidator so
      // SWRInfinite re-runs its fetcher and replaces its in-memory page
      // array with the server-confirmed list.
      const infiniteKeys = findNotificationInfiniteKeys(swrConfig.cache);

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
      ]);

      setState("success");
      setError(null);

      // Reset to idle after 1 second so the CTA re-enables cleanly.
      setTimeout(() => {
        setState("idle");
      }, 1_000);
    } catch (cause: unknown) {
      // Roll back the optimistic flip on error by revalidating the
      // per-page cache from the server.
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
  }, [isFlagPlaceholder, state, swrConfig]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    markAllRead,
    state,
    error,
    reset,
  };
}